import { Injectable } from '@nestjs/common';
import {
  EdifactMessage,
  EdifactSegment,
  EdifactDelimiters,
  DEFAULT_EDIFACT_DELIMITERS,
  Edifact_ORDERS,
  EdifactOrdersLineItem,
  EdifactParty,
  EdifactContact,
  EdifactReference,
  EdifactDateTime,
  EdifactMonetaryAmount,
  EdifactQuantity,
  EdifactPrice,
  EdifactTax,
  EdifactAllowanceCharge,
  EdifactProductId,
  EdifactFreeText,
} from '../interfaces';

/**
 * EDIFACT ORDERS Message Parser
 *
 * Parses ORDERS (Purchase Order) messages into structured format.
 */
@Injectable()
export class EdifactOrdersParserService {
  /**
   * Parse ORDERS message
   */
  parse(message: EdifactMessage): Edifact_ORDERS {
    const segments = message.segments;
    const header = message.header;

    const orders: Edifact_ORDERS = {
      messageType: 'ORDERS',
      messageReferenceNumber: header.messageReferenceNumber,
      orderNumber: '',
      orderDate: '',
      parties: [],
      lineItems: [],
    };

    let currentSection: 'header' | 'line' = 'header';
    let currentLineItem: EdifactOrdersLineItem | null = null;
    let currentParty: EdifactParty | null = null;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentId = segment.segmentId;

      switch (segmentId) {
        case 'BGM':
          // Beginning of message
          const bgm = this.parseBGM(segment);
          orders.documentTypeCode = bgm.documentTypeCode;
          orders.orderNumber = bgm.orderNumber;
          orders.messageFunction = bgm.messageFunction;
          break;

        case 'DTM':
          // Date/time/period
          const dtm = this.parseDTM(segment);
          if (currentSection === 'header') {
            if (!orders.dates) orders.dates = [];
            orders.dates.push(dtm);
            // Extract order date
            if (dtm.qualifier === '137') {
              orders.orderDate = this.formatDate(dtm.value, dtm.formatQualifier);
            }
          } else if (currentLineItem) {
            if (!currentLineItem.dates) currentLineItem.dates = [];
            currentLineItem.dates.push(dtm);
          }
          break;

        case 'FTX':
          // Free text
          const ftx = this.parseFTX(segment);
          if (currentSection === 'header') {
            if (!orders.freeText) orders.freeText = [];
            orders.freeText.push(ftx);
          } else if (currentLineItem) {
            if (!currentLineItem.additionalDescription) currentLineItem.additionalDescription = [];
            currentLineItem.additionalDescription.push(ftx);
          }
          break;

        case 'RFF':
          // Reference
          const rff = this.parseRFF(segment);
          if (currentSection === 'header') {
            if (currentParty) {
              if (!currentParty.references) currentParty.references = [];
              currentParty.references.push(rff);
            } else {
              if (!orders.references) orders.references = [];
              orders.references.push(rff);
            }
          } else if (currentLineItem) {
            if (!currentLineItem.references) currentLineItem.references = [];
            currentLineItem.references.push(rff);
          }
          break;

        case 'NAD':
          // Name and address
          currentParty = this.parseNAD(segment);
          orders.parties.push(currentParty);
          break;

        case 'CTA':
          // Contact information
          if (currentParty) {
            const cta = this.parseCTA(segment, segments, i);
            if (!currentParty.contacts) currentParty.contacts = [];
            currentParty.contacts.push(cta.contact);
            i = cta.nextIndex - 1; // Skip COM segments
          }
          break;

        case 'CUX':
          // Currencies
          const cux = this.parseCUX(segment);
          orders.currency = cux.currency;
          break;

        case 'PAT':
          // Payment terms
          const pat = this.parsePAT(segment);
          orders.paymentTerms = pat;
          break;

        case 'TOD':
          // Terms of delivery
          const tod = this.parseTOD(segment);
          orders.deliveryTerms = tod;
          break;

        case 'TDT':
          // Transport information
          const tdt = this.parseTDT(segment);
          orders.transport = tdt;
          break;

        case 'ALC':
          // Allowance or charge
          const alc = this.parseALC(segment);
          if (currentSection === 'header') {
            if (!orders.allowancesCharges) orders.allowancesCharges = [];
            orders.allowancesCharges.push(alc);
          } else if (currentLineItem) {
            if (!currentLineItem.allowancesCharges) currentLineItem.allowancesCharges = [];
            currentLineItem.allowancesCharges.push(alc);
          }
          break;

        case 'TAX':
          // Tax details
          const tax = this.parseTAX(segment);
          if (currentSection === 'header') {
            if (!orders.taxes) orders.taxes = [];
            orders.taxes.push(tax);
          } else if (currentLineItem) {
            if (!currentLineItem.taxes) currentLineItem.taxes = [];
            currentLineItem.taxes.push(tax);
          }
          break;

        case 'MOA':
          // Monetary amount
          const moa = this.parseMOA(segment);
          if (currentSection === 'header') {
            if (!orders.amounts) orders.amounts = [];
            orders.amounts.push(moa);
          } else if (currentLineItem) {
            if (!currentLineItem.amounts) currentLineItem.amounts = [];
            currentLineItem.amounts.push(moa);
          }
          break;

        case 'LIN':
          // Line item
          currentSection = 'line';
          currentParty = null;

          // Save previous line item
          if (currentLineItem) {
            orders.lineItems.push(currentLineItem);
          }

          currentLineItem = this.parseLIN(segment);
          break;

        case 'PIA':
          // Additional product id
          if (currentLineItem) {
            const piaIds = this.parsePIA(segment);
            currentLineItem.productIds.push(...piaIds);
          }
          break;

        case 'IMD':
          // Item description
          if (currentLineItem) {
            const imd = this.parseIMD(segment);
            if (imd) {
              currentLineItem.description = imd;
            }
          }
          break;

        case 'QTY':
          // Quantity
          const qty = this.parseQTY(segment);
          if (currentLineItem) {
            currentLineItem.quantities.push(qty);
          }
          break;

        case 'PRI':
          // Price details
          const pri = this.parsePRI(segment);
          if (currentLineItem) {
            if (!currentLineItem.prices) currentLineItem.prices = [];
            currentLineItem.prices.push(pri);
          }
          break;

        case 'PAC':
          // Package
          if (currentLineItem) {
            const pac = this.parsePAC(segment);
            if (!currentLineItem.packages) currentLineItem.packages = [];
            currentLineItem.packages.push(pac);
          }
          break;

        case 'CNT':
          // Control total
          const cnt = this.parseCNT(segment);
          if (!orders.controlTotals) {
            orders.controlTotals = {};
          }
          if (cnt.qualifier === '2') {
            orders.controlTotals.lineItemCount = cnt.value;
          } else if (cnt.qualifier === '39') {
            orders.controlTotals.totalAmount = cnt.value;
          }
          break;

        case 'UNS':
          // Section control - summary section starts
          if (currentLineItem) {
            orders.lineItems.push(currentLineItem);
            currentLineItem = null;
          }
          currentSection = 'header'; // Actually summary section
          break;
      }
    }

    // Add last line item
    if (currentLineItem) {
      orders.lineItems.push(currentLineItem);
    }

    return orders;
  }

  // Segment parsing helpers

  private parseBGM(segment: EdifactSegment): {
    documentTypeCode?: string;
    orderNumber: string;
    messageFunction?: string;
  } {
    return {
      documentTypeCode: this.getComponent(segment, 1, 1),
      orderNumber: this.getElement(segment, 2) || '',
      messageFunction: this.getElement(segment, 3),
    };
  }

  private parseDTM(segment: EdifactSegment): EdifactDateTime {
    return {
      qualifier: this.getComponent(segment, 1, 1) || '',
      value: this.getComponent(segment, 1, 2),
      formatQualifier: this.getComponent(segment, 1, 3),
    };
  }

  private parseFTX(segment: EdifactSegment): EdifactFreeText {
    const text: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const line = this.getComponent(segment, 4, i);
      if (line) text.push(line);
    }
    return {
      subjectQualifier: this.getElement(segment, 1) || '',
      functionCode: this.getElement(segment, 2),
      text,
    };
  }

  private parseRFF(segment: EdifactSegment): EdifactReference {
    return {
      referenceQualifier: this.getComponent(segment, 1, 1) || '',
      referenceNumber: this.getComponent(segment, 1, 2),
      documentNumber: this.getComponent(segment, 1, 3),
      lineNumber: this.getComponent(segment, 1, 4),
    };
  }

  private parseNAD(segment: EdifactSegment): EdifactParty {
    const partyId = this.getComponent(segment, 2, 1);
    const codeListQualifier = this.getComponent(segment, 2, 2);
    const responsibleAgency = this.getComponent(segment, 2, 3);

    return {
      partyFunctionQualifier: this.getElement(segment, 1) || '',
      partyIdentification: partyId
        ? {
            id: partyId,
            codeListQualifier,
            responsibleAgency,
          }
        : undefined,
      name: this.getComponent(segment, 4, 1),
      partyNameContinuation: this.getComponent(segment, 4, 2),
      streetAddress: this.getComponent(segment, 5, 1),
      cityName: this.getElement(segment, 6),
      countrySubEntity: this.getElement(segment, 7),
      postalCode: this.getElement(segment, 8),
      countryCode: this.getElement(segment, 9),
    };
  }

  private parseCTA(
    segment: EdifactSegment,
    allSegments: EdifactSegment[],
    currentIndex: number,
  ): { contact: EdifactContact; nextIndex: number } {
    const contact: EdifactContact = {
      contactFunctionCode: this.getElement(segment, 1) || '',
      name: this.getComponent(segment, 2, 2),
      communications: [],
    };

    // Look for subsequent COM segments
    let nextIndex = currentIndex + 1;
    while (nextIndex < allSegments.length && allSegments[nextIndex].segmentId === 'COM') {
      const comSegment = allSegments[nextIndex];
      const number = this.getComponent(comSegment, 1, 1);
      const channelQualifier = this.getComponent(comSegment, 1, 2);
      if (number && channelQualifier) {
        contact.communications!.push({ number, channelQualifier });
      }
      nextIndex++;
    }

    return { contact, nextIndex };
  }

  private parseCUX(segment: EdifactSegment): { currency?: string } {
    return {
      currency: this.getComponent(segment, 1, 2),
    };
  }

  private parsePAT(segment: EdifactSegment): Edifact_ORDERS['paymentTerms'] {
    return {
      termsType: this.getElement(segment, 1),
      termsPeriodType: this.getComponent(segment, 2, 1),
      termsPeriodCount: this.getComponent(segment, 2, 2)
        ? parseInt(this.getComponent(segment, 2, 2)!, 10)
        : undefined,
      termsDescription: this.getComponent(segment, 3, 5),
    };
  }

  private parseTOD(segment: EdifactSegment): Edifact_ORDERS['deliveryTerms'] {
    return {
      deliveryTermsCode: this.getComponent(segment, 3, 1),
      deliveryTermsCodeQualifier: this.getComponent(segment, 3, 2),
      deliveryTermsLocation: this.getComponent(segment, 3, 4),
    };
  }

  private parseTDT(segment: EdifactSegment): Edifact_ORDERS['transport'] {
    return {
      transportStageQualifier: this.getElement(segment, 1),
      transportMode: this.getElement(segment, 3),
      transportMeansDescription: this.getComponent(segment, 4, 1),
      carrierIdentification: this.getComponent(segment, 5, 1),
      carrierName: this.getComponent(segment, 5, 4),
    };
  }

  private parseALC(segment: EdifactSegment): EdifactAllowanceCharge {
    return {
      indicator: this.getElement(segment, 1) as 'A' | 'C',
      type: this.getComponent(segment, 5, 1),
      sequenceNumber: this.getElement(segment, 2),
      calculationSequence: this.getElement(segment, 3),
    };
  }

  private parseTAX(segment: EdifactSegment): EdifactTax {
    return {
      functionQualifier: this.getElement(segment, 1) || '7',
      type: this.getComponent(segment, 2, 1),
      category: this.getElement(segment, 6),
      rate: this.getElement(segment, 5) ? parseFloat(this.getElement(segment, 5)!) : undefined,
    };
  }

  private parseMOA(segment: EdifactSegment): EdifactMonetaryAmount {
    return {
      typeQualifier: this.getComponent(segment, 1, 1) || '',
      amount: parseFloat(this.getComponent(segment, 1, 2) || '0'),
      currency: this.getComponent(segment, 1, 3),
    };
  }

  private parseLIN(segment: EdifactSegment): EdifactOrdersLineItem {
    const itemNumber = this.getComponent(segment, 3, 1);
    const itemNumberType = this.getComponent(segment, 3, 2);
    const responsibleAgency = this.getComponent(segment, 3, 3);

    const productIds: EdifactProductId[] = [];
    if (itemNumber) {
      productIds.push({
        itemNumber,
        itemNumberType,
        responsibleAgency,
      });
    }

    return {
      lineNumber: this.getElement(segment, 1) || '',
      actionCode: this.getElement(segment, 2),
      productIds,
      quantities: [],
    };
  }

  private parsePIA(segment: EdifactSegment): EdifactProductId[] {
    const ids: EdifactProductId[] = [];
    // PIA can have multiple product IDs in elements 2-5
    for (let i = 2; i <= 5; i++) {
      const itemNumber = this.getComponent(segment, i, 1);
      if (itemNumber) {
        ids.push({
          itemNumber,
          itemNumberType: this.getComponent(segment, i, 2),
          responsibleAgency: this.getComponent(segment, i, 3),
        });
      }
    }
    return ids;
  }

  private parseIMD(segment: EdifactSegment): string | undefined {
    // Item description can be in element 3 or as free text
    const descriptionCode = this.getComponent(segment, 3, 1);
    const freeText = this.getComponent(segment, 3, 4);
    const freeText2 = this.getComponent(segment, 3, 5);

    if (freeText) {
      return freeText2 ? `${freeText} ${freeText2}` : freeText;
    }
    return descriptionCode;
  }

  private parseQTY(segment: EdifactSegment): EdifactQuantity {
    return {
      qualifier: this.getComponent(segment, 1, 1) || '',
      quantity: parseFloat(this.getComponent(segment, 1, 2) || '0'),
      unitOfMeasure: this.getComponent(segment, 1, 3),
    };
  }

  private parsePRI(segment: EdifactSegment): EdifactPrice {
    return {
      qualifier: this.getComponent(segment, 1, 1) || '',
      amount: parseFloat(this.getComponent(segment, 1, 2) || '0'),
      priceType: this.getComponent(segment, 1, 3),
      specificationCode: this.getComponent(segment, 1, 4),
      unitPriceBasis: this.getComponent(segment, 1, 5)
        ? parseFloat(this.getComponent(segment, 1, 5)!)
        : undefined,
      unitOfMeasure: this.getComponent(segment, 1, 6),
    };
  }

  private parsePAC(segment: EdifactSegment): NonNullable<EdifactOrdersLineItem['packages']>[0] {
    return {
      numberOfPackages: this.getElement(segment, 1)
        ? parseInt(this.getElement(segment, 1)!, 10)
        : undefined,
      packageType: this.getComponent(segment, 3, 1),
      packagingLevel: this.getElement(segment, 2),
    };
  }

  private parseCNT(segment: EdifactSegment): { qualifier: string; value: number } {
    return {
      qualifier: this.getComponent(segment, 1, 1) || '',
      value: parseFloat(this.getComponent(segment, 1, 2) || '0'),
    };
  }

  // Helper methods

  private getElement(segment: EdifactSegment, index: number): string | undefined {
    const element = segment.elements[index - 1];
    return element?.value || undefined;
  }

  private getComponent(
    segment: EdifactSegment,
    elementIndex: number,
    componentIndex: number,
  ): string | undefined {
    const element = segment.elements[elementIndex - 1];
    if (!element) return undefined;

    if (element.components && element.components.length >= componentIndex) {
      return element.components[componentIndex - 1] || undefined;
    }

    if (componentIndex === 1) {
      return element.value || undefined;
    }

    return undefined;
  }

  private formatDate(value?: string, formatQualifier?: string): string {
    if (!value) return '';

    // Convert EDIFACT date formats to ISO
    switch (formatQualifier) {
      case '102': // CCYYMMDD
        return `${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}`;
      case '203': // CCYYMMDDHHMM
        return `${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}T${value.substring(8, 10)}:${value.substring(10, 12)}`;
      default:
        return value;
    }
  }
}
