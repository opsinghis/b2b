import { Test, TestingModule } from '@nestjs/testing';
import { DynamicsProductService } from './dynamics-product.service';
import { DynamicsWebApiClientService } from './dynamics-webapi-client.service';
import {
  DynamicsConnectionConfig,
  DynamicsCredentials,
  DynamicsProduct,
  DynamicsPriceLevel,
} from '../interfaces';

describe('DynamicsProductService', () => {
  let service: DynamicsProductService;
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamicsProductService,
        { provide: DynamicsWebApiClientService, useValue: mockWebApiClient },
      ],
    }).compile();

    service = module.get<DynamicsProductService>(DynamicsProductService);
    webApiClient = module.get(DynamicsWebApiClientService);
  });

  describe('getById', () => {
    it('should get product by ID', async () => {
      const mockProduct: DynamicsProduct = {
        productid: 'prod-123',
        name: 'Widget',
        productnumber: 'WGT-001',
        description: 'A great widget',
        price: 99.99,
        statecode: 0,
      };

      webApiClient.getByKey.mockResolvedValue({
        success: true,
        data: mockProduct,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getById(mockConfig, mockCredentials, 'prod-123');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Widget');
    });

    it('should include prices when requested', async () => {
      const mockProduct: DynamicsProduct = {
        productid: 'prod-123',
        name: 'Widget',
        productnumber: 'WGT-001',
      };

      webApiClient.getByKey.mockResolvedValue({
        success: true,
        data: mockProduct,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      // Mock the price call
      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: [{ amount: 99.99 }],
          metadata: {},
        },
        metadata: { requestId: 'req-2', durationMs: 100 },
      });

      const result = await service.getById(mockConfig, mockCredentials, 'prod-123', {
        includePrices: true,
        priceListId: 'pl-123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Widget');
    });
  });

  describe('list', () => {
    it('should list products', async () => {
      const mockProducts: DynamicsProduct[] = [
        { productid: 'prod-1', name: 'Product 1' },
        { productid: 'prod-2', name: 'Product 2' },
      ];

      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: mockProducts,
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
        searchTerm: 'Widget',
      });

      expect(webApiClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("contains(name,'Widget')"),
        }),
      );
    });

    it('should filter by product type', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, {
        productType: 1,
      });

      expect(webApiClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining('producttypecode eq 1'),
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
        stateCode: 0,
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
  });

  describe('getByProductNumber', () => {
    it('should get product by product number', async () => {
      const mockProduct: DynamicsProduct = {
        productid: 'prod-123',
        name: 'Widget',
        productnumber: 'WGT-001',
      };

      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: [mockProduct],
          metadata: {},
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getByProductNumber(mockConfig, mockCredentials, 'WGT-001');

      expect(result.success).toBe(true);
      expect(result.data?.productnumber).toBe('WGT-001');
    });

    it('should return error when product not found', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: [],
          metadata: {},
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getByProductNumber(mockConfig, mockCredentials, 'NOT-EXIST');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('getPriceLevelById', () => {
    it('should get price level by ID', async () => {
      const mockPriceLevel: DynamicsPriceLevel = {
        pricelevelid: 'pl-123',
        name: 'Default Price List',
        begindate: '2024-01-01',
        enddate: '2024-12-31',
        statecode: 0,
      };

      webApiClient.getByKey.mockResolvedValue({
        success: true,
        data: mockPriceLevel,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getPriceLevelById(mockConfig, mockCredentials, 'pl-123');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Default Price List');
    });
  });

  describe('listPriceLevels', () => {
    it('should list price levels', async () => {
      const mockPriceLevels: DynamicsPriceLevel[] = [
        { pricelevelid: 'pl-1', name: 'Price List 1' },
        { pricelevelid: 'pl-2', name: 'Price List 2' },
      ];

      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: mockPriceLevels,
          metadata: { '@odata.count': 2 },
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.listPriceLevels(mockConfig, mockCredentials, { top: 10 });

      expect(result.success).toBe(true);
      expect(result.data?.value).toHaveLength(2);
    });

    it('should filter by active state', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.listPriceLevels(mockConfig, mockCredentials, {
        activeOnly: true,
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
  });

  describe('getProductPrice', () => {
    it('should get product price from price list', async () => {
      const mockPriceListItem = {
        productpricelevelid: 'ppl-123',
        amount: 99.99,
        discountpercentage: 0,
      };

      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: [mockPriceListItem],
          metadata: {},
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getProductPrice(
        mockConfig,
        mockCredentials,
        'prod-123',
        'pl-123',
      );

      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(99.99);
    });

    it('should return error when price not found', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: [],
          metadata: {},
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getProductPrice(
        mockConfig,
        mockCredentials,
        'prod-123',
        'pl-123',
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PRICE_NOT_FOUND');
    });
  });
});
