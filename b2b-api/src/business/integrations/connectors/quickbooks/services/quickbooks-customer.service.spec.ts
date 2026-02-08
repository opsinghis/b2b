import { Test, TestingModule } from '@nestjs/testing';
import { QuickBooksCustomerService } from './quickbooks-customer.service';
import { QuickBooksRestClientService } from './quickbooks-rest-client.service';
import { QuickBooksErrorHandlerService } from './quickbooks-error-handler.service';
import {
  QuickBooksConnectionConfig,
  QuickBooksCredentials,
  QuickBooksCustomer,
} from '../interfaces';

describe('QuickBooksCustomerService', () => {
  let service: QuickBooksCustomerService;
  let restClient: jest.Mocked<QuickBooksRestClientService>;
  let errorHandler: jest.Mocked<QuickBooksErrorHandlerService>;

  const mockConfig: QuickBooksConnectionConfig = {
    realmId: '123456789',
    environment: 'sandbox',
    minorVersion: 65,
    timeout: 30000,
  };

  const mockCredentials: QuickBooksCredentials = {
    oauth2: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
    },
  };

  const mockMetadata = {
    requestId: 'test-123',
    durationMs: 100,
  };

  const mockCustomer: QuickBooksCustomer = {
    Id: '123',
    SyncToken: '0',
    DisplayName: 'Test Customer',
    CompanyName: 'Test Company',
    GivenName: 'John',
    FamilyName: 'Doe',
    PrimaryEmailAddr: { Address: 'john@test.com' },
    PrimaryPhone: { FreeFormNumber: '123-456-7890' },
    Active: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuickBooksCustomerService,
        {
          provide: QuickBooksRestClientService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: QuickBooksErrorHandlerService,
          useValue: {
            createErrorResult: jest.fn().mockReturnValue({
              success: false,
              error: { code: 'ERROR', message: 'Test error', retryable: false },
              metadata: mockMetadata,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<QuickBooksCustomerService>(QuickBooksCustomerService);
    restClient = module.get(
      QuickBooksRestClientService,
    ) as jest.Mocked<QuickBooksRestClientService>;
    errorHandler = module.get(
      QuickBooksErrorHandlerService,
    ) as jest.Mocked<QuickBooksErrorHandlerService>;
  });

  describe('create', () => {
    it('should create customer successfully', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { Customer: mockCustomer },
        metadata: mockMetadata,
      });

      const result = await service.create(mockConfig, mockCredentials, {
        displayName: 'Test Customer',
        email: 'john@test.com',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomer);
      expect(restClient.post).toHaveBeenCalled();
    });

    it('should handle create error', async () => {
      restClient.post.mockResolvedValue({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid data', retryable: false },
        metadata: mockMetadata,
      });

      const result = await service.create(mockConfig, mockCredentials, {
        displayName: '',
      });

      expect(result.success).toBe(false);
    });

    it('should build payload with all fields', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { Customer: mockCustomer },
        metadata: mockMetadata,
      });

      await service.create(mockConfig, mockCredentials, {
        displayName: 'Test Customer',
        companyName: 'Test Company',
        firstName: 'John',
        lastName: 'Doe',
        title: 'Mr.',
        email: 'john@test.com',
        phone: '123-456-7890',
        mobile: '098-765-4321',
        website: 'https://test.com',
        notes: 'Test notes',
        billingAddress: {
          line1: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          postalCode: '12345',
          country: 'USA',
        },
        shippingAddress: {
          line1: '456 Other St',
          city: 'Elsewhere',
          state: 'NY',
          postalCode: '67890',
        },
        taxable: true,
        paymentTermsId: '1',
        currency: 'USD',
      });

      expect(restClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        expect.objectContaining({
          DisplayName: 'Test Customer',
          CompanyName: 'Test Company',
          GivenName: 'John',
          FamilyName: 'Doe',
          Title: 'Mr.',
        }),
      );
    });

    it('should handle exception during create', async () => {
      restClient.post.mockRejectedValue(new Error('Network error'));

      const result = await service.create(mockConfig, mockCredentials, {
        displayName: 'Test',
      });

      expect(result.success).toBe(false);
      expect(errorHandler.createErrorResult).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should get customer by ID successfully', async () => {
      restClient.get.mockResolvedValue({
        success: true,
        data: { Customer: mockCustomer },
        metadata: mockMetadata,
      });

      const result = await service.getById(mockConfig, mockCredentials, '123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomer);
    });

    it('should handle get by ID error', async () => {
      restClient.get.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Customer not found', retryable: false },
        metadata: mockMetadata,
      });

      const result = await service.getById(mockConfig, mockCredentials, '999');

      expect(result.success).toBe(false);
    });
  });

  describe('list', () => {
    it('should list customers successfully', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: {
          QueryResponse: {
            Customer: [mockCustomer],
            startPosition: 1,
            maxResults: 100,
          },
        },
        metadata: mockMetadata,
      });

      const result = await service.list(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(restClient.query).toHaveBeenCalled();
    });

    it('should list customers with filters', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Customer: [] } },
        metadata: mockMetadata,
      });

      await service.list(mockConfig, mockCredentials, {
        active: true,
        searchName: 'Test',
        email: 'test@example.com',
        maxResults: 50,
        startPosition: 1,
      });

      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining('Active = true'),
        expect.anything(),
      );
    });
  });

  describe('update', () => {
    it('should update customer successfully', async () => {
      const updatedCustomer = { ...mockCustomer, DisplayName: 'Updated Customer' };
      restClient.post.mockResolvedValue({
        success: true,
        data: { Customer: updatedCustomer },
        metadata: mockMetadata,
      });

      const result = await service.update(mockConfig, mockCredentials, '123', '0', {
        displayName: 'Updated Customer',
      });

      expect(result.success).toBe(true);
      expect(result.data?.DisplayName).toBe('Updated Customer');
    });

    it('should build sparse update payload', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { Customer: mockCustomer },
        metadata: mockMetadata,
      });

      await service.update(mockConfig, mockCredentials, '123', '0', {
        displayName: 'New Name',
        email: 'new@email.com',
        phone: '999-999-9999',
        billingAddress: {
          line1: 'New Address',
        },
      });

      expect(restClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        expect.objectContaining({
          Id: '123',
          SyncToken: '0',
          sparse: true,
        }),
      );
    });
  });

  describe('search', () => {
    it('should search customers by name', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Customer: [mockCustomer] } },
        metadata: mockMetadata,
      });

      const result = await service.search(mockConfig, mockCredentials, 'Test');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining("DisplayName LIKE '%Test%'"),
        expect.anything(),
      );
    });

    it('should handle empty search results', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: {} },
        metadata: mockMetadata,
      });

      const result = await service.search(mockConfig, mockCredentials, 'NonExistent');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should search with custom limit', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Customer: [] } },
        metadata: mockMetadata,
      });

      await service.search(mockConfig, mockCredentials, 'Test', 10);

      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        { maxResults: 10 },
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate customer', async () => {
      const deactivatedCustomer = { ...mockCustomer, Active: false };
      restClient.post.mockResolvedValue({
        success: true,
        data: { Customer: deactivatedCustomer },
        metadata: mockMetadata,
      });

      const result = await service.deactivate(mockConfig, mockCredentials, '123', '0');

      expect(result.success).toBe(true);
    });
  });
});
