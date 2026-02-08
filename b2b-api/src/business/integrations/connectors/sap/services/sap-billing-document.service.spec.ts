import { Test, TestingModule } from '@nestjs/testing';
import { SapBillingDocumentService, SapBillingDocumentType } from './sap-billing-document.service';
import { SapODataClientService } from './sap-odata-client.service';
import { SapConnectionConfig, SapCredentials, SapBillingDocument } from '../interfaces';

describe('SapBillingDocumentService', () => {
  let service: SapBillingDocumentService;
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
      providers: [
        SapBillingDocumentService,
        { provide: SapODataClientService, useValue: mockODataClient },
      ],
    }).compile();

    service = module.get<SapBillingDocumentService>(SapBillingDocumentService);
    odataClient = module.get(SapODataClientService);
  });

  describe('getById', () => {
    it('should get billing document by ID', async () => {
      const mockDoc: SapBillingDocument = {
        BillingDocument: 'INV001',
        BillingDocumentType: 'F2',
        SoldToParty: 'CUST001',
        TotalNetAmount: '1500.00',
        TransactionCurrency: 'USD',
      };

      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: mockDoc,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getById(mockConfig, mockCredentials, 'INV001');

      expect(result.success).toBe(true);
      expect(result.data?.BillingDocument).toBe('INV001');
    });

    it('should include items when requested', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: { BillingDocument: 'INV001', to_Item: [] },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getById(mockConfig, mockCredentials, 'INV001', { includeItems: true });

      expect(odataClient.getByKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $expand: ['to_Item'],
        }),
      );
    });

    it('should apply select fields', async () => {
      odataClient.getByKey.mockResolvedValue({
        success: true,
        data: { BillingDocument: 'INV001' },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getById(mockConfig, mockCredentials, 'INV001', {
        select: ['BillingDocument', 'TotalNetAmount'],
      });

      expect(odataClient.getByKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $select: ['BillingDocument', 'TotalNetAmount'],
        }),
      );
    });
  });

  describe('list', () => {
    it('should list billing documents', async () => {
      const mockDocs: SapBillingDocument[] = [
        { BillingDocument: 'INV001', BillingDocumentType: 'F2' },
        { BillingDocument: 'INV002', BillingDocumentType: 'F2' },
      ];

      odataClient.get.mockResolvedValue({
        success: true,
        data: {
          value: mockDocs,
          metadata: { '@odata.count': 2 },
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.list(mockConfig, mockCredentials, { top: 10 });

      expect(result.success).toBe(true);
      expect((result.data?.value as SapBillingDocument[]).length).toBe(2);
    });

    it('should filter by customer', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, { customer: 'CUST001' });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("SoldToParty eq 'CUST001'"),
        }),
      );
    });

    it('should filter by document type', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, {
        billingDocumentType: SapBillingDocumentType.INVOICE,
      });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining("BillingDocumentType eq 'F2'"),
        }),
      );
    });

    it('should filter by date range', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      await service.list(mockConfig, mockCredentials, { fromDate, toDate });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining('BillingDocumentDate ge 2024-01-01'),
        }),
      );
    });

    it('should apply pagination', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, { top: 10, skip: 20 });

      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $top: 10,
          $skip: 20,
        }),
      );
    });
  });

  describe('getItems', () => {
    it('should get billing document items', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: {
          value: [{ BillingDocument: 'INV001', BillingDocumentItem: '000010', Material: 'MAT001' }],
          metadata: {},
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getItems(mockConfig, mockCredentials, 'INV001');

      expect(result.success).toBe(true);
      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'A_BillingDocumentItem',
        expect.objectContaining({
          $filter: "BillingDocument eq 'INV001'",
        }),
      );
    });
  });

  describe('getBySalesOrder', () => {
    it('should get billing documents by sales order', async () => {
      odataClient.get.mockResolvedValue({
        success: true,
        data: {
          value: [{ BillingDocument: 'INV001' }],
          metadata: {},
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getBySalesOrder(mockConfig, mockCredentials, '1234567890');

      expect(result.success).toBe(true);
      expect(odataClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining('1234567890'),
        }),
      );
    });
  });
});
