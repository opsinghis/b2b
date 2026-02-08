import { Injectable } from '@nestjs/common';
import {
  X12_850_PurchaseOrder,
  X12_855_PurchaseOrderAck,
  X12_856_ShipNotice,
  X12_810_Invoice,
} from '../interfaces/transaction-sets.types';

/**
 * Canonical Order Model
 */
export interface CanonicalOrder {
  id?: string;
  orderNumber: string;
  orderDate: string;
  orderType: 'purchase_order' | 'release' | 'change';
  status?: string;
  currency?: string;
  buyer: CanonicalParty;
  seller?: CanonicalParty;
  shipTo?: CanonicalParty;
  billTo?: CanonicalParty;
  lineItems: CanonicalOrderLine[];
  references?: CanonicalReference[];
  totals?: {
    lineItemCount: number;
    totalAmount?: number;
  };
  shippingDetails?: {
    carrier?: string;
    serviceType?: string;
    routing?: string;
  };
  notes?: string[];
}

/**
 * Canonical Order Line
 */
export interface CanonicalOrderLine {
  lineNumber: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice?: number;
  extendedPrice?: number;
  productIdentifiers: Array<{
    type: string;
    value: string;
  }>;
  description?: string;
  requestedDeliveryDate?: string;
}

/**
 * Canonical Party
 */
export interface CanonicalParty {
  id?: string;
  name?: string;
  identifiers?: Array<{
    type: string;
    value: string;
  }>;
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  contacts?: Array<{
    name?: string;
    type?: string;
    phone?: string;
    email?: string;
  }>;
}

/**
 * Canonical Reference
 */
export interface CanonicalReference {
  type: string;
  value: string;
  description?: string;
}

/**
 * Canonical Invoice
 */
export interface CanonicalInvoice {
  id?: string;
  invoiceNumber: string;
  invoiceDate: string;
  purchaseOrderNumber?: string;
  purchaseOrderDate?: string;
  currency?: string;
  seller: CanonicalParty;
  buyer?: CanonicalParty;
  billTo?: CanonicalParty;
  remitTo?: CanonicalParty;
  lineItems: CanonicalInvoiceLine[];
  totals: {
    subtotal?: number;
    taxAmount?: number;
    discountAmount?: number;
    totalAmount: number;
  };
  paymentTerms?: {
    netDays?: number;
    discountPercent?: number;
    discountDays?: number;
    description?: string;
  };
  references?: CanonicalReference[];
}

/**
 * Canonical Invoice Line
 */
export interface CanonicalInvoiceLine {
  lineNumber: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  extendedPrice: number;
  productIdentifiers: Array<{
    type: string;
    value: string;
  }>;
  description?: string;
  taxes?: Array<{
    type: string;
    amount?: number;
    rate?: number;
  }>;
}

/**
 * Canonical Shipment
 */
export interface CanonicalShipment {
  id?: string;
  shipmentNumber: string;
  shipmentDate: string;
  purchaseOrderNumbers?: string[];
  carrier?: {
    name?: string;
    code?: string;
    trackingNumbers?: string[];
    serviceType?: string;
  };
  shipFrom?: CanonicalParty;
  shipTo?: CanonicalParty;
  packages: CanonicalPackage[];
  items: CanonicalShipmentItem[];
  totals?: {
    packageCount?: number;
    itemCount?: number;
    weight?: number;
    weightUnit?: string;
  };
}

/**
 * Canonical Package
 */
export interface CanonicalPackage {
  packageNumber?: string;
  packageType?: string;
  weight?: number;
  weightUnit?: string;
  marks?: string[];
  items?: CanonicalShipmentItem[];
}

/**
 * Canonical Shipment Item
 */
export interface CanonicalShipmentItem {
  lineNumber?: string;
  quantity: number;
  unitOfMeasure?: string;
  productIdentifiers?: Array<{
    type: string;
    value: string;
  }>;
  description?: string;
  serialNumbers?: string[];
}

/**
 * X12 Mapper Service
 *
 * Maps X12 transaction sets to/from canonical business models.
 */
@Injectable()
export class X12MapperService {
  /**
   * Map 850 Purchase Order to Canonical Order
   */
  map850ToOrder(po: X12_850_PurchaseOrder): CanonicalOrder {
    const order: CanonicalOrder = {
      orderNumber: po.beg.purchaseOrderNumber,
      orderDate: this.formatDate(po.beg.orderDate),
      orderType: this.mapOrderType(po.beg.purposeCode),
      currency: po.currency?.currencyCode,
      buyer: this.findParty(po.parties, 'BY') || { name: 'Unknown Buyer' },
      seller: this.findParty(po.parties, 'SE'),
      shipTo: this.findParty(po.parties, 'ST'),
      billTo: this.findParty(po.parties, 'BT'),
      lineItems: po.lineItems.map((item, index) => this.mapPO1ToOrderLine(item, index)),
      references: po.references?.map((ref) => ({
        type: this.mapReferenceType(ref.referenceIdQualifier),
        value: ref.referenceId,
        description: ref.description,
      })),
      totals: po.totals
        ? {
            lineItemCount: po.totals.numberOfLineItems,
            totalAmount: po.amounts?.find((a) => a.amountQualifier === 'TT')?.amount,
          }
        : undefined,
      shippingDetails: po.carrierDetails?.[0]
        ? {
            carrier: po.carrierDetails[0].idCode,
            serviceType: po.carrierDetails[0].transportationMethodCode,
            routing: po.carrierDetails[0].routing,
          }
        : undefined,
    };

    return order;
  }

  /**
   * Map Canonical Order to 850 Purchase Order
   */
  mapOrderTo850(order: CanonicalOrder): X12_850_PurchaseOrder {
    const po: X12_850_PurchaseOrder = {
      transactionSetCode: '850',
      controlNumber: '0001',
      beg: {
        purposeCode: this.mapOrderTypeToPurposeCode(order.orderType),
        orderTypeCode: 'SA', // Stand-alone order
        purchaseOrderNumber: order.orderNumber,
        orderDate: this.formatDateForX12(order.orderDate),
      },
      lineItems: order.lineItems.map((item, index) => this.mapOrderLineToPO1(item, index)),
    };

    if (order.currency) {
      po.currency = { currencyCode: order.currency };
    }

    // Map parties
    const parties: NonNullable<X12_850_PurchaseOrder['parties']> = [];

    if (order.buyer) {
      parties.push(this.mapPartyToN1(order.buyer, 'BY'));
    }
    if (order.seller) {
      parties.push(this.mapPartyToN1(order.seller, 'SE'));
    }
    if (order.shipTo) {
      parties.push(this.mapPartyToN1(order.shipTo, 'ST'));
    }
    if (order.billTo) {
      parties.push(this.mapPartyToN1(order.billTo, 'BT'));
    }

    if (parties.length > 0) {
      po.parties = parties;
    }

    // Map references
    if (order.references) {
      po.references = order.references.map((ref) => ({
        referenceIdQualifier: this.mapReferenceTypeToQualifier(ref.type),
        referenceId: ref.value,
        description: ref.description,
      }));
    }

    // Map totals
    if (order.totals) {
      po.totals = {
        numberOfLineItems: order.totals.lineItemCount,
      };

      if (order.totals.totalAmount !== undefined) {
        po.amounts = [
          {
            amountQualifier: 'TT',
            amount: order.totals.totalAmount,
          },
        ];
      }
    }

    return po;
  }

  /**
   * Map 810 Invoice to Canonical Invoice
   */
  map810ToInvoice(inv: X12_810_Invoice): CanonicalInvoice {
    const invoice: CanonicalInvoice = {
      invoiceNumber: inv.big.invoiceNumber,
      invoiceDate: this.formatDate(inv.big.invoiceDate),
      purchaseOrderNumber: inv.big.purchaseOrderNumber,
      purchaseOrderDate: inv.big.purchaseOrderDate
        ? this.formatDate(inv.big.purchaseOrderDate)
        : undefined,
      currency: inv.currency?.currencyCode,
      seller: this.findParty(inv.parties, 'SE') || { name: 'Unknown Seller' },
      buyer: this.findParty(inv.parties, 'BY'),
      billTo: this.findParty(inv.parties, 'BT'),
      remitTo: this.findParty(inv.parties, 'RI'),
      lineItems: inv.lineItems.map((item, index) => this.mapIT1ToInvoiceLine(item, index)),
      totals: {
        totalAmount: inv.totalSummary.totalInvoiceAmount,
        subtotal: inv.totalSummary.amountSubjectToTermsDiscount,
        discountAmount: inv.totalSummary.termsDiscountAmount,
        taxAmount: inv.taxes?.reduce((sum, t) => sum + (t.taxAmount || 0), 0),
      },
      paymentTerms: inv.paymentTerms
        ? {
            netDays: inv.paymentTerms.termsNetDays,
            discountPercent: inv.paymentTerms.termsDiscountPercent,
            discountDays: inv.paymentTerms.termsDiscountDaysDue,
            description: inv.paymentTerms.description,
          }
        : undefined,
      references: inv.references?.map((ref) => ({
        type: this.mapReferenceType(ref.referenceIdQualifier),
        value: ref.referenceId,
        description: ref.description,
      })),
    };

    return invoice;
  }

  /**
   * Map 856 Ship Notice to Canonical Shipment
   */
  map856ToShipment(asn: X12_856_ShipNotice): CanonicalShipment {
    const shipment: CanonicalShipment = {
      shipmentNumber: asn.bsn.shipmentIdNumber,
      shipmentDate: this.formatDate(asn.bsn.shipmentDate),
      packages: [],
      items: [],
    };

    // Extract data from hierarchical levels
    const poNumbers: string[] = [];

    for (const level of asn.hierarchicalLevels) {
      switch (level.hierarchicalLevelCode) {
        case 'S': // Shipment level
          if (level.shipment) {
            if (level.shipment.carrier) {
              shipment.carrier = {
                code: level.shipment.carrier.carrierCode,
                serviceType: level.shipment.carrier.transportationMethodCode,
              };
            }

            const shipFrom = level.shipment.parties?.find((p) => p.entityIdCode === 'SF');
            if (shipFrom) {
              shipment.shipFrom = this.mapX12PartyToCanonical(shipFrom);
            }

            const shipTo = level.shipment.parties?.find((p) => p.entityIdCode === 'ST');
            if (shipTo) {
              shipment.shipTo = this.mapX12PartyToCanonical(shipTo);
            }
          }
          break;

        case 'O': // Order level
          if (level.order?.purchaseOrderNumber) {
            poNumbers.push(level.order.purchaseOrderNumber);
          }
          break;

        case 'P': // Pack level
          if (level.pack?.packaging) {
            shipment.packages.push({
              packageType: level.pack.packaging.packagingCode,
              weight: level.pack.packaging.weight,
              weightUnit: level.pack.packaging.weightUnitCode,
              marks: level.pack.marks?.map((m) => m.shipmentMarks || '').filter(Boolean),
            });
          }
          break;

        case 'I': // Item level
          if (level.item) {
            const item: CanonicalShipmentItem = {
              lineNumber: level.item.lineItemNumber,
              quantity: level.item.quantities?.[0]?.quantity || 0,
              unitOfMeasure: level.item.quantities?.[0]?.unitOfMeasure,
              productIdentifiers: level.item.productIds?.map((p) => ({
                type: this.mapProductIdType(p.qualifier),
                value: p.id,
              })),
              description: level.item.descriptions?.[0]?.description,
              serialNumbers: level.item.serialNumbers,
            };
            shipment.items.push(item);
          }
          break;
      }
    }

    if (poNumbers.length > 0) {
      shipment.purchaseOrderNumbers = poNumbers;
    }

    // Set totals
    if (asn.totals) {
      shipment.totals = {
        itemCount: asn.totals.numberOfLineItems,
        packageCount: shipment.packages.length,
      };
    }

    return shipment;
  }

  // Helper methods

  private findParty(
    parties: X12_850_PurchaseOrder['parties'] | X12_810_Invoice['parties'],
    entityIdCode: string,
  ): CanonicalParty | undefined {
    const party = parties?.find((p) => p.entityIdCode === entityIdCode);
    if (!party) return undefined;
    return this.mapX12PartyToCanonical(party);
  }

  private mapX12PartyToCanonical(party: any): CanonicalParty {
    return {
      id: party.idCode,
      name: party.name,
      identifiers: party.idCode
        ? [{ type: this.mapIdQualifierType(party.idCodeQualifier), value: party.idCode }]
        : undefined,
      address: party.address
        ? {
            street1: party.address.addressLine1,
            street2: party.address.addressLine2,
            city: party.address.city,
            state: party.address.stateCode,
            postalCode: party.address.postalCode,
            country: party.address.countryCode,
          }
        : undefined,
      contacts: party.contacts?.map((c: any) => ({
        name: c.name,
        type: c.contactFunctionCode,
        phone: c.communicationNumberQualifier === 'TE' ? c.communicationNumber : undefined,
        email: c.communicationNumberQualifier === 'EM' ? c.communicationNumber : undefined,
      })),
    };
  }

  private mapPartyToN1(
    party: CanonicalParty,
    entityIdCode: string,
  ): NonNullable<X12_850_PurchaseOrder['parties']>[0] {
    const identifier = party.identifiers?.[0];

    return {
      entityIdCode,
      name: party.name,
      idCodeQualifier: identifier ? this.mapIdTypeToQualifier(identifier.type) : undefined,
      idCode: identifier?.value,
      address: party.address
        ? {
            addressLine1: party.address.street1,
            addressLine2: party.address.street2,
            city: party.address.city,
            stateCode: party.address.state,
            postalCode: party.address.postalCode,
            countryCode: party.address.country,
          }
        : undefined,
      contacts: party.contacts?.map((c) => ({
        contactFunctionCode: c.type || 'IC',
        name: c.name,
        communicationNumberQualifier: c.phone ? 'TE' : c.email ? 'EM' : undefined,
        communicationNumber: c.phone || c.email,
      })),
    };
  }

  private mapPO1ToOrderLine(
    item: X12_850_PurchaseOrder['lineItems'][0],
    index: number,
  ): CanonicalOrderLine {
    return {
      lineNumber: item.assignedId || (index + 1).toString(),
      quantity: item.quantityOrdered,
      unitOfMeasure: this.mapUnitOfMeasure(item.unitOfMeasure),
      unitPrice: item.unitPrice,
      extendedPrice: item.unitPrice ? item.quantityOrdered * item.unitPrice : undefined,
      productIdentifiers: item.productIds.map((p) => ({
        type: this.mapProductIdType(p.qualifier),
        value: p.id,
      })),
      description: item.descriptions?.[0]?.description,
      requestedDeliveryDate: item.dates?.find((d) => d.dateTimeQualifier === '002')?.date
        ? this.formatDate(item.dates.find((d) => d.dateTimeQualifier === '002')!.date!)
        : undefined,
    };
  }

  private mapOrderLineToPO1(
    item: CanonicalOrderLine,
    index: number,
  ): X12_850_PurchaseOrder['lineItems'][0] {
    return {
      assignedId: item.lineNumber,
      quantityOrdered: item.quantity,
      unitOfMeasure: this.mapUnitOfMeasureToX12(item.unitOfMeasure),
      unitPrice: item.unitPrice,
      basisOfUnitPrice: item.unitPrice ? 'PE' : undefined, // Per Each
      productIds: item.productIdentifiers.map((p) => ({
        qualifier: this.mapProductIdTypeToQualifier(p.type),
        id: p.value,
      })),
      descriptions: item.description ? [{ type: 'F', description: item.description }] : undefined,
      dates: item.requestedDeliveryDate
        ? [{ dateTimeQualifier: '002', date: this.formatDateForX12(item.requestedDeliveryDate) }]
        : undefined,
    };
  }

  private mapIT1ToInvoiceLine(
    item: X12_810_Invoice['lineItems'][0],
    index: number,
  ): CanonicalInvoiceLine {
    return {
      lineNumber: item.assignedId || (index + 1).toString(),
      quantity: item.quantityInvoiced,
      unitOfMeasure: this.mapUnitOfMeasure(item.unitOfMeasure),
      unitPrice: item.unitPrice,
      extendedPrice: item.quantityInvoiced * item.unitPrice,
      productIdentifiers: item.productIds.map((p) => ({
        type: this.mapProductIdType(p.qualifier),
        value: p.id,
      })),
      description: item.descriptions?.[0]?.description,
      taxes: item.taxes?.map((t) => ({
        type: t.taxTypeCode,
        amount: t.amount,
        rate: t.percent,
      })),
    };
  }

  private formatDate(dateStr: string): string {
    // Convert YYMMDD or CCYYMMDD to ISO date
    if (dateStr.length === 6) {
      const year = parseInt(dateStr.substring(0, 2), 10);
      const fullYear = year >= 50 ? 1900 + year : 2000 + year;
      return `${fullYear}-${dateStr.substring(2, 4)}-${dateStr.substring(4, 6)}`;
    } else if (dateStr.length === 8) {
      return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
  }

  private formatDateForX12(isoDate: string): string {
    // Convert ISO date to CCYYMMDD
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private mapOrderType(purposeCode: string): CanonicalOrder['orderType'] {
    switch (purposeCode) {
      case '00':
        return 'purchase_order';
      case '01':
        return 'change';
      case '05':
        return 'release';
      default:
        return 'purchase_order';
    }
  }

  private mapOrderTypeToPurposeCode(orderType: CanonicalOrder['orderType']): string {
    switch (orderType) {
      case 'purchase_order':
        return '00';
      case 'change':
        return '01';
      case 'release':
        return '05';
      default:
        return '00';
    }
  }

  private mapReferenceType(qualifier: string): string {
    const mapping: Record<string, string> = {
      AH: 'agreement_number',
      BM: 'bill_of_materials',
      CO: 'customer_order',
      CT: 'contract_number',
      IN: 'invoice_number',
      IT: 'internal_order',
      PO: 'purchase_order',
      SA: 'salesperson',
      SI: 'ship_instruction',
      VN: 'vendor_order',
    };
    return mapping[qualifier] || qualifier;
  }

  private mapReferenceTypeToQualifier(type: string): string {
    const mapping: Record<string, string> = {
      agreement_number: 'AH',
      bill_of_materials: 'BM',
      customer_order: 'CO',
      contract_number: 'CT',
      invoice_number: 'IN',
      internal_order: 'IT',
      purchase_order: 'PO',
      salesperson: 'SA',
      ship_instruction: 'SI',
      vendor_order: 'VN',
    };
    return mapping[type] || type;
  }

  private mapProductIdType(qualifier: string): string {
    const mapping: Record<string, string> = {
      BP: 'buyer_part_number',
      EN: 'ean',
      IN: 'buyer_item_number',
      MG: 'manufacturer_number',
      MN: 'model_number',
      SK: 'sku',
      UP: 'upc',
      VP: 'vendor_part_number',
    };
    return mapping[qualifier] || qualifier;
  }

  private mapProductIdTypeToQualifier(type: string): string {
    const mapping: Record<string, string> = {
      buyer_part_number: 'BP',
      ean: 'EN',
      buyer_item_number: 'IN',
      manufacturer_number: 'MG',
      model_number: 'MN',
      sku: 'SK',
      upc: 'UP',
      vendor_part_number: 'VP',
    };
    return mapping[type] || 'VP';
  }

  private mapUnitOfMeasure(uom: string): string {
    const mapping: Record<string, string> = {
      EA: 'each',
      BX: 'box',
      CA: 'case',
      CT: 'carton',
      DZ: 'dozen',
      KG: 'kilogram',
      LB: 'pound',
      PK: 'pack',
      PC: 'piece',
    };
    return mapping[uom] || uom;
  }

  private mapUnitOfMeasureToX12(uom: string): string {
    const mapping: Record<string, string> = {
      each: 'EA',
      box: 'BX',
      case: 'CA',
      carton: 'CT',
      dozen: 'DZ',
      kilogram: 'KG',
      pound: 'LB',
      pack: 'PK',
      piece: 'PC',
    };
    return mapping[uom] || 'EA';
  }

  private mapIdQualifierType(qualifier: string | undefined): string {
    if (!qualifier) return 'unknown';
    const mapping: Record<string, string> = {
      '01': 'duns',
      '08': 'uba',
      '09': 'duns_plus_4',
      '14': 'duns_plus_suffix',
      '91': 'assigned_by_seller',
      '92': 'assigned_by_buyer',
      ZZ: 'mutually_defined',
    };
    return mapping[qualifier] || qualifier;
  }

  private mapIdTypeToQualifier(type: string): string {
    const mapping: Record<string, string> = {
      duns: '01',
      uba: '08',
      duns_plus_4: '09',
      duns_plus_suffix: '14',
      assigned_by_seller: '91',
      assigned_by_buyer: '92',
      mutually_defined: 'ZZ',
    };
    return mapping[type] || 'ZZ';
  }
}
