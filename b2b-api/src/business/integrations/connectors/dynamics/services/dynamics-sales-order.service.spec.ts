import { Test, TestingModule } from '@nestjs/testing';
import { DynamicsSalesOrderService } from './dynamics-sales-order.service';
import { DynamicsWebApiClientService } from './dynamics-webapi-client.service';
import {
  DynamicsConnectionConfig,
  DynamicsCredentials,
  DynamicsSalesOrder,
  DynamicsSalesOrderState,
} from '../interfaces';

describe('DynamicsSalesOrderService', () => {
  let service: DynamicsSalesOrderService;
  let webApiClient: jest.Mocked<DynamicsWebApiClientService>;

  const mockConfig: DynamicsConnectionConfig = {
    organizationUrl: 'https://org.crm.dynamics.com',
    tenantId: 'tenant-123',
    authType: 'client_credentials',
    defaultPriceLevelId: 'price-level-1',
    defaultCurrency: 'currency-1',
  };

  const mockCredentials: DynamicsCredentials = {
    clientCredentials: {
      clientId: 'client-id',
      clientSecret: 'client-secret',
    },
  };

  beforeEach(async () => {
    const mockWebApiClient = {
      get: jest.fn(),
      getByKey: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      executeAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamicsSalesOrderService,
        { provide: DynamicsWebApiClientService, useValue: mockWebApiClient },
      ],
    }).compile();

    service = module.get<DynamicsSalesOrderService>(DynamicsSalesOrderService);
    webApiClient = module.get(DynamicsWebApiClientService);
  });

  describe('create', () => {
    it('should create sales order without items', async () => {
      const mockOrder: DynamicsSalesOrder = {
        salesorderid: 'order-123',
        ordernumber: 'SO-001',
        name: 'Test Order',
      };

      webApiClient.post.mockResolvedValue({
        success: true,
        data: mockOrder,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.create(mockConfig, mockCredentials, {
        name: 'Test Order',
        customerId: 'acc-123',
        customerType: 'account',
        items: [],
      });

      expect(result.success).toBe(true);
      expect(result.data?.salesorderid).toBe('order-123');
      expect(webApiClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        'salesorders',
        expect.objectContaining({
          name: 'Test Order',
          'customerid_account@odata.bind': '/accounts(acc-123)',
        }),
      );
    });

    it('should create sales order with items', async () => {
      const mockOrder: DynamicsSalesOrder = {
        salesorderid: 'order-123',
        ordernumber: 'SO-001',
        name: 'Test Order',
      };

      const mockOrderWithItems: DynamicsSalesOrder = {
        ...mockOrder,
        salesorder_details: [{ salesorderdetailid: 'item-1', quantity: 10 }],
      };

      webApiClient.post.mockResolvedValue({
        success: true,
        data: mockOrder,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      webApiClient.getByKey.mockResolvedValue({
        success: true,
        data: mockOrderWithItems,
        metadata: { requestId: 'req-2', durationMs: 100 },
      });

      const result = await service.create(mockConfig, mockCredentials, {
        name: 'Test Order',
        customerId: 'acc-123',
        customerType: 'account',
        items: [{ productId: 'prod-1', quantity: 10, pricePerUnit: 100 }],
      });

      expect(result.success).toBe(true);
      expect(result.data?.salesorder_details).toHaveLength(1);
    });

    it('should bind to contact when customerType is contact', async () => {
      webApiClient.post.mockResolvedValue({
        success: true,
        data: { salesorderid: 'order-123' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.create(mockConfig, mockCredentials, {
        name: 'Test Order',
        customerId: 'contact-123',
        customerType: 'contact',
        items: [],
      });

      expect(webApiClient.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          'customerid_contact@odata.bind': '/contacts(contact-123)',
        }),
      );
    });
  });

  describe('getById', () => {
    it('should get sales order by ID', async () => {
      const mockOrder: DynamicsSalesOrder = {
        salesorderid: 'order-123',
        ordernumber: 'SO-001',
        name: 'Test Order',
        totalamount: 1000,
      };

      webApiClient.getByKey.mockResolvedValue({
        success: true,
        data: mockOrder,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getById(mockConfig, mockCredentials, 'order-123');

      expect(result.success).toBe(true);
      expect(result.data?.ordernumber).toBe('SO-001');
    });

    it('should include items when requested', async () => {
      webApiClient.getByKey.mockResolvedValue({
        success: true,
        data: { salesorderid: 'order-123', salesorder_details: [] },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getById(mockConfig, mockCredentials, 'order-123', {
        includeItems: true,
      });

      expect(webApiClient.getByKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $expand: expect.arrayContaining([expect.stringContaining('salesorder_details')]),
        }),
      );
    });
  });

  describe('getStatus', () => {
    it('should get sales order status', async () => {
      webApiClient.getByKey.mockResolvedValue({
        success: true,
        data: { statecode: DynamicsSalesOrderState.ACTIVE, statuscode: 1 },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getStatus(mockConfig, mockCredentials, 'order-123');

      expect(result.success).toBe(true);
      expect(result.data?.stateCode).toBe(DynamicsSalesOrderState.ACTIVE);
      expect(result.data?.stateName).toBe('Active');
    });

    it('should return different state names', async () => {
      const states = [
        { state: DynamicsSalesOrderState.ACTIVE, expected: 'Active' },
        { state: DynamicsSalesOrderState.SUBMITTED, expected: 'Submitted' },
        { state: DynamicsSalesOrderState.CANCELED, expected: 'Canceled' },
        { state: DynamicsSalesOrderState.FULFILLED, expected: 'Fulfilled' },
        { state: DynamicsSalesOrderState.INVOICED, expected: 'Invoiced' },
      ];

      for (const { state, expected } of states) {
        webApiClient.getByKey.mockResolvedValue({
          success: true,
          data: { statecode: state, statuscode: 1 },
          metadata: { requestId: 'req-1', durationMs: 100 },
        });

        const result = await service.getStatus(mockConfig, mockCredentials, 'order-123');
        expect(result.data?.stateName).toBe(expected);
      }
    });

    it('should handle error response', async () => {
      webApiClient.getByKey.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found', retryable: false },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getStatus(mockConfig, mockCredentials, 'order-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('list', () => {
    it('should list sales orders', async () => {
      const mockOrders: DynamicsSalesOrder[] = [
        { salesorderid: 'order-1', ordernumber: 'SO-001' },
        { salesorderid: 'order-2', ordernumber: 'SO-002' },
      ];

      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: mockOrders,
          metadata: { '@odata.count': 2 },
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.list(mockConfig, mockCredentials, { top: 10 });

      expect(result.success).toBe(true);
      expect(result.data?.value).toHaveLength(2);
    });

    it('should filter by customer ID', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, {
        customerId: 'acc-123',
      });

      expect(webApiClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining('_customerid_value eq acc-123'),
        }),
      );
    });

    it('should filter by state code', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, {
        stateCode: DynamicsSalesOrderState.ACTIVE,
      });

      expect(webApiClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining('statecode eq 0'),
        }),
      );
    });

    it('should filter by date range', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, {
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
      });

      expect(webApiClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringMatching(/createdon ge.*createdon le/),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update sales order', async () => {
      webApiClient.patch.mockResolvedValue({
        success: true,
        data: { salesorderid: 'order-123', name: 'Updated Order' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.update(mockConfig, mockCredentials, 'order-123', {
        name: 'Updated Order',
      });

      expect(result.success).toBe(true);
      expect(webApiClient.patch).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        'salesorders',
        'order-123',
        expect.objectContaining({ name: 'Updated Order' }),
        undefined,
      );
    });

    it('should update addresses', async () => {
      webApiClient.patch.mockResolvedValue({
        success: true,
        data: { salesorderid: 'order-123' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.update(mockConfig, mockCredentials, 'order-123', {
        billToAddress: {
          line1: '123 Main St',
          city: 'City',
          stateOrProvince: 'State',
          postalCode: '12345',
          country: 'US',
        },
        shipToAddress: {
          line1: '456 Ship St',
          city: 'Ship City',
          stateOrProvince: 'SC',
          postalCode: '67890',
          country: 'US',
        },
      });

      expect(webApiClient.patch).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          billto_line1: '123 Main St',
          shipto_line1: '456 Ship St',
        }),
        undefined,
      );
    });

    it('should pass etag for optimistic concurrency', async () => {
      webApiClient.patch.mockResolvedValue({
        success: true,
        data: { salesorderid: 'order-123' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.update(
        mockConfig,
        mockCredentials,
        'order-123',
        { name: 'Test' },
        'W/"etag123"',
      );

      expect(webApiClient.patch).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'W/"etag123"',
      );
    });
  });

  describe('submit', () => {
    it('should submit sales order', async () => {
      webApiClient.executeAction.mockResolvedValue({
        success: true,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.submit(mockConfig, mockCredentials, 'order-123');

      expect(result.success).toBe(true);
      expect(webApiClient.executeAction).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        'SubmitSalesOrder',
        'salesorders',
        'order-123',
      );
    });
  });

  describe('fulfill', () => {
    it('should fulfill sales order', async () => {
      webApiClient.executeAction.mockResolvedValue({
        success: true,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.fulfill(mockConfig, mockCredentials, 'order-123');

      expect(result.success).toBe(true);
      expect(webApiClient.executeAction).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        'FulfillSalesOrder',
        'salesorders',
        'order-123',
        expect.objectContaining({ Status: -1 }),
      );
    });
  });

  describe('cancel', () => {
    it('should cancel sales order', async () => {
      webApiClient.executeAction.mockResolvedValue({
        success: true,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.cancel(
        mockConfig,
        mockCredentials,
        'order-123',
        'Customer request',
      );

      expect(result.success).toBe(true);
      expect(webApiClient.executeAction).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        'CancelSalesOrder',
        'salesorders',
        'order-123',
        expect.objectContaining({ Status: -1 }),
      );
    });
  });

  describe('convertToInvoice', () => {
    it('should convert sales order to invoice', async () => {
      webApiClient.executeAction.mockResolvedValue({
        success: true,
        data: { invoiceid: 'inv-123' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.convertToInvoice(mockConfig, mockCredentials, 'order-123');

      expect(result.success).toBe(true);
      expect(result.data?.invoiceId).toBe('inv-123');
    });

    it('should handle error when converting to invoice', async () => {
      webApiClient.executeAction.mockResolvedValue({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Order cannot be invoiced', retryable: false },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.convertToInvoice(mockConfig, mockCredentials, 'order-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_STATE');
    });
  });

  describe('addItem', () => {
    it('should add item to sales order', async () => {
      webApiClient.post.mockResolvedValue({
        success: true,
        data: { salesorderdetailid: 'item-123', quantity: 5 },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.addItem(mockConfig, mockCredentials, 'order-123', {
        productId: 'prod-123',
        quantity: 5,
        pricePerUnit: 100,
      });

      expect(result.success).toBe(true);
      expect(webApiClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        'salesorderdetails',
        expect.objectContaining({
          'salesorderid@odata.bind': '/salesorders(order-123)',
          'productid@odata.bind': '/products(prod-123)',
          quantity: 5,
          priceperunit: 100,
          ispriceoverridden: true,
        }),
      );
    });

    it('should add write-in item without product', async () => {
      webApiClient.post.mockResolvedValue({
        success: true,
        data: { salesorderdetailid: 'item-123' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.addItem(mockConfig, mockCredentials, 'order-123', {
        productId: 'write-in',
        quantity: 1,
        description: 'Custom service',
        pricePerUnit: 500,
      });

      expect(webApiClient.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          productdescription: 'Custom service',
          isproductoverridden: true,
        }),
      );
    });
  });
});
