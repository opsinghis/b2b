import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@infrastructure/database';
import {
  IntegrationMessage,
  IntegrationConnector,
  IntegrationDeadLetter,
  IntegrationTransformation,
  IntegrationMessageStatus,
  CircuitBreakerState,
  ConnectorHealthStatus,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import {
  CreateIntegrationMessageDto,
  IntegrationMessageQueryDto,
  CreateConnectorDto,
  UpdateConnectorDto,
  ConnectorQueryDto,
  CreateTransformationDto,
  UpdateTransformationDto,
  TransformationQueryDto,
  DeadLetterQueryDto,
  BulkReprocessDto,
  TransformPayloadDto,
} from './dto';

// Internal type for message updates (not exposed via API)
interface InternalMessageUpdate {
  status?: IntegrationMessageStatus;
  canonicalPayload?: Record<string, unknown>;
  targetPayload?: Record<string, unknown>;
  lastError?: string | null;
  errorDetails?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  transformedAt?: Date;
  completedAt?: Date;
  processedAt?: Date;
  failedAt?: Date;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface TransformResult {
  success: boolean;
  sourcePayload: Record<string, unknown>;
  canonicalPayload?: Record<string, unknown>;
  targetPayload?: Record<string, unknown>;
  errors?: string[];
  transformationId?: string;
}

export interface ProcessingResult {
  messageId: string;
  status: IntegrationMessageStatus;
  error?: string;
  retryScheduled?: boolean;
  movedToDlq?: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
};

@Injectable()
export class IntegrationHubService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationHubService.name);
  private readonly idempotencyCache = new Map<string, { hash: string; expiresAt: Date }>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Integration Hub Service initialized');
    await this.cleanupExpiredIdempotencyKeys();
  }

  // ============================================
  // Message Routing
  // ============================================

  async routeMessage(dto: CreateIntegrationMessageDto): Promise<ProcessingResult> {
    const { sourceConnector, targetConnector, idempotencyKey, sourcePayload } = dto;

    // Check idempotency
    if (idempotencyKey) {
      const duplicate = await this.checkIdempotency(idempotencyKey, sourcePayload);
      if (duplicate.isDuplicate) {
        this.logger.debug(`Duplicate message detected: ${idempotencyKey}`);
        return {
          messageId: dto.messageId,
          status: IntegrationMessageStatus.COMPLETED,
          error: 'Duplicate message - already processed',
        };
      }
    }

    // Check rate limit
    const rateLimitResult = await this.checkRateLimit(sourceConnector);
    if (!rateLimitResult.allowed) {
      this.logger.warn(`Rate limit exceeded for connector: ${sourceConnector}`);
      return {
        messageId: dto.messageId,
        status: IntegrationMessageStatus.FAILED,
        error: `Rate limit exceeded. Reset at: ${rateLimitResult.resetAt}`,
        retryScheduled: true,
      };
    }

    // Check circuit breaker
    const circuitState = await this.getCircuitState(targetConnector);
    if (circuitState === CircuitBreakerState.OPEN) {
      this.logger.warn(`Circuit breaker OPEN for connector: ${targetConnector}`);
      return {
        messageId: dto.messageId,
        status: IntegrationMessageStatus.RETRYING,
        error: 'Circuit breaker is open',
        retryScheduled: true,
      };
    }

    // Create the message
    const message = await this.createMessage(dto);

    try {
      // Process the message
      const result = await this.processMessage(message);
      return result;
    } catch (error) {
      this.logger.error(`Error processing message ${message.id}:`, error);
      return await this.handleProcessingError(message, error as Error);
    }
  }

  async processMessage(message: IntegrationMessage): Promise<ProcessingResult> {
    // Update status to transforming
    await this.updateMessageStatus(message.id, IntegrationMessageStatus.TRANSFORMING);

    // Transform the message
    const transformResult = await this.transformMessage(message);

    if (!transformResult.success) {
      await this.updateMessage(message.id, {
        status: IntegrationMessageStatus.FAILED,
        lastError: transformResult.errors?.join('; '),
        errorDetails: { transformErrors: transformResult.errors },
        failedAt: new Date(),
      });

      // Move to DLQ if max retries exceeded
      if (message.retryCount >= message.maxRetries) {
        await this.moveToDeadLetter(message, 'TRANSFORMATION_FAILED', transformResult.errors?.join('; '));
        return {
          messageId: message.messageId,
          status: IntegrationMessageStatus.DEAD_LETTER,
          error: transformResult.errors?.join('; '),
          movedToDlq: true,
        };
      }

      // Schedule retry
      await this.scheduleRetry(message);
      return {
        messageId: message.messageId,
        status: IntegrationMessageStatus.RETRYING,
        error: transformResult.errors?.join('; '),
        retryScheduled: true,
      };
    }

    // Update with transformed payloads
    await this.updateMessage(message.id, {
      canonicalPayload: transformResult.canonicalPayload,
      targetPayload: transformResult.targetPayload,
      transformedAt: new Date(),
      status: IntegrationMessageStatus.ROUTING,
    });

    // Update status to processing
    await this.updateMessageStatus(message.id, IntegrationMessageStatus.PROCESSING);

    // Mark as completed (actual delivery would be handled by connector)
    await this.updateMessage(message.id, {
      status: IntegrationMessageStatus.COMPLETED,
      completedAt: new Date(),
      processedAt: new Date(),
    });

    // Record success for circuit breaker
    await this.recordSuccess(message.targetConnector);

    // Update connector stats
    await this.incrementConnectorStats(message.targetConnector, true);

    return {
      messageId: message.messageId,
      status: IntegrationMessageStatus.COMPLETED,
    };
  }

  // ============================================
  // Message CRUD
  // ============================================

  async createMessage(dto: CreateIntegrationMessageDto): Promise<IntegrationMessage> {
    const payloadHash = this.hashPayload(dto.sourcePayload);

    return this.prisma.integrationMessage.create({
      data: {
        messageId: dto.messageId,
        correlationId: dto.correlationId,
        sourceConnector: dto.sourceConnector,
        targetConnector: dto.targetConnector,
        direction: dto.direction,
        type: dto.type,
        priority: dto.priority ?? 0,
        sourcePayload: dto.sourcePayload as Prisma.JsonObject,
        idempotencyKey: dto.idempotencyKey,
        processedHash: payloadHash,
        maxRetries: dto.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries,
        metadata: (dto.metadata ?? {}) as Prisma.JsonObject,
        status: IntegrationMessageStatus.PENDING,
        receivedAt: new Date(),
      },
    });
  }

  async getMessage(id: string): Promise<IntegrationMessage | null> {
    return this.prisma.integrationMessage.findUnique({ where: { id } });
  }

  async getMessageByMessageId(messageId: string): Promise<IntegrationMessage | null> {
    return this.prisma.integrationMessage.findUnique({ where: { messageId } });
  }

  async updateMessage(id: string, data: InternalMessageUpdate): Promise<IntegrationMessage> {
    const updateData: Prisma.IntegrationMessageUpdateInput = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.canonicalPayload !== undefined) updateData.canonicalPayload = data.canonicalPayload as Prisma.JsonObject;
    if (data.targetPayload !== undefined) updateData.targetPayload = data.targetPayload as Prisma.JsonObject;
    if (data.lastError !== undefined) updateData.lastError = data.lastError;
    if (data.errorDetails !== undefined) updateData.errorDetails = data.errorDetails as Prisma.JsonObject;
    if (data.metadata !== undefined) updateData.metadata = data.metadata as Prisma.JsonObject;
    if (data.transformedAt !== undefined) updateData.transformedAt = data.transformedAt;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;
    if (data.processedAt !== undefined) updateData.processedAt = data.processedAt;
    if (data.failedAt !== undefined) updateData.failedAt = data.failedAt;

    return this.prisma.integrationMessage.update({
      where: { id },
      data: updateData,
    });
  }

  async updateMessageStatus(id: string, status: IntegrationMessageStatus): Promise<IntegrationMessage> {
    const updates: Prisma.IntegrationMessageUpdateInput = { status };

    if (status === IntegrationMessageStatus.COMPLETED) {
      updates.completedAt = new Date();
      updates.processedAt = new Date();
    } else if (status === IntegrationMessageStatus.FAILED) {
      updates.failedAt = new Date();
    }

    return this.prisma.integrationMessage.update({
      where: { id },
      data: updates,
    });
  }

  async listMessages(query: IntegrationMessageQueryDto) {
    const { page = 1, limit = 20, includeDlq = false, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.IntegrationMessageWhereInput = {};

    if (filters.sourceConnector) where.sourceConnector = filters.sourceConnector;
    if (filters.targetConnector) where.targetConnector = filters.targetConnector;
    if (filters.status) where.status = filters.status;
    if (filters.direction) where.direction = filters.direction;
    if (filters.type) where.type = filters.type;
    if (filters.correlationId) where.correlationId = filters.correlationId;
    if (!includeDlq) {
      where.status = { not: IntegrationMessageStatus.DEAD_LETTER };
    }

    const [items, total] = await Promise.all([
      this.prisma.integrationMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.integrationMessage.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================
  // Transformation Pipeline
  // ============================================

  async transformMessage(message: IntegrationMessage): Promise<TransformResult> {
    const sourcePayload = message.sourcePayload as Record<string, unknown>;

    // Find transformation rule
    const transformation = await this.prisma.integrationTransformation.findFirst({
      where: {
        sourceConnector: message.sourceConnector,
        targetConnector: message.targetConnector,
        sourceType: message.type,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });

    if (!transformation) {
      return {
        success: false,
        sourcePayload,
        errors: [`No transformation found for ${message.sourceConnector} -> ${message.targetConnector} (${message.type})`],
      };
    }

    try {
      // Step 1: Source to Canonical
      const canonicalPayload = await this.applyTransformation(
        sourcePayload,
        transformation.sourceToCanonical as Record<string, unknown>,
      );

      // Step 2: Canonical to Target
      const targetPayload = await this.applyTransformation(
        canonicalPayload,
        transformation.canonicalToTarget as Record<string, unknown>,
      );

      return {
        success: true,
        sourcePayload,
        canonicalPayload,
        targetPayload,
        transformationId: transformation.id,
      };
    } catch (error) {
      return {
        success: false,
        sourcePayload,
        errors: [(error as Error).message],
        transformationId: transformation.id,
      };
    }
  }

  async transformPayload(dto: TransformPayloadDto): Promise<TransformResult> {
    const { sourceConnector, targetConnector, sourceType, targetType, payload } = dto;

    const transformation = await this.prisma.integrationTransformation.findFirst({
      where: {
        sourceConnector,
        targetConnector,
        sourceType,
        targetType,
        isActive: true,
      },
    });

    if (!transformation) {
      return {
        success: false,
        sourcePayload: payload,
        errors: [`No transformation found for ${sourceConnector} -> ${targetConnector} (${sourceType} -> ${targetType})`],
      };
    }

    try {
      const canonicalPayload = await this.applyTransformation(
        payload,
        transformation.sourceToCanonical as Record<string, unknown>,
      );

      const targetPayload = await this.applyTransformation(
        canonicalPayload,
        transformation.canonicalToTarget as Record<string, unknown>,
      );

      return {
        success: true,
        sourcePayload: payload,
        canonicalPayload,
        targetPayload,
        transformationId: transformation.id,
      };
    } catch (error) {
      return {
        success: false,
        sourcePayload: payload,
        errors: [(error as Error).message],
        transformationId: transformation.id,
      };
    }
  }

  private async applyTransformation(
    payload: Record<string, unknown>,
    rules: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    const mappings = rules.mappings as Record<string, string>[] | undefined;
    const defaults = rules.defaults as Record<string, unknown> | undefined;
    const computed = rules.computed as Record<string, string>[] | undefined;

    // Apply defaults first
    if (defaults) {
      Object.assign(result, defaults);
    }

    // Apply field mappings
    if (mappings) {
      for (const mapping of mappings) {
        const sourceField = mapping.source;
        const targetField = mapping.target;
        const value = this.getNestedValue(payload, sourceField);
        if (value !== undefined) {
          this.setNestedValue(result, targetField, value);
        }
      }
    }

    // Apply computed fields
    if (computed) {
      for (const comp of computed) {
        const field = comp.field;
        const expression = comp.expression;
        try {
          const value = this.evaluateExpression(expression, payload, result);
          this.setNestedValue(result, field, value);
        } catch {
          // Skip computed field on error
        }
      }
    }

    return result;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((curr, key) => {
      return curr && typeof curr === 'object' ? (curr as Record<string, unknown>)[key] : undefined;
    }, obj as unknown);
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((curr, key) => {
      if (!(key in curr)) {
        curr[key] = {};
      }
      return curr[key] as Record<string, unknown>;
    }, obj);
    target[lastKey] = value;
  }

  private evaluateExpression(
    expression: string,
    source: Record<string, unknown>,
    current: Record<string, unknown>,
  ): unknown {
    // Simple expression evaluation (concat, uppercase, lowercase, etc.)
    if (expression.startsWith('concat(')) {
      const match = expression.match(/concat\(([^)]+)\)/);
      if (match) {
        const fields = match[1].split(',').map((f) => f.trim());
        return fields.map((f) => {
          if (f.startsWith("'") && f.endsWith("'")) return f.slice(1, -1);
          return this.getNestedValue(source, f) ?? this.getNestedValue(current, f) ?? '';
        }).join('');
      }
    }
    if (expression.startsWith('uppercase(')) {
      const match = expression.match(/uppercase\(([^)]+)\)/);
      if (match) {
        const value = this.getNestedValue(source, match[1]) ?? this.getNestedValue(current, match[1]);
        return typeof value === 'string' ? value.toUpperCase() : value;
      }
    }
    if (expression.startsWith('lowercase(')) {
      const match = expression.match(/lowercase\(([^)]+)\)/);
      if (match) {
        const value = this.getNestedValue(source, match[1]) ?? this.getNestedValue(current, match[1]);
        return typeof value === 'string' ? value.toLowerCase() : value;
      }
    }
    if (expression.startsWith('now()')) {
      return new Date().toISOString();
    }
    return undefined;
  }

  // ============================================
  // Retry with Exponential Backoff
  // ============================================

  async scheduleRetry(
    message: IntegrationMessage,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
  ): Promise<void> {
    const newRetryCount = message.retryCount + 1;

    if (newRetryCount > message.maxRetries) {
      await this.moveToDeadLetter(message, 'MAX_RETRIES_EXCEEDED', message.lastError ?? 'Unknown error');
      return;
    }

    const delay = this.calculateBackoffDelay(newRetryCount, config);
    const nextRetryAt = new Date(Date.now() + delay);

    await this.prisma.integrationMessage.update({
      where: { id: message.id },
      data: {
        status: IntegrationMessageStatus.RETRYING,
        retryCount: newRetryCount,
        nextRetryAt,
      },
    });

    this.logger.debug(`Scheduled retry ${newRetryCount}/${message.maxRetries} for message ${message.id} at ${nextRetryAt}`);
  }

  calculateBackoffDelay(retryCount: number, config: RetryConfig): number {
    const delay = Math.min(
      config.baseDelayMs * Math.pow(config.backoffMultiplier, retryCount - 1),
      config.maxDelayMs,
    );
    // Add jitter (0-20% of delay)
    const jitter = delay * 0.2 * Math.random();
    return Math.floor(delay + jitter);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processRetryQueue(): Promise<void> {
    const messages = await this.prisma.integrationMessage.findMany({
      where: {
        status: IntegrationMessageStatus.RETRYING,
        nextRetryAt: { lte: new Date() },
      },
      take: 100,
      orderBy: { nextRetryAt: 'asc' },
    });

    for (const message of messages) {
      try {
        await this.processMessage(message);
      } catch (error) {
        this.logger.error(`Retry failed for message ${message.id}:`, error);
        await this.handleProcessingError(message, error as Error);
      }
    }
  }

  // ============================================
  // Dead Letter Queue
  // ============================================

  async moveToDeadLetter(
    message: IntegrationMessage,
    reason: string,
    errorMessage?: string,
  ): Promise<IntegrationDeadLetter> {
    const dlqEntry = await this.prisma.integrationDeadLetter.create({
      data: {
        originalMessageId: message.messageId,
        connector: message.targetConnector,
        reason,
        errorMessage,
        errorStack: message.errorDetails ? JSON.stringify(message.errorDetails) : undefined,
        payload: message.sourcePayload as Prisma.JsonObject,
        metadata: (message.metadata ?? {}) as Prisma.JsonObject,
        retryable: reason !== 'INVALID_PAYLOAD' && reason !== 'SCHEMA_VALIDATION_FAILED',
      },
    });

    await this.prisma.integrationMessage.update({
      where: { id: message.id },
      data: {
        status: IntegrationMessageStatus.DEAD_LETTER,
        dlqReason: reason,
        movedToDlqAt: new Date(),
      },
    });

    // Update connector stats
    await this.incrementConnectorStats(message.targetConnector, false);

    this.logger.warn(`Message ${message.id} moved to DLQ: ${reason}`);
    return dlqEntry;
  }

  async listDeadLetters(query: DeadLetterQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.IntegrationDeadLetterWhereInput = {};

    if (filters.connector) where.connector = filters.connector;
    if (filters.reason) where.reason = filters.reason;
    if (filters.retryable !== undefined) where.retryable = filters.retryable;
    if (filters.reprocessed !== undefined) {
      where.reprocessedAt = filters.reprocessed ? { not: null } : null;
    }

    const [items, total] = await Promise.all([
      this.prisma.integrationDeadLetter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.integrationDeadLetter.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async reprocessDeadLetter(id: string, userId: string): Promise<ProcessingResult> {
    const dlqEntry = await this.prisma.integrationDeadLetter.findUnique({ where: { id } });

    if (!dlqEntry) {
      return {
        messageId: '',
        status: IntegrationMessageStatus.FAILED,
        error: 'Dead letter entry not found',
      };
    }

    if (!dlqEntry.retryable) {
      return {
        messageId: dlqEntry.originalMessageId,
        status: IntegrationMessageStatus.FAILED,
        error: 'Message is not retryable',
      };
    }

    // Mark as reprocessed
    await this.prisma.integrationDeadLetter.update({
      where: { id },
      data: {
        reprocessedAt: new Date(),
        reprocessedById: userId,
      },
    });

    // Find original message
    const originalMessage = await this.prisma.integrationMessage.findUnique({
      where: { messageId: dlqEntry.originalMessageId },
    });

    if (!originalMessage) {
      return {
        messageId: dlqEntry.originalMessageId,
        status: IntegrationMessageStatus.FAILED,
        error: 'Original message not found',
      };
    }

    // Reset message for reprocessing
    await this.prisma.integrationMessage.update({
      where: { id: originalMessage.id },
      data: {
        status: IntegrationMessageStatus.PENDING,
        retryCount: 0,
        lastError: null,
        errorDetails: Prisma.JsonNull,
        dlqReason: null,
        movedToDlqAt: null,
        nextRetryAt: null,
      },
    });

    return this.processMessage(originalMessage);
  }

  async bulkReprocessDeadLetters(dto: BulkReprocessDto, userId: string) {
    const { connector, reason, limit = 100 } = dto;

    const where: Prisma.IntegrationDeadLetterWhereInput = {
      retryable: true,
      reprocessedAt: null,
    };

    if (connector) where.connector = connector;
    if (reason) where.reason = reason;

    const entries = await this.prisma.integrationDeadLetter.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    const results = {
      total: entries.length,
      successful: 0,
      failed: 0,
      errors: [] as { id: string; error: string }[],
    };

    for (const entry of entries) {
      try {
        const result = await this.reprocessDeadLetter(entry.id, userId);
        if (result.status === IntegrationMessageStatus.COMPLETED) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push({ id: entry.id, error: result.error ?? 'Unknown error' });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ id: entry.id, error: (error as Error).message });
      }
    }

    return results;
  }

  async getDeadLetterStats() {
    const [total, retryable, reprocessed] = await Promise.all([
      this.prisma.integrationDeadLetter.count(),
      this.prisma.integrationDeadLetter.count({ where: { retryable: true, reprocessedAt: null } }),
      this.prisma.integrationDeadLetter.count({ where: { reprocessedAt: { not: null } } }),
    ]);

    const byConnector = await this.prisma.integrationDeadLetter.groupBy({
      by: ['connector'],
      _count: { id: true },
      where: { reprocessedAt: null },
    });

    const byReason = await this.prisma.integrationDeadLetter.groupBy({
      by: ['reason'],
      _count: { id: true },
      where: { reprocessedAt: null },
    });

    return {
      total,
      retryable,
      nonRetryable: total - retryable - reprocessed,
      reprocessed,
      byConnector: byConnector.map((c) => ({ connector: c.connector, count: c._count.id })),
      byReason: byReason.map((r) => ({ reason: r.reason, count: r._count.id })),
    };
  }

  // ============================================
  // Circuit Breaker
  // ============================================

  async getCircuitState(connectorCode: string): Promise<CircuitBreakerState> {
    const connector = await this.prisma.integrationConnector.findUnique({
      where: { code: connectorCode },
    });

    if (!connector) return CircuitBreakerState.CLOSED;

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (connector.circuitState === CircuitBreakerState.OPEN && connector.circuitOpenedAt) {
      const timeoutMs = 30000; // 30 seconds
      const now = new Date();
      const openedAt = new Date(connector.circuitOpenedAt);

      if (now.getTime() - openedAt.getTime() > timeoutMs) {
        await this.transitionCircuit(connectorCode, CircuitBreakerState.HALF_OPEN);
        return CircuitBreakerState.HALF_OPEN;
      }
    }

    return connector.circuitState;
  }

  async recordFailure(connectorCode: string): Promise<void> {
    const connector = await this.prisma.integrationConnector.findUnique({
      where: { code: connectorCode },
    });

    if (!connector) return;

    const newFailureCount = connector.failureCount + 1;

    if (newFailureCount >= connector.failureThreshold) {
      await this.transitionCircuit(connectorCode, CircuitBreakerState.OPEN);
    } else {
      await this.prisma.integrationConnector.update({
        where: { code: connectorCode },
        data: {
          failureCount: newFailureCount,
          successCount: 0,
          lastFailureAt: new Date(),
        },
      });
    }
  }

  async recordSuccess(connectorCode: string): Promise<void> {
    const connector = await this.prisma.integrationConnector.findUnique({
      where: { code: connectorCode },
    });

    if (!connector) return;

    if (connector.circuitState === CircuitBreakerState.HALF_OPEN) {
      const newSuccessCount = connector.successCount + 1;

      if (newSuccessCount >= connector.successThreshold) {
        await this.transitionCircuit(connectorCode, CircuitBreakerState.CLOSED);
      } else {
        await this.prisma.integrationConnector.update({
          where: { code: connectorCode },
          data: { successCount: newSuccessCount },
        });
      }
    } else if (connector.circuitState === CircuitBreakerState.CLOSED) {
      // Reset failure count on success
      if (connector.failureCount > 0) {
        await this.prisma.integrationConnector.update({
          where: { code: connectorCode },
          data: { failureCount: 0 },
        });
      }
    }
  }

  private async transitionCircuit(
    connectorCode: string,
    newState: CircuitBreakerState,
  ): Promise<void> {
    const updates: Prisma.IntegrationConnectorUpdateInput = {
      circuitState: newState,
    };

    if (newState === CircuitBreakerState.OPEN) {
      updates.circuitOpenedAt = new Date();
      updates.successCount = 0;
      this.logger.warn(`Circuit breaker OPENED for connector: ${connectorCode}`);
    } else if (newState === CircuitBreakerState.HALF_OPEN) {
      updates.halfOpenAt = new Date();
      updates.successCount = 0;
      this.logger.log(`Circuit breaker HALF_OPEN for connector: ${connectorCode}`);
    } else if (newState === CircuitBreakerState.CLOSED) {
      updates.failureCount = 0;
      updates.successCount = 0;
      updates.circuitOpenedAt = null;
      updates.halfOpenAt = null;
      this.logger.log(`Circuit breaker CLOSED for connector: ${connectorCode}`);
    }

    await this.prisma.integrationConnector.update({
      where: { code: connectorCode },
      data: updates,
    });
  }

  // ============================================
  // Idempotency
  // ============================================

  async checkIdempotency(
    idempotencyKey: string,
    payload: Record<string, unknown>,
  ): Promise<{ isDuplicate: boolean; existingMessageId?: string }> {
    const payloadHash = this.hashPayload(payload);

    // Check cache first
    const cached = this.idempotencyCache.get(idempotencyKey);
    if (cached && cached.expiresAt > new Date()) {
      if (cached.hash === payloadHash) {
        return { isDuplicate: true };
      }
    }

    // Check database
    const existing = await this.prisma.integrationMessage.findFirst({
      where: {
        idempotencyKey,
        status: { not: IntegrationMessageStatus.FAILED },
      },
    });

    if (existing) {
      // Cache the result
      this.idempotencyCache.set(idempotencyKey, {
        hash: existing.processedHash ?? payloadHash,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      });

      if (existing.processedHash === payloadHash) {
        return { isDuplicate: true, existingMessageId: existing.messageId };
      }
    }

    // Not a duplicate - cache this key
    this.idempotencyCache.set(idempotencyKey, {
      hash: payloadHash,
      expiresAt: new Date(Date.now() + 3600000),
    });

    return { isDuplicate: false };
  }

  private hashPayload(payload: Record<string, unknown>): string {
    const normalized = JSON.stringify(payload, Object.keys(payload).sort());
    return createHash('sha256').update(normalized).digest('hex');
  }

  private async cleanupExpiredIdempotencyKeys(): Promise<void> {
    const now = new Date();
    for (const [key, value] of this.idempotencyCache.entries()) {
      if (value.expiresAt < now) {
        this.idempotencyCache.delete(key);
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupIdempotencyCache(): Promise<void> {
    await this.cleanupExpiredIdempotencyKeys();
  }

  // ============================================
  // Rate Limiting
  // ============================================

  async checkRateLimit(connectorCode: string): Promise<RateLimitResult> {
    const connector = await this.prisma.integrationConnector.findUnique({
      where: { code: connectorCode },
    });

    if (!connector || !connector.rateLimit || !connector.rateLimitWindow) {
      return { allowed: true, remaining: Infinity, resetAt: new Date() };
    }

    const now = new Date();
    const windowStart = connector.windowStart;
    const windowMs = connector.rateLimitWindow * 1000;

    // Check if we're in a new window
    if (!windowStart || now.getTime() - windowStart.getTime() > windowMs) {
      await this.prisma.integrationConnector.update({
        where: { code: connectorCode },
        data: {
          windowStart: now,
          currentCount: 1,
        },
      });

      return {
        allowed: true,
        remaining: connector.rateLimit - 1,
        resetAt: new Date(now.getTime() + windowMs),
      };
    }

    // Check if under limit
    if (connector.currentCount < connector.rateLimit) {
      await this.prisma.integrationConnector.update({
        where: { code: connectorCode },
        data: { currentCount: { increment: 1 } },
      });

      return {
        allowed: true,
        remaining: connector.rateLimit - connector.currentCount - 1,
        resetAt: new Date(windowStart.getTime() + windowMs),
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(windowStart.getTime() + windowMs),
    };
  }

  // ============================================
  // Connector Management
  // ============================================

  async createConnector(dto: CreateConnectorDto): Promise<IntegrationConnector> {
    return this.prisma.integrationConnector.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        direction: dto.direction,
        isActive: dto.isActive ?? true,
        config: (dto.config ?? {}) as Prisma.JsonObject,
        credentials: {} as Prisma.JsonObject,
        rateLimit: dto.rateLimit,
        rateLimitWindow: dto.rateLimitWindow,
        failureThreshold: dto.failureThreshold ?? 5,
        successThreshold: dto.successThreshold ?? 3,
        metadata: (dto.metadata ?? {}) as Prisma.JsonObject,
      },
    });
  }

  async getConnector(id: string): Promise<IntegrationConnector | null> {
    return this.prisma.integrationConnector.findUnique({ where: { id } });
  }

  async getConnectorByCode(code: string): Promise<IntegrationConnector | null> {
    return this.prisma.integrationConnector.findUnique({ where: { code } });
  }

  async updateConnector(id: string, dto: UpdateConnectorDto): Promise<IntegrationConnector> {
    const updateData: Prisma.IntegrationConnectorUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.direction !== undefined) updateData.direction = dto.direction;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.config !== undefined) updateData.config = dto.config as Prisma.JsonObject;
    if (dto.rateLimit !== undefined) updateData.rateLimit = dto.rateLimit;
    if (dto.rateLimitWindow !== undefined) updateData.rateLimitWindow = dto.rateLimitWindow;
    if (dto.failureThreshold !== undefined) updateData.failureThreshold = dto.failureThreshold;
    if (dto.successThreshold !== undefined) updateData.successThreshold = dto.successThreshold;
    if (dto.circuitState !== undefined) updateData.circuitState = dto.circuitState;
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata as Prisma.JsonObject;

    return this.prisma.integrationConnector.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteConnector(id: string): Promise<void> {
    await this.prisma.integrationConnector.delete({ where: { id } });
  }

  async listConnectors(query: ConnectorQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.IntegrationConnectorWhereInput = {};

    if (filters.type) where.type = filters.type;
    if (filters.direction) where.direction = filters.direction;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.circuitState) where.circuitState = filters.circuitState;
    if (filters.healthStatus) where.healthStatus = filters.healthStatus;

    const [items, total] = await Promise.all([
      this.prisma.integrationConnector.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.integrationConnector.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async incrementConnectorStats(connectorCode: string, success: boolean): Promise<void> {
    const updateData: Prisma.IntegrationConnectorUpdateInput = {
      totalMessages: { increment: 1 },
    };

    if (success) {
      updateData.successfulMessages = { increment: 1 };
    } else {
      updateData.failedMessages = { increment: 1 };
    }

    await this.prisma.integrationConnector.update({
      where: { code: connectorCode },
      data: updateData,
    }).catch(() => {
      // Connector may not exist, ignore
    });
  }

  // ============================================
  // Transformation Management
  // ============================================

  async createTransformation(dto: CreateTransformationDto): Promise<IntegrationTransformation> {
    return this.prisma.integrationTransformation.create({
      data: {
        name: dto.name,
        description: dto.description,
        sourceConnector: dto.sourceConnector,
        targetConnector: dto.targetConnector,
        sourceType: dto.sourceType,
        targetType: dto.targetType,
        isActive: dto.isActive ?? true,
        priority: dto.priority ?? 0,
        sourceToCanonical: dto.sourceToCanonical as Prisma.JsonObject,
        canonicalToTarget: dto.canonicalToTarget as Prisma.JsonObject,
        sourceSchema: dto.sourceSchema as Prisma.JsonObject | undefined,
        canonicalSchema: dto.canonicalSchema as Prisma.JsonObject | undefined,
        targetSchema: dto.targetSchema as Prisma.JsonObject | undefined,
        metadata: (dto.metadata ?? {}) as Prisma.JsonObject,
      },
    });
  }

  async getTransformation(id: string): Promise<IntegrationTransformation | null> {
    return this.prisma.integrationTransformation.findUnique({ where: { id } });
  }

  async updateTransformation(id: string, dto: UpdateTransformationDto): Promise<IntegrationTransformation> {
    const updateData: Prisma.IntegrationTransformationUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.sourceToCanonical !== undefined) updateData.sourceToCanonical = dto.sourceToCanonical as Prisma.JsonObject;
    if (dto.canonicalToTarget !== undefined) updateData.canonicalToTarget = dto.canonicalToTarget as Prisma.JsonObject;
    if (dto.sourceSchema !== undefined) updateData.sourceSchema = dto.sourceSchema as Prisma.JsonObject;
    if (dto.canonicalSchema !== undefined) updateData.canonicalSchema = dto.canonicalSchema as Prisma.JsonObject;
    if (dto.targetSchema !== undefined) updateData.targetSchema = dto.targetSchema as Prisma.JsonObject;
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata as Prisma.JsonObject;

    return this.prisma.integrationTransformation.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteTransformation(id: string): Promise<void> {
    await this.prisma.integrationTransformation.delete({ where: { id } });
  }

  async listTransformations(query: TransformationQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.IntegrationTransformationWhereInput = {};

    if (filters.sourceConnector) where.sourceConnector = filters.sourceConnector;
    if (filters.targetConnector) where.targetConnector = filters.targetConnector;
    if (filters.sourceType) where.sourceType = filters.sourceType;
    if (filters.targetType) where.targetType = filters.targetType;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    const [items, total] = await Promise.all([
      this.prisma.integrationTransformation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.integrationTransformation.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================
  // Health Check
  // ============================================

  async getConnectorHealth(connectorCode: string) {
    const connector = await this.prisma.integrationConnector.findUnique({
      where: { code: connectorCode },
    });

    if (!connector) return null;

    const successRate = connector.totalMessages > 0
      ? (connector.successfulMessages / connector.totalMessages) * 100
      : 100;

    return {
      code: connector.code,
      name: connector.name,
      status: connector.healthStatus,
      circuitState: connector.circuitState,
      isActive: connector.isActive,
      lastHealthCheck: connector.lastHealthCheck,
      healthDetails: connector.healthDetails,
      metrics: {
        totalMessages: connector.totalMessages,
        successfulMessages: connector.successfulMessages,
        failedMessages: connector.failedMessages,
        successRate: Math.round(successRate * 100) / 100,
      },
    };
  }

  async getAllConnectorsHealth() {
    const connectors = await this.prisma.integrationConnector.findMany({
      where: { isActive: true },
    });

    return connectors.map((connector) => {
      const successRate = connector.totalMessages > 0
        ? (connector.successfulMessages / connector.totalMessages) * 100
        : 100;

      return {
        code: connector.code,
        name: connector.name,
        status: connector.healthStatus,
        circuitState: connector.circuitState,
        isActive: connector.isActive,
        lastHealthCheck: connector.lastHealthCheck,
        metrics: {
          totalMessages: connector.totalMessages,
          successfulMessages: connector.successfulMessages,
          failedMessages: connector.failedMessages,
          successRate: Math.round(successRate * 100) / 100,
        },
      };
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async performHealthChecks(): Promise<void> {
    const connectors = await this.prisma.integrationConnector.findMany({
      where: { isActive: true },
    });

    for (const connector of connectors) {
      try {
        const healthStatus = await this.checkConnectorHealth(connector);
        await this.prisma.integrationConnector.update({
          where: { id: connector.id },
          data: {
            healthStatus,
            lastHealthCheck: new Date(),
          },
        });
      } catch (error) {
        this.logger.error(`Health check failed for connector ${connector.code}:`, error);
        await this.prisma.integrationConnector.update({
          where: { id: connector.id },
          data: {
            healthStatus: ConnectorHealthStatus.UNHEALTHY,
            lastHealthCheck: new Date(),
            healthDetails: { error: (error as Error).message } as Prisma.JsonObject,
          },
        });
      }
    }
  }

  private async checkConnectorHealth(
    connector: IntegrationConnector,
  ): Promise<ConnectorHealthStatus> {
    // Basic health check based on circuit breaker state and recent success rate
    if (connector.circuitState === CircuitBreakerState.OPEN) {
      return ConnectorHealthStatus.UNHEALTHY;
    }

    if (connector.circuitState === CircuitBreakerState.HALF_OPEN) {
      return ConnectorHealthStatus.DEGRADED;
    }

    if (connector.totalMessages > 0) {
      const successRate = connector.successfulMessages / connector.totalMessages;
      if (successRate < 0.5) return ConnectorHealthStatus.UNHEALTHY;
      if (successRate < 0.9) return ConnectorHealthStatus.DEGRADED;
    }

    return ConnectorHealthStatus.HEALTHY;
  }

  // ============================================
  // Error Handling
  // ============================================

  private async handleProcessingError(
    message: IntegrationMessage,
    error: Error,
  ): Promise<ProcessingResult> {
    await this.recordFailure(message.targetConnector);

    await this.updateMessage(message.id, {
      status: IntegrationMessageStatus.FAILED,
      lastError: error.message,
      errorDetails: { stack: error.stack },
    });

    if (message.retryCount >= message.maxRetries) {
      await this.moveToDeadLetter(message, 'MAX_RETRIES_EXCEEDED', error.message);
      return {
        messageId: message.messageId,
        status: IntegrationMessageStatus.DEAD_LETTER,
        error: error.message,
        movedToDlq: true,
      };
    }

    await this.scheduleRetry(message);
    return {
      messageId: message.messageId,
      status: IntegrationMessageStatus.RETRYING,
      error: error.message,
      retryScheduled: true,
    };
  }
}
