import { Injectable } from '@nestjs/common';
import { X12TransactionSet, X12Segment, X12ParseError } from '../interfaces';
import { X12_855_PurchaseOrderAck } from '../interfaces/transaction-sets.types';

/**
 * X12 855 Purchase Order Acknowledgment Parser
 */
@Injectable()
export class X12_855_ParserService {
  /**
   * Parse 855 transaction set
   */
  parse(transactionSet: X12TransactionSet): {
    data?: X12_855_PurchaseOrderAck;
    errors: X12ParseError[];
  } {
    const errors: X12ParseError[] = [];
    const segments = transactionSet.segments;

    // Find BAK segment (required)
    const bakSegment = segments.find((s) => s.segmentId === 'BAK');
    if (!bakSegment) {
      errors.push({
        code: 'MISSING_BAK',
        message: 'BAK segment is required for 855',
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'BAK',
        severity: 'error',
      });
      return { errors };
    }

    const data: X12_855_PurchaseOrderAck = {
      transactionSetCode: '855',
      controlNumber: transactionSet.header.controlNumber,
      bak: this.parseBAK(bakSegment),
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

    // Parse PER segments
    const perSegments = this.getSegmentsBeforeN1(segments, 'PER');
    if (perSegments.length > 0) {
      data.contacts = perSegments.map((s) => this.parsePER(s));
    }

    // Parse DTM segments
    const dtmSegments = this.getSegmentsBeforeN1(segments, 'DTM');
    if (dtmSegments.length > 0) {
      data.dates = dtmSegments.map((s) => this.parseDTM(s));
    }

    // Parse N1 loops
    data.parties = this.parseN1Loops(segments);

    // Parse PO1/ACK loops
    data.lineItems = this.parsePO1ACKLoops(segments);

    // Parse CTT segment
    const cttSegment = segments.find((s) => s.segmentId === 'CTT');
    if (cttSegment) {
      data.totals = this.parseCTT(cttSegment);
    }

    return { data, errors };
  }

  private parseBAK(segment: X12Segment): X12_855_PurchaseOrderAck['bak'] {
    return {
      transactionSetPurposeCode: this.getElement(segment, 1),
      acknowledgmentType: this.getElement(segment, 2),
      purchaseOrderNumber: this.getElement(segment, 3),
      acknowledmentDate: this.getElement(segment, 4),
      releaseNumber: this.getElement(segment, 5) || undefined,
      requestReferenceNumber: this.getElement(segment, 6) || undefined,
      contractNumber: this.getElement(segment, 7) || undefined,
      acknowledgmentDate: this.getElement(segment, 9) || undefined,
    };
  }

  private parseCUR(segment: X12Segment): X12_855_PurchaseOrderAck['currency'] {
    const exchangeRate = this.getElement(segment, 3);
    return {
      currencyCode: this.getElement(segment, 2),
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : undefined,
    };
  }

  private parseREF(segment: X12Segment): NonNullable<X12_855_PurchaseOrderAck['references']>[0] {
    return {
      referenceIdQualifier: this.getElement(segment, 1),
      referenceId: this.getElement(segment, 2),
    };
  }

  private parsePER(segment: X12Segment): NonNullable<X12_855_PurchaseOrderAck['contacts']>[0] {
    return {
      contactFunctionCode: this.getElement(segment, 1),
      name: this.getElement(segment, 2) || undefined,
      communicationNumberQualifier: this.getElement(segment, 3) || undefined,
      communicationNumber: this.getElement(segment, 4) || undefined,
    };
  }

  private parseDTM(segment: X12Segment): NonNullable<X12_855_PurchaseOrderAck['dates']>[0] {
    return {
      dateTimeQualifier: this.getElement(segment, 1),
      date: this.getElement(segment, 2) || undefined,
      time: this.getElement(segment, 3) || undefined,
    };
  }

  private parseN1Loops(segments: X12Segment[]): X12_855_PurchaseOrderAck['parties'] {
    const parties: NonNullable<X12_855_PurchaseOrderAck['parties']> = [];
    let currentParty: NonNullable<X12_855_PurchaseOrderAck['parties']>[0] | null = null;

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
        } else if (segment.segmentId === 'PO1' || segment.segmentId === 'CTT') {
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

  private parsePO1ACKLoops(segments: X12Segment[]): X12_855_PurchaseOrderAck['lineItems'] {
    const items: NonNullable<X12_855_PurchaseOrderAck['lineItems']> = [];
    let currentItem: NonNullable<X12_855_PurchaseOrderAck['lineItems']>[0] | null = null;

    for (const segment of segments) {
      if (segment.segmentId === 'PO1') {
        if (currentItem) {
          items.push(currentItem);
        }

        const quantityStr = this.getElement(segment, 2);
        const unitPriceStr = this.getElement(segment, 4);

        currentItem = {
          assignedId: this.getElement(segment, 1) || undefined,
          quantityOrdered: quantityStr ? parseFloat(quantityStr) : undefined,
          unitOfMeasure: this.getElement(segment, 3) || undefined,
          unitPrice: unitPriceStr ? parseFloat(unitPriceStr) : undefined,
          productIds: this.parseProductIds(segment),
          acknowledgments: [],
        };
      } else if (currentItem && segment.segmentId === 'ACK') {
        const qtyStr = this.getElement(segment, 2);
        currentItem.acknowledgments = currentItem.acknowledgments || [];
        currentItem.acknowledgments.push({
          lineItemStatusCode: this.getElement(segment, 1),
          quantityAcknowledged: qtyStr ? parseFloat(qtyStr) : undefined,
          unitOfMeasure: this.getElement(segment, 3) || undefined,
          scheduledDate: this.getElement(segment, 4) || undefined,
        });
      } else if (segment.segmentId === 'CTT') {
        if (currentItem) {
          items.push(currentItem);
          currentItem = null;
        }
      }
    }

    if (currentItem) {
      items.push(currentItem);
    }

    return items.length > 0 ? items : undefined;
  }

  private parseProductIds(
    segment: X12Segment,
  ): NonNullable<X12_855_PurchaseOrderAck['lineItems']>[0]['productIds'] {
    const productIds: NonNullable<
      NonNullable<X12_855_PurchaseOrderAck['lineItems']>[0]['productIds']
    > = [];

    for (let i = 5; i < segment.elements.length - 1; i += 2) {
      const qualifier = segment.elements[i]?.value;
      const id = segment.elements[i + 1]?.value;

      if (qualifier && id) {
        productIds.push({ qualifier, id });
      }
    }

    return productIds.length > 0 ? productIds : undefined;
  }

  private parseCTT(segment: X12Segment): X12_855_PurchaseOrderAck['totals'] {
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

  private getElement(segment: X12Segment, position: number): string {
    return segment.elements[position - 1]?.value || '';
  }
}
