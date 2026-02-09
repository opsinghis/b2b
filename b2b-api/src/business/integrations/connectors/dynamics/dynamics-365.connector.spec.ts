import { Test, TestingModule } from '@nestjs/testing';
import { Dynamics365Connector } from './dynamics-365.connector';
import {
  DynamicsAuthService,
  DynamicsWebApiClientService,
  DynamicsSalesOrderService,
  DynamicsAccountService,
  DynamicsProductService,
  DynamicsInvoiceService,
  DynamicsMapperService,
  DynamicsErrorHandlerService,
} from './services';
import { DynamicsConnectionConfig, DynamicsCredentials } from './interfaces';

describe('Dynamics365Connector', () => {
  let connector: Dynamics365Connector;
  let authService: jest.Mocked<DynamicsAuthService>;
  let webApiClient: jest.Mocked<DynamicsWebApiClientService>;
  let salesOrderService: jest.Mocked<DynamicsSalesOrderService>;
  let accountService: jest.Mocked<DynamicsAccountService>;
  let productService: jest.Mocked<DynamicsProductService>;
  let invoiceService: jest.Mocked<DynamicsInvoiceService>;
  let mapper: jest.Mocked<DynamicsMapperService>;
  let errorHandler: jest.Mocked<DynamicsErrorHandlerService>;

  const mockConfig: DynamicsConnectionConfig = {
    organizationUrl: 'https://test.crm.dynamics.com',
    tenantId: 'tenant-123',
    authType: 'client_credentials',
    apiVersion: 'v9.2',
    defaultPriceLevelId: 'price-level-1',
    defaultCurrency: 'USD',
  };

  const mockCredentials: DynamicsCredentials = {
    clientCredentials: {
      clientId: 'client-123',
      clientSecret: 'secret-123',
    },
  };

  const mockMetadata = {
    requestId: 'req-123',
    durationMs: 100,
  };

  beforeEach(async () => {
    const mockAuthService = {
      validateCredentials: jest.fn(),
    };

    const mockWebApiClient = {
      executeFunction: jest.fn(),
    };

    const mockSalesOrderService = {
      create: jest.fn(),
      getById: jest.fn(),
      getStatus: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
      submit: jest.fn(),
      convertToInvoice: jest.fn(),
    };

    const mockAccountService = {
      create: jest.fn(),
      getById: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
      createContact: jest.fn(),
      getContactById: jest.fn(),
      listContacts: jest.fn(),
    };

    const mockProductService = {
      getById: jest.fn(),
      list: jest.fn(),
      search: jest.fn(),
      getProductPrice: jest.fn(),
      getPriceLevelById: jest.fn(),
      listPriceLevels: jest.fn(),
    };

    const mockInvoiceService = {
      getById: jest.fn(),
      list: jest.fn(),
      getForSalesOrder: jest.fn(),
    };

    const mockMapper = {
      mapSalesOrderToCanonical: jest.fn(),
      mapAccountToCanonical: jest.fn(),
      mapContactToCanonical: jest.fn(),
      mapProductToCanonical: jest.fn(),
      mapInvoiceToCanonical: jest.fn(),
    };

    const mockErrorHandler = {
      createErrorResult: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Dynamics365Connector,
        { provide: DynamicsAuthService, useValue: mockAuthService },
        { provide: DynamicsWebApiClientService, useValue: mockWebApiClient },
        { provide: DynamicsSalesOrderService, useValue: mockSalesOrderService },
        { provide: DynamicsAccountService, useValue: mockAccountService },
        { provide: DynamicsProductService, useValue: mockProductService },
        { provide: DynamicsInvoiceService, useValue: mockInvoiceService },
        { provide: DynamicsMapperService, useValue: mockMapper },
        { provide: DynamicsErrorHandlerService, useValue: mockErrorHandler },
      ],
    }).compile();

    connector = module.get<Dynamics365Connector>(Dynamics365Connector);
    authService = module.get(DynamicsAuthService);
    webApiClient = module.get(DynamicsWebApiClientService);
    salesOrderService = module.get(DynamicsSalesOrderService);
    accountService = module.get(DynamicsAccountService);
    productService = module.get(DynamicsProductService);
    invoiceService = module.get(DynamicsInvoiceService);
    mapper = module.get(DynamicsMapperService);
    errorHandler = module.get(DynamicsErrorHandlerService);
  });

  describe('metadata', () => {
    it('should have correct connector metadata', () => {
      expect(connector.metadata.id).toBe('dynamics-365');
      expect(connector.metadata.name).toBe('Microsoft Dynamics 365');
      expect(connector.metadata.version).toBe('1.0.0');
      expect(connector.metadata.vendor).toBe('Microsoft');
      expect(connector.metadata.supportedOperations).toContain('createSalesOrder');
      expect(connector.metadata.supportedOperations).toContain('getAccount');
      expect(connector.metadata.supportedOperations).toContain('listProducts');
    });
  });

  describe('testConnection', () => {
    it('should return success when WhoAmI returns valid data', async () => {
      authService.validateCredentials.mockReturnValue({ valid: true, errors: [] });
      webApiClient.executeFunction.mockResolvedValue({
        success: true,
        data: {
          UserId: 'user-123',
          BusinessUnitId: 'bu-123',
          OrganizationId: 'org-123',
        },
        metadata: mockMetadata,
      });

      const result = await connector.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.data?.connected).toBe(true);
      expect(result.data?.organizationName).toBe('org-123');
    });

    it('should return error when credentials are invalid', async () => {
      authService.validateCredentials.mockReturnValue({
        valid: false,
        errors: ['Missing tenantId', 'Missing clientId'],
      });

      const result = await connector.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
      expect(result.error?.message).toContain('Missing tenantId');
    });

    it('should return error when WhoAmI fails', async () => {
      authService.validateCredentials.mockReturnValue({ valid: true, errors: [] });
      webApiClient.executeFunction.mockResolvedValue({
        success: false,
        error: { code: 'AUTH_ERROR', message: 'Authentication failed', retryable: false },
        metadata: mockMetadata,
      });

      const result = await connector.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTH_ERROR');
    });

    it('should handle exceptions gracefully', async () => {
      authService.validateCredentials.mockReturnValue({ valid: true, errors: [] });
      webApiClient.executeFunction.mockRejectedValue(new Error('Network error'));
      errorHandler.createErrorResult.mockReturnValue({
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Network error', retryable: true },
        metadata: mockMetadata,
      });

      const result = await connector.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(errorHandler.createErrorResult).toHaveBeenCalled();
    });
  });

  describe('Sales Order Operations', () => {
    describe('createSalesOrder', () => {
      it('should create sales order and return canonical order', async () => {
        const mockInput = {
          name: 'Test Order',
          customerId: 'cust-123',
          customerType: 'account' as const,
          items: [{ productId: 'prod-1', quantity: 2 }],
        };
        const mockDynamicsOrder = { salesorderid: 'order-123' };
        const mockCanonicalOrder = { id: 'order-123', status: 'draft' };

        salesOrderService.create.mockResolvedValue({
          success: true,
          data: mockDynamicsOrder,
          metadata: mockMetadata,
        });
        mapper.mapSalesOrderToCanonical.mockReturnValue(mockCanonicalOrder as any);

        const result = await connector.createSalesOrder(mockConfig, mockCredentials, mockInput);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockCanonicalOrder);
        expect(salesOrderService.create).toHaveBeenCalledWith(
          mockConfig,
          mockCredentials,
          mockInput,
        );
      });

      it('should return error when service fails', async () => {
        salesOrderService.create.mockResolvedValue({
          success: false,
          error: { code: 'CREATE_FAILED', message: 'Failed to create order', retryable: false },
          metadata: mockMetadata,
        });

        const result = await connector.createSalesOrder(mockConfig, mockCredentials, {
          name: 'Test Order',
          customerId: 'cust-123',
          customerType: 'account' as const,
          items: [],
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('CREATE_FAILED');
      });
    });

    describe('getSalesOrder', () => {
      it('should get sales order by ID', async () => {
        const mockDynamicsOrder = { salesorderid: 'order-123' };
        const mockCanonicalOrder = { id: 'order-123' };

        salesOrderService.getById.mockResolvedValue({
          success: true,
          data: mockDynamicsOrder,
          metadata: mockMetadata,
        });
        mapper.mapSalesOrderToCanonical.mockReturnValue(mockCanonicalOrder as any);

        const result = await connector.getSalesOrder(mockConfig, mockCredentials, 'order-123');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockCanonicalOrder);
      });

      it('should return error when order not found', async () => {
        salesOrderService.getById.mockResolvedValue({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order not found', retryable: false },
          metadata: mockMetadata,
        });

        const result = await connector.getSalesOrder(
          mockConfig,
          mockCredentials,
          'nonexistent-order',
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NOT_FOUND');
      });
    });

    describe('getSalesOrderStatus', () => {
      it('should get sales order status', async () => {
        salesOrderService.getStatus.mockResolvedValue({
          success: true,
          data: { stateName: 'Active', stateCode: 0, statusCode: 1 },
          metadata: mockMetadata,
        });

        const result = await connector.getSalesOrderStatus(mockConfig, mockCredentials, 'order-123');

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe('Active');
        expect(result.data?.stateCode).toBe(0);
        expect(result.data?.statusCode).toBe(1);
      });
    });

    describe('listSalesOrders', () => {
      it('should list sales orders with pagination', async () => {
        const mockDynamicsOrders = [{ salesorderid: 'order-1' }, { salesorderid: 'order-2' }];
        const mockCanonicalOrders = [{ id: 'order-1' }, { id: 'order-2' }];

        salesOrderService.list.mockResolvedValue({
          success: true,
          data: {
            value: mockDynamicsOrders,
            metadata: { '@odata.count': 2, '@odata.nextLink': undefined },
          },
          metadata: mockMetadata,
        });
        mapper.mapSalesOrderToCanonical
          .mockReturnValueOnce(mockCanonicalOrders[0] as any)
          .mockReturnValueOnce(mockCanonicalOrders[1] as any);

        const result = await connector.listSalesOrders(mockConfig, mockCredentials);

        expect(result.success).toBe(true);
        expect(result.data?.orders).toHaveLength(2);
        expect(result.data?.total).toBe(2);
        expect(result.data?.hasMore).toBe(false);
      });

      it('should indicate hasMore when nextLink exists', async () => {
        salesOrderService.list.mockResolvedValue({
          success: true,
          data: {
            value: [{ salesorderid: 'order-1' }],
            metadata: {
              '@odata.count': 100,
              '@odata.nextLink': 'https://api.dynamics.com/next',
            },
          },
          metadata: mockMetadata,
        });
        mapper.mapSalesOrderToCanonical.mockReturnValue({ id: 'order-1' } as any);

        const result = await connector.listSalesOrders(mockConfig, mockCredentials);

        expect(result.data?.hasMore).toBe(true);
      });
    });

    describe('updateSalesOrder', () => {
      it('should update sales order', async () => {
        const mockUpdatedOrder = { salesorderid: 'order-123', name: 'Updated Order' };
        const mockCanonicalOrder = { id: 'order-123', name: 'Updated Order' };

        salesOrderService.update.mockResolvedValue({
          success: true,
          data: mockUpdatedOrder,
          metadata: mockMetadata,
        });
        mapper.mapSalesOrderToCanonical.mockReturnValue(mockCanonicalOrder as any);

        const result = await connector.updateSalesOrder(
          mockConfig,
          mockCredentials,
          'order-123',
          { name: 'Updated Order' },
          'etag-123',
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockCanonicalOrder);
      });
    });

    describe('submitSalesOrder', () => {
      it('should submit sales order', async () => {
        salesOrderService.submit.mockResolvedValue({
          success: true,
          metadata: mockMetadata,
        });

        const result = await connector.submitSalesOrder(mockConfig, mockCredentials, 'order-123');

        expect(result.success).toBe(true);
      });
    });

    describe('convertSalesOrderToInvoice', () => {
      it('should convert sales order to invoice', async () => {
        salesOrderService.convertToInvoice.mockResolvedValue({
          success: true,
          data: { invoiceId: 'invoice-123' },
          metadata: mockMetadata,
        });

        const result = await connector.convertSalesOrderToInvoice(
          mockConfig,
          mockCredentials,
          'order-123',
        );

        expect(result.success).toBe(true);
        expect(result.data?.invoiceId).toBe('invoice-123');
      });
    });
  });

  describe('Account Operations', () => {
    describe('createAccount', () => {
      it('should create account and return canonical customer', async () => {
        const mockInput = { name: 'Test Company', email: 'test@company.com' };
        const mockDynamicsAccount = { accountid: 'account-123' };
        const mockCanonicalCustomer = { id: 'account-123', name: 'Test Company' };

        accountService.create.mockResolvedValue({
          success: true,
          data: mockDynamicsAccount,
          metadata: mockMetadata,
        });
        mapper.mapAccountToCanonical.mockReturnValue(mockCanonicalCustomer as any);

        const result = await connector.createAccount(mockConfig, mockCredentials, mockInput);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockCanonicalCustomer);
      });
    });

    describe('getAccount', () => {
      it('should get account by ID', async () => {
        const mockDynamicsAccount = { accountid: 'account-123' };
        const mockCanonicalCustomer = { id: 'account-123' };

        accountService.getById.mockResolvedValue({
          success: true,
          data: mockDynamicsAccount,
          metadata: mockMetadata,
        });
        mapper.mapAccountToCanonical.mockReturnValue(mockCanonicalCustomer as any);

        const result = await connector.getAccount(mockConfig, mockCredentials, 'account-123');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockCanonicalCustomer);
      });
    });

    describe('listAccounts', () => {
      it('should list accounts', async () => {
        accountService.list.mockResolvedValue({
          success: true,
          data: {
            value: [{ accountid: 'account-1' }, { accountid: 'account-2' }],
            metadata: { '@odata.count': 2 },
          },
          metadata: mockMetadata,
        });
        mapper.mapAccountToCanonical.mockReturnValue({ id: 'account-1' } as any);

        const result = await connector.listAccounts(mockConfig, mockCredentials);

        expect(result.success).toBe(true);
        expect(result.data?.customers).toBeDefined();
      });
    });

    describe('updateAccount', () => {
      it('should update account', async () => {
        accountService.update.mockResolvedValue({
          success: true,
          data: { accountid: 'account-123', name: 'Updated' },
          metadata: mockMetadata,
        });
        mapper.mapAccountToCanonical.mockReturnValue({ id: 'account-123' } as any);

        const result = await connector.updateAccount(
          mockConfig,
          mockCredentials,
          'account-123',
          { name: 'Updated' },
          'etag-123',
        );

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Contact Operations', () => {
    describe('createContact', () => {
      it('should create contact', async () => {
        const mockInput = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
        accountService.createContact.mockResolvedValue({
          success: true,
          data: { contactid: 'contact-123' },
          metadata: mockMetadata,
        });
        mapper.mapContactToCanonical.mockReturnValue({ id: 'contact-123' } as any);

        const result = await connector.createContact(mockConfig, mockCredentials, mockInput);

        expect(result.success).toBe(true);
      });
    });

    describe('getContact', () => {
      it('should get contact by ID', async () => {
        accountService.getContactById.mockResolvedValue({
          success: true,
          data: { contactid: 'contact-123' },
          metadata: mockMetadata,
        });
        mapper.mapContactToCanonical.mockReturnValue({ id: 'contact-123' } as any);

        const result = await connector.getContact(mockConfig, mockCredentials, 'contact-123');

        expect(result.success).toBe(true);
      });
    });

    describe('listContacts', () => {
      it('should list contacts', async () => {
        accountService.listContacts.mockResolvedValue({
          success: true,
          data: {
            value: [{ contactid: 'contact-1' }],
            metadata: { '@odata.count': 1 },
          },
          metadata: mockMetadata,
        });
        mapper.mapContactToCanonical.mockReturnValue({ id: 'contact-1' } as any);

        const result = await connector.listContacts(mockConfig, mockCredentials);

        expect(result.success).toBe(true);
        expect(result.data?.contacts).toBeDefined();
      });
    });
  });

  describe('Product Operations', () => {
    describe('getProduct', () => {
      it('should get product by ID', async () => {
        productService.getById.mockResolvedValue({
          success: true,
          data: { productid: 'product-123' },
          metadata: mockMetadata,
        });
        mapper.mapProductToCanonical.mockReturnValue({ id: 'product-123' } as any);

        const result = await connector.getProduct(mockConfig, mockCredentials, 'product-123');

        expect(result.success).toBe(true);
      });
    });

    describe('listProducts', () => {
      it('should list products', async () => {
        productService.list.mockResolvedValue({
          success: true,
          data: {
            value: [{ productid: 'product-1' }],
            metadata: { '@odata.count': 1 },
          },
          metadata: mockMetadata,
        });
        mapper.mapProductToCanonical.mockReturnValue({ id: 'product-1' } as any);

        const result = await connector.listProducts(mockConfig, mockCredentials);

        expect(result.success).toBe(true);
        expect(result.data?.products).toBeDefined();
      });
    });

    describe('searchProducts', () => {
      it('should search products', async () => {
        productService.search.mockResolvedValue({
          success: true,
          data: {
            value: [{ productid: 'product-1', name: 'Widget' }],
            metadata: {},
          },
          metadata: mockMetadata,
        });
        mapper.mapProductToCanonical.mockReturnValue({ id: 'product-1' } as any);

        const result = await connector.searchProducts(mockConfig, mockCredentials, 'Widget', 10);

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
      });
    });

    describe('getProductPrice', () => {
      it('should get product price', async () => {
        productService.getProductPrice.mockResolvedValue({
          success: true,
          data: { amount: 99.99 },
          metadata: mockMetadata,
        });

        const result = await connector.getProductPrice(
          mockConfig,
          mockCredentials,
          'product-123',
          'price-level-1',
        );

        expect(result.success).toBe(true);
        expect(result.data?.price).toBe(99.99);
      });

      it('should return 0 when amount is not set', async () => {
        productService.getProductPrice.mockResolvedValue({
          success: true,
          data: {},
          metadata: mockMetadata,
        });

        const result = await connector.getProductPrice(
          mockConfig,
          mockCredentials,
          'product-123',
          'price-level-1',
        );

        expect(result.data?.price).toBe(0);
      });
    });

    describe('getPriceLevel', () => {
      it('should get price level by ID', async () => {
        productService.getPriceLevelById.mockResolvedValue({
          success: true,
          data: { pricelevelid: 'price-level-1', name: 'Standard' },
          metadata: mockMetadata,
        });

        const result = await connector.getPriceLevel(
          mockConfig,
          mockCredentials,
          'price-level-1',
        );

        expect(result.success).toBe(true);
      });
    });

    describe('listPriceLevels', () => {
      it('should list price levels', async () => {
        productService.listPriceLevels.mockResolvedValue({
          success: true,
          data: {
            value: [{ pricelevelid: 'pl-1' }],
            metadata: { '@odata.count': 1 },
          },
          metadata: mockMetadata,
        });

        const result = await connector.listPriceLevels(mockConfig, mockCredentials);

        expect(result.success).toBe(true);
        expect(result.data?.priceLevels).toBeDefined();
      });
    });
  });

  describe('Invoice Operations', () => {
    describe('getInvoice', () => {
      it('should get invoice by ID', async () => {
        invoiceService.getById.mockResolvedValue({
          success: true,
          data: { invoiceid: 'invoice-123' },
          metadata: mockMetadata,
        });
        mapper.mapInvoiceToCanonical.mockReturnValue({ id: 'invoice-123' } as any);

        const result = await connector.getInvoice(mockConfig, mockCredentials, 'invoice-123');

        expect(result.success).toBe(true);
      });
    });

    describe('listInvoices', () => {
      it('should list invoices', async () => {
        invoiceService.list.mockResolvedValue({
          success: true,
          data: {
            value: [{ invoiceid: 'invoice-1' }],
            metadata: { '@odata.count': 1 },
          },
          metadata: mockMetadata,
        });
        mapper.mapInvoiceToCanonical.mockReturnValue({ id: 'invoice-1' } as any);

        const result = await connector.listInvoices(mockConfig, mockCredentials);

        expect(result.success).toBe(true);
        expect(result.data?.invoices).toBeDefined();
      });
    });

    describe('getInvoicesForSalesOrder', () => {
      it('should get invoices for sales order', async () => {
        invoiceService.getForSalesOrder.mockResolvedValue({
          success: true,
          data: {
            value: [{ invoiceid: 'invoice-1' }],
            metadata: {},
          },
          metadata: mockMetadata,
        });
        mapper.mapInvoiceToCanonical.mockReturnValue({ id: 'invoice-1' } as any);

        const result = await connector.getInvoicesForSalesOrder(
          mockConfig,
          mockCredentials,
          'order-123',
        );

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
      });
    });
  });

  describe('Raw Operations', () => {
    it('should get raw sales orders', async () => {
      salesOrderService.list.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: mockMetadata,
      });

      const result = await connector.getRawSalesOrders(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
    });

    it('should get raw accounts', async () => {
      accountService.list.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: mockMetadata,
      });

      const result = await connector.getRawAccounts(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
    });

    it('should get raw products', async () => {
      productService.list.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: mockMetadata,
      });

      const result = await connector.getRawProducts(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
    });

    it('should get raw invoices', async () => {
      invoiceService.list.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: mockMetadata,
      });

      const result = await connector.getRawInvoices(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
    });
  });
});
