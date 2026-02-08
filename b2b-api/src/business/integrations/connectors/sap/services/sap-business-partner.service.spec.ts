import { Test, TestingModule } from '@nestjs/testing';
import {
  SapBusinessPartnerService,
  SapBusinessPartnerCategory,
} from './sap-business-partner.service';
import { SapODataClientService } from './sap-odata-client.service';
import {
  SapConnectionConfig,
  SapCredentials,
  SapBusinessPartner,
  SapCustomer,
} from '../interfaces';

describe('SapBusinessPartnerService', () => {
  let service: SapBusinessPartnerService;
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
        SapBusinessPartnerService,
        { provide: SapODataClientService, useValue: mockODataClient },
      ],
    }).compile();

    service = module.get<SapBusinessPartnerService>(SapBusinessPartnerService);
    odataClient = module.get(SapODataClientService);
  });

  describe('getById', () => {
    it('should get business partner by ID', async () => {
      const mockBp: SapBusinessPartner = {
        BusinessPartner: 'BP001',
        BusinessPartnerCategory: '2',
        FirstName: 'John',
        LastName: 'Doe',
      };

      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: mockBp,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getById(mockConfig, mockCredentials, 'BP001');

      expect(result.success).toBe(true);
      expect(result.data?.BusinessPartner).toBe('BP001');
    });

    it('should include addresses when requested', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: { BusinessPartner: 'BP001', to_BusinessPartnerAddress: [] },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getById(mockConfig, mockCredentials, 'BP001', { includeAddresses: true });

      expect(odataClient.getByKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $expand: expect.arrayContaining(['to_BusinessPartnerAddress']),
        }),
      );
    });

    it('should include customer data when requested', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: { BusinessPartner: 'BP001', to_Customer: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getById(mockConfig, mockCredentials, 'BP001', { includeCustomer: true });

      expect(odataClient.getByKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $expand: expect.arrayContaining(['to_Customer']),
        }),
      );
    });
  });

  describe('list', () => {
    it('should list business partners', async () => {
      const mockBps: SapBusinessPartner[] = [
        { BusinessPartner: 'BP001' },
        { BusinessPartner: 'BP002' },
      ];

      odataClient.get.mockResolvedValue({
        success: true,
        data: {
          value: mockBps,
          metadata: { '@odata.count': 2 },
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.list(mockConfig, mockCredentials, { top: 10 });

      expect(result.success).toBe(true);
      expect((result.data?.value as SapBusinessPartner[]).length).toBe(2);
    });

    it('should filter by category', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, {
        category: SapBusinessPartnerCategory.ORGANIZATION,
      });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("BusinessPartnerCategory eq '2'"),
        }),
      );
    });

    it('should filter by search term', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, { searchTerm: 'Acme' });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("contains(BusinessPartnerFullName,'Acme')"),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create business partner', async () => {
      odataClient.post.mockResolvedValue({
        success: true,
        data: { BusinessPartner: 'NEW001', BusinessPartnerCategory: '2' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.create(mockConfig, mockCredentials, {
        businessPartnerCategory: SapBusinessPartnerCategory.ORGANIZATION,
        organizationName1: 'Acme Corp',
      });

      expect(result.success).toBe(true);
      expect(result.data?.BusinessPartner).toBe('NEW001');
      expect(odataClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        'A_BusinessPartner',
        expect.objectContaining({
          BusinessPartnerCategory: '2',
          OrganizationBPName1: 'Acme Corp',
        }),
      );
    });

    it('should create person with names', async () => {
      odataClient.post.mockResolvedValue({
        success: true,
        data: { BusinessPartner: 'PERS001', BusinessPartnerCategory: '1' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.create(mockConfig, mockCredentials, {
        businessPartnerCategory: SapBusinessPartnerCategory.PERSON,
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.success).toBe(true);
      expect(odataClient.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          FirstName: 'John',
          LastName: 'Doe',
        }),
      );
    });
  });

  describe('getCustomerById', () => {
    it('should get customer by ID', async () => {
      const mockCustomer: SapCustomer = {
        Customer: 'CUST001',
        CustomerName: 'Acme Corp',
        CustomerAccountGroup: '0001',
      };

      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: mockCustomer,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getCustomerById(mockConfig, mockCredentials, 'CUST001');

      expect(result.success).toBe(true);
      expect(result.data?.Customer).toBe('CUST001');
    });

    it('should include sales areas when requested', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: { Customer: 'CUST001', to_CustomerSalesArea: [] },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getCustomerById(mockConfig, mockCredentials, 'CUST001', {
        includeSalesAreas: true,
      });

      expect(odataClient.getByKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $expand: expect.arrayContaining(['to_CustomerSalesArea']),
        }),
      );
    });
  });

  describe('listCustomers', () => {
    it('should list customers', async () => {
      const mockCustomers: SapCustomer[] = [
        { Customer: 'CUST001', CustomerName: 'Acme' },
        { Customer: 'CUST002', CustomerName: 'Beta' },
      ];

      odataClient.get.mockResolvedValue({
        success: true,
        data: {
          value: mockCustomers,
          metadata: { '@odata.count': 2 },
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.listCustomers(mockConfig, mockCredentials, { top: 10 });

      expect(result.success).toBe(true);
      expect((result.data?.value as SapCustomer[]).length).toBe(2);
    });

    it('should filter by search term', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.listCustomers(mockConfig, mockCredentials, {
        searchTerm: 'Acme',
      });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining('Acme'),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update business partner', async () => {
      odataClient.patch.mockResolvedValue({
        success: true,
        data: { BusinessPartner: 'BP001' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.update(mockConfig, mockCredentials, 'BP001', {
        organizationName1: 'New Name',
      });

      expect(result.success).toBe(true);
      expect(odataClient.patch).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        'A_BusinessPartner',
        'BP001',
        expect.objectContaining({ OrganizationBPName1: 'New Name' }),
        undefined,
      );
    });

    it('should pass etag for optimistic locking', async () => {
      odataClient.patch.mockResolvedValue({
        success: true,
        data: { BusinessPartner: 'BP001' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.update(
        mockConfig,
        mockCredentials,
        'BP001',
        { organizationName1: 'New Name' },
        'W/"etag123"',
      );

      expect(odataClient.patch).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'W/"etag123"',
      );
    });
  });
});
