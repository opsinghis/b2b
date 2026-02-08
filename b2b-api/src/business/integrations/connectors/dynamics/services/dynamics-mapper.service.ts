import { Injectable } from '@nestjs/common';
import {
  DynamicsSalesOrder,
  DynamicsSalesOrderDetail,
  DynamicsAccount,
  DynamicsContact,
  DynamicsProduct,
  DynamicsInvoice,
  DynamicsInvoiceDetail,
  DynamicsSalesOrderState,
  DynamicsInvoiceState,
  DynamicsEntityState,
} from '../interfaces';

/**
 * Canonical models for Dynamics 365 mapping
 * Re-using canonical patterns from SAP connector
 */
export interface CanonicalOrder {
  id: string;
  externalId?: string;
  orderNumber: string;
  customerId: string;
  status: string;
  orderDate?: Date;
  requestedDeliveryDate?: Date;
  deliveredDate?: Date;
  currency: string;
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  total: number;
  items: CanonicalOrderItem[];
  billingAddress?: CanonicalAddress;
  shippingAddress?: CanonicalAddress;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CanonicalOrderItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
  unit: string;
  lineNumber: number;
  metadata?: Record<string, unknown>;
}

export interface CanonicalCustomer {
  id: string;
  externalId?: string;
  customerNumber?: string;
  type: 'business' | 'individual';
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  mobile?: string;
  website?: string;
  status: 'active' | 'inactive';
  addresses: CanonicalAddress[];
  creditLimit?: number;
  creditHold?: boolean;
  paymentTerms?: string;
  currency: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CanonicalAddress {
  type: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface CanonicalProduct {
  id: string;
  externalId?: string;
  sku: string;
  name: string;
  description?: string;
  type: string;
  status: 'active' | 'inactive';
  price: number;
  cost?: number;
  unit: string;
  quantityOnHand?: number;
  isStockItem?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CanonicalInvoice {
  id: string;
  externalId?: string;
  invoiceNumber: string;
  orderId?: string;
  customerId: string;
  status: string;
  invoiceDate: Date;
  dueDate?: Date;
  deliveredDate?: Date;
  currency: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  items: CanonicalInvoiceItem[];
  billingAddress?: CanonicalAddress;
  shippingAddress?: CanonicalAddress;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CanonicalInvoiceItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
  unit: string;
  lineNumber: number;
}

/**
 * Dynamics 365 Mapper Service
 * Maps between Dynamics entities and canonical models
 */
@Injectable()
export class DynamicsMapperService {
  /**
   * Map Dynamics Sales Order to Canonical Order
   */
  mapSalesOrderToCanonical(order: DynamicsSalesOrder): CanonicalOrder {
    return {
      id: order.salesorderid || '',
      externalId: order.salesorderid || '',
      orderNumber: order.ordernumber || order.name || '',
      customerId:
        this.extractLookupId(order.customerid_account) ||
        this.extractLookupId(order.customerid_contact) ||
        '',
      status: this.mapSalesOrderStatus(order.statecode, order.statuscode),
      orderDate: order.createdon ? new Date(order.createdon) : new Date(),
      requestedDeliveryDate: order.requestdeliveryby
        ? new Date(order.requestdeliveryby)
        : undefined,
      deliveredDate: order.datedelivered ? new Date(order.datedelivered) : undefined,
      currency: this.extractLookupName(order.transactioncurrencyid) || 'USD',
      subtotal: order.totallineitemamount || 0,
      tax: order.totaltax || 0,
      discount: order.totaldiscountamount || 0,
      shipping: order.freightamount || 0,
      total: order.totalamount || 0,
      items: order.salesorder_details?.map((item) => this.mapSalesOrderItemToCanonical(item)) || [],
      billingAddress: this.mapAddressFromOrder(order, 'billto'),
      shippingAddress: this.mapAddressFromOrder(order, 'shipto'),
      notes: order.description,
      metadata: {
        source: 'dynamics365',
        stateCode: order.statecode,
        statusCode: order.statuscode,
        fulfilledDate: order.datefulfilled,
      },
      createdAt: order.createdon ? new Date(order.createdon) : new Date(),
      updatedAt: order.modifiedon ? new Date(order.modifiedon) : new Date(),
    };
  }

  /**
   * Map Dynamics Sales Order Item to Canonical Order Item
   */
  mapSalesOrderItemToCanonical(item: DynamicsSalesOrderDetail): CanonicalOrderItem {
    return {
      id: item.salesorderdetailid || '',
      productId: this.extractLookupId(item.productid) || '',
      sku: this.extractLookupName(item.productid) || '',
      name: item.productdescription || '',
      quantity: item.quantity || 0,
      unitPrice: item.priceperunit || 0,
      discount: item.manualdiscountamount || 0,
      tax: item.tax || 0,
      total: item.extendedamount || 0,
      unit: this.extractLookupName(item.uomid) || 'EA',
      lineNumber: item.lineitemnumber || 0,
      metadata: {
        isProductOverridden: item.isproductoverridden,
        requestedDeliveryBy: item.requestdeliveryby,
      },
    };
  }

  /**
   * Map Dynamics Account to Canonical Customer
   */
  mapAccountToCanonical(account: DynamicsAccount): CanonicalCustomer {
    return {
      id: account.accountid || '',
      externalId: account.accountid || '',
      customerNumber: account.accountnumber || '',
      type: 'business',
      name: account.name || '',
      email: account.emailaddress1 || '',
      phone: account.telephone1 || '',
      website: account.websiteurl,
      status: account.statecode === DynamicsEntityState.ACTIVE ? 'active' : 'inactive',
      addresses: [
        {
          type: 'primary',
          line1: account.address1_line1 || '',
          line2: account.address1_line2,
          city: account.address1_city || '',
          state: account.address1_stateorprovince,
          postalCode: account.address1_postalcode || '',
          country: account.address1_country || '',
        },
      ],
      creditLimit: account.creditlimit,
      creditHold: account.creditonhold,
      paymentTerms: this.mapPaymentTerms(account.paymenttermscode),
      currency: this.extractLookupName(account.transactioncurrencyid) || 'USD',
      metadata: {
        source: 'dynamics365',
        industryCode: account.industrycode,
        numberOfEmployees: account.numberofemployees,
        revenue: account.revenue,
        parentAccountId: this.extractLookupId(account.parentaccountid),
        primaryContactId: this.extractLookupId(account.primarycontactid),
      },
      createdAt: account.createdon ? new Date(account.createdon) : new Date(),
      updatedAt: account.modifiedon ? new Date(account.modifiedon) : new Date(),
    };
  }

  /**
   * Map Dynamics Contact to Canonical Customer
   */
  mapContactToCanonical(contact: DynamicsContact): CanonicalCustomer {
    return {
      id: contact.contactid || '',
      externalId: contact.contactid || '',
      type: 'individual',
      name: contact.fullname || `${contact.firstname} ${contact.lastname}`,
      firstName: contact.firstname,
      lastName: contact.lastname,
      email: contact.emailaddress1 || '',
      phone: contact.telephone1 || '',
      mobile: contact.mobilephone,
      status: contact.statecode === DynamicsEntityState.ACTIVE ? 'active' : 'inactive',
      addresses: [
        {
          type: 'primary',
          line1: contact.address1_line1 || '',
          city: contact.address1_city || '',
          state: contact.address1_stateorprovince,
          postalCode: contact.address1_postalcode || '',
          country: contact.address1_country || '',
        },
      ],
      currency: 'USD', // Contacts don't have currency, use default
      metadata: {
        source: 'dynamics365',
        jobTitle: contact.jobtitle,
        parentAccountId: this.extractLookupId(contact.parentcustomerid_account),
      },
      createdAt: contact.createdon ? new Date(contact.createdon) : new Date(),
      updatedAt: contact.modifiedon ? new Date(contact.modifiedon) : new Date(),
    };
  }

  /**
   * Map Dynamics Product to Canonical Product
   */
  mapProductToCanonical(product: DynamicsProduct): CanonicalProduct {
    return {
      id: product.productid || '',
      externalId: product.productid || '',
      sku: product.productnumber || '',
      name: product.name || '',
      description: product.description,
      type: this.mapProductStructure(product.productstructure),
      status: product.statecode === 0 ? 'active' : 'inactive',
      price: product.price || 0,
      cost: product.currentcost || product.standardcost,
      unit: this.extractLookupName(product.defaultuomid) || 'EA',
      quantityOnHand: product.quantityonhand,
      isStockItem: product.isstockitem,
      metadata: {
        source: 'dynamics365',
        productTypeCode: product.producttypecode,
        isKit: product.iskit,
        quantityDecimal: product.quantitydecimal,
      },
      createdAt: product.createdon ? new Date(product.createdon) : new Date(),
      updatedAt: product.modifiedon ? new Date(product.modifiedon) : new Date(),
    };
  }

  /**
   * Map Dynamics Invoice to Canonical Invoice
   */
  mapInvoiceToCanonical(invoice: DynamicsInvoice): CanonicalInvoice {
    return {
      id: invoice.invoiceid || '',
      externalId: invoice.invoiceid || '',
      invoiceNumber: invoice.invoicenumber || invoice.name || '',
      orderId: this.extractLookupId(invoice.salesorderid),
      customerId: this.extractLookupId(invoice.customerid_account) || '',
      status: this.mapInvoiceStatus(invoice.statecode),
      invoiceDate: invoice.createdon ? new Date(invoice.createdon) : new Date(),
      dueDate: invoice.duedate ? new Date(invoice.duedate) : undefined,
      deliveredDate: invoice.datedelivered ? new Date(invoice.datedelivered) : undefined,
      currency: this.extractLookupName(invoice.transactioncurrencyid) || 'USD',
      subtotal: invoice.totallineitemamount || 0,
      tax: invoice.totaltax || 0,
      discount: invoice.totaldiscountamount || 0,
      total: invoice.totalamount || 0,
      items: invoice.invoice_details?.map((item) => this.mapInvoiceItemToCanonical(item)) || [],
      billingAddress: this.mapAddressFromInvoice(invoice, 'billto'),
      shippingAddress: this.mapAddressFromInvoice(invoice, 'shipto'),
      metadata: {
        source: 'dynamics365',
        stateCode: invoice.statecode,
        statusCode: invoice.statuscode,
        isPriceLocked: invoice.ispricelocked,
        priceListId: this.extractLookupId(invoice.pricelevelid),
      },
      createdAt: invoice.createdon ? new Date(invoice.createdon) : new Date(),
      updatedAt: invoice.modifiedon ? new Date(invoice.modifiedon) : new Date(),
    };
  }

  /**
   * Map Dynamics Invoice Item to Canonical Invoice Item
   */
  mapInvoiceItemToCanonical(item: DynamicsInvoiceDetail): CanonicalInvoiceItem {
    return {
      id: item.invoicedetailid || '',
      productId: this.extractLookupId(item.productid) || '',
      sku: this.extractLookupName(item.productid) || '',
      name: item.productdescription || '',
      quantity: item.quantity || 0,
      unitPrice: item.priceperunit || 0,
      discount: item.manualdiscountamount || 0,
      tax: item.tax || 0,
      total: item.extendedamount || 0,
      unit: this.extractLookupName(item.uomid) || 'EA',
      lineNumber: item.lineitemnumber || 0,
    };
  }

  // ==================== Reverse Mappings (Canonical to Dynamics) ====================

  /**
   * Map Canonical Order to Dynamics Sales Order payload
   */
  mapCanonicalToSalesOrder(order: Partial<CanonicalOrder>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (order.orderNumber) {
      payload.name = order.orderNumber;
    }

    if (order.notes) {
      payload.description = order.notes;
    }

    if (order.requestedDeliveryDate) {
      payload.requestdeliveryby = order.requestedDeliveryDate.toISOString();
    }

    if (order.billingAddress) {
      payload.billto_line1 = order.billingAddress.line1;
      payload.billto_city = order.billingAddress.city;
      payload.billto_stateorprovince = order.billingAddress.state;
      payload.billto_postalcode = order.billingAddress.postalCode;
      payload.billto_country = order.billingAddress.country;
    }

    if (order.shippingAddress) {
      payload.shipto_line1 = order.shippingAddress.line1;
      payload.shipto_city = order.shippingAddress.city;
      payload.shipto_stateorprovince = order.shippingAddress.state;
      payload.shipto_postalcode = order.shippingAddress.postalCode;
      payload.shipto_country = order.shippingAddress.country;
    }

    return payload;
  }

  /**
   * Map Canonical Customer to Dynamics Account payload
   */
  mapCanonicalToAccount(customer: Partial<CanonicalCustomer>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (customer.name) {
      payload.name = customer.name;
    }

    if (customer.customerNumber) {
      payload.accountnumber = customer.customerNumber;
    }

    if (customer.email) {
      payload.emailaddress1 = customer.email;
    }

    if (customer.phone) {
      payload.telephone1 = customer.phone;
    }

    if (customer.website) {
      payload.websiteurl = customer.website;
    }

    if (customer.creditLimit !== undefined) {
      payload.creditlimit = customer.creditLimit;
    }

    if (customer.creditHold !== undefined) {
      payload.creditonhold = customer.creditHold;
    }

    if (customer.addresses && customer.addresses.length > 0) {
      const primaryAddress = customer.addresses[0];
      payload.address1_line1 = primaryAddress.line1;
      payload.address1_line2 = primaryAddress.line2;
      payload.address1_city = primaryAddress.city;
      payload.address1_stateorprovince = primaryAddress.state;
      payload.address1_postalcode = primaryAddress.postalCode;
      payload.address1_country = primaryAddress.country;
    }

    return payload;
  }

  // ==================== Helper Methods ====================

  /**
   * Extract ID from Dynamics lookup value
   */
  private extractLookupId(lookup?: { id?: string; '@odata.bind'?: string }): string | undefined {
    if (!lookup) return undefined;
    if (lookup.id) return lookup.id;
    if (lookup['@odata.bind']) {
      const match = lookup['@odata.bind'].match(/\(([^)]+)\)/);
      return match ? match[1] : undefined;
    }
    return undefined;
  }

  /**
   * Extract name from Dynamics lookup value
   */
  private extractLookupName(lookup?: { name?: string }): string | undefined {
    return lookup?.name;
  }

  /**
   * Map address from order fields
   */
  private mapAddressFromOrder(
    order: DynamicsSalesOrder,
    prefix: 'billto' | 'shipto',
  ): CanonicalAddress | undefined {
    const line1 = order[`${prefix}_line1` as keyof DynamicsSalesOrder] as string | undefined;
    if (!line1) return undefined;

    return {
      type: prefix === 'billto' ? 'billing' : 'shipping',
      line1,
      city: (order[`${prefix}_city` as keyof DynamicsSalesOrder] as string) || '',
      state: order[`${prefix}_stateorprovince` as keyof DynamicsSalesOrder] as string,
      postalCode: (order[`${prefix}_postalcode` as keyof DynamicsSalesOrder] as string) || '',
      country: (order[`${prefix}_country` as keyof DynamicsSalesOrder] as string) || '',
    };
  }

  /**
   * Map address from invoice fields
   */
  private mapAddressFromInvoice(
    invoice: DynamicsInvoice,
    prefix: 'billto' | 'shipto',
  ): CanonicalAddress | undefined {
    const line1 = invoice[`${prefix}_line1` as keyof DynamicsInvoice] as string | undefined;
    if (!line1) return undefined;

    return {
      type: prefix === 'billto' ? 'billing' : 'shipping',
      line1,
      city: (invoice[`${prefix}_city` as keyof DynamicsInvoice] as string) || '',
      state: invoice[`${prefix}_stateorprovince` as keyof DynamicsInvoice] as string,
      postalCode: (invoice[`${prefix}_postalcode` as keyof DynamicsInvoice] as string) || '',
      country: (invoice[`${prefix}_country` as keyof DynamicsInvoice] as string) || '',
    };
  }

  /**
   * Map sales order state to canonical status
   */
  private mapSalesOrderStatus(stateCode?: number, _statusCode?: number): string {
    switch (stateCode) {
      case DynamicsSalesOrderState.ACTIVE:
        return 'draft';
      case DynamicsSalesOrderState.SUBMITTED:
        return 'submitted';
      case DynamicsSalesOrderState.CANCELED:
        return 'cancelled';
      case DynamicsSalesOrderState.FULFILLED:
        return 'fulfilled';
      case DynamicsSalesOrderState.INVOICED:
        return 'invoiced';
      default:
        return 'unknown';
    }
  }

  /**
   * Map invoice state to canonical status
   */
  private mapInvoiceStatus(stateCode?: number): string {
    switch (stateCode) {
      case DynamicsInvoiceState.ACTIVE:
        return 'open';
      case DynamicsInvoiceState.CLOSED:
        return 'closed';
      case DynamicsInvoiceState.PAID:
        return 'paid';
      case DynamicsInvoiceState.CANCELED:
        return 'cancelled';
      default:
        return 'unknown';
    }
  }

  /**
   * Map product structure code to canonical type
   */
  private mapProductStructure(structure?: number): string {
    switch (structure) {
      case 1:
        return 'product';
      case 2:
        return 'family';
      case 3:
        return 'bundle';
      default:
        return 'product';
    }
  }

  /**
   * Map payment terms code to string
   */
  private mapPaymentTerms(code?: number): string | undefined {
    // Common Dynamics payment terms codes
    switch (code) {
      case 1:
        return 'Net 30';
      case 2:
        return 'Net 45';
      case 3:
        return 'Net 60';
      case 4:
        return 'Due on Receipt';
      case 5:
        return '2% 10 Net 30';
      default:
        return code ? `Code ${code}` : undefined;
    }
  }
}
