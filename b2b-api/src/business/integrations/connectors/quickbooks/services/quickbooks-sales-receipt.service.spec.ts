import { Test, TestingModule } from '@nestjs/testing';
import { QuickBooksSalesReceiptService } from './quickbooks-sales-receipt.service';
import { QuickBooksRestClientService } from './quickbooks-rest-client.service';
import { QuickBooksErrorHandlerService } from './quickbooks-error-handler.service';
import {
  QuickBooksConnectionConfig,
  QuickBooksCredentials,
  QuickBooksSalesReceipt,
} from '../interfaces';

describe('QuickBooksSalesReceiptService', () => {
  let service: QuickBooksSalesReceiptService;
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

  const mockSalesReceipt: QuickBooksSalesReceipt = {
    Id: '2001',
    SyncToken: '0',
    DocNumber: 'SR-001',
    TxnDate: '2024-01-15',
    CustomerRef: { value: '123', name: 'Test Customer' },
    TotalAmt: 599.99,
    Line: [
      {
        Id: '1',
        LineNum: 1,
        DetailType: 'SalesItemLineDetail',
        Amount: 599.99,
        SalesItemLineDetail: {
          ItemRef: { value: '456' },
          Qty: 2,
          UnitPrice: 299.99,
        },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuickBooksSalesReceiptService,
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

    service = module.get<QuickBooksSalesReceiptService>(QuickBooksSalesReceiptService);
    restClient = module.get(
      QuickBooksRestClientService,
    ) as jest.Mocked<QuickBooksRestClientService>;
    errorHandler = module.get(
      QuickBooksErrorHandlerService,
    ) as jest.Mocked<QuickBooksErrorHandlerService>;
  });

  describe('create', () => {
    it('should create sales receipt successfully', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { SalesReceipt: mockSalesReceipt },
        metadata: mockMetadata,
      });

      const result = await service.create(mockConfig, mockCredentials, {
        customerId: '123',
        lines: [{ itemId: '456', quantity: 2, unitPrice: 299.99 }],
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSalesReceipt);
    });

    it('should create sales receipt without customer (walk-in)', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { SalesReceipt: { ...mockSalesReceipt, CustomerRef: undefined } },
        metadata: mockMetadata,
      });

      const result = await service.create(mockConfig, mockCredentials, {
        lines: [{ itemId: '456', quantity: 1, unitPrice: 100 }],
      });

      expect(result.success).toBe(true);
    });

    it('should build payload with all fields', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { SalesReceipt: mockSalesReceipt },
        metadata: mockMetadata,
      });

      await service.create(mockConfig, mockCredentials, {
        customerId: '123',
        txnDate: '2024-01-15',
        docNumber: 'SR-001',
        privateNote: 'Internal note',
        customerMemo: 'Thank you!',
        billingAddress: {
          line1: '123 Main St',
          line2: 'Suite 100',
          line3: 'Floor 2',
          city: 'Anytown',
          state: 'CA',
          postalCode: '12345',
          country: 'USA',
        },
        shippingAddress: {
          line1: '456 Ship St',
        },
        paymentMethodId: 'PM-001',
        paymentRefNum: 'REF-123',
        depositToAccountId: 'ACC-001',
        lines: [
          {
            itemId: '456',
            description: 'Test item',
            quantity: 2,
            unitPrice: 299.99,
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
          DocNumber: 'SR-001',
          PaymentMethodRef: { value: 'PM-001' },
        }),
      );
    });

    it('should handle create error', async () => {
      restClient.post.mockRejectedValue(new Error('Network error'));

      const result = await service.create(mockConfig, mockCredentials, {
        lines: [{ itemId: '456', quantity: 1 }],
      });

      expect(result.success).toBe(false);
      expect(errorHandler.createErrorResult).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should get sales receipt by ID successfully', async () => {
      restClient.get.mockResolvedValue({
        success: true,
        data: { SalesReceipt: mockSalesReceipt },
        metadata: mockMetadata,
      });

      const result = await service.getById(mockConfig, mockCredentials, '2001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSalesReceipt);
    });
  });

  describe('getByDocNumber', () => {
    it('should get sales receipt by doc number successfully', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { SalesReceipt: [mockSalesReceipt] } },
        metadata: mockMetadata,
      });

      const result = await service.getByDocNumber(mockConfig, mockCredentials, 'SR-001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSalesReceipt);
    });

    it('should return null for non-existent doc number', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { SalesReceipt: [] } },
        metadata: mockMetadata,
      });

      const result = await service.getByDocNumber(mockConfig, mockCredentials, 'NON-EXISTENT');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('list', () => {
    it('should list sales receipts successfully', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { SalesReceipt: [mockSalesReceipt] } },
        metadata: mockMetadata,
      });

      const result = await service.list(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
    });

    it('should list sales receipts with filters', async () => {
      restClient.query.mockResolvedValue({
        success: true,
        data: { QueryResponse: { SalesReceipt: [] } },
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
    it('should update sales receipt successfully', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { SalesReceipt: mockSalesReceipt },
        metadata: mockMetadata,
      });

      const result = await service.update(mockConfig, mockCredentials, '2001', '0', {
        privateNote: 'Updated note',
      });

      expect(result.success).toBe(true);
    });

    it('should build sparse update payload', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { SalesReceipt: mockSalesReceipt },
        metadata: mockMetadata,
      });

      await service.update(mockConfig, mockCredentials, '2001', '0', {
        txnDate: '2024-01-20',
        customerMemo: 'Updated memo',
        lines: [{ itemId: '789', quantity: 3, unitPrice: 100 }],
        billingAddress: { line1: 'New Address' },
        paymentMethodId: 'PM-002',
        paymentRefNum: 'NEW-REF',
      });

      expect(restClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        expect.objectContaining({
          Id: '2001',
          SyncToken: '0',
          sparse: true,
          TxnDate: '2024-01-20',
        }),
      );
    });
  });

  describe('void', () => {
    it('should void sales receipt successfully', async () => {
      restClient.post.mockResolvedValue({
        success: true,
        data: { SalesReceipt: mockSalesReceipt },
        metadata: mockMetadata,
      });

      const result = await service.void(mockConfig, mockCredentials, '2001', '0');

      expect(result.success).toBe(true);
      expect(restClient.post).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        { Id: '2001', SyncToken: '0' },
        { operation: 'void' },
      );
    });
  });

  describe('send', () => {
    it('should send sales receipt via email', async () => {
      const sentReceipt = { ...mockSalesReceipt, EmailStatus: 'Sent' };
      restClient.send.mockResolvedValue({
        success: true,
        data: { SalesReceipt: sentReceipt },
        metadata: mockMetadata,
      });

      const result = await service.send(
        mockConfig,
        mockCredentials,
        '2001',
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

    it('should send without email (use customer email)', async () => {
      restClient.send.mockResolvedValue({
        success: true,
        data: { SalesReceipt: mockSalesReceipt },
        metadata: mockMetadata,
      });

      const result = await service.send(mockConfig, mockCredentials, '2001');

      expect(result.success).toBe(true);
      expect(restClient.send).toHaveBeenCalledWith(
        mockConfig,
        mockCredentials,
        expect.any(String),
        undefined,
      );
    });
  });
});
