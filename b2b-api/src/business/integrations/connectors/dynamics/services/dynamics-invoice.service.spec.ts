import { Test, TestingModule } from '@nestjs/testing';
import { DynamicsInvoiceService } from './dynamics-invoice.service';
import { DynamicsWebApiClientService } from './dynamics-webapi-client.service';
import {
  DynamicsConnectionConfig,
  DynamicsCredentials,
  DynamicsInvoice,
  DynamicsInvoiceState,
} from '../interfaces';

describe('DynamicsInvoiceService', () => {
  let service: DynamicsInvoiceService;
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
      patch: jest.fn(),
      executeAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamicsInvoiceService,
        { provide: DynamicsWebApiClientService, useValue: mockWebApiClient },
      ],
    }).compile();

    service = module.get<DynamicsInvoiceService>(DynamicsInvoiceService);
    webApiClient = module.get(DynamicsWebApiClientService);
  });

  describe('getById', () => {
    it('should get invoice by ID', async () => {
      const mockInvoice: DynamicsInvoice = {
        invoiceid: 'inv-123',
        invoicenumber: 'INV-001',
        name: 'Invoice 001',
        totalamount: 1100,
        totallineitemamount: 1000,
        totaltax: 100,
        statecode: DynamicsInvoiceState.ACTIVE,
      };

      webApiClient.getByKey.mockResolvedValue({
        success: true,
        data: mockInvoice,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getById(mockConfig, mockCredentials, 'inv-123');

      expect(result.success).toBe(true);
      expect(result.data?.invoicenumber).toBe('INV-001');
    });

    it('should include items when requested', async () => {
      webApiClient.getByKey.mockResolvedValue({
        success: true,
        data: { invoiceid: 'inv-123', invoice_details: [] },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.getById(mockConfig, mockCredentials, 'inv-123', {
        includeItems: true,
      });

      expect(webApiClient.getByKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $expand: expect.arrayContaining([expect.stringContaining('invoice_details')]),
        }),
      );
    });
  });

  describe('list', () => {
    it('should list invoices', async () => {
      const mockInvoices: DynamicsInvoice[] = [
        { invoiceid: 'inv-1', invoicenumber: 'INV-001' },
        { invoiceid: 'inv-2', invoicenumber: 'INV-002' },
      ];

      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: mockInvoices,
          metadata: { '@odata.count': 2 },
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.list(mockConfig, mockCredentials, { top: 10 });

      expect(result.success).toBe(true);
      expect(result.data?.value).toHaveLength(2);
    });

    it('should filter by customer ID', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, {
        customerId: 'acc-123',
      });

      expect(webApiClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining('_customerid_value eq acc-123'),
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
        stateCode: DynamicsInvoiceState.PAID,
      });

      expect(webApiClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining('statecode eq 2'),
        }),
      );
    });

    it('should filter by date range', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, {
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
      });

      expect(webApiClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringMatching(/createdon ge.*createdon le/),
        }),
      );
    });

    it('should filter by sales order ID', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: { value: [], metadata: {} },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      await service.list(mockConfig, mockCredentials, {
        salesOrderId: 'order-123',
      });

      expect(webApiClient.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          $filter: expect.stringContaining('_salesorderid_value eq order-123'),
        }),
      );
    });
  });

  describe('getByInvoiceNumber', () => {
    it('should get invoice by invoice number', async () => {
      const mockInvoice: DynamicsInvoice = {
        invoiceid: 'inv-123',
        invoicenumber: 'INV-001',
        name: 'Invoice 001',
      };

      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: [mockInvoice],
          metadata: {},
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getByInvoiceNumber(mockConfig, mockCredentials, 'INV-001');

      expect(result.success).toBe(true);
      expect(result.data?.invoicenumber).toBe('INV-001');
    });

    it('should return error when invoice not found', async () => {
      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: [],
          metadata: {},
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getByInvoiceNumber(mockConfig, mockCredentials, 'NOT-EXIST');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVOICE_NOT_FOUND');
    });
  });

  describe('lockPricing', () => {
    it('should lock invoice pricing', async () => {
      webApiClient.executeAction.mockResolvedValue({
        success: true,
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.lockPricing(mockConfig, mockCredentials, 'inv-123');

      expect(result.success).toBe(true);
      expect(webApiClient.executeAction).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        'LockInvoicePricing',
        'invoices',
        'inv-123',
      );
    });
  });

  describe('getStatus', () => {
    it('should get invoice status', async () => {
      webApiClient.getByKey.mockResolvedValue({
        success: true,
        data: { statecode: DynamicsInvoiceState.ACTIVE, statuscode: 1 },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getStatus(mockConfig, mockCredentials, 'inv-123');

      expect(result.success).toBe(true);
      expect(result.data?.stateCode).toBe(DynamicsInvoiceState.ACTIVE);
      expect(result.data?.stateName).toBe('Active');
    });

    it('should return different state names', async () => {
      const states = [
        { state: DynamicsInvoiceState.ACTIVE, expected: 'Active' },
        { state: DynamicsInvoiceState.CLOSED, expected: 'Closed' },
        { state: DynamicsInvoiceState.PAID, expected: 'Paid' },
        { state: DynamicsInvoiceState.CANCELED, expected: 'Canceled' },
      ];

      for (const { state, expected } of states) {
        webApiClient.getByKey.mockResolvedValue({
          success: true,
          data: { statecode: state, statuscode: 1 },
          metadata: { requestId: 'req-1', durationMs: 100 },
        });

        const result = await service.getStatus(mockConfig, mockCredentials, 'inv-123');
        expect(result.data?.stateName).toBe(expected);
      }
    });

    it('should handle error response', async () => {
      webApiClient.getByKey.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invoice not found', retryable: false },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getStatus(mockConfig, mockCredentials, 'inv-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('getForSalesOrder', () => {
    it('should get invoices for sales order', async () => {
      const mockInvoices: DynamicsInvoice[] = [
        { invoiceid: 'inv-1', invoicenumber: 'INV-001' },
        { invoiceid: 'inv-2', invoicenumber: 'INV-002' },
      ];

      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: mockInvoices,
          metadata: { '@odata.count': 2 },
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getForSalesOrder(mockConfig, mockCredentials, 'order-123');

      expect(result.success).toBe(true);
      expect(result.data?.value).toHaveLength(2);
    });
  });

  describe('getOpenInvoices', () => {
    it('should get open invoices', async () => {
      const mockInvoices: DynamicsInvoice[] = [{ invoiceid: 'inv-1', invoicenumber: 'INV-001' }];

      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: mockInvoices,
          metadata: { '@odata.count': 1 },
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getOpenInvoices(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.data?.value).toHaveLength(1);
    });
  });

  describe('getOverdueInvoices', () => {
    it('should get overdue invoices', async () => {
      const mockInvoices: DynamicsInvoice[] = [{ invoiceid: 'inv-1', invoicenumber: 'INV-001' }];

      webApiClient.get.mockResolvedValue({
        success: true,
        data: {
          value: mockInvoices,
          metadata: { '@odata.count': 1 },
        },
        metadata: { requestId: 'req-1', durationMs: 100 },
      });

      const result = await service.getOverdueInvoices(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.data?.value).toHaveLength(1);
    });
  });
});
