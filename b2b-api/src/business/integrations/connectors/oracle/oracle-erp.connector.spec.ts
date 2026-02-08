import { Test, TestingModule } from '@nestjs/testing';
import { OracleERPConnector } from './oracle-erp.connector';
import {
  OracleAuthService,
  OracleRestClientService,
  OracleSalesOrderService,
  OracleCustomerService,
  OracleItemService,
  OracleInvoiceService,
  OracleMapperService,
  OracleErrorHandlerService,
} from './services';
import {
  OracleConnectionConfig,
  OracleCredentials,
  OracleSalesOrder,
  OracleCustomer,
  OracleItem,
  OracleInvoice,
} from './interfaces';

describe('OracleERPConnector', () => {
  let connector: OracleERPConnector;
  let authService: jest.Mocked<OracleAuthService>;
  let salesOrderService: jest.Mocked<OracleSalesOrderService>;
  let customerService: jest.Mocked<OracleCustomerService>;
  let itemService: jest.Mocked<OracleItemService>;
  let invoiceService: jest.Mocked<OracleInvoiceService>;
  let mapper: OracleMapperService;

  const mockConfig: OracleConnectionConfig = {
    instanceUrl: 'https://fa-test.fa.ocs.oraclecloud.com',
    authType: 'oauth2',
    defaultBusinessUnit: 'US Sales',
    defaultCurrency: 'USD',
  };

  const mockCredentials: OracleCredentials = {
    oauth2: {
      clientId: 'test-client',
      clientSecret: 'test-secret',
      tokenEndpoint: 'https://idcs.oraclecloud.com/oauth2/v1/token',
    },
  };

  beforeEach(async () => {
    const mockAuthService = {
      validateCredentials: jest.fn(),
      testAuthentication: jest.fn(),
    };

    const mockSalesOrderService = {
      create: jest.fn(),
      getById: jest.fn(),
      getStatus: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
      submit: jest.fn(),
      cancel: jest.fn(),
    };

    const mockCustomerService = {
      create: jest.fn(),
      getById: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
      search: jest.fn(),
    };

    const mockItemService = {
      getById: jest.fn(),
      getByItemNumber: jest.fn(),
      list: jest.fn(),
      search: jest.fn(),
      checkAvailability: jest.fn(),
    };

    const mockInvoiceService = {
      getById: jest.fn(),
      list: jest.fn(),
      getForSalesOrder: jest.fn(),
      getOutstanding: jest.fn(),
    };

    const mockRestClient = {};
    const mockErrorHandler = {
      createErrorResult: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OracleERPConnector,
        OracleMapperService,
        { provide: OracleAuthService, useValue: mockAuthService },
        { provide: OracleRestClientService, useValue: mockRestClient },
        { provide: OracleSalesOrderService, useValue: mockSalesOrderService },
        { provide: OracleCustomerService, useValue: mockCustomerService },
        { provide: OracleItemService, useValue: mockItemService },
        { provide: OracleInvoiceService, useValue: mockInvoiceService },
        { provide: OracleErrorHandlerService, useValue: mockErrorHandler },
      ],
    }).compile();

    connector = module.get<OracleERPConnector>(OracleERPConnector);
    authService = module.get(OracleAuthService);
    salesOrderService = module.get(OracleSalesOrderService);
    customerService = module.get(OracleCustomerService);
    itemService = module.get(OracleItemService);
    invoiceService = module.get(OracleInvoiceService);
    mapper = module.get<OracleMapperService>(OracleMapperService);
  });

  describe('metadata', () => {
    it('should expose connector metadata', () => {
      expect(connector.metadata.id).toBe('oracle-erp-cloud');
      expect(connector.metadata.name).toBe('Oracle ERP Cloud');
      expect(connector.metadata.vendor).toBe('Oracle');
      expect(connector.metadata.supportedOperations).toContain('createSalesOrder');
      expect(connector.metadata.supportedOperations).toContain('getCustomer');
      expect(connector.metadata.supportedOperations).toContain('listItems');
    });
  });

  describe('testConnection', () => {
    it('should return success when credentials are valid and connection works', async () => {
      authService.validateCredentials.mockReturnValue({ valid: true, errors: [] });
      authService.testAuthentication.mockResolvedValue({ success: true });

      const result = await connector.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.data?.connected).toBe(true);
    });

    it('should return error when credentials are invalid', async () => {
      authService.validateCredentials.mockReturnValue({
        valid: false,
        errors: ['Client ID is required'],
      });

      const result = await connector.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return error when authentication test fails', async () => {
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

  describe('sales order operations', () => {
    const mockOrder: OracleSalesOrder = {
      OrderId: 12345,
      OrderNumber: 'ORD-001',
      BuyingPartyName: 'Acme Corp',
      BillToCustomerAccountId: 2001,
      StatusCode: 'BOOKED',
      TotalAmount: 1000,
      TransactionalCurrencyCode: 'USD',
      CreationDate: '2024-01-15T00:00:00Z',
      LastUpdateDate: '2024-01-15T00:00:00Z',
    };

    describe('createSalesOrder', () => {
      it('should create order and return canonical result', async () => {
        salesOrderService.create.mockResolvedValue({
          success: true,
          data: mockOrder,
          metadata: { requestId: 'req-1', durationMs: 100 },
        });

        const result = await connector.createSalesOrder(mockConfig, mockCredentials, {
          sourceTransactionNumber: 'SRC-001',
          customerId: 'CUST-001',
          lines: [{ itemNumber: 'ITEM-001', quantity: 5 }],
        });

        expect(result.success).toBe(true);
        expect(result.data?.orderNumber).toBe('ORD-001');
        expect(result.data?.total).toBe(1000);
      });

      it('should return error on failure', async () => {
        salesOrderService.create.mockResolvedValue({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid customer', retryable: false },
          metadata: { requestId: 'req-1', durationMs: 50 },
        });

        const result = await connector.createSalesOrder(mockConfig, mockCredentials, {
          sourceTransactionNumber: 'SRC-001',
          customerId: 'INVALID',
          lines: [],
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('getSalesOrder', () => {
      it('should get order and return canonical result', async () => {
        salesOrderService.getById.mockResolvedValue({
          success: true,
          data: mockOrder,
          metadata: { requestId: 'req-1', durationMs: 100 },
        });

        const result = await connector.getSalesOrder(mockConfig, mockCredentials, 12345);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe('12345');
      });
    });

    describe('getSalesOrderStatus', () => {
      it('should return order status', async () => {
        salesOrderService.getStatus.mockResolvedValue({
          success: true,
          data: {
            statusCode: 'BOOKED',
            fulfillmentStatus: 'SHIPPED',
            statusName: 'Booked',
          },
          metadata: { requestId: 'req-1', durationMs: 50 },
        });

        const result = await connector.getSalesOrderStatus(mockConfig, mockCredentials, 12345);

        expect(result.success).toBe(true);
        expect(result.data?.statusCode).toBe('BOOKED');
        expect(result.data?.status).toBe('Booked');
      });
    });

    describe('listSalesOrders', () => {
      it('should list orders with pagination', async () => {
        salesOrderService.list.mockResolvedValue({
          success: true,
          data: {
            items: [mockOrder],
            metadata: { totalResults: 100, hasMore: true },
          },
          metadata: { requestId: 'req-1', durationMs: 100 },
        });

        const result = await connector.listSalesOrders(mockConfig, mockCredentials, {
          limit: 25,
          offset: 0,
        });

        expect(result.success).toBe(true);
        expect(result.data?.orders).toHaveLength(1);
        expect(result.data?.total).toBe(100);
        expect(result.data?.hasMore).toBe(true);
      });
    });
  });

  describe('customer operations', () => {
    const mockCustomer: OracleCustomer = {
      PartyId: 1001,
      PartyName: 'Acme Corp',
      CustomerAccountId: 2001,
      CustomerAccountNumber: 'ACC-001',
      CustomerAccountStatus: 'A',
      PrimaryEmailAddress: 'contact@acme.com',
      CurrencyCode: 'USD',
      CreationDate: '2024-01-01T00:00:00Z',
      LastUpdateDate: '2024-01-15T00:00:00Z',
    };

    describe('createCustomer', () => {
      it('should create customer and return canonical result', async () => {
        customerService.create.mockResolvedValue({
          success: true,
          data: mockCustomer,
          metadata: { requestId: 'req-1', durationMs: 100 },
        });

        const result = await connector.createCustomer(mockConfig, mockCredentials, {
          name: 'Acme Corp',
          email: 'contact@acme.com',
        });

        expect(result.success).toBe(true);
        expect(result.data?.name).toBe('Acme Corp');
      });
    });

    describe('getCustomer', () => {
      it('should get customer and return canonical result', async () => {
        customerService.getById.mockResolvedValue({
          success: true,
          data: mockCustomer,
          metadata: { requestId: 'req-1', durationMs: 100 },
        });

        const result = await connector.getCustomer(mockConfig, mockCredentials, 2001);

        expect(result.success).toBe(true);
        expect(result.data?.customerNumber).toBe('ACC-001');
      });
    });

    describe('searchCustomers', () => {
      it('should search customers', async () => {
        customerService.search.mockResolvedValue({
          success: true,
          data: {
            items: [mockCustomer],
            metadata: { count: 1 },
          },
          metadata: { requestId: 'req-1', durationMs: 100 },
        });

        const result = await connector.searchCustomers(mockConfig, mockCredentials, 'Acme');

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
      });
    });
  });

  describe('item operations', () => {
    const mockItem: OracleItem = {
      InventoryItemId: 6001,
      ItemNumber: 'SKU-001',
      ItemDescription: 'Test Product',
      ItemStatus: 'Active',
      ListPrice: 99.99,
      PrimaryUOMCode: 'EA',
      CreationDate: '2024-01-01T00:00:00Z',
      LastUpdateDate: '2024-01-15T00:00:00Z',
    };

    describe('getItem', () => {
      it('should get item and return canonical result', async () => {
        itemService.getById.mockResolvedValue({
          success: true,
          data: mockItem,
          metadata: { requestId: 'req-1', durationMs: 100 },
        });

        const result = await connector.getItem(mockConfig, mockCredentials, 6001);

        expect(result.success).toBe(true);
        expect(result.data?.sku).toBe('SKU-001');
      });
    });

    describe('getItemByNumber', () => {
      it('should get item by number', async () => {
        itemService.getByItemNumber.mockResolvedValue({
          success: true,
          data: mockItem,
          metadata: { requestId: 'req-1', durationMs: 100 },
        });

        const result = await connector.getItemByNumber(mockConfig, mockCredentials, 'SKU-001');

        expect(result.success).toBe(true);
        expect(result.data?.sku).toBe('SKU-001');
      });

      it('should return null for non-existent item', async () => {
        itemService.getByItemNumber.mockResolvedValue({
          success: true,
          data: null,
          metadata: { requestId: 'req-1', durationMs: 100 },
        });

        const result = await connector.getItemByNumber(mockConfig, mockCredentials, 'UNKNOWN');

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });

    describe('checkAvailability', () => {
      it('should check item availability', async () => {
        itemService.checkAvailability.mockResolvedValue({
          success: true,
          data: {
            available: true,
            availableQuantity: 100,
            onHandQuantity: 150,
            reservedQuantity: 50,
          },
          metadata: { requestId: 'req-1', durationMs: 100 },
        });

        const result = await connector.checkAvailability(
          mockConfig,
          mockCredentials,
          'SKU-001',
          7001,
          10,
        );

        expect(result.success).toBe(true);
        expect(result.data?.available).toBe(true);
        expect(result.data?.availableQuantity).toBe(100);
      });
    });
  });

  describe('invoice operations', () => {
    const mockInvoice: OracleInvoice = {
      CustomerTrxId: 8001,
      TransactionNumber: 'INV-001',
      TransactionDate: '2024-01-20T00:00:00Z',
      CustomerAccountId: 2001,
      CustomerName: 'Acme Corp',
      CurrencyCode: 'USD',
      InvoicedAmount: 1000,
      TaxAmount: 80,
      BalanceDue: 1080,
      Status: 'COMPLETE',
      CreationDate: '2024-01-20T00:00:00Z',
      LastUpdateDate: '2024-01-20T00:00:00Z',
    };

    describe('getInvoice', () => {
      it('should get invoice and return canonical result', async () => {
        invoiceService.getById.mockResolvedValue({
          success: true,
          data: mockInvoice,
          metadata: { requestId: 'req-1', durationMs: 100 },
        });

        const result = await connector.getInvoice(mockConfig, mockCredentials, 8001);

        expect(result.success).toBe(true);
        expect(result.data?.invoiceNumber).toBe('INV-001');
      });
    });

    describe('listInvoices', () => {
      it('should list invoices with pagination', async () => {
        invoiceService.list.mockResolvedValue({
          success: true,
          data: {
            items: [mockInvoice],
            metadata: { totalResults: 50, hasMore: true },
          },
          metadata: { requestId: 'req-1', durationMs: 100 },
        });

        const result = await connector.listInvoices(mockConfig, mockCredentials, {
          limit: 25,
        });

        expect(result.success).toBe(true);
        expect(result.data?.invoices).toHaveLength(1);
        expect(result.data?.total).toBe(50);
      });
    });

    describe('getOutstandingInvoices', () => {
      it('should get outstanding invoices', async () => {
        invoiceService.getOutstanding.mockResolvedValue({
          success: true,
          data: {
            items: [mockInvoice],
            metadata: { count: 1 },
          },
          metadata: { requestId: 'req-1', durationMs: 100 },
        });

        const result = await connector.getOutstandingInvoices(
          mockConfig,
          mockCredentials,
          'CUST-001',
        );

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
      });
    });
  });

  describe('raw data access', () => {
    it('should return raw sales orders', async () => {
      salesOrderService.list.mockResolvedValue({
        success: true,
        data: {
          items: [],
          metadata: { count: 0 },
        },
        metadata: { requestId: 'req-1', durationMs: 50 },
      });

      const result = await connector.getRawSalesOrders(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.data?.items).toBeDefined();
    });

    it('should return raw customers', async () => {
      customerService.list.mockResolvedValue({
        success: true,
        data: {
          items: [],
          metadata: { count: 0 },
        },
        metadata: { requestId: 'req-1', durationMs: 50 },
      });

      const result = await connector.getRawCustomers(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.data?.items).toBeDefined();
    });
  });
});
