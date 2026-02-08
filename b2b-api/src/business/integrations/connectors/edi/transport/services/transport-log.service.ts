import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  TransportLog,
  TransportProtocol,
  TransportDirection,
  TransportStatus,
} from '../interfaces';

/**
 * Start log DTO
 */
export interface StartLogDto {
  tenantId: string;
  partnerId: string;
  protocol: TransportProtocol;
  direction: TransportDirection;
  messageId?: string;
  correlationId?: string;
  filename?: string;
  contentType?: string;
  contentSize?: number;
  maxRetries?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Update log DTO
 */
export interface UpdateLogDto {
  messageId?: string;
  contentSize?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Log query options
 */
export interface LogQueryOptions {
  tenantId: string;
  partnerId?: string;
  protocol?: TransportProtocol;
  direction?: TransportDirection;
  status?: TransportStatus;
  startDate?: Date;
  endDate?: Date;
  correlationId?: string;
  page?: number;
  limit?: number;
}

/**
 * Log statistics
 */
export interface LogStatistics {
  totalMessages: number;
  completedMessages: number;
  failedMessages: number;
  inProgressMessages: number;
  averageDurationMs: number;
  byProtocol: Record<string, { total: number; completed: number; failed: number }>;
  byPartner: Record<string, { total: number; completed: number; failed: number }>;
  errorRate: number;
  throughputPerHour: number;
}

/**
 * Transport Log Service
 *
 * Provides logging and audit trail for transport operations:
 * - Track all message sends/receives
 * - Record timing and size metrics
 * - Error tracking and analysis
 * - Retention policy enforcement
 */
@Injectable()
export class TransportLogService {
  private readonly logger = new Logger(TransportLogService.name);
  private readonly logs = new Map<string, TransportLog>();
  private readonly logsByTenant = new Map<string, Set<string>>();
  private readonly retentionDays: number;

  constructor() {
    this.retentionDays = parseInt(process.env.TRANSPORT_LOG_RETENTION_DAYS || '30', 10);

    // Start cleanup interval
    setInterval(() => this.cleanupOldLogs(), 3600000); // Every hour
  }

  /**
   * Start a new transport log entry
   */
  async startLog(dto: StartLogDto): Promise<string> {
    const id = randomUUID();
    const now = new Date();

    const log: TransportLog = {
      id,
      tenantId: dto.tenantId,
      partnerId: dto.partnerId,
      protocol: dto.protocol,
      direction: dto.direction,
      status: TransportStatus.IN_PROGRESS,
      messageId: dto.messageId,
      correlationId: dto.correlationId,
      filename: dto.filename,
      contentType: dto.contentType,
      contentSize: dto.contentSize,
      retryCount: 0,
      maxRetries: dto.maxRetries || 3,
      startedAt: now,
      metadata: dto.metadata,
    };

    // Store log
    this.logs.set(id, log);

    // Index by tenant
    if (!this.logsByTenant.has(dto.tenantId)) {
      this.logsByTenant.set(dto.tenantId, new Set());
    }
    this.logsByTenant.get(dto.tenantId)!.add(id);

    this.logger.debug(`Started transport log: ${id}`);
    return id;
  }

  /**
   * Update a log entry
   */
  async updateLog(id: string, dto: UpdateLogDto): Promise<TransportLog | undefined> {
    const log = this.logs.get(id);
    if (!log) {
      return undefined;
    }

    if (dto.messageId !== undefined) log.messageId = dto.messageId;
    if (dto.contentSize !== undefined) log.contentSize = dto.contentSize;
    if (dto.metadata) log.metadata = { ...log.metadata, ...dto.metadata };

    return log;
  }

  /**
   * Mark log as completed
   */
  async completeLog(
    id: string,
    details?: { messageId?: string; metadata?: Record<string, unknown> },
  ): Promise<TransportLog | undefined> {
    const log = this.logs.get(id);
    if (!log) {
      return undefined;
    }

    const now = new Date();
    log.status = TransportStatus.COMPLETED;
    log.completedAt = now;
    log.durationMs = now.getTime() - log.startedAt.getTime();

    if (details?.messageId) log.messageId = details.messageId;
    if (details?.metadata) log.metadata = { ...log.metadata, ...details.metadata };

    this.logger.debug(`Completed transport log: ${id} in ${log.durationMs}ms`);
    return log;
  }

  /**
   * Mark log as failed
   */
  async failLog(
    id: string,
    error: string,
    errorDetails?: Record<string, unknown>,
  ): Promise<TransportLog | undefined> {
    const log = this.logs.get(id);
    if (!log) {
      return undefined;
    }

    const now = new Date();
    log.status = TransportStatus.FAILED;
    log.completedAt = now;
    log.durationMs = now.getTime() - log.startedAt.getTime();
    log.error = error;
    log.errorDetails = errorDetails;

    this.logger.warn(`Failed transport log: ${id} - ${error}`);
    return log;
  }

  /**
   * Increment retry count
   */
  async incrementRetry(id: string): Promise<TransportLog | undefined> {
    const log = this.logs.get(id);
    if (!log) {
      return undefined;
    }

    log.retryCount++;
    log.status = TransportStatus.RETRYING;

    this.logger.debug(`Retrying transport log: ${id} (attempt ${log.retryCount})`);
    return log;
  }

  /**
   * Get log by ID
   */
  async getLog(id: string): Promise<TransportLog | undefined> {
    return this.logs.get(id);
  }

  /**
   * Get log by correlation ID
   */
  async getLogByCorrelationId(
    tenantId: string,
    correlationId: string,
  ): Promise<TransportLog | undefined> {
    const tenantLogs = this.logsByTenant.get(tenantId);
    if (!tenantLogs) {
      return undefined;
    }

    for (const logId of tenantLogs) {
      const log = this.logs.get(logId);
      if (log?.correlationId === correlationId) {
        return log;
      }
    }

    return undefined;
  }

  /**
   * Query logs
   */
  async queryLogs(options: LogQueryOptions): Promise<{ logs: TransportLog[]; total: number }> {
    const tenantLogs = this.logsByTenant.get(options.tenantId);
    if (!tenantLogs) {
      return { logs: [], total: 0 };
    }

    let results: TransportLog[] = [];

    for (const logId of tenantLogs) {
      const log = this.logs.get(logId);
      if (!log) continue;

      // Apply filters
      if (options.partnerId && log.partnerId !== options.partnerId) continue;
      if (options.protocol && log.protocol !== options.protocol) continue;
      if (options.direction && log.direction !== options.direction) continue;
      if (options.status && log.status !== options.status) continue;
      if (options.correlationId && log.correlationId !== options.correlationId) continue;
      if (options.startDate && log.startedAt < options.startDate) continue;
      if (options.endDate && log.startedAt > options.endDate) continue;

      results.push(log);
    }

    // Sort by startedAt descending
    results.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    const total = results.length;

    // Apply pagination
    if (options.page !== undefined && options.limit !== undefined) {
      const offset = (options.page - 1) * options.limit;
      results = results.slice(offset, offset + options.limit);
    }

    return { logs: results, total };
  }

  /**
   * Get statistics for a tenant
   */
  async getStatistics(tenantId: string, startDate?: Date, endDate?: Date): Promise<LogStatistics> {
    const tenantLogs = this.logsByTenant.get(tenantId);
    if (!tenantLogs) {
      return {
        totalMessages: 0,
        completedMessages: 0,
        failedMessages: 0,
        inProgressMessages: 0,
        averageDurationMs: 0,
        byProtocol: {},
        byPartner: {},
        errorRate: 0,
        throughputPerHour: 0,
      };
    }

    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours
    const end = endDate || new Date();

    let totalMessages = 0;
    let completedMessages = 0;
    let failedMessages = 0;
    let inProgressMessages = 0;
    let totalDurationMs = 0;
    let durationCount = 0;

    const byProtocol: Record<string, { total: number; completed: number; failed: number }> = {};
    const byPartner: Record<string, { total: number; completed: number; failed: number }> = {};

    for (const logId of tenantLogs) {
      const log = this.logs.get(logId);
      if (!log) continue;

      // Filter by date range
      if (log.startedAt < start || log.startedAt > end) continue;

      totalMessages++;

      // Count by status
      switch (log.status) {
        case TransportStatus.COMPLETED:
          completedMessages++;
          break;
        case TransportStatus.FAILED:
          failedMessages++;
          break;
        case TransportStatus.IN_PROGRESS:
        case TransportStatus.PENDING:
        case TransportStatus.RETRYING:
          inProgressMessages++;
          break;
      }

      // Duration stats
      if (log.durationMs !== undefined) {
        totalDurationMs += log.durationMs;
        durationCount++;
      }

      // By protocol
      if (!byProtocol[log.protocol]) {
        byProtocol[log.protocol] = { total: 0, completed: 0, failed: 0 };
      }
      byProtocol[log.protocol].total++;
      if (log.status === TransportStatus.COMPLETED) byProtocol[log.protocol].completed++;
      if (log.status === TransportStatus.FAILED) byProtocol[log.protocol].failed++;

      // By partner
      if (!byPartner[log.partnerId]) {
        byPartner[log.partnerId] = { total: 0, completed: 0, failed: 0 };
      }
      byPartner[log.partnerId].total++;
      if (log.status === TransportStatus.COMPLETED) byPartner[log.partnerId].completed++;
      if (log.status === TransportStatus.FAILED) byPartner[log.partnerId].failed++;
    }

    // Calculate derived metrics
    const averageDurationMs = durationCount > 0 ? totalDurationMs / durationCount : 0;
    const errorRate = totalMessages > 0 ? (failedMessages / totalMessages) * 100 : 0;
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const throughputPerHour = hours > 0 ? totalMessages / hours : 0;

    return {
      totalMessages,
      completedMessages,
      failedMessages,
      inProgressMessages,
      averageDurationMs,
      byProtocol,
      byPartner,
      errorRate,
      throughputPerHour,
    };
  }

  /**
   * Get recent errors
   */
  async getRecentErrors(tenantId: string, limit: number = 10): Promise<TransportLog[]> {
    const { logs } = await this.queryLogs({
      tenantId,
      status: TransportStatus.FAILED,
      limit,
    });
    return logs;
  }

  /**
   * Delete a log entry
   */
  async deleteLog(id: string): Promise<boolean> {
    const log = this.logs.get(id);
    if (!log) {
      return false;
    }

    this.logs.delete(id);
    this.logsByTenant.get(log.tenantId)?.delete(id);
    return true;
  }

  /**
   * Archive logs older than retention period
   */
  async archiveLogs(tenantId: string): Promise<{ archived: number; deleted: number }> {
    const cutoffDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    const tenantLogs = this.logsByTenant.get(tenantId);

    if (!tenantLogs) {
      return { archived: 0, deleted: 0 };
    }

    let archived = 0;
    let deleted = 0;
    const toDelete: string[] = [];

    for (const logId of tenantLogs) {
      const log = this.logs.get(logId);
      if (!log) continue;

      if (log.startedAt < cutoffDate) {
        // In a real implementation, archive to cold storage before deleting
        toDelete.push(logId);
        archived++;
      }
    }

    // Delete archived logs
    for (const logId of toDelete) {
      await this.deleteLog(logId);
      deleted++;
    }

    this.logger.log(`Archived ${archived} logs for tenant ${tenantId}, deleted ${deleted}`);
    return { archived, deleted };
  }

  /**
   * Cleanup old logs (called periodically)
   */
  private async cleanupOldLogs(): Promise<void> {
    const cutoffDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    const toDelete: string[] = [];

    for (const [logId, log] of this.logs) {
      if (log.startedAt < cutoffDate) {
        toDelete.push(logId);
      }
    }

    for (const logId of toDelete) {
      await this.deleteLog(logId);
    }

    if (toDelete.length > 0) {
      this.logger.log(`Cleaned up ${toDelete.length} old transport logs`);
    }
  }

  /**
   * Export logs for a tenant (for backup/compliance)
   */
  async exportLogs(tenantId: string, startDate: Date, endDate: Date): Promise<TransportLog[]> {
    const { logs } = await this.queryLogs({
      tenantId,
      startDate,
      endDate,
    });
    return logs;
  }
}
