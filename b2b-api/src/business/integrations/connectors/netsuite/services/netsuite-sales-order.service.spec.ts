import {
  NetSuiteSalesOrderService,
  NetSuiteSalesOrderStatusId,
} from './netsuite-sales-order.service';
import { NetSuiteRestClientService } from './netsuite-rest-client.service';
import { NetSuiteSalesOrder, NetSuiteCreateSalesOrderInput } from '../interfaces';

describe('NetSuiteSalesOrderService', () => {
  let service: NetSuiteSalesOrderService;
  let restClient: jest.Mocked<NetSuiteRestClientService>;

  const mockSalesOrder: NetSuiteSalesOrder = {
    id: '123',
    tranId: 'SO001',
    tranDate: '2024-01-15',
    status: { id: 'pendingFulfillment', refName: 'Pending Fulfillment' },
    entity: { id: '456', refName: 'Test Customer' },
    total: 1000,
    item: [
      {
        lineNumber: 1,
        item: { id: '789', refName: 'SKU001' },
        quantity: 10,
        rate: 100,
        amount: 1000,
      },
    ],
  };

  beforeEach(() => {
    restClient = {
      post: jest.fn(),
      get: jest.fn(),
      patch: jest.fn(),
      executeSuiteQL: jest.fn(),
    } as unknown as jest.Mocked<NetSuiteRestClientService>;

    service = new NetSuiteSalesOrderService(restClient);
  });

  describe('create', () => {
    it('should create a sales order', async () => {
      const input: NetSuiteCreateSalesOrderInput = {
        customerId: '456',
        orderDate: '2024-01-15',
        externalId: 'B2B-001',
        items: [{ itemId: '789', quantity: 10, rate: 100 }],
      };

      restClient.post.mockResolvedValue({ data: mockSalesOrder });

      const result = await service.create(input);

      expect(restClient.post).toHaveBeenCalledWith(
        'salesOrder',
        expect.objectContaining({
          entity: { id: '456' },
          tranDate: '2024-01-15',
          custbody_external_id: 'B2B-001',
        }),
      );
      expect(result).toEqual(mockSalesOrder);
    });

    it('should map line items correctly', async () => {
      const input: NetSuiteCreateSalesOrderInput = {
        customerId: '456',
        items: [
          { itemId: '789', quantity: 10, rate: 100, description: 'Test item' },
          { itemId: '790', quantity: 5 },
        ],
      };

      restClient.post.mockResolvedValue({ data: mockSalesOrder });

      await service.create(input);

      expect(restClient.post).toHaveBeenCalledWith(
        'salesOrder',
        expect.objectContaining({
          item: {
            items: expect.arrayContaining([
              expect.objectContaining({
                lineNumber: 1,
                item: { id: '789' },
                quantity: 10,
                rate: 100,
                description: 'Test item',
              }),
              expect.objectContaining({
                lineNumber: 2,
                item: { id: '790' },
                quantity: 5,
              }),
            ]),
          },
        }),
      );
    });

    it('should include addresses when provided', async () => {
      const input: NetSuiteCreateSalesOrderInput = {
        customerId: '456',
        items: [{ itemId: '789', quantity: 1 }],
        billingAddress: {
          addr1: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US',
        },
        shippingAddress: {
          addr1: '456 Oak Ave',
          city: 'Boston',
          state: 'MA',
          zip: '02101',
          country: 'US',
        },
      };

      restClient.post.mockResolvedValue({ data: mockSalesOrder });

      await service.create(input);

      expect(restClient.post).toHaveBeenCalledWith(
        'salesOrder',
        expect.objectContaining({
          billingAddress: expect.objectContaining({
            addr1: '123 Main St',
            city: 'New York',
          }),
          shippingAddress: expect.objectContaining({
            addr1: '456 Oak Ave',
            city: 'Boston',
          }),
        }),
      );
    });
  });

  describe('getById', () => {
    it('should get sales order by ID', async () => {
      restClient.get.mockResolvedValue({ data: mockSalesOrder });

      const result = await service.getById('123');

      expect(restClient.get).toHaveBeenCalledWith('salesOrder/123', { expandSubResources: 'true' });
      expect(result).toEqual(mockSalesOrder);
    });
  });

  describe('getByExternalId', () => {
    it('should find sales order by external ID', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '123' }],
      });
      restClient.get.mockResolvedValue({ data: mockSalesOrder });

      const result = await service.getByExternalId('B2B-001');

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("custbody_external_id = 'B2B-001'"),
        { limit: 1 },
      );
      expect(result).toEqual(mockSalesOrder);
    });

    it('should return null when not found', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      const result = await service.getByExternalId('NON-EXISTENT');

      expect(result).toBeNull();
    });

    it('should handle query errors gracefully', async () => {
      restClient.executeSuiteQL.mockRejectedValue(new Error('Query failed'));

      const result = await service.getByExternalId('B2B-001');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update sales order', async () => {
      restClient.patch.mockResolvedValue({ data: { ...mockSalesOrder, memo: 'Updated' } });

      const result = await service.update('123', { memo: 'Updated' });

      expect(restClient.patch).toHaveBeenCalledWith(
        'salesOrder/123',
        expect.objectContaining({ memo: 'Updated' }),
      );
      expect(result.memo).toBe('Updated');
    });
  });

  describe('getStatus', () => {
    it('should get sales order status', async () => {
      restClient.get.mockResolvedValue({
        data: {
          id: '123',
          tranId: 'SO001',
          status: { id: 'pendingFulfillment', refName: 'Pending Fulfillment' },
        },
      });

      const result = await service.getStatus('123');

      expect(restClient.get).toHaveBeenCalledWith('salesOrder/123', { fields: 'id,tranId,status' });
      expect(result).toEqual({
        id: '123',
        status: 'Pending Fulfillment',
        statusId: 'pendingFulfillment',
        tranId: 'SO001',
      });
    });
  });

  describe('list', () => {
    it('should list sales orders', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [mockSalesOrder],
        totalResults: 1,
      });

      const result = await service.list();

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("type = 'SalesOrd'"),
        undefined,
      );
      expect(result.items).toHaveLength(1);
    });

    it('should apply status filter', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({ status: NetSuiteSalesOrderStatusId.PENDING_FULFILLMENT });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("status = 'pendingFulfillment'"),
        undefined,
      );
    });

    it('should apply customer filter', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({ customerId: '456' });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('entity = 456'),
        undefined,
      );
    });

    it('should apply date filters', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({ fromDate: '2024-01-01', toDate: '2024-01-31' });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("trandate >= TO_DATE('2024-01-01'"),
        undefined,
      );
      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("trandate <= TO_DATE('2024-01-31'"),
        undefined,
      );
    });

    it('should apply pagination', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list(undefined, { offset: 10, limit: 50 });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(expect.any(String), {
        offset: 10,
        limit: 50,
      });
    });
  });

  describe('getModifiedSince', () => {
    it('should get orders modified since date', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [mockSalesOrder],
        totalResults: 1,
      });

      const result = await service.getModifiedSince('2024-01-01T00:00:00');

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("lastmodifieddate >= TO_DATE('2024-01-01T00:00:00'"),
        undefined,
      );
      expect(result.items).toHaveLength(1);
    });
  });

  describe('close', () => {
    it('should close sales order', async () => {
      restClient.patch.mockResolvedValue({ data: mockSalesOrder });

      await service.close('123');

      expect(restClient.patch).toHaveBeenCalledWith(
        'salesOrder/123',
        expect.objectContaining({ isclosed: true }),
      );
    });
  });
});
