import { HttpService } from '@nestjs/axios';
import { SapS4HanaConnector, SapS4HanaConnectorFactory } from './sap-s4hana.connector';
import { ConnectorContext } from '../interfaces';

describe('SapS4HanaConnector', () => {
  let connector: SapS4HanaConnector;
  let mockHttpService: jest.Mocked<HttpService>;

  // Mock services
  const mockAuthService = {
    validateCredentials: jest.fn(),
    getAuthorizationHeader: jest.fn(),
    clearTokenCache: jest.fn(),
  };

  const mockProductService = {
    list: jest.fn(),
    getById: jest.fn(),
  };

  const mockSalesOrderService = {
    create: jest.fn(),
    getById: jest.fn(),
    getStatus: jest.fn(),
    list: jest.fn(),
  };

  const mockBusinessPartnerService = {
    create: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
    getCustomerById: jest.fn(),
  };

  const mockBillingDocumentService = {
    getById: jest.fn(),
    list: jest.fn(),
  };

  const mockAtpService = {
    checkAvailability: jest.fn(),
  };

  const mockErrorHandler = {
    normalize: jest.fn(),
    logError: jest.fn(),
    getUserMessage: jest.fn(),
  };

  const mockMapper = {
    mapSalesOrderToCanonical: jest.fn(),
    mapBusinessPartnerToCanonical: jest.fn(),
    mapCustomerToCanonical: jest.fn(),
    mapProductToCanonical: jest.fn(),
    mapBillingDocumentToCanonical: jest.fn(),
    mapAtpToCanonical: jest.fn(),
    mapCanonicalToSalesOrderInput: jest.fn(),
    mapCanonicalToBusinessPartnerInput: jest.fn(),
  };

  const mockContext: ConnectorContext = {
    tenantId: 'tenant-123',
    userId: 'user-123',
    configId: 'config-123',
    correlationId: 'correlation-123',
    config: {
      baseUrl: 'https://sap.example.com',
      client: '100',
      language: 'EN',
      authType: 'oauth2',
      timeout: 30000,
      salesOrganization: 'SO01',
      distributionChannel: 'DC01',
      division: 'DV01',
    },
    credentials: {
      tokenUrl: 'https://auth.sap.com/token',
      clientId: 'client-123',
      clientSecret: 'secret-123',
    },
  };

  const mockMetadata = {
    requestId: 'req-123',
    durationMs: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttpService = {} as any;

    connector = new SapS4HanaConnector();

    // Manually inject mock services
    (connector as any).authService = mockAuthService;
    (connector as any).odataClient = {};
    (connector as any).salesOrderService = mockSalesOrderService;
    (connector as any).businessPartnerService = mockBusinessPartnerService;
    (connector as any).productService = mockProductService;
    (connector as any).billingDocumentService = mockBillingDocumentService;
    (connector as any).atpService = mockAtpService;
    (connector as any).errorHandler = mockErrorHandler;
    (connector as any).mapper = mockMapper;
  });

  describe('getMetadata', () => {
    it('should return correct connector metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.code).toBe('sap-s4hana');
      expect(metadata.name).toBe('SAP S/4HANA');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.author).toBe('B2B Platform');
      expect(metadata.type).toBe('ERP');
      expect(metadata.direction).toBe('BIDIRECTIONAL');
    });
  });

  describe('getCredentialRequirements', () => {
    it('should return credential requirements for basic and oauth2', () => {
      const requirements = connector.getCredentialRequirements();

      expect(requirements).toHaveLength(2);

      const basicReq = requirements.find((r) => r.type === 'BASIC_AUTH');
      expect(basicReq).toBeDefined();
      expect(basicReq?.fields).toContainEqual(
        expect.objectContaining({ key: 'username', required: true }),
      );

      const oauth2Req = requirements.find((r) => r.type === 'OAUTH2');
      expect(oauth2Req).toBeDefined();
      expect(oauth2Req?.fields).toContainEqual(
        expect.objectContaining({ key: 'clientId', required: true }),
      );
    });
  });

  describe('getConfigSchema', () => {
    it('should return valid JSON schema for configuration', () => {
      const schema = connector.getConfigSchema();

      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('baseUrl');
      expect(schema.properties).toHaveProperty('client');
      expect(schema.properties).toHaveProperty('language');
      expect(schema.properties).toHaveProperty('authType');
      expect(schema.required).toContain('baseUrl');
      expect(schema.required).toContain('authType');
    });
  });

  describe('getCapabilities', () => {
    it('should return all supported capabilities', () => {
      const capabilities = connector.getCapabilities();

      expect(capabilities).toContainEqual(
        expect.objectContaining({ code: 'createSalesOrder', category: 'SYNC' }),
      );
      expect(capabilities).toContainEqual(
        expect.objectContaining({ code: 'getSalesOrder', category: 'SYNC' }),
      );
      expect(capabilities).toContainEqual(
        expect.objectContaining({ code: 'listSalesOrders', category: 'BATCH' }),
      );
      expect(capabilities).toContainEqual(
        expect.objectContaining({ code: 'getBusinessPartner', category: 'SYNC' }),
      );
      expect(capabilities).toContainEqual(
        expect.objectContaining({ code: 'getProduct', category: 'SYNC' }),
      );
      expect(capabilities).toContainEqual(
        expect.objectContaining({ code: 'getBillingDocument', category: 'SYNC' }),
      );
      expect(capabilities).toContainEqual(
        expect.objectContaining({ code: 'checkAtp', category: 'SYNC' }),
      );
    });
  });

  describe('initialize', () => {
    it('should initialize connector with valid credentials', async () => {
      mockAuthService.validateCredentials.mockReturnValue({ valid: true, errors: [] });

      await expect(connector.initialize(mockContext)).resolves.not.toThrow();
    });

    it('should throw error with invalid credentials', async () => {
      mockAuthService.validateCredentials.mockReturnValue({
        valid: false,
        errors: ['Missing clientId'],
      });

      await expect(connector.initialize(mockContext)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('testConnection', () => {
    it('should return success when connection test passes', async () => {
      mockAuthService.getAuthorizationHeader.mockResolvedValue('Bearer token');
      mockProductService.list.mockResolvedValue({
        success: true,
        data: { value: [] },
        metadata: mockMetadata,
      });

      const result = await connector.testConnection(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return failure when API call fails', async () => {
      mockAuthService.getAuthorizationHeader.mockResolvedValue('Bearer token');
      mockProductService.list.mockResolvedValue({
        success: false,
        error: { code: 'API_ERROR', message: 'API call failed', retryable: false },
        metadata: mockMetadata,
      });

      const result = await connector.testConnection(mockContext);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('API call failed');
    });

    it('should handle exceptions gracefully', async () => {
      const error = new Error('Network error');
      mockAuthService.getAuthorizationHeader.mockRejectedValue(error);
      mockErrorHandler.normalize.mockReturnValue({
        code: 'NETWORK_ERROR',
        message: 'Network error',
        retryable: true,
      });
      mockErrorHandler.getUserMessage.mockReturnValue('Connection failed');

      const result = await connector.testConnection(mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection failed');
    });
  });

  describe('executeCapability', () => {
    describe('createSalesOrder', () => {
      it('should create sales order successfully', async () => {
        const mockOrder = { id: 'order-123' };
        const mockSapOrder = { SalesOrder: '100000001' };

        mockMapper.mapCanonicalToSalesOrderInput.mockReturnValue({});
        mockSalesOrderService.create.mockResolvedValue({
          success: true,
          data: mockSapOrder,
          metadata: mockMetadata,
        });
        mockMapper.mapSalesOrderToCanonical.mockReturnValue(mockOrder);

        const result = await connector.executeCapability(
          'createSalesOrder',
          { order: { customerId: 'cust-1', items: [] } },
          mockContext,
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockOrder);
      });

      it('should handle create order failure', async () => {
        mockMapper.mapCanonicalToSalesOrderInput.mockReturnValue({});
        mockSalesOrderService.create.mockResolvedValue({
          success: false,
          error: { code: 'CREATE_ERROR', message: 'Failed to create', retryable: false },
        });

        const result = await connector.executeCapability(
          'createSalesOrder',
          { order: {} },
          mockContext,
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to create');
      });
    });

    describe('getSalesOrder', () => {
      it('should get sales order by ID', async () => {
        const mockOrder = { id: 'order-123' };

        mockSalesOrderService.getById.mockResolvedValue({
          success: true,
          data: { SalesOrder: '100000001' },
          metadata: mockMetadata,
        });
        mockMapper.mapSalesOrderToCanonical.mockReturnValue(mockOrder);

        const result = await connector.executeCapability(
          'getSalesOrder',
          { salesOrderId: '100000001', includeItems: true },
          mockContext,
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockOrder);
      });
    });

    describe('getSalesOrderStatus', () => {
      it('should get sales order status', async () => {
        mockSalesOrderService.getStatus.mockResolvedValue({
          success: true,
          data: { status: 'In Process', statusCode: 'B' },
          metadata: mockMetadata,
        });

        const result = await connector.executeCapability(
          'getSalesOrderStatus',
          { salesOrderId: '100000001' },
          mockContext,
        );

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });

    describe('listSalesOrders', () => {
      it('should list sales orders', async () => {
        const mockOrders = [{ id: 'order-1' }, { id: 'order-2' }];

        mockSalesOrderService.list.mockResolvedValue({
          success: true,
          data: {
            value: [{ SalesOrder: '100000001' }, { SalesOrder: '100000002' }],
            metadata: { '@odata.count': 2 },
          },
          metadata: mockMetadata,
        });
        mockMapper.mapSalesOrderToCanonical
          .mockReturnValueOnce(mockOrders[0])
          .mockReturnValueOnce(mockOrders[1]);

        const result = await connector.executeCapability(
          'listSalesOrders',
          { customer: 'CUST001', top: 10 },
          mockContext,
        );

        expect(result.success).toBe(true);
        const data = result.data as { items: any[]; total: number };
        expect(data?.items).toHaveLength(2);
        expect(data?.total).toBe(2);
      });
    });

    describe('getBusinessPartner', () => {
      it('should get business partner by ID', async () => {
        const mockBp = { id: 'bp-123' };

        mockBusinessPartnerService.getById.mockResolvedValue({
          success: true,
          data: { BusinessPartner: '10000001' },
          metadata: mockMetadata,
        });
        mockMapper.mapBusinessPartnerToCanonical.mockReturnValue(mockBp);

        const result = await connector.executeCapability(
          'getBusinessPartner',
          { businessPartnerId: '10000001', includeAddresses: true },
          mockContext,
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockBp);
      });
    });

    describe('createBusinessPartner', () => {
      it('should create business partner', async () => {
        const mockBp = { id: 'bp-123' };

        mockMapper.mapCanonicalToBusinessPartnerInput.mockReturnValue({});
        mockBusinessPartnerService.create.mockResolvedValue({
          success: true,
          data: { BusinessPartner: '10000001' },
          metadata: mockMetadata,
        });
        mockMapper.mapBusinessPartnerToCanonical.mockReturnValue(mockBp);

        const result = await connector.executeCapability(
          'createBusinessPartner',
          { customer: { name: 'Test Company' } },
          mockContext,
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockBp);
      });
    });

    describe('listBusinessPartners', () => {
      it('should list business partners', async () => {
        mockBusinessPartnerService.list.mockResolvedValue({
          success: true,
          data: {
            value: [{ BusinessPartner: '10000001' }],
            metadata: { '@odata.count': 1 },
          },
          metadata: mockMetadata,
        });
        mockMapper.mapBusinessPartnerToCanonical.mockReturnValue({ id: 'bp-1' });

        const result = await connector.executeCapability(
          'listBusinessPartners',
          { searchTerm: 'test', top: 10 },
          mockContext,
        );

        expect(result.success).toBe(true);
        const data = result.data as { items: any[] };
        expect(data?.items).toHaveLength(1);
      });
    });

    describe('getCustomer', () => {
      it('should get customer by ID', async () => {
        const mockCustomer = { id: 'cust-123' };

        mockBusinessPartnerService.getCustomerById.mockResolvedValue({
          success: true,
          data: { Customer: 'CUST001' },
          metadata: mockMetadata,
        });
        mockMapper.mapCustomerToCanonical.mockReturnValue(mockCustomer);

        const result = await connector.executeCapability(
          'getCustomer',
          { customerId: 'CUST001' },
          mockContext,
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockCustomer);
      });
    });

    describe('getProduct', () => {
      it('should get product by ID', async () => {
        const mockProduct = { id: 'prod-123' };

        mockProductService.getById.mockResolvedValue({
          success: true,
          data: { Product: 'MAT001' },
          metadata: mockMetadata,
        });
        mockMapper.mapProductToCanonical.mockReturnValue(mockProduct);

        const result = await connector.executeCapability(
          'getProduct',
          { productId: 'MAT001', language: 'EN' },
          mockContext,
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockProduct);
      });
    });

    describe('listProducts', () => {
      it('should list products', async () => {
        mockProductService.list.mockResolvedValue({
          success: true,
          data: {
            value: [{ Product: 'MAT001' }],
            metadata: { '@odata.count': 1 },
          },
          metadata: mockMetadata,
        });
        mockMapper.mapProductToCanonical.mockReturnValue({ id: 'prod-1' });

        const result = await connector.executeCapability(
          'listProducts',
          { productGroup: 'PG01', top: 10 },
          mockContext,
        );

        expect(result.success).toBe(true);
        const data = result.data as { items: any[] };
        expect(data?.items).toHaveLength(1);
      });
    });

    describe('getBillingDocument', () => {
      it('should get billing document by ID', async () => {
        const mockInvoice = { id: 'inv-123' };

        mockBillingDocumentService.getById.mockResolvedValue({
          success: true,
          data: { BillingDocument: '90000001' },
          metadata: mockMetadata,
        });
        mockMapper.mapBillingDocumentToCanonical.mockReturnValue(mockInvoice);

        const result = await connector.executeCapability(
          'getBillingDocument',
          { billingDocumentId: '90000001', includeItems: true },
          mockContext,
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockInvoice);
      });
    });

    describe('listBillingDocuments', () => {
      it('should list billing documents', async () => {
        mockBillingDocumentService.list.mockResolvedValue({
          success: true,
          data: {
            value: [{ BillingDocument: '90000001' }],
            metadata: { '@odata.count': 1 },
          },
          metadata: mockMetadata,
        });
        mockMapper.mapBillingDocumentToCanonical.mockReturnValue({ id: 'inv-1' });

        const result = await connector.executeCapability(
          'listBillingDocuments',
          { customer: 'CUST001', top: 10 },
          mockContext,
        );

        expect(result.success).toBe(true);
        const data = result.data as { items: any[] };
        expect(data?.items).toHaveLength(1);
      });
    });

    describe('checkAtp', () => {
      it('should check ATP successfully', async () => {
        mockAtpService.checkAvailability.mockResolvedValue({
          success: true,
          data: {
            IsAvailable: true,
            ConfirmedQuantity: 100,
            AvailabilityDate: '2024-01-15',
          },
          metadata: mockMetadata,
        });
        mockMapper.mapAtpToCanonical.mockReturnValue({ available: true });

        const result = await connector.executeCapability(
          'checkAtp',
          {
            material: 'MAT001',
            plant: 'PLANT01',
            quantity: 50,
            unit: 'EA',
            requestedDate: '2024-01-15',
          },
          mockContext,
        );

        expect(result.success).toBe(true);
        const data = result.data as { isAvailable: boolean; confirmedQuantity: number };
        expect(data?.isAvailable).toBe(true);
        expect(data?.confirmedQuantity).toBe(100);
      });
    });

    describe('unknown capability', () => {
      it('should return error for unknown capability', async () => {
        const result = await connector.executeCapability(
          'unknownCapability',
          {},
          mockContext,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Unknown capability');
      });
    });

    describe('error handling', () => {
      it('should handle exceptions and log errors', async () => {
        const error = new Error('Service unavailable');
        mockSalesOrderService.getById.mockRejectedValue(error);
        mockErrorHandler.normalize.mockReturnValue({
          code: 'SERVICE_ERROR',
          message: 'Service unavailable',
          retryable: true,
        });
        mockErrorHandler.getUserMessage.mockReturnValue('Service temporarily unavailable');

        const result = await connector.executeCapability(
          'getSalesOrder',
          { salesOrderId: '100000001' },
          mockContext,
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Service temporarily unavailable');
        expect(result.errorCode).toBe('SERVICE_ERROR');
        expect(result.retryable).toBe(true);
        expect(mockErrorHandler.logError).toHaveBeenCalled();
      });
    });
  });

  describe('destroy', () => {
    it('should clean up resources', async () => {
      // Initialize first
      mockAuthService.validateCredentials.mockReturnValue({ valid: true, errors: [] });
      await connector.initialize(mockContext);

      await connector.destroy();

      expect(mockAuthService.clearTokenCache).toHaveBeenCalled();
      expect((connector as any).config).toBeUndefined();
      expect((connector as any).credentials).toBeUndefined();
    });

    it('should handle destroy without initialization', async () => {
      await expect(connector.destroy()).resolves.not.toThrow();
    });
  });

  describe('buildCredentials', () => {
    it('should build basic auth credentials', async () => {
      const basicContext = {
        ...mockContext,
        config: { ...mockContext.config, authType: 'basic' },
        credentials: { username: 'user', password: 'pass' },
      };

      mockAuthService.validateCredentials.mockReturnValue({ valid: true, errors: [] });
      await connector.initialize(basicContext);

      expect((connector as any).credentials).toHaveProperty('basic');
    });

    it('should build oauth2 credentials', async () => {
      mockAuthService.validateCredentials.mockReturnValue({ valid: true, errors: [] });
      await connector.initialize(mockContext);

      expect((connector as any).credentials).toHaveProperty('oauth2');
    });
  });
});

describe('SapS4HanaConnectorFactory', () => {
  it('should create connector instances with initialized services', () => {
    const mockHttpService = {} as HttpService;
    const factory = new SapS4HanaConnectorFactory(mockHttpService);

    const connector = factory.create();

    expect(connector).toBeInstanceOf(SapS4HanaConnector);
  });
});
