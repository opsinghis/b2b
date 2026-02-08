import { Test, TestingModule } from '@nestjs/testing';
import { OracleMapperService } from './oracle-mapper.service';
import {
  OracleSalesOrder,
  OracleSalesOrderLine,
  OracleCustomer,
  OracleContact,
  OracleAddress,
  OracleItem,
  OracleInvoice,
  OracleInvoiceLine,
  OracleSalesOrderStatus,
} from '../interfaces';

describe('OracleMapperService', () => {
  let service: OracleMapperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OracleMapperService],
    }).compile();

    service = module.get<OracleMapperService>(OracleMapperService);
  });

  describe('mapSalesOrderToCanonical', () => {
    const mockOrder: OracleSalesOrder = {
      OrderId: 12345,
      OrderNumber: 'ORD-001',
      SourceTransactionNumber: 'SRC-001',
      SourceTransactionSystem: 'B2B_PLATFORM',
      OrderedDate: '2024-01-15T10:30:00Z',
      RequestedFulfillmentDate: '2024-01-20T00:00:00Z',
      RequestedShipDate: '2024-01-19T00:00:00Z',
      CustomerPONumber: 'PO-12345',
      TransactionalCurrencyCode: 'USD',
      BuyingPartyId: 1001,
      BuyingPartyName: 'Acme Corp',
      BuyingPartyNumber: 'CUST-001',
      BillToCustomerAccountId: 2001,
      BillToCustomerAccountNumber: 'ACC-001',
      SellingBusinessUnitId: 3001,
      SellingBusinessUnitName: 'US Sales',
      StatusCode: 'BOOKED',
      FulfillmentStatus: 'SHIPPED',
      TotalAmount: 1000,
      TaxAmount: 80,
      FreightAmount: 20,
      DiscountAmount: 50,
      CreationDate: '2024-01-15T10:30:00Z',
      LastUpdateDate: '2024-01-16T14:00:00Z',
      lines: [
        {
          OrderLineId: 100,
          LineNumber: 1,
          ProductId: 5001,
          ProductNumber: 'PROD-001',
          ProductDescription: 'Test Product',
          OrderedQuantity: 10,
          OrderedUOMCode: 'EA',
          UnitSellingPrice: 95,
          ExtendedAmount: 950,
          TaxAmount: 76,
          DiscountAmount: 0,
          LineStatus: 'SHIPPED',
        },
      ],
    };

    it('should map order ID and number', () => {
      const result = service.mapSalesOrderToCanonical(mockOrder);

      expect(result.id).toBe('12345');
      expect(result.orderNumber).toBe('ORD-001');
      expect(result.externalId).toBe('12345');
    });

    it('should map customer information', () => {
      const result = service.mapSalesOrderToCanonical(mockOrder);

      expect(result.customerId).toBe('2001');
      expect(result.customerName).toBe('Acme Corp');
    });

    it('should map order status correctly', () => {
      const result = service.mapSalesOrderToCanonical(mockOrder);

      expect(result.status).toBe('shipped');
    });

    it('should map dates', () => {
      const result = service.mapSalesOrderToCanonical(mockOrder);

      expect(result.orderDate).toBeInstanceOf(Date);
      expect(result.requestedDeliveryDate).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should map financial amounts', () => {
      const result = service.mapSalesOrderToCanonical(mockOrder);

      expect(result.total).toBe(1000);
      expect(result.tax).toBe(80);
      expect(result.shipping).toBe(20);
      expect(result.discount).toBe(50);
      expect(result.currency).toBe('USD');
    });

    it('should map order lines', () => {
      const result = service.mapSalesOrderToCanonical(mockOrder);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('100');
      expect(result.items[0].sku).toBe('PROD-001');
      expect(result.items[0].quantity).toBe(10);
      expect(result.items[0].unitPrice).toBe(95);
    });

    it('should include metadata', () => {
      const result = service.mapSalesOrderToCanonical(mockOrder);

      expect(result.metadata?.source).toBe('oracle_erp_cloud');
      expect(result.metadata?.sourceTransactionNumber).toBe('SRC-001');
      expect(result.metadata?.businessUnitId).toBe(3001);
    });

    it('should handle missing optional fields', () => {
      const minimalOrder: OracleSalesOrder = {
        OrderId: 1,
      };

      const result = service.mapSalesOrderToCanonical(minimalOrder);

      expect(result.id).toBe('1');
      expect(result.orderNumber).toBe('');
      expect(result.items).toHaveLength(0);
    });

    describe('status mapping', () => {
      const statusTests = [
        { statusCode: 'DRAFT', expected: 'draft' },
        { statusCode: 'OPEN', expected: 'open' },
        { statusCode: 'BOOKED', fulfillmentStatus: undefined, expected: 'confirmed' },
        { statusCode: 'CLOSED', expected: 'closed' },
        { statusCode: 'CANCELLED', expected: 'cancelled' },
        { statusCode: 'AWAITING_SHIPPING', expected: 'awaiting_shipping' },
        { statusCode: 'FULFILLED', expected: 'fulfilled' },
      ];

      statusTests.forEach(({ statusCode, fulfillmentStatus, expected }) => {
        it(`should map ${statusCode} to ${expected}`, () => {
          const order: OracleSalesOrder = {
            OrderId: 1,
            StatusCode: statusCode,
            FulfillmentStatus: fulfillmentStatus,
          };

          const result = service.mapSalesOrderToCanonical(order);
          expect(result.status).toBe(expected);
        });
      });
    });
  });

  describe('mapSalesOrderLineToCanonical', () => {
    const mockLine: OracleSalesOrderLine = {
      OrderLineId: 100,
      LineNumber: 1,
      ProductId: 5001,
      ProductNumber: 'ITEM-001',
      ProductDescription: 'Test Item',
      OrderedQuantity: 5,
      OrderedUOMCode: 'EA',
      UnitSellingPrice: 100,
      UnitListPrice: 120,
      ExtendedAmount: 500,
      TaxAmount: 40,
      DiscountAmount: 10,
      LineStatus: 'SHIPPED',
      SourceLineNumber: '1',
    };

    it('should map line fields correctly', () => {
      const result = service.mapSalesOrderLineToCanonical(mockLine);

      expect(result.id).toBe('100');
      expect(result.productId).toBe('5001');
      expect(result.sku).toBe('ITEM-001');
      expect(result.name).toBe('Test Item');
      expect(result.quantity).toBe(5);
      expect(result.unitPrice).toBe(100);
      expect(result.total).toBe(500);
      expect(result.tax).toBe(40);
      expect(result.discount).toBe(10);
      expect(result.unit).toBe('EA');
      expect(result.lineNumber).toBe(1);
    });

    it('should include metadata', () => {
      const result = service.mapSalesOrderLineToCanonical(mockLine);

      expect(result.metadata?.lineStatus).toBe('SHIPPED');
      expect(result.metadata?.sourceLineNumber).toBe('1');
    });
  });

  describe('mapCustomerToCanonical', () => {
    const mockCustomer: OracleCustomer = {
      PartyId: 1001,
      PartyNumber: 'P-001',
      PartyName: 'Acme Corporation',
      PartyType: 'ORGANIZATION',
      CustomerAccountId: 2001,
      CustomerAccountNumber: 'ACC-001',
      CustomerAccountStatus: 'A',
      CustomerType: 'B2B',
      CustomerClassCode: 'ENTERPRISE',
      PrimaryEmailAddress: 'contact@acme.com',
      PrimaryPhoneNumber: '+1-555-123-4567',
      PrimaryURL: 'https://acme.com',
      CurrencyCode: 'USD',
      PaymentTermsCode: 'NET30',
      PaymentTermsName: 'Net 30 Days',
      CreditLimit: 50000,
      CreditHold: false,
      SalesPersonId: 3001,
      SalesPersonName: 'John Doe',
      Addresses: [
        {
          AddressId: 4001,
          Address1: '123 Main St',
          City: 'New York',
          State: 'NY',
          PostalCode: '10001',
          Country: 'US',
          IsPrimary: true,
        },
      ],
      CreationDate: '2024-01-01T00:00:00Z',
      LastUpdateDate: '2024-01-15T00:00:00Z',
    };

    it('should map customer fields correctly', () => {
      const result = service.mapCustomerToCanonical(mockCustomer);

      expect(result.id).toBe('2001');
      expect(result.customerNumber).toBe('ACC-001');
      expect(result.name).toBe('Acme Corporation');
      expect(result.type).toBe('business');
      expect(result.email).toBe('contact@acme.com');
      expect(result.phone).toBe('+1-555-123-4567');
      expect(result.website).toBe('https://acme.com');
      expect(result.currency).toBe('USD');
    });

    it('should map status correctly', () => {
      const result = service.mapCustomerToCanonical(mockCustomer);
      expect(result.status).toBe('active');

      const inactiveCustomer = { ...mockCustomer, CustomerAccountStatus: 'I' };
      const inactiveResult = service.mapCustomerToCanonical(inactiveCustomer);
      expect(inactiveResult.status).toBe('inactive');
    });

    it('should map addresses', () => {
      const result = service.mapCustomerToCanonical(mockCustomer);

      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0].line1).toBe('123 Main St');
      expect(result.addresses[0].city).toBe('New York');
      expect(result.addresses[0].country).toBe('US');
    });

    it('should map credit information', () => {
      const result = service.mapCustomerToCanonical(mockCustomer);

      expect(result.creditLimit).toBe(50000);
      expect(result.creditHold).toBe(false);
      expect(result.paymentTerms).toBe('Net 30 Days');
    });

    it('should include metadata', () => {
      const result = service.mapCustomerToCanonical(mockCustomer);

      expect(result.metadata?.source).toBe('oracle_erp_cloud');
      expect(result.metadata?.partyId).toBe(1001);
      expect(result.metadata?.customerType).toBe('B2B');
    });

    it('should map PERSON party type as individual', () => {
      const personCustomer = { ...mockCustomer, PartyType: 'PERSON' };
      const result = service.mapCustomerToCanonical(personCustomer);
      expect(result.type).toBe('individual');
    });
  });

  describe('mapContactToCanonical', () => {
    const mockContact: OracleContact = {
      ContactId: 5001,
      ContactNumber: 'CNT-001',
      FirstName: 'Jane',
      LastName: 'Smith',
      FullName: 'Jane Smith',
      JobTitle: 'Purchasing Manager',
      EmailAddress: 'jane.smith@acme.com',
      PhoneNumber: '+1-555-987-6543',
      MobileNumber: '+1-555-111-2222',
      Status: 'A',
      IsPrimary: true,
    };

    it('should map contact as individual customer', () => {
      const result = service.mapContactToCanonical(mockContact);

      expect(result.id).toBe('5001');
      expect(result.type).toBe('individual');
      expect(result.name).toBe('Jane Smith');
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.email).toBe('jane.smith@acme.com');
      expect(result.phone).toBe('+1-555-987-6543');
      expect(result.mobile).toBe('+1-555-111-2222');
    });

    it('should map status', () => {
      const result = service.mapContactToCanonical(mockContact);
      expect(result.status).toBe('active');

      const inactiveContact = { ...mockContact, Status: 'I' };
      const inactiveResult = service.mapContactToCanonical(inactiveContact);
      expect(inactiveResult.status).toBe('inactive');
    });
  });

  describe('mapAddressToCanonical', () => {
    const mockAddress: OracleAddress = {
      AddressId: 4001,
      AddressNumber: 'ADDR-001',
      AddressType: 'BILL_TO',
      Address1: '123 Main St',
      Address2: 'Suite 100',
      Address3: 'Building A',
      City: 'San Francisco',
      State: 'CA',
      PostalCode: '94105',
      Country: 'US',
      IsPrimary: true,
    };

    it('should map address fields', () => {
      const result = service.mapAddressToCanonical(mockAddress);

      expect(result.type).toBe('BILL_TO');
      expect(result.line1).toBe('123 Main St');
      expect(result.line2).toBe('Suite 100');
      expect(result.line3).toBe('Building A');
      expect(result.city).toBe('San Francisco');
      expect(result.state).toBe('CA');
      expect(result.postalCode).toBe('94105');
      expect(result.country).toBe('US');
    });

    it('should use primary as type when address type is not set', () => {
      const addressWithoutType: OracleAddress = {
        ...mockAddress,
        AddressType: undefined,
      };

      const result = service.mapAddressToCanonical(addressWithoutType);
      expect(result.type).toBe('primary');
    });
  });

  describe('mapItemToCanonical', () => {
    const mockItem: OracleItem = {
      InventoryItemId: 6001,
      ItemNumber: 'SKU-001',
      ItemDescription: 'Test Product',
      LongDescription: 'A detailed description of the test product',
      ItemType: 'FINISHED_GOODS',
      ItemStatus: 'Active',
      PrimaryUOMCode: 'EA',
      OrganizationId: 7001,
      OrganizationCode: 'US_ORG',
      ListPrice: 99.99,
      StandardCost: 50.0,
      ShippableFlag: true,
      OrderableFlag: true,
      StockEnabledFlag: true,
      PurchasingEnabledFlag: true,
      Weight: 2.5,
      WeightUOMCode: 'LB',
      CreationDate: '2024-01-01T00:00:00Z',
      LastUpdateDate: '2024-01-15T00:00:00Z',
    };

    it('should map item fields', () => {
      const result = service.mapItemToCanonical(mockItem);

      expect(result.id).toBe('6001');
      expect(result.sku).toBe('SKU-001');
      expect(result.name).toBe('Test Product');
      expect(result.description).toBe('A detailed description of the test product');
      expect(result.type).toBe('finished_goods');
      expect(result.status).toBe('active');
      expect(result.price).toBe(99.99);
      expect(result.cost).toBe(50.0);
      expect(result.unit).toBe('EA');
      expect(result.isStockItem).toBe(true);
    });

    it('should include metadata', () => {
      const result = service.mapItemToCanonical(mockItem);

      expect(result.metadata?.source).toBe('oracle_erp_cloud');
      expect(result.metadata?.organizationId).toBe(7001);
      expect(result.metadata?.organizationCode).toBe('US_ORG');
      expect(result.metadata?.shippable).toBe(true);
      expect(result.metadata?.orderable).toBe(true);
    });

    it('should map item type correctly', () => {
      const typeTests = [
        { itemType: 'FINISHED_GOODS', expected: 'finished_goods' },
        { itemType: 'RAW_MATERIALS', expected: 'raw_material' },
        { itemType: 'SUBASSEMBLY', expected: 'subassembly' },
        { itemType: 'PURCHASED', expected: 'purchased' },
        { itemType: 'SERVICE', expected: 'service' },
      ];

      typeTests.forEach(({ itemType, expected }) => {
        const item = { ...mockItem, ItemType: itemType };
        const result = service.mapItemToCanonical(item);
        expect(result.type).toBe(expected);
      });
    });
  });

  describe('mapInvoiceToCanonical', () => {
    const mockInvoice: OracleInvoice = {
      CustomerTrxId: 8001,
      TransactionNumber: 'INV-001',
      TransactionDate: '2024-01-20T00:00:00Z',
      TransactionTypeName: 'Invoice',
      CustomerAccountId: 2001,
      CustomerAccountNumber: 'ACC-001',
      CustomerName: 'Acme Corp',
      CurrencyCode: 'USD',
      InvoicedAmount: 1000,
      TaxAmount: 80,
      FreightAmount: 20,
      DueDate: '2024-02-19T00:00:00Z',
      PaymentTermsName: 'Net 30 Days',
      Status: 'COMPLETE',
      StatusCode: 'COMPLETE',
      BalanceDue: 1100,
      AmountApplied: 0,
      SalesOrderId: 12345,
      SalesOrderNumber: 'ORD-001',
      BusinessUnitId: 3001,
      BusinessUnitName: 'US Sales',
      Lines: [
        {
          CustomerTrxLineId: 9001,
          LineNumber: 1,
          InventoryItemId: 6001,
          ItemNumber: 'SKU-001',
          Description: 'Test Product',
          Quantity: 10,
          UnitSellingPrice: 100,
          ExtendedAmount: 1000,
          TaxAmount: 80,
          UOMCode: 'EA',
        },
      ],
      CreationDate: '2024-01-20T00:00:00Z',
      LastUpdateDate: '2024-01-20T00:00:00Z',
    };

    it('should map invoice fields', () => {
      const result = service.mapInvoiceToCanonical(mockInvoice);

      expect(result.id).toBe('8001');
      expect(result.invoiceNumber).toBe('INV-001');
      expect(result.orderId).toBe('12345');
      expect(result.customerId).toBe('2001');
      expect(result.customerName).toBe('Acme Corp');
      expect(result.status).toBe('complete');
      expect(result.currency).toBe('USD');
    });

    it('should map financial amounts', () => {
      const result = service.mapInvoiceToCanonical(mockInvoice);

      expect(result.subtotal).toBe(1000);
      expect(result.tax).toBe(80);
      expect(result.total).toBe(1100); // 1000 + 80 + 20
      expect(result.amountDue).toBe(1100);
      expect(result.amountPaid).toBe(0);
    });

    it('should map dates', () => {
      const result = service.mapInvoiceToCanonical(mockInvoice);

      expect(result.invoiceDate).toBeInstanceOf(Date);
      expect(result.dueDate).toBeInstanceOf(Date);
    });

    it('should map invoice lines', () => {
      const result = service.mapInvoiceToCanonical(mockInvoice);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('9001');
      expect(result.items[0].sku).toBe('SKU-001');
      expect(result.items[0].quantity).toBe(10);
    });

    it('should include metadata', () => {
      const result = service.mapInvoiceToCanonical(mockInvoice);

      expect(result.metadata?.source).toBe('oracle_erp_cloud');
      expect(result.metadata?.transactionType).toBe('Invoice');
      expect(result.metadata?.salesOrderNumber).toBe('ORD-001');
    });
  });

  describe('mapInvoiceLineToCanonical', () => {
    const mockLine: OracleInvoiceLine = {
      CustomerTrxLineId: 9001,
      LineNumber: 1,
      InventoryItemId: 6001,
      ItemNumber: 'SKU-001',
      ItemDescription: 'Test Item',
      Description: 'Line Description',
      Quantity: 5,
      UnitSellingPrice: 100,
      ExtendedAmount: 500,
      TaxAmount: 40,
      UOMCode: 'EA',
    };

    it('should map invoice line fields', () => {
      const result = service.mapInvoiceLineToCanonical(mockLine);

      expect(result.id).toBe('9001');
      expect(result.productId).toBe('6001');
      expect(result.sku).toBe('SKU-001');
      expect(result.name).toBe('Line Description');
      expect(result.quantity).toBe(5);
      expect(result.unitPrice).toBe(100);
      expect(result.total).toBe(500);
      expect(result.tax).toBe(40);
      expect(result.unit).toBe('EA');
      expect(result.lineNumber).toBe(1);
    });
  });

  describe('reverse mappings', () => {
    describe('mapCanonicalToSalesOrder', () => {
      it('should map canonical order to Oracle payload', () => {
        const canonical = {
          orderNumber: 'ORD-001',
          requestedDeliveryDate: new Date('2024-01-20'),
          notes: 'PO: PO-12345',
        };

        const result = service.mapCanonicalToSalesOrder(canonical);

        expect(result.SourceTransactionNumber).toBe('ORD-001');
        expect(result.RequestedFulfillmentDate).toBeDefined();
        expect(result.CustomerPONumber).toBe('PO-12345');
      });
    });

    describe('mapCanonicalToCustomer', () => {
      it('should map canonical customer to Oracle payload', () => {
        const canonical = {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '+1-555-123-4567',
          website: 'https://example.com',
          creditLimit: 10000,
          currency: 'USD',
          addresses: [
            {
              type: 'primary',
              line1: '123 Main St',
              city: 'New York',
              state: 'NY',
              postalCode: '10001',
              country: 'US',
            },
          ],
        };

        const result = service.mapCanonicalToCustomer(canonical);

        expect(result.PartyName).toBe('Test Customer');
        expect(result.PrimaryEmailAddress).toBe('test@example.com');
        expect(result.PrimaryPhoneNumber).toBe('+1-555-123-4567');
        expect(result.CreditLimit).toBe(10000);
        expect(result.addresses).toHaveLength(1);
      });
    });
  });
});
