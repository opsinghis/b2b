import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationHubService, RetryConfig } from './integration-hub.service';
import { PrismaService } from '@infrastructure/database';
import {
  IntegrationMessageStatus,
  IntegrationDirection,
  IntegrationConnectorType,
  CircuitBreakerState,
  ConnectorHealthStatus,
} from '@prisma/client';

describe('IntegrationHubService', () => {
  let service: IntegrationHubService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  const mockMessage = {
    id: 'msg-123',
    messageId: 'ext-msg-001',
    correlationId: 'corr-001',
    sourceConnector: 'erp-sap',
    targetConnector: 'ecommerce',
    direction: IntegrationDirection.INBOUND,
    type: 'ORDER_CREATED',
    status: IntegrationMessageStatus.PENDING,
    priority: 0,
    sourcePayload: { orderId: '12345', items: [] },
    canonicalPayload: null,
    targetPayload: null,
    transformedAt: null,
    transformErrors: null,
    retryCount: 0,
    maxRetries: 3,
    nextRetryAt: null,
    lastError: null,
    errorDetails: null,
    dlqReason: null,
    movedToDlqAt: null,
    circuitState: null,
    idempotencyKey: 'idem-key-001',
    processedHash: 'hash123',
    isDuplicate: false,
    receivedAt: new Date(),
    processedAt: null,
    completedAt: null,
    failedAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConnector = {
    id: 'conn-123',
    code: 'erp-sap',
    name: 'SAP ERP',
    description: 'SAP ERP Integration',
    type: IntegrationConnectorType.ERP,
    direction: IntegrationDirection.BIDIRECTIONAL,
    isActive: true,
    config: {},
    credentials: {},
    rateLimit: 100,
    rateLimitWindow: 60,
    currentCount: 0,
    windowStart: null,
    circuitState: CircuitBreakerState.CLOSED,
    failureCount: 0,
    failureThreshold: 5,
    successCount: 0,
    successThreshold: 3,
    lastFailureAt: null,
    circuitOpenedAt: null,
    halfOpenAt: null,
    lastHealthCheck: null,
    healthStatus: ConnectorHealthStatus.HEALTHY,
    healthDetails: null,
    totalMessages: 100,
    successfulMessages: 95,
    failedMessages: 5,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransformation = {
    id: 'trans-123',
    name: 'SAP Order to Canonical',
    description: 'Transform SAP orders',
    sourceConnector: 'erp-sap',
    targetConnector: 'ecommerce',
    sourceType: 'ORDER_CREATED',
    targetType: 'ORDER_RECEIVED',
    isActive: true,
    priority: 0,
    sourceToCanonical: {
      mappings: [
        { source: 'orderId', target: 'order.id' },
        { source: 'items', target: 'order.lineItems' },
      ],
      defaults: { source: 'SAP' },
    },
    canonicalToTarget: {
      mappings: [
        { source: 'order.id', target: 'externalOrderId' },
        { source: 'order.lineItems', target: 'products' },
      ],
    },
    sourceSchema: null,
    canonicalSchema: null,
    targetSchema: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDeadLetter = {
    id: 'dlq-123',
    originalMessageId: 'ext-msg-001',
    connector: 'erp-sap',
    reason: 'MAX_RETRIES_EXCEEDED',
    errorMessage: 'Connection timeout',
    errorStack: null,
    payload: { orderId: '12345' },
    metadata: {},
    retryable: true,
    reprocessedAt: null,
    reprocessedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      integrationMessage: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      integrationConnector: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      integrationTransformation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      integrationDeadLetter: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationHubService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<IntegrationHubService>(IntegrationHubService);
    prisma = module.get(PrismaService);
  });

  describe('Message Routing', () => {
    it('should create and route a message successfully', async () => {
      prisma.integrationMessage.findFirst.mockResolvedValue(null);
      prisma.integrationConnector.findUnique.mockResolvedValue(mockConnector);
      prisma.integrationMessage.create.mockResolvedValue(mockMessage);
      prisma.integrationTransformation.findFirst.mockResolvedValue(mockTransformation);
      prisma.integrationMessage.update.mockResolvedValue({
        ...mockMessage,
        status: IntegrationMessageStatus.COMPLETED,
      });

      const dto = {
        messageId: 'ext-msg-001',
        sourceConnector: 'erp-sap',
        targetConnector: 'ecommerce',
        direction: IntegrationDirection.INBOUND,
        type: 'ORDER_CREATED',
        sourcePayload: { orderId: '12345', items: [] },
        idempotencyKey: 'idem-key-001',
      };

      const result = await service.routeMessage(dto);

      expect(result.messageId).toBe(dto.messageId);
      expect(prisma.integrationMessage.create).toHaveBeenCalled();
    });

    it('should detect duplicate message via idempotency key', async () => {
      prisma.integrationMessage.findFirst.mockResolvedValue({
        ...mockMessage,
        status: IntegrationMessageStatus.COMPLETED,
      });

      const dto = {
        messageId: 'ext-msg-002',
        sourceConnector: 'erp-sap',
        targetConnector: 'ecommerce',
        direction: IntegrationDirection.INBOUND,
        type: 'ORDER_CREATED',
        sourcePayload: { orderId: '12345', items: [] },
        idempotencyKey: 'idem-key-001',
      };

      const result = await service.routeMessage(dto);

      expect(result.status).toBe(IntegrationMessageStatus.COMPLETED);
      expect(result.error).toContain('Duplicate');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow request when under rate limit', async () => {
      prisma.integrationConnector.findUnique.mockResolvedValue({
        ...mockConnector,
        currentCount: 50,
        windowStart: new Date(),
      });
      prisma.integrationConnector.update.mockResolvedValue(mockConnector);

      const result = await service.checkRateLimit('erp-sap');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(49);
    });

    it('should deny request when rate limit exceeded', async () => {
      const windowStart = new Date();
      prisma.integrationConnector.findUnique.mockResolvedValue({
        ...mockConnector,
        currentCount: 100,
        windowStart,
      });

      const result = await service.checkRateLimit('erp-sap');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset window when expired', async () => {
      const oldWindowStart = new Date(Date.now() - 120000); // 2 minutes ago
      prisma.integrationConnector.findUnique.mockResolvedValue({
        ...mockConnector,
        currentCount: 100,
        windowStart: oldWindowStart,
      });
      prisma.integrationConnector.update.mockResolvedValue(mockConnector);

      const result = await service.checkRateLimit('erp-sap');

      expect(result.allowed).toBe(true);
      expect(prisma.integrationConnector.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentCount: 1,
          }),
        }),
      );
    });

    it('should allow unlimited requests when no rate limit configured', async () => {
      prisma.integrationConnector.findUnique.mockResolvedValue({
        ...mockConnector,
        rateLimit: null,
        rateLimitWindow: null,
      });

      const result = await service.checkRateLimit('erp-sap');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });
  });

  describe('Circuit Breaker', () => {
    it('should return CLOSED state for healthy connector', async () => {
      prisma.integrationConnector.findUnique.mockResolvedValue(mockConnector);

      const state = await service.getCircuitState('erp-sap');

      expect(state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should return OPEN state when circuit is open', async () => {
      prisma.integrationConnector.findUnique.mockResolvedValue({
        ...mockConnector,
        circuitState: CircuitBreakerState.OPEN,
        circuitOpenedAt: new Date(), // Just opened
      });

      const state = await service.getCircuitState('erp-sap');

      expect(state).toBe(CircuitBreakerState.OPEN);
    });

    it('should transition from OPEN to HALF_OPEN after timeout', async () => {
      const openedAt = new Date(Date.now() - 60000); // 1 minute ago
      prisma.integrationConnector.findUnique.mockResolvedValue({
        ...mockConnector,
        circuitState: CircuitBreakerState.OPEN,
        circuitOpenedAt: openedAt,
      });
      prisma.integrationConnector.update.mockResolvedValue({
        ...mockConnector,
        circuitState: CircuitBreakerState.HALF_OPEN,
      });

      const state = await service.getCircuitState('erp-sap');

      expect(state).toBe(CircuitBreakerState.HALF_OPEN);
      expect(prisma.integrationConnector.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            circuitState: CircuitBreakerState.HALF_OPEN,
          }),
        }),
      );
    });

    it('should open circuit when failure threshold reached', async () => {
      prisma.integrationConnector.findUnique.mockResolvedValue({
        ...mockConnector,
        failureCount: 4,
        failureThreshold: 5,
      });
      prisma.integrationConnector.update.mockResolvedValue({
        ...mockConnector,
        circuitState: CircuitBreakerState.OPEN,
      });

      await service.recordFailure('erp-sap');

      expect(prisma.integrationConnector.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            circuitState: CircuitBreakerState.OPEN,
          }),
        }),
      );
    });

    it('should close circuit when success threshold reached in HALF_OPEN', async () => {
      prisma.integrationConnector.findUnique.mockResolvedValue({
        ...mockConnector,
        circuitState: CircuitBreakerState.HALF_OPEN,
        successCount: 2,
        successThreshold: 3,
      });
      prisma.integrationConnector.update.mockResolvedValue({
        ...mockConnector,
        circuitState: CircuitBreakerState.CLOSED,
      });

      await service.recordSuccess('erp-sap');

      expect(prisma.integrationConnector.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            circuitState: CircuitBreakerState.CLOSED,
          }),
        }),
      );
    });
  });

  describe('Retry with Exponential Backoff', () => {
    it('should calculate exponential backoff delay', () => {
      const config: RetryConfig = {
        maxRetries: 5,
        baseDelayMs: 1000,
        maxDelayMs: 60000,
        backoffMultiplier: 2,
      };

      // Retry 1: base * 2^0 = 1000ms
      const delay1 = service.calculateBackoffDelay(1, config);
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(1200); // With 20% jitter

      // Retry 3: base * 2^2 = 4000ms
      const delay3 = service.calculateBackoffDelay(3, config);
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThanOrEqual(4800);
    });

    it('should cap delay at maxDelayMs', () => {
      const config: RetryConfig = {
        maxRetries: 10,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
      };

      // Retry 10: would be 512000ms without cap
      const delay = service.calculateBackoffDelay(10, config);
      expect(delay).toBeLessThanOrEqual(36000); // 30000 + 20% jitter
    });

    it('should schedule retry with correct delay', async () => {
      prisma.integrationMessage.update.mockResolvedValue({
        ...mockMessage,
        status: IntegrationMessageStatus.RETRYING,
        retryCount: 1,
      });

      await service.scheduleRetry(mockMessage);

      expect(prisma.integrationMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: IntegrationMessageStatus.RETRYING,
            retryCount: 1,
            nextRetryAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should move to DLQ when max retries exceeded', async () => {
      const maxRetriesMessage = {
        ...mockMessage,
        retryCount: 3,
        maxRetries: 3,
      };

      prisma.integrationDeadLetter.create.mockResolvedValue(mockDeadLetter);
      prisma.integrationMessage.update.mockResolvedValue({
        ...maxRetriesMessage,
        status: IntegrationMessageStatus.DEAD_LETTER,
      });

      await service.scheduleRetry(maxRetriesMessage);

      expect(prisma.integrationDeadLetter.create).toHaveBeenCalled();
      expect(prisma.integrationMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: IntegrationMessageStatus.DEAD_LETTER,
          }),
        }),
      );
    });
  });

  describe('Dead Letter Queue', () => {
    it('should move message to DLQ', async () => {
      prisma.integrationDeadLetter.create.mockResolvedValue(mockDeadLetter);
      prisma.integrationMessage.update.mockResolvedValue({
        ...mockMessage,
        status: IntegrationMessageStatus.DEAD_LETTER,
      });
      prisma.integrationConnector.update.mockResolvedValue(mockConnector);

      const result = await service.moveToDeadLetter(
        mockMessage,
        'MAX_RETRIES_EXCEEDED',
        'Connection timeout',
      );

      expect(result.reason).toBe('MAX_RETRIES_EXCEEDED');
      expect(prisma.integrationDeadLetter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            originalMessageId: mockMessage.messageId,
            reason: 'MAX_RETRIES_EXCEEDED',
          }),
        }),
      );
    });

    it('should list dead letters with filters', async () => {
      prisma.integrationDeadLetter.findMany.mockResolvedValue([mockDeadLetter]);
      prisma.integrationDeadLetter.count.mockResolvedValue(1);

      const result = await service.listDeadLetters({
        connector: 'erp-sap',
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should reprocess dead letter message', async () => {
      prisma.integrationDeadLetter.findUnique.mockResolvedValue(mockDeadLetter);
      prisma.integrationDeadLetter.update.mockResolvedValue({
        ...mockDeadLetter,
        reprocessedAt: new Date(),
      });
      prisma.integrationMessage.findUnique.mockResolvedValue(mockMessage);
      prisma.integrationMessage.update.mockResolvedValue({
        ...mockMessage,
        status: IntegrationMessageStatus.PENDING,
      });
      prisma.integrationConnector.findUnique.mockResolvedValue(mockConnector);
      prisma.integrationTransformation.findFirst.mockResolvedValue(mockTransformation);

      const result = await service.reprocessDeadLetter('dlq-123', 'user-123');

      expect(result.messageId).toBe(mockMessage.messageId);
      expect(prisma.integrationDeadLetter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reprocessedAt: expect.any(Date),
            reprocessedById: 'user-123',
          }),
        }),
      );
    });

    it('should get DLQ statistics', async () => {
      prisma.integrationDeadLetter.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7) // retryable
        .mockResolvedValueOnce(2); // reprocessed
      prisma.integrationDeadLetter.groupBy
        .mockResolvedValueOnce([
          { connector: 'erp-sap', _count: { id: 5 } },
          { connector: 'ecommerce', _count: { id: 3 } },
        ])
        .mockResolvedValueOnce([
          { reason: 'MAX_RETRIES_EXCEEDED', _count: { id: 6 } },
          { reason: 'TRANSFORMATION_FAILED', _count: { id: 2 } },
        ]);

      const stats = await service.getDeadLetterStats();

      expect(stats.total).toBe(10);
      expect(stats.retryable).toBe(7);
      expect(stats.reprocessed).toBe(2);
      expect(stats.byConnector).toHaveLength(2);
      expect(stats.byReason).toHaveLength(2);
    });
  });

  describe('Transformation Pipeline', () => {
    it('should transform message from source to target', async () => {
      prisma.integrationTransformation.findFirst.mockResolvedValue(mockTransformation);

      const result = await service.transformMessage(mockMessage);

      expect(result.success).toBe(true);
      expect(result.canonicalPayload).toBeDefined();
      expect(result.targetPayload).toBeDefined();
    });

    it('should fail transformation when no rule found', async () => {
      prisma.integrationTransformation.findFirst.mockResolvedValue(null);

      const result = await service.transformMessage(mockMessage);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('No transformation found');
    });

    it('should test transformation with sample payload', async () => {
      prisma.integrationTransformation.findFirst.mockResolvedValue(mockTransformation);

      const result = await service.transformPayload({
        sourceConnector: 'erp-sap',
        targetConnector: 'ecommerce',
        sourceType: 'ORDER_CREATED',
        targetType: 'ORDER_RECEIVED',
        payload: { orderId: '12345', items: [] },
      });

      expect(result.success).toBe(true);
      expect(result.canonicalPayload).toBeDefined();
    });
  });

  describe('Idempotency', () => {
    it('should detect duplicate by idempotency key', async () => {
      prisma.integrationMessage.findFirst.mockResolvedValue({
        ...mockMessage,
        processedHash: 'hash123',
      });

      const result = await service.checkIdempotency('idem-key-001', { orderId: '12345', items: [] });

      expect(result.isDuplicate).toBe(true);
    });

    it('should not detect duplicate for new key', async () => {
      prisma.integrationMessage.findFirst.mockResolvedValue(null);

      const result = await service.checkIdempotency('new-key', { orderId: '67890' });

      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('Connector Management', () => {
    it('should create a connector', async () => {
      prisma.integrationConnector.create.mockResolvedValue(mockConnector);

      const result = await service.createConnector({
        code: 'erp-sap',
        name: 'SAP ERP',
        type: IntegrationConnectorType.ERP,
        direction: IntegrationDirection.BIDIRECTIONAL,
      });

      expect(result.code).toBe('erp-sap');
    });

    it('should get connector by code', async () => {
      prisma.integrationConnector.findUnique.mockResolvedValue(mockConnector);

      const result = await service.getConnectorByCode('erp-sap');

      expect(result).toEqual(mockConnector);
    });

    it('should list connectors with filters', async () => {
      prisma.integrationConnector.findMany.mockResolvedValue([mockConnector]);
      prisma.integrationConnector.count.mockResolvedValue(1);

      const result = await service.listConnectors({
        type: IntegrationConnectorType.ERP,
        isActive: true,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should update connector', async () => {
      prisma.integrationConnector.update.mockResolvedValue({
        ...mockConnector,
        name: 'Updated SAP ERP',
      });

      const result = await service.updateConnector('conn-123', {
        name: 'Updated SAP ERP',
      });

      expect(result.name).toBe('Updated SAP ERP');
    });

    it('should delete connector', async () => {
      prisma.integrationConnector.delete.mockResolvedValue(mockConnector);

      await service.deleteConnector('conn-123');

      expect(prisma.integrationConnector.delete).toHaveBeenCalledWith({
        where: { id: 'conn-123' },
      });
    });
  });

  describe('Health Check', () => {
    it('should get connector health status', async () => {
      prisma.integrationConnector.findUnique.mockResolvedValue(mockConnector);

      const result = await service.getConnectorHealth('erp-sap');

      expect(result).toBeDefined();
      expect(result!.code).toBe('erp-sap');
      expect(result!.status).toBe(ConnectorHealthStatus.HEALTHY);
      expect(result!.metrics.successRate).toBe(95);
    });

    it('should get all connectors health', async () => {
      prisma.integrationConnector.findMany.mockResolvedValue([mockConnector]);

      const result = await service.getAllConnectorsHealth();

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('erp-sap');
    });

    it('should return null for non-existent connector', async () => {
      prisma.integrationConnector.findUnique.mockResolvedValue(null);

      const result = await service.getConnectorHealth('unknown');

      expect(result).toBeNull();
    });
  });

  describe('Message CRUD', () => {
    it('should create a message', async () => {
      prisma.integrationMessage.create.mockResolvedValue(mockMessage);

      const result = await service.createMessage({
        messageId: 'ext-msg-001',
        sourceConnector: 'erp-sap',
        targetConnector: 'ecommerce',
        direction: IntegrationDirection.INBOUND,
        type: 'ORDER_CREATED',
        sourcePayload: { orderId: '12345' },
      });

      expect(result.messageId).toBe('ext-msg-001');
    });

    it('should get message by id', async () => {
      prisma.integrationMessage.findUnique.mockResolvedValue(mockMessage);

      const result = await service.getMessage('msg-123');

      expect(result).toEqual(mockMessage);
    });

    it('should list messages with pagination', async () => {
      prisma.integrationMessage.findMany.mockResolvedValue([mockMessage]);
      prisma.integrationMessage.count.mockResolvedValue(1);

      const result = await service.listMessages({
        sourceConnector: 'erp-sap',
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('Transformation Management', () => {
    it('should create a transformation', async () => {
      prisma.integrationTransformation.create.mockResolvedValue(mockTransformation);

      const result = await service.createTransformation({
        name: 'SAP Order to Canonical',
        sourceConnector: 'erp-sap',
        targetConnector: 'ecommerce',
        sourceType: 'ORDER_CREATED',
        targetType: 'ORDER_RECEIVED',
        sourceToCanonical: { mappings: [] },
        canonicalToTarget: { mappings: [] },
      });

      expect(result.name).toBe('SAP Order to Canonical');
    });

    it('should list transformations', async () => {
      prisma.integrationTransformation.findMany.mockResolvedValue([mockTransformation]);
      prisma.integrationTransformation.count.mockResolvedValue(1);

      const result = await service.listTransformations({
        sourceConnector: 'erp-sap',
      });

      expect(result.items).toHaveLength(1);
    });
  });
});
