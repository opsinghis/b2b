import { Test, TestingModule } from '@nestjs/testing';
import { P2PPOReceiptStep } from './p2p-po-receipt.step';
import {
  P2PFlowInstance,
  P2PStepConfig,
  P2PStepContext,
  P2PStepType,
  P2PFlowStatus,
  POStatus,
} from '../../interfaces';

describe('P2PPOReceiptStep', () => {
  let step: P2PPOReceiptStep;

  const mockTenantId = 'tenant-123';
  const mockPoId = 'po-123';

  const createMockFlow = (overrides: Partial<P2PFlowInstance> = {}): P2PFlowInstance => ({
    id: 'flow-123',
    tenantId: mockTenantId,
    configId: 'config-123',
    purchaseOrderId: mockPoId,
    poNumber: '',
    status: P2PFlowStatus.RUNNING,
    steps: [],
    poData: null as any,
    errorCount: 0,
    startedAt: new Date(),
    lastActivityAt: new Date(),
    correlationId: 'corr-123',
    ...overrides,
  });

  const createMockConfig = (): P2PStepConfig => ({
    stepType: P2PStepType.PO_RECEIPT,
    enabled: true,
    order: 1,
  });

  const createMockContext = (withConnector = false): P2PStepContext => ({
    tenantId: mockTenantId,
    correlationId: 'corr-123',
    connectorContext: withConnector
      ? { configId: 'connector-123', credentials: {}, config: {} }
      : undefined,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [P2PPOReceiptStep],
    }).compile();

    step = module.get<P2PPOReceiptStep>(P2PPOReceiptStep);
  });

  describe('stepType', () => {
    it('should have PO_RECEIPT step type', () => {
      expect(step.stepType).toBe(P2PStepType.PO_RECEIPT);
    });
  });

  describe('execute', () => {
    it('should process PO receipt successfully', async () => {
      const flow = createMockFlow();
      const config = createMockConfig();
      const context = createMockContext();

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output?.poNumber).toBeDefined();
      expect(result.output?.receivedAt).toBeDefined();
      expect(flow.poData).toBeDefined();
      expect(flow.poData.status).toBe(POStatus.RECEIVED);
    });

    it('should use existing PO data if already populated', async () => {
      const flow = createMockFlow({
        poData: {
          poId: mockPoId,
          poNumber: 'EXISTING-PO-001',
          status: POStatus.DRAFT,
          vendorId: 'vendor-001',
          buyerId: mockTenantId,
          subtotal: 1000,
          tax: 100,
          shipping: 50,
          total: 1150,
          currency: 'USD',
          shipToAddress: {
            street1: '123 Main St',
            city: 'Test City',
            postalCode: '12345',
            country: 'US',
          },
          billToAddress: {
            street1: '456 Bill St',
            city: 'Bill City',
            postalCode: '67890',
            country: 'US',
          },
          items: [],
          poDate: new Date(),
        },
      });
      const config = createMockConfig();
      const context = createMockContext();

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(true);
      expect(flow.poData.poNumber).toBe('EXISTING-PO-001');
      expect(flow.poData.status).toBe(POStatus.RECEIVED);
    });

    it('should fetch from ERP when connector is configured', async () => {
      const flow = createMockFlow();
      const config = createMockConfig();
      const context = createMockContext(true);

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(true);
      expect(flow.poData).toBeDefined();
    });

    it('should return error result on exception', async () => {
      const flow = createMockFlow();
      const config = createMockConfig();
      const context = createMockContext();

      // Force an error by mocking fetchPurchaseOrder to throw
      jest.spyOn(step as any, 'fetchPurchaseOrder').mockRejectedValue(new Error('Test error'));

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(result.errorCode).toBe('PO_RECEIPT_ERROR');
      expect(result.retryable).toBe(true);
    });

    it('should handle non-Error exceptions', async () => {
      const flow = createMockFlow();
      const config = createMockConfig();
      const context = createMockContext();

      // Force a non-Error exception
      jest.spyOn(step as any, 'fetchPurchaseOrder').mockRejectedValue('String error');

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should include external PO ID in output', async () => {
      const flow = createMockFlow({
        externalPOId: 'EXT-PO-001',
      });
      const config = createMockConfig();
      const context = createMockContext();

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(true);
      expect(result.output?.externalPONumber).toBe('EXT-PO-001');
    });
  });

  describe('validate', () => {
    it('should return true when purchaseOrderId exists', async () => {
      const flow = createMockFlow({ purchaseOrderId: 'po-123' });
      const config = createMockConfig();

      const result = await step.validate(flow, config);

      expect(result).toBe(true);
    });

    it('should return false when purchaseOrderId is missing', async () => {
      const flow = createMockFlow({ purchaseOrderId: '' });
      const config = createMockConfig();

      const result = await step.validate(flow, config);

      expect(result).toBe(false);
    });

    it('should return false when purchaseOrderId is undefined', async () => {
      const flow = createMockFlow({ purchaseOrderId: undefined as any });
      const config = createMockConfig();

      const result = await step.validate(flow, config);

      expect(result).toBe(false);
    });
  });

  describe('canRetry', () => {
    it('should allow retry when attempt is less than 3', () => {
      expect(step.canRetry('any error', 1)).toBe(true);
      expect(step.canRetry('any error', 2)).toBe(true);
    });

    it('should not allow retry when attempt is 3 or more', () => {
      expect(step.canRetry('any error', 3)).toBe(false);
      expect(step.canRetry('any error', 4)).toBe(false);
    });
  });
});
