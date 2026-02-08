import { Test, TestingModule } from '@nestjs/testing';
import { DynamicsAccountService } from './dynamics-account.service';
import { DynamicsWebApiClientService } from './dynamics-webapi-client.service';
import {
  DynamicsConnectionConfig,
  DynamicsCredentials,
  DynamicsAccount,
  DynamicsContact,
  DynamicsEntityState,
} from '../interfaces';

describe('DynamicsAccountService', () => {
  let service: DynamicsAccountService;
  let webApiClient: jest.Mocked<DynamicsWebApiClientService>;

  const mockConfig: DynamicsConnectionConfig = {
    organizationUrl: 'https://org.crm.dynamics.com',
    tenantId: 'tenant-123',
    authType: 'client_credentials',
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamicsAccountService,
        { provide: DynamicsWebApiClientService, useValue: mockWebApiClient },
      ],
    }).compile();

    service = module.get<DynamicsAccountService>(DynamicsAccountService);
    webApiClient = module.get(DynamicsWebApiClientService);
  });

  describe('getById', () => {
    it('should get account by ID', async () => {
      const mockAccount: DynamicsAccount = {
        accountid: 'acc-123',
        name: 'Acme Corp',
        accountnumber: 'ACM001',
        emailaddress1: 'info@acme.com',
        statecode: DynamicsEntityState.ACTIVE,
      };

      webApiClient.getByKey.mockResolvedValue({
        success: true,
        data: mockAccount,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getById(mockConfig, mockCredentials, 'acc-123');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Acme Corp');
    });

    it('should include contacts when requested', async () => {
      webApiClient.getByKey.mockResolvedValue({
        success: true,
        data: { accountid: 'acc-123', contact_customer_accounts: [] },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getById(mockConfig, mockCredentials, 'acc-123', {
        includeContacts: true,
      });

      expect(webApiClient.getByKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $expand: expect.arrayContaining([expect.stringContaining('contact_customer_accounts')]),
        }),
      );
    });

    it('should include primary contact when requested', async () => {
      webApiClient.getByKey.mockResolvedValue({
        success: true,
        data: { accountid: 'acc-123', primarycontactid: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getById(mockConfig, mockCredentials, 'acc-123', {
        includePrimaryContact: true,
      });

      expect(webApiClient.getByKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $expand: expect.arrayContaining([expect.stringContaining('primarycontactid')]),
        }),
      );
    });
  });

  describe('list', () => {
    it('should list accounts', async () => {
      const mockAccounts: DynamicsAccount[] = [
        { accountid: 'acc-1', name: 'Account 1' },
        { accountid: 'acc-2', name: 'Account 2' },
      ];

      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: mockAccounts,
          metadata: { '@odata.count': 2 },
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.list(mockConfig, mockCredentials, { top: 10 });

      expect(result.success).toBe(true);
      expect(result.data?.value).toHaveLength(2);
    });

    it('should filter by search term', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, {
        searchTerm: 'Acme',
      });

      expect(webApiClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("contains(name,'Acme')"),
        }),
      );
    });

    it('should filter by state', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, {
        stateCode: DynamicsEntityState.ACTIVE,
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

    it('should filter by parent account', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, {
        parentAccountId: 'parent-acc-123',
      });

      expect(webApiClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining('_parentaccountid_value eq parent-acc-123'),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create account', async () => {
      webApiClient.post.mockResolvedValue({
        success: true,
        data: { accountid: 'new-acc', name: 'New Account' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.create(mockConfig, mockCredentials, {
        name: 'New Account',
        accountNumber: 'NEW001',
        email: 'new@account.com',
        telephone: '555-1234',
      });

      expect(result.success).toBe(true);
      expect(webApiClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        'accounts',
        expect.objectContaining({
          name: 'New Account',
          accountnumber: 'NEW001',
        }),
      );
    });

    it('should create account with address', async () => {
      webApiClient.post.mockResolvedValue({
        success: true,
        data: { accountid: 'new-acc' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.create(mockConfig, mockCredentials, {
        name: 'New Account',
        address: {
          line1: '123 Main St',
          city: 'City',
          stateOrProvince: 'ST',
          postalCode: '12345',
          country: 'US',
        },
      });

      expect(webApiClient.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          address1_line1: '123 Main St',
          address1_city: 'City',
        }),
      );
    });

    it('should set parent account binding', async () => {
      webApiClient.post.mockResolvedValue({
        success: true,
        data: { accountid: 'new-acc' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.create(mockConfig, mockCredentials, {
        name: 'Child Account',
        parentAccountId: 'parent-123',
      });

      expect(webApiClient.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          'parentaccountid@odata.bind': '/accounts(parent-123)',
        }),
      );
    });
  });

  describe('update', () => {
    it('should update account', async () => {
      webApiClient.patch.mockResolvedValue({
        success: true,
        data: { accountid: 'acc-123', name: 'Updated Account' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.update(mockConfig, mockCredentials, 'acc-123', {
        name: 'Updated Account',
      });

      expect(result.success).toBe(true);
      expect(webApiClient.patch).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        'accounts',
        'acc-123',
        expect.objectContaining({ name: 'Updated Account' }),
        undefined,
      );
    });

    it('should pass etag for optimistic concurrency', async () => {
      webApiClient.patch.mockResolvedValue({
        success: true,
        data: { accountid: 'acc-123' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.update(mockConfig, mockCredentials, 'acc-123', { name: 'Test' }, 'W/"etag123"');

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

  describe('getContactById', () => {
    it('should get contact by ID', async () => {
      const mockContact: DynamicsContact = {
        contactid: 'cont-123',
        firstname: 'John',
        lastname: 'Doe',
        fullname: 'John Doe',
        emailaddress1: 'john@example.com',
        statecode: DynamicsEntityState.ACTIVE,
      };

      webApiClient.getByKey.mockResolvedValue({
        success: true,
        data: mockContact,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getContactById(mockConfig, mockCredentials, 'cont-123');

      expect(result.success).toBe(true);
      expect(result.data?.fullname).toBe('John Doe');
    });
  });

  describe('listContacts', () => {
    it('should list contacts', async () => {
      const mockContacts: DynamicsContact[] = [
        { contactid: 'cont-1', fullname: 'Contact 1' },
        { contactid: 'cont-2', fullname: 'Contact 2' },
      ];

      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: mockContacts,
          metadata: { '@odata.count': 2 },
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.listContacts(mockConfig, mockCredentials, { top: 10 });

      expect(result.success).toBe(true);
      expect(result.data?.value).toHaveLength(2);
    });

    it('should filter by account ID', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.listContacts(mockConfig, mockCredentials, {
        accountId: 'acc-123',
      });

      expect(webApiClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining('_parentcustomerid_value eq acc-123'),
        }),
      );
    });

    it('should filter by search term', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.listContacts(mockConfig, mockCredentials, {
        searchTerm: 'John',
      });

      expect(webApiClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("contains(fullname,'John')"),
        }),
      );
    });
  });

  describe('createContact', () => {
    it('should create contact', async () => {
      webApiClient.post.mockResolvedValue({
        success: true,
        data: { contactid: 'new-cont', fullname: 'Jane Doe' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.createContact(mockConfig, mockCredentials, {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        telephone: '555-1234',
      });

      expect(result.success).toBe(true);
      expect(webApiClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        'contacts',
        expect.objectContaining({
          firstname: 'Jane',
          lastname: 'Doe',
          emailaddress1: 'jane@example.com',
          telephone1: '555-1234',
        }),
      );
    });

    it('should bind to parent account', async () => {
      webApiClient.post.mockResolvedValue({
        success: true,
        data: { contactid: 'new-cont' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.createContact(mockConfig, mockCredentials, {
        firstName: 'Jane',
        lastName: 'Doe',
        accountId: 'acc-123',
      });

      expect(webApiClient.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          'parentcustomerid_account@odata.bind': '/accounts(acc-123)',
        }),
      );
    });
  });

  describe('updateContact', () => {
    it('should update contact', async () => {
      webApiClient.patch.mockResolvedValue({
        success: true,
        data: { contactid: 'cont-123', firstname: 'John' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.updateContact(mockConfig, mockCredentials, 'cont-123', {
        firstName: 'John',
        jobTitle: 'Manager',
      });

      expect(result.success).toBe(true);
      expect(webApiClient.patch).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'contacts',
        'cont-123',
        expect.objectContaining({
          firstname: 'John',
          jobtitle: 'Manager',
        }),
        undefined,
      );
    });
  });
});
