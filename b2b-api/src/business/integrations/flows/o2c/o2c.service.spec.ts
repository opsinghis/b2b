import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@infrastructure/database';

// Services
import { O2CService } from './services/o2c.service';
import { O2CFlowOrchestratorService } from './services/o2c-flow-orchestrator.service';
import { O2CFlowConfigService } from './services/o2c-flow-config.service';
import { O2CFlowLogService } from './services/o2c-flow-log.service';
import { O2CEventHandlerService } from './services/o2c-event-handler.service';

// Step handlers
import { O2COrderSyncStep } from './services/steps/o2c-order-sync.step';
import { O2CCreditCheckStep } from './services/steps/o2c-credit-check.step';
import { O2COrderConfirmationStep } from './services/steps/o2c-order-confirmation.step';
import { O2CInventoryReservationStep } from './services/steps/o2c-inventory-reservation.step';
import { O2CFulfillmentStep } from './services/steps/o2c-fulfillment.step';
import { O2CShipmentSyncStep } from './services/steps/o2c-shipment-sync.step';
import { O2CAsnGenerationStep } from './services/steps/o2c-asn-generation.step';
import { O2CInvoiceGenerationStep } from './services/steps/o2c-invoice-generation.step';
import { O2CInvoiceSyncStep } from './services/steps/o2c-invoice-sync.step';
import { O2CPaymentProcessingStep } from './services/steps/o2c-payment-processing.step';
import { O2CPaymentStatusSyncStep } from './services/steps/o2c-payment-status-sync.step';
import { O2COrderCompletionStep } from './services/steps/o2c-order-completion.step';

// Types
import {
  O2CFlowStatus,
  O2CStepType,
  StepStatus,
  CreditCheckResult,
  O2CFlowInstance,
  O2CFlowConfig,
  O2COrderData,
  O2CStepContext,
  O2CStepConfig,
  DEFAULT_O2C_FLOW_CONFIG,
  InvoiceStatus,
  ShipmentStatus,
  ExternalPaymentStatus,
  PaymentMethod,
} from './interfaces';

// Mock PrismaService
const mockPrismaService = {
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
};

describe('O2C Flow Module', () => {
  let module: TestingModule;
  let o2cService: O2CService;
  let orchestrator: O2CFlowOrchestratorService;
  let configService: O2CFlowConfigService;
  let logService: O2CFlowLogService;
  let eventHandler: O2CEventHandlerService;

  // Step handlers
  let orderSyncStep: O2COrderSyncStep;
  let creditCheckStep: O2CCreditCheckStep;
  let orderConfirmationStep: O2COrderConfirmationStep;
  let inventoryReservationStep: O2CInventoryReservationStep;
  let fulfillmentStep: O2CFulfillmentStep;
  let shipmentSyncStep: O2CShipmentSyncStep;
  let asnGenerationStep: O2CAsnGenerationStep;
  let invoiceGenerationStep: O2CInvoiceGenerationStep;
  let invoiceSyncStep: O2CInvoiceSyncStep;
  let paymentProcessingStep: O2CPaymentProcessingStep;
  let paymentStatusSyncStep: O2CPaymentStatusSyncStep;
  let orderCompletionStep: O2COrderCompletionStep;

  const tenantId = 'tenant-123';
  const orderId = uuidv4();
  const orderNumber = 'ORD-2026-00001';

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        O2CService,
        O2CFlowOrchestratorService,
        O2CFlowConfigService,
        O2CFlowLogService,
        O2CEventHandlerService,
        O2COrderSyncStep,
        O2CCreditCheckStep,
        O2COrderConfirmationStep,
        O2CInventoryReservationStep,
        O2CFulfillmentStep,
        O2CShipmentSyncStep,
        O2CAsnGenerationStep,
        O2CInvoiceGenerationStep,
        O2CInvoiceSyncStep,
        O2CPaymentProcessingStep,
        O2CPaymentStatusSyncStep,
        O2COrderCompletionStep,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    o2cService = module.get<O2CService>(O2CService);
    orchestrator = module.get<O2CFlowOrchestratorService>(O2CFlowOrchestratorService);
    configService = module.get<O2CFlowConfigService>(O2CFlowConfigService);
    logService = module.get<O2CFlowLogService>(O2CFlowLogService);
    eventHandler = module.get<O2CEventHandlerService>(O2CEventHandlerService);
    orderSyncStep = module.get<O2COrderSyncStep>(O2COrderSyncStep);
    creditCheckStep = module.get<O2CCreditCheckStep>(O2CCreditCheckStep);
    orderConfirmationStep = module.get<O2COrderConfirmationStep>(O2COrderConfirmationStep);
    inventoryReservationStep = module.get<O2CInventoryReservationStep>(O2CInventoryReservationStep);
    fulfillmentStep = module.get<O2CFulfillmentStep>(O2CFulfillmentStep);
    shipmentSyncStep = module.get<O2CShipmentSyncStep>(O2CShipmentSyncStep);
    asnGenerationStep = module.get<O2CAsnGenerationStep>(O2CAsnGenerationStep);
    invoiceGenerationStep = module.get<O2CInvoiceGenerationStep>(O2CInvoiceGenerationStep);
    invoiceSyncStep = module.get<O2CInvoiceSyncStep>(O2CInvoiceSyncStep);
    paymentProcessingStep = module.get<O2CPaymentProcessingStep>(O2CPaymentProcessingStep);
    paymentStatusSyncStep = module.get<O2CPaymentStatusSyncStep>(O2CPaymentStatusSyncStep);
    orderCompletionStep = module.get<O2COrderCompletionStep>(O2COrderCompletionStep);

    // Initialize module
    await orchestrator.onModuleInit();
    await eventHandler.onModuleInit();
  });

  afterEach(async () => {
    await module.close();
  });

  // ==========================================
  // O2C Flow Config Service Tests
  // ==========================================

  describe('O2CFlowConfigService', () => {
    it('should return default config for new tenant', async () => {
      const config = await configService.getConfig(tenantId);

      expect(config).toBeDefined();
      expect(config.tenantId).toBe(tenantId);
      expect(config.enabled).toBe(true);
      expect(config.steps.length).toBeGreaterThan(0);
    });

    it('should save and retrieve configuration', async () => {
      const customConfig: Partial<O2CFlowConfig> = {
        name: 'Custom O2C Flow',
        enabled: true,
        features: {
          ...DEFAULT_O2C_FLOW_CONFIG.features,
          enableCreditCheck: false,
        },
      };

      const saved = await configService.saveConfig(tenantId, customConfig);

      expect(saved.name).toBe('Custom O2C Flow');
      expect(saved.features.enableCreditCheck).toBe(false);

      const retrieved = await configService.getConfig(tenantId);
      expect(retrieved.name).toBe('Custom O2C Flow');
    });

    it('should update features', async () => {
      const config = await configService.updateFeatures(tenantId, {
        enableAutoInvoice: false,
        enableASNGeneration: true,
      });

      expect(config.features.enableAutoInvoice).toBe(false);
      expect(config.features.enableASNGeneration).toBe(true);
    });

    it('should update step configuration', async () => {
      const config = await configService.updateStepConfig(tenantId, O2CStepType.CREDIT_CHECK, {
        enabled: false,
        timeout: 60000,
      });

      const stepConfig = config.steps.find((s) => s.stepType === O2CStepType.CREDIT_CHECK);
      expect(stepConfig?.enabled).toBe(false);
      expect(stepConfig?.timeout).toBe(60000);
    });

    it('should enable/disable flow for tenant', async () => {
      await configService.setEnabled(tenantId, false);
      let config = await configService.getConfig(tenantId);
      expect(config.enabled).toBe(false);

      await configService.setEnabled(tenantId, true);
      config = await configService.getConfig(tenantId);
      expect(config.enabled).toBe(true);
    });

    it('should set connector IDs', async () => {
      const config = await configService.setConnectors(tenantId, {
        erpConnectorId: 'erp-conn-1',
        paymentConnectorId: 'pay-conn-1',
      });

      expect(config.erpConnectorId).toBe('erp-conn-1');
      expect(config.paymentConnectorId).toBe('pay-conn-1');
    });

    it('should validate configuration', () => {
      const validConfig: O2CFlowConfig = {
        ...DEFAULT_O2C_FLOW_CONFIG,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = configService.validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect invalid configuration', () => {
      const invalidConfig = {
        tenantId: '',
        name: '',
        steps: [],
      } as unknown as O2CFlowConfig;

      const result = configService.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // O2C Flow Log Service Tests
  // ==========================================

  describe('O2CFlowLogService', () => {
    const mockFlow: O2CFlowInstance = {
      id: uuidv4(),
      tenantId,
      configId: tenantId,
      orderId,
      orderNumber,
      status: O2CFlowStatus.RUNNING,
      steps: [],
      orderData: {} as O2COrderData,
      errorCount: 0,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      correlationId: uuidv4(),
    };

    it('should log messages', async () => {
      const entry = await logService.log(mockFlow, 'info', 'Test log message');

      expect(entry).toBeDefined();
      expect(entry.flowId).toBe(mockFlow.id);
      expect(entry.tenantId).toBe(tenantId);
      expect(entry.level).toBe('info');
      expect(entry.message).toBe('Test log message');
    });

    it('should log step-specific messages', async () => {
      const entry = await logService.logStep(
        mockFlow,
        O2CStepType.CREDIT_CHECK,
        'warn',
        'Credit check warning',
      );

      expect(entry.step).toBe(O2CStepType.CREDIT_CHECK);
      expect(entry.level).toBe('warn');
    });

    it('should retrieve flow logs', async () => {
      await logService.log(mockFlow, 'info', 'Log 1');
      await logService.log(mockFlow, 'error', 'Log 2');
      await logService.log(mockFlow, 'info', 'Log 3');

      const logs = await logService.getFlowLogs(mockFlow.id);

      expect(logs.length).toBe(3);
    });

    it('should filter logs by level', async () => {
      await logService.log(mockFlow, 'info', 'Info log');
      await logService.log(mockFlow, 'error', 'Error log');

      const errorLogs = await logService.getFlowLogs(mockFlow.id, { level: 'error' });

      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].level).toBe('error');
    });

    it('should get error logs for tenant', async () => {
      await logService.log(mockFlow, 'error', 'Tenant error 1');
      await logService.log(mockFlow, 'error', 'Tenant error 2');
      await logService.log(mockFlow, 'info', 'Info log');

      const errors = await logService.getErrorLogs(tenantId);

      expect(errors.length).toBe(2);
    });

    it('should get log statistics', async () => {
      await logService.log(mockFlow, 'info', 'Info 1');
      await logService.log(mockFlow, 'info', 'Info 2');
      await logService.log(mockFlow, 'error', 'Error 1');
      await logService.logStep(mockFlow, O2CStepType.CREDIT_CHECK, 'warn', 'Warning');

      const stats = await logService.getLogStats(tenantId);

      expect(stats.totalLogs).toBe(4);
      expect(stats.byLevel.info).toBe(2);
      expect(stats.byLevel.error).toBe(1);
      expect(stats.byLevel.warn).toBe(1);
    });

    it('should clear flow logs', async () => {
      await logService.log(mockFlow, 'info', 'Log to clear');
      await logService.clearFlowLogs(mockFlow.id);

      const logs = await logService.getFlowLogs(mockFlow.id);
      expect(logs.length).toBe(0);
    });

    it('should export flow logs', async () => {
      await logService.log(mockFlow, 'info', 'Export test log');

      const exported = await logService.exportFlowLogs(mockFlow.id);
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].message).toBe('Export test log');
    });
  });

  // ==========================================
  // Step Handler Tests
  // ==========================================

  describe('O2C Step Handlers', () => {
    const createMockFlow = (): O2CFlowInstance => ({
      id: uuidv4(),
      tenantId,
      configId: tenantId,
      orderId,
      orderNumber,
      status: O2CFlowStatus.RUNNING,
      steps: [],
      orderData: {
        orderId,
        orderNumber,
        status: OrderStatus.PENDING,
        customerId: 'customer-123',
        customerEmail: 'customer@example.com',
        customerName: 'Test Customer',
        subtotal: 1000,
        discount: 50,
        tax: 85,
        shipping: 10,
        total: 1045,
        currency: 'USD',
        shippingAddress: {
          street1: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          postalCode: '90210',
          country: 'US',
        },
        billingAddress: {
          street1: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          postalCode: '90210',
          country: 'US',
        },
        items: [
          {
            lineNumber: 1,
            sku: 'SKU-001',
            name: 'Test Product',
            quantity: 2,
            unitPrice: 500,
            discount: 25,
            tax: 42.5,
            total: 975,
          },
        ],
        createdAt: new Date(),
      },
      errorCount: 0,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      correlationId: uuidv4(),
    });

    const createMockStepConfig = (stepType: O2CStepType): O2CStepConfig => ({
      stepType,
      enabled: true,
      order: 1,
    });

    const createMockContext = (): O2CStepContext => ({
      tenantId,
      correlationId: uuidv4(),
    });

    describe('O2CCreditCheckStep', () => {
      it('should have correct step type', () => {
        expect(creditCheckStep.stepType).toBe(O2CStepType.CREDIT_CHECK);
      });

      it('should execute credit check and approve', async () => {
        const flow = createMockFlow();
        const config = createMockStepConfig(O2CStepType.CREDIT_CHECK);
        const context = createMockContext();

        const result = await creditCheckStep.execute(flow, config, context);

        expect(result.success).toBe(true);
        expect(flow.creditCheckData).toBeDefined();
        expect(flow.creditCheckData?.result).toBe(CreditCheckResult.APPROVED);
      });

      it('should validate flow has required data', async () => {
        const flow = createMockFlow();
        const config = createMockStepConfig(O2CStepType.CREDIT_CHECK);

        const isValid = await creditCheckStep.validate(flow, config);
        expect(isValid).toBe(true);
      });

      it('should not retry on credit rejection', () => {
        expect(creditCheckStep.canRetry('CREDIT_REJECTED', 1)).toBe(false);
      });
    });

    describe('O2CInventoryReservationStep', () => {
      it('should have correct step type', () => {
        expect(inventoryReservationStep.stepType).toBe(O2CStepType.INVENTORY_RESERVATION);
      });

      it('should reserve inventory for all items', async () => {
        const flow = createMockFlow();
        const config = createMockStepConfig(O2CStepType.INVENTORY_RESERVATION);
        const context = createMockContext();

        const result = await inventoryReservationStep.execute(flow, config, context);

        expect(result.success).toBe(true);
        expect(result.output?.reservations).toBeDefined();
        expect((result.output?.reservations as any[]).length).toBe(1);
      });
    });

    describe('O2CInvoiceGenerationStep', () => {
      it('should have correct step type', () => {
        expect(invoiceGenerationStep.stepType).toBe(O2CStepType.INVOICE_GENERATION);
      });

      it('should generate invoice with correct amounts', async () => {
        const flow = createMockFlow();
        const config = createMockStepConfig(O2CStepType.INVOICE_GENERATION);
        const context = createMockContext();

        const result = await invoiceGenerationStep.execute(flow, config, context);

        expect(result.success).toBe(true);
        expect(flow.invoiceData).toBeDefined();
        expect(flow.invoiceData?.total).toBe(flow.orderData.total);
        expect(flow.invoiceData?.status).toBe(InvoiceStatus.PENDING);
        expect(flow.invoiceData?.invoiceNumber).toMatch(/^INV-/);
      });
    });

    describe('O2CInvoiceSyncStep', () => {
      it('should have correct step type', () => {
        expect(invoiceSyncStep.stepType).toBe(O2CStepType.INVOICE_SYNC);
      });

      it('should fail if no invoice data', async () => {
        const flow = createMockFlow();
        const config = createMockStepConfig(O2CStepType.INVOICE_SYNC);
        const context = createMockContext();

        const result = await invoiceSyncStep.execute(flow, config, context);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('NO_INVOICE_DATA');
      });

      it('should sync invoice and mark as sent', async () => {
        const flow = createMockFlow();
        flow.invoiceData = {
          invoiceId: uuidv4(),
          invoiceNumber: 'INV-202602-00001',
          status: InvoiceStatus.PENDING,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: 1000,
          discount: 50,
          tax: 85,
          total: 1045,
          currency: 'USD',
          amountPaid: 0,
          amountDue: 1045,
          items: [],
        };

        const config = createMockStepConfig(O2CStepType.INVOICE_SYNC);
        const context = createMockContext();

        const result = await invoiceSyncStep.execute(flow, config, context);

        expect(result.success).toBe(true);
        expect(flow.invoiceData.status).toBe(InvoiceStatus.SENT);
        expect(flow.invoiceData.sentAt).toBeDefined();
      });
    });

    describe('O2CShipmentSyncStep', () => {
      it('should have correct step type', () => {
        expect(shipmentSyncStep.stepType).toBe(O2CStepType.SHIPMENT_SYNC);
      });
    });

    describe('O2CAsnGenerationStep', () => {
      it('should have correct step type', () => {
        expect(asnGenerationStep.stepType).toBe(O2CStepType.ASN_GENERATION);
      });

      it('should fail if no shipment data', async () => {
        const flow = createMockFlow();
        const config = createMockStepConfig(O2CStepType.ASN_GENERATION);
        const context = createMockContext();

        const result = await asnGenerationStep.execute(flow, config, context);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('NO_SHIPMENT_DATA');
      });

      it('should generate ASN with shipment data', async () => {
        const flow = createMockFlow();
        flow.shipmentData = {
          shipmentId: uuidv4(),
          carrier: 'UPS',
          trackingNumber: '1Z999AA10123456784',
          status: ShipmentStatus.SHIPPED,
          shippedAt: new Date(),
          packages: [
            {
              packageId: 'PKG-001',
              trackingNumber: '1Z999AA10123456784',
              items: [{ lineNumber: 1, sku: 'SKU-001', quantity: 2 }],
            },
          ],
        };

        const config = createMockStepConfig(O2CStepType.ASN_GENERATION);
        const context = createMockContext();

        const result = await asnGenerationStep.execute(flow, config, context);

        expect(result.success).toBe(true);
        expect(result.output?.asnNumber).toMatch(/^ASN-/);
        expect(flow.shipmentData.asnNumber).toBeDefined();
        expect(flow.shipmentData.asnGeneratedAt).toBeDefined();
      });
    });

    describe('O2CPaymentProcessingStep', () => {
      it('should have correct step type', () => {
        expect(paymentProcessingStep.stepType).toBe(O2CStepType.PAYMENT_PROCESSING);
      });

      it('should fail if no invoice data', async () => {
        const flow = createMockFlow();
        const config = createMockStepConfig(O2CStepType.PAYMENT_PROCESSING);
        const context = createMockContext();

        const result = await paymentProcessingStep.execute(flow, config, context);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('NO_INVOICE_DATA');
      });

      it('should process payment successfully', async () => {
        const flow = createMockFlow();
        flow.invoiceData = {
          invoiceId: uuidv4(),
          invoiceNumber: 'INV-202602-00001',
          status: InvoiceStatus.SENT,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: 1000,
          discount: 50,
          tax: 85,
          total: 1045,
          currency: 'USD',
          amountPaid: 0,
          amountDue: 1045,
          items: [],
        };

        const config = createMockStepConfig(O2CStepType.PAYMENT_PROCESSING);
        const context = createMockContext();

        const result = await paymentProcessingStep.execute(flow, config, context);

        expect(result.success).toBe(true);
        expect(flow.paymentData).toBeDefined();
        expect(flow.paymentData?.status).toBe(ExternalPaymentStatus.CAPTURED);
        expect(flow.paymentData?.amount).toBe(1045);
      });

      it('should not retry on card declined', () => {
        expect(paymentProcessingStep.canRetry('CARD_DECLINED', 1)).toBe(false);
        expect(paymentProcessingStep.canRetry('INSUFFICIENT_FUNDS', 1)).toBe(false);
      });
    });

    describe('O2CPaymentStatusSyncStep', () => {
      it('should have correct step type', () => {
        expect(paymentStatusSyncStep.stepType).toBe(O2CStepType.PAYMENT_STATUS_SYNC);
      });

      it('should fail if no payment data', async () => {
        const flow = createMockFlow();
        const config = createMockStepConfig(O2CStepType.PAYMENT_STATUS_SYNC);
        const context = createMockContext();

        const result = await paymentStatusSyncStep.execute(flow, config, context);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('NO_PAYMENT_DATA');
      });

      it('should update invoice status on payment', async () => {
        const flow = createMockFlow();
        flow.invoiceData = {
          invoiceId: uuidv4(),
          invoiceNumber: 'INV-202602-00001',
          status: InvoiceStatus.SENT,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: 1000,
          discount: 50,
          tax: 85,
          total: 1045,
          currency: 'USD',
          amountPaid: 0,
          amountDue: 1045,
          items: [],
        };
        flow.paymentData = {
          paymentId: uuidv4(),
          status: ExternalPaymentStatus.CAPTURED,
          method: PaymentMethod.CREDIT_CARD,
          amount: 1045,
          currency: 'USD',
          capturedAt: new Date(),
        };

        const config = createMockStepConfig(O2CStepType.PAYMENT_STATUS_SYNC);
        const context = createMockContext();

        const result = await paymentStatusSyncStep.execute(flow, config, context);

        expect(result.success).toBe(true);
        expect(flow.invoiceData.status).toBe(InvoiceStatus.PAID);
        expect(flow.invoiceData.amountPaid).toBe(1045);
        expect(flow.invoiceData.amountDue).toBe(0);
      });
    });
  });

  // ==========================================
  // O2C Event Handler Tests
  // ==========================================

  describe('O2CEventHandlerService', () => {
    it('should handle ORDER_CREATED event', async () => {
      // First enable the flow
      await configService.setEnabled(tenantId, true);

      const event = {
        id: uuidv4(),
        tenantId,
        payload: {
          orderId,
          orderNumber,
          total: 1045,
          userId: 'user-123',
        },
        correlationId: uuidv4(),
      };

      // This should not throw
      await eventHandler.handleOrderCreated(event);
    });

    it('should skip ORDER_CREATED if flow disabled', async () => {
      await configService.setEnabled(tenantId, false);

      const event = {
        id: uuidv4(),
        tenantId,
        payload: {
          orderId: uuidv4(),
          orderNumber: 'ORD-2026-00002',
          total: 500,
          userId: 'user-123',
        },
      };

      // Should not throw, should just log and skip
      await eventHandler.handleOrderCreated(event);

      // No flow should be created
      const flow = await orchestrator.getFlowByOrder(event.payload.orderId);
      expect(flow).toBeNull();
    });

    it('should handle ORDER_CANCELLED event', async () => {
      const event = {
        id: uuidv4(),
        tenantId,
        payload: {
          orderId,
          orderNumber,
          reason: 'Customer requested cancellation',
        },
      };

      // Should not throw even if no flow exists
      await eventHandler.handleOrderCancelled(event);
    });
  });

  // ==========================================
  // O2C Service (Facade) Tests
  // ==========================================

  describe('O2CService', () => {
    it('should get configuration', async () => {
      const config = await o2cService.getConfig(tenantId);
      expect(config).toBeDefined();
      expect(config.tenantId).toBe(tenantId);
    });

    it('should save configuration', async () => {
      const config = await o2cService.saveConfig(tenantId, {
        name: 'Custom Flow',
      });
      expect(config.name).toBe('Custom Flow');
    });

    it('should enable/disable flow', async () => {
      await o2cService.setEnabled(tenantId, false);
      let config = await o2cService.getConfig(tenantId);
      expect(config.enabled).toBe(false);

      await o2cService.setEnabled(tenantId, true);
      config = await o2cService.getConfig(tenantId);
      expect(config.enabled).toBe(true);
    });

    it('should get flow logs', async () => {
      const logs = await o2cService.getFlowLogs(uuidv4());
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should get flow statistics', async () => {
      const stats = await o2cService.getFlowStats(tenantId);
      expect(stats).toBeDefined();
      expect(stats.tenantId).toBe(tenantId);
    });

    it('should get active summary', async () => {
      const summary = await o2cService.getActiveSummary(tenantId);
      expect(summary).toBeDefined();
      expect(typeof summary.running).toBe('number');
      expect(typeof summary.failed).toBe('number');
    });

    it('should get health metrics', async () => {
      const health = await o2cService.getHealthMetrics(tenantId);
      expect(health).toBeDefined();
      expect(typeof health.healthy).toBe('boolean');
      expect(typeof health.successRate).toBe('number');
    });

    it('should handle webhooks', async () => {
      // Order status webhook
      await o2cService.handleOrderStatusWebhook(tenantId, 'ext-order-123', 'confirmed', {
        source: 'erp',
      });

      // Shipment webhook
      await o2cService.handleShipmentWebhook(
        tenantId,
        'ext-ship-123',
        'shipped',
        '1Z999AA10123456784',
        { carrier: 'UPS' },
      );

      // Payment webhook
      await o2cService.handlePaymentWebhook(tenantId, 'ext-pay-123', 'captured', 1045, {
        gateway: 'stripe',
      });
    });
  });

  // ==========================================
  // Default Config Tests
  // ==========================================

  describe('Default Configuration', () => {
    it('should have all step types defined', () => {
      const stepTypes = DEFAULT_O2C_FLOW_CONFIG.steps.map((s) => s.stepType);

      expect(stepTypes).toContain(O2CStepType.ORDER_SYNC);
      expect(stepTypes).toContain(O2CStepType.CREDIT_CHECK);
      expect(stepTypes).toContain(O2CStepType.ORDER_CONFIRMATION);
      expect(stepTypes).toContain(O2CStepType.INVENTORY_RESERVATION);
      expect(stepTypes).toContain(O2CStepType.FULFILLMENT);
      expect(stepTypes).toContain(O2CStepType.SHIPMENT_SYNC);
      expect(stepTypes).toContain(O2CStepType.ASN_GENERATION);
      expect(stepTypes).toContain(O2CStepType.INVOICE_GENERATION);
      expect(stepTypes).toContain(O2CStepType.INVOICE_SYNC);
      expect(stepTypes).toContain(O2CStepType.PAYMENT_PROCESSING);
      expect(stepTypes).toContain(O2CStepType.PAYMENT_STATUS_SYNC);
      expect(stepTypes).toContain(O2CStepType.ORDER_COMPLETION);
    });

    it('should have steps in correct order', () => {
      const steps = [...DEFAULT_O2C_FLOW_CONFIG.steps].sort((a, b) => a.order - b.order);

      expect(steps[0].stepType).toBe(O2CStepType.ORDER_SYNC);
      expect(steps[steps.length - 1].stepType).toBe(O2CStepType.ORDER_COMPLETION);
    });

    it('should have reasonable default settings', () => {
      const settings = DEFAULT_O2C_FLOW_CONFIG.settings;

      expect(settings.defaultTimeoutMs).toBeGreaterThan(0);
      expect(settings.maxConcurrentFlows).toBeGreaterThan(0);
      expect(settings.pollingIntervalMs).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // Type Enum Tests
  // ==========================================

  describe('Type Definitions', () => {
    it('should have all flow statuses', () => {
      expect(O2CFlowStatus.PENDING).toBe('pending');
      expect(O2CFlowStatus.RUNNING).toBe('running');
      expect(O2CFlowStatus.COMPLETED).toBe('completed');
      expect(O2CFlowStatus.FAILED).toBe('failed');
      expect(O2CFlowStatus.CANCELLED).toBe('cancelled');
    });

    it('should have all step statuses', () => {
      expect(StepStatus.PENDING).toBe('pending');
      expect(StepStatus.RUNNING).toBe('running');
      expect(StepStatus.COMPLETED).toBe('completed');
      expect(StepStatus.FAILED).toBe('failed');
      expect(StepStatus.SKIPPED).toBe('skipped');
    });

    it('should have all credit check results', () => {
      expect(CreditCheckResult.APPROVED).toBe('approved');
      expect(CreditCheckResult.REJECTED).toBe('rejected');
      expect(CreditCheckResult.PENDING_REVIEW).toBe('pending_review');
      expect(CreditCheckResult.ERROR).toBe('error');
    });

    it('should have all invoice statuses', () => {
      expect(InvoiceStatus.DRAFT).toBe('draft');
      expect(InvoiceStatus.PENDING).toBe('pending');
      expect(InvoiceStatus.SENT).toBe('sent');
      expect(InvoiceStatus.PAID).toBe('paid');
      expect(InvoiceStatus.OVERDUE).toBe('overdue');
    });

    it('should have all shipment statuses', () => {
      expect(ShipmentStatus.PENDING).toBe('pending');
      expect(ShipmentStatus.SHIPPED).toBe('shipped');
      expect(ShipmentStatus.DELIVERED).toBe('delivered');
    });

    it('should have all payment statuses', () => {
      expect(ExternalPaymentStatus.PENDING).toBe('pending');
      expect(ExternalPaymentStatus.AUTHORIZED).toBe('authorized');
      expect(ExternalPaymentStatus.CAPTURED).toBe('captured');
      expect(ExternalPaymentStatus.FAILED).toBe('failed');
    });

    it('should have all payment methods', () => {
      expect(PaymentMethod.CREDIT_CARD).toBe('credit_card');
      expect(PaymentMethod.ACH).toBe('ach');
      expect(PaymentMethod.NET_TERMS).toBe('net_terms');
    });
  });
});
