import { Test, TestingModule } from '@nestjs/testing';
import { SapMapperService, CanonicalOrderStatus } from './sap-mapper.service';
import {
  SapSalesOrder,
  SapBusinessPartner,
  SapProduct,
  SapBillingDocument,
  SapAtpCheckResponse,
} from '../interfaces';

describe('SapMapperService', () => {
  let service: SapMapperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SapMapperService],
    }).compile();

    service = module.get<SapMapperService>(SapMapperService);
  });

  describe('mapSalesOrderToCanonical', () => {
    it('should map SAP sales order to canonical order', () => {
      const sapOrder: SapSalesOrder = {
        SalesOrder: '1234567890',
        SalesOrderType: 'OR',
        SalesOrganization: '1000',
        DistributionChannel: '10',
        OrganizationDivision: '00',
        SoldToParty: 'CUST001',
        PurchaseOrderByCustomer: 'PO-12345',
        RequestedDeliveryDate: '2024-02-15',
        TotalNetAmount: '1500.00',
        TransactionCurrency: 'USD',
        OverallSDProcessStatus: 'A',
        OverallDeliveryStatus: '',
        OverallBillingStatus: '',
        CreationDate: '2024-02-01',
        to_Item: [
          {
            SalesOrder: '1234567890',
            SalesOrderItem: '000010',
            Material: 'MAT001',
            RequestedQuantity: '10',
            RequestedQuantityUnit: 'EA',
            NetAmount: '1500.00',
          },
        ],
      };

      const result = service.mapSalesOrderToCanonical(sapOrder);

      expect(result.externalId).toBe('1234567890');
      expect(result.orderNumber).toBe('1234567890');
      expect(result.type).toBe('OR');
      expect(result.status).toBe(CanonicalOrderStatus.CONFIRMED);
      expect(result.customerId).toBe('CUST001');
      expect(result.customerPO).toBe('PO-12345');
      expect(result.currency).toBe('USD');
      expect(result.totalAmount).toBe(1500);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId).toBe('MAT001');
      expect(result.items[0].quantity).toBe(10);
    });

    it('should map partially delivered order', () => {
      const sapOrder: SapSalesOrder = {
        SalesOrder: '1234567890',
        OverallSDProcessStatus: 'B',
        OverallDeliveryStatus: 'B',
        TransactionCurrency: 'USD',
      };

      const result = service.mapSalesOrderToCanonical(sapOrder);

      expect(result.status).toBe(CanonicalOrderStatus.SHIPPED);
    });

    it('should map fully delivered order', () => {
      const sapOrder: SapSalesOrder = {
        SalesOrder: '1234567890',
        OverallSDProcessStatus: 'C',
        OverallDeliveryStatus: 'C',
        TransactionCurrency: 'USD',
      };

      const result = service.mapSalesOrderToCanonical(sapOrder);

      expect(result.status).toBe(CanonicalOrderStatus.DELIVERED);
    });

    it('should map completed order', () => {
      const sapOrder: SapSalesOrder = {
        SalesOrder: '1234567890',
        OverallSDProcessStatus: 'C',
        OverallDeliveryStatus: '',
        TransactionCurrency: 'USD',
      };

      const result = service.mapSalesOrderToCanonical(sapOrder);

      expect(result.status).toBe(CanonicalOrderStatus.COMPLETED);
    });

    it('should handle missing optional fields', () => {
      const sapOrder: SapSalesOrder = {};

      const result = service.mapSalesOrderToCanonical(sapOrder);

      expect(result.customerId).toBe('');
      expect(result.currency).toBe('USD');
      expect(result.totalAmount).toBe(0);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('mapCanonicalToSalesOrderInput', () => {
    it('should map canonical order to SAP input format', () => {
      const canonicalOrder = {
        customerId: 'CUST001',
        customerPO: 'PO-12345',
        requestedDeliveryDate: new Date('2024-02-15'),
        currency: 'USD',
        totalAmount: 1500,
        type: 'OR',
        status: CanonicalOrderStatus.DRAFT,
        items: [
          {
            lineNumber: 10,
            productId: 'MAT001',
            sku: 'MAT001',
            quantity: 10,
            unit: 'EA',
            totalPrice: 1500,
          },
        ],
      };

      const sapConfig = {
        salesOrganization: '1000',
        distributionChannel: '10',
        division: '00',
      };

      const result = service.mapCanonicalToSalesOrderInput(canonicalOrder, sapConfig);

      expect(result.salesOrderType).toBe('OR');
      expect(result.salesOrganization).toBe('1000');
      expect(result.distributionChannel).toBe('10');
      expect(result.division).toBe('00');
      expect(result.soldToParty).toBe('CUST001');
      expect(result.purchaseOrderByCustomer).toBe('PO-12345');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].material).toBe('MAT001');
      expect(result.items[0].requestedQuantity).toBe(10);
      expect(result.items[0].requestedQuantityUnit).toBe('EA');
    });
  });

  describe('mapBusinessPartnerToCanonical', () => {
    it('should map SAP business partner (organization) to canonical customer', () => {
      const sapBp: SapBusinessPartner = {
        BusinessPartner: 'BP001',
        BusinessPartnerCategory: '2',
        OrganizationBPName1: 'Acme Corp',
        Language: 'EN',
        TaxNumber1: '123456789',
        VATRegistration: 'US123456',
        to_BusinessPartnerAddress: [
          {
            BusinessPartner: 'BP001',
            AddressID: '1',
            StreetName: '123 Main St',
            CityName: 'New York',
            PostalCode: '10001',
            Country: 'US',
            PhoneNumber: '+1-555-1234',
            EmailAddress: 'info@acme.com',
          },
        ],
      };

      const result = service.mapBusinessPartnerToCanonical(sapBp);

      expect(result.externalId).toBe('BP001');
      expect(result.type).toBe('organization');
      expect(result.name).toBe('Acme Corp');
      expect(result.taxId).toBe('123456789');
      expect(result.vatNumber).toBe('US123456');
      expect(result.language).toBe('EN');
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0].street).toBe('123 Main St');
      expect(result.addresses[0].city).toBe('New York');
      expect(result.addresses[0].country).toBe('US');
    });

    it('should map SAP business partner (person) to canonical customer', () => {
      const sapBp: SapBusinessPartner = {
        BusinessPartner: 'BP002',
        BusinessPartnerCategory: '1',
        FirstName: 'John',
        LastName: 'Doe',
        Language: 'EN',
      };

      const result = service.mapBusinessPartnerToCanonical(sapBp);

      expect(result.type).toBe('person');
      expect(result.name).toBe('John Doe');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('should handle missing addresses', () => {
      const sapBp: SapBusinessPartner = {
        BusinessPartner: 'BP003',
        BusinessPartnerCategory: '2',
        OrganizationBPName1: 'Test Corp',
      };

      const result = service.mapBusinessPartnerToCanonical(sapBp);

      expect(result.addresses).toHaveLength(0);
    });
  });

  describe('mapCanonicalToBusinessPartnerInput', () => {
    it('should map canonical customer (organization) to SAP input', () => {
      const canonicalCustomer = {
        type: 'organization' as const,
        name: 'Acme Corp',
        taxId: '123456789',
        vatNumber: 'US123456',
        language: 'EN',
        addresses: [
          {
            street: '123 Main St',
            city: 'New York',
            postalCode: '10001',
            country: 'US',
            phone: '+1-555-1234',
            email: 'info@acme.com',
          },
        ],
      };

      const result = service.mapCanonicalToBusinessPartnerInput(canonicalCustomer);

      expect(result.businessPartnerCategory).toBe('2');
      expect(result.organizationName1).toBe('Acme Corp');
      expect(result.taxNumber1).toBe('123456789');
      expect(result.vatRegistration).toBe('US123456');
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses![0].streetName).toBe('123 Main St');
    });

    it('should map canonical customer (person) to SAP input', () => {
      const canonicalCustomer = {
        type: 'person' as const,
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        addresses: [],
      };

      const result = service.mapCanonicalToBusinessPartnerInput(canonicalCustomer);

      expect(result.businessPartnerCategory).toBe('1');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });
  });

  describe('mapProductToCanonical', () => {
    it('should map SAP product to canonical product', () => {
      const sapProduct: SapProduct = {
        Product: 'MAT001',
        ProductType: 'FERT',
        ProductGroup: 'PG001',
        BaseUnit: 'EA',
        NetWeight: '1.5',
        WeightUnit: 'KG',
        Division: '00',
        CrossPlantStatus: '',
        to_Description: [
          {
            Product: 'MAT001',
            Language: 'EN',
            ProductDescription: 'Test Product',
          },
        ],
      };

      const result = service.mapProductToCanonical(sapProduct);

      expect(result.externalId).toBe('MAT001');
      expect(result.sku).toBe('MAT001');
      expect(result.name).toBe('Test Product');
      expect(result.description).toBe('Test Product');
      expect(result.type).toBe('FERT');
      expect(result.category).toBe('PG001');
      expect(result.unit).toBe('EA');
      expect(result.weight).toBe(1.5);
      expect(result.weightUnit).toBe('KG');
      expect(result.status).toBe('active');
    });

    it('should map inactive product status', () => {
      const sapProduct: SapProduct = {
        Product: 'MAT002',
        CrossPlantStatus: '02',
      };

      const result = service.mapProductToCanonical(sapProduct);

      expect(result.status).toBe('inactive');
    });

    it('should handle product without description', () => {
      const sapProduct: SapProduct = {
        Product: 'MAT003',
      };

      const result = service.mapProductToCanonical(sapProduct);

      expect(result.name).toBe('MAT003');
      expect(result.description).toBeUndefined();
    });
  });

  describe('mapBillingDocumentToCanonical', () => {
    it('should map SAP billing document (invoice) to canonical invoice', () => {
      const sapDoc: SapBillingDocument = {
        BillingDocument: 'INV001',
        BillingDocumentType: 'F2',
        SoldToParty: 'CUST001',
        BillingDocumentDate: '2024-02-01',
        TotalNetAmount: '1500.00',
        TransactionCurrency: 'USD',
        PaymentTerms: 'NT30',
        to_Item: [
          {
            BillingDocument: 'INV001',
            BillingDocumentItem: '000010',
            Material: 'MAT001',
            BillingQuantity: '10',
            BillingQuantityUnit: 'EA',
            NetAmount: '1500.00',
          },
        ],
      };

      const result = service.mapBillingDocumentToCanonical(sapDoc);

      expect(result.externalId).toBe('INV001');
      expect(result.invoiceNumber).toBe('INV001');
      expect(result.type).toBe('invoice');
      expect(result.customerId).toBe('CUST001');
      expect(result.totalAmount).toBe(1500);
      expect(result.currency).toBe('USD');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId).toBe('MAT001');
      expect(result.items[0].quantity).toBe(10);
      expect(result.items[0].unitPrice).toBe(150);
    });

    it('should map credit note', () => {
      const sapDoc: SapBillingDocument = {
        BillingDocument: 'CN001',
        BillingDocumentType: 'G2',
        BillingDocumentDate: '2024-02-01',
        TotalNetAmount: '100.00',
        TransactionCurrency: 'USD',
      };

      const result = service.mapBillingDocumentToCanonical(sapDoc);

      expect(result.type).toBe('credit_note');
    });

    it('should map debit note', () => {
      const sapDoc: SapBillingDocument = {
        BillingDocument: 'DN001',
        BillingDocumentType: 'L2',
        BillingDocumentDate: '2024-02-01',
        TotalNetAmount: '50.00',
        TransactionCurrency: 'USD',
      };

      const result = service.mapBillingDocumentToCanonical(sapDoc);

      expect(result.type).toBe('debit_note');
    });
  });

  describe('mapAtpToCanonical', () => {
    it('should map SAP ATP response to canonical inventory', () => {
      const atp: SapAtpCheckResponse = {
        Material: 'MAT001',
        Plant: '1000',
        AvailableQuantity: 100,
        QuantityUnit: 'EA',
        AvailabilityDate: '2024-02-15',
        IsAvailable: true,
        ConfirmedQuantity: 50,
      };

      const result = service.mapAtpToCanonical(atp);

      expect(result.productId).toBe('MAT001');
      expect(result.locationId).toBe('1000');
      expect(result.locationType).toBe('plant');
      expect(result.availableQuantity).toBe(100);
      expect(result.totalQuantity).toBe(100);
      expect(result.unit).toBe('EA');
    });
  });

  describe('mapCustomerToCanonical', () => {
    it('should map SAP customer with business partner', () => {
      const sapCustomer = {
        Customer: 'CUST001',
        CustomerFullName: 'Acme Corp',
        Currency: 'USD',
        CreditLimit: '50000.00',
        PaymentTerms: 'NT30',
        to_CustomerSalesArea: [
          {
            Customer: 'CUST001',
            SalesOrganization: '1000',
            DistributionChannel: '10',
            Division: '00',
            PaymentTerms: 'NT30',
            Currency: 'USD',
          },
        ],
      };

      const sapBp: SapBusinessPartner = {
        BusinessPartner: 'BP001',
        Customer: 'CUST001',
        BusinessPartnerCategory: '2',
        OrganizationBPName1: 'Acme Corp',
        Language: 'EN',
      };

      const result = service.mapCustomerToCanonical(sapCustomer, sapBp);

      expect(result.externalId).toBe('BP001');
      expect(result.name).toBe('Acme Corp');
      expect(result.currency).toBe('USD');
      expect(result.creditLimit).toBe(50000);
      expect(result.paymentTerms).toBe('NT30');
      expect((result.metadata as any).salesAreas).toHaveLength(1);
    });

    it('should map SAP customer without business partner', () => {
      const sapCustomer = {
        Customer: 'CUST001',
        CustomerFullName: 'Acme Corp',
        Currency: 'USD',
        CreditLimit: '50000.00',
      };

      const result = service.mapCustomerToCanonical(sapCustomer);

      expect(result.externalId).toBe('CUST001');
      expect(result.name).toBe('Acme Corp');
      expect(result.creditLimit).toBe(50000);
    });
  });
});
