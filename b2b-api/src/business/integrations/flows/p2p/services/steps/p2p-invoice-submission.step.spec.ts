import { Test, TestingModule } from '@nestjs/testing';
import { P2PInvoiceSubmissionStep } from './p2p-invoice-submission.step';
import {
  P2PFlowInstance,
  P2PStepConfig,
  P2PStepContext,
  P2PStepType,
  P2PFlowStatus,
  POStatus,
  VendorInvoiceStatus,
  ThreeWayMatchResult,
} from '../../interfaces';

describe('P2PInvoiceSubmissionStep', () => {
  let step: P2PInvoiceSubmissionStep;

  const mockTenantId = 'tenant-123';

  const createMockFlow = (overrides: Partial<P2PFlowInstance> = {}): P2PFlowInstance => ({
    id: 'flow-123',
    tenantId: mockTenantId,
    configId: 'config-123',
    purchaseOrderId: 'po-123',
    poNumber: 'PO-001',
    status: P2PFlowStatus.RUNNING,
    steps: [],
    poData: {
      poId: 'po-123',
      poNumber: 'PO-001',
      status: POStatus.FULLY_RECEIVED,
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
    invoiceData: {
      invoiceId: 'inv-123',
      invoiceNumber: 'INV-001',
      status: VendorInvoiceStatus.PENDING,
      vendorId: 'vendor-001',
      poId: 'po-123',
      poNumber: 'PO-001',
      invoiceDate: new Date(),
      dueDate: new Date(),
      subtotal: 1000,
      tax: 100,
      shipping: 50,
      total: 1150,
      currency: 'USD',
      amountPaid: 0,
      amountDue: 1150,
      items: [],
    },
    matchData: {
      matchId: 'match-123',
      poId: 'po-123',
      invoiceId: 'inv-123',
      status: ThreeWayMatchResult.MATCHED,
      matchedAt: new Date(),
      items: [],
      discrepancies: [],
      requiresApproval: false,
    },
    errorCount: 0,
    startedAt: new Date(),
    lastActivityAt: new Date(),
    correlationId: 'corr-123',
    ...overrides,
  });

  const createMockConfig = (): P2PStepConfig => ({
    stepType: P2PStepType.INVOICE_SUBMISSION,
    enabled: true,
    order: 7,
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
      providers: [P2PInvoiceSubmissionStep],
    }).compile();

    step = module.get<P2PInvoiceSubmissionStep>(P2PInvoiceSubmissionStep);
  });

  describe('stepType', () => {
    it('should have INVOICE_SUBMISSION step type', () => {
      expect(step.stepType).toBe(P2PStepType.INVOICE_SUBMISSION);
    });
  });

  describe('execute', () => {
    it('should submit invoice successfully', async () => {
      const flow = createMockFlow();
      const config = createMockConfig();
      const context = createMockContext();

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output?.invoiceNumber).toBe('INV-001');
      expect(result.output?.status).toBe(VendorInvoiceStatus.SUBMITTED);
      expect(flow.invoiceData?.status).toBe(VendorInvoiceStatus.SUBMITTED);
      expect(flow.poData.status).toBe(POStatus.INVOICED);
    });

    it('should fail when no invoice data', async () => {
      const flow = createMockFlow({ invoiceData: undefined });
      const config = createMockConfig();
      const context = createMockContext();

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NO_INVOICE_DATA');
      expect(result.retryable).toBe(false);
    });

    it('should fail when match failed and not approved', async () => {
      const flow = createMockFlow({
        matchData: {
          matchId: 'match-123',
          poId: 'po-123',
          invoiceId: 'inv-123',
          status: ThreeWayMatchResult.NOT_MATCHED,
          matchedAt: new Date(),
          items: [],
          discrepancies: [],
          requiresApproval: true,
          approvedBy: undefined,
        },
      });
      const config = createMockConfig();
      const context = createMockContext();

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('MATCH_NOT_APPROVED');
      expect(result.requiresApproval).toBe(true);
      expect(result.retryable).toBe(false);
    });

    it('should proceed when match failed but approved', async () => {
      const flow = createMockFlow({
        matchData: {
          matchId: 'match-123',
          poId: 'po-123',
          invoiceId: 'inv-123',
          status: ThreeWayMatchResult.NOT_MATCHED,
          matchedAt: new Date(),
          items: [],
          discrepancies: [],
          requiresApproval: true,
          approvedBy: 'manager@example.com',
          approvedAt: new Date(),
        },
      });
      const config = createMockConfig();
      const context = createMockContext();

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(true);
    });

    it('should submit to ERP when connector is configured', async () => {
      const flow = createMockFlow();
      const config = createMockConfig();
      const context = createMockContext(true);

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(true);
      expect(flow.externalInvoiceId).toBeDefined();
      expect(flow.invoiceData?.externalInvoiceId).toBeDefined();
    });

    it('should handle ERP submission failure', async () => {
      const flow = createMockFlow();
      const config = createMockConfig();
      const context = createMockContext(true);

      // Mock the submitToERP to fail by forcing an exception
      jest.spyOn(step as any, 'submitToERP').mockResolvedValue({
        success: false,
        error: 'ERP connection failed',
        errorCode: 'ERP_ERROR',
      });

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(false);
    });

    it('should handle exceptions during execution', async () => {
      const flow = createMockFlow();
      const config = createMockConfig();
      const context = createMockContext();

      // Force an error
      Object.defineProperty(flow, 'invoiceData', {
        get() {
          throw new Error('Unexpected error');
        },
      });

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(result.errorCode).toBe('INVOICE_SUBMISSION_ERROR');
      expect(result.retryable).toBe(true);
    });

    it('should handle non-Error exceptions', async () => {
      const flow = createMockFlow();
      const config = createMockConfig();
      const context = createMockContext();

      Object.defineProperty(flow, 'invoiceData', {
        get() {
          throw 'String error';
        },
      });

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('validate', () => {
    it('should return true when invoice and match data exist', async () => {
      const flow = createMockFlow();
      const config = createMockConfig();

      const result = await step.validate(flow, config);

      expect(result).toBe(true);
    });

    it('should return false when invoice data is missing', async () => {
      const flow = createMockFlow({ invoiceData: undefined });
      const config = createMockConfig();

      const result = await step.validate(flow, config);

      expect(result).toBe(false);
    });

    it('should return false when match data is missing', async () => {
      const flow = createMockFlow({ matchData: undefined });
      const config = createMockConfig();

      const result = await step.validate(flow, config);

      expect(result).toBe(false);
    });
  });

  describe('canRetry', () => {
    it('should not retry for NO_INVOICE_DATA error', () => {
      expect(step.canRetry('NO_INVOICE_DATA', 1)).toBe(false);
    });

    it('should not retry for MATCH_NOT_APPROVED error', () => {
      expect(step.canRetry('MATCH_NOT_APPROVED', 1)).toBe(false);
    });

    it('should retry for other errors when attempt < 3', () => {
      expect(step.canRetry('ERP_ERROR', 1)).toBe(true);
      expect(step.canRetry('NETWORK_ERROR', 2)).toBe(true);
    });

    it('should not retry when attempt >= 3', () => {
      expect(step.canRetry('ERP_ERROR', 3)).toBe(false);
      expect(step.canRetry('NETWORK_ERROR', 4)).toBe(false);
    });
  });
});
