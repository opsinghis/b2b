import { Injectable } from '@nestjs/common';
import { X12TransactionSet, X12Segment, X12Element, STSegment, SESegment } from '../interfaces';
import { X12_850_PurchaseOrder } from '../interfaces/transaction-sets.types';

/**
 * X12 850 Purchase Order Generator
 */
@Injectable()
export class X12_850_GeneratorService {
  /**
   * Generate 850 transaction set from data
   */
  generate(data: X12_850_PurchaseOrder, controlNumber?: string): X12TransactionSet {
    const segments: X12Segment[] = [];
    const stControlNumber = controlNumber || data.controlNumber || '0001';

    // BEG segment
    segments.push(this.generateBEG(data.beg));

    // CUR segment
    if (data.currency) {
      segments.push(this.generateCUR(data.currency));
    }

    // REF segments
    if (data.references) {
      for (const ref of data.references) {
        segments.push(this.generateREF(ref));
      }
    }

    // PER segments
    if (data.contacts) {
      for (const contact of data.contacts) {
        segments.push(this.generatePER(contact));
      }
    }

    // DTM segments
    if (data.dates) {
      for (const dtm of data.dates) {
        segments.push(this.generateDTM(dtm));
      }
    }

    // TD5 segments
    if (data.carrierDetails) {
      for (const td5 of data.carrierDetails) {
        segments.push(this.generateTD5(td5));
      }
    }

    // N1 loops (parties)
    if (data.parties) {
      for (const party of data.parties) {
        segments.push(...this.generateN1Loop(party));
      }
    }

    // PO1 loops (line items)
    for (const item of data.lineItems) {
      segments.push(...this.generatePO1Loop(item));
    }

    // CTT segment
    if (data.totals) {
      segments.push(this.generateCTT(data.totals));
    }

    // AMT segments
    if (data.amounts) {
      for (const amt of data.amounts) {
        segments.push(this.generateAMT(amt));
      }
    }

    const header: STSegment = {
      segmentId: 'ST',
      transactionSetCode: '850',
      controlNumber: stControlNumber.padStart(4, '0'),
    };

    const trailer: SESegment = {
      segmentId: 'SE',
      numberOfSegments: segments.length + 2, // Include ST and SE
      controlNumber: stControlNumber.padStart(4, '0'),
    };

    return { header, segments, trailer };
  }

  private generateBEG(beg: X12_850_PurchaseOrder['beg']): X12Segment {
    return {
      segmentId: 'BEG',
      elements: [
        { value: beg.purposeCode },
        { value: beg.orderTypeCode },
        { value: beg.purchaseOrderNumber },
        { value: beg.releaseNumber || '' },
        { value: beg.orderDate },
        { value: beg.contractNumber || '' },
      ],
    };
  }

  private generateCUR(currency: NonNullable<X12_850_PurchaseOrder['currency']>): X12Segment {
    return {
      segmentId: 'CUR',
      elements: [
        { value: 'BY' }, // Entity identifier code (Buyer)
        { value: currency.currencyCode },
        { value: currency.exchangeRate?.toString() || '' },
      ],
    };
  }

  private generateREF(ref: NonNullable<X12_850_PurchaseOrder['references']>[0]): X12Segment {
    return {
      segmentId: 'REF',
      elements: [
        { value: ref.referenceIdQualifier },
        { value: ref.referenceId },
        { value: ref.description || '' },
      ],
    };
  }

  private generatePER(contact: NonNullable<X12_850_PurchaseOrder['contacts']>[0]): X12Segment {
    return {
      segmentId: 'PER',
      elements: [
        { value: contact.contactFunctionCode },
        { value: contact.name || '' },
        { value: contact.communicationNumberQualifier || '' },
        { value: contact.communicationNumber || '' },
      ],
    };
  }

  private generateDTM(dtm: NonNullable<X12_850_PurchaseOrder['dates']>[0]): X12Segment {
    return {
      segmentId: 'DTM',
      elements: [
        { value: dtm.dateTimeQualifier },
        { value: dtm.date || '' },
        { value: dtm.time || '' },
      ],
    };
  }

  private generateTD5(td5: NonNullable<X12_850_PurchaseOrder['carrierDetails']>[0]): X12Segment {
    return {
      segmentId: 'TD5',
      elements: [
        { value: td5.routingSequenceCode || '' },
        { value: td5.idCodeQualifier || '' },
        { value: td5.idCode || '' },
        { value: td5.transportationMethodCode || '' },
        { value: td5.routing || '' },
      ],
    };
  }

  private generateN1Loop(party: NonNullable<X12_850_PurchaseOrder['parties']>[0]): X12Segment[] {
    const segments: X12Segment[] = [];

    // N1 segment
    segments.push({
      segmentId: 'N1',
      elements: [
        { value: party.entityIdCode },
        { value: party.name || '' },
        { value: party.idCodeQualifier || '' },
        { value: party.idCode || '' },
      ],
    });

    // N3 segment (address line 1)
    if (party.address?.addressLine1) {
      segments.push({
        segmentId: 'N3',
        elements: [
          { value: party.address.addressLine1 },
          { value: party.address.addressLine2 || '' },
        ],
      });
    }

    // N4 segment (city/state/zip)
    if (party.address?.city || party.address?.stateCode || party.address?.postalCode) {
      segments.push({
        segmentId: 'N4',
        elements: [
          { value: party.address?.city || '' },
          { value: party.address?.stateCode || '' },
          { value: party.address?.postalCode || '' },
          { value: party.address?.countryCode || '' },
        ],
      });
    }

    // PER segments for contacts
    if (party.contacts) {
      for (const contact of party.contacts) {
        segments.push(this.generatePER(contact));
      }
    }

    return segments;
  }

  private generatePO1Loop(item: X12_850_PurchaseOrder['lineItems'][0]): X12Segment[] {
    const segments: X12Segment[] = [];

    // PO1 segment
    const po1Elements: X12Element[] = [
      { value: item.assignedId || '' },
      { value: item.quantityOrdered.toString() },
      { value: item.unitOfMeasure },
      { value: item.unitPrice?.toString() || '' },
      { value: item.basisOfUnitPrice || '' },
    ];

    // Add product IDs
    for (const productId of item.productIds) {
      po1Elements.push({ value: productId.qualifier });
      po1Elements.push({ value: productId.id });
    }

    segments.push({
      segmentId: 'PO1',
      elements: po1Elements,
    });

    // PID segments (descriptions)
    if (item.descriptions) {
      for (const desc of item.descriptions) {
        segments.push({
          segmentId: 'PID',
          elements: [
            { value: desc.type },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: desc.description },
          ],
        });
      }
    }

    // DTM segments
    if (item.dates) {
      for (const dtm of item.dates) {
        segments.push({
          segmentId: 'DTM',
          elements: [{ value: dtm.dateTimeQualifier }, { value: dtm.date || '' }],
        });
      }
    }

    // TXI segments (taxes)
    if (item.taxes) {
      for (const tax of item.taxes) {
        segments.push({
          segmentId: 'TXI',
          elements: [
            { value: tax.taxTypeCode },
            { value: tax.amount?.toString() || '' },
            { value: tax.percent?.toString() || '' },
          ],
        });
      }
    }

    return segments;
  }

  private generateCTT(totals: NonNullable<X12_850_PurchaseOrder['totals']>): X12Segment {
    return {
      segmentId: 'CTT',
      elements: [
        { value: totals.numberOfLineItems.toString() },
        { value: totals.hashTotal?.toString() || '' },
      ],
    };
  }

  private generateAMT(amt: NonNullable<X12_850_PurchaseOrder['amounts']>[0]): X12Segment {
    return {
      segmentId: 'AMT',
      elements: [{ value: amt.amountQualifier }, { value: amt.amount.toString() }],
    };
  }
}
