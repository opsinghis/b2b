import { NetSuiteCustomerService } from './netsuite-customer.service';
import { NetSuiteRestClientService } from './netsuite-rest-client.service';
import { NetSuiteCustomer, NetSuiteCreateCustomerInput } from '../interfaces';

describe('NetSuiteCustomerService', () => {
  let service: NetSuiteCustomerService;
  let restClient: jest.Mocked<NetSuiteRestClientService>;

  const mockCustomer: NetSuiteCustomer = {
    id: '456',
    entityId: 'CUST001',
    companyName: 'Test Company',
    email: 'test@example.com',
    phone: '555-0100',
    isPerson: false,
    balance: 1000,
    creditLimit: 5000,
    isInactive: false,
  };

  beforeEach(() => {
    restClient = {
      post: jest.fn(),
      get: jest.fn(),
      patch: jest.fn(),
      executeSuiteQL: jest.fn(),
    } as unknown as jest.Mocked<NetSuiteRestClientService>;

    service = new NetSuiteCustomerService(restClient);
  });

  describe('create', () => {
    it('should create a company customer', async () => {
      const input: NetSuiteCreateCustomerInput = {
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '555-0100',
        isPerson: false,
        externalId: 'B2B-CUST-001',
      };

      restClient.post.mockResolvedValue({ data: mockCustomer });

      const result = await service.create(input);

      expect(restClient.post).toHaveBeenCalledWith(
        'customer',
        expect.objectContaining({
          companyName: 'Test Company',
          email: 'test@example.com',
          isPerson: false,
          custentity_external_id: 'B2B-CUST-001',
        }),
      );
      expect(result).toEqual(mockCustomer);
    });

    it('should create an individual customer', async () => {
      const input: NetSuiteCreateCustomerInput = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        isPerson: true,
      };

      restClient.post.mockResolvedValue({
        data: { ...mockCustomer, firstName: 'John', lastName: 'Doe', isPerson: true },
      });

      await service.create(input);

      expect(restClient.post).toHaveBeenCalledWith(
        'customer',
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          isPerson: true,
        }),
      );
    });

    it('should include addresses when provided', async () => {
      const input: NetSuiteCreateCustomerInput = {
        companyName: 'Test Company',
        addresses: [
          {
            label: 'Headquarters',
            defaultBilling: true,
            defaultShipping: true,
            addr1: '123 Main St',
            city: 'New York',
            state: 'NY',
            zip: '10001',
            country: 'US',
          },
        ],
      };

      restClient.post.mockResolvedValue({ data: mockCustomer });

      await service.create(input);

      expect(restClient.post).toHaveBeenCalledWith(
        'customer',
        expect.objectContaining({
          addressbook: {
            items: expect.arrayContaining([
              expect.objectContaining({
                label: 'Headquarters',
                defaultBilling: true,
                addressBookAddress: expect.objectContaining({
                  addr1: '123 Main St',
                  city: 'New York',
                }),
              }),
            ]),
          },
        }),
      );
    });
  });

  describe('getById', () => {
    it('should get customer by ID', async () => {
      restClient.get.mockResolvedValue({ data: mockCustomer });

      const result = await service.getById('456');

      expect(restClient.get).toHaveBeenCalledWith('customer/456', { expandSubResources: 'true' });
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('getByExternalId', () => {
    it('should find customer by external ID', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '456' }],
      });
      restClient.get.mockResolvedValue({ data: mockCustomer });

      const result = await service.getByExternalId('B2B-CUST-001');

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("custentity_external_id = 'B2B-CUST-001'"),
        { limit: 1 },
      );
      expect(result).toEqual(mockCustomer);
    });

    it('should return null when not found', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      const result = await service.getByExternalId('NON-EXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('getByEmail', () => {
    it('should find customer by email', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '456' }],
      });
      restClient.get.mockResolvedValue({ data: mockCustomer });

      const result = await service.getByEmail('test@example.com');

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("LOWER(email) = LOWER('test@example.com')"),
        { limit: 1 },
      );
      expect(result).toEqual(mockCustomer);
    });

    it('should return null when not found', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      const result = await service.getByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update customer', async () => {
      restClient.patch.mockResolvedValue({
        data: { ...mockCustomer, companyName: 'Updated Company' },
      });

      const result = await service.update('456', { companyName: 'Updated Company' });

      expect(restClient.patch).toHaveBeenCalledWith(
        'customer/456',
        expect.objectContaining({ companyName: 'Updated Company' }),
      );
      expect(result.companyName).toBe('Updated Company');
    });
  });

  describe('list', () => {
    it('should list customers', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [mockCustomer],
        totalResults: 1,
      });

      const result = await service.list();

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('FROM customer'),
        undefined,
      );
      expect(result.items).toHaveLength(1);
    });

    it('should filter by subsidiary', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({ subsidiary: '1' });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('subsidiary = 1'),
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

    it('should filter inactive by default', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list();

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("isinactive = 'F'"),
        undefined,
      );
    });

    it('should search by term', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({ searchTerm: 'Test' });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("LOWER(companyname) LIKE LOWER('%Test%')"),
        undefined,
      );
    });
  });

  describe('getBalanceInfo', () => {
    it('should get customer balance info', async () => {
      restClient.get.mockResolvedValue({
        data: {
          id: '456',
          balance: 1000,
          overdueBalance: 500,
          creditLimit: 5000,
          unbilledOrders: 200,
        },
      });

      const result = await service.getBalanceInfo('456');

      expect(result).toEqual({
        id: '456',
        balance: 1000,
        overdueBalance: 500,
        creditLimit: 5000,
        unbilledOrders: 200,
        availableCredit: 4000,
      });
    });

    it('should calculate available credit correctly', async () => {
      restClient.get.mockResolvedValue({
        data: {
          id: '456',
          balance: 6000,
          overdueBalance: 0,
          creditLimit: 5000,
          unbilledOrders: 0,
        },
      });

      const result = await service.getBalanceInfo('456');

      expect(result.availableCredit).toBe(0); // Cannot go negative
    });
  });

  describe('getModifiedSince', () => {
    it('should get customers modified since date', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [mockCustomer],
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
    it('should search customers by term', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [mockCustomer],
        totalResults: 1,
      });

      const result = await service.search('Test');

      expect(result.items).toHaveLength(1);
    });
  });
});
