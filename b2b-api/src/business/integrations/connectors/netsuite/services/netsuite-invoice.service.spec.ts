import { NetSuiteInvoiceService, NetSuiteInvoiceStatusId } from './netsuite-invoice.service';
import { NetSuiteRestClientService } from './netsuite-rest-client.service';

describe('NetSuiteInvoiceService', () => {
  let service: NetSuiteInvoiceService;
  let restClient: jest.Mocked<NetSuiteRestClientService>;

  const mockInvoice = {
    id: '123',
    tranid: 'INV001',
    entity: { id: '456', refName: 'Test Customer' },
    trandate: '2024-01-15',
    duedate: '2024-02-15',
    status: { id: NetSuiteInvoiceStatusId.OPEN, refName: 'Open' },
    total: 1000,
    amountdue: 1000,
    amountpaid: 0,
    currency: { id: '1', refName: 'USD' },
  };

  beforeEach(() => {
    restClient = {
      get: jest.fn(),
      executeSuiteQL: jest.fn(),
    } as unknown as jest.Mocked<NetSuiteRestClientService>;

    service = new NetSuiteInvoiceService(restClient);
  });

  describe('getById', () => {
    it('should get invoice by ID', async () => {
      restClient.get.mockResolvedValue({ data: mockInvoice });

      const result = await service.getById('123');

      expect(restClient.get).toHaveBeenCalledWith('invoice/123', { expandSubResources: 'true' });
      expect(result).toEqual(mockInvoice);
    });
  });

  describe('getByExternalId', () => {
    it('should find invoice by external ID', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '123' }],
      });
      restClient.get.mockResolvedValue({ data: mockInvoice });

      const result = await service.getByExternalId('EXT-INV-001');

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("custbody_external_id = 'EXT-INV-001'"),
        { limit: 1 },
      );
      expect(result).toEqual(mockInvoice);
    });

    it('should return null when not found', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      const result = await service.getByExternalId('NON-EXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('getByTranId', () => {
    it('should find invoice by transaction ID', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '123' }],
      });
      restClient.get.mockResolvedValue({ data: mockInvoice });

      const result = await service.getByTranId('INV001');

      expect(restClient.executeSuiteQL).toHaveBeenCalled();
      expect(result).toEqual(mockInvoice);
    });

    it('should return null when not found', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      const result = await service.getByTranId('NON-EXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should list invoices', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [mockInvoice],
        totalResults: 1,
      });

      const result = await service.list();

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('FROM transaction'),
        undefined,
      );
      expect(result.items).toHaveLength(1);
    });

    it('should filter by status', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({ status: NetSuiteInvoiceStatusId.OPEN });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining(`status = '${NetSuiteInvoiceStatusId.OPEN}'`),
        undefined,
      );
    });

    it('should filter by customer ID', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({ customerId: '456' });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('entity = 456'),
        undefined,
      );
    });

    it('should filter by date range', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("trandate >= TO_DATE('2024-01-01'"),
        undefined,
      );
      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("trandate <= TO_DATE('2024-01-31'"),
        undefined,
      );
    });

    it('should filter by amount range', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({
        minAmount: 100,
        maxAmount: 1000,
      });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('total >= 100'),
        undefined,
      );
      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('total <= 1000'),
        undefined,
      );
    });

    it('should filter by hasBalance', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [], totalResults: 0 });

      await service.list({ hasBalance: true });

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('amountremaining > 0'),
        undefined,
      );
    });
  });

  describe('getModifiedSince', () => {
    it('should get invoices modified since date', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [mockInvoice],
        totalResults: 1,
      });

      const result = await service.getModifiedSince('2024-01-01T00:00:00');

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining("lastmodifieddate >= TO_DATE('2024-01-01T00:00:00'"),
        undefined,
      );
      expect(result.items).toHaveLength(1);
    });
  });

  describe('getBySalesOrder', () => {
    it('should get all invoices for a sales order', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [{ id: '123' }],
      });
      restClient.get.mockResolvedValue({ data: mockInvoice });

      const result = await service.getBySalesOrder('789');

      expect(restClient.executeSuiteQL).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no invoices', async () => {
      restClient.executeSuiteQL.mockResolvedValue({ items: [] });

      const result = await service.getBySalesOrder('789');

      expect(result).toHaveLength(0);
    });
  });

  describe('getOpenInvoices', () => {
    it('should get all open invoices', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [mockInvoice],
        totalResults: 1,
      });

      const result = await service.getOpenInvoices();

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('amountremaining > 0'),
        undefined,
      );
      expect(result.items).toHaveLength(1);
    });
  });

  describe('getOverdueInvoices', () => {
    it('should get overdue invoices', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [mockInvoice],
        totalResults: 1,
      });

      const result = await service.getOverdueInvoices();

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('amountremaining > 0'),
        undefined,
      );
      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('duedate < SYSDATE'),
        undefined,
      );
      expect(result.items).toHaveLength(1);
    });
  });

  describe('getAgingSummary', () => {
    it('should get AR aging summary for a customer', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [
          {
            current: 1000,
            days_1_30: 500,
            days_31_60: 200,
            days_61_90: 100,
            over_90: 50,
            total: 1850,
          },
        ],
        totalResults: 1,
      });

      const result = await service.getAgingSummary('456');

      expect(restClient.executeSuiteQL).toHaveBeenCalledWith(
        expect.stringContaining('entity = 456'),
        { limit: 1 },
      );
      expect(result.total).toBe(1850);
    });
  });

  describe('getPaymentHistory', () => {
    it('should get payment history for an invoice', async () => {
      restClient.executeSuiteQL.mockResolvedValue({
        items: [
          {
            paymentid: 'PMT001',
            paymentdate: '2024-01-20',
            amount: 500,
            paymentmethod: 'Check',
          },
        ],
        totalResults: 1,
      });

      const result = await service.getPaymentHistory('123');

      expect(restClient.executeSuiteQL).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });
});
