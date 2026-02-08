import { Test, TestingModule } from '@nestjs/testing';
import {
  SapSalesOrderService,
  SapSalesOrderStatus,
  SapDeliveryStatus,
  SapBillingStatus,
} from './sap-sales-order.service';
import { SapODataClientService } from './sap-odata-client.service';
import {
  SapConnectionConfig,
  SapCredentials,
  SapCreateSalesOrderInput,
  SapSalesOrder,
} from '../interfaces';

describe('SapSalesOrderService', () => {
  let service: SapSalesOrderService;
  let odataClient: jest.Mocked<SapODataClientService>;

  const mockConfig: SapConnectionConfig = {
    baseUrl: 'https://my-sap.s4hana.ondemand.com',
    client: '100',
    authType: 'oauth2',
  };

  const mockCredentials: SapCredentials = {
    oauth2: {
      tokenUrl: 'https://auth.sap.com/oauth/token',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      grantType: 'client_credentials',
    },
  };

  beforeEach(async () => {
    const mockODataClient = {
      get: jest.fn(),
      getByKey: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SapSalesOrderService,
        { provide: SapODataClientService, useValue: mockODataClient },
      ],
    }).compile();

    service = module.get<SapSalesOrderService>(SapSalesOrderService);
    odataClient = module.get(SapODataClientService);
  });

  describe('create', () => {
    it('should create a sales order', async () => {
      const input: SapCreateSalesOrderInput = {
        salesOrderType: 'OR',
        salesOrganization: '1000',
        distributionChannel: '10',
        division: '00',
        soldToParty: 'CUST001',
        purchaseOrderByCustomer: 'PO-12345',
        items: [
          {
            material: 'MAT001',
            requestedQuantity: 10,
            requestedQuantityUnit: 'EA',
          },
        ],
      };

      const mockResponse: SapSalesOrder = {
        SalesOrder: '1234567890',
        SalesOrderType: 'OR',
        SoldToParty: 'CUST001',
        TotalNetAmount: '1500.00',
        TransactionCurrency: 'USD',
      };

      odataClient.post.mockResolvedValue({
        success: true,
        data: mockResponse,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.create(mockConfig, mockCredentials, input);

      expect(result.success).toBe(true);
      expect(result.data?.SalesOrder).toBe('1234567890');
      expect(odataClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        '/sap/opu/odata/sap/API_SALES_ORDER_SRV',
        'A_SalesOrder',
        expect.objectContaining({
          SalesOrderType: 'OR',
          SalesOrganization: '1000',
          SoldToParty: 'CUST001',
        }),
      );
    });

    it('should include items in create request', async () => {
      const input: SapCreateSalesOrderInput = {
        salesOrderType: 'OR',
        salesOrganization: '1000',
        distributionChannel: '10',
        division: '00',
        soldToParty: 'CUST001',
        items: [
          {
            material: 'MAT001',
            requestedQuantity: 10,
            requestedQuantityUnit: 'EA',
            plant: '1000',
            customerMaterial: 'CMAT001',
          },
        ],
      };

      odataClient.post.mockResolvedValue({
        success: true,
        data: { SalesOrder: '1234567890' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.create(mockConfig, mockCredentials, input);

      expect(odataClient.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          to_Item: expect.arrayContaining([
            expect.objectContaining({
              Material: 'MAT001',
              RequestedQuantity: '10',
              RequestedQuantityUnit: 'EA',
              Plant: '1000',
              MaterialByCustomer: 'CMAT001',
            }),
          ]),
        }),
      );
    });
  });

  describe('getById', () => {
    it('should get sales order by ID', async () => {
      const mockOrder: SapSalesOrder = {
        SalesOrder: '1234567890',
        SalesOrderType: 'OR',
        SoldToParty: 'CUST001',
        TotalNetAmount: '1500.00',
        TransactionCurrency: 'USD',
      };

      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: mockOrder,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getById(mockConfig, mockCredentials, '1234567890');

      expect(result.success).toBe(true);
      expect(result.data?.SalesOrder).toBe('1234567890');
      expect(odataClient.getByKey).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        '/sap/opu/odata/sap/API_SALES_ORDER_SRV',
        'A_SalesOrder',
        '1234567890',
        expect.any(Object),
      );
    });

    it('should include items when requested', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: { SalesOrder: '1234567890', to_Item: [] },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getById(mockConfig, mockCredentials, '1234567890', {
        includeItems: true,
      });

      expect(odataClient.getByKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $expand: ['to_Item'],
        }),
      );
    });
  });

  describe('getStatus', () => {
    it('should get sales order status', async () => {
      const mockOrder: SapSalesOrder = {
        SalesOrder: '1234567890',
        OverallSDProcessStatus: 'A',
        OverallDeliveryStatus: '',
        OverallBillingStatus: '',
      };

      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: mockOrder,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getStatus(mockConfig, mockCredentials, '1234567890');

      expect(result.success).toBe(true);
      expect(result.data?.salesOrder).toBe('1234567890');
      expect(result.data?.overallStatus).toBe(SapSalesOrderStatus.NOT_PROCESSED);
      expect(result.data?.statusText).toContain('Not Processed');
    });

    it('should return partially processed status', async () => {
      const mockOrder: SapSalesOrder = {
        SalesOrder: '1234567890',
        OverallSDProcessStatus: 'B',
        OverallDeliveryStatus: 'B',
        OverallBillingStatus: '',
      };

      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: mockOrder,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getStatus(mockConfig, mockCredentials, '1234567890');

      expect(result.data?.overallStatus).toBe(SapSalesOrderStatus.PARTIALLY_PROCESSED);
      expect(result.data?.deliveryStatus).toBe(SapDeliveryStatus.PARTIALLY_DELIVERED);
      expect(result.data?.statusText).toContain('Partially Processed');
      expect(result.data?.statusText).toContain('Partially Delivered');
    });

    it('should return error when order not found', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found', retryable: false },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getStatus(mockConfig, mockCredentials, '9999999999');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('list', () => {
    it('should list sales orders', async () => {
      const mockOrders: SapSalesOrder[] = [
        { SalesOrder: '1234567890', SoldToParty: 'CUST001' },
        { SalesOrder: '1234567891', SoldToParty: 'CUST001' },
      ];

      odataClient.get.mockResolvedValue({
        success: true,
        data: {
          value: mockOrders,
          metadata: { '@odata.count': 2 },
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.list(mockConfig, mockCredentials, {
        customer: 'CUST001',
        top: 10,
      });

      expect(result.success).toBe(true);
      expect((result.data?.value as SapSalesOrder[]).length).toBe(2);
    });

    it('should apply date filters', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      await service.list(mockConfig, mockCredentials, {
        fromDate,
        toDate,
      });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining('CreationDate ge 2024-01-01'),
        }),
      );
    });

    it('should apply status filter', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, {
        status: SapSalesOrderStatus.PARTIALLY_PROCESSED,
      });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("OverallSDProcessStatus eq 'B'"),
        }),
      );
    });
  });

  describe('getItems', () => {
    it('should get sales order items', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: {
          value: [{ SalesOrder: '1234567890', SalesOrderItem: '000010', Material: 'MAT001' }],
          metadata: {},
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getItems(mockConfig, mockCredentials, '1234567890');

      expect(result.success).toBe(true);
      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'A_SalesOrderItem',
        expect.objectContaining({
          $filter: "SalesOrder eq '1234567890'",
        }),
      );
    });
  });

  describe('update', () => {
    it('should update sales order', async () => {
      odataClient.patch.mockResolvedValue({
        success: true,
        data: { SalesOrder: '1234567890' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.update(mockConfig, mockCredentials, '1234567890', {
        purchaseOrderByCustomer: 'NEW-PO',
      });

      expect(result.success).toBe(true);
      expect(odataClient.patch).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        '/sap/opu/odata/sap/API_SALES_ORDER_SRV',
        'A_SalesOrder',
        '1234567890',
        { PurchaseOrderByCustomer: 'NEW-PO' },
        undefined,
      );
    });

    it('should pass etag for optimistic locking', async () => {
      odataClient.patch.mockResolvedValue({
        success: true,
        data: { SalesOrder: '1234567890' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.update(
        mockConfig,
        mockCredentials,
        '1234567890',
        { purchaseOrderByCustomer: 'NEW-PO' },
        'W/"abc123"',
      );

      expect(odataClient.patch).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'W/"abc123"',
      );
    });
  });

  describe('getByCustomerPO', () => {
    it('should find orders by customer PO', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: {
          value: [{ SalesOrder: '1234567890', PurchaseOrderByCustomer: 'PO-12345' }],
          metadata: {},
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getByCustomerPO(mockConfig, mockCredentials, 'PO-12345');

      expect(result.success).toBe(true);
      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("PurchaseOrderByCustomer eq 'PO-12345'"),
        }),
      );
    });

    it('should apply additional filters', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getByCustomerPO(mockConfig, mockCredentials, 'PO-12345', {
        salesOrganization: '1000',
        customer: 'CUST001',
      });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("SalesOrganization eq '1000'"),
        }),
      );
    });
  });
});
