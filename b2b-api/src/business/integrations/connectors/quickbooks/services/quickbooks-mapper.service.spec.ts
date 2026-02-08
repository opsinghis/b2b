import { Test, TestingModule } from '@nestjs/testing';
import { QuickBooksMapperService } from './quickbooks-mapper.service';
import {
  QuickBooksCustomer,
  QuickBooksItem,
  QuickBooksInvoice,
  QuickBooksSalesReceipt,
  QuickBooksPayment,
} from '../interfaces';

describe('QuickBooksMapperService', () => {
  let service: QuickBooksMapperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuickBooksMapperService],
    }).compile();

    service = module.get<QuickBooksMapperService>(QuickBooksMapperService);
  });

  describe('mapCustomerToCanonical', () => {
    it('should map QuickBooks customer to canonical customer', () => {
      const qbCustomer: QuickBooksCustomer = {
        Id: '123',
        SyncToken: '0',
        DisplayName: 'Test Company',
        CompanyName: 'Test Company Inc.',
        GivenName: 'John',
        FamilyName: 'Doe',
        PrimaryEmailAddr: { Address: 'john@test.com' },
        PrimaryPhone: { FreeFormNumber: '123-456-7890' },
        Mobile: { FreeFormNumber: '098-765-4321' },
        WebAddr: { URI: 'https://test.com' },
        Active: true,
        Taxable: true,
        Balance: 1000,
        CurrencyRef: { value: 'USD' },
        SalesTermRef: { name: 'Net 30' },
        BillAddr: {
          Line1: '123 Main St',
          City: 'Anytown',
          CountrySubDivisionCode: 'CA',
          PostalCode: '12345',
          Country: 'USA',
        },
        MetaData: {
          CreateTime: '2024-01-01T00:00:00Z',
          LastUpdatedTime: '2024-01-15T00:00:00Z',
        },
      };

      const result = service.mapCustomerToCanonical(qbCustomer);

      expect(result.id).toBe('123');
      expect(result.name).toBe('Test Company');
      expect(result.type).toBe('business');
      expect(result.email).toBe('john@test.com');
      expect(result.phone).toBe('123-456-7890');
      expect(result.mobile).toBe('098-765-4321');
      expect(result.website).toBe('https://test.com');
      expect(result.status).toBe('active');
      expect(result.currency).toBe('USD');
      expect(result.paymentTerms).toBe('Net 30');
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0].line1).toBe('123 Main St');
    });

    it('should map inactive customer correctly', () => {
      const qbCustomer: QuickBooksCustomer = {
        Id: '123',
        DisplayName: 'Inactive Customer',
        Active: false,
      };

      const result = service.mapCustomerToCanonical(qbCustomer);

      expect(result.status).toBe('inactive');
    });

    it('should map individual customer type correctly', () => {
      const qbCustomer: QuickBooksCustomer = {
        Id: '123',
        DisplayName: 'John Doe',
        GivenName: 'John',
        FamilyName: 'Doe',
        // No CompanyName = individual
      };

      const result = service.mapCustomerToCanonical(qbCustomer);

      expect(result.type).toBe('individual');
    });
  });

  describe('mapItemToCanonical', () => {
    it('should map QuickBooks item to canonical product', () => {
      const qbItem: QuickBooksItem = {
        Id: '456',
        SyncToken: '0',
        Name: 'Test Product',
        Description: 'A test product description',
        Sku: 'TEST-SKU-001',
        Active: true,
        UnitPrice: 99.99,
        PurchaseCost: 49.99,
        Type: 'Inventory',
        TrackQtyOnHand: true,
        QtyOnHand: 100,
        Taxable: true,
        MetaData: {
          CreateTime: '2024-01-01T00:00:00Z',
          LastUpdatedTime: '2024-01-15T00:00:00Z',
        },
      };

      const result = service.mapItemToCanonical(qbItem);

      expect(result.id).toBe('456');
      expect(result.sku).toBe('TEST-SKU-001');
      expect(result.name).toBe('Test Product');
      expect(result.description).toBe('A test product description');
      expect(result.type).toBe('inventory');
      expect(result.status).toBe('active');
      expect(result.price).toBe(99.99);
      expect(result.cost).toBe(49.99);
      expect(result.quantityOnHand).toBe(100);
      expect(result.isStockItem).toBe(true);
    });

    it('should map service item type correctly', () => {
      const qbItem: QuickBooksItem = {
        Id: '789',
        Name: 'Consulting Service',
        Type: 'Service',
        UnitPrice: 150,
      };

      const result = service.mapItemToCanonical(qbItem);

      expect(result.type).toBe('service');
      expect(result.isStockItem).toBe(false);
    });

    it('should map inactive item correctly', () => {
      const qbItem: QuickBooksItem = {
        Id: '789',
        Name: 'Discontinued Product',
        Active: false,
      };

      const result = service.mapItemToCanonical(qbItem);

      expect(result.status).toBe('inactive');
    });
  });

  describe('mapInvoiceToCanonical', () => {
    it('should map QuickBooks invoice to canonical invoice', () => {
      const qbInvoice: QuickBooksInvoice = {
        Id: '1001',
        SyncToken: '0',
        DocNumber: 'INV-001',
        TxnDate: '2024-01-15',
        DueDate: '2024-02-15',
        CustomerRef: { value: '123', name: 'Test Customer' },
        TotalAmt: 1199.99,
        Balance: 599.99,
        CurrencyRef: { value: 'USD' },
        TxnTaxDetail: { TotalTax: 100 },
        Line: [
          {
            Id: '1',
            LineNum: 1,
            DetailType: 'SalesItemLineDetail',
            Amount: 999.99,
            Description: 'Product 1',
            SalesItemLineDetail: {
              ItemRef: { value: '456', name: 'Test Product' },
              Qty: 1,
              UnitPrice: 999.99,
            },
          },
          {
            Id: '2',
            LineNum: 2,
            DetailType: 'DiscountLineDetail',
            Amount: 100,
          },
        ],
        BillAddr: {
          Line1: '123 Main St',
          City: 'Anytown',
          PostalCode: '12345',
        },
        MetaData: {
          CreateTime: '2024-01-15T00:00:00Z',
          LastUpdatedTime: '2024-01-15T00:00:00Z',
        },
      };

      const result = service.mapInvoiceToCanonical(qbInvoice);

      expect(result.id).toBe('1001');
      expect(result.invoiceNumber).toBe('INV-001');
      expect(result.customerId).toBe('123');
      expect(result.customerName).toBe('Test Customer');
      expect(result.status).toBe('partial'); // Has balance but not full amount
      expect(result.total).toBe(1199.99);
      expect(result.amountDue).toBe(599.99);
      expect(result.amountPaid).toBe(600);
      expect(result.tax).toBe(100);
      expect(result.discount).toBe(100);
      expect(result.items).toHaveLength(1); // Only SalesItemLineDetail items
    });

    it('should map paid invoice status correctly', () => {
      const qbInvoice: QuickBooksInvoice = {
        Id: '1002',
        TotalAmt: 500,
        Balance: 0,
        CustomerRef: { value: '123' },
        Line: [],
      };

      const result = service.mapInvoiceToCanonical(qbInvoice);

      expect(result.status).toBe('paid');
    });

    it('should map unpaid invoice status correctly', () => {
      const qbInvoice: QuickBooksInvoice = {
        Id: '1003',
        TotalAmt: 500,
        Balance: 500,
        CustomerRef: { value: '123' },
        Line: [],
      };

      const result = service.mapInvoiceToCanonical(qbInvoice);

      expect(result.status).toBe('unpaid');
    });
  });

  describe('mapSalesReceiptToCanonical', () => {
    it('should map QuickBooks sales receipt to canonical order', () => {
      const qbSalesReceipt: QuickBooksSalesReceipt = {
        Id: '2001',
        SyncToken: '0',
        DocNumber: 'SR-001',
        TxnDate: '2024-01-15',
        CustomerRef: { value: '123', name: 'Test Customer' },
        TotalAmt: 599.99,
        CurrencyRef: { value: 'USD' },
        TxnTaxDetail: { TotalTax: 50 },
        PaymentMethodRef: { name: 'Credit Card' },
        PaymentRefNum: 'CC-12345',
        Line: [
          {
            Id: '1',
            LineNum: 1,
            DetailType: 'SalesItemLineDetail',
            Amount: 499.99,
            Description: 'Product 1',
            SalesItemLineDetail: {
              ItemRef: { value: '456', name: 'Test Product' },
              Qty: 2,
              UnitPrice: 249.99,
            },
          },
        ],
        ShipDate: '2024-01-20',
        TrackingNum: 'TRACK123',
        MetaData: {
          CreateTime: '2024-01-15T00:00:00Z',
          LastUpdatedTime: '2024-01-15T00:00:00Z',
        },
      };

      const result = service.mapSalesReceiptToCanonical(qbSalesReceipt);

      expect(result.id).toBe('2001');
      expect(result.orderNumber).toBe('SR-001');
      expect(result.customerId).toBe('123');
      expect(result.customerName).toBe('Test Customer');
      expect(result.status).toBe('completed');
      expect(result.total).toBe(599.99);
      expect(result.tax).toBe(50);
      expect(result.currency).toBe('USD');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(2);
      expect(result.metadata?.paymentMethod).toBe('Credit Card');
      expect(result.metadata?.trackingNum).toBe('TRACK123');
    });
  });

  describe('mapPaymentToCanonical', () => {
    it('should map QuickBooks payment to canonical payment', () => {
      const qbPayment: QuickBooksPayment = {
        Id: '3001',
        SyncToken: '0',
        TxnDate: '2024-01-20',
        TotalAmt: 500,
        CustomerRef: { value: '123', name: 'Test Customer' },
        CurrencyRef: { value: 'USD' },
        PaymentMethodRef: { name: 'Check' },
        PaymentRefNum: 'CHK-12345',
        UnappliedAmt: 0,
        Line: [
          {
            Amount: 500,
            LinkedTxn: [{ TxnId: '1001', TxnType: 'Invoice' }],
          },
        ],
        MetaData: {
          CreateTime: '2024-01-20T00:00:00Z',
          LastUpdatedTime: '2024-01-20T00:00:00Z',
        },
      };

      const result = service.mapPaymentToCanonical(qbPayment);

      expect(result.id).toBe('3001');
      expect(result.customerId).toBe('123');
      expect(result.customerName).toBe('Test Customer');
      expect(result.amount).toBe(500);
      expect(result.currency).toBe('USD');
      expect(result.paymentMethod).toBe('Check');
      expect(result.referenceNumber).toBe('CHK-12345');
      expect(result.status).toBe('applied');
      expect(result.appliedInvoices).toHaveLength(1);
      expect(result.appliedInvoices[0].invoiceId).toBe('1001');
      expect(result.appliedInvoices[0].amount).toBe(500);
    });

    it('should map unapplied payment status correctly', () => {
      const qbPayment: QuickBooksPayment = {
        Id: '3002',
        TotalAmt: 500,
        CustomerRef: { value: '123' },
        UnappliedAmt: 500,
      };

      const result = service.mapPaymentToCanonical(qbPayment);

      expect(result.status).toBe('unapplied');
    });

    it('should map partial payment status correctly', () => {
      const qbPayment: QuickBooksPayment = {
        Id: '3003',
        TotalAmt: 500,
        CustomerRef: { value: '123' },
        UnappliedAmt: 200,
      };

      const result = service.mapPaymentToCanonical(qbPayment);

      expect(result.status).toBe('partial');
    });
  });

  describe('mapAddressToCanonical', () => {
    it('should map QuickBooks address to canonical address', () => {
      const qbAddress = {
        Line1: '123 Main Street',
        Line2: 'Suite 100',
        City: 'Anytown',
        CountrySubDivisionCode: 'CA',
        PostalCode: '12345',
        Country: 'USA',
      };

      const result = service.mapAddressToCanonical(qbAddress, 'billing');

      expect(result.type).toBe('billing');
      expect(result.line1).toBe('123 Main Street');
      expect(result.line2).toBe('Suite 100');
      expect(result.city).toBe('Anytown');
      expect(result.state).toBe('CA');
      expect(result.postalCode).toBe('12345');
      expect(result.country).toBe('USA');
    });
  });
});
