import { Injectable } from '@nestjs/common';
import { X12TransactionSet, X12Segment, X12ParseError } from '../interfaces';
import { X12_810_Invoice } from '../interfaces/transaction-sets.types';

/**
 * X12 810 Invoice Parser
 */
@Injectable()
export class X12_810_ParserService {
  /**
   * Parse 810 transaction set
   */
  parse(transactionSet: X12TransactionSet): {
    data?: X12_810_Invoice;
    errors: X12ParseError[];
  } {
    const errors: X12ParseError[] = [];
    const segments = transactionSet.segments;

    // Find BIG segment (required)
    const bigSegment = segments.find((s) => s.segmentId === 'BIG');
    if (!bigSegment) {
      errors.push({
        code: 'MISSING_BIG',
        message: 'BIG segment is required for 810',
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'BIG',
        severity: 'error',
      });
      return { errors };
    }

    // Find TDS segment (required)
    const tdsSegment = segments.find((s) => s.segmentId === 'TDS');
    if (!tdsSegment) {
      errors.push({
        code: 'MISSING_TDS',
        message: 'TDS segment is required for 810',
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'TDS',
        severity: 'error',
      });
      return { errors };
    }

    const data: X12_810_Invoice = {
      transactionSetCode: '810',
      controlNumber: transactionSet.header.controlNumber,
      big: this.parseBIG(bigSegment),
      lineItems: [],
      totalSummary: this.parseTDS(tdsSegment),
    };

    // Parse CUR segment
    const curSegment = segments.find((s) => s.segmentId === 'CUR');
    if (curSegment) {
      data.currency = this.parseCUR(curSegment);
    }

    // Parse REF segments (before N1)
    const refSegments = this.getSegmentsBeforeN1(segments, 'REF');
    if (refSegments.length > 0) {
      data.references = refSegments.map((s) => this.parseREF(s));
    }

    // Parse N1 loops (parties)
    data.parties = this.parseN1Loops(segments);

    // Parse ITD (Payment Terms)
    const itdSegment = segments.find((s) => s.segmentId === 'ITD');
    if (itdSegment) {
      data.paymentTerms = this.parseITD(itdSegment);
    }

    // Parse DTM segments (before IT1)
    const dtmSegments = this.getSegmentsBeforeIT1(segments, 'DTM');
    if (dtmSegments.length > 0) {
      data.dates = dtmSegments.map((s) => this.parseDTM(s));
    }

    // Parse IT1 loops (line items)
    const lineItemsResult = this.parseIT1Loops(segments);
    data.lineItems = lineItemsResult.items;
    errors.push(...lineItemsResult.errors);

    // Parse TXI segments (after TDS)
    const txiSegments = this.getSegmentsAfterTDS(segments);
    if (txiSegments.length > 0) {
      data.taxes = txiSegments.map((s) => this.parseTXI(s));
    }

    // Parse CAD segment
    const cadSegment = segments.find((s) => s.segmentId === 'CAD');
    if (cadSegment) {
      data.carrierDetails = this.parseCAD(cadSegment);
    }

    // Parse ISS segment
    const issSegment = segments.find((s) => s.segmentId === 'ISS');
    if (issSegment) {
      data.shipmentSummary = this.parseISS(issSegment);
    }

    // Parse CTT segment
    const cttSegment = segments.find((s) => s.segmentId === 'CTT');
    if (cttSegment) {
      data.totals = this.parseCTT(cttSegment);
    }

    return { data, errors };
  }

  private parseBIG(segment: X12Segment): X12_810_Invoice['big'] {
    return {
      invoiceDate: this.getElement(segment, 1),
      invoiceNumber: this.getElement(segment, 2),
      purchaseOrderDate: this.getElement(segment, 3) || undefined,
      purchaseOrderNumber: this.getElement(segment, 4) || undefined,
      releaseNumber: this.getElement(segment, 5) || undefined,
      changeOrderSequence: this.getElement(segment, 6) || undefined,
      transactionTypeCode: this.getElement(segment, 7) || undefined,
    };
  }

  private parseTDS(segment: X12Segment): X12_810_Invoice['totalSummary'] {
    const totalStr = this.getElement(segment, 1);
    const subjectStr = this.getElement(segment, 2);
    const discountedStr = this.getElement(segment, 3);
    const termsStr = this.getElement(segment, 4);

    return {
      totalInvoiceAmount: totalStr ? parseFloat(totalStr) / 100 : 0, // TDS amounts are in cents
      amountSubjectToTermsDiscount: subjectStr ? parseFloat(subjectStr) / 100 : undefined,
      discountedAmount: discountedStr ? parseFloat(discountedStr) / 100 : undefined,
      termsDiscountAmount: termsStr ? parseFloat(termsStr) / 100 : undefined,
    };
  }

  private parseCUR(segment: X12Segment): X12_810_Invoice['currency'] {
    const exchangeRate = this.getElement(segment, 3);
    return {
      currencyCode: this.getElement(segment, 2),
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : undefined,
    };
  }

  private parseREF(segment: X12Segment): NonNullable<X12_810_Invoice['references']>[0] {
    return {
      referenceIdQualifier: this.getElement(segment, 1),
      referenceId: this.getElement(segment, 2),
      description: this.getElement(segment, 3) || undefined,
    };
  }

  private parseITD(segment: X12Segment): X12_810_Invoice['paymentTerms'] {
    const discountPercent = this.getElement(segment, 3);
    const discountDays = this.getElement(segment, 5);
    const netDays = this.getElement(segment, 7);
    const discountAmount = this.getElement(segment, 8);

    return {
      termsTypeCode: this.getElement(segment, 1) || undefined,
      termsBasisDateCode: this.getElement(segment, 2) || undefined,
      termsDiscountPercent: discountPercent ? parseFloat(discountPercent) : undefined,
      termsDiscountDueDate: this.getElement(segment, 4) || undefined,
      termsDiscountDaysDue: discountDays ? parseInt(discountDays, 10) : undefined,
      termsNetDueDate: this.getElement(segment, 6) || undefined,
      termsNetDays: netDays ? parseInt(netDays, 10) : undefined,
      termsDiscountAmount: discountAmount ? parseFloat(discountAmount) : undefined,
      description: this.getElement(segment, 12) || undefined,
    };
  }

  private parseDTM(segment: X12Segment): NonNullable<X12_810_Invoice['dates']>[0] {
    return {
      dateTimeQualifier: this.getElement(segment, 1),
      date: this.getElement(segment, 2) || undefined,
      time: this.getElement(segment, 3) || undefined,
    };
  }

  private parseTXI(segment: X12Segment): NonNullable<X12_810_Invoice['taxes']>[0] {
    const amountStr = this.getElement(segment, 2);
    const percentStr = this.getElement(segment, 3);

    return {
      taxTypeCode: this.getElement(segment, 1),
      taxAmount: amountStr ? parseFloat(amountStr) : undefined,
      taxPercent: percentStr ? parseFloat(percentStr) : undefined,
      taxJurisdiction: this.getElement(segment, 6) || undefined,
      taxExemptCode: this.getElement(segment, 4) || undefined,
    };
  }

  private parseCAD(segment: X12Segment): X12_810_Invoice['carrierDetails'] {
    return {
      transportationMethodCode: this.getElement(segment, 1) || undefined,
      equipmentCode: this.getElement(segment, 2) || undefined,
      routing: this.getElement(segment, 5) || undefined,
      shipmentOrderStatusCode: this.getElement(segment, 7) || undefined,
    };
  }

  private parseISS(segment: X12Segment): X12_810_Invoice['shipmentSummary'] {
    const unitsStr = this.getElement(segment, 1);
    const weightStr = this.getElement(segment, 3);

    return {
      numberOfUnitsShipped: unitsStr ? parseFloat(unitsStr) : undefined,
      unitOfMeasure: this.getElement(segment, 2) || undefined,
      weight: weightStr ? parseFloat(weightStr) : undefined,
      weightUnitCode: this.getElement(segment, 4) || undefined,
    };
  }

  private parseN1Loops(segments: X12Segment[]): X12_810_Invoice['parties'] {
    const parties: NonNullable<X12_810_Invoice['parties']> = [];
    let currentParty: NonNullable<X12_810_Invoice['parties']>[0] | null = null;

    for (const segment of segments) {
      if (segment.segmentId === 'N1') {
        if (currentParty) {
          parties.push(currentParty);
        }
        currentParty = {
          entityIdCode: this.getElement(segment, 1),
          name: this.getElement(segment, 2) || undefined,
          idCodeQualifier: this.getElement(segment, 3) || undefined,
          idCode: this.getElement(segment, 4) || undefined,
        };
      } else if (currentParty) {
        if (segment.segmentId === 'N3') {
          currentParty.address = currentParty.address || {};
          currentParty.address.addressLine1 = this.getElement(segment, 1);
          currentParty.address.addressLine2 = this.getElement(segment, 2) || undefined;
        } else if (segment.segmentId === 'N4') {
          currentParty.address = currentParty.address || {};
          currentParty.address.city = this.getElement(segment, 1);
          currentParty.address.stateCode = this.getElement(segment, 2);
          currentParty.address.postalCode = this.getElement(segment, 3);
          currentParty.address.countryCode = this.getElement(segment, 4) || undefined;
        } else if (segment.segmentId === 'PER') {
          currentParty.contacts = currentParty.contacts || [];
          currentParty.contacts.push({
            contactFunctionCode: this.getElement(segment, 1),
            name: this.getElement(segment, 2) || undefined,
            communicationNumberQualifier: this.getElement(segment, 3) || undefined,
            communicationNumber: this.getElement(segment, 4) || undefined,
          });
        } else if (segment.segmentId === 'ITD' || segment.segmentId === 'IT1') {
          if (currentParty) {
            parties.push(currentParty);
            currentParty = null;
          }
        }
      }
    }

    if (currentParty) {
      parties.push(currentParty);
    }

    return parties.length > 0 ? parties : undefined;
  }

  private parseIT1Loops(segments: X12Segment[]): {
    items: X12_810_Invoice['lineItems'];
    errors: X12ParseError[];
  } {
    const items: X12_810_Invoice['lineItems'] = [];
    const errors: X12ParseError[] = [];
    let currentItem: X12_810_Invoice['lineItems'][0] | null = null;
    let inIT1Loop = false;

    for (const segment of segments) {
      if (segment.segmentId === 'IT1') {
        if (currentItem) {
          items.push(currentItem);
        }
        inIT1Loop = true;

        const quantityStr = this.getElement(segment, 2);
        const unitPriceStr = this.getElement(segment, 4);

        currentItem = {
          assignedId: this.getElement(segment, 1) || undefined,
          quantityInvoiced: quantityStr ? parseFloat(quantityStr) : 0,
          unitOfMeasure: this.getElement(segment, 3),
          unitPrice: unitPriceStr ? parseFloat(unitPriceStr) : 0,
          basisOfUnitPrice: this.getElement(segment, 5) || undefined,
          productIds: this.parseProductIds(segment),
        };
      } else if (inIT1Loop && currentItem) {
        if (segment.segmentId === 'PID') {
          currentItem.descriptions = currentItem.descriptions || [];
          currentItem.descriptions.push({
            type: this.getElement(segment, 1),
            description: this.getElement(segment, 5),
          });
        } else if (segment.segmentId === 'TXI') {
          currentItem.taxes = currentItem.taxes || [];
          const amountStr = this.getElement(segment, 2);
          const percentStr = this.getElement(segment, 3);
          currentItem.taxes.push({
            taxTypeCode: this.getElement(segment, 1),
            amount: amountStr ? parseFloat(amountStr) : undefined,
            percent: percentStr ? parseFloat(percentStr) : undefined,
            taxExemptCode: this.getElement(segment, 4) || undefined,
          });
        } else if (segment.segmentId === 'SAC') {
          currentItem.charges = currentItem.charges || [];
          const amountStr = this.getElement(segment, 5);
          currentItem.charges.push({
            chargeIndicator: this.getElement(segment, 1),
            chargeCode: this.getElement(segment, 2) || undefined,
            amount: amountStr ? parseFloat(amountStr) : undefined,
            description: this.getElement(segment, 15) || undefined,
          });
        } else if (segment.segmentId === 'TDS' || segment.segmentId === 'CTT') {
          if (currentItem) {
            items.push(currentItem);
            currentItem = null;
          }
          inIT1Loop = false;
        }
      }
    }

    if (currentItem) {
      items.push(currentItem);
    }

    if (items.length === 0) {
      errors.push({
        code: 'NO_LINE_ITEMS',
        message: 'At least one IT1 segment is required for 810',
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'IT1',
        severity: 'error',
      });
    }

    return { items, errors };
  }

  private parseProductIds(segment: X12Segment): X12_810_Invoice['lineItems'][0]['productIds'] {
    const productIds: X12_810_Invoice['lineItems'][0]['productIds'] = [];

    // Product IDs start at element 6 in pairs
    for (let i = 5; i < segment.elements.length - 1; i += 2) {
      const qualifier = segment.elements[i]?.value;
      const id = segment.elements[i + 1]?.value;

      if (qualifier && id) {
        productIds.push({ qualifier, id });
      }
    }

    return productIds;
  }

  private parseCTT(segment: X12Segment): X12_810_Invoice['totals'] {
    const hashTotalStr = this.getElement(segment, 2);
    return {
      numberOfLineItems: parseInt(this.getElement(segment, 1), 10),
      hashTotal: hashTotalStr ? parseFloat(hashTotalStr) : undefined,
    };
  }

  private getSegmentsBeforeN1(segments: X12Segment[], segmentId: string): X12Segment[] {
    const result: X12Segment[] = [];
    for (const segment of segments) {
      if (segment.segmentId === 'N1') {
        break;
      }
      if (segment.segmentId === segmentId) {
        result.push(segment);
      }
    }
    return result;
  }

  private getSegmentsBeforeIT1(segments: X12Segment[], segmentId: string): X12Segment[] {
    const result: X12Segment[] = [];
    for (const segment of segments) {
      if (segment.segmentId === 'IT1') {
        break;
      }
      if (segment.segmentId === segmentId) {
        result.push(segment);
      }
    }
    return result;
  }

  private getSegmentsAfterTDS(segments: X12Segment[]): X12Segment[] {
    const result: X12Segment[] = [];
    let afterTDS = false;

    for (const segment of segments) {
      if (segment.segmentId === 'TDS') {
        afterTDS = true;
        continue;
      }
      if (afterTDS && segment.segmentId === 'TXI') {
        result.push(segment);
      }
      if (segment.segmentId === 'CTT') {
        break;
      }
    }

    return result;
  }

  private getElement(segment: X12Segment, position: number): string {
    return segment.elements[position - 1]?.value || '';
  }
}
