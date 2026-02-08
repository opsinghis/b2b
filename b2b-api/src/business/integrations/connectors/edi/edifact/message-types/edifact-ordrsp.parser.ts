import { Injectable } from '@nestjs/common';
import {
  EdifactMessage,
  EdifactSegment,
  Edifact_ORDRSP,
  EdifactOrdrspLineItem,
  EdifactParty,
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
 * EDIFACT ORDRSP Message Parser
 *
 * Parses ORDRSP (Purchase Order Response) messages into structured format.
 */
@Injectable()
export class EdifactOrdrspParserService {
  /**
   * Parse ORDRSP message
   */
  parse(message: EdifactMessage): Edifact_ORDRSP {
    const segments = message.segments;
    const header = message.header;

    const ordrsp: Edifact_ORDRSP = {
      messageType: 'ORDRSP',
      messageReferenceNumber: header.messageReferenceNumber,
      responseNumber: '',
      responseDate: '',
      orderReference: '',
      parties: [],
      lineItems: [],
    };

    let currentSection: 'header' | 'line' = 'header';
    let currentLineItem: EdifactOrdrspLineItem | null = null;
    let currentParty: EdifactParty | null = null;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentId = segment.segmentId;

      switch (segmentId) {
        case 'BGM':
          const bgm = this.parseBGM(segment);
          ordrsp.responseNumber = bgm.responseNumber;
          ordrsp.messageFunction = bgm.messageFunction;
          ordrsp.responseType = bgm.responseType;
          break;

        case 'DTM':
          const dtm = this.parseDTM(segment);
          if (currentSection === 'header') {
            if (!ordrsp.dates) ordrsp.dates = [];
            ordrsp.dates.push(dtm);
            if (dtm.qualifier === '137') {
              ordrsp.responseDate = this.formatDate(dtm.value, dtm.formatQualifier);
            }
          } else if (currentLineItem) {
            if (!currentLineItem.dates) currentLineItem.dates = [];
            currentLineItem.dates.push(dtm);
          }
          break;

        case 'FTX':
          const ftx = this.parseFTX(segment);
          if (currentSection === 'header') {
            if (!ordrsp.freeText) ordrsp.freeText = [];
            ordrsp.freeText.push(ftx);
          } else if (currentLineItem) {
            if (!currentLineItem.additionalDescription) currentLineItem.additionalDescription = [];
            currentLineItem.additionalDescription.push(ftx);
          }
          break;

        case 'RFF':
          const rff = this.parseRFF(segment);
          if (currentSection === 'header') {
            if (currentParty) {
              if (!currentParty.references) currentParty.references = [];
              currentParty.references.push(rff);
            } else {
              if (!ordrsp.references) ordrsp.references = [];
              ordrsp.references.push(rff);
              // Extract order reference
              if (rff.referenceQualifier === 'ON') {
                ordrsp.orderReference = rff.referenceNumber || '';
              }
            }
          } else if (currentLineItem) {
            if (!currentLineItem.references) currentLineItem.references = [];
            currentLineItem.references.push(rff);
          }
          break;

        case 'NAD':
          currentParty = this.parseNAD(segment);
          ordrsp.parties.push(currentParty);
          break;

        case 'CTA':
          if (currentParty) {
            const cta = this.parseCTA(segment, segments, i);
            if (!currentParty.contacts) currentParty.contacts = [];
            currentParty.contacts.push(cta.contact);
            i = cta.nextIndex - 1;
          }
          break;

        case 'CUX':
          const cux = this.parseCUX(segment);
          ordrsp.currency = cux.currency;
          break;

        case 'LIN':
          currentSection = 'line';
          currentParty = null;

          if (currentLineItem) {
            ordrsp.lineItems.push(currentLineItem);
          }

          currentLineItem = this.parseLIN(segment);
          break;

        case 'PIA':
          if (currentLineItem) {
            const piaIds = this.parsePIA(segment);
            currentLineItem.productIds.push(...piaIds);
          }
          break;

        case 'IMD':
          if (currentLineItem) {
            const imd = this.parseIMD(segment);
            if (imd) {
              currentLineItem.description = imd;
            }
          }
          break;

        case 'QTY':
          const qty = this.parseQTY(segment);
          if (currentLineItem) {
            currentLineItem.quantities.push(qty);
          }
          break;

        case 'PRI':
          const pri = this.parsePRI(segment);
          if (currentLineItem) {
            if (!currentLineItem.prices) currentLineItem.prices = [];
            currentLineItem.prices.push(pri);
          }
          break;

        case 'TAX':
          const tax = this.parseTAX(segment);
          if (currentLineItem) {
            if (!currentLineItem.taxes) currentLineItem.taxes = [];
            currentLineItem.taxes.push(tax);
          }
          break;

        case 'ALC':
          const alc = this.parseALC(segment);
          if (currentLineItem) {
            if (!currentLineItem.allowancesCharges) currentLineItem.allowancesCharges = [];
            currentLineItem.allowancesCharges.push(alc);
          }
          break;

        case 'MOA':
          const moa = this.parseMOA(segment);
          if (currentLineItem) {
            if (!currentLineItem.amounts) currentLineItem.amounts = [];
            currentLineItem.amounts.push(moa);
          }
          break;

        case 'CNT':
          const cnt = this.parseCNT(segment);
          if (!ordrsp.controlTotals) {
            ordrsp.controlTotals = {};
          }
          if (cnt.qualifier === '2') {
            ordrsp.controlTotals.lineItemCount = cnt.value;
          } else if (cnt.qualifier === '39') {
            ordrsp.controlTotals.totalAmount = cnt.value;
          }
          break;

        case 'UNS':
          if (currentLineItem) {
            ordrsp.lineItems.push(currentLineItem);
            currentLineItem = null;
          }
          currentSection = 'header';
          break;
      }
    }

    if (currentLineItem) {
      ordrsp.lineItems.push(currentLineItem);
    }

    return ordrsp;
  }

  // Segment parsing helpers

  private parseBGM(segment: EdifactSegment): {
    responseNumber: string;
    messageFunction?: string;
    responseType?: string;
  } {
    return {
      responseNumber: this.getElement(segment, 2) || '',
      messageFunction: this.getElement(segment, 3),
      responseType: this.getComponent(segment, 1, 1),
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
    return {
      partyFunctionQualifier: this.getElement(segment, 1) || '',
      partyIdentification: partyId
        ? {
            id: partyId,
            codeListQualifier: this.getComponent(segment, 2, 2),
            responsibleAgency: this.getComponent(segment, 2, 3),
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
  ): { contact: NonNullable<EdifactParty['contacts']>[0]; nextIndex: number } {
    const contact: NonNullable<EdifactParty['contacts']>[0] = {
      contactFunctionCode: this.getElement(segment, 1) || '',
      name: this.getComponent(segment, 2, 2),
      communications: [],
    };

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

  private parseLIN(segment: EdifactSegment): EdifactOrdrspLineItem {
    const itemNumber = this.getComponent(segment, 3, 1);
    const productIds: EdifactProductId[] = [];
    if (itemNumber) {
      productIds.push({
        itemNumber,
        itemNumberType: this.getComponent(segment, 3, 2),
        responsibleAgency: this.getComponent(segment, 3, 3),
      });
    }

    // Element 2 contains action code which can indicate response type
    const actionCode = this.getElement(segment, 2);
    let status: string | undefined;
    if (actionCode === '3') status = 'Accepted';
    else if (actionCode === '5') status = 'Amended';
    else if (actionCode === '7') status = 'Not accepted';

    return {
      lineNumber: this.getElement(segment, 1) || '',
      actionCode,
      status,
      productIds,
      quantities: [],
    };
  }

  private parsePIA(segment: EdifactSegment): EdifactProductId[] {
    const ids: EdifactProductId[] = [];
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
    const freeText = this.getComponent(segment, 3, 4);
    const freeText2 = this.getComponent(segment, 3, 5);
    if (freeText) {
      return freeText2 ? `${freeText} ${freeText2}` : freeText;
    }
    return this.getComponent(segment, 3, 1);
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

  private parseTAX(segment: EdifactSegment): EdifactTax {
    return {
      functionQualifier: this.getElement(segment, 1) || '7',
      type: this.getComponent(segment, 2, 1),
      category: this.getElement(segment, 6),
      rate: this.getElement(segment, 5) ? parseFloat(this.getElement(segment, 5)!) : undefined,
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

  private parseMOA(segment: EdifactSegment): EdifactMonetaryAmount {
    return {
      typeQualifier: this.getComponent(segment, 1, 1) || '',
      amount: parseFloat(this.getComponent(segment, 1, 2) || '0'),
      currency: this.getComponent(segment, 1, 3),
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
    switch (formatQualifier) {
      case '102':
        return `${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}`;
      case '203':
        return `${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}T${value.substring(8, 10)}:${value.substring(10, 12)}`;
      default:
        return value;
    }
  }
}
