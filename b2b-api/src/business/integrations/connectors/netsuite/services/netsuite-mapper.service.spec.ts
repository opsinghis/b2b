import { NetSuiteMapperService } from './netsuite-mapper.service';
import {
  NetSuiteCustomer,
  NetSuiteItem,
  NetSuiteSalesOrder,
  NetSuiteInvoice,
  NetSuiteInventoryStatus,
} from '../interfaces';

describe('NetSuiteMapperService', () => {
  let service: NetSuiteMapperService;

  beforeEach(() => {
    service = new NetSuiteMapperService();
  });

  describe('mapCustomer', () => {
    it('should map company customer to canonical format', () => {
      const customer: NetSuiteCustomer = {
        id: '456',
        entityId: 'CUST001',
        companyName: 'Test Company',
        isPerson: false,
        email: 'test@example.com',
        phone: '555-0100',
        balance: 1000,
        creditLimit: 5000,
        overdueBalance: 200,
        isInactive: false,
        subsidiary: { id: '1' },
      };

      const result = service.mapCustomer(customer);

      expect(result).toEqual(
        expect.objectContaining({
          externalId: '456',
          sourceSystem: 'netsuite',
          entityId: 'CUST001',
          name: 'Test Company',
          isCompany: true,
          email: 'test@example.com',
          phone: '555-0100',
          balance: 1000,
          creditLimit: 5000,
          availableCredit: 4000,
          overdueBalance: 200,
          isActive: true,
        }),
      );
    });

    it('should map individual customer to canonical format', () => {
      const customer: NetSuiteCustomer = {
        id: '457',
        entityId: 'CUST002',
        firstName: 'John',
        lastName: 'Doe',
        isPerson: true,
        email: 'john.doe@example.com',
        isInactive: false,
      };

      const result = service.mapCustomer(customer);

      expect(result.name).toBe('John Doe');
      expect(result.isCompany).toBe(false);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('should handle customer with addresses', () => {
      const customer: NetSuiteCustomer = {
        id: '456',
        companyName: 'Test Company',
        isInactive: false,
        addressbook: [
          {
            label: 'HQ',
            defaultBilling: true,
            addressBookAddress: {
              addr1: '123 Main St',
              city: 'New York',
              state: 'NY',
              zip: '10001',
              country: { id: 'US' },
            },
          },
        ],
      };

      const result = service.mapCustomer(customer);

      expect(result.addresses).toHaveLength(1);
      expect(result.addresses?.[0]).toEqual(
        expect.objectContaining({
          line1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        }),
      );
    });

    it('should calculate available credit correctly', () => {
      const customerWithOverBalance: NetSuiteCustomer = {
        id: '456',
        companyName: 'Test',
        balance: 6000,
        creditLimit: 5000,
        isInactive: false,
      };

      const result = service.mapCustomer(customerWithOverBalance);

      expect(result.availableCredit).toBe(0);
    });
  });

  describe('mapProduct', () => {
    it('should map item to canonical product format', () => {
      const item: NetSuiteItem = {
        id: '789',
        itemId: 'SKU001',
        displayName: 'Test Product',
        salesDescription: 'A test product',
        itemType: 'InvtPart',
        basePrice: 99.99,
        cost: 50,
        upcCode: '123456789012',
        weight: 1.5,
        weightUnit: 'lb',
        isInactive: false,
        isTaxable: true,
        quantityOnHand: 100,
        quantityAvailable: 80,
      };

      const result = service.mapProduct(item);

      expect(result).toEqual(
        expect.objectContaining({
          externalId: '789',
          sourceSystem: 'netsuite',
          sku: 'SKU001',
          name: 'Test Product',
          description: 'A test product',
          type: 'inventory',
          basePrice: 99.99,
          cost: 50,
          upc: '123456789012',
          weight: 1.5,
          weightUnit: 'lb',
          isActive: true,
          isTaxable: true,
          quantityOnHand: 100,
          quantityAvailable: 80,
        }),
      );
    });

    it('should map different item types correctly', () => {
      const itemTypes = [
        { input: 'InvtPart', expected: 'inventory' },
        { input: 'NonInvtPart', expected: 'non-inventory' },
        { input: 'Service', expected: 'service' },
        { input: 'Kit', expected: 'kit' },
        { input: 'Assembly', expected: 'assembly' },
        { input: 'Unknown', expected: 'unknown' },
      ];

      itemTypes.forEach(({ input, expected }) => {
        const item: NetSuiteItem = {
          id: '1',
          itemId: 'TEST',
          itemType: input,
          isInactive: false,
        };

        const result = service.mapProduct(item);
        expect(result.type).toBe(expected);
      });
    });
  });

  describe('mapSalesOrder', () => {
    it('should map sales order to canonical format', () => {
      const order: NetSuiteSalesOrder = {
        id: '123',
        tranId: 'SO001',
        tranDate: '2024-01-15',
        status: { id: 'pendingFulfillment', refName: 'Pending Fulfillment' },
        entity: { id: '456', refName: 'Test Customer' },
        total: 1000,
        subTotal: 900,
        taxTotal: 100,
        item: [
          {
            lineNumber: 1,
            item: { id: '789', refName: 'SKU001' },
            description: 'Test item',
            quantity: 10,
            rate: 90,
            amount: 900,
            quantityFulfilled: 5,
          },
        ],
        custbody_external_id: 'B2B-001',
      };

      const result = service.mapSalesOrder(order);

      expect(result).toEqual(
        expect.objectContaining({
          externalId: '123',
          sourceSystem: 'netsuite',
          orderNumber: 'SO001',
          orderDate: '2024-01-15',
          status: 'Pending Fulfillment',
          statusCode: 'pendingFulfillment',
          customerId: '456',
          customerName: 'Test Customer',
          total: 1000,
          subtotal: 900,
          taxTotal: 100,
        }),
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          lineNumber: 1,
          productId: '789',
          sku: 'SKU001',
          description: 'Test item',
          quantity: 10,
          unitPrice: 90,
          lineTotal: 900,
          quantityFulfilled: 5,
        }),
      );
    });

    it('should handle order without items', () => {
      const order: NetSuiteSalesOrder = {
        id: '123',
        tranId: 'SO001',
        tranDate: '2024-01-15',
        total: 0,
      };

      const result = service.mapSalesOrder(order);

      expect(result.items).toHaveLength(0);
    });
  });

  describe('mapInvoice', () => {
    it('should map invoice to canonical format', () => {
      const invoice: NetSuiteInvoice = {
        id: '567',
        tranId: 'INV001',
        tranDate: '2024-01-20',
        dueDate: '2024-02-20',
        status: { id: 'open', refName: 'Open' },
        entity: { id: '456', refName: 'Test Customer' },
        createdFrom: { id: '123', refName: 'SO001' },
        total: 1000,
        amountPaid: 500,
        amountRemaining: 500,
        item: [
          {
            lineNumber: 1,
            item: { id: '789', refName: 'SKU001' },
            quantity: 10,
            rate: 100,
            amount: 1000,
          },
        ],
      };

      const result = service.mapInvoice(invoice);

      expect(result).toEqual(
        expect.objectContaining({
          externalId: '567',
          sourceSystem: 'netsuite',
          invoiceNumber: 'INV001',
          invoiceDate: '2024-01-20',
          dueDate: '2024-02-20',
          status: 'Open',
          statusCode: 'open',
          customerId: '456',
          orderId: '123',
          orderNumber: 'SO001',
          total: 1000,
          amountPaid: 500,
          amountDue: 500,
        }),
      );
    });
  });

  describe('mapInventoryStatus', () => {
    it('should map inventory status to canonical format', () => {
      const inventory: NetSuiteInventoryStatus = {
        item: { id: '789' },
        location: { id: '1', refName: 'Warehouse A' },
        quantityOnHand: 100,
        quantityAvailable: 80,
        quantityOnOrder: 50,
        quantityCommitted: 20,
        quantityBackOrdered: 5,
        averageCost: 50,
      };

      const result = service.mapInventoryStatus(inventory, 'SKU001');

      expect(result).toEqual(
        expect.objectContaining({
          productId: '789',
          sku: 'SKU001',
          locationId: '1',
          locationName: 'Warehouse A',
          quantityOnHand: 100,
          quantityAvailable: 80,
          quantityOnOrder: 50,
          quantityCommitted: 20,
          quantityBackordered: 5,
          averageCost: 50,
        }),
      );
      expect(result.asOfDate).toBeDefined();
    });
  });

  describe('mapAddress', () => {
    it('should map address to canonical format', () => {
      const address = {
        addr1: '123 Main St',
        addr2: 'Suite 100',
        addr3: 'Building A',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: { id: 'US' },
        attention: 'John Doe',
        phone: '555-0100',
      };

      const result = service.mapAddress(address);

      expect(result).toEqual({
        line1: '123 Main St',
        line2: 'Suite 100',
        line3: 'Building A',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        attention: 'John Doe',
        phone: '555-0100',
      });
    });

    it('should handle undefined address', () => {
      const result = service.mapAddress(undefined);
      expect(result).toEqual({});
    });
  });

  describe('mapCanonicalCustomerToNetSuite', () => {
    it('should map canonical customer to NetSuite format', () => {
      const customer = {
        name: 'Test Company',
        isCompany: true,
        email: 'test@example.com',
        phone: '555-0100',
        creditLimit: 5000,
        externalId: 'B2B-CUST-001',
      };

      const result = service.mapCanonicalCustomerToNetSuite(customer);

      expect(result).toEqual(
        expect.objectContaining({
          isPerson: false,
          companyName: 'Test Company',
          email: 'test@example.com',
          phone: '555-0100',
          creditLimit: 5000,
          custentity_external_id: 'B2B-CUST-001',
        }),
      );
    });
  });

  describe('mapCanonicalOrderToNetSuite', () => {
    it('should map canonical order to NetSuite format', () => {
      const order = {
        customerId: '456',
        orderDate: '2024-01-15',
        externalId: 'B2B-001',
        memo: 'Test order',
        items: [{ lineNumber: 1, productId: '789', quantity: 10, unitPrice: 100 }],
      };

      const result = service.mapCanonicalOrderToNetSuite(order);

      expect(result).toEqual(
        expect.objectContaining({
          entity: { id: '456' },
          tranDate: '2024-01-15',
          custbody_external_id: 'B2B-001',
          memo: 'Test order',
          item: {
            items: expect.arrayContaining([
              expect.objectContaining({
                lineNumber: 1,
                item: { id: '789' },
                quantity: 10,
                rate: 100,
              }),
            ]),
          },
        }),
      );
    });
  });
});
