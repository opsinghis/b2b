import { NetSuiteInventoryService } from './netsuite-inventory.service';
import { NetSuiteRestClientService } from './netsuite-rest-client.service';

describe('NetSuiteInventoryService', () => {
  let service: NetSuiteInventoryService;
  let restClient: jest.Mocked<NetSuiteRestClientService>;

  beforeEach(() => {
    restClient = {
      executeSuiteQL: jest.fn(),
    } as unknown as jest.Mocked<NetSuiteRestClientService>;

    service = new NetSuiteInventoryService(restClient);
  });

  describe('checkAvailability', () => {
    it('should check inventory availability for a single item', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [
          {
            itemid: '123',
            locationid: '456',
            quantityonhand: 100,
            quantityavailable: 80,
            quantityonorder: 20,
            quantitycommitted: 15,
            quantitybackordered: 5,
            averagecost: 10.5,
          },
        ],
      });

      const result = await service.checkAvailability({ itemId: '123', locationId: '456' });

      expect(result.item.id).toBe('123');
      expect(result.location?.id).toBe('456');
      expect(result.quantityOnHand).toBe(100);
      expect(result.quantityAvailable).toBe(80);
      expect(result.quantityOnOrder).toBe(20);
      expect(result.quantityCommitted).toBe(15);
      expect(result.quantityBackOrdered).toBe(5);
      expect(result.averageCost).toBe(10.5);
    });

    it('should return zero inventory if item not found', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      const result = await service.checkAvailability({ itemId: '999' });

      expect(result.quantityOnHand).toBe(0);
      expect(result.quantityAvailable).toBe(0);
      expect(result.quantityOnOrder).toBe(0);
    });

    it('should filter by subsidiary when provided', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      await service.checkAvailability({
        itemId: '123',
        subsidiaryId: '1',
      });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('location.subsidiary = 1'),
        { limit: 1 },
      );
    });
  });

  describe('checkMultipleAvailability', () => {
    it('should check inventory for multiple items', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [
          {
            itemid: '123',
            quantityonhand: 100,
            quantityavailable: 80,
            quantityonorder: 20,
            quantitycommitted: 15,
            quantitybackordered: 5,
          },
          {
            itemid: '456',
            quantityonhand: 50,
            quantityavailable: 40,
            quantityonorder: 10,
            quantitycommitted: 5,
            quantitybackordered: 2,
          },
        ],
      });

      const result = await service.checkMultipleAvailability(['123', '456']);

      expect(result.get('123')?.quantityAvailable).toBe(80);
      expect(result.get('456')?.quantityAvailable).toBe(40);
    });

    it('should initialize missing items with zero inventory', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [
          {
            itemid: '123',
            quantityonhand: 100,
            quantityavailable: 80,
            quantityonorder: 0,
            quantitycommitted: 0,
            quantitybackordered: 0,
          },
        ],
      });

      const result = await service.checkMultipleAvailability(['123', '999']);

      expect(result.get('123')?.quantityAvailable).toBe(80);
      expect(result.get('999')?.quantityAvailable).toBe(0);
    });

    it('should filter by location when provided', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      await service.checkMultipleAvailability(['123'], '456');

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('balance.location = 456'),
      );
    });
  });

  describe('getInventoryByLocation', () => {
    it('should get inventory breakdown by location', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [
          {
            itemid: '123',
            locationid: '1',
            locationname: 'Warehouse A',
            quantityonhand: 50,
            quantityavailable: 40,
            quantityonorder: 10,
            quantitycommitted: 5,
            quantitybackordered: 0,
          },
          {
            itemid: '123',
            locationid: '2',
            locationname: 'Warehouse B',
            quantityonhand: 30,
            quantityavailable: 25,
            quantityonorder: 5,
            quantitycommitted: 0,
            quantitybackordered: 0,
          },
        ],
      });

      const result = await service.getInventoryByLocation('123');

      expect(result).toHaveLength(2);
      expect(result[0].locationName).toBe('Warehouse A');
      expect(result[0].quantityAvailable).toBe(40);
      expect(result[1].locationName).toBe('Warehouse B');
      expect(result[1].quantityAvailable).toBe(25);
    });

    it('should return empty array if no inventory', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      const result = await service.getInventoryByLocation('999');

      expect(result).toEqual([]);
    });
  });

  describe('getLowStockItems', () => {
    it('should get items below reorder point', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ itemid: '123', quantityavailable: 5, reorderpoint: 10 }],
        totalResults: 1,
      });

      const result = await service.getLowStockItems();

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('item.reorderpoint IS NOT NULL'),
        undefined,
      );
      expect(result.items).toBeDefined();
    });

    it('should filter by location when provided', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.getLowStockItems('456');

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('location.id = 456'),
        undefined,
      );
    });
  });

  describe('getOutOfStockItems', () => {
    it('should get items with zero or negative availability', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ itemid: '123', quantityavailable: 0 }],
        totalResults: 1,
      });

      const result = await service.getOutOfStockItems();

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('HAVING SUM(balance.quantityavailable) <= 0'),
        undefined,
      );
      expect(result.items).toBeDefined();
    });

    it('should filter by location when provided', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.getOutOfStockItems('456');

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('location.id = 456'),
        undefined,
      );
    });
  });

  describe('getInventoryValuation', () => {
    it('should calculate total inventory value', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ totalitems: 100, totalquantity: 5000, totalvalue: 50000 }],
      });

      const result = await service.getInventoryValuation();

      expect(result.totalItems).toBe(100);
      expect(result.totalQuantity).toBe(5000);
      expect(result.totalValue).toBe(50000);
    });

    it('should return zeros if no inventory', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      const result = await service.getInventoryValuation();

      expect(result.totalItems).toBe(0);
      expect(result.totalQuantity).toBe(0);
      expect(result.totalValue).toBe(0);
    });

    it('should filter by location and subsidiary', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      await service.getInventoryValuation('456', '1');

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('balance.location = 456'),
        { limit: 1 },
      );
      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('balance.subsidiary = 1'),
        { limit: 1 },
      );
    });
  });

  describe('getInventoryTransactions', () => {
    it('should get inventory transactions for an item', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [
          {
            transactionid: 'TXN001',
            transactiontype: 'ItemRcpt',
            date: '2024-01-15',
            quantity: 100,
            locationid: '456',
          },
        ],
        totalResults: 1,
      });

      const result = await service.getInventoryTransactions('123');

      expect(result.items).toBeDefined();
      expect(result.items![0].transactionId).toBe('TXN001');
      expect(result.items![0].transactionType).toBe('ItemRcpt');
    });

    it('should filter by date range', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.getInventoryTransactions('123', {
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("TO_DATE('2024-01-01'"),
        undefined,
      );
      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("TO_DATE('2024-01-31'"),
        undefined,
      );
    });

    it('should filter by location', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.getInventoryTransactions('123', { locationId: '456' });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('line.location = 456'),
        undefined,
      );
    });
  });
});
