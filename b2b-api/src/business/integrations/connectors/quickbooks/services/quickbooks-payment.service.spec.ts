import { Test, TestingModule } from '@nestjs/testing';
import { QuickBooksPaymentService } from './quickbooks-payment.service';
import { QuickBooksRestClientService } from './quickbooks-rest-client.service';
import { QuickBooksErrorHandlerService } from './quickbooks-error-handler.service';
import {
  QuickBooksConnectionConfig,
  QuickBooksCredentials,
  QuickBooksPayment,
} from '../interfaces';

describe('QuickBooksPaymentService', () => {
  let service: QuickBooksPaymentService;
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

  const mockPayment: QuickBooksPayment = {
    Id: '3001',
    SyncToken: '0',
    TxnDate: '2024-01-20',
    TotalAmt: 500,
    CustomerRef: { value: '123', name: 'Test Customer' },
    UnappliedAmt: 0,
    Line: [
      {
        Amount: 500,
        LinkedTxn: [{ TxnId: '1001', TxnType: 'Invoice' }],
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuickBooksPaymentService,
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

    service = module.get<QuickBooksPaymentService>(QuickBooksPaymentService);
    restClient = module.get(
      QuickBooksRestClientService,
    ) as jest.Mocked<QuickBooksRestClientService>;
    errorHandler = module.get(
      QuickBooksErrorHandlerService,
    ) as jest.Mocked<QuickBooksErrorHandlerService>;
  });

  describe('create', () => {
    it('should create payment successfully', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { Payment: mockPayment },
        metadata: mockMetadata,
      });

      const result = await service.create(mockConfig, mockCredentials, {
        customerId: '123',
        totalAmt: 500,
        invoices: [{ invoiceId: '1001' }],
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPayment);
    });

    it('should build payload with all fields', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { Payment: mockPayment },
        metadata: mockMetadata,
      });

      await service.create(mockConfig, mockCredentials, {
        customerId: '123',
        totalAmt: 500,
        txnDate: '2024-01-20',
        paymentMethodId: 'PM-001',
        paymentRefNum: 'REF-123',
        privateNote: 'Internal note',
        depositToAccountId: 'ACC-001',
        processPayment: true,
        invoices: [
          { invoiceId: '1001', amount: 300 },
          { invoiceId: '1002', amount: 200 },
        ],
      });

      expect(restClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        expect.objectContaining({
          CustomerRef: { value: '123' },
          TotalAmt: 500,
          TxnDate: '2024-01-20',
          PaymentMethodRef: { value: 'PM-001' },
          PaymentRefNum: 'REF-123',
          ProcessPayment: true,
        }),
      );
    });

    it('should handle create error', async () => {
      restClient.post.mockRejectedValue(new Error('Network error'));

      const result = await service.create(mockConfig, mockCredentials, {
        customerId: '123',
        totalAmt: 500,
      });

      expect(result.success).toBe(false);
      expect(errorHandler.createErrorResult).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should get payment by ID successfully', async () => {
      restClient.get.mockResolvedValue({
        success: true,
        data: { Payment: mockPayment },
        metadata: mockMetadata,
      });

      const result = await service.getById(mockConfig, mockCredentials, '3001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPayment);
    });
  });

  describe('list', () => {
    it('should list payments successfully', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Payment: [mockPayment] } },
        metadata: mockMetadata,
      });

      const result = await service.list(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
    });

    it('should list payments with filters', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Payment: [] } },
        metadata: mockMetadata,
      });

      await service.list(mockConfig, mockCredentials, {
        customerId: '123',
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
      });

      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining("CustomerRef = '123'"),
        expect.anything(),
      );
    });
  });

  describe('update', () => {
    it('should update payment successfully', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { Payment: mockPayment },
        metadata: mockMetadata,
      });

      const result = await service.update(mockConfig, mockCredentials, '3001', '0', {
        paymentRefNum: 'NEW-REF',
      });

      expect(result.success).toBe(true);
    });

    it('should build sparse update payload', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { Payment: mockPayment },
        metadata: mockMetadata,
      });

      await service.update(mockConfig, mockCredentials, '3001', '0', {
        totalAmt: 600,
        txnDate: '2024-01-25',
        paymentMethodId: 'PM-002',
      });

      expect(restClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        expect.objectContaining({
          Id: '3001',
          SyncToken: '0',
          sparse: true,
          TotalAmt: 600,
        }),
      );
    });
  });

  describe('void', () => {
    it('should void payment successfully', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { Payment: mockPayment },
        metadata: mockMetadata,
      });

      const result = await service.void(mockConfig, mockCredentials, '3001', '0');

      expect(result.success).toBe(true);
      expect(restClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        { Id: '3001', SyncToken: '0' },
        { operation: 'void' },
      );
    });
  });

  describe('getForInvoice', () => {
    it('should get payments for invoice', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Payment: [mockPayment] } },
        metadata: mockMetadata,
      });

      const result = await service.getForInvoice(mockConfig, mockCredentials, '1001');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should filter payments by invoice ID', async () => {
      const unrelatedPayment: QuickBooksPayment = {
        ...mockPayment,
        Id: '3002',
        Line: [{ Amount: 100, LinkedTxn: [{ TxnId: '9999', TxnType: 'Invoice' }] }],
      };

      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Payment: [mockPayment, unrelatedPayment] } },
        metadata: mockMetadata,
      });

      const result = await service.getForInvoice(mockConfig, mockCredentials, '1001');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].Id).toBe('3001');
    });

    it('should handle empty payment results', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: {} },
        metadata: mockMetadata,
      });

      const result = await service.getForInvoice(mockConfig, mockCredentials, '1001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getForCustomer', () => {
    it('should get payments for customer', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Payment: [mockPayment] } },
        metadata: mockMetadata,
      });

      const result = await service.getForCustomer(mockConfig, mockCredentials, '123');

      expect(result.success).toBe(true);
      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining("CustomerRef = '123'"),
        expect.anything(),
      );
    });

    it('should get payments for customer with date range', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Payment: [] } },
        metadata: mockMetadata,
      });

      await service.getForCustomer(mockConfig, mockCredentials, '123', {
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
        limit: 50,
      });

      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining("TxnDate >= '2024-01-01'"),
        { maxResults: 50, orderBy: 'TxnDate DESC' },
      );
    });
  });

  describe('getUnapplied', () => {
    it('should get unapplied payments', async () => {
      const unappliedPayment = { ...mockPayment, UnappliedAmt: 100 };
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Payment: [unappliedPayment] } },
        metadata: mockMetadata,
      });

      const result = await service.getUnapplied(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining('UnappliedAmt > 0'),
        expect.anything(),
      );
    });

    it('should get unapplied payments for customer', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Payment: [] } },
        metadata: mockMetadata,
      });

      await service.getUnapplied(mockConfig, mockCredentials, '123');

      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining("CustomerRef = '123'"),
        expect.anything(),
      );
    });
  });
});
