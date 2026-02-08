import { Injectable } from '@nestjs/common';
import { X12TransactionSet, X12Segment, X12ParseError } from '../interfaces';
import { X12_850_PurchaseOrder } from '../interfaces/transaction-sets.types';

/**
 * X12 850 Purchase Order Parser
 *
 * Parses 850 transaction set into structured purchase order data.
 */
@Injectable()
export class X12_850_ParserService {
  /**
   * Parse 850 transaction set
   */
  parse(transactionSet: X12TransactionSet): {
    data?: X12_850_PurchaseOrder;
    errors: X12ParseError[];
  } {
    const errors: X12ParseError[] = [];
    const segments = transactionSet.segments;

    // Find BEG segment (required)
    const begSegment = segments.find((s) => s.segmentId === 'BEG');
    if (!begSegment) {
      errors.push({
        code: 'MISSING_BEG',
        message: 'BEG segment is required for 850',
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'BEG',
        severity: 'error',
      });
      return { errors };
    }

    const data: X12_850_PurchaseOrder = {
      transactionSetCode: '850',
      controlNumber: transactionSet.header.controlNumber,
      beg: this.parseBEG(begSegment),
      lineItems: [],
    };

    // Parse CUR segment
    const curSegment = segments.find((s) => s.segmentId === 'CUR');
    if (curSegment) {
      data.currency = this.parseCUR(curSegment);
    }

    // Parse REF segments
    const refSegments = segments.filter((s) => s.segmentId === 'REF');
    if (refSegments.length > 0) {
      data.references = refSegments.map((s) => this.parseREF(s));
    }

    // Parse PER segments (before N1 loops)
    const perSegments = this.getSegmentsBeforeN1(segments, 'PER');
    if (perSegments.length > 0) {
      data.contacts = perSegments.map((s) => this.parsePER(s));
    }

    // Parse DTM segments (before N1 loops)
    const dtmSegments = this.getSegmentsBeforeN1(segments, 'DTM');
    if (dtmSegments.length > 0) {
      data.dates = dtmSegments.map((s) => this.parseDTM(s));
    }

    // Parse TD5 segments
    const td5Segments = segments.filter((s) => s.segmentId === 'TD5');
    if (td5Segments.length > 0) {
      data.carrierDetails = td5Segments.map((s) => this.parseTD5(s));
    }

    // Parse N1 loops (parties)
    data.parties = this.parseN1Loops(segments);

    // Parse PO1 loops (line items)
    const lineItemsResult = this.parsePO1Loops(segments);
    data.lineItems = lineItemsResult.items;
    errors.push(...lineItemsResult.errors);

    // Parse CTT segment
    const cttSegment = segments.find((s) => s.segmentId === 'CTT');
    if (cttSegment) {
      data.totals = this.parseCTT(cttSegment);
    }

    // Parse AMT segments
    const amtSegments = segments.filter((s) => s.segmentId === 'AMT');
    if (amtSegments.length > 0) {
      data.amounts = amtSegments.map((s) => this.parseAMT(s));
    }

    return { data, errors };
  }

  /**
   * Parse BEG segment
   */
  private parseBEG(segment: X12Segment): X12_850_PurchaseOrder['beg'] {
    return {
      purposeCode: this.getElement(segment, 1),
      orderTypeCode: this.getElement(segment, 2),
      purchaseOrderNumber: this.getElement(segment, 3),
      releaseNumber: this.getElement(segment, 4) || undefined,
      orderDate: this.getElement(segment, 5),
      contractNumber: this.getElement(segment, 6) || undefined,
    };
  }

  /**
   * Parse CUR segment
   */
  private parseCUR(segment: X12Segment): X12_850_PurchaseOrder['currency'] {
    const exchangeRate = this.getElement(segment, 3);
    return {
      currencyCode: this.getElement(segment, 2),
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : undefined,
    };
  }

  /**
   * Parse REF segment
   */
  private parseREF(segment: X12Segment): NonNullable<X12_850_PurchaseOrder['references']>[0] {
    return {
      referenceIdQualifier: this.getElement(segment, 1),
      referenceId: this.getElement(segment, 2),
      description: this.getElement(segment, 3) || undefined,
    };
  }

  /**
   * Parse PER segment
   */
  private parsePER(segment: X12Segment): NonNullable<X12_850_PurchaseOrder['contacts']>[0] {
    return {
      contactFunctionCode: this.getElement(segment, 1),
      name: this.getElement(segment, 2) || undefined,
      communicationNumberQualifier: this.getElement(segment, 3) || undefined,
      communicationNumber: this.getElement(segment, 4) || undefined,
    };
  }

  /**
   * Parse DTM segment
   */
  private parseDTM(segment: X12Segment): NonNullable<X12_850_PurchaseOrder['dates']>[0] {
    return {
      dateTimeQualifier: this.getElement(segment, 1),
      date: this.getElement(segment, 2) || undefined,
      time: this.getElement(segment, 3) || undefined,
    };
  }

  /**
   * Parse TD5 segment
   */
  private parseTD5(segment: X12Segment): NonNullable<X12_850_PurchaseOrder['carrierDetails']>[0] {
    return {
      routingSequenceCode: this.getElement(segment, 1) || undefined,
      idCodeQualifier: this.getElement(segment, 2) || undefined,
      idCode: this.getElement(segment, 3) || undefined,
      transportationMethodCode: this.getElement(segment, 4) || undefined,
      routing: this.getElement(segment, 5) || undefined,
    };
  }

  /**
   * Parse N1 loops (parties)
   */
  private parseN1Loops(segments: X12Segment[]): X12_850_PurchaseOrder['parties'] {
    const parties: NonNullable<X12_850_PurchaseOrder['parties']> = [];
    let currentParty: NonNullable<X12_850_PurchaseOrder['parties']>[0] | null = null;

    for (const segment of segments) {
      if (segment.segmentId === 'N1') {
        // Save previous party if exists
        if (currentParty) {
          parties.push(currentParty);
        }
        // Start new party
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
          currentParty.contacts.push(this.parsePER(segment));
        } else if (segment.segmentId === 'PO1') {
          // PO1 marks end of N1 loop
          if (currentParty) {
            parties.push(currentParty);
            currentParty = null;
          }
        }
      }
    }

    // Add last party
    if (currentParty) {
      parties.push(currentParty);
    }

    return parties.length > 0 ? parties : undefined;
  }

  /**
   * Parse PO1 loops (line items)
   */
  private parsePO1Loops(segments: X12Segment[]): {
    items: X12_850_PurchaseOrder['lineItems'];
    errors: X12ParseError[];
  } {
    const items: X12_850_PurchaseOrder['lineItems'] = [];
    const errors: X12ParseError[] = [];
    let currentItem: X12_850_PurchaseOrder['lineItems'][0] | null = null;
    let inPO1Loop = false;

    for (const segment of segments) {
      if (segment.segmentId === 'PO1') {
        // Save previous item
        if (currentItem) {
          items.push(currentItem);
        }
        inPO1Loop = true;

        // Parse PO1
        const quantityStr = this.getElement(segment, 2);
        const unitPriceStr = this.getElement(segment, 4);

        currentItem = {
          assignedId: this.getElement(segment, 1) || undefined,
          quantityOrdered: quantityStr ? parseFloat(quantityStr) : 0,
          unitOfMeasure: this.getElement(segment, 3),
          unitPrice: unitPriceStr ? parseFloat(unitPriceStr) : undefined,
          basisOfUnitPrice: this.getElement(segment, 5) || undefined,
          productIds: this.parseProductIds(segment),
        };
      } else if (inPO1Loop && currentItem) {
        if (segment.segmentId === 'PID') {
          currentItem.descriptions = currentItem.descriptions || [];
          currentItem.descriptions.push({
            type: this.getElement(segment, 1),
            description: this.getElement(segment, 5),
          });
        } else if (segment.segmentId === 'DTM') {
          currentItem.dates = currentItem.dates || [];
          currentItem.dates.push({
            dateTimeQualifier: this.getElement(segment, 1),
            date: this.getElement(segment, 2) || undefined,
          });
        } else if (segment.segmentId === 'TXI') {
          currentItem.taxes = currentItem.taxes || [];
          const amountStr = this.getElement(segment, 2);
          const percentStr = this.getElement(segment, 3);
          currentItem.taxes.push({
            taxTypeCode: this.getElement(segment, 1),
            amount: amountStr ? parseFloat(amountStr) : undefined,
            percent: percentStr ? parseFloat(percentStr) : undefined,
          });
        } else if (segment.segmentId === 'CTT' || segment.segmentId === 'AMT') {
          // End of PO1 loop
          if (currentItem) {
            items.push(currentItem);
            currentItem = null;
          }
          inPO1Loop = false;
        }
      }
    }

    // Add last item
    if (currentItem) {
      items.push(currentItem);
    }

    if (items.length === 0) {
      errors.push({
        code: 'NO_LINE_ITEMS',
        message: 'At least one PO1 segment is required',
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'PO1',
        severity: 'error',
      });
    }

    return { items, errors };
  }

  /**
   * Parse product IDs from PO1 segment (elements 6-25 in pairs)
   */
  private parseProductIds(
    segment: X12Segment,
  ): X12_850_PurchaseOrder['lineItems'][0]['productIds'] {
    const productIds: X12_850_PurchaseOrder['lineItems'][0]['productIds'] = [];

    // Product ID qualifiers and IDs are in pairs starting at element 6
    for (let i = 5; i < segment.elements.length - 1; i += 2) {
      const qualifier = segment.elements[i]?.value;
      const id = segment.elements[i + 1]?.value;

      if (qualifier && id) {
        productIds.push({ qualifier, id });
      }
    }

    return productIds;
  }

  /**
   * Parse CTT segment
   */
  private parseCTT(segment: X12Segment): X12_850_PurchaseOrder['totals'] {
    const hashTotalStr = this.getElement(segment, 2);
    return {
      numberOfLineItems: parseInt(this.getElement(segment, 1), 10),
      hashTotal: hashTotalStr ? parseFloat(hashTotalStr) : undefined,
    };
  }

  /**
   * Parse AMT segment
   */
  private parseAMT(segment: X12Segment): NonNullable<X12_850_PurchaseOrder['amounts']>[0] {
    return {
      amountQualifier: this.getElement(segment, 1),
      amount: parseFloat(this.getElement(segment, 2)),
    };
  }

  /**
   * Get segments of type before first N1 segment
   */
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

  /**
   * Get element value by position (1-based)
   */
  private getElement(segment: X12Segment, position: number): string {
    return segment.elements[position - 1]?.value || '';
  }
}
