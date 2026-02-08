import { Test, TestingModule } from '@nestjs/testing';
import { QuickBooksInvoiceService } from './quickbooks-invoice.service';
import { QuickBooksRestClientService } from './quickbooks-rest-client.service';
import { QuickBooksErrorHandlerService } from './quickbooks-error-handler.service';
import {
  QuickBooksConnectionConfig,
  QuickBooksCredentials,
  QuickBooksInvoice,
} from '../interfaces';

describe('QuickBooksInvoiceService', () => {
  let service: QuickBooksInvoiceService;
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

  const mockInvoice: QuickBooksInvoice = {
    Id: '1001',
    SyncToken: '0',
    DocNumber: 'INV-001',
    TxnDate: '2024-01-15',
    DueDate: '2024-02-15',
    CustomerRef: { value: '123', name: 'Test Customer' },
    TotalAmt: 500,
    Balance: 500,
    Line: [
      {
        Id: '1',
        LineNum: 1,
        DetailType: 'SalesItemLineDetail',
        Amount: 500,
        SalesItemLineDetail: {
          ItemRef: { value: '456' },
          Qty: 1,
          UnitPrice: 500,
        },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuickBooksInvoiceService,
        {
          provide: QuickBooksRestClientService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
            query: jest.fn(),
            send: jest.fn(),
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

    service = module.get<QuickBooksInvoiceService>(QuickBooksInvoiceService);
    restClient = module.get(
      QuickBooksRestClientService,
    ) as jest.Mocked<QuickBooksRestClientService>;
    errorHandler = module.get(
      QuickBooksErrorHandlerService,
    ) as jest.Mocked<QuickBooksErrorHandlerService>;
  });

  describe('create', () => {
    it('should create invoice successfully', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { Invoice: mockInvoice },
        metadata: mockMetadata,
      });

      const result = await service.create(mockConfig, mockCredentials, {
        customerId: '123',
        lines: [{ itemId: '456', quantity: 1, unitPrice: 500 }],
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInvoice);
    });

    it('should build payload with all fields', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { Invoice: mockInvoice },
        metadata: mockMetadata,
      });

      await service.create(mockConfig, mockCredentials, {
        customerId: '123',
        txnDate: '2024-01-15',
        dueDate: '2024-02-15',
        docNumber: 'INV-001',
        privateNote: 'Internal note',
        customerMemo: 'Thank you!',
        billingAddress: {
          line1: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          postalCode: '12345',
        },
        shippingAddress: {
          line1: '456 Other St',
        },
        shipDate: '2024-01-20',
        trackingNum: 'TRACK123',
        billEmail: 'customer@test.com',
        paymentTermsId: '1',
        applyTaxAfterDiscount: true,
        lines: [
          {
            itemId: '456',
            description: 'Test item',
            quantity: 2,
            unitPrice: 250,
            serviceDate: '2024-01-15',
            taxCodeId: 'TAX',
          },
        ],
      });

      expect(restClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        expect.objectContaining({
          CustomerRef: { value: '123' },
          TxnDate: '2024-01-15',
          DueDate: '2024-02-15',
          DocNumber: 'INV-001',
          ApplyTaxAfterDiscount: true,
        }),
      );
    });

    it('should handle create error', async () => {
      restClient.post.mockRejectedValue(new Error('Network error'));

      const result = await service.create(mockConfig, mockCredentials, {
        customerId: '123',
        lines: [],
      });

      expect(result.success).toBe(false);
      expect(errorHandler.createErrorResult).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should get invoice by ID successfully', async () => {
      restClient.get.mockResolvedValue({
        success: true,
        data: { Invoice: mockInvoice },
        metadata: mockMetadata,
      });

      const result = await service.getById(mockConfig, mockCredentials, '1001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInvoice);
    });

    it('should handle not found error', async () => {
      restClient.get.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invoice not found', retryable: false },
        metadata: mockMetadata,
      });

      const result = await service.getById(mockConfig, mockCredentials, '999');

      expect(result.success).toBe(false);
    });
  });

  describe('getByDocNumber', () => {
    it('should get invoice by doc number successfully', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Invoice: [mockInvoice] } },
        metadata: mockMetadata,
      });

      const result = await service.getByDocNumber(mockConfig, mockCredentials, 'INV-001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInvoice);
    });

    it('should return null for non-existent doc number', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Invoice: [] } },
        metadata: mockMetadata,
      });

      const result = await service.getByDocNumber(mockConfig, mockCredentials, 'NON-EXISTENT');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('list', () => {
    it('should list invoices successfully', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Invoice: [mockInvoice] } },
        metadata: mockMetadata,
      });

      const result = await service.list(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
    });

    it('should list invoices with filters', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Invoice: [] } },
        metadata: mockMetadata,
      });

      await service.list(mockConfig, mockCredentials, {
        customerId: '123',
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
        unpaidOnly: true,
      });

      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining("CustomerRef = '123'"),
        expect.anything(),
      );
    });

    it('should list overdue invoices', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Invoice: [] } },
        metadata: mockMetadata,
      });

      await service.list(mockConfig, mockCredentials, { overdueOnly: true });

      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining('Balance > 0'),
        expect.anything(),
      );
    });
  });

  describe('update', () => {
    it('should update invoice successfully', async () => {
      const updatedInvoice = { ...mockInvoice, PrivateNote: 'Updated note' };
      restClient.post.mockResolvedValue({
        success: true,
        data: { Invoice: updatedInvoice },
        metadata: mockMetadata,
      });

      const result = await service.update(mockConfig, mockCredentials, '1001', '0', {
        privateNote: 'Updated note',
      });

      expect(result.success).toBe(true);
    });

    it('should build sparse update payload', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { Invoice: mockInvoice },
        metadata: mockMetadata,
      });

      await service.update(mockConfig, mockCredentials, '1001', '0', {
        dueDate: '2024-03-15',
        customerMemo: 'Updated memo',
        lines: [{ itemId: '789', quantity: 3, unitPrice: 100 }],
      });

      expect(restClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        expect.objectContaining({
          Id: '1001',
          SyncToken: '0',
          sparse: true,
          DueDate: '2024-03-15',
        }),
      );
    });
  });

  describe('void', () => {
    it('should void invoice successfully', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { Invoice: mockInvoice },
        metadata: mockMetadata,
      });

      const result = await service.void(mockConfig, mockCredentials, '1001', '0');

      expect(result.success).toBe(true);
      expect(restClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        { Id: '1001', SyncToken: '0' },
        { operation: 'void' },
      );
    });
  });

  describe('send', () => {
    it('should send invoice via email', async () => {
      const sentInvoice = { ...mockInvoice, EmailStatus: 'Sent' };
      restClient.send.mockResolvedValue({
        success: true,
        data: { Invoice: sentInvoice },
        metadata: mockMetadata,
      });

      const result = await service.send(
        mockConfig,
        mockCredentials,
        '1001',
        'customer@example.com',
      );

      expect(result.success).toBe(true);
      expect(restClient.send).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        'customer@example.com',
      );
    });

    it('should send invoice without email (use customer email)', async () => {
      const sentInvoice = { ...mockInvoice, EmailStatus: 'Sent' };
      restClient.send.mockResolvedValue({
        success: true,
        data: { Invoice: sentInvoice },
        metadata: mockMetadata,
      });

      const result = await service.send(mockConfig, mockCredentials, '1001');

      expect(result.success).toBe(true);
      expect(restClient.send).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        undefined,
      );
    });
  });

  describe('getOutstanding', () => {
    it('should get outstanding invoices', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Invoice: [mockInvoice] } },
        metadata: mockMetadata,
      });

      const result = await service.getOutstanding(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining('Balance > 0'),
        expect.anything(),
      );
    });

    it('should get outstanding invoices for customer', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Invoice: [] } },
        metadata: mockMetadata,
      });

      await service.getOutstanding(mockConfig, mockCredentials, '123');

      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining("CustomerRef = '123'"),
        expect.anything(),
      );
    });

    it('should handle empty outstanding invoices', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: {} },
        metadata: mockMetadata,
      });

      const result = await service.getOutstanding(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getOverdue', () => {
    it('should get overdue invoices', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Invoice: [mockInvoice] } },
        metadata: mockMetadata,
      });

      const result = await service.getOverdue(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining('DueDate <'),
        expect.anything(),
      );
    });

    it('should get overdue invoices for customer', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { Invoice: [] } },
        metadata: mockMetadata,
      });

      await service.getOverdue(mockConfig, mockCredentials, '123');

      expect(restClient.query).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.stringContaining("CustomerRef = '123'"),
        expect.anything(),
      );
    });
  });
});
