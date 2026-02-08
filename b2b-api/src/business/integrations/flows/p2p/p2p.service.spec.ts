import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

// Services
import { P2PService } from './services/p2p.service';
import { P2PFlowOrchestratorService } from './services/p2p-flow-orchestrator.service';
import { P2PFlowConfigService } from './services/p2p-flow-config.service';
import { P2PFlowLogService } from './services/p2p-flow-log.service';
import { P2PEventHandlerService, P2PEventType } from './services/p2p-event-handler.service';

// Step handlers
import {
  P2PPOReceiptStep,
  P2PPOValidationStep,
  P2PPOAcknowledgmentStep,
  P2PGoodsReceiptStep,
  P2PInvoiceCreationStep,
  P2PThreeWayMatchStep,
  P2PInvoiceSubmissionStep,
  P2PPaymentTrackingStep,
  P2PFlowCompletionStep,
} from './services/steps';

// Interfaces
import {
  P2PFlowStatus,
  P2PStepType,
  StepStatus,
  POStatus,
  GoodsReceiptStatus,
  VendorInvoiceStatus,
  ThreeWayMatchResult,
  PaymentStatus,
  PaymentMethod,
  P2PPurchaseOrderData,
  P2PGoodsReceiptData,
  P2PVendorInvoiceData,
  P2PFlowInstance,
  P2PFlowConfig,
  P2PStepConfig,
  P2PStepExecution,
  P2PAddress,
  DEFAULT_P2P_FLOW_CONFIG,
} from './interfaces';

// Mock data factories
const createMockAddress = (): P2PAddress => ({
  name: 'Test Location',
  company: 'Test Company',
  street1: '123 Test St',
  city: 'Test City',
  state: 'TS',
  postalCode: '12345',
  country: 'US',
});

const createMockPOData = (overrides: Partial<P2PPurchaseOrderData> = {}): P2PPurchaseOrderData => ({
  poId: uuidv4(),
  poNumber: `PO-${Date.now()}`,
  vendorId: 'vendor-001',
  vendorName: 'Test Vendor Inc',
  buyerId: 'buyer-001',
  status: POStatus.RECEIVED,
  poDate: new Date(),
  expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  shipToAddress: createMockAddress(),
  billToAddress: createMockAddress(),
  items: [
    {
      lineNumber: 1,
      sku: 'SKU-001',
      description: 'Test Product 1',
      quantity: 100,
      quantityReceived: 0,
      unitPrice: 10.0,
      tax: 100,
      total: 1100.0,
      uom: 'EA',
    },
    {
      lineNumber: 2,
      sku: 'SKU-002',
      description: 'Test Product 2',
      quantity: 50,
      quantityReceived: 0,
      unitPrice: 20.0,
      tax: 100,
      total: 1100.0,
      uom: 'EA',
    },
  ],
  subtotal: 2000.0,
  tax: 200.0,
  shipping: 0,
  total: 2200.0,
  currency: 'USD',
  ...overrides,
});

const createMockGoodsReceiptData = (
  poData: P2PPurchaseOrderData,
  overrides: Partial<P2PGoodsReceiptData> = {},
): P2PGoodsReceiptData => ({
  receiptId: uuidv4(),
  poId: poData.poId,
  poNumber: poData.poNumber,
  status: GoodsReceiptStatus.COMPLETE,
  receivedAt: new Date(),
  items: poData.items.map((item) => ({
    lineNumber: item.lineNumber,
    poLineNumber: item.lineNumber,
    sku: item.sku,
    quantityOrdered: item.quantity,
    quantityReceived: item.quantity,
    quantityRejected: 0,
  })),
  ...overrides,
});

const createMockInvoiceData = (
  poData: P2PPurchaseOrderData,
  overrides: Partial<P2PVendorInvoiceData> = {},
): P2PVendorInvoiceData => ({
  invoiceId: uuidv4(),
  invoiceNumber: `INV-${Date.now()}`,
  poId: poData.poId,
  poNumber: poData.poNumber,
  vendorId: poData.vendorId,
  vendorName: poData.vendorName,
  status: VendorInvoiceStatus.PENDING,
  invoiceDate: new Date(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  items: poData.items.map((item) => ({
    lineNumber: item.lineNumber,
    poLineNumber: item.lineNumber,
    sku: item.sku,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    tax: item.tax,
    total: item.total,
  })),
  subtotal: poData.subtotal,
  tax: poData.tax,
  shipping: poData.shipping,
  total: poData.total,
  currency: poData.currency,
  amountPaid: 0,
  amountDue: poData.total,
  paymentTerms: 'Net 30',
  ...overrides,
});

const createMockStepExecution = (stepType: P2PStepType): P2PStepExecution => ({
  stepType,
  status: StepStatus.PENDING,
  attempt: 0,
  startedAt: new Date(),
});

const createMockFlowInstance = (
  tenantId: string,
  poData: P2PPurchaseOrderData,
  overrides: Partial<P2PFlowInstance> = {},
): P2PFlowInstance => ({
  id: uuidv4(),
  tenantId,
  configId: 'config-1',
  purchaseOrderId: poData.poId,
  poNumber: poData.poNumber,
  poData,
  status: P2PFlowStatus.PENDING,
  currentStep: P2PStepType.PO_RECEIPT,
  steps: [
    createMockStepExecution(P2PStepType.PO_RECEIPT),
    createMockStepExecution(P2PStepType.PO_VALIDATION),
    createMockStepExecution(P2PStepType.PO_ACKNOWLEDGMENT),
    createMockStepExecution(P2PStepType.GOODS_RECEIPT),
    createMockStepExecution(P2PStepType.INVOICE_CREATION),
    createMockStepExecution(P2PStepType.THREE_WAY_MATCH),
    createMockStepExecution(P2PStepType.INVOICE_SUBMISSION),
    createMockStepExecution(P2PStepType.PAYMENT_TRACKING),
    createMockStepExecution(P2PStepType.FLOW_COMPLETION),
  ],
  errorCount: 0,
  startedAt: new Date(),
  lastActivityAt: new Date(),
  correlationId: uuidv4(),
  metadata: {},
  ...overrides,
});

describe('P2P Module', () => {
  // ============================================
  // Type Definitions Tests
  // ============================================
  describe('P2P Type Definitions', () => {
    it('should have all P2PFlowStatus values', () => {
      expect(P2PFlowStatus.PENDING).toBe('pending');
      expect(P2PFlowStatus.RUNNING).toBe('running');
      expect(P2PFlowStatus.PAUSED).toBe('paused');
      expect(P2PFlowStatus.WAITING_EXTERNAL).toBe('waiting_external');
      expect(P2PFlowStatus.WAITING_APPROVAL).toBe('waiting_approval');
      expect(P2PFlowStatus.COMPLETED).toBe('completed');
      expect(P2PFlowStatus.FAILED).toBe('failed');
      expect(P2PFlowStatus.CANCELLED).toBe('cancelled');
    });

    it('should have all P2PStepType values', () => {
      expect(P2PStepType.PO_RECEIPT).toBe('po_receipt');
      expect(P2PStepType.PO_VALIDATION).toBe('po_validation');
      expect(P2PStepType.PO_ACKNOWLEDGMENT).toBe('po_acknowledgment');
      expect(P2PStepType.GOODS_RECEIPT).toBe('goods_receipt');
      expect(P2PStepType.INVOICE_CREATION).toBe('invoice_creation');
      expect(P2PStepType.THREE_WAY_MATCH).toBe('three_way_match');
      expect(P2PStepType.INVOICE_SUBMISSION).toBe('invoice_submission');
      expect(P2PStepType.PAYMENT_TRACKING).toBe('payment_tracking');
      expect(P2PStepType.FLOW_COMPLETION).toBe('flow_completion');
    });

    it('should have all ThreeWayMatchResult values', () => {
      expect(ThreeWayMatchResult.MATCHED).toBe('matched');
      expect(ThreeWayMatchResult.QUANTITY_MISMATCH).toBe('quantity_mismatch');
      expect(ThreeWayMatchResult.PRICE_MISMATCH).toBe('price_mismatch');
      expect(ThreeWayMatchResult.PARTIAL_MATCH).toBe('partial_match');
      expect(ThreeWayMatchResult.NOT_MATCHED).toBe('not_matched');
      expect(ThreeWayMatchResult.PENDING).toBe('pending');
    });

    it('should have all POStatus values', () => {
      expect(POStatus.DRAFT).toBe('draft');
      expect(POStatus.RECEIVED).toBe('received');
      expect(POStatus.ACKNOWLEDGED).toBe('acknowledged');
      expect(POStatus.PARTIALLY_RECEIVED).toBe('partially_received');
      expect(POStatus.FULLY_RECEIVED).toBe('fully_received');
      expect(POStatus.INVOICED).toBe('invoiced');
      expect(POStatus.PAID).toBe('paid');
      expect(POStatus.CANCELLED).toBe('cancelled');
    });

    it('should have all VendorInvoiceStatus values', () => {
      expect(VendorInvoiceStatus.DRAFT).toBe('draft');
      expect(VendorInvoiceStatus.PENDING).toBe('pending');
      expect(VendorInvoiceStatus.SUBMITTED).toBe('submitted');
      expect(VendorInvoiceStatus.APPROVED).toBe('approved');
      expect(VendorInvoiceStatus.REJECTED).toBe('rejected');
      expect(VendorInvoiceStatus.PAID).toBe('paid');
    });

    it('should have valid DEFAULT_P2P_FLOW_CONFIG', () => {
      expect(DEFAULT_P2P_FLOW_CONFIG).toBeDefined();
      expect(DEFAULT_P2P_FLOW_CONFIG.steps).toHaveLength(9);
      expect(DEFAULT_P2P_FLOW_CONFIG.matchTolerances).toBeDefined();
      expect(DEFAULT_P2P_FLOW_CONFIG.matchTolerances.quantityTolerancePercent).toBe(5);
      expect(DEFAULT_P2P_FLOW_CONFIG.matchTolerances.priceTolerancePercent).toBe(2);
      expect(DEFAULT_P2P_FLOW_CONFIG.features).toBeDefined();
    });
  });

  // ============================================
  // Config Service Tests
  // ============================================
  describe('P2PFlowConfigService', () => {
    let service: P2PFlowConfigService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          P2PFlowConfigService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue({}),
            },
          },
        ],
      }).compile();

      service = module.get<P2PFlowConfigService>(P2PFlowConfigService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return default config for new tenant', async () => {
      const config = await service.getConfig('new-tenant');
      expect(config).toBeDefined();
      expect(config.steps).toHaveLength(9);
    });

    it('should save and retrieve tenant config', async () => {
      const tenantId = 'test-tenant';
      const customConfig = {
        ...DEFAULT_P2P_FLOW_CONFIG,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
        matchTolerances: {
          quantityTolerancePercent: 10,
          priceTolerancePercent: 5,
          amountToleranceAbsolute: 100,
          amountToleranceCurrency: 'USD',
        },
      } as P2PFlowConfig;

      await service.saveConfig(tenantId, customConfig);
      const retrieved = await service.getConfig(tenantId);

      expect(retrieved.matchTolerances.quantityTolerancePercent).toBe(10);
      expect(retrieved.matchTolerances.priceTolerancePercent).toBe(5);
    });

    it('should update match tolerances', async () => {
      const tenantId = 'tolerance-tenant';
      const updated = await service.updateMatchTolerances(tenantId, {
        quantityTolerancePercent: 15,
      });

      expect(updated.matchTolerances.quantityTolerancePercent).toBe(15);
    });

    it('should update features', async () => {
      const tenantId = 'feature-tenant';
      const updated = await service.updateFeatures(tenantId, {
        enableAutoAcknowledgment: false,
        requireApprovalForMismatch: true,
      });

      expect(updated.features.enableAutoAcknowledgment).toBe(false);
      expect(updated.features.requireApprovalForMismatch).toBe(true);
    });

    it('should update step config', async () => {
      const tenantId = 'step-tenant';
      const updated = await service.updateStepConfig(tenantId, P2PStepType.THREE_WAY_MATCH, {
        enabled: false,
      });

      const step = updated.steps.find((s) => s.stepType === P2PStepType.THREE_WAY_MATCH);
      expect(step?.enabled).toBe(false);
    });
  });

  // ============================================
  // Log Service Tests
  // ============================================
  describe('P2PFlowLogService', () => {
    let service: P2PFlowLogService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [P2PFlowLogService],
      }).compile();

      service = module.get<P2PFlowLogService>(P2PFlowLogService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should log flow message', async () => {
      const flow = createMockFlowInstance('tenant', createMockPOData());
      const result = await service.log(flow, 'info', 'Flow started', { poNumber: flow.poNumber });

      expect(result).toBeDefined();
      expect(result.flowId).toBe(flow.id);
      expect(result.level).toBe('info');
    });

    it('should log step message', async () => {
      const flow = createMockFlowInstance('tenant', createMockPOData());
      const result = await service.logStep(
        flow,
        P2PStepType.PO_RECEIPT,
        'info',
        'Step started',
        {},
      );

      expect(result).toBeDefined();
      expect(result.step).toBe(P2PStepType.PO_RECEIPT);
    });

    it('should get flow logs', async () => {
      const flow = createMockFlowInstance('tenant', createMockPOData());
      await service.log(flow, 'info', 'Test log', {});
      const logs = await service.getFlowLogs(flow.id);
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should filter logs by level', async () => {
      const flow = createMockFlowInstance('tenant', createMockPOData());
      await service.log(flow, 'info', 'Info message', {});
      await service.log(flow, 'error', 'Error message', {});

      const errorLogs = await service.getFlowLogs(flow.id, { level: 'error' });
      expect(errorLogs.every((l) => l.level === 'error')).toBe(true);
    });

    it('should clear flow logs', async () => {
      const flow = createMockFlowInstance('tenant', createMockPOData());
      await service.log(flow, 'info', 'Test log', {});
      await service.clearFlowLogs(flow.id);
      const logs = await service.getFlowLogs(flow.id);
      expect(logs.length).toBe(0);
    });
  });

  // ============================================
  // Step Handler Tests
  // ============================================
  describe('P2P Step Handlers', () => {
    const tenantId = 'test-tenant';
    const poData = createMockPOData();

    describe('P2PPOReceiptStep', () => {
      let step: P2PPOReceiptStep;

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [P2PPOReceiptStep],
        }).compile();

        step = module.get<P2PPOReceiptStep>(P2PPOReceiptStep);
      });

      it('should be defined', () => {
        expect(step).toBeDefined();
        expect(step.stepType).toBe(P2PStepType.PO_RECEIPT);
      });

      it('should execute successfully with valid PO data', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        const config: P2PStepConfig = {
          stepType: P2PStepType.PO_RECEIPT,
          enabled: true,
          order: 1,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
        });

        expect(result.success).toBe(true);
        expect(result.output?.poNumber).toBeDefined();
        expect(flow.poData.status).toBe(POStatus.RECEIVED);
      });

      it('should validate flow has PO data', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        const config: P2PStepConfig = {
          stepType: P2PStepType.PO_RECEIPT,
          enabled: true,
          order: 1,
        };

        const isValid = await step.validate(flow, config);
        expect(isValid).toBe(true);
      });
    });

    describe('P2PPOValidationStep', () => {
      let step: P2PPOValidationStep;

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [P2PPOValidationStep],
        }).compile();

        step = module.get<P2PPOValidationStep>(P2PPOValidationStep);
      });

      it('should be defined', () => {
        expect(step).toBeDefined();
        expect(step.stepType).toBe(P2PStepType.PO_VALIDATION);
      });

      it('should validate PO successfully', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        const config: P2PStepConfig = {
          stepType: P2PStepType.PO_VALIDATION,
          enabled: true,
          order: 2,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
        });

        expect(result.success).toBe(true);
      });

      it('should fail validation for invalid PO', async () => {
        const invalidPO = createMockPOData({
          items: [],
        });
        const flow = createMockFlowInstance(tenantId, invalidPO);
        const config: P2PStepConfig = {
          stepType: P2PStepType.PO_VALIDATION,
          enabled: true,
          order: 2,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
        });

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('PO_VALIDATION_FAILED');
      });
    });

    describe('P2PPOAcknowledgmentStep', () => {
      let step: P2PPOAcknowledgmentStep;

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [P2PPOAcknowledgmentStep],
        }).compile();

        step = module.get<P2PPOAcknowledgmentStep>(P2PPOAcknowledgmentStep);
      });

      it('should be defined', () => {
        expect(step).toBeDefined();
        expect(step.stepType).toBe(P2PStepType.PO_ACKNOWLEDGMENT);
      });

      it('should generate acknowledgment successfully', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        const config: P2PStepConfig = {
          stepType: P2PStepType.PO_ACKNOWLEDGMENT,
          enabled: true,
          order: 3,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
        });

        expect(result.success).toBe(true);
        expect(flow.poData.status).toBe(POStatus.ACKNOWLEDGED);
      });
    });

    describe('P2PGoodsReceiptStep', () => {
      let step: P2PGoodsReceiptStep;

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [P2PGoodsReceiptStep],
        }).compile();

        step = module.get<P2PGoodsReceiptStep>(P2PGoodsReceiptStep);
      });

      it('should be defined', () => {
        expect(step).toBeDefined();
        expect(step.stepType).toBe(P2PStepType.GOODS_RECEIPT);
      });

      it('should complete with existing goods receipt', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        flow.goodsReceiptData = createMockGoodsReceiptData(poData);

        const config: P2PStepConfig = {
          stepType: P2PStepType.GOODS_RECEIPT,
          enabled: true,
          order: 4,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
        });

        expect(result.success).toBe(true);
      });
    });

    describe('P2PInvoiceCreationStep', () => {
      let step: P2PInvoiceCreationStep;

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [P2PInvoiceCreationStep],
        }).compile();

        step = module.get<P2PInvoiceCreationStep>(P2PInvoiceCreationStep);
      });

      it('should be defined', () => {
        expect(step).toBeDefined();
        expect(step.stepType).toBe(P2PStepType.INVOICE_CREATION);
      });

      it('should complete with existing invoice', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        flow.goodsReceiptData = createMockGoodsReceiptData(poData);
        flow.invoiceData = createMockInvoiceData(poData);

        const config: P2PStepConfig = {
          stepType: P2PStepType.INVOICE_CREATION,
          enabled: true,
          order: 5,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
        });

        expect(result.success).toBe(true);
        expect(result.output?.invoiceNumber).toBe(flow.invoiceData.invoiceNumber);
      });
    });

    describe('P2PThreeWayMatchStep', () => {
      let step: P2PThreeWayMatchStep;

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [P2PThreeWayMatchStep],
        }).compile();

        step = module.get<P2PThreeWayMatchStep>(P2PThreeWayMatchStep);
      });

      it('should be defined', () => {
        expect(step).toBeDefined();
        expect(step.stepType).toBe(P2PStepType.THREE_WAY_MATCH);
      });

      it('should match successfully when all values match', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        flow.goodsReceiptData = createMockGoodsReceiptData(poData);
        flow.invoiceData = createMockInvoiceData(poData);

        const config: P2PStepConfig = {
          stepType: P2PStepType.THREE_WAY_MATCH,
          enabled: true,
          order: 6,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
          matchTolerances: {
            quantityTolerancePercent: 5,
            priceTolerancePercent: 2,
            amountToleranceAbsolute: 10,
            amountToleranceCurrency: 'USD',
          },
        });

        expect(result.success).toBe(true);
        expect(flow.matchData).toBeDefined();
        expect(flow.matchData?.status).toBe(ThreeWayMatchResult.MATCHED);
      });

      it('should detect quantity discrepancy', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        flow.goodsReceiptData = createMockGoodsReceiptData(poData);
        // Invoice with different quantity
        flow.invoiceData = createMockInvoiceData(poData);
        flow.invoiceData.items[0].quantity = 150; // Expected 100

        const config: P2PStepConfig = {
          stepType: P2PStepType.THREE_WAY_MATCH,
          enabled: true,
          order: 6,
        };

        await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
          matchTolerances: {
            quantityTolerancePercent: 5,
            priceTolerancePercent: 2,
            amountToleranceAbsolute: 10,
            amountToleranceCurrency: 'USD',
          },
        });

        expect(flow.matchData).toBeDefined();
        expect(flow.matchData?.discrepancies.length).toBeGreaterThan(0);
        expect(flow.matchData?.discrepancies[0].type).toBe('quantity');
      });

      it('should detect price discrepancy', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        flow.goodsReceiptData = createMockGoodsReceiptData(poData);
        // Invoice with different price
        flow.invoiceData = createMockInvoiceData(poData);
        flow.invoiceData.items[0].unitPrice = 15.0; // Expected 10.0

        const config: P2PStepConfig = {
          stepType: P2PStepType.THREE_WAY_MATCH,
          enabled: true,
          order: 6,
        };

        await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
          matchTolerances: {
            quantityTolerancePercent: 5,
            priceTolerancePercent: 2,
            amountToleranceAbsolute: 10,
            amountToleranceCurrency: 'USD',
          },
        });

        expect(flow.matchData).toBeDefined();
        expect(flow.matchData?.discrepancies.length).toBeGreaterThan(0);
        expect(flow.matchData?.discrepancies[0].type).toBe('price');
      });

      it('should require approval for errors', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        flow.goodsReceiptData = createMockGoodsReceiptData(poData);
        flow.invoiceData = createMockInvoiceData(poData);
        // Major price difference
        flow.invoiceData.items[0].unitPrice = 50.0; // 400% difference

        const config: P2PStepConfig = {
          stepType: P2PStepType.THREE_WAY_MATCH,
          enabled: true,
          order: 6,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
          matchTolerances: {
            quantityTolerancePercent: 5,
            priceTolerancePercent: 2,
            amountToleranceAbsolute: 10,
            amountToleranceCurrency: 'USD',
          },
        });

        expect(result.requiresApproval).toBe(true);
        expect(flow.matchData?.requiresApproval).toBe(true);
      });

      it('should fail without invoice data', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        flow.goodsReceiptData = createMockGoodsReceiptData(poData);

        const config: P2PStepConfig = {
          stepType: P2PStepType.THREE_WAY_MATCH,
          enabled: true,
          order: 6,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
        });

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('NO_INVOICE_DATA');
      });
    });

    describe('P2PInvoiceSubmissionStep', () => {
      let step: P2PInvoiceSubmissionStep;

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [P2PInvoiceSubmissionStep],
        }).compile();

        step = module.get<P2PInvoiceSubmissionStep>(P2PInvoiceSubmissionStep);
      });

      it('should be defined', () => {
        expect(step).toBeDefined();
        expect(step.stepType).toBe(P2PStepType.INVOICE_SUBMISSION);
      });

      it('should submit invoice successfully after match', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        flow.goodsReceiptData = createMockGoodsReceiptData(poData);
        flow.invoiceData = createMockInvoiceData(poData);
        flow.matchData = {
          matchId: uuidv4(),
          poId: poData.poId,
          invoiceId: flow.invoiceData.invoiceId,
          status: ThreeWayMatchResult.MATCHED,
          matchedAt: new Date(),
          items: [],
          discrepancies: [],
          requiresApproval: false,
        };

        const config: P2PStepConfig = {
          stepType: P2PStepType.INVOICE_SUBMISSION,
          enabled: true,
          order: 7,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
        });

        expect(result.success).toBe(true);
        expect(flow.invoiceData.status).toBe(VendorInvoiceStatus.SUBMITTED);
        expect(flow.poData.status).toBe(POStatus.INVOICED);
      });

      it('should reject submission without approval for failed match', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        flow.goodsReceiptData = createMockGoodsReceiptData(poData);
        flow.invoiceData = createMockInvoiceData(poData);
        flow.matchData = {
          matchId: uuidv4(),
          poId: poData.poId,
          invoiceId: flow.invoiceData.invoiceId,
          status: ThreeWayMatchResult.NOT_MATCHED,
          matchedAt: new Date(),
          items: [],
          discrepancies: [],
          requiresApproval: true,
        };

        const config: P2PStepConfig = {
          stepType: P2PStepType.INVOICE_SUBMISSION,
          enabled: true,
          order: 7,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
        });

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('MATCH_NOT_APPROVED');
        expect(result.requiresApproval).toBe(true);
      });

      it('should allow submission with approval for failed match', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        flow.goodsReceiptData = createMockGoodsReceiptData(poData);
        flow.invoiceData = createMockInvoiceData(poData);
        flow.matchData = {
          matchId: uuidv4(),
          poId: poData.poId,
          invoiceId: flow.invoiceData.invoiceId,
          status: ThreeWayMatchResult.NOT_MATCHED,
          matchedAt: new Date(),
          items: [],
          discrepancies: [],
          requiresApproval: true,
          approvedBy: 'admin@test.com',
          approvedAt: new Date(),
        };

        const config: P2PStepConfig = {
          stepType: P2PStepType.INVOICE_SUBMISSION,
          enabled: true,
          order: 7,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
        });

        expect(result.success).toBe(true);
        expect(flow.invoiceData.status).toBe(VendorInvoiceStatus.SUBMITTED);
      });
    });

    describe('P2PPaymentTrackingStep', () => {
      let step: P2PPaymentTrackingStep;

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [P2PPaymentTrackingStep],
        }).compile();

        step = module.get<P2PPaymentTrackingStep>(P2PPaymentTrackingStep);
      });

      it('should be defined', () => {
        expect(step).toBeDefined();
        expect(step.stepType).toBe(P2PStepType.PAYMENT_TRACKING);
      });

      it('should initialize payment tracking', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        flow.invoiceData = createMockInvoiceData(poData, {
          status: VendorInvoiceStatus.SUBMITTED,
        });

        const config: P2PStepConfig = {
          stepType: P2PStepType.PAYMENT_TRACKING,
          enabled: true,
          order: 8,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
        });

        expect(result.success).toBe(true);
        expect(flow.paymentData).toBeDefined();
        expect(flow.paymentData?.status).toBe(PaymentStatus.PENDING);
      });

      it('should complete when payment is made', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        flow.invoiceData = createMockInvoiceData(poData, {
          status: VendorInvoiceStatus.SUBMITTED,
        });
        flow.paymentData = {
          paymentId: uuidv4(),
          invoiceId: flow.invoiceData.invoiceId,
          amount: flow.invoiceData.total,
          currency: flow.invoiceData.currency,
          status: PaymentStatus.COMPLETED,
          method: PaymentMethod.ACH,
          completedAt: new Date(),
        };

        const config: P2PStepConfig = {
          stepType: P2PStepType.PAYMENT_TRACKING,
          enabled: true,
          order: 8,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
        });

        expect(result.success).toBe(true);
        expect(flow.invoiceData.status).toBe(VendorInvoiceStatus.PAID);
      });
    });

    describe('P2PFlowCompletionStep', () => {
      let step: P2PFlowCompletionStep;

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [P2PFlowCompletionStep],
        }).compile();

        step = module.get<P2PFlowCompletionStep>(P2PFlowCompletionStep);
      });

      it('should be defined', () => {
        expect(step).toBeDefined();
        expect(step.stepType).toBe(P2PStepType.FLOW_COMPLETION);
      });

      it('should complete flow successfully', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        flow.goodsReceiptData = createMockGoodsReceiptData(poData);
        flow.invoiceData = createMockInvoiceData(poData, {
          status: VendorInvoiceStatus.PAID,
        });
        flow.matchData = {
          matchId: uuidv4(),
          poId: poData.poId,
          invoiceId: flow.invoiceData.invoiceId,
          status: ThreeWayMatchResult.MATCHED,
          matchedAt: new Date(),
          items: [],
          discrepancies: [],
          requiresApproval: false,
        };
        flow.paymentData = {
          paymentId: uuidv4(),
          invoiceId: flow.invoiceData.invoiceId,
          amount: flow.invoiceData.total,
          currency: flow.invoiceData.currency,
          status: PaymentStatus.COMPLETED,
          method: PaymentMethod.ACH,
          completedAt: new Date(),
        };

        const config: P2PStepConfig = {
          stepType: P2PStepType.FLOW_COMPLETION,
          enabled: true,
          order: 9,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
        });

        expect(result.success).toBe(true);
        expect(flow.status).toBe(P2PFlowStatus.COMPLETED);
        expect(flow.poData.status).toBe(POStatus.PAID);
        expect(result.output?.metrics).toBeDefined();
      });

      it('should fail without goods receipt', async () => {
        const flow = createMockFlowInstance(tenantId, poData);
        flow.invoiceData = createMockInvoiceData(poData);
        flow.matchData = {
          matchId: uuidv4(),
          poId: poData.poId,
          invoiceId: flow.invoiceData.invoiceId,
          status: ThreeWayMatchResult.MATCHED,
          matchedAt: new Date(),
          items: [],
          discrepancies: [],
          requiresApproval: false,
        };

        const config: P2PStepConfig = {
          stepType: P2PStepType.FLOW_COMPLETION,
          enabled: true,
          order: 9,
        };

        const result = await step.execute(flow, config, {
          tenantId,
          correlationId: uuidv4(),
        });

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('FLOW_VALIDATION_ERROR');
      });
    });
  });

  // ============================================
  // Event Handler Tests
  // ============================================
  describe('P2PEventHandlerService', () => {
    let service: P2PEventHandlerService;

    beforeEach(async () => {
      const mockOrchestrator = {
        startFlow: jest
          .fn()
          .mockResolvedValue(createMockFlowInstance('tenant', createMockPOData())),
        getFlowStatus: jest.fn().mockResolvedValue(null),
        handleWebhook: jest
          .fn()
          .mockResolvedValue(createMockFlowInstance('tenant', createMockPOData())),
        resumeFlow: jest
          .fn()
          .mockResolvedValue(createMockFlowInstance('tenant', createMockPOData())),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          P2PEventHandlerService,
          {
            provide: P2PFlowOrchestratorService,
            useValue: mockOrchestrator,
          },
        ],
      }).compile();

      service = module.get<P2PEventHandlerService>(P2PEventHandlerService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should register custom event handler', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      service.on(P2PEventType.PO_RECEIVED, handler);

      await service.emit({
        type: P2PEventType.PO_RECEIVED,
        tenantId: 'tenant',
        timestamp: new Date(),
        payload: { poData: createMockPOData() },
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should emit flow status change events', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      service.on(P2PEventType.FLOW_COMPLETED, handler);

      const flow = createMockFlowInstance('tenant', createMockPOData());
      flow.status = P2PFlowStatus.COMPLETED;

      await service.emitFlowStatusChange(flow, P2PFlowStatus.RUNNING);

      expect(handler).toHaveBeenCalled();
    });

    it('should emit step completed events', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      service.on(P2PEventType.PO_VALIDATED, handler);

      const flow = createMockFlowInstance('tenant', createMockPOData());

      await service.emitStepCompleted(flow, P2PStepType.PO_VALIDATION, { valid: true });

      expect(handler).toHaveBeenCalled();
    });

    it('should emit match discrepancy events', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      service.on(P2PEventType.MATCH_APPROVAL_REQUIRED, handler);

      const flow = createMockFlowInstance('tenant', createMockPOData());
      const matchData = {
        matchId: uuidv4(),
        poId: flow.poData.poId,
        invoiceId: 'inv-1',
        status: ThreeWayMatchResult.NOT_MATCHED,
        matchedAt: new Date(),
        items: [],
        discrepancies: [
          {
            lineNumber: 1,
            sku: 'SKU-001',
            type: 'quantity' as const,
            severity: 'error' as const,
            expected: 100,
            actual: 150,
            difference: 50,
            differencePercent: 50,
            message: 'Quantity mismatch',
          },
        ],
        requiresApproval: true,
      };

      await service.emitMatchDiscrepancy(flow, matchData);

      expect(handler).toHaveBeenCalled();
    });
  });

  // ============================================
  // Main Service Tests
  // ============================================
  describe('P2PService', () => {
    let service: P2PService;
    let orchestrator: P2PFlowOrchestratorService;
    let configService: P2PFlowConfigService;
    let eventHandler: P2PEventHandlerService;

    const mockPOData = createMockPOData();
    const mockFlow = createMockFlowInstance('tenant', mockPOData);

    beforeEach(async () => {
      const mockOrchestrator = {
        startFlow: jest.fn().mockResolvedValue(mockFlow),
        getFlowStatus: jest.fn().mockResolvedValue(mockFlow),
        pauseFlow: jest.fn().mockResolvedValue({ ...mockFlow, status: P2PFlowStatus.PAUSED }),
        resumeFlow: jest.fn().mockResolvedValue({ ...mockFlow, status: P2PFlowStatus.RUNNING }),
        cancelFlow: jest.fn().mockResolvedValue({ ...mockFlow, status: P2PFlowStatus.CANCELLED }),
        retryStep: jest.fn().mockResolvedValue(mockFlow),
        handleWebhook: jest.fn().mockResolvedValue(mockFlow),
      };

      const mockConfigService = {
        getConfig: jest.fn().mockResolvedValue({
          ...DEFAULT_P2P_FLOW_CONFIG,
          tenantId: 'tenant',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        saveConfig: jest.fn().mockResolvedValue(undefined),
        updateMatchTolerances: jest.fn().mockResolvedValue({
          ...DEFAULT_P2P_FLOW_CONFIG,
          tenantId: 'tenant',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        updateFeatures: jest.fn().mockResolvedValue({
          ...DEFAULT_P2P_FLOW_CONFIG,
          tenantId: 'tenant',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      const mockEventHandler = {
        emit: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          P2PService,
          { provide: P2PFlowOrchestratorService, useValue: mockOrchestrator },
          { provide: P2PFlowConfigService, useValue: mockConfigService },
          { provide: P2PEventHandlerService, useValue: mockEventHandler },
        ],
      }).compile();

      service = module.get<P2PService>(P2PService);
      orchestrator = module.get<P2PFlowOrchestratorService>(P2PFlowOrchestratorService);
      configService = module.get<P2PFlowConfigService>(P2PFlowConfigService);
      eventHandler = module.get<P2PEventHandlerService>(P2PEventHandlerService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    describe('Flow Management', () => {
      it('should start a new flow', async () => {
        const poData = createMockPOData();
        const result = await service.startFlow('tenant', poData);

        expect(orchestrator.startFlow).toHaveBeenCalledWith('tenant', poData, undefined);
        expect(result).toBeDefined();
      });

      it('should get flow status', async () => {
        const result = await service.getFlowStatus('flow-1');

        expect(orchestrator.getFlowStatus).toHaveBeenCalledWith('flow-1');
        expect(result).toBeDefined();
      });

      it('should pause a flow', async () => {
        const result = await service.pauseFlow('flow-1', 'Manual pause');

        expect(orchestrator.pauseFlow).toHaveBeenCalledWith('flow-1', 'Manual pause');
        expect(result.status).toBe(P2PFlowStatus.PAUSED);
      });

      it('should resume a flow', async () => {
        const result = await service.resumeFlow('flow-1');

        expect(orchestrator.resumeFlow).toHaveBeenCalledWith('flow-1');
        expect(result.status).toBe(P2PFlowStatus.RUNNING);
      });

      it('should cancel a flow', async () => {
        const result = await service.cancelFlow('flow-1', 'Cancelled by user');

        expect(orchestrator.cancelFlow).toHaveBeenCalledWith('flow-1', 'Cancelled by user');
        expect(result.status).toBe(P2PFlowStatus.CANCELLED);
      });

      it('should retry a step', async () => {
        const result = await service.retryStep('flow-1', P2PStepType.THREE_WAY_MATCH);

        expect(orchestrator.retryStep).toHaveBeenCalledWith('flow-1', P2PStepType.THREE_WAY_MATCH);
        expect(result).toBeDefined();
      });
    });

    describe('Configuration Management', () => {
      it('should get config', async () => {
        const result = await service.getConfig('tenant');

        expect(configService.getConfig).toHaveBeenCalledWith('tenant');
        expect(result).toBeDefined();
      });

      it('should save config', async () => {
        const config = {
          ...DEFAULT_P2P_FLOW_CONFIG,
          tenantId: 'tenant',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as P2PFlowConfig;
        await service.saveConfig('tenant', config);

        expect(configService.saveConfig).toHaveBeenCalledWith('tenant', config);
      });

      it('should update match tolerances', async () => {
        await service.updateMatchTolerances('tenant', {
          quantityTolerancePercent: 10,
        });

        expect(configService.updateMatchTolerances).toHaveBeenCalled();
      });

      it('should update features', async () => {
        await service.updateFeatures('tenant', {
          enableAutoAcknowledgment: false,
        });

        expect(configService.updateFeatures).toHaveBeenCalled();
      });
    });

    describe('Event Handling', () => {
      it('should handle incoming PO', async () => {
        const poData = createMockPOData();
        const result = await service.handleIncomingPO('tenant', poData);

        expect(eventHandler.emit).toHaveBeenCalled();
        expect(orchestrator.startFlow).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should handle goods receipt update', async () => {
        const receiptData = createMockGoodsReceiptData(createMockPOData());
        await service.handleGoodsReceiptUpdate('flow-1', receiptData);

        expect(orchestrator.handleWebhook).toHaveBeenCalledWith('flow-1', 'goods_receipt_update', {
          receiptData,
        });
      });

      it('should approve match discrepancy', async () => {
        (orchestrator.getFlowStatus as jest.Mock).mockResolvedValue({
          ...mockFlow,
          status: P2PFlowStatus.WAITING_APPROVAL,
        });

        await service.approveMatchDiscrepancy('flow-1', 'admin@test.com', 'Approved');

        expect(eventHandler.emit).toHaveBeenCalled();
        expect(orchestrator.resumeFlow).toHaveBeenCalledWith('flow-1');
      });

      it('should handle payment update', async () => {
        await service.handlePaymentUpdate('flow-1', {
          status: PaymentStatus.COMPLETED,
        });

        expect(orchestrator.handleWebhook).toHaveBeenCalledWith('flow-1', 'payment_status_update', {
          status: PaymentStatus.COMPLETED,
        });
      });
    });

    describe('Analytics', () => {
      it('should get flow statistics', async () => {
        const result = await service.getFlowStatistics('tenant');

        expect(result).toBeDefined();
        expect(result.byStatus).toBeDefined();
        expect(result.byMatchResult).toBeDefined();
      });

      it('should get match discrepancy report', async () => {
        const result = await service.getMatchDiscrepancyReport('tenant');

        expect(result).toBeDefined();
        expect(result.totalDiscrepancies).toBeDefined();
      });
    });
  });
});
