import { NetSuiteSavedSearchService } from './netsuite-saved-search.service';
import { NetSuiteRestClientService } from './netsuite-rest-client.service';

describe('NetSuiteSavedSearchService', () => {
  let service: NetSuiteSavedSearchService;
  let restClient: jest.Mocked<NetSuiteRestClientService>;

  beforeEach(() => {
    restClient = {
      get: jest.fn(),
      post: jest.fn(),
      executeSuiteQL: jest.fn(),
    } as unknown as jest.Mocked<NetSuiteRestClientService>;

    service = new NetSuiteSavedSearchService(restClient);
  });

  describe('executeSavedSearch', () => {
    it('should execute a saved search by ID', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '1', name: 'Item 1' }],
        totalResults: 1,
      });

      const result = await service.executeSavedSearch('customsearch123');

      expect(restClient.executeSuiteQL).toHaveBeenCalled();
      expect(result.results).toBeDefined();
    });

    it('should apply pagination options', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.executeSavedSearch('customsearch123', {
        offset: 10,
        limit: 50,
      });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(expect.any(String), {
        offset: 10,
        limit: 50,
      });
    });
  });

  describe('search', () => {
    it('should execute a dynamic search with columns', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '1', companyname: 'Test Company' }],
        totalResults: 1,
      });

      const result = await service.search({
        recordType: 'customer',
        filters: [{ field: 'isinactive', operator: 'is', value: 'F' }],
        columns: ['id', 'companyname', 'email'],
      });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('FROM customer'),
        expect.any(Object),
      );
      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('id, companyname, email'),
        expect.any(Object),
      );
      expect(result.results).toBeDefined();
    });

    it('should use saved search when searchId provided', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '1' }],
        totalResults: 1,
      });

      const result = await service.search({
        searchId: 'customsearch123',
      });

      expect(result.results).toBeDefined();
    });

    it('should throw error when no searchId or recordType', async () => {
      await expect(service.search({})).rejects.toThrow(
        'Either searchId or recordType must be provided',
      );
    });

    it('should select all columns when none specified', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.search({
        recordType: 'customer',
      });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('SELECT *'),
        expect.any(Object),
      );
    });
  });

  describe('listSavedSearches', () => {
    it('should list saved searches', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '1', title: 'My Search', recordtype: 'customer' }],
        totalResults: 1,
      });

      const result = await service.listSavedSearches();

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('FROM savedsearch'),
        undefined,
      );
      expect(result.items).toBeDefined();
    });

    it('should filter by record type', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.listSavedSearches('salesorder');

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("recordtype = 'salesorder'"),
        undefined,
      );
    });
  });

  describe('getSavedSearch', () => {
    it('should get saved search details', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [
          {
            id: '123',
            title: 'My Search',
            recordtype: 'customer',
          },
        ],
      });

      const result = await service.getSavedSearch('123');

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(expect.stringContaining('id = 123'), {
        limit: 1,
      });
      expect(result).toBeDefined();
    });

    it('should return null when not found', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      const result = await service.getSavedSearch('999');

      expect(result).toBeNull();
    });
  });

  describe('searchCustomers', () => {
    it('should search customers by term', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '1', companyname: 'Test Company' }],
        totalResults: 1,
      });

      const result = await service.searchCustomers({ searchTerm: 'Test' });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('FROM customer'),
        undefined,
      );
      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("LOWER(companyname) LIKE LOWER('%Test%')"),
        undefined,
      );
      expect(result.results).toBeDefined();
    });

    it('should filter by subsidiary', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.searchCustomers({ subsidiary: '1' });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('subsidiary = 1'),
        undefined,
      );
    });

    it('should filter by hasBalance', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.searchCustomers({ hasBalance: true });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('balance > 0'),
        undefined,
      );
    });
  });

  describe('searchItems', () => {
    it('should search items by term', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '1', displayname: 'Test Item' }],
        totalResults: 1,
      });

      const result = await service.searchItems({ searchTerm: 'Test' });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('FROM item'),
        undefined,
      );
      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("LOWER(displayname) LIKE LOWER('%Test%')"),
        undefined,
      );
      expect(result.results).toBeDefined();
    });

    it('should filter by item type', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.searchItems({ itemType: 'InvtPart' });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("itemtype = 'InvtPart'"),
        undefined,
      );
    });
  });

  describe('searchTransactions', () => {
    it('should search transactions by type', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '1', tranid: 'SO001' }],
        totalResults: 1,
      });

      const result = await service.searchTransactions('salesorder', {
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
      });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('FROM transaction'),
        undefined,
      );
      expect(result.results).toBeDefined();
    });

    it('should filter by customer', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.searchTransactions(undefined, {
        customerId: '456',
      });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('entity = 456'),
        undefined,
      );
    });

    it('should filter by status', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.searchTransactions('salesorder', {
        status: 'A',
      });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("status = 'A'"),
        undefined,
      );
    });
  });
});
