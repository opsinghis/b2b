import { Injectable } from '@nestjs/common';
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
  OracleInvoiceStatus,
} from '../interfaces';

/**
 * Canonical models for Oracle ERP Cloud mapping
 * Re-using canonical patterns from other connectors
 */
export interface CanonicalOrder {
  id: string;
  externalId?: string;
  orderNumber: string;
  customerId: string;
  customerName?: string;
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
  line3?: string;
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
  customerName?: string;
  status: string;
  invoiceDate: Date;
  dueDate?: Date;
  deliveredDate?: Date;
  currency: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountDue: number;
  amountPaid: number;
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
 * Oracle ERP Cloud Mapper Service
 * Maps between Oracle entities and canonical models
 */
@Injectable()
export class OracleMapperService {
  /**
   * Map Oracle Sales Order to Canonical Order
   */
  mapSalesOrderToCanonical(order: OracleSalesOrder): CanonicalOrder {
    return {
      id: String(order.OrderId || ''),
      externalId: String(order.OrderId || ''),
      orderNumber: order.OrderNumber || order.SourceTransactionNumber || '',
      customerId: String(order.BillToCustomerAccountId || order.BuyingPartyId || ''),
      customerName: order.BuyingPartyName,
      status: this.mapSalesOrderStatus(order.StatusCode, order.FulfillmentStatus),
      orderDate: order.OrderedDate ? new Date(order.OrderedDate) : new Date(),
      requestedDeliveryDate: order.RequestedFulfillmentDate
        ? new Date(order.RequestedFulfillmentDate)
        : order.RequestedShipDate
          ? new Date(order.RequestedShipDate)
          : undefined,
      currency: order.TransactionalCurrencyCode || 'USD',
      subtotal: this.calculateSubtotal(order),
      tax: order.TaxAmount || 0,
      discount: order.DiscountAmount || 0,
      shipping: order.FreightAmount || 0,
      total: order.TotalAmount || 0,
      items: order.lines?.map((line) => this.mapSalesOrderLineToCanonical(line)) || [],
      notes: order.CustomerPONumber ? `PO: ${order.CustomerPONumber}` : undefined,
      metadata: {
        source: 'oracle_erp_cloud',
        sourceTransactionNumber: order.SourceTransactionNumber,
        sourceTransactionSystem: order.SourceTransactionSystem,
        businessUnitId: order.SellingBusinessUnitId,
        businessUnitName: order.SellingBusinessUnitName,
        fulfillmentStatus: order.FulfillmentStatus,
        buyingPartyId: order.BuyingPartyId,
        buyingPartyNumber: order.BuyingPartyNumber,
      },
      createdAt: order.CreationDate ? new Date(order.CreationDate) : new Date(),
      updatedAt: order.LastUpdateDate ? new Date(order.LastUpdateDate) : new Date(),
    };
  }

  /**
   * Map Oracle Sales Order Line to Canonical Order Item
   */
  mapSalesOrderLineToCanonical(line: OracleSalesOrderLine): CanonicalOrderItem {
    return {
      id: String(line.OrderLineId || ''),
      productId: String(line.ProductId || ''),
      sku: line.ProductNumber || '',
      name: line.ProductDescription || '',
      quantity: line.OrderedQuantity || 0,
      unitPrice: line.UnitSellingPrice || line.UnitListPrice || 0,
      discount: line.DiscountAmount || 0,
      tax: line.TaxAmount || 0,
      total: line.ExtendedAmount || 0,
      unit: line.OrderedUOMCode || 'EA',
      lineNumber: line.LineNumber || 0,
      metadata: {
        lineStatus: line.LineStatus,
        fulfillmentLineStatus: line.FulfillmentLineStatus,
        sourceLineNumber: line.SourceLineNumber,
        scheduledShipDate: line.ScheduleShipDate,
        actualShipDate: line.ActualShipDate,
        shipToPartyId: line.ShipToPartyId,
      },
    };
  }

  /**
   * Map Oracle Customer to Canonical Customer
   */
  mapCustomerToCanonical(customer: OracleCustomer): CanonicalCustomer {
    return {
      id: String(customer.CustomerAccountId || customer.PartyId || ''),
      externalId: String(customer.CustomerAccountId || customer.PartyId || ''),
      customerNumber: customer.CustomerAccountNumber || customer.PartyNumber,
      type: this.mapCustomerType(customer.PartyType),
      name: customer.PartyName || '',
      email: customer.PrimaryEmailAddress || '',
      phone: customer.PrimaryPhoneNumber || '',
      website: customer.PrimaryURL,
      status: this.mapCustomerStatus(customer.CustomerAccountStatus || customer.Status),
      addresses: customer.Addresses?.map((addr) => this.mapAddressToCanonical(addr)) || [],
      creditLimit: customer.CreditLimit,
      creditHold: customer.CreditHold,
      paymentTerms: customer.PaymentTermsName || customer.PaymentTermsCode,
      currency: customer.CurrencyCode || 'USD',
      metadata: {
        source: 'oracle_erp_cloud',
        partyId: customer.PartyId,
        partyNumber: customer.PartyNumber,
        partyType: customer.PartyType,
        customerType: customer.CustomerType,
        customerClassCode: customer.CustomerClassCode,
        customerCategoryCode: customer.CustomerCategoryCode,
        salesPersonId: customer.SalesPersonId,
        salesPersonName: customer.SalesPersonName,
        taxpayerIdentificationNumber: customer.TaxpayerIdentificationNumber,
      },
      createdAt: customer.CreationDate ? new Date(customer.CreationDate) : new Date(),
      updatedAt: customer.LastUpdateDate ? new Date(customer.LastUpdateDate) : new Date(),
    };
  }

  /**
   * Map Oracle Contact to Canonical Customer (as individual)
   */
  mapContactToCanonical(contact: OracleContact): CanonicalCustomer {
    return {
      id: String(contact.ContactId || ''),
      externalId: String(contact.ContactId || ''),
      customerNumber: contact.ContactNumber,
      type: 'individual',
      name: contact.FullName || `${contact.FirstName} ${contact.LastName}`,
      firstName: contact.FirstName,
      lastName: contact.LastName,
      email: contact.EmailAddress || '',
      phone: contact.PhoneNumber || '',
      mobile: contact.MobileNumber,
      status: contact.Status === 'A' ? 'active' : 'inactive',
      addresses: [],
      currency: 'USD',
      metadata: {
        source: 'oracle_erp_cloud',
        jobTitle: contact.JobTitle,
        isPrimary: contact.IsPrimary,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Map Oracle Address to Canonical Address
   */
  mapAddressToCanonical(address: OracleAddress): CanonicalAddress {
    return {
      type: address.AddressType || (address.IsPrimary ? 'primary' : 'secondary'),
      line1: address.Address1 || '',
      line2: address.Address2,
      line3: address.Address3,
      city: address.City || '',
      state: address.State,
      postalCode: address.PostalCode || '',
      country: address.Country || '',
    };
  }

  /**
   * Map Oracle Item to Canonical Product
   */
  mapItemToCanonical(item: OracleItem): CanonicalProduct {
    return {
      id: String(item.InventoryItemId || ''),
      externalId: String(item.InventoryItemId || ''),
      sku: item.ItemNumber || '',
      name: item.ItemDescription || '',
      description: item.LongDescription,
      type: this.mapItemType(item.ItemType),
      status: item.ItemStatus === 'Active' ? 'active' : 'inactive',
      price: item.ListPrice || 0,
      cost: item.StandardCost,
      unit: item.PrimaryUOMCode || 'EA',
      isStockItem: item.StockEnabledFlag,
      metadata: {
        source: 'oracle_erp_cloud',
        organizationId: item.OrganizationId,
        organizationCode: item.OrganizationCode,
        catalogGroupId: item.ItemCatalogGroupId,
        shippable: item.ShippableFlag,
        orderable: item.OrderableFlag,
        purchasingEnabled: item.PurchasingEnabledFlag,
        weight: item.Weight,
        weightUom: item.WeightUOMCode,
        volume: item.Volume,
        volumeUom: item.VolumeUOMCode,
        secondaryUom: item.SecondaryUOMCode,
      },
      createdAt: item.CreationDate ? new Date(item.CreationDate) : new Date(),
      updatedAt: item.LastUpdateDate ? new Date(item.LastUpdateDate) : new Date(),
    };
  }

  /**
   * Map Oracle Invoice to Canonical Invoice
   */
  mapInvoiceToCanonical(invoice: OracleInvoice): CanonicalInvoice {
    return {
      id: String(invoice.CustomerTrxId || ''),
      externalId: String(invoice.CustomerTrxId || ''),
      invoiceNumber: invoice.TransactionNumber || '',
      orderId: invoice.SalesOrderId ? String(invoice.SalesOrderId) : undefined,
      customerId: String(invoice.CustomerAccountId || invoice.BillToCustomerId || ''),
      customerName: invoice.CustomerName,
      status: this.mapInvoiceStatus(invoice.StatusCode || invoice.Status),
      invoiceDate: invoice.TransactionDate ? new Date(invoice.TransactionDate) : new Date(),
      dueDate: invoice.DueDate ? new Date(invoice.DueDate) : undefined,
      currency: invoice.CurrencyCode || 'USD',
      subtotal: invoice.InvoicedAmount || 0,
      tax: invoice.TaxAmount || 0,
      discount: 0, // Oracle stores as line-level
      total:
        (invoice.InvoicedAmount || 0) + (invoice.TaxAmount || 0) + (invoice.FreightAmount || 0),
      amountDue: invoice.BalanceDue || invoice.AmountDue || 0,
      amountPaid: invoice.AmountApplied || 0,
      items: invoice.Lines?.map((line) => this.mapInvoiceLineToCanonical(line)) || [],
      metadata: {
        source: 'oracle_erp_cloud',
        transactionType: invoice.TransactionTypeName,
        transactionTypeId: invoice.TransactionTypeId,
        businessUnitId: invoice.BusinessUnitId,
        businessUnitName: invoice.BusinessUnitName,
        legalEntityId: invoice.LegalEntityId,
        legalEntityName: invoice.LegalEntityName,
        paymentTermsId: invoice.PaymentTermsId,
        paymentTermsName: invoice.PaymentTermsName,
        salesOrderNumber: invoice.SalesOrderNumber,
        customerAccountNumber: invoice.CustomerAccountNumber,
      },
      createdAt: invoice.CreationDate ? new Date(invoice.CreationDate) : new Date(),
      updatedAt: invoice.LastUpdateDate ? new Date(invoice.LastUpdateDate) : new Date(),
    };
  }

  /**
   * Map Oracle Invoice Line to Canonical Invoice Item
   */
  mapInvoiceLineToCanonical(line: OracleInvoiceLine): CanonicalInvoiceItem {
    return {
      id: String(line.CustomerTrxLineId || ''),
      productId: String(line.InventoryItemId || ''),
      sku: line.ItemNumber || '',
      name: line.Description || line.ItemDescription || '',
      quantity: line.Quantity || 0,
      unitPrice: line.UnitSellingPrice || 0,
      discount: 0,
      tax: line.TaxAmount || 0,
      total: line.ExtendedAmount || 0,
      unit: line.UOMCode || 'EA',
      lineNumber: line.LineNumber || 0,
    };
  }

  // ==================== Reverse Mappings (Canonical to Oracle) ====================

  /**
   * Map Canonical Order to Oracle Sales Order payload
   */
  mapCanonicalToSalesOrder(order: Partial<CanonicalOrder>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (order.orderNumber) {
      payload.SourceTransactionNumber = order.orderNumber;
    }

    if (order.requestedDeliveryDate) {
      payload.RequestedFulfillmentDate = order.requestedDeliveryDate.toISOString();
    }

    if (order.notes) {
      payload.CustomerPONumber = order.notes.replace('PO: ', '');
    }

    return payload;
  }

  /**
   * Map Canonical Customer to Oracle Account payload
   */
  mapCanonicalToCustomer(customer: Partial<CanonicalCustomer>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (customer.name) {
      payload.PartyName = customer.name;
    }

    if (customer.email) {
      payload.PrimaryEmailAddress = customer.email;
    }

    if (customer.phone) {
      payload.PrimaryPhoneNumber = customer.phone;
    }

    if (customer.website) {
      payload.PrimaryURL = customer.website;
    }

    if (customer.creditLimit !== undefined) {
      payload.CreditLimit = customer.creditLimit;
    }

    if (customer.currency) {
      payload.CurrencyCode = customer.currency;
    }

    if (customer.addresses && customer.addresses.length > 0) {
      payload.addresses = customer.addresses.map((addr) => ({
        Address1: addr.line1,
        Address2: addr.line2,
        Address3: addr.line3,
        City: addr.city,
        State: addr.state,
        PostalCode: addr.postalCode,
        Country: addr.country,
        AddressType: addr.type,
      }));
    }

    return payload;
  }

  // ==================== Helper Methods ====================

  /**
   * Map sales order status to canonical status
   */
  private mapSalesOrderStatus(statusCode?: string, fulfillmentStatus?: string): string {
    // Priority to fulfillment status for shipped/delivered
    if (fulfillmentStatus) {
      switch (fulfillmentStatus.toUpperCase()) {
        case 'SHIPPED':
          return 'shipped';
        case 'DELIVERED':
          return 'delivered';
        case 'PARTIALLY_SHIPPED':
          return 'partially_shipped';
      }
    }

    switch (statusCode?.toUpperCase()) {
      case OracleSalesOrderStatus.DRAFT:
        return 'draft';
      case OracleSalesOrderStatus.OPEN:
        return 'open';
      case OracleSalesOrderStatus.BOOKED:
        return 'confirmed';
      case OracleSalesOrderStatus.CLOSED:
        return 'closed';
      case OracleSalesOrderStatus.CANCELLED:
        return 'cancelled';
      case OracleSalesOrderStatus.AWAITING_BILLING:
        return 'awaiting_billing';
      case OracleSalesOrderStatus.AWAITING_SHIPPING:
        return 'awaiting_shipping';
      case OracleSalesOrderStatus.PARTIALLY_SHIPPED:
        return 'partially_shipped';
      case OracleSalesOrderStatus.SHIPPED:
        return 'shipped';
      case OracleSalesOrderStatus.PARTIALLY_FULFILLED:
        return 'partially_fulfilled';
      case OracleSalesOrderStatus.FULFILLED:
        return 'fulfilled';
      default:
        return statusCode?.toLowerCase() || 'unknown';
    }
  }

  /**
   * Map invoice status to canonical status
   */
  private mapInvoiceStatus(status?: string): string {
    switch (status?.toUpperCase()) {
      case OracleInvoiceStatus.INCOMPLETE:
        return 'draft';
      case OracleInvoiceStatus.COMPLETE:
        return 'complete';
      case OracleInvoiceStatus.APPROVED:
        return 'approved';
      case OracleInvoiceStatus.PENDING_APPROVAL:
        return 'pending_approval';
      case OracleInvoiceStatus.REJECTED:
        return 'rejected';
      case OracleInvoiceStatus.CLOSED:
        return 'closed';
      case OracleInvoiceStatus.VOID:
        return 'voided';
      default:
        return status?.toLowerCase() || 'unknown';
    }
  }

  /**
   * Map customer type
   */
  private mapCustomerType(partyType?: string): 'business' | 'individual' {
    switch (partyType?.toUpperCase()) {
      case 'ORGANIZATION':
        return 'business';
      case 'PERSON':
        return 'individual';
      default:
        return 'business';
    }
  }

  /**
   * Map customer status
   */
  private mapCustomerStatus(status?: string): 'active' | 'inactive' {
    switch (status?.toUpperCase()) {
      case 'A':
      case 'ACTIVE':
        return 'active';
      default:
        return 'inactive';
    }
  }

  /**
   * Map item type
   */
  private mapItemType(itemType?: string): string {
    switch (itemType?.toUpperCase()) {
      case 'FINISHED_GOODS':
        return 'finished_goods';
      case 'RAW_MATERIALS':
        return 'raw_material';
      case 'SUBASSEMBLY':
        return 'subassembly';
      case 'PURCHASED':
        return 'purchased';
      case 'SERVICE':
        return 'service';
      default:
        return itemType?.toLowerCase() || 'product';
    }
  }

  /**
   * Calculate subtotal from order
   */
  private calculateSubtotal(order: OracleSalesOrder): number {
    // If lines exist, sum them up
    if (order.lines && order.lines.length > 0) {
      return order.lines.reduce((sum, line) => sum + (line.ExtendedAmount || 0), 0);
    }

    // Otherwise calculate from total
    return (
      (order.TotalAmount || 0) -
      (order.TaxAmount || 0) -
      (order.FreightAmount || 0) +
      (order.DiscountAmount || 0)
    );
  }
}
