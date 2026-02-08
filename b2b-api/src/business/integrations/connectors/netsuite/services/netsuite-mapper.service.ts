import { Logger } from '@nestjs/common';
import {
  NetSuiteSalesOrder,
  NetSuiteCustomer,
  NetSuiteItem,
  NetSuiteInvoice,
  NetSuiteInventoryStatus,
  NetSuiteAddress,
} from '../interfaces';

/**
 * Canonical Address Model
 */
export interface CanonicalAddress {
  line1?: string;
  line2?: string;
  line3?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  attention?: string;
  phone?: string;
}

/**
 * Canonical Customer Model
 */
export interface CanonicalCustomer {
  externalId: string;
  sourceSystem: string;
  entityId?: string;
  name: string;
  isCompany: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  balance?: number;
  creditLimit?: number;
  availableCredit?: number;
  overdueBalance?: number;
  isActive: boolean;
  addresses?: CanonicalAddress[];
  metadata?: Record<string, unknown>;
}

/**
 * Canonical Product Model
 */
export interface CanonicalProduct {
  externalId: string;
  sourceSystem: string;
  sku: string;
  name: string;
  description?: string;
  type: string;
  basePrice?: number;
  cost?: number;
  upc?: string;
  weight?: number;
  weightUnit?: string;
  isActive: boolean;
  isTaxable?: boolean;
  quantityOnHand?: number;
  quantityAvailable?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Canonical Order Line Item Model
 */
export interface CanonicalOrderLineItem {
  lineNumber: number;
  productId?: string;
  sku?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
  isFulfilled?: boolean;
  quantityFulfilled?: number;
  quantityBilled?: number;
}

/**
 * Canonical Order Model
 */
export interface CanonicalOrder {
  externalId: string;
  sourceSystem: string;
  orderNumber: string;
  orderDate: string;
  status: string;
  statusCode: string;
  customerId?: string;
  customerName?: string;
  billingAddress?: CanonicalAddress;
  shippingAddress?: CanonicalAddress;
  items: CanonicalOrderLineItem[];
  subtotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  total: number;
  memo?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Canonical Invoice Line Item Model
 */
export interface CanonicalInvoiceLineItem {
  lineNumber: number;
  productId?: string;
  sku?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
}

/**
 * Canonical Invoice Model
 */
export interface CanonicalInvoice {
  externalId: string;
  sourceSystem: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  status: string;
  statusCode: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  orderNumber?: string;
  billingAddress?: CanonicalAddress;
  items: CanonicalInvoiceLineItem[];
  subtotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  total: number;
  amountPaid?: number;
  amountDue?: number;
  memo?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Canonical Inventory Status Model
 */
export interface CanonicalInventoryStatus {
  productId: string;
  sku?: string;
  locationId?: string;
  locationName?: string;
  quantityOnHand: number;
  quantityAvailable: number;
  quantityOnOrder: number;
  quantityCommitted: number;
  quantityBackordered: number;
  averageCost?: number;
  asOfDate: string;
}

/**
 * NetSuite Mapper Service
 * Maps NetSuite-specific models to canonical B2B models
 */
export class NetSuiteMapperService {
  private readonly logger = new Logger(NetSuiteMapperService.name);
  private readonly sourceSystem = 'netsuite';

  /**
   * Map NetSuite customer to canonical format
   */
  mapCustomer(customer: NetSuiteCustomer): CanonicalCustomer {
    const balance = customer.balance || 0;
    const creditLimit = customer.creditLimit || 0;

    return {
      externalId: customer.id || '',
      sourceSystem: this.sourceSystem,
      entityId: customer.entityId,
      name:
        customer.companyName ||
        `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
        customer.entityId ||
        '',
      isCompany: !customer.isPerson,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      balance,
      creditLimit,
      availableCredit: Math.max(0, creditLimit - balance),
      overdueBalance: customer.overdueBalance,
      isActive: !customer.isInactive,
      addresses: customer.addressbook?.map((addr) => this.mapAddress(addr.addressBookAddress)),
      metadata: {
        subsidiary: customer.subsidiary?.id,
        category: customer.category?.id,
        terms: customer.terms?.id,
        priceLevel: customer.priceLevel?.id,
        unbilledOrders: customer.unbilledOrders,
        custentity_external_id: customer.custentity_external_id,
        custentity_b2b_org_id: customer.custentity_b2b_org_id,
      },
    };
  }

  /**
   * Map NetSuite item to canonical product format
   */
  mapProduct(item: NetSuiteItem): CanonicalProduct {
    return {
      externalId: item.id || '',
      sourceSystem: this.sourceSystem,
      sku: item.itemId || '',
      name: item.displayName || item.itemId || '',
      description: item.salesDescription || item.description,
      type: this.mapItemType(item.itemType),
      basePrice: item.basePrice,
      cost: item.cost || item.averageCost,
      upc: item.upcCode,
      weight: item.weight,
      weightUnit: item.weightUnit,
      isActive: !item.isInactive,
      isTaxable: item.isTaxable,
      quantityOnHand: item.quantityOnHand,
      quantityAvailable: item.quantityAvailable,
      metadata: {
        subsidiary: item.subsidiary?.map((s) => s.id),
        department: item.department?.id,
        class: item.class?.id,
        location: item.location?.id,
        taxSchedule: item.taxSchedule?.id,
        vendorName: item.vendorName,
        lastPurchasePrice: item.lastPurchasePrice,
        reorderPoint: item.reorderPoint,
        preferredStockLevel: item.preferredStockLevel,
        custitem_external_id: item.custitem_external_id,
        custitem_b2b_product_id: item.custitem_b2b_product_id,
      },
    };
  }

  /**
   * Map NetSuite sales order to canonical order format
   */
  mapSalesOrder(order: NetSuiteSalesOrder): CanonicalOrder {
    return {
      externalId: order.id || '',
      sourceSystem: this.sourceSystem,
      orderNumber: order.tranId || '',
      orderDate: order.tranDate || '',
      status: order.status?.refName || 'Unknown',
      statusCode: order.status?.id || '',
      customerId: order.entity?.id,
      customerName: order.entity?.refName,
      billingAddress: order.billingAddress ? this.mapAddress(order.billingAddress) : undefined,
      shippingAddress: order.shippingAddress ? this.mapAddress(order.shippingAddress) : undefined,
      items: (order.item || []).map((item, index) => ({
        lineNumber: item.lineNumber || index + 1,
        productId: item.item?.id,
        sku: item.item?.refName,
        description: item.description,
        quantity: item.quantity || 0,
        unitPrice: item.rate,
        lineTotal: item.amount,
        isFulfilled: item.isClosed || item.quantityFulfilled === item.quantity,
        quantityFulfilled: item.quantityFulfilled,
        quantityBilled: item.quantityBilled,
      })),
      subtotal: order.subTotal,
      discountTotal: order.discountTotal,
      taxTotal: order.taxTotal,
      total: order.total || 0,
      memo: order.memo,
      metadata: {
        subsidiary: order.subsidiary?.id,
        location: order.location?.id,
        currency: order.currency?.id,
        exchangeRate: order.exchangeRate,
        terms: order.terms?.id,
        shipMethod: order.shipMethod?.id,
        shipDate: order.shipDate,
        custbody_external_id: order.custbody_external_id,
        custbody_b2b_order_id: order.custbody_b2b_order_id,
      },
    };
  }

  /**
   * Map NetSuite invoice to canonical invoice format
   */
  mapInvoice(invoice: NetSuiteInvoice): CanonicalInvoice {
    return {
      externalId: invoice.id || '',
      sourceSystem: this.sourceSystem,
      invoiceNumber: invoice.tranId || '',
      invoiceDate: invoice.tranDate || '',
      dueDate: invoice.dueDate,
      status: invoice.status?.refName || 'Unknown',
      statusCode: invoice.status?.id || '',
      customerId: invoice.entity?.id,
      customerName: invoice.entity?.refName,
      orderId: invoice.createdFrom?.id,
      orderNumber: invoice.createdFrom?.refName,
      billingAddress: invoice.billingAddress ? this.mapAddress(invoice.billingAddress) : undefined,
      items: (invoice.item || []).map((item, index) => ({
        lineNumber: item.lineNumber || index + 1,
        productId: item.item?.id,
        sku: item.item?.refName,
        description: item.description,
        quantity: item.quantity || 0,
        unitPrice: item.rate,
        lineTotal: item.amount,
      })),
      subtotal: invoice.subTotal,
      discountTotal: invoice.discountTotal,
      taxTotal: invoice.taxTotal,
      total: invoice.total || 0,
      amountPaid: invoice.amountPaid,
      amountDue: invoice.amountRemaining,
      memo: invoice.memo,
      metadata: {
        subsidiary: invoice.subsidiary?.id,
        currency: invoice.currency?.id,
        exchangeRate: invoice.exchangeRate,
        terms: invoice.terms?.id,
        custbody_external_id: invoice.custbody_external_id,
      },
    };
  }

  /**
   * Map NetSuite inventory status to canonical format
   */
  mapInventoryStatus(inventory: NetSuiteInventoryStatus, sku?: string): CanonicalInventoryStatus {
    return {
      productId: inventory.item?.id || '',
      sku,
      locationId: inventory.location?.id,
      locationName: inventory.location?.refName,
      quantityOnHand: inventory.quantityOnHand || 0,
      quantityAvailable: inventory.quantityAvailable || 0,
      quantityOnOrder: inventory.quantityOnOrder || 0,
      quantityCommitted: inventory.quantityCommitted || 0,
      quantityBackordered: inventory.quantityBackOrdered || 0,
      averageCost: inventory.averageCost,
      asOfDate: new Date().toISOString(),
    };
  }

  /**
   * Map NetSuite address to canonical format
   */
  mapAddress(address?: NetSuiteAddress): CanonicalAddress {
    if (!address) {
      return {};
    }

    return {
      line1: address.addr1,
      line2: address.addr2,
      line3: address.addr3,
      city: address.city,
      state: address.state,
      postalCode: address.zip,
      country: address.country?.id || address.country?.refName,
      attention: address.attention,
      phone: address.phone,
    };
  }

  /**
   * Map canonical customer to NetSuite format
   */
  mapCanonicalCustomerToNetSuite(customer: Partial<CanonicalCustomer>): Record<string, unknown> {
    const nsCustomer: Record<string, unknown> = {};

    if (customer.isCompany !== undefined) {
      nsCustomer.isPerson = !customer.isCompany;
    }

    if (customer.name && customer.isCompany) {
      nsCustomer.companyName = customer.name;
    }

    if (customer.firstName) {
      nsCustomer.firstName = customer.firstName;
    }

    if (customer.lastName) {
      nsCustomer.lastName = customer.lastName;
    }

    if (customer.email) {
      nsCustomer.email = customer.email;
    }

    if (customer.phone) {
      nsCustomer.phone = customer.phone;
    }

    if (customer.creditLimit !== undefined) {
      nsCustomer.creditLimit = customer.creditLimit;
    }

    if (customer.externalId) {
      nsCustomer.custentity_external_id = customer.externalId;
    }

    if (customer.addresses && customer.addresses.length > 0) {
      nsCustomer.addressbook = {
        items: customer.addresses.map((addr) => this.mapCanonicalAddressToNetSuite(addr)),
      };
    }

    return nsCustomer;
  }

  /**
   * Map canonical address to NetSuite format
   */
  mapCanonicalAddressToNetSuite(address: CanonicalAddress): Record<string, unknown> {
    return {
      addressBookAddress: {
        addr1: address.line1,
        addr2: address.line2,
        addr3: address.line3,
        city: address.city,
        state: address.state,
        zip: address.postalCode,
        country: address.country ? { id: address.country } : undefined,
        attention: address.attention,
        phone: address.phone,
      },
    };
  }

  /**
   * Map canonical order to NetSuite sales order format
   */
  mapCanonicalOrderToNetSuite(order: Partial<CanonicalOrder>): Record<string, unknown> {
    const nsOrder: Record<string, unknown> = {};

    if (order.customerId) {
      nsOrder.entity = { id: order.customerId };
    }

    if (order.orderDate) {
      nsOrder.tranDate = order.orderDate;
    }

    if (order.externalId) {
      nsOrder.custbody_external_id = order.externalId;
      nsOrder.custbody_b2b_order_id = order.externalId;
    }

    if (order.memo) {
      nsOrder.memo = order.memo;
    }

    if (order.billingAddress) {
      nsOrder.billingAddress = {
        addr1: order.billingAddress.line1,
        addr2: order.billingAddress.line2,
        city: order.billingAddress.city,
        state: order.billingAddress.state,
        zip: order.billingAddress.postalCode,
        country: order.billingAddress.country ? { id: order.billingAddress.country } : undefined,
      };
    }

    if (order.shippingAddress) {
      nsOrder.shippingAddress = {
        addr1: order.shippingAddress.line1,
        addr2: order.shippingAddress.line2,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zip: order.shippingAddress.postalCode,
        country: order.shippingAddress.country ? { id: order.shippingAddress.country } : undefined,
      };
    }

    if (order.items && order.items.length > 0) {
      nsOrder.item = {
        items: order.items.map((item, index) => ({
          lineNumber: item.lineNumber || index + 1,
          item: { id: item.productId },
          quantity: item.quantity,
          rate: item.unitPrice,
          description: item.description,
        })),
      };
    }

    return nsOrder;
  }

  /**
   * Map item type to canonical type
   */
  private mapItemType(itemType?: string): string {
    const typeMap: Record<string, string> = {
      InvtPart: 'inventory',
      NonInvtPart: 'non-inventory',
      Service: 'service',
      Discount: 'discount',
      Markup: 'markup',
      Payment: 'payment',
      Subtotal: 'subtotal',
      Description: 'description',
      Assembly: 'assembly',
      Kit: 'kit',
      SerializedInventoryItem: 'serialized',
      LotNumberedInventoryItem: 'lot-numbered',
    };

    return typeMap[itemType || ''] || 'unknown';
  }
}
