import { Test, TestingModule } from '@nestjs/testing';
import { DynamicsMapperService } from './dynamics-mapper.service';
import {
  DynamicsSalesOrder,
  DynamicsAccount,
  DynamicsContact,
  DynamicsProduct,
  DynamicsInvoice,
  DynamicsSalesOrderState,
  DynamicsInvoiceState,
  DynamicsEntityState,
} from '../interfaces';

describe('DynamicsMapperService', () => {
  let service: DynamicsMapperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DynamicsMapperService],
    }).compile();

    service = module.get<DynamicsMapperService>(DynamicsMapperService);
  });

  describe('mapSalesOrderToCanonical', () => {
    it('should map Dynamics sales order to canonical order', () => {
      const dynamicsOrder: DynamicsSalesOrder = {
        salesorderid: 'order-123',
        ordernumber: 'SO-001',
        name: 'Test Order',
        totalamount: 1000,
        totallineitemamount: 900,
        totaltax: 80,
        totaldiscountamount: 30,
        freightamount: 50,
        statecode: DynamicsSalesOrderState.ACTIVE,
        statuscode: 1,
        createdon: '2024-01-15T10:00:00Z',
        modifiedon: '2024-01-15T12:00:00Z',
      };

      const result = service.mapSalesOrderToCanonical(dynamicsOrder);

      expect(result.id).toBe('order-123');
      expect(result.orderNumber).toBe('SO-001');
      expect(result.total).toBe(1000);
      expect(result.subtotal).toBe(900);
      expect(result.tax).toBe(80);
      expect(result.discount).toBe(30);
      expect(result.shipping).toBe(50);
      expect(result.status).toBe('draft');
    });

    it('should map sales order items', () => {
      const dynamicsOrder: DynamicsSalesOrder = {
        salesorderid: 'order-123',
        salesorder_details: [
          {
            salesorderdetailid: 'item-1',
            quantity: 10,
            priceperunit: 100,
            extendedamount: 1000,
            lineitemnumber: 1,
          },
          {
            salesorderdetailid: 'item-2',
            quantity: 5,
            priceperunit: 200,
            extendedamount: 1000,
            lineitemnumber: 2,
          },
        ],
      };

      const result = service.mapSalesOrderToCanonical(dynamicsOrder);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('item-1');
      expect(result.items[0].quantity).toBe(10);
      expect(result.items[1].lineNumber).toBe(2);
    });

    it('should map different order states', () => {
      const states = [
        { state: DynamicsSalesOrderState.ACTIVE, expected: 'draft' },
        { state: DynamicsSalesOrderState.SUBMITTED, expected: 'submitted' },
        { state: DynamicsSalesOrderState.CANCELED, expected: 'cancelled' },
        { state: DynamicsSalesOrderState.FULFILLED, expected: 'fulfilled' },
        { state: DynamicsSalesOrderState.INVOICED, expected: 'invoiced' },
      ];

      for (const { state, expected } of states) {
        const order: DynamicsSalesOrder = { salesorderid: 'test', statecode: state };
        const result = service.mapSalesOrderToCanonical(order);
        expect(result.status).toBe(expected);
      }
    });

    it('should map billing and shipping addresses', () => {
      const dynamicsOrder: DynamicsSalesOrder = {
        salesorderid: 'order-123',
        billto_line1: '123 Bill St',
        billto_city: 'Bill City',
        billto_stateorprovince: 'BC',
        billto_postalcode: '12345',
        billto_country: 'US',
        shipto_line1: '456 Ship Ave',
        shipto_city: 'Ship City',
        shipto_stateorprovince: 'SC',
        shipto_postalcode: '67890',
        shipto_country: 'US',
      };

      const result = service.mapSalesOrderToCanonical(dynamicsOrder);

      expect(result.billingAddress?.line1).toBe('123 Bill St');
      expect(result.billingAddress?.city).toBe('Bill City');
      expect(result.shippingAddress?.line1).toBe('456 Ship Ave');
      expect(result.shippingAddress?.city).toBe('Ship City');
    });
  });

  describe('mapAccountToCanonical', () => {
    it('should map Dynamics account to canonical customer', () => {
      const dynamicsAccount: DynamicsAccount = {
        accountid: 'acc-123',
        name: 'Acme Corp',
        accountnumber: 'ACM001',
        emailaddress1: 'info@acme.com',
        telephone1: '555-1234',
        websiteurl: 'https://acme.com',
        creditlimit: 50000,
        creditonhold: false,
        statecode: DynamicsEntityState.ACTIVE,
        address1_line1: '123 Main St',
        address1_city: 'Anytown',
        address1_stateorprovince: 'CA',
        address1_postalcode: '90210',
        address1_country: 'US',
        createdon: '2024-01-01T00:00:00Z',
        modifiedon: '2024-01-15T00:00:00Z',
      };

      const result = service.mapAccountToCanonical(dynamicsAccount);

      expect(result.id).toBe('acc-123');
      expect(result.name).toBe('Acme Corp');
      expect(result.customerNumber).toBe('ACM001');
      expect(result.email).toBe('info@acme.com');
      expect(result.phone).toBe('555-1234');
      expect(result.website).toBe('https://acme.com');
      expect(result.creditLimit).toBe(50000);
      expect(result.creditHold).toBe(false);
      expect(result.type).toBe('business');
      expect(result.status).toBe('active');
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0].line1).toBe('123 Main St');
    });

    it('should map inactive account status', () => {
      const dynamicsAccount: DynamicsAccount = {
        accountid: 'acc-123',
        statecode: DynamicsEntityState.INACTIVE,
      };

      const result = service.mapAccountToCanonical(dynamicsAccount);

      expect(result.status).toBe('inactive');
    });
  });

  describe('mapContactToCanonical', () => {
    it('should map Dynamics contact to canonical customer', () => {
      const dynamicsContact: DynamicsContact = {
        contactid: 'cont-123',
        firstname: 'John',
        lastname: 'Doe',
        fullname: 'John Doe',
        emailaddress1: 'john@example.com',
        telephone1: '555-1234',
        mobilephone: '555-5678',
        jobtitle: 'Manager',
        statecode: DynamicsEntityState.ACTIVE,
        address1_line1: '123 Home St',
        address1_city: 'Hometown',
        address1_postalcode: '12345',
        address1_country: 'US',
        createdon: '2024-01-01T00:00:00Z',
        modifiedon: '2024-01-15T00:00:00Z',
      };

      const result = service.mapContactToCanonical(dynamicsContact);

      expect(result.id).toBe('cont-123');
      expect(result.name).toBe('John Doe');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.phone).toBe('555-1234');
      expect(result.mobile).toBe('555-5678');
      expect(result.type).toBe('individual');
      expect(result.status).toBe('active');
      expect(result.metadata?.jobTitle).toBe('Manager');
    });
  });

  describe('mapProductToCanonical', () => {
    it('should map Dynamics product to canonical product', () => {
      const dynamicsProduct: DynamicsProduct = {
        productid: 'prod-123',
        name: 'Widget',
        productnumber: 'WGT-001',
        description: 'A great widget',
        productstructure: 1,
        price: 99.99,
        currentcost: 50,
        quantityonhand: 100,
        isstockitem: true,
        statecode: 0,
        createdon: '2024-01-01T00:00:00Z',
        modifiedon: '2024-01-15T00:00:00Z',
      };

      const result = service.mapProductToCanonical(dynamicsProduct);

      expect(result.id).toBe('prod-123');
      expect(result.name).toBe('Widget');
      expect(result.sku).toBe('WGT-001');
      expect(result.description).toBe('A great widget');
      expect(result.type).toBe('product');
      expect(result.price).toBe(99.99);
      expect(result.cost).toBe(50);
      expect(result.quantityOnHand).toBe(100);
      expect(result.isStockItem).toBe(true);
      expect(result.status).toBe('active');
    });

    it('should map product structure types', () => {
      const structures = [
        { structure: 1, expected: 'product' },
        { structure: 2, expected: 'family' },
        { structure: 3, expected: 'bundle' },
      ];

      for (const { structure, expected } of structures) {
        const product: DynamicsProduct = {
          productid: 'test',
          productstructure: structure,
        };
        const result = service.mapProductToCanonical(product);
        expect(result.type).toBe(expected);
      }
    });
  });

  describe('mapInvoiceToCanonical', () => {
    it('should map Dynamics invoice to canonical invoice', () => {
      const dynamicsInvoice: DynamicsInvoice = {
        invoiceid: 'inv-123',
        invoicenumber: 'INV-001',
        name: 'Invoice 001',
        totalamount: 1100,
        totallineitemamount: 1000,
        totaltax: 100,
        totaldiscountamount: 50,
        duedate: '2024-02-15',
        statecode: DynamicsInvoiceState.ACTIVE,
        createdon: '2024-01-15T00:00:00Z',
        modifiedon: '2024-01-15T00:00:00Z',
      };

      const result = service.mapInvoiceToCanonical(dynamicsInvoice);

      expect(result.id).toBe('inv-123');
      expect(result.invoiceNumber).toBe('INV-001');
      expect(result.total).toBe(1100);
      expect(result.subtotal).toBe(1000);
      expect(result.tax).toBe(100);
      expect(result.discount).toBe(50);
      expect(result.status).toBe('open');
    });

    it('should map different invoice states', () => {
      const states = [
        { state: DynamicsInvoiceState.ACTIVE, expected: 'open' },
        { state: DynamicsInvoiceState.CLOSED, expected: 'closed' },
        { state: DynamicsInvoiceState.PAID, expected: 'paid' },
        { state: DynamicsInvoiceState.CANCELED, expected: 'cancelled' },
      ];

      for (const { state, expected } of states) {
        const invoice: DynamicsInvoice = { invoiceid: 'test', statecode: state };
        const result = service.mapInvoiceToCanonical(invoice);
        expect(result.status).toBe(expected);
      }
    });

    it('should map invoice items', () => {
      const dynamicsInvoice: DynamicsInvoice = {
        invoiceid: 'inv-123',
        invoice_details: [
          {
            invoicedetailid: 'item-1',
            quantity: 10,
            priceperunit: 100,
            extendedamount: 1000,
            lineitemnumber: 1,
          },
        ],
      };

      const result = service.mapInvoiceToCanonical(dynamicsInvoice);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('item-1');
      expect(result.items[0].quantity).toBe(10);
      expect(result.items[0].unitPrice).toBe(100);
      expect(result.items[0].total).toBe(1000);
    });
  });

  describe('mapCanonicalToSalesOrder', () => {
    it('should map canonical order to Dynamics payload', () => {
      const canonicalOrder = {
        orderNumber: 'ORD-001',
        notes: 'Test order',
        requestedDeliveryDate: new Date('2024-02-01'),
        billingAddress: {
          type: 'billing',
          line1: '123 Bill St',
          city: 'Bill City',
          state: 'BC',
          postalCode: '12345',
          country: 'US',
        },
        shippingAddress: {
          type: 'shipping',
          line1: '456 Ship Ave',
          city: 'Ship City',
          state: 'SC',
          postalCode: '67890',
          country: 'US',
        },
      };

      const result = service.mapCanonicalToSalesOrder(canonicalOrder);

      expect(result.name).toBe('ORD-001');
      expect(result.description).toBe('Test order');
      expect(result.billto_line1).toBe('123 Bill St');
      expect(result.billto_city).toBe('Bill City');
      expect(result.shipto_line1).toBe('456 Ship Ave');
      expect(result.shipto_city).toBe('Ship City');
    });
  });

  describe('mapCanonicalToAccount', () => {
    it('should map canonical customer to Dynamics payload', () => {
      const canonicalCustomer = {
        name: 'Test Corp',
        customerNumber: 'CUST001',
        email: 'test@corp.com',
        phone: '555-1234',
        website: 'https://test.com',
        creditLimit: 10000,
        creditHold: true,
        addresses: [
          {
            type: 'primary',
            line1: '123 Main St',
            line2: 'Suite 100',
            city: 'Anytown',
            state: 'CA',
            postalCode: '90210',
            country: 'US',
          },
        ],
      };

      const result = service.mapCanonicalToAccount(canonicalCustomer);

      expect(result.name).toBe('Test Corp');
      expect(result.accountnumber).toBe('CUST001');
      expect(result.emailaddress1).toBe('test@corp.com');
      expect(result.telephone1).toBe('555-1234');
      expect(result.websiteurl).toBe('https://test.com');
      expect(result.creditlimit).toBe(10000);
      expect(result.creditonhold).toBe(true);
      expect(result.address1_line1).toBe('123 Main St');
      expect(result.address1_line2).toBe('Suite 100');
      expect(result.address1_city).toBe('Anytown');
    });
  });
});
