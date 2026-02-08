import { NetSuiteItemService, NetSuiteItemType } from './netsuite-item.service';
import { NetSuiteRestClientService } from './netsuite-rest-client.service';

describe('NetSuiteItemService', () => {
  let service: NetSuiteItemService;
  let restClient: jest.Mocked<NetSuiteRestClientService>;

  const mockItem = {
    id: '123',
    itemId: 'SKU001',
    displayName: 'Test Product',
    description: 'Test product description',
    type: 'InvtPart',
    basePrice: 99.99,
    cost: 50.0,
    isInactive: false,
  };

  beforeEach(() => {
    restClient = {
      get: jest.fn(),
      executeSuiteQL: jest.fn(),
    } as unknown as jest.Mocked<NetSuiteRestClientService>;

    service = new NetSuiteItemService(restClient);
  });

  describe('getById', () => {
    it('should get item by ID', async () => {
      restClient.get.mockResolvedValue({ data: mockItem });

      const result = await service.getById('123');

      expect(restClient.get).toHaveBeenCalledWith('inventoryItem/123', {
        expandSubResources: 'true',
      });
      expect(result).toEqual(mockItem);
    });

    it('should use correct endpoint for different item types', async () => {
      restClient.get.mockResolvedValue({ data: mockItem });

      await service.getById('123', NetSuiteItemType.SERVICE);

      expect(restClient.get).toHaveBeenCalledWith('serviceItem/123', {
        expandSubResources: 'true',
      });
    });

    it('should handle non-inventory items', async () => {
      restClient.get.mockResolvedValue({ data: mockItem });

      await service.getById('123', NetSuiteItemType.NON_INVENTORY);

      expect(restClient.get).toHaveBeenCalledWith('nonInventoryItem/123', {
        expandSubResources: 'true',
      });
    });
  });

  describe('getByExternalId', () => {
    it('should find item by external ID', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '123' }],
      });
      restClient.get.mockResolvedValue({ data: mockItem });

      const result = await service.getByExternalId('EXT-SKU-001');

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("custitem_external_id = 'EXT-SKU-001'"),
        { limit: 1 },
      );
      expect(result).toEqual(mockItem);
    });

    it('should return null when not found', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      const result = await service.getByExternalId('NON-EXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('getBySku', () => {
    it('should find item by SKU', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '123' }],
      });
      restClient.get.mockResolvedValue({ data: mockItem });

      const result = await service.getBySku('SKU001');

      expect(restClient.executeSuiteQL).toHaveBeenCalled();
      expect(result).toEqual(mockItem);
    });

    it('should return null when not found', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      const result = await service.getBySku('NON-EXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should list items', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [mockItem],
        totalResults: 1,
      });

      const result = await service.list();

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('FROM item'),
        undefined,
      );
      expect(result.items).toHaveLength(1);
    });

    it('should filter by item type', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({ itemType: NetSuiteItemType.INVENTORY });

      expect(restClient.executeSuiteQL).toHaveBeenCalled();
    });

    it('should filter by search term', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({ searchTerm: 'Test' });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("LOWER(displayname) LIKE LOWER('%Test%')"),
        undefined,
      );
    });

    it('should include inactive when specified', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({ includeInactive: true });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.not.stringContaining("isinactive = 'F'"),
        undefined,
      );
    });

    it('should exclude inactive by default', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list();

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("isinactive = 'F'"),
        undefined,
      );
    });

    it('should filter by isTaxable', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({ isTaxable: true });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("istaxable = 'T'"),
        undefined,
      );
    });

    it('should filter by isOnline', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({ isOnline: true });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("isonline = 'T'"),
        undefined,
      );
    });

    it('should filter by external ID prefix', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({ externalIdPrefix: 'B2B-' });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("custitem_external_id LIKE 'B2B-%'"),
        undefined,
      );
    });
  });

  describe('getModifiedSince', () => {
    it('should get items modified since date', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [mockItem],
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

  describe('search', () => {
    it('should search items by term', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [mockItem],
        totalResults: 1,
      });

      const result = await service.search('Test');

      expect(result.items).toHaveLength(1);
    });
  });

  describe('getSaleableItems', () => {
    it('should get saleable items', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [mockItem],
        totalResults: 1,
      });

      const result = await service.getSaleableItems();

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("isonline = 'T'"),
        undefined,
      );
      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("isinactive = 'F'"),
        undefined,
      );
      expect(result.items).toHaveLength(1);
    });
  });

  describe('getPricing', () => {
    it('should get pricing for an item', async () => {
      restClient.get.mockResolvedValue({
        data: {
          id: '123',
          itemId: 'SKU001',
          basePrice: 99.99,
          pricing: [
            { priceLevel: '1', unitPrice: 99.99 },
            { priceLevel: '2', unitPrice: 79.99 },
          ],
        },
      });

      const result = await service.getPricing('123');

      expect(restClient.get).toHaveBeenCalledWith(
        'inventoryItem/123',
        expect.objectContaining({ expandSubResources: 'true' }),
      );
      expect(result.id).toBe('123');
    });
  });

  describe('getByUpc', () => {
    it('should find item by UPC', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '123' }],
      });
      restClient.get.mockResolvedValue({ data: mockItem });

      const result = await service.getByUpc('012345678901');

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("upccode = '012345678901'"),
        { limit: 1 },
      );
      expect(result).toEqual(mockItem);
    });

    it('should return null when not found', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      const result = await service.getByUpc('NON-EXISTENT');

      expect(result).toBeNull();
    });
  });
});
