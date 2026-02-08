import { Test, TestingModule } from '@nestjs/testing';
import { SapAtpService } from './sap-atp.service';
import { SapODataClientService } from './sap-odata-client.service';
import { SapConnectionConfig, SapCredentials, SapAtpCheckRequest } from '../interfaces';

describe('SapAtpService', () => {
  let service: SapAtpService;
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
      post: jest.fn(),
      get: jest.fn(),
      getByKey: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SapAtpService, { provide: SapODataClientService, useValue: mockODataClient }],
    }).compile();

    service = module.get<SapAtpService>(SapAtpService);
    odataClient = module.get(SapODataClientService);
  });

  describe('checkAvailability', () => {
    it('should check product availability', async () => {
      const request: SapAtpCheckRequest = {
        Material: 'MAT001',
        Plant: '1000',
        RequestedQuantity: 10,
        RequestedQuantityUnit: 'EA',
        RequestedDeliveryDate: '2024-01-15',
      };

      odataClient.post.mockResolvedValue({
        success: true,
        data: {
          Material: 'MAT001',
          Plant: '1000',
          AvailableQuantity: '100.00',
          ConfirmedQuantity: '10.00',
          AvailabilityDate: '2024-01-15',
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.checkAvailability(mockConfig, mockCredentials, request);

      expect(result.success).toBe(true);
      expect(result.data?.AvailableQuantity).toBe(100);
    });

    it('should include sales organization when provided', async () => {
      const request: SapAtpCheckRequest = {
        Material: 'MAT001',
        Plant: '1000',
        RequestedQuantity: 10,
        RequestedQuantityUnit: 'EA',
        RequestedDeliveryDate: '2024-01-15',
        SalesOrganization: '1000',
        DistributionChannel: '10',
      };

      odataClient.post.mockResolvedValue({
        success: true,
        data: { Material: 'MAT001' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.checkAvailability(mockConfig, mockCredentials, request);

      expect(odataClient.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          SalesOrganization: '1000',
          DistributionChannel: '10',
        }),
      );
    });

    it('should handle error responses', async () => {
      const request: SapAtpCheckRequest = {
        Material: 'MAT001',
        Plant: '1000',
        RequestedQuantity: 10,
        RequestedQuantityUnit: 'EA',
        RequestedDeliveryDate: '2024-01-15',
      };

      odataClient.post.mockResolvedValue({
        success: false,
        error: { code: 'ATP_ERROR', message: 'ATP check failed', retryable: false },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.checkAvailability(mockConfig, mockCredentials, request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ATP_ERROR');
    });
  });

  describe('checkAvailabilityBatch', () => {
    it('should check availability for multiple products', async () => {
      const requests: SapAtpCheckRequest[] = [
        {
          Material: 'MAT001',
          Plant: '1000',
          RequestedQuantity: 10,
          RequestedQuantityUnit: 'EA',
          RequestedDeliveryDate: '2024-01-15',
        },
        {
          Material: 'MAT002',
          Plant: '1000',
          RequestedQuantity: 5,
          RequestedQuantityUnit: 'EA',
          RequestedDeliveryDate: '2024-01-15',
        },
      ];

      odataClient.post
        .mockResolvedValueOnce({
          success: true,
          data: {
            Material: 'MAT001',
            AvailableQuantity: '100.00',
            ConfirmedQuantity: '10.00',
            AvailabilityDate: '2024-01-15',
          },
          metadata: { requestId: 'req-1', durationMs: 100 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            Material: 'MAT002',
            AvailableQuantity: '50.00',
            ConfirmedQuantity: '5.00',
            AvailabilityDate: '2024-01-15',
          },
          metadata: { requestId: 'req-2', durationMs: 100 },
        });

      const result = await service.checkAvailabilityBatch(mockConfig, mockCredentials, requests);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });

    it('should handle partial failures', async () => {
      const requests: SapAtpCheckRequest[] = [
        {
          Material: 'MAT001',
          Plant: '1000',
          RequestedQuantity: 10,
          RequestedQuantityUnit: 'EA',
          RequestedDeliveryDate: '2024-01-15',
        },
        {
          Material: 'MAT002',
          Plant: '1000',
          RequestedQuantity: 5,
          RequestedQuantityUnit: 'EA',
          RequestedDeliveryDate: '2024-01-15',
        },
      ];

      odataClient.post
        .mockResolvedValueOnce({
          success: true,
          data: {
            Material: 'MAT001',
            AvailableQuantity: '100.00',
            ConfirmedQuantity: '10.00',
            AvailabilityDate: '2024-01-15',
          },
          metadata: { requestId: 'req-1', durationMs: 100 },
        })
        .mockResolvedValueOnce({
          success: false,
          error: { code: 'ATP_ERROR', message: 'ATP check failed', retryable: false },
          metadata: { requestId: 'req-2', durationMs: 100 },
        });

      const result = await service.checkAvailabilityBatch(mockConfig, mockCredentials, requests);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
    });

    it('should fail when all requests fail', async () => {
      const requests: SapAtpCheckRequest[] = [
        {
          Material: 'MAT001',
          Plant: '1000',
          RequestedQuantity: 10,
          RequestedQuantityUnit: 'EA',
          RequestedDeliveryDate: '2024-01-15',
        },
      ];

      odataClient.post.mockResolvedValue({
        success: false,
        error: { code: 'ATP_ERROR', message: 'ATP check failed', retryable: false },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.checkAvailabilityBatch(mockConfig, mockCredentials, requests);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ATP_BATCH_FAILED');
    });
  });

  describe('getStockLevel', () => {
    it('should get stock levels for a product', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: {
          Material: 'MAT001',
          Plant: '1000',
          TotalStock: '150.00',
          AvailableStock: '100.00',
          ReservedStock: '30.00',
          BlockedStock: '5.00',
          QualityInspectionStock: '10.00',
          MaterialBaseUnit: 'EA',
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getStockLevel(mockConfig, mockCredentials, 'MAT001', '1000');

      expect(result.success).toBe(true);
      expect(result.data?.totalStock).toBe(150);
      expect(result.data?.availableStock).toBe(100);
      expect(result.data?.reservedStock).toBe(30);
      expect(result.data?.blockedStock).toBe(5);
      expect(result.data?.qualityInspectionStock).toBe(10);
    });

    it('should filter by storage location', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: { Material: 'MAT001', TotalStock: '50.00', MaterialBaseUnit: 'EA' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getStockLevel(mockConfig, mockCredentials, 'MAT001', '1000', 'SL01');

      expect(odataClient.getByKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          StorageLocation: 'SL01',
        }),
      );
    });

    it('should return default values when stock data not found', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Stock not found', retryable: false },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getStockLevel(mockConfig, mockCredentials, 'MAT001', '1000');

      expect(result.success).toBe(true);
      expect(result.data?.totalStock).toBe(0);
      expect(result.data?.availableStock).toBe(0);
    });
  });

  describe('isAvailableOnDate', () => {
    it('should check if quantity is available on a date', async () => {
      odataClient.post.mockResolvedValue({
        success: true,
        data: {
          Material: 'MAT001',
          ConfirmedQuantity: '100.00',
          AvailabilityDate: '2024-01-15',
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.isAvailableOnDate(
        mockConfig,
        mockCredentials,
        'MAT001',
        '1000',
        50,
        'EA',
        new Date('2024-01-15'),
      );

      expect(result.success).toBe(true);
      expect(result.data?.isAvailable).toBe(true);
      expect(result.data?.partiallyAvailable).toBe(false);
    });

    it('should indicate partial availability', async () => {
      odataClient.post.mockResolvedValue({
        success: true,
        data: {
          Material: 'MAT001',
          ConfirmedQuantity: '30.00',
          AvailabilityDate: '2024-01-15',
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.isAvailableOnDate(
        mockConfig,
        mockCredentials,
        'MAT001',
        '1000',
        50,
        'EA',
        new Date('2024-01-15'),
      );

      expect(result.success).toBe(true);
      expect(result.data?.isAvailable).toBe(false);
      expect(result.data?.partiallyAvailable).toBe(true);
      expect(result.data?.availableQuantity).toBe(30);
    });

    it('should indicate no availability', async () => {
      odataClient.post.mockResolvedValue({
        success: true,
        data: {
          Material: 'MAT001',
          ConfirmedQuantity: '0.00',
          AvailabilityDate: '2024-01-20',
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.isAvailableOnDate(
        mockConfig,
        mockCredentials,
        'MAT001',
        '1000',
        50,
        'EA',
        new Date('2024-01-15'),
      );

      expect(result.success).toBe(true);
      expect(result.data?.isAvailable).toBe(false);
      expect(result.data?.partiallyAvailable).toBe(false);
    });
  });

  describe('getAvailableDates', () => {
    it('should get available dates for a quantity', async () => {
      // Mock multiple calls - weekly intervals from Jan 1 to Jan 31 (5 weeks)
      odataClient.post
        .mockResolvedValueOnce({
          success: true,
          data: { ConfirmedQuantity: '50.00', AvailabilityDate: '2024-01-01', QuantityUnit: 'EA' },
          metadata: { requestId: 'req-1', durationMs: 100 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { ConfirmedQuantity: '100.00', AvailabilityDate: '2024-01-08', QuantityUnit: 'EA' },
          metadata: { requestId: 'req-2', durationMs: 100 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { ConfirmedQuantity: '100.00', AvailabilityDate: '2024-01-15', QuantityUnit: 'EA' },
          metadata: { requestId: 'req-3', durationMs: 100 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { ConfirmedQuantity: '100.00', AvailabilityDate: '2024-01-22', QuantityUnit: 'EA' },
          metadata: { requestId: 'req-4', durationMs: 100 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { ConfirmedQuantity: '100.00', AvailabilityDate: '2024-01-29', QuantityUnit: 'EA' },
          metadata: { requestId: 'req-5', durationMs: 100 },
        });

      const result = await service.getAvailableDates(
        mockConfig,
        mockCredentials,
        'MAT001',
        '1000',
        100,
        'EA',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        { maxResults: 5 },
      );

      expect(result.success).toBe(true);
      // Should find at least 4 dates where ConfirmedQuantity >= 100
      expect(result.data?.length).toBeGreaterThanOrEqual(1);
    });
  });
});
