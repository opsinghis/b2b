import { Injectable } from '@nestjs/common';
import {
  Edifact_ORDERS,
  Edifact_ORDRSP,
  Edifact_DESADV,
  Edifact_INVOIC,
  EdifactParty,
  EdifactOrdersLineItem,
  EdifactInvoicLineItem,
  EdifactDesadvLineItem,
} from '../interfaces';

// Import canonical models from X12 mapper (shared canonical models)
import {
  CanonicalOrder,
  CanonicalOrderLine,
  CanonicalParty,
  CanonicalReference,
  CanonicalInvoice,
  CanonicalInvoiceLine,
  CanonicalShipment,
  CanonicalShipmentItem,
  CanonicalPackage,
} from '../../x12/services/x12-mapper.service';

/**
 * EDIFACT Mapper Service
 *
 * Maps EDIFACT message types to/from canonical business models.
 * Uses the same canonical models as X12 mapper for cross-format compatibility.
 */
@Injectable()
export class EdifactMapperService {
  /**
   * Map ORDERS message to Canonical Order
   */
  mapOrdersToOrder(orders: Edifact_ORDERS): CanonicalOrder {
    const order: CanonicalOrder = {
      orderNumber: orders.orderNumber,
      orderDate: orders.orderDate,
      orderType: this.mapMessageFunctionToOrderType(orders.messageFunction),
      currency: orders.currency,
      buyer: this.findParty(orders.parties, 'BY') || { name: 'Unknown Buyer' },
      seller: this.findParty(orders.parties, 'SU'),
      shipTo: this.findParty(orders.parties, 'DP'),
      billTo: this.findParty(orders.parties, 'IV'),
      lineItems: orders.lineItems.map((item, index) => this.mapOrdersLineToOrderLine(item, index)),
      references: orders.references?.map((ref) => ({
        type: this.mapReferenceQualifierToType(ref.referenceQualifier),
        value: ref.referenceNumber || '',
        description: undefined,
      })),
      totals: orders.controlTotals
        ? {
            lineItemCount: orders.controlTotals.lineItemCount || orders.lineItems.length,
            totalAmount: orders.controlTotals.totalAmount,
          }
        : undefined,
      shippingDetails: orders.transport
        ? {
            carrier: orders.transport.carrierName || orders.transport.carrierIdentification,
            serviceType: orders.transport.transportMode,
          }
        : undefined,
      notes: orders.freeText?.flatMap((ft) => ft.text),
    };

    return order;
  }

  /**
   * Map Canonical Order to ORDERS message
   */
  mapOrderToOrders(order: CanonicalOrder): Edifact_ORDERS {
    const orders: Edifact_ORDERS = {
      messageType: 'ORDERS',
      messageReferenceNumber: '1',
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      messageFunction: this.mapOrderTypeToMessageFunction(order.orderType),
      currency: order.currency,
      parties: [],
      lineItems: order.lineItems.map((item, index) => this.mapOrderLineToOrdersLine(item, index)),
    };

    // Map parties
    if (order.buyer) {
      orders.parties.push(this.mapCanonicalPartyToEdifact(order.buyer, 'BY'));
    }
    if (order.seller) {
      orders.parties.push(this.mapCanonicalPartyToEdifact(order.seller, 'SU'));
    }
    if (order.shipTo) {
      orders.parties.push(this.mapCanonicalPartyToEdifact(order.shipTo, 'DP'));
    }
    if (order.billTo) {
      orders.parties.push(this.mapCanonicalPartyToEdifact(order.billTo, 'IV'));
    }

    // Map references
    if (order.references) {
      orders.references = order.references.map((ref) => ({
        referenceQualifier: this.mapReferenceTypeToQualifier(ref.type),
        referenceNumber: ref.value,
      }));
    }

    // Map totals
    if (order.totals) {
      orders.controlTotals = {
        lineItemCount: order.totals.lineItemCount,
        totalAmount: order.totals.totalAmount,
      };
    }

    // Map transport
    if (order.shippingDetails) {
      orders.transport = {
        carrierName: order.shippingDetails.carrier,
        transportMode: order.shippingDetails.serviceType,
      };
    }

    return orders;
  }

  /**
   * Map INVOIC message to Canonical Invoice
   */
  mapInvoicToInvoice(invoic: Edifact_INVOIC): CanonicalInvoice {
    const invoice: CanonicalInvoice = {
      invoiceNumber: invoic.invoiceNumber,
      invoiceDate: invoic.invoiceDate,
      purchaseOrderNumber: invoic.orderReference,
      purchaseOrderDate: invoic.orderDate,
      currency: invoic.currency,
      seller: this.findParty(invoic.parties, 'SU') || { name: 'Unknown Seller' },
      buyer: this.findParty(invoic.parties, 'BY'),
      billTo: this.findParty(invoic.parties, 'IV'),
      remitTo: this.findParty(invoic.parties, 'PE'),
      lineItems: invoic.lineItems.map((item, index) =>
        this.mapInvoicLineToInvoiceLine(item, index),
      ),
      totals: {
        subtotal: invoic.totals.lineItemsTotal,
        taxAmount: invoic.totals.totalTaxAmount,
        discountAmount: invoic.totals.totalAllowances,
        totalAmount: invoic.totals.invoiceTotal,
      },
      paymentTerms: invoic.paymentTerms
        ? {
            netDays: invoic.paymentTerms.netDays,
            discountPercent: invoic.paymentTerms.discountPercent,
            discountDays: invoic.paymentTerms.discountDays,
            description: invoic.paymentTerms.description,
          }
        : undefined,
      references: invoic.references?.map((ref) => ({
        type: this.mapReferenceQualifierToType(ref.referenceQualifier),
        value: ref.referenceNumber || '',
      })),
    };

    return invoice;
  }

  /**
   * Map DESADV message to Canonical Shipment
   */
  mapDesadvToShipment(desadv: Edifact_DESADV): CanonicalShipment {
    const shipment: CanonicalShipment = {
      shipmentNumber: desadv.despatchNumber,
      shipmentDate: desadv.despatchDate,
      purchaseOrderNumbers: desadv.orderReferences?.map((ref) => ref.orderNumber),
      carrier: desadv.transport
        ? {
            name: desadv.transport.carrierName,
            code: desadv.transport.transportMeansId,
            trackingNumbers: desadv.transport.trackingNumber
              ? [desadv.transport.trackingNumber]
              : undefined,
            serviceType: desadv.transport.transportMode,
          }
        : undefined,
      shipFrom: this.findParty(desadv.parties, 'CZ'), // Consignor
      shipTo: this.findParty(desadv.parties, 'CN') || this.findParty(desadv.parties, 'DP'), // Consignee or delivery party
      packages: desadv.packages?.map((pkg) => this.mapDesadvPackageToCanonical(pkg)) || [],
      items: desadv.lineItems?.map((item) => this.mapDesadvLineToShipmentItem(item)) || [],
      totals: desadv.controlTotals
        ? {
            packageCount: desadv.controlTotals.packageCount,
            itemCount: desadv.controlTotals.lineItemCount,
            weight: desadv.controlTotals.totalGrossWeight,
          }
        : undefined,
    };

    // If items are nested in packages, extract them
    if (desadv.packages) {
      for (const pkg of desadv.packages) {
        if (pkg.items) {
          shipment.items.push(...pkg.items.map((item) => this.mapDesadvLineToShipmentItem(item)));
        }
      }
    }

    return shipment;
  }

  // Helper methods

  private findParty(
    parties: EdifactParty[],
    functionQualifier: string,
  ): CanonicalParty | undefined {
    const party = parties.find((p) => p.partyFunctionQualifier === functionQualifier);
    if (!party) return undefined;
    return this.mapEdifactPartyToCanonical(party);
  }

  private mapEdifactPartyToCanonical(party: EdifactParty): CanonicalParty {
    return {
      id: party.partyIdentification?.id,
      name: party.name,
      identifiers: party.partyIdentification
        ? [
            {
              type: this.mapPartyIdResponsibleAgency(party.partyIdentification.responsibleAgency),
              value: party.partyIdentification.id,
            },
          ]
        : undefined,
      address: {
        street1: party.streetAddress,
        city: party.cityName,
        state: party.countrySubEntity,
        postalCode: party.postalCode,
        country: party.countryCode,
      },
      contacts: party.contacts?.map((c) => ({
        name: c.name,
        type: c.contactFunctionCode,
        phone: c.communications?.find((cm) => cm.channelQualifier === 'TE')?.number,
        email: c.communications?.find((cm) => cm.channelQualifier === 'EM')?.number,
      })),
    };
  }

  private mapCanonicalPartyToEdifact(
    party: CanonicalParty,
    functionQualifier: string,
  ): EdifactParty {
    const identifier = party.identifiers?.[0];

    return {
      partyFunctionQualifier: functionQualifier,
      partyIdentification: identifier
        ? {
            id: identifier.value,
            responsibleAgency: this.mapPartyIdTypeToResponsibleAgency(identifier.type),
          }
        : undefined,
      name: party.name,
      streetAddress: party.address?.street1,
      cityName: party.address?.city,
      countrySubEntity: party.address?.state,
      postalCode: party.address?.postalCode,
      countryCode: party.address?.country,
      contacts: party.contacts?.map((c) => ({
        contactFunctionCode: c.type || 'IC',
        name: c.name,
        communications: [
          ...(c.phone ? [{ number: c.phone, channelQualifier: 'TE' }] : []),
          ...(c.email ? [{ number: c.email, channelQualifier: 'EM' }] : []),
        ],
      })),
    };
  }

  private mapOrdersLineToOrderLine(item: EdifactOrdersLineItem, index: number): CanonicalOrderLine {
    const orderedQty = item.quantities.find((q) => q.qualifier === '21'); // Ordered quantity
    const price = item.prices?.find((p) => p.qualifier === 'AAA' || p.qualifier === 'AAB');

    return {
      lineNumber: item.lineNumber || (index + 1).toString(),
      quantity: orderedQty?.quantity || 0,
      unitOfMeasure: this.mapUnitOfMeasure(orderedQty?.unitOfMeasure),
      unitPrice: price?.amount,
      extendedPrice: price ? (orderedQty?.quantity || 0) * price.amount : undefined,
      productIdentifiers: item.productIds.map((pid) => ({
        type: this.mapProductIdType(pid.itemNumberType),
        value: pid.itemNumber,
      })),
      description: item.description,
      requestedDeliveryDate: item.dates?.find((d) => d.qualifier === '2')?.value
        ? this.formatDate(
            item.dates.find((d) => d.qualifier === '2')!.value!,
            item.dates.find((d) => d.qualifier === '2')?.formatQualifier,
          )
        : undefined,
    };
  }

  private mapOrderLineToOrdersLine(item: CanonicalOrderLine, index: number): EdifactOrdersLineItem {
    return {
      lineNumber: item.lineNumber,
      productIds: item.productIdentifiers.map((pid) => ({
        itemNumber: pid.value,
        itemNumberType: this.mapProductIdTypeToCode(pid.type),
        responsibleAgency: '9', // GS1
      })),
      description: item.description,
      quantities: [
        {
          qualifier: '21', // Ordered quantity
          quantity: item.quantity,
          unitOfMeasure: this.mapUnitOfMeasureToCode(item.unitOfMeasure),
        },
      ],
      prices: item.unitPrice
        ? [
            {
              qualifier: 'AAA', // Calculation net
              amount: item.unitPrice,
            },
          ]
        : undefined,
      dates: item.requestedDeliveryDate
        ? [
            {
              qualifier: '2', // Delivery date/time requested
              value: this.formatDateForEdifact(item.requestedDeliveryDate),
              formatQualifier: '102',
            },
          ]
        : undefined,
    };
  }

  private mapInvoicLineToInvoiceLine(
    item: EdifactInvoicLineItem,
    index: number,
  ): CanonicalInvoiceLine {
    return {
      lineNumber: item.lineNumber || (index + 1).toString(),
      quantity: item.quantity,
      unitOfMeasure: this.mapUnitOfMeasure(item.unitOfMeasure),
      unitPrice: item.unitPrice,
      extendedPrice: item.lineAmount,
      productIdentifiers: item.productIds.map((pid) => ({
        type: this.mapProductIdType(pid.itemNumberType),
        value: pid.itemNumber,
      })),
      description: item.description,
      taxes: item.taxes?.map((t) => ({
        type: t.type || 'VAT',
        amount: t.amount,
        rate: t.rate,
      })),
    };
  }

  private mapDesadvLineToShipmentItem(item: EdifactDesadvLineItem): CanonicalShipmentItem {
    return {
      lineNumber: item.lineNumber,
      quantity: item.quantity,
      unitOfMeasure: item.unitOfMeasure,
      productIdentifiers: item.productIds?.map((pid) => ({
        type: this.mapProductIdType(pid.itemNumberType),
        value: pid.itemNumber,
      })),
      description: item.description,
      serialNumbers: item.serialNumbers,
    };
  }

  private mapDesadvPackageToCanonical(
    pkg: NonNullable<Edifact_DESADV['packages']>[0],
  ): CanonicalPackage {
    return {
      packageNumber: pkg.packageId,
      packageType: pkg.packageType,
      weight: pkg.grossWeight,
      weightUnit: pkg.weightUnit,
      marks: pkg.marks,
    };
  }

  private mapMessageFunctionToOrderType(messageFunction?: string): CanonicalOrder['orderType'] {
    switch (messageFunction) {
      case '9':
        return 'purchase_order';
      case '5':
        return 'change';
      case '1':
        return 'purchase_order'; // Cancellation maps to PO type
      default:
        return 'purchase_order';
    }
  }

  private mapOrderTypeToMessageFunction(orderType: CanonicalOrder['orderType']): string {
    switch (orderType) {
      case 'purchase_order':
        return '9'; // Original
      case 'change':
        return '5'; // Replace
      case 'release':
        return '9';
      default:
        return '9';
    }
  }

  private mapReferenceQualifierToType(qualifier: string): string {
    const mapping: Record<string, string> = {
      ON: 'purchase_order',
      CT: 'contract_number',
      IV: 'invoice_number',
      DQ: 'despatch_reference',
      UC: 'ultimate_customer',
      ACD: 'additional_reference',
      VN: 'vendor_order',
      CR: 'customer_reference',
    };
    return mapping[qualifier] || qualifier;
  }

  private mapReferenceTypeToQualifier(type: string): string {
    const mapping: Record<string, string> = {
      purchase_order: 'ON',
      contract_number: 'CT',
      invoice_number: 'IV',
      despatch_reference: 'DQ',
      ultimate_customer: 'UC',
      vendor_order: 'VN',
      customer_reference: 'CR',
    };
    return mapping[type] || type;
  }

  private mapProductIdType(itemNumberType?: string): string {
    const mapping: Record<string, string> = {
      SRV: 'gtin',
      EN: 'ean',
      IN: 'buyer_item_number',
      SA: 'supplier_item_number',
      BP: 'buyer_part_number',
      VP: 'vendor_part_number',
      UP: 'upc',
      MF: 'manufacturer_part_number',
    };
    return mapping[itemNumberType || ''] || itemNumberType || 'unknown';
  }

  private mapProductIdTypeToCode(type: string): string {
    const mapping: Record<string, string> = {
      gtin: 'SRV',
      ean: 'EN',
      buyer_item_number: 'IN',
      supplier_item_number: 'SA',
      buyer_part_number: 'BP',
      vendor_part_number: 'VP',
      upc: 'UP',
      manufacturer_part_number: 'MF',
    };
    return mapping[type] || 'SA';
  }

  private mapUnitOfMeasure(uom?: string): string {
    const mapping: Record<string, string> = {
      PCE: 'each',
      BX: 'box',
      CT: 'carton',
      KGM: 'kilogram',
      LBR: 'pound',
      MTR: 'meter',
      EA: 'each',
    };
    return mapping[uom || ''] || uom || 'each';
  }

  private mapUnitOfMeasureToCode(uom: string): string {
    const mapping: Record<string, string> = {
      each: 'PCE',
      box: 'BX',
      carton: 'CT',
      kilogram: 'KGM',
      pound: 'LBR',
      meter: 'MTR',
    };
    return mapping[uom] || 'PCE';
  }

  private mapPartyIdResponsibleAgency(agency?: string): string {
    const mapping: Record<string, string> = {
      '9': 'gln', // GS1
      '91': 'assigned_by_seller',
      '92': 'assigned_by_buyer',
      ZZZ: 'mutually_defined',
    };
    return mapping[agency || ''] || agency || 'unknown';
  }

  private mapPartyIdTypeToResponsibleAgency(type: string): string {
    const mapping: Record<string, string> = {
      gln: '9',
      assigned_by_seller: '91',
      assigned_by_buyer: '92',
      mutually_defined: 'ZZZ',
    };
    return mapping[type] || '9';
  }

  private formatDate(dateStr: string, formatQualifier?: string): string {
    if (formatQualifier === '102' && dateStr.length === 8) {
      return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
  }

  private formatDateForEdifact(isoDate: string): string {
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  }
}
