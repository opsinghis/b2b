import { Injectable } from '@nestjs/common';
import { X12TransactionSet, X12Segment, X12ParseError } from '../interfaces';
import {
  X12_856_ShipNotice,
  X12_856_HierarchicalLevel,
} from '../interfaces/transaction-sets.types';

/**
 * X12 856 Ship Notice / Manifest Parser
 */
@Injectable()
export class X12_856_ParserService {
  /**
   * Parse 856 transaction set
   */
  parse(transactionSet: X12TransactionSet): {
    data?: X12_856_ShipNotice;
    errors: X12ParseError[];
  } {
    const errors: X12ParseError[] = [];
    const segments = transactionSet.segments;

    // Find BSN segment (required)
    const bsnSegment = segments.find((s) => s.segmentId === 'BSN');
    if (!bsnSegment) {
      errors.push({
        code: 'MISSING_BSN',
        message: 'BSN segment is required for 856',
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'BSN',
        severity: 'error',
      });
      return { errors };
    }

    const data: X12_856_ShipNotice = {
      transactionSetCode: '856',
      controlNumber: transactionSet.header.controlNumber,
      bsn: this.parseBSN(bsnSegment),
      hierarchicalLevels: [],
    };

    // Parse header DTM segments (before first HL)
    const headerDtmSegments = this.getSegmentsBeforeHL(segments, 'DTM');
    if (headerDtmSegments.length > 0) {
      data.dates = headerDtmSegments.map((s) => this.parseDTM(s));
    }

    // Parse HL loops
    const hlResult = this.parseHLLoops(segments);
    data.hierarchicalLevels = hlResult.levels;
    errors.push(...hlResult.errors);

    // Parse CTT segment
    const cttSegment = segments.find((s) => s.segmentId === 'CTT');
    if (cttSegment) {
      data.totals = this.parseCTT(cttSegment);
    }

    return { data, errors };
  }

  private parseBSN(segment: X12Segment): X12_856_ShipNotice['bsn'] {
    return {
      transactionSetPurposeCode: this.getElement(segment, 1),
      shipmentIdNumber: this.getElement(segment, 2),
      shipmentDate: this.getElement(segment, 3),
      shipmentTime: this.getElement(segment, 4) || undefined,
      hierarchicalStructureCode: this.getElement(segment, 5) || undefined,
    };
  }

  private parseDTM(segment: X12Segment): NonNullable<X12_856_ShipNotice['dates']>[0] {
    return {
      dateTimeQualifier: this.getElement(segment, 1),
      date: this.getElement(segment, 2) || undefined,
      time: this.getElement(segment, 3) || undefined,
    };
  }

  private parseHLLoops(segments: X12Segment[]): {
    levels: X12_856_HierarchicalLevel[];
    errors: X12ParseError[];
  } {
    const levels: X12_856_HierarchicalLevel[] = [];
    const errors: X12ParseError[] = [];

    // Find all HL segment indices
    const hlIndices: number[] = [];
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].segmentId === 'HL') {
        hlIndices.push(i);
      }
    }

    // Parse each HL loop
    for (let i = 0; i < hlIndices.length; i++) {
      const startIndex = hlIndices[i];
      const endIndex = i + 1 < hlIndices.length ? hlIndices[i + 1] : segments.length;
      const hlSegments = segments.slice(startIndex, endIndex);

      const level = this.parseHLLoop(hlSegments);
      levels.push(level);
    }

    if (levels.length === 0) {
      errors.push({
        code: 'NO_HL_SEGMENTS',
        message: 'At least one HL segment is required for 856',
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'HL',
        severity: 'error',
      });
    }

    return { levels, errors };
  }

  private parseHLLoop(segments: X12Segment[]): X12_856_HierarchicalLevel {
    const hlSegment = segments[0];

    const level: X12_856_HierarchicalLevel = {
      hierarchicalIdNumber: this.getElement(hlSegment, 1),
      hierarchicalParentIdNumber: this.getElement(hlSegment, 2) || undefined,
      hierarchicalLevelCode: this.getElement(hlSegment, 3),
      hierarchicalChildCode: this.getElement(hlSegment, 4) || undefined,
    };

    const levelCode = level.hierarchicalLevelCode;

    // Parse based on level code
    switch (levelCode) {
      case 'S': // Shipment
        level.shipment = this.parseShipmentLevel(segments);
        break;
      case 'O': // Order
        level.order = this.parseOrderLevel(segments);
        break;
      case 'P': // Pack
        level.pack = this.parsePackLevel(segments);
        break;
      case 'I': // Item
        level.item = this.parseItemLevel(segments);
        break;
    }

    return level;
  }

  private parseShipmentLevel(segments: X12Segment[]): X12_856_HierarchicalLevel['shipment'] {
    const shipment: NonNullable<X12_856_HierarchicalLevel['shipment']> = {};

    // Parse TD5 (Carrier Details)
    const td5Segment = segments.find((s) => s.segmentId === 'TD5');
    if (td5Segment) {
      shipment.carrier = {
        carrierCode: this.getElement(td5Segment, 3) || undefined,
        transportationMethodCode: this.getElement(td5Segment, 4) || undefined,
        routing: this.getElement(td5Segment, 5) || undefined,
      };
    }

    // Parse REF segments
    const refSegments = segments.filter((s) => s.segmentId === 'REF');
    if (refSegments.length > 0) {
      shipment.references = refSegments.map((s) => ({
        referenceIdQualifier: this.getElement(s, 1),
        referenceId: this.getElement(s, 2),
      }));
    }

    // Parse DTM segments
    const dtmSegments = segments.filter((s) => s.segmentId === 'DTM');
    if (dtmSegments.length > 0) {
      shipment.dates = dtmSegments.map((s) => ({
        dateTimeQualifier: this.getElement(s, 1),
        date: this.getElement(s, 2) || undefined,
      }));
    }

    // Parse N1 loops
    shipment.parties = this.parseN1Loops(segments);

    return shipment;
  }

  private parseOrderLevel(segments: X12Segment[]): X12_856_HierarchicalLevel['order'] {
    const order: NonNullable<X12_856_HierarchicalLevel['order']> = {};

    // Parse PRF (Purchase Order Reference)
    const prfSegment = segments.find((s) => s.segmentId === 'PRF');
    if (prfSegment) {
      order.purchaseOrderNumber = this.getElement(prfSegment, 1);
    }

    // Parse REF segments
    const refSegments = segments.filter((s) => s.segmentId === 'REF');
    if (refSegments.length > 0) {
      order.references = refSegments.map((s) => ({
        referenceIdQualifier: this.getElement(s, 1),
        referenceId: this.getElement(s, 2),
      }));
    }

    return order;
  }

  private parsePackLevel(segments: X12Segment[]): X12_856_HierarchicalLevel['pack'] {
    const pack: NonNullable<X12_856_HierarchicalLevel['pack']> = {};

    // Parse TD1 (Packaging)
    const td1Segment = segments.find((s) => s.segmentId === 'TD1');
    if (td1Segment) {
      const weightStr = this.getElement(td1Segment, 7);
      pack.packaging = {
        packagingCode: this.getElement(td1Segment, 1) || undefined,
        numberOfPackages: parseInt(this.getElement(td1Segment, 2), 10) || undefined,
        weight: weightStr ? parseFloat(weightStr) : undefined,
        weightUnitCode: this.getElement(td1Segment, 6) || undefined,
      };
    }

    // Parse MAN (Marks and Numbers)
    const manSegments = segments.filter((s) => s.segmentId === 'MAN');
    if (manSegments.length > 0) {
      pack.marks = manSegments.map((s) => ({
        markCodeQualifier: this.getElement(s, 1) || undefined,
        shipmentMarks: this.getElement(s, 2) || undefined,
      }));
    }

    return pack;
  }

  private parseItemLevel(segments: X12Segment[]): X12_856_HierarchicalLevel['item'] {
    const item: NonNullable<X12_856_HierarchicalLevel['item']> = {};

    // Parse LIN (Item Identification)
    const linSegment = segments.find((s) => s.segmentId === 'LIN');
    if (linSegment) {
      item.lineItemNumber = this.getElement(linSegment, 1) || undefined;
      item.productIds = this.parseProductIds(linSegment);
    }

    // Parse SN1 (Item Detail - Shipment)
    const sn1Segment = segments.find((s) => s.segmentId === 'SN1');
    if (sn1Segment) {
      item.quantities = item.quantities || [];
      const qtyStr = this.getElement(sn1Segment, 2);
      item.quantities.push({
        quantityQualifier: 'SHP',
        quantity: qtyStr ? parseFloat(qtyStr) : 0,
        unitOfMeasure: this.getElement(sn1Segment, 3) || undefined,
      });
    }

    // Parse PID (Product Description)
    const pidSegments = segments.filter((s) => s.segmentId === 'PID');
    if (pidSegments.length > 0) {
      item.descriptions = pidSegments.map((s) => ({
        description: this.getElement(s, 5),
      }));
    }

    // Parse SER (Serial Numbers) or REF with SN qualifier
    const serSegments = segments.filter((s) => s.segmentId === 'SER');
    const snRefSegments = segments.filter(
      (s) => s.segmentId === 'REF' && this.getElement(s, 1) === 'SN',
    );

    const serialNumbers: string[] = [];
    for (const ser of serSegments) {
      const sn = this.getElement(ser, 1);
      if (sn) serialNumbers.push(sn);
    }
    for (const ref of snRefSegments) {
      const sn = this.getElement(ref, 2);
      if (sn) serialNumbers.push(sn);
    }

    if (serialNumbers.length > 0) {
      item.serialNumbers = serialNumbers;
    }

    return item;
  }

  private parseN1Loops(
    segments: X12Segment[],
  ): NonNullable<X12_856_HierarchicalLevel['shipment']>['parties'] {
    const parties: NonNullable<NonNullable<X12_856_HierarchicalLevel['shipment']>['parties']> = [];
    let currentParty:
      | NonNullable<NonNullable<X12_856_HierarchicalLevel['shipment']>['parties']>[0]
      | null = null;

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
        }
      }
    }

    if (currentParty) {
      parties.push(currentParty);
    }

    return parties.length > 0 ? parties : undefined;
  }

  private parseProductIds(
    linSegment: X12Segment,
  ): NonNullable<X12_856_HierarchicalLevel['item']>['productIds'] {
    const productIds: NonNullable<NonNullable<X12_856_HierarchicalLevel['item']>['productIds']> =
      [];

    // LIN has product IDs starting at element 2 in pairs
    for (let i = 1; i < linSegment.elements.length - 1; i += 2) {
      const qualifier = linSegment.elements[i]?.value;
      const id = linSegment.elements[i + 1]?.value;

      if (qualifier && id) {
        productIds.push({ qualifier, id });
      }
    }

    return productIds.length > 0 ? productIds : undefined;
  }

  private parseCTT(segment: X12Segment): X12_856_ShipNotice['totals'] {
    const hashTotalStr = this.getElement(segment, 2);
    return {
      numberOfLineItems: parseInt(this.getElement(segment, 1), 10),
      hashTotal: hashTotalStr ? parseFloat(hashTotalStr) : undefined,
    };
  }

  private getSegmentsBeforeHL(segments: X12Segment[], segmentId: string): X12Segment[] {
    const result: X12Segment[] = [];
    for (const segment of segments) {
      if (segment.segmentId === 'HL') {
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
