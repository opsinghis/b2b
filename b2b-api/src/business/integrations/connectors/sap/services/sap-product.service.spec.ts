import { Test, TestingModule } from '@nestjs/testing';
import { SapProductService, SapProductStatus } from './sap-product.service';
import { SapODataClientService } from './sap-odata-client.service';
import { SapConnectionConfig, SapCredentials, SapProduct } from '../interfaces';

describe('SapProductService', () => {
  let service: SapProductService;
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SapProductService, { provide: SapODataClientService, useValue: mockODataClient }],
    }).compile();

    service = module.get<SapProductService>(SapProductService);
    odataClient = module.get(SapODataClientService);
  });

  describe('getById', () => {
    it('should get product by ID', async () => {
      const mockProduct: SapProduct = {
        Product: 'MAT001',
        ProductType: 'FERT',
        BaseUnit: 'EA',
      };

      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: mockProduct,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getById(mockConfig, mockCredentials, 'MAT001');

      expect(result.success).toBe(true);
      expect(result.data?.Product).toBe('MAT001');
    });

    it('should include descriptions when requested', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: { Product: 'MAT001', to_Description: [] },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getById(mockConfig, mockCredentials, 'MAT001', {
        includeDescriptions: true,
      });

      expect(odataClient.getByKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $expand: expect.arrayContaining(['to_Description']),
        }),
      );
    });

    it('should filter descriptions by language', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: { Product: 'MAT001', to_Description: [] },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getById(mockConfig, mockCredentials, 'MAT001', {
        includeDescriptions: true,
        language: 'DE',
      });

      expect(odataClient.getByKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $expand: expect.arrayContaining([expect.stringContaining("Language eq 'DE'")]),
        }),
      );
    });

    it('should include plant data when requested', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: { Product: 'MAT001', to_Plant: [] },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getById(mockConfig, mockCredentials, 'MAT001', {
        includePlantData: true,
      });

      expect(odataClient.getByKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $expand: expect.arrayContaining(['to_Plant']),
        }),
      );
    });
  });

  describe('list', () => {
    it('should list products', async () => {
      const mockProducts: SapProduct[] = [
        { Product: 'MAT001', ProductType: 'FERT' },
        { Product: 'MAT002', ProductType: 'FERT' },
      ];

      odataClient.get.mockResolvedValue({
        success: true,
        data: {
          value: mockProducts,
          metadata: { '@odata.count': 2 },
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.list(mockConfig, mockCredentials, { top: 10 });

      expect(result.success).toBe(true);
      expect((result.data?.value as SapProduct[]).length).toBe(2);
    });

    it('should filter by product type', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, { productType: 'FERT' });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("ProductType eq 'FERT'"),
        }),
      );
    });

    it('should filter by product group', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, { productGroup: 'ELEC' });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("ProductGroup eq 'ELEC'"),
        }),
      );
    });

    it('should filter by status', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, {
        status: SapProductStatus.BLOCKED,
      });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("CrossPlantStatus eq '03'"),
        }),
      );
    });

    it('should search by term', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, { searchTerm: 'Widget' });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("contains(Product,'Widget')"),
        }),
      );
    });
  });

  describe('searchByDescription', () => {
    it('should search products by description', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: {
          value: [{ Product: 'MAT001' }],
          metadata: {},
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.searchByDescription(
        mockConfig,
        mockCredentials,
        'Premium Widget',
      );

      expect(result.success).toBe(true);
      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("contains(d/ProductDescription,'Premium Widget')"),
        }),
      );
    });

    it('should filter by language', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.searchByDescription(mockConfig, mockCredentials, 'Test', {
        language: 'FR',
      });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("Language eq 'FR'"),
        }),
      );
    });
  });

  describe('getProductSalesData', () => {
    it('should get product sales data', async () => {
      const mockProduct: SapProduct = {
        Product: 'MAT001',
        BaseUnit: 'EA',
        to_SalesDelivery: [
          {
            ProductSalesOrg: '1000',
            ProductDistributionChnl: '10',
            SalesMeasureUnit: 'EA',
            IsMarkedForDeletion: false,
          },
        ],
      };

      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: mockProduct,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getProductSalesData(
        mockConfig,
        mockCredentials,
        'MAT001',
        '1000',
        '10',
      );

      expect(result.success).toBe(true);
      expect(result.data?.product).toBe('MAT001');
      expect(result.data?.isAvailable).toBe(true);
    });

    it('should return null when no sales data exists', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: { Product: 'MAT001', to_SalesDelivery: [] },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getProductSalesData(
        mockConfig,
        mockCredentials,
        'MAT001',
        '1000',
        '10',
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('getProductValuation', () => {
    it('should get product valuation', async () => {
      const mockProduct: SapProduct = {
        Product: 'MAT001',
        to_Valuation: [
          {
            ValuationArea: '1000',
            StandardPrice: '150.00',
            Currency: 'USD',
            PriceUnitQty: '1',
          },
        ],
      };

      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: mockProduct,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getProductValuation(
        mockConfig,
        mockCredentials,
        'MAT001',
        '1000',
      );

      expect(result.success).toBe(true);
      expect(result.data?.standardPrice).toBe(150);
      expect(result.data?.currency).toBe('USD');
    });

    it('should return null when no valuation exists', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: { Product: 'MAT001', to_Valuation: [] },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getProductValuation(
        mockConfig,
        mockCredentials,
        'MAT001',
        '1000',
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('getByProductGroup', () => {
    it('should get products by group', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: {
          value: [{ Product: 'MAT001', ProductGroup: 'ELEC' }],
          metadata: { '@odata.count': 1 },
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getByProductGroup(mockConfig, mockCredentials, 'ELEC');

      expect(result.success).toBe(true);
      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("ProductGroup eq 'ELEC'"),
        }),
      );
    });

    it('should filter active only', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getByProductGroup(mockConfig, mockCredentials, 'ELEC', {
        activeOnly: true,
      });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("CrossPlantStatus eq ''"),
        }),
      );
    });
  });

  describe('getPlantData', () => {
    it('should get product plant data', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: {
          Product: 'MAT001',
          to_Plant: [
            {
              Plant: '1000',
              MRPType: 'PD',
              PurchasingGroup: '001',
              AvailabilityCheckType: '02',
            },
          ],
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getPlantData(mockConfig, mockCredentials, 'MAT001');

      expect(result.success).toBe(true);
      expect(result.data?.plants.length).toBe(1);
      expect(result.data?.plants[0].plant).toBe('1000');
    });

    it('should filter by specific plant', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: { Product: 'MAT001', to_Plant: [] },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getPlantData(mockConfig, mockCredentials, 'MAT001', '1000');

      expect(odataClient.getByKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $expand: [expect.stringContaining("Plant eq '1000'")],
        }),
      );
    });
  });
});
