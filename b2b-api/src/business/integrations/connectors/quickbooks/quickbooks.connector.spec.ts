import { Test, TestingModule } from '@nestjs/testing';
import { QuickBooksConnector } from './quickbooks.connector';
import {
  QuickBooksAuthService,
  QuickBooksRestClientService,
  QuickBooksCustomerService,
  QuickBooksItemService,
  QuickBooksInvoiceService,
  QuickBooksSalesReceiptService,
  QuickBooksPaymentService,
  QuickBooksMapperService,
  QuickBooksErrorHandlerService,
} from './services';
import {
  QuickBooksConnectionConfig,
  QuickBooksCredentials,
  QuickBooksCustomer,
  QuickBooksItem,
  QuickBooksInvoice,
  QuickBooksSalesReceipt,
  QuickBooksPayment,
} from './interfaces';

describe('QuickBooksConnector', () => {
  let connector: QuickBooksConnector;
  let authService: jest.Mocked<QuickBooksAuthService>;
  let customerService: jest.Mocked<QuickBooksCustomerService>;
  let itemService: jest.Mocked<QuickBooksItemService>;
  let invoiceService: jest.Mocked<QuickBooksInvoiceService>;
  let salesReceiptService: jest.Mocked<QuickBooksSalesReceiptService>;
  let paymentService: jest.Mocked<QuickBooksPaymentService>;

  const mockConfig: QuickBooksConnectionConfig = {
    realmId: '123456789',
    environment: 'sandbox',
    minorVersion: 65,
    timeout: 30000,
  };

  const mockCredentials: QuickBooksCredentials = {
    oauth2: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
    },
  };

  const mockMetadata = {
    requestId: 'test-123',
    durationMs: 100,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuickBooksConnector,
        {
          provide: QuickBooksAuthService,
          useValue: {
            validateCredentials: jest.fn(),
            testAuthentication: jest.fn(),
          },
        },
        {
          provide: QuickBooksRestClientService,
          useValue: {},
        },
        {
          provide: QuickBooksCustomerService,
          useValue: {
            create: jest.fn(),
            getById: jest.fn(),
            list: jest.fn(),
            update: jest.fn(),
            search: jest.fn(),
          },
        },
        {
          provide: QuickBooksItemService,
          useValue: {
            create: jest.fn(),
            getById: jest.fn(),
            getBySku: jest.fn(),
            list: jest.fn(),
            update: jest.fn(),
            search: jest.fn(),
          },
        },
        {
          provide: QuickBooksInvoiceService,
          useValue: {
            create: jest.fn(),
            getById: jest.fn(),
            list: jest.fn(),
            update: jest.fn(),
            void: jest.fn(),
            send: jest.fn(),
            getOutstanding: jest.fn(),
          },
        },
        {
          provide: QuickBooksSalesReceiptService,
          useValue: {
            create: jest.fn(),
            getById: jest.fn(),
            list: jest.fn(),
            update: jest.fn(),
            void: jest.fn(),
          },
        },
        {
          provide: QuickBooksPaymentService,
          useValue: {
            create: jest.fn(),
            getById: jest.fn(),
            list: jest.fn(),
            void: jest.fn(),
            getForInvoice: jest.fn(),
          },
        },
        QuickBooksMapperService,
        {
          provide: QuickBooksErrorHandlerService,
          useValue: {
            createErrorResult: jest.fn(),
          },
        },
      ],
    }).compile();

    connector = module.get<QuickBooksConnector>(QuickBooksConnector);
    authService = module.get(QuickBooksAuthService);
    customerService = module.get(QuickBooksCustomerService);
    itemService = module.get(QuickBooksItemService);
    invoiceService = module.get(QuickBooksInvoiceService);
    salesReceiptService = module.get(QuickBooksSalesReceiptService);
    paymentService = module.get(QuickBooksPaymentService);
  });

  describe('metadata', () => {
    it('should have correct connector metadata', () => {
      expect(connector.metadata.id).toBe('quickbooks-online');
      expect(connector.metadata.name).toBe('QuickBooks Online');
      expect(connector.metadata.vendor).toBe('Intuit');
      expect(connector.metadata.supportedOperations).toContain('createCustomer');
      expect(connector.metadata.supportedOperations).toContain('createInvoice');
      expect(connector.metadata.supportedOperations).toContain('createPayment');
    });
  });

  describe('testConnection', () => {
    it('should return success when connection is valid', async () => {
      authService.validateCredentials.mockReturnValue({ valid: true, errors: [] });
      authService.testAuthentication.mockResolvedValue({ success: true });

      const result = await connector.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.data?.connected).toBe(true);
    });

    it('should return error for invalid credentials', async () => {
      authService.validateCredentials.mockReturnValue({
        valid: false,
        errors: ['Missing client ID'],
      });

      const result = await connector.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return error when authentication fails', async () => {
      authService.validateCredentials.mockReturnValue({ valid: true, errors: [] });
      authService.testAuthentication.mockResolvedValue({
        success: false,
        error: 'Authentication failed',
      });

      const result = await connector.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONNECTION_FAILED');
    });
  });

  describe('Customer Operations', () => {
    const mockQBCustomer: QuickBooksCustomer = {
      Id: '123',
      DisplayName: 'Test Customer',
      Active: true,
      PrimaryEmailAddr: { Address: 'test@example.com' },
    };

    describe('createCustomer', () => {
      it('should create customer and return canonical result', async () => {
        customerService.create.mockResolvedValue({
          success: true,
          data: mockQBCustomer,
          metadata: mockMetadata,
        });

        const result = await connector.createCustomer(mockConfig, mockCredentials, {
          displayName: 'Test Customer',
          email: 'test@example.com',
        });

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe('123');
        expect(result.data?.name).toBe('Test Customer');
      });

      it('should return error on failure', async () => {
        customerService.create.mockResolvedValue({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Display name required',
            retryable: false,
          },
          metadata: mockMetadata,
        });

        const result = await connector.createCustomer(mockConfig, mockCredentials, {
          displayName: '',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('getCustomer', () => {
      it('should get customer by ID', async () => {
        customerService.getById.mockResolvedValue({
          success: true,
          data: mockQBCustomer,
          metadata: mockMetadata,
        });

        const result = await connector.getCustomer(mockConfig, mockCredentials, '123');

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe('123');
      });
    });

    describe('listCustomers', () => {
      it('should list customers with pagination', async () => {
        customerService.list.mockResolvedValue({
          success: true,
          data: {
            QueryResponse: {
              Customer: [mockQBCustomer],
              startPosition: 1,
              maxResults: 100,
            },
          },
          metadata: { ...mockMetadata, totalResults: 1, hasMore: false },
        });

        const result = await connector.listCustomers(mockConfig, mockCredentials);

        expect(result.success).toBe(true);
        expect(result.data?.customers).toHaveLength(1);
        expect(result.data?.hasMore).toBe(false);
      });
    });
  });

  describe('Item Operations', () => {
    const mockQBItem: QuickBooksItem = {
      Id: '456',
      Name: 'Test Product',
      Type: 'Service',
      UnitPrice: 99.99,
      Active: true,
    };

    describe('createItem', () => {
      it('should create item and return canonical result', async () => {
        itemService.create.mockResolvedValue({
          success: true,
          data: mockQBItem,
          metadata: mockMetadata,
        });

        const result = await connector.createItem(mockConfig, mockCredentials, {
          name: 'Test Product',
          type: 'Service',
          unitPrice: 99.99,
        });

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe('456');
        expect(result.data?.name).toBe('Test Product');
        expect(result.data?.price).toBe(99.99);
      });
    });

    describe('getItemBySku', () => {
      it('should get item by SKU', async () => {
        itemService.getBySku.mockResolvedValue({
          success: true,
          data: { ...mockQBItem, Sku: 'TEST-SKU' },
          metadata: mockMetadata,
        });

        const result = await connector.getItemBySku(mockConfig, mockCredentials, 'TEST-SKU');

        expect(result.success).toBe(true);
        expect(result.data?.sku).toBe('TEST-SKU');
      });

      it('should return null for non-existent SKU', async () => {
        itemService.getBySku.mockResolvedValue({
          success: true,
          data: null,
          metadata: mockMetadata,
        });

        const result = await connector.getItemBySku(mockConfig, mockCredentials, 'NON-EXISTENT');

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });
  });

  describe('Invoice Operations', () => {
    const mockQBInvoice: QuickBooksInvoice = {
      Id: '1001',
      DocNumber: 'INV-001',
      CustomerRef: { value: '123', name: 'Test Customer' },
      TotalAmt: 199.99,
      Balance: 199.99,
      Line: [],
    };

    describe('createInvoice', () => {
      it('should create invoice and return canonical result', async () => {
        invoiceService.create.mockResolvedValue({
          success: true,
          data: mockQBInvoice,
          metadata: mockMetadata,
        });

        const result = await connector.createInvoice(mockConfig, mockCredentials, {
          customerId: '123',
          lines: [
            {
              itemId: '456',
              quantity: 1,
              unitPrice: 199.99,
            },
          ],
        });

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe('1001');
        expect(result.data?.invoiceNumber).toBe('INV-001');
      });
    });

    describe('sendInvoice', () => {
      it('should send invoice via email', async () => {
        invoiceService.send.mockResolvedValue({
          success: true,
          data: { ...mockQBInvoice, EmailStatus: 'Sent' },
          metadata: mockMetadata,
        });

        const result = await connector.sendInvoice(
          mockConfig,
          mockCredentials,
          '1001',
          'customer@example.com',
        );

        expect(result.success).toBe(true);
        expect(invoiceService.send).toHaveBeenCalledWith(
          mockConfig,
          mockCredentials,
          '1001',
          'customer@example.com',
        );
      });
    });

    describe('getOutstandingInvoices', () => {
      it('should get outstanding invoices', async () => {
        invoiceService.getOutstanding.mockResolvedValue({
          success: true,
          data: [mockQBInvoice],
          metadata: mockMetadata,
        });

        const result = await connector.getOutstandingInvoices(mockConfig, mockCredentials);

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data?.[0].amountDue).toBe(199.99);
      });
    });
  });

  describe('Sales Receipt Operations', () => {
    const mockQBSalesReceipt: QuickBooksSalesReceipt = {
      Id: '2001',
      DocNumber: 'SR-001',
      CustomerRef: { value: '123' },
      TotalAmt: 299.99,
      Line: [],
    };

    describe('createSalesReceipt', () => {
      it('should create sales receipt and return canonical result', async () => {
        salesReceiptService.create.mockResolvedValue({
          success: true,
          data: mockQBSalesReceipt,
          metadata: mockMetadata,
        });

        const result = await connector.createSalesReceipt(mockConfig, mockCredentials, {
          customerId: '123',
          lines: [
            {
              itemId: '456',
              quantity: 1,
              unitPrice: 299.99,
            },
          ],
        });

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe('2001');
        expect(result.data?.orderNumber).toBe('SR-001');
        expect(result.data?.status).toBe('completed');
      });
    });
  });

  describe('Payment Operations', () => {
    const mockQBPayment: QuickBooksPayment = {
      Id: '3001',
      CustomerRef: { value: '123' },
      TotalAmt: 199.99,
      UnappliedAmt: 0,
      Line: [
        {
          Amount: 199.99,
          LinkedTxn: [{ TxnId: '1001', TxnType: 'Invoice' }],
        },
      ],
    };

    describe('createPayment', () => {
      it('should create payment and return canonical result', async () => {
        paymentService.create.mockResolvedValue({
          success: true,
          data: mockQBPayment,
          metadata: mockMetadata,
        });

        const result = await connector.createPayment(mockConfig, mockCredentials, {
          customerId: '123',
          totalAmt: 199.99,
          invoices: [{ invoiceId: '1001' }],
        });

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe('3001');
        expect(result.data?.amount).toBe(199.99);
        expect(result.data?.status).toBe('applied');
        expect(result.data?.appliedInvoices).toHaveLength(1);
      });
    });

    describe('getPaymentsForInvoice', () => {
      it('should get payments for specific invoice', async () => {
        paymentService.getForInvoice.mockResolvedValue({
          success: true,
          data: [mockQBPayment],
          metadata: mockMetadata,
        });

        const result = await connector.getPaymentsForInvoice(mockConfig, mockCredentials, '1001');

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
      });
    });
  });

  describe('Raw Data Access', () => {
    it('should get raw customers', async () => {
      customerService.list.mockResolvedValue({
        success: true,
        data: {
          QueryResponse: {
            Customer: [{ Id: '123', DisplayName: 'Test' }],
          },
        },
        metadata: mockMetadata,
      });

      const result = await connector.getRawCustomers(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].Id).toBe('123');
    });

    it('should get raw items', async () => {
      itemService.list.mockResolvedValue({
        success: true,
        data: {
          QueryResponse: {
            Item: [{ Id: '456', Name: 'Test Item' }],
          },
        },
        metadata: mockMetadata,
      });

      const result = await connector.getRawItems(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].Id).toBe('456');
    });
  });
});
