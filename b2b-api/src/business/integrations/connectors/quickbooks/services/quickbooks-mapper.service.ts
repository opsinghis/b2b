import { Injectable } from '@nestjs/common';
import {
  QuickBooksCustomer,
  QuickBooksItem,
  QuickBooksInvoice,
  QuickBooksSalesReceipt,
  QuickBooksPayment,
  QuickBooksLine,
  QuickBooksAddress,
} from '../interfaces';

/**
 * Canonical models for QuickBooks mapping
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

export interface CanonicalPayment {
  id: string;
  externalId?: string;
  paymentNumber?: string;
  customerId: string;
  customerName?: string;
  paymentDate: Date;
  amount: number;
  currency: string;
  paymentMethod?: string;
  referenceNumber?: string;
  unappliedAmount?: number;
  appliedInvoices: {
    invoiceId: string;
    amount: number;
  }[];
  status: 'applied' | 'unapplied' | 'partial' | 'voided';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * QuickBooks Mapper Service
 * Maps between QuickBooks entities and canonical models
 */
@Injectable()
export class QuickBooksMapperService {
  /**
   * Map QuickBooks Customer to Canonical Customer
   */
  mapCustomerToCanonical(customer: QuickBooksCustomer): CanonicalCustomer {
    const addresses: CanonicalAddress[] = [];

    if (customer.BillAddr) {
      addresses.push(this.mapAddressToCanonical(customer.BillAddr, 'billing'));
    }

    if (customer.ShipAddr) {
      addresses.push(this.mapAddressToCanonical(customer.ShipAddr, 'shipping'));
    }

    return {
      id: customer.Id || '',
      externalId: customer.Id,
      customerNumber: customer.Id,
      type: customer.CompanyName ? 'business' : 'individual',
      name:
        customer.DisplayName ||
        customer.CompanyName ||
        `${customer.GivenName} ${customer.FamilyName}`,
      firstName: customer.GivenName,
      lastName: customer.FamilyName,
      email: customer.PrimaryEmailAddr?.Address || '',
      phone: customer.PrimaryPhone?.FreeFormNumber || '',
      mobile: customer.Mobile?.FreeFormNumber,
      website: customer.WebAddr?.URI,
      status: customer.Active === false ? 'inactive' : 'active',
      addresses,
      creditLimit: undefined, // QuickBooks doesn't have credit limit
      creditHold: undefined,
      paymentTerms: customer.SalesTermRef?.name,
      currency: customer.CurrencyRef?.value || 'USD',
      metadata: {
        source: 'quickbooks_online',
        syncToken: customer.SyncToken,
        fullyQualifiedName: customer.FullyQualifiedName,
        taxable: customer.Taxable,
        balance: customer.Balance,
        balanceWithJobs: customer.BalanceWithJobs,
        preferredDeliveryMethod: customer.PreferredDeliveryMethod,
        job: customer.Job,
        parentRef: customer.ParentRef?.value,
        level: customer.Level,
      },
      createdAt: customer.MetaData?.CreateTime
        ? new Date(customer.MetaData.CreateTime)
        : new Date(),
      updatedAt: customer.MetaData?.LastUpdatedTime
        ? new Date(customer.MetaData.LastUpdatedTime)
        : new Date(),
    };
  }

  /**
   * Map QuickBooks Item to Canonical Product
   */
  mapItemToCanonical(item: QuickBooksItem): CanonicalProduct {
    return {
      id: item.Id || '',
      externalId: item.Id,
      sku: item.Sku || item.Name || '',
      name: item.Name || '',
      description: item.Description,
      type: this.mapItemType(item.Type),
      status: item.Active === false ? 'inactive' : 'active',
      price: item.UnitPrice || 0,
      cost: item.PurchaseCost,
      unit: 'EA', // QuickBooks doesn't have UOM at item level
      quantityOnHand: item.QtyOnHand,
      isStockItem: item.TrackQtyOnHand || item.Type === 'Inventory',
      metadata: {
        source: 'quickbooks_online',
        syncToken: item.SyncToken,
        fullyQualifiedName: item.FullyQualifiedName,
        taxable: item.Taxable,
        purchaseDescription: item.PurchaseDesc,
        incomeAccountRef: item.IncomeAccountRef?.value,
        expenseAccountRef: item.ExpenseAccountRef?.value,
        assetAccountRef: item.AssetAccountRef?.value,
        invStartDate: item.InvStartDate,
        subItem: item.SubItem,
        parentRef: item.ParentRef?.value,
        level: item.Level,
      },
      createdAt: item.MetaData?.CreateTime ? new Date(item.MetaData.CreateTime) : new Date(),
      updatedAt: item.MetaData?.LastUpdatedTime
        ? new Date(item.MetaData.LastUpdatedTime)
        : new Date(),
    };
  }

  /**
   * Map QuickBooks Invoice to Canonical Invoice
   */
  mapInvoiceToCanonical(invoice: QuickBooksInvoice): CanonicalInvoice {
    const lineItems = this.mapLineItemsToCanonical(invoice.Line || []);
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

    return {
      id: invoice.Id || '',
      externalId: invoice.Id,
      invoiceNumber: invoice.DocNumber || invoice.Id || '',
      customerId: invoice.CustomerRef?.value || '',
      customerName: invoice.CustomerRef?.name,
      status: this.mapInvoiceStatus(invoice),
      invoiceDate: invoice.TxnDate ? new Date(invoice.TxnDate) : new Date(),
      dueDate: invoice.DueDate ? new Date(invoice.DueDate) : undefined,
      deliveredDate: invoice.DeliveryInfo?.DeliveryTime
        ? new Date(invoice.DeliveryInfo.DeliveryTime)
        : undefined,
      currency: invoice.CurrencyRef?.value || 'USD',
      subtotal,
      tax: invoice.TxnTaxDetail?.TotalTax || 0,
      discount: this.calculateDiscount(invoice.Line || []),
      total: invoice.TotalAmt || 0,
      amountDue: invoice.Balance || 0,
      amountPaid: (invoice.TotalAmt || 0) - (invoice.Balance || 0),
      items: lineItems,
      billingAddress: invoice.BillAddr
        ? this.mapAddressToCanonical(invoice.BillAddr, 'billing')
        : undefined,
      shippingAddress: invoice.ShipAddr
        ? this.mapAddressToCanonical(invoice.ShipAddr, 'shipping')
        : undefined,
      metadata: {
        source: 'quickbooks_online',
        syncToken: invoice.SyncToken,
        printStatus: invoice.PrintStatus,
        emailStatus: invoice.EmailStatus,
        shipDate: invoice.ShipDate,
        trackingNum: invoice.TrackingNum,
        exchangeRate: invoice.ExchangeRate,
        allowOnlinePayment: invoice.AllowOnlinePayment,
        deposit: invoice.Deposit,
        linkedTxn: invoice.LinkedTxn,
      },
      createdAt: invoice.MetaData?.CreateTime ? new Date(invoice.MetaData.CreateTime) : new Date(),
      updatedAt: invoice.MetaData?.LastUpdatedTime
        ? new Date(invoice.MetaData.LastUpdatedTime)
        : new Date(),
    };
  }

  /**
   * Map QuickBooks Sales Receipt to Canonical Order
   */
  mapSalesReceiptToCanonical(salesReceipt: QuickBooksSalesReceipt): CanonicalOrder {
    const lineItems = this.mapLineItemsToOrderItems(salesReceipt.Line || []);
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

    return {
      id: salesReceipt.Id || '',
      externalId: salesReceipt.Id,
      orderNumber: salesReceipt.DocNumber || salesReceipt.Id || '',
      customerId: salesReceipt.CustomerRef?.value || '',
      customerName: salesReceipt.CustomerRef?.name,
      status: 'completed', // Sales receipts are always completed (paid)
      orderDate: salesReceipt.TxnDate ? new Date(salesReceipt.TxnDate) : new Date(),
      requestedDeliveryDate: salesReceipt.ShipDate ? new Date(salesReceipt.ShipDate) : undefined,
      currency: salesReceipt.CurrencyRef?.value || 'USD',
      subtotal,
      tax: salesReceipt.TxnTaxDetail?.TotalTax || 0,
      discount: this.calculateDiscount(salesReceipt.Line || []),
      shipping: 0, // QuickBooks handles shipping as line item
      total: salesReceipt.TotalAmt || 0,
      items: lineItems,
      billingAddress: salesReceipt.BillAddr
        ? this.mapAddressToCanonical(salesReceipt.BillAddr, 'billing')
        : undefined,
      shippingAddress: salesReceipt.ShipAddr
        ? this.mapAddressToCanonical(salesReceipt.ShipAddr, 'shipping')
        : undefined,
      notes: salesReceipt.PrivateNote,
      metadata: {
        source: 'quickbooks_online',
        syncToken: salesReceipt.SyncToken,
        printStatus: salesReceipt.PrintStatus,
        emailStatus: salesReceipt.EmailStatus,
        shipDate: salesReceipt.ShipDate,
        trackingNum: salesReceipt.TrackingNum,
        paymentMethod: salesReceipt.PaymentMethodRef?.name,
        paymentRefNum: salesReceipt.PaymentRefNum,
        depositToAccount: salesReceipt.DepositToAccountRef?.value,
      },
      createdAt: salesReceipt.MetaData?.CreateTime
        ? new Date(salesReceipt.MetaData.CreateTime)
        : new Date(),
      updatedAt: salesReceipt.MetaData?.LastUpdatedTime
        ? new Date(salesReceipt.MetaData.LastUpdatedTime)
        : new Date(),
    };
  }

  /**
   * Map QuickBooks Payment to Canonical Payment
   */
  mapPaymentToCanonical(payment: QuickBooksPayment): CanonicalPayment {
    const appliedInvoices = this.extractAppliedInvoices(payment.Line || []);

    return {
      id: payment.Id || '',
      externalId: payment.Id,
      paymentNumber: payment.PaymentRefNum,
      customerId: payment.CustomerRef?.value || '',
      customerName: payment.CustomerRef?.name,
      paymentDate: payment.TxnDate ? new Date(payment.TxnDate) : new Date(),
      amount: payment.TotalAmt || 0,
      currency: payment.CurrencyRef?.value || 'USD',
      paymentMethod: payment.PaymentMethodRef?.name,
      referenceNumber: payment.PaymentRefNum,
      unappliedAmount: payment.UnappliedAmt,
      appliedInvoices,
      status: this.mapPaymentStatus(payment),
      metadata: {
        source: 'quickbooks_online',
        syncToken: payment.SyncToken,
        processPayment: payment.ProcessPayment,
        depositToAccount: payment.DepositToAccountRef?.value,
        exchangeRate: payment.ExchangeRate,
      },
      createdAt: payment.MetaData?.CreateTime ? new Date(payment.MetaData.CreateTime) : new Date(),
      updatedAt: payment.MetaData?.LastUpdatedTime
        ? new Date(payment.MetaData.LastUpdatedTime)
        : new Date(),
    };
  }

  /**
   * Map QuickBooks Address to Canonical Address
   */
  mapAddressToCanonical(address: QuickBooksAddress, type: string): CanonicalAddress {
    return {
      type,
      line1: address.Line1 || '',
      line2: address.Line2,
      line3: address.Line3,
      city: address.City || '',
      state: address.CountrySubDivisionCode,
      postalCode: address.PostalCode || '',
      country: address.Country || '',
    };
  }

  /**
   * Map line items to canonical invoice items
   */
  private mapLineItemsToCanonical(lines: QuickBooksLine[]): CanonicalInvoiceItem[] {
    return lines
      .filter((line) => line.DetailType === 'SalesItemLineDetail')
      .map((line, index) => ({
        id: line.Id || String(index + 1),
        productId: line.SalesItemLineDetail?.ItemRef?.value || '',
        sku: line.SalesItemLineDetail?.ItemRef?.name || '',
        name: line.Description || line.SalesItemLineDetail?.ItemRef?.name || '',
        quantity: line.SalesItemLineDetail?.Qty || 1,
        unitPrice: line.SalesItemLineDetail?.UnitPrice || 0,
        discount: line.SalesItemLineDetail?.DiscountAmt || 0,
        tax: 0, // Tax is at transaction level in QuickBooks
        total: line.Amount || 0,
        unit: 'EA',
        lineNumber: line.LineNum || index + 1,
      }));
  }

  /**
   * Map line items to canonical order items
   */
  private mapLineItemsToOrderItems(lines: QuickBooksLine[]): CanonicalOrderItem[] {
    return lines
      .filter((line) => line.DetailType === 'SalesItemLineDetail')
      .map((line, index) => ({
        id: line.Id || String(index + 1),
        productId: line.SalesItemLineDetail?.ItemRef?.value || '',
        sku: line.SalesItemLineDetail?.ItemRef?.name || '',
        name: line.Description || line.SalesItemLineDetail?.ItemRef?.name || '',
        quantity: line.SalesItemLineDetail?.Qty || 1,
        unitPrice: line.SalesItemLineDetail?.UnitPrice || 0,
        discount: line.SalesItemLineDetail?.DiscountAmt || 0,
        tax: 0,
        total: line.Amount || 0,
        unit: 'EA',
        lineNumber: line.LineNum || index + 1,
        metadata: {
          serviceDate: line.SalesItemLineDetail?.ServiceDate,
          taxCode: line.SalesItemLineDetail?.TaxCodeRef?.value,
        },
      }));
  }

  /**
   * Calculate total discount from line items
   */
  private calculateDiscount(lines: QuickBooksLine[]): number {
    return lines
      .filter((line) => line.DetailType === 'DiscountLineDetail')
      .reduce((sum, line) => sum + (line.Amount || 0), 0);
  }

  /**
   * Extract applied invoices from payment lines
   */
  private extractAppliedInvoices(
    lines: QuickBooksPayment['Line'],
  ): CanonicalPayment['appliedInvoices'] {
    if (!lines) return [];

    return lines
      .filter((line) => line.LinkedTxn?.some((txn) => txn.TxnType === 'Invoice'))
      .map((line) => {
        const invoiceTxn = line.LinkedTxn?.find((txn) => txn.TxnType === 'Invoice');
        return {
          invoiceId: invoiceTxn?.TxnId || '',
          amount: line.Amount || 0,
        };
      })
      .filter((item) => item.invoiceId);
  }

  /**
   * Map item type
   */
  private mapItemType(type?: string): string {
    switch (type) {
      case 'Inventory':
        return 'inventory';
      case 'NonInventory':
        return 'non_inventory';
      case 'Service':
        return 'service';
      case 'Group':
        return 'group';
      case 'Category':
        return 'category';
      default:
        return type?.toLowerCase() || 'product';
    }
  }

  /**
   * Map invoice status
   */
  private mapInvoiceStatus(invoice: QuickBooksInvoice): string {
    if (!invoice.Balance || invoice.Balance === 0) {
      return 'paid';
    }

    if (invoice.Balance === invoice.TotalAmt) {
      return 'unpaid';
    }

    return 'partial';
  }

  /**
   * Map payment status
   */
  private mapPaymentStatus(payment: QuickBooksPayment): CanonicalPayment['status'] {
    if (!payment.UnappliedAmt || payment.UnappliedAmt === 0) {
      return 'applied';
    }

    if (payment.UnappliedAmt === payment.TotalAmt) {
      return 'unapplied';
    }

    return 'partial';
  }
}
