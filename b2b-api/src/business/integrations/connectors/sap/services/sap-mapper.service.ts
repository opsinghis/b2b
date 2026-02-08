import { Injectable, Logger } from '@nestjs/common';
import {
  SapSalesOrder,
  SapSalesOrderItem,
  SapBusinessPartner,
  SapCustomer,
  SapProduct,
  SapBillingDocument,
  SapBillingDocumentItem,
  SapAtpCheckResponse,
  SapCreateSalesOrderInput,
  SapCreateBusinessPartnerInput,
} from '../interfaces';

/**
 * Canonical Order model
 */
export interface CanonicalOrder {
  id?: string;
  externalId?: string;
  orderNumber?: string;
  type: string;
  status: CanonicalOrderStatus;
  customerId: string;
  customerName?: string;
  customerPO?: string;
  orderDate?: Date;
  requestedDeliveryDate?: Date;
  currency: string;
  totalAmount: number;
  items: CanonicalOrderItem[];
  metadata?: Record<string, unknown>;
}

export interface CanonicalOrderItem {
  id?: string;
  lineNumber: number;
  productId: string;
  productName?: string;
  sku?: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice: number;
  status?: string;
}

export enum CanonicalOrderStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

/**
 * Canonical Customer model
 */
export interface CanonicalCustomer {
  id?: string;
  externalId?: string;
  type: 'organization' | 'person';
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  vatNumber?: string;
  language?: string;
  currency?: string;
  creditLimit?: number;
  paymentTerms?: string;
  addresses: CanonicalAddress[];
  metadata?: Record<string, unknown>;
}

export interface CanonicalAddress {
  id?: string;
  type?: 'billing' | 'shipping' | 'general';
  street: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

/**
 * Canonical Product model
 */
export interface CanonicalProduct {
  id?: string;
  externalId?: string;
  sku: string;
  name: string;
  description?: string;
  type?: string;
  category?: string;
  unit: string;
  weight?: number;
  weightUnit?: string;
  price?: number;
  currency?: string;
  status: 'active' | 'inactive' | 'discontinued';
  metadata?: Record<string, unknown>;
}

/**
 * Canonical Invoice model
 */
export interface CanonicalInvoice {
  id?: string;
  externalId?: string;
  invoiceNumber: string;
  type: 'invoice' | 'credit_note' | 'debit_note';
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  customerId: string;
  customerName?: string;
  invoiceDate: Date;
  dueDate?: Date;
  currency: string;
  totalAmount: number;
  taxAmount?: number;
  items: CanonicalInvoiceItem[];
  relatedOrderId?: string;
  metadata?: Record<string, unknown>;
}

export interface CanonicalInvoiceItem {
  lineNumber: number;
  productId: string;
  productName?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Canonical Inventory model
 */
export interface CanonicalInventory {
  productId: string;
  locationId: string;
  locationType: 'warehouse' | 'plant' | 'store';
  availableQuantity: number;
  reservedQuantity: number;
  totalQuantity: number;
  unit: string;
  lastUpdated?: Date;
}

/**
 * SAP Mapper Service
 * Maps between SAP entities and canonical models
 */
@Injectable()
export class SapMapperService {
  private readonly logger = new Logger(SapMapperService.name);

  // ==================== Order Mappings ====================

  /**
   * Map SAP Sales Order to Canonical Order
   */
  mapSalesOrderToCanonical(sapOrder: SapSalesOrder): CanonicalOrder {
    return {
      externalId: sapOrder.SalesOrder,
      orderNumber: sapOrder.SalesOrder,
      type: sapOrder.SalesOrderType || 'OR',
      status: this.mapSapOrderStatus(
        sapOrder.OverallSDProcessStatus,
        sapOrder.OverallDeliveryStatus,
      ),
      customerId: sapOrder.SoldToParty || '',
      customerPO: sapOrder.PurchaseOrderByCustomer,
      orderDate: sapOrder.CreationDate ? new Date(sapOrder.CreationDate) : undefined,
      requestedDeliveryDate: sapOrder.RequestedDeliveryDate
        ? new Date(sapOrder.RequestedDeliveryDate)
        : undefined,
      currency: sapOrder.TransactionCurrency || 'USD',
      totalAmount: parseFloat(sapOrder.TotalNetAmount || '0'),
      items: (sapOrder.to_Item || []).map((item, index) =>
        this.mapSalesOrderItemToCanonical(item, index),
      ),
      metadata: {
        salesOrganization: sapOrder.SalesOrganization,
        distributionChannel: sapOrder.DistributionChannel,
        division: sapOrder.OrganizationDivision,
        deliveryStatus: sapOrder.OverallDeliveryStatus,
        billingStatus: sapOrder.OverallBillingStatus,
      },
    };
  }

  /**
   * Map SAP Sales Order Item to Canonical Order Item
   */
  mapSalesOrderItemToCanonical(sapItem: SapSalesOrderItem, index: number): CanonicalOrderItem {
    return {
      lineNumber: parseInt(sapItem.SalesOrderItem || String(index * 10), 10),
      productId: sapItem.Material || '',
      sku: sapItem.Material,
      quantity: parseFloat(sapItem.RequestedQuantity || '0'),
      unit: sapItem.RequestedQuantityUnit || 'EA',
      totalPrice: parseFloat(sapItem.NetAmount || '0'),
      status: sapItem.DeliveryStatus,
    };
  }

  /**
   * Map Canonical Order to SAP Create Sales Order Input
   */
  mapCanonicalToSalesOrderInput(
    order: CanonicalOrder,
    sapConfig: {
      salesOrganization: string;
      distributionChannel: string;
      division: string;
      salesOrderType?: string;
    },
  ): SapCreateSalesOrderInput {
    return {
      salesOrderType: sapConfig.salesOrderType || 'OR',
      salesOrganization: sapConfig.salesOrganization,
      distributionChannel: sapConfig.distributionChannel,
      division: sapConfig.division,
      soldToParty: order.customerId,
      purchaseOrderByCustomer: order.customerPO,
      requestedDeliveryDate: order.requestedDeliveryDate?.toISOString().split('T')[0],
      items: order.items.map((item) => ({
        material: item.productId,
        requestedQuantity: item.quantity,
        requestedQuantityUnit: item.unit,
        customerMaterial: item.sku,
      })),
    };
  }

  // ==================== Customer Mappings ====================

  /**
   * Map SAP Business Partner to Canonical Customer
   */
  mapBusinessPartnerToCanonical(sapBp: SapBusinessPartner): CanonicalCustomer {
    const isOrganization = sapBp.BusinessPartnerCategory === '2';

    return {
      externalId: sapBp.BusinessPartner,
      type: isOrganization ? 'organization' : 'person',
      name: isOrganization
        ? sapBp.OrganizationBPName1 || sapBp.BusinessPartnerFullName || ''
        : `${sapBp.FirstName || ''} ${sapBp.LastName || ''}`.trim(),
      firstName: sapBp.FirstName,
      lastName: sapBp.LastName,
      taxId: sapBp.TaxNumber1,
      vatNumber: sapBp.VATRegistration,
      language: sapBp.Language,
      addresses: (sapBp.to_BusinessPartnerAddress || []).map((addr) => ({
        street: addr.StreetName || '',
        street2: addr.HouseNumber,
        city: addr.CityName || '',
        state: addr.Region,
        postalCode: addr.PostalCode || '',
        country: addr.Country || '',
        phone: addr.PhoneNumber,
        email: addr.EmailAddress,
      })),
      metadata: {
        customer: sapBp.Customer,
        supplier: sapBp.Supplier,
        isNaturalPerson: sapBp.IsNaturalPerson === 'X',
      },
    };
  }

  /**
   * Map SAP Customer to Canonical Customer (adds sales-specific info)
   */
  mapCustomerToCanonical(sapCustomer: SapCustomer, sapBp?: SapBusinessPartner): CanonicalCustomer {
    const base = sapBp
      ? this.mapBusinessPartnerToCanonical(sapBp)
      : {
          externalId: sapCustomer.Customer,
          type: 'organization' as const,
          name: sapCustomer.CustomerFullName || sapCustomer.CustomerName || '',
          addresses: [],
        };

    return {
      ...base,
      currency: sapCustomer.Currency,
      creditLimit: parseFloat(sapCustomer.CreditLimit || '0'),
      paymentTerms: sapCustomer.PaymentTerms,
      language: sapCustomer.Language || base.language,
      metadata: {
        ...base.metadata,
        customerAccountGroup: sapCustomer.CustomerAccountGroup,
        salesAreas: sapCustomer.to_CustomerSalesArea?.map((sa) => ({
          salesOrganization: sa.SalesOrganization,
          distributionChannel: sa.DistributionChannel,
          division: sa.Division,
          paymentTerms: sa.PaymentTerms,
          currency: sa.Currency,
          incoterms: sa.IncotermsClassification,
          priceGroup: sa.CustomerPriceGroup,
        })),
      },
    };
  }

  /**
   * Map Canonical Customer to SAP Create Business Partner Input
   */
  mapCanonicalToBusinessPartnerInput(customer: CanonicalCustomer): SapCreateBusinessPartnerInput {
    return {
      businessPartnerCategory: customer.type === 'organization' ? '2' : '1',
      firstName: customer.firstName,
      lastName: customer.lastName,
      organizationName1: customer.type === 'organization' ? customer.name : undefined,
      language: customer.language,
      taxNumber1: customer.taxId,
      vatRegistration: customer.vatNumber,
      addresses: customer.addresses.map((addr) => ({
        streetName: addr.street,
        houseNumber: addr.street2,
        postalCode: addr.postalCode,
        cityName: addr.city,
        region: addr.state,
        country: addr.country,
        phoneNumber: addr.phone,
        emailAddress: addr.email,
      })),
    };
  }

  // ==================== Product Mappings ====================

  /**
   * Map SAP Product to Canonical Product
   */
  mapProductToCanonical(sapProduct: SapProduct): CanonicalProduct {
    const description = sapProduct.to_Description?.[0]?.ProductDescription;

    return {
      externalId: sapProduct.Product,
      sku: sapProduct.Product || '',
      name: description || sapProduct.Product || '',
      description,
      type: sapProduct.ProductType,
      category: sapProduct.ProductGroup,
      unit: sapProduct.BaseUnit || 'EA',
      weight: parseFloat(sapProduct.NetWeight || '0'),
      weightUnit: sapProduct.WeightUnit,
      status: this.mapSapProductStatus(sapProduct.CrossPlantStatus),
      metadata: {
        division: sapProduct.Division,
        hierarchy: sapProduct.ProductHierarchy,
        grossWeight: parseFloat(sapProduct.GrossWeight || '0'),
      },
    };
  }

  // ==================== Invoice Mappings ====================

  /**
   * Map SAP Billing Document to Canonical Invoice
   */
  mapBillingDocumentToCanonical(sapDoc: SapBillingDocument): CanonicalInvoice {
    return {
      externalId: sapDoc.BillingDocument,
      invoiceNumber: sapDoc.BillingDocument || '',
      type: this.mapSapBillingType(sapDoc.BillingDocumentType),
      status: 'sent', // SAP billing docs are typically created after processing
      customerId: sapDoc.SoldToParty || '',
      invoiceDate: new Date(sapDoc.BillingDocumentDate || Date.now()),
      currency: sapDoc.TransactionCurrency || 'USD',
      totalAmount: parseFloat(sapDoc.TotalNetAmount || '0'),
      items: (sapDoc.to_Item || []).map((item, index) =>
        this.mapBillingItemToCanonical(item, index),
      ),
      metadata: {
        paymentTerms: sapDoc.PaymentTerms,
        externalReference: sapDoc.AccountingDocExternalReference,
      },
    };
  }

  /**
   * Map SAP Billing Document Item to Canonical Invoice Item
   */
  mapBillingItemToCanonical(sapItem: SapBillingDocumentItem, index: number): CanonicalInvoiceItem {
    const quantity = parseFloat(sapItem.BillingQuantity || '0');
    const totalPrice = parseFloat(sapItem.NetAmount || '0');

    return {
      lineNumber: parseInt(sapItem.BillingDocumentItem || String(index * 10), 10),
      productId: sapItem.Material || '',
      quantity,
      unit: sapItem.BillingQuantityUnit || 'EA',
      unitPrice: quantity > 0 ? totalPrice / quantity : 0,
      totalPrice,
    };
  }

  // ==================== Inventory Mappings ====================

  /**
   * Map SAP ATP Response to Canonical Inventory
   */
  mapAtpToCanonical(atp: SapAtpCheckResponse): CanonicalInventory {
    return {
      productId: atp.Material,
      locationId: atp.Plant,
      locationType: 'plant',
      availableQuantity: atp.AvailableQuantity,
      reservedQuantity: 0, // ATP doesn't provide reserved separately
      totalQuantity: atp.AvailableQuantity,
      unit: atp.QuantityUnit,
    };
  }

  // ==================== Status Mappings ====================

  /**
   * Map SAP order status to canonical status
   */
  private mapSapOrderStatus(overallStatus?: string, deliveryStatus?: string): CanonicalOrderStatus {
    // Delivery completed
    if (deliveryStatus === 'C') {
      return CanonicalOrderStatus.DELIVERED;
    }

    // Partially delivered
    if (deliveryStatus === 'B') {
      return CanonicalOrderStatus.SHIPPED;
    }

    // Based on overall status
    switch (overallStatus) {
      case 'C':
        return CanonicalOrderStatus.COMPLETED;
      case 'B':
        return CanonicalOrderStatus.PROCESSING;
      case 'A':
      default:
        return CanonicalOrderStatus.CONFIRMED;
    }
  }

  /**
   * Map SAP product status to canonical status
   */
  private mapSapProductStatus(crossPlantStatus?: string): 'active' | 'inactive' | 'discontinued' {
    switch (crossPlantStatus) {
      case '01':
      case '02':
      case '03':
        return 'inactive';
      default:
        return 'active';
    }
  }

  /**
   * Map SAP billing document type to canonical type
   */
  private mapSapBillingType(sapType?: string): 'invoice' | 'credit_note' | 'debit_note' {
    switch (sapType) {
      case 'G2':
        return 'credit_note';
      case 'L2':
        return 'debit_note';
      default:
        return 'invoice';
    }
  }
}
