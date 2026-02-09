import { Test, TestingModule } from '@nestjs/testing';
import { P2PPaymentTrackingStep } from './p2p-payment-tracking.step';
import {
  P2PFlowInstance,
  P2PStepConfig,
  P2PStepContext,
  P2PStepType,
  P2PFlowStatus,
  POStatus,
  VendorInvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  ThreeWayMatchResult,
} from '../../interfaces';

describe('P2PPaymentTrackingStep', () => {
  let step: P2PPaymentTrackingStep;

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
      status: POStatus.INVOICED,
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
      status: VendorInvoiceStatus.SUBMITTED,
      vendorId: 'vendor-001',
      poId: 'po-123',
      poNumber: 'PO-001',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
    stepType: P2PStepType.PAYMENT_TRACKING,
    enabled: true,
    order: 8,
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
      providers: [P2PPaymentTrackingStep],
    }).compile();

    step = module.get<P2PPaymentTrackingStep>(P2PPaymentTrackingStep);
  });

  describe('stepType', () => {
    it('should have PAYMENT_TRACKING step type', () => {
      expect(step.stepType).toBe(P2PStepType.PAYMENT_TRACKING);
    });
  });

  describe('execute', () => {
    it('should initialize payment data when not exists', async () => {
      const flow = createMockFlow({ paymentData: undefined });
      const config = createMockConfig();
      const context = createMockContext();

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(true);
      expect(flow.paymentData).toBeDefined();
      expect(flow.paymentData?.status).toBe(PaymentStatus.PENDING);
      expect(flow.paymentData?.method).toBe(PaymentMethod.ACH);
    });

    it('should return waiting message for pending payment', async () => {
      const flow = createMockFlow({ paymentData: undefined });
      const config = createMockConfig();
      const context = createMockContext();

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(true);
      expect(result.output?.message).toBe('Waiting for payment to be processed');
      expect(result.output?.status).toBe(PaymentStatus.PENDING);
    });

    it('should return waiting message for scheduled payment', async () => {
      const flow = createMockFlow({
        paymentData: {
          paymentId: 'pay-123',
          invoiceId: 'inv-123',
          amount: 1150,
          currency: 'USD',
          status: PaymentStatus.SCHEDULED,
          method: PaymentMethod.ACH,
          scheduledDate: new Date(),
        },
      });
      const config = createMockConfig();
      const context = createMockContext();

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(true);
      expect(result.output?.message).toBe('Waiting for payment to be processed');
    });

    it('should mark invoice as paid when payment completes', async () => {
      const flow = createMockFlow({
        paymentData: {
          paymentId: 'pay-123',
          invoiceId: 'inv-123',
          amount: 1150,
          currency: 'USD',
          status: PaymentStatus.COMPLETED,
          method: PaymentMethod.ACH,
          completedAt: new Date(),
        },
      });
      const config = createMockConfig();
      const context = createMockContext();

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(true);
      expect(flow.invoiceData?.status).toBe(VendorInvoiceStatus.PAID);
      expect(result.output?.status).toBe(PaymentStatus.COMPLETED);
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

    it('should fail when invoice status is invalid', async () => {
      const flow = createMockFlow();
      flow.invoiceData!.status = VendorInvoiceStatus.DRAFT;
      const config = createMockConfig();
      const context = createMockContext();

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_INVOICE_STATUS');
      expect(result.retryable).toBe(false);
    });

    it('should accept APPROVED invoice status', async () => {
      const flow = createMockFlow();
      flow.invoiceData!.status = VendorInvoiceStatus.APPROVED;
      const config = createMockConfig();
      const context = createMockContext();

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(true);
    });

    it('should check payment status with connector', async () => {
      const flow = createMockFlow();
      const config = createMockConfig();
      const context = createMockContext(true);

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(true);
    });

    it('should update payment data from connector response', async () => {
      const flow = createMockFlow({
        paymentData: {
          paymentId: 'pay-123',
          invoiceId: 'inv-123',
          amount: 1150,
          currency: 'USD',
          status: PaymentStatus.PROCESSING,
          method: PaymentMethod.ACH,
        },
      });
      const config = createMockConfig();
      const context = createMockContext(true);

      // Mock the checkPaymentStatus to return completed
      jest.spyOn(step as any, 'checkPaymentStatus').mockResolvedValue({
        success: true,
        output: {
          paymentStatus: PaymentStatus.COMPLETED,
          completedAt: new Date().toISOString(),
          externalPaymentId: 'EXT-PAY-123',
        },
      });

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(true);
      expect(flow.paymentData?.status).toBe(PaymentStatus.COMPLETED);
      expect(flow.paymentData?.externalPaymentId).toBe('EXT-PAY-123');
    });

    it('should handle connector failure', async () => {
      const flow = createMockFlow();
      const config = createMockConfig();
      const context = createMockContext(true);

      jest.spyOn(step as any, 'checkPaymentStatus').mockResolvedValue({
        success: false,
        error: 'Connector error',
        errorCode: 'CONNECTOR_ERROR',
      });

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(false);
    });

    it('should handle exceptions during execution', async () => {
      const flow = createMockFlow();
      const config = createMockConfig();
      const context = createMockContext(true);

      // Force error through connector check
      jest.spyOn(step as any, 'checkPaymentStatus').mockRejectedValue(new Error('Unexpected error'));

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(result.errorCode).toBe('PAYMENT_TRACKING_ERROR');
      expect(result.retryable).toBe(true);
    });

    it('should handle non-Error exceptions', async () => {
      const flow = createMockFlow();
      const config = createMockConfig();
      const context = createMockContext(true);

      // Force a non-Error exception
      jest.spyOn(step as any, 'checkPaymentStatus').mockRejectedValue('String error');

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should return failed payment status', async () => {
      const flow = createMockFlow({
        paymentData: {
          paymentId: 'pay-123',
          invoiceId: 'inv-123',
          amount: 1150,
          currency: 'USD',
          status: PaymentStatus.FAILED,
          method: PaymentMethod.ACH,
          errorCode: 'INSUFFICIENT_FUNDS',
          errorMessage: 'Payment failed due to insufficient funds',
        },
      });
      const config = createMockConfig();
      const context = createMockContext();

      const result = await step.execute(flow, config, context);

      expect(result.success).toBe(false);
      expect(result.output?.status).toBe(PaymentStatus.FAILED);
    });
  });

  describe('validate', () => {
    it('should return true when invoice data exists with SUBMITTED status', async () => {
      const flow = createMockFlow();
      flow.invoiceData!.status = VendorInvoiceStatus.SUBMITTED;
      const config = createMockConfig();

      const result = await step.validate(flow, config);

      expect(result).toBe(true);
    });

    it('should return true when invoice data exists with APPROVED status', async () => {
      const flow = createMockFlow();
      flow.invoiceData!.status = VendorInvoiceStatus.APPROVED;
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

    it('should return false when invoice status is PENDING', async () => {
      const flow = createMockFlow();
      flow.invoiceData!.status = VendorInvoiceStatus.PENDING;
      const config = createMockConfig();

      const result = await step.validate(flow, config);

      expect(result).toBe(false);
    });
  });

  describe('canRetry', () => {
    it('should not retry for NO_INVOICE_DATA error', () => {
      expect(step.canRetry('NO_INVOICE_DATA', 1)).toBe(false);
    });

    it('should not retry for INVALID_INVOICE_STATUS error', () => {
      expect(step.canRetry('INVALID_INVOICE_STATUS', 1)).toBe(false);
    });

    it('should retry for other errors when attempt < 5', () => {
      expect(step.canRetry('CONNECTOR_ERROR', 1)).toBe(true);
      expect(step.canRetry('NETWORK_ERROR', 4)).toBe(true);
    });

    it('should not retry when attempt >= 5', () => {
      expect(step.canRetry('CONNECTOR_ERROR', 5)).toBe(false);
      expect(step.canRetry('NETWORK_ERROR', 6)).toBe(false);
    });
  });
});
