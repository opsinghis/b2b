import { Test, TestingModule } from '@nestjs/testing';
import { QuickBooksItemService } from './quickbooks-item.service';
import { QuickBooksRestClientService } from './quickbooks-rest-client.service';
import { QuickBooksErrorHandlerService } from './quickbooks-error-handler.service';
import { QuickBooksConnectionConfig, QuickBooksCredentials, QuickBooksItem } from '../interfaces';

describe('QuickBooksItemService', () => {
  let service: QuickBooksItemService;
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

  const mockMetadata = { requestId: 'test-123', durationMs: 100 };

  const mockItem: QuickBooksItem = {
    Id: '456',
    SyncToken: '0',
    Name: 'Test Product',
    Description: 'A test product',
    Sku: 'TEST-SKU-001',
    Type: 'Inventory',
    Active: true,
    UnitPrice: 99.99,
    PurchaseCost: 49.99,
    TrackQtyOnHand: true,
    QtyOnHand: 100,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuickBooksItemService,
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

    service = module.get<QuickBooksItemService>(QuickBooksItemService);
    restClient = module.get(
      QuickBooksRestClientService,
    ) as jest.Mocked<QuickBooksRestClientService>;
    errorHandler = module.get(
      QuickBooksErrorHandlerService,
    ) as jest.Mocked<QuickBooksErrorHandlerService>;
  });

  describe('create', () => {
    it('should create item successfully', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { Item: mockItem },
        metadata: mockMetadata,
      });

      const result = await service.create(mockConfig, mockCredentials, {
        name: 'Test Product',
        type: 'Inventory',
        unitPrice: 99.99,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItem);
    });

    it('should build payload with all fields', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { Item: mockItem },
        metadata: mockMetadata,
      });

      await service.create(mockConfig, mockCredentials, {
        name: 'Full Item',
        type: 'Inventory',
        description: 'Full description',
        sku: 'FULL-SKU',
        unitPrice: 100,
        purchaseCost: 50,
        purchaseDescription: 'Purchase desc',
        active: true,
        taxable: true,
        trackQtyOnHand: true,
        qtyOnHand: 50,
        invStartDate: '2024-01-01',
        incomeAccountId: '1',
        expenseAccountId: '2',
        assetAccountId: '3',
      });

      expect(restClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        expect.objectContaining({
          Name: 'Full Item',
          Type: 'Inventory',
          Sku: 'FULL-SKU',
          TrackQtyOnHand: true,
        }),
      );
    });

    it('should handle create error', async () => {
      restClient.post.mockRejectedValue(new Error('Network error'));

      const result = await service.create(mockConfig, mockCredentials, {
        name: 'Test',
        type: 'Service',
      });

      expect(result.success).toBe(false);
      expect(errorHandler.createErrorResult).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should get item by ID successfully', async () => {
      restClient.get.mockResolvedValue({
        success: true,
        data: { Item: mockItem },
        metadata: mockMetadata,
      });

      const result = await service.getById(mockConfig, mockCredentials, '456');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItem);
    });

    it('should handle not found error', async () => {
      restClient.get.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Item not found', retryable: false },
        metadata: mockMetadata,
      });

      const result = await service.getById(mockConfig, mockCredentials, '999');

      expect(result.success).toBe(false);
    });
  });

  describe('getBySku', () => {
    it('should get item by SKU successfully', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Item: [mockItem] } },
        metadata: mockMetadata,
      });

      const result = await service.getBySku(mockConfig, mockCredentials, 'TEST-SKU-001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItem);
    });

    it('should return null for non-existent SKU', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: {} },
        metadata: mockMetadata,
      });

      const result = await service.getBySku(mockConfig, mockCredentials, 'NON-EXISTENT');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('getByName', () => {
    it('should get item by name successfully', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Item: [mockItem] } },
        metadata: mockMetadata,
      });

      const result = await service.getByName(mockConfig, mockCredentials, 'Test Product');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItem);
    });

    it('should return null for non-existent name', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Item: [] } },
        metadata: mockMetadata,
      });

      const result = await service.getByName(mockConfig, mockCredentials, 'Non Existent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('list', () => {
    it('should list items successfully', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Item: [mockItem] } },
        metadata: mockMetadata,
      });

      const result = await service.list(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
    });

    it('should list items with filters', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Item: [] } },
        metadata: mockMetadata,
      });

      await service.list(mockConfig, mockCredentials, {
        active: true,
        type: 'Inventory',
        searchName: 'Test',
        sku: 'TEST-SKU',
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
    it('should update item successfully', async () => {
      const updatedItem = { ...mockItem, Name: 'Updated Product' };
      restClient.post.mockResolvedValue({
        success: true,
        data: { Item: updatedItem },
        metadata: mockMetadata,
      });

      const result = await service.update(mockConfig, mockCredentials, '456', '0', {
        name: 'Updated Product',
      });

      expect(result.success).toBe(true);
      expect(result.data?.Name).toBe('Updated Product');
    });

    it('should build sparse update payload', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { Item: mockItem },
        metadata: mockMetadata,
      });

      await service.update(mockConfig, mockCredentials, '456', '0', {
        name: 'New Name',
        unitPrice: 150,
        qtyOnHand: 200,
      });

      expect(restClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        expect.objectContaining({
          Id: '456',
          SyncToken: '0',
          sparse: true,
          UnitPrice: 150,
          QtyOnHand: 200,
        }),
      );
    });
  });

  describe('search', () => {
    it('should search items by name', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Item: [mockItem] } },
        metadata: mockMetadata,
      });

      const result = await service.search(mockConfig, mockCredentials, 'Test');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should search with options', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Item: [] } },
        metadata: mockMetadata,
      });

      await service.search(mockConfig, mockCredentials, 'Test', {
        type: 'Inventory',
        activeOnly: true,
        limit: 10,
      });

      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining("Type = 'Inventory'"),
        { maxResults: 10 },
      );
    });

    it('should handle search with activeOnly false', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Item: [] } },
        metadata: mockMetadata,
      });

      await service.search(mockConfig, mockCredentials, 'Test', { activeOnly: false });

      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.not.stringContaining('Active = true'),
        expect.anything(),
      );
    });
  });

  describe('getInventoryItems', () => {
    it('should get inventory items', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Item: [mockItem] } },
        metadata: mockMetadata,
      });

      const result = await service.getInventoryItems(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining("Type = 'Inventory'"),
        expect.anything(),
      );
    });

    it('should get low stock items', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Item: [] } },
        metadata: mockMetadata,
      });

      await service.getInventoryItems(mockConfig, mockCredentials, { lowStock: true });

      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining('QtyOnHand < 10'),
        expect.anything(),
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate item', async () => {
      const deactivatedItem = { ...mockItem, Active: false };
      restClient.post.mockResolvedValue({
        success: true,
        data: { Item: deactivatedItem },
        metadata: mockMetadata,
      });

      const result = await service.deactivate(mockConfig, mockCredentials, '456', '0');

      expect(result.success).toBe(true);
    });
  });
});
