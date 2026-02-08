import { Injectable } from '@nestjs/common';
import {
  EdifactMessage,
  EdifactSegment,
  Edifact_INVOIC,
  EdifactInvoicLineItem,
  EdifactParty,
  EdifactReference,
  EdifactDateTime,
  EdifactMonetaryAmount,
  EdifactTax,
  EdifactAllowanceCharge,
  EdifactProductId,
  EdifactFreeText,
} from '../interfaces';

/**
 * EDIFACT INVOIC Message Parser
 *
 * Parses INVOIC (Invoice) messages into structured format.
 */
@Injectable()
export class EdifactInvoicParserService {
  /**
   * Parse INVOIC message
   */
  parse(message: EdifactMessage): Edifact_INVOIC {
    const segments = message.segments;
    const header = message.header;

    const invoic: Edifact_INVOIC = {
      messageType: 'INVOIC',
      messageReferenceNumber: header.messageReferenceNumber,
      invoiceNumber: '',
      invoiceDate: '',
      currency: '',
      parties: [],
      lineItems: [],
      totals: {
        invoiceTotal: 0,
      },
    };

    let currentSection: 'header' | 'line' | 'summary' = 'header';
    let currentLineItem: EdifactInvoicLineItem | null = null;
    let currentParty: EdifactParty | null = null;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentId = segment.segmentId;

      switch (segmentId) {
        case 'BGM':
          const bgm = this.parseBGM(segment);
          invoic.invoiceNumber = bgm.invoiceNumber;
          invoic.invoiceType = bgm.invoiceType;
          invoic.messageFunction = bgm.messageFunction;
          break;

        case 'DTM':
          const dtm = this.parseDTM(segment);
          if (currentSection === 'header') {
            if (!invoic.dates) invoic.dates = [];
            invoic.dates.push(dtm);
            if (dtm.qualifier === '137') {
              invoic.invoiceDate = this.formatDate(dtm.value, dtm.formatQualifier);
            }
          }
          break;

        case 'FTX':
          const ftx = this.parseFTX(segment);
          if (currentSection === 'header') {
            if (!invoic.freeText) invoic.freeText = [];
            invoic.freeText.push(ftx);
          } else if (currentLineItem) {
            if (!currentLineItem.freeText) currentLineItem.freeText = [];
            currentLineItem.freeText.push(ftx);
          }
          break;

        case 'RFF':
          const rff = this.parseRFF(segment);
          if (currentSection === 'header') {
            if (currentParty) {
              if (!currentParty.references) currentParty.references = [];
              currentParty.references.push(rff);
            } else {
              if (!invoic.references) invoic.references = [];
              invoic.references.push(rff);
              // Extract order reference
              if (rff.referenceQualifier === 'ON') {
                invoic.orderReference = rff.referenceNumber;
              } else if (rff.referenceQualifier === 'DQ') {
                invoic.despatchReference = rff.referenceNumber;
              }
            }
          }
          break;

        case 'NAD':
          currentParty = this.parseNAD(segment);
          invoic.parties.push(currentParty);
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
          invoic.currency = cux.currency || '';
          break;

        case 'PAT':
          const pat = this.parsePAT(segment);
          invoic.paymentTerms = pat;
          break;

        case 'FII':
          const fii = this.parseFII(segment);
          invoic.paymentInstructions = { ...invoic.paymentInstructions, ...fii };
          break;

        case 'ALC':
          const alc = this.parseALC(segment, segments, i);
          if (currentSection === 'header' || currentSection === 'summary') {
            if (!invoic.allowancesCharges) invoic.allowancesCharges = [];
            invoic.allowancesCharges.push(alc.allowanceCharge);
          } else if (currentLineItem) {
            if (!currentLineItem.allowancesCharges) currentLineItem.allowancesCharges = [];
            currentLineItem.allowancesCharges.push(alc.allowanceCharge);
          }
          i = alc.nextIndex - 1;
          break;

        case 'TAX':
          const tax = this.parseTAX(segment, segments, i);
          if (currentSection === 'header' || currentSection === 'summary') {
            if (!invoic.taxes) invoic.taxes = [];
            invoic.taxes.push(tax.tax);
          } else if (currentLineItem) {
            if (!currentLineItem.taxes) currentLineItem.taxes = [];
            currentLineItem.taxes.push(tax.tax);
          }
          i = tax.nextIndex - 1;
          break;

        case 'LIN':
          currentSection = 'line';
          currentParty = null;

          if (currentLineItem) {
            invoic.lineItems.push(currentLineItem);
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
            currentLineItem.quantity = qty.quantity;
            currentLineItem.unitOfMeasure = qty.unitOfMeasure;
          }
          break;

        case 'PRI':
          const pri = this.parsePRI(segment);
          if (currentLineItem) {
            currentLineItem.unitPrice = pri.amount;
            currentLineItem.priceQualifier = pri.qualifier;
          }
          break;

        case 'MOA':
          const moa = this.parseMOA(segment);
          if (currentSection === 'line' && currentLineItem) {
            if (moa.typeQualifier === '203') {
              currentLineItem.lineAmount = moa.amount;
            } else {
              if (!currentLineItem.amounts) currentLineItem.amounts = [];
              currentLineItem.amounts.push(moa);
            }
          } else if (currentSection === 'summary') {
            this.applyTotalAmount(invoic, moa);
          }
          break;

        case 'UNS':
          if (currentLineItem) {
            invoic.lineItems.push(currentLineItem);
            currentLineItem = null;
          }
          currentSection = 'summary';
          break;
      }
    }

    if (currentLineItem) {
      invoic.lineItems.push(currentLineItem);
    }

    // Calculate totals if not provided
    this.calculateTotals(invoic);

    return invoic;
  }

  // Segment parsing helpers

  private parseBGM(segment: EdifactSegment): {
    invoiceType?: string;
    invoiceNumber: string;
    messageFunction?: string;
  } {
    return {
      invoiceType: this.getComponent(segment, 1, 1),
      invoiceNumber: this.getElement(segment, 2) || '',
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

  private parsePAT(segment: EdifactSegment): Edifact_INVOIC['paymentTerms'] {
    return {
      termsType: this.getElement(segment, 1),
      netDays: this.getComponent(segment, 2, 2)
        ? parseInt(this.getComponent(segment, 2, 2)!, 10)
        : undefined,
      description: this.getComponent(segment, 3, 5),
    };
  }

  private parseFII(
    segment: EdifactSegment,
  ): Partial<NonNullable<Edifact_INVOIC['paymentInstructions']>> {
    return {
      accountNumber: this.getComponent(segment, 2, 1),
      accountHolderName: this.getComponent(segment, 2, 2),
      bankIdentifier: this.getComponent(segment, 3, 1),
      bankName: this.getComponent(segment, 3, 5),
    };
  }

  private parseALC(
    segment: EdifactSegment,
    allSegments: EdifactSegment[],
    currentIndex: number,
  ): { allowanceCharge: EdifactAllowanceCharge; nextIndex: number } {
    const alc: EdifactAllowanceCharge = {
      indicator: this.getElement(segment, 1) as 'A' | 'C',
      type: this.getComponent(segment, 5, 1),
      sequenceNumber: this.getElement(segment, 2),
      calculationSequence: this.getElement(segment, 3),
    };

    // Look for following PCD, MOA segments
    let nextIndex = currentIndex + 1;
    while (nextIndex < allSegments.length) {
      const nextSegment = allSegments[nextIndex];
      if (nextSegment.segmentId === 'PCD') {
        const pctValue = this.getComponent(nextSegment, 1, 2);
        if (pctValue) alc.percentage = parseFloat(pctValue);
        nextIndex++;
      } else if (nextSegment.segmentId === 'MOA') {
        const qualifier = this.getComponent(nextSegment, 1, 1);
        const amount = this.getComponent(nextSegment, 1, 2);
        if (qualifier === '23' || qualifier === '204') {
          alc.amount = parseFloat(amount || '0');
        } else if (qualifier === '25') {
          alc.basisAmount = parseFloat(amount || '0');
        }
        nextIndex++;
      } else {
        break;
      }
    }

    return { allowanceCharge: alc, nextIndex };
  }

  private parseTAX(
    segment: EdifactSegment,
    allSegments: EdifactSegment[],
    currentIndex: number,
  ): { tax: EdifactTax; nextIndex: number } {
    const tax: EdifactTax = {
      functionQualifier: this.getElement(segment, 1) || '7',
      type: this.getComponent(segment, 2, 1),
      category: this.getElement(segment, 6),
      rate: this.getElement(segment, 5) ? parseFloat(this.getElement(segment, 5)!) : undefined,
    };

    // Look for following MOA segment
    let nextIndex = currentIndex + 1;
    if (nextIndex < allSegments.length && allSegments[nextIndex].segmentId === 'MOA') {
      const moaSegment = allSegments[nextIndex];
      const qualifier = this.getComponent(moaSegment, 1, 1);
      const amount = this.getComponent(moaSegment, 1, 2);
      if (qualifier === '124' || qualifier === '176') {
        tax.amount = parseFloat(amount || '0');
      } else if (qualifier === '125') {
        tax.basisAmount = parseFloat(amount || '0');
      }
      nextIndex++;
    }

    return { tax, nextIndex };
  }

  private parseLIN(segment: EdifactSegment): EdifactInvoicLineItem {
    const itemNumber = this.getComponent(segment, 3, 1);
    const productIds: EdifactProductId[] = [];
    if (itemNumber) {
      productIds.push({
        itemNumber,
        itemNumberType: this.getComponent(segment, 3, 2),
        responsibleAgency: this.getComponent(segment, 3, 3),
      });
    }

    return {
      lineNumber: this.getElement(segment, 1) || '',
      productIds,
      quantity: 0,
      unitPrice: 0,
      lineAmount: 0,
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

  private parseQTY(segment: EdifactSegment): {
    qualifier: string;
    quantity: number;
    unitOfMeasure?: string;
  } {
    return {
      qualifier: this.getComponent(segment, 1, 1) || '',
      quantity: parseFloat(this.getComponent(segment, 1, 2) || '0'),
      unitOfMeasure: this.getComponent(segment, 1, 3),
    };
  }

  private parsePRI(segment: EdifactSegment): { qualifier: string; amount: number } {
    return {
      qualifier: this.getComponent(segment, 1, 1) || '',
      amount: parseFloat(this.getComponent(segment, 1, 2) || '0'),
    };
  }

  private parseMOA(segment: EdifactSegment): EdifactMonetaryAmount {
    return {
      typeQualifier: this.getComponent(segment, 1, 1) || '',
      amount: parseFloat(this.getComponent(segment, 1, 2) || '0'),
      currency: this.getComponent(segment, 1, 3),
    };
  }

  private applyTotalAmount(invoic: Edifact_INVOIC, moa: EdifactMonetaryAmount): void {
    switch (moa.typeQualifier) {
      case '79': // Total line items amount
        invoic.totals.lineItemsTotal = moa.amount;
        break;
      case '131': // Total allowances
        invoic.totals.totalAllowances = moa.amount;
        break;
      case '259': // Total charges
        invoic.totals.totalCharges = moa.amount;
        break;
      case '125': // Taxable amount
        invoic.totals.taxableAmount = moa.amount;
        break;
      case '176': // Tax amount
        invoic.totals.totalTaxAmount = moa.amount;
        break;
      case '86': // Invoice total
      case '77': // Invoice amount
        invoic.totals.invoiceTotal = moa.amount;
        break;
      case '9': // Amount due
        invoic.totals.amountDue = moa.amount;
        break;
      case '113': // Prepaid amount
        invoic.totals.prepaidAmount = moa.amount;
        break;
    }
  }

  private calculateTotals(invoic: Edifact_INVOIC): void {
    if (!invoic.totals.lineItemsTotal) {
      invoic.totals.lineItemsTotal = invoic.lineItems.reduce(
        (sum, item) => sum + (item.lineAmount || 0),
        0,
      );
    }

    if (!invoic.totals.invoiceTotal && invoic.totals.lineItemsTotal) {
      const allowances = invoic.totals.totalAllowances || 0;
      const charges = invoic.totals.totalCharges || 0;
      const tax = invoic.totals.totalTaxAmount || 0;
      invoic.totals.invoiceTotal = invoic.totals.lineItemsTotal - allowances + charges + tax;
    }
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
