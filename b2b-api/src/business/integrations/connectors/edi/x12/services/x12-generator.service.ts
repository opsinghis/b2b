import { Injectable } from '@nestjs/common';
import {
  X12Interchange,
  X12FunctionalGroup,
  X12TransactionSet,
  X12Segment,
  X12Delimiters,
  X12GenerationOptions,
  X12Version,
  ISASegment,
  IEASegment,
  GSSegment,
  GESegment,
  STSegment,
  SESegment,
  DEFAULT_X12_DELIMITERS,
} from '../interfaces';

/**
 * X12 Generator Service
 *
 * Generates X12 EDI documents from structured objects.
 */
@Injectable()
export class X12GeneratorService {
  /**
   * Generate X12 document from interchange
   */
  generate(interchange: X12Interchange, options?: X12GenerationOptions): string {
    const delimiters = this.mergeDelimiters(interchange.delimiters, options?.delimiters);
    const lineBreak = options?.lineBreaks ? '\n' : '';

    const segments: string[] = [];

    // ISA segment
    segments.push(this.generateISASegment(interchange.header, delimiters));

    // Functional groups
    for (const group of interchange.functionalGroups) {
      segments.push(this.generateGSSegment(group.header, delimiters));

      // Transaction sets
      for (const transactionSet of group.transactionSets) {
        segments.push(this.generateSTSegment(transactionSet.header, delimiters));

        // Body segments
        for (const segment of transactionSet.segments) {
          segments.push(this.generateSegment(segment, delimiters));
        }

        segments.push(this.generateSESegment(transactionSet.trailer, delimiters));
      }

      segments.push(this.generateGESegment(group.trailer, delimiters));
    }

    // IEA segment
    segments.push(this.generateIEASegment(interchange.trailer, delimiters));

    return segments.join(lineBreak);
  }

  /**
   * Generate ISA segment
   */
  generateISASegment(isa: ISASegment, delimiters: X12Delimiters): string {
    const { elementSeparator: sep, segmentTerminator: term } = delimiters;

    // ISA has fixed-width fields
    const elements = [
      'ISA',
      this.padRight(isa.authorizationQualifier, 2),
      this.padRight(isa.authorizationInfo, 10),
      this.padRight(isa.securityQualifier, 2),
      this.padRight(isa.securityInfo, 10),
      this.padRight(isa.senderIdQualifier, 2),
      this.padRight(isa.senderId, 15),
      this.padRight(isa.receiverIdQualifier, 2),
      this.padRight(isa.receiverId, 15),
      isa.interchangeDate,
      isa.interchangeTime,
      isa.repetitionSeparator,
      isa.versionNumber,
      this.padLeft(isa.controlNumber, 9, '0'),
      isa.acknowledgmentRequested,
      isa.usageIndicator,
      isa.componentSeparator,
    ];

    return elements.join(sep) + term;
  }

  /**
   * Generate IEA segment
   */
  generateIEASegment(iea: IEASegment, delimiters: X12Delimiters): string {
    const { elementSeparator: sep, segmentTerminator: term } = delimiters;

    const elements = [
      'IEA',
      iea.numberOfGroups.toString(),
      this.padLeft(iea.controlNumber, 9, '0'),
    ];

    return elements.join(sep) + term;
  }

  /**
   * Generate GS segment
   */
  generateGSSegment(gs: GSSegment, delimiters: X12Delimiters): string {
    const { elementSeparator: sep, segmentTerminator: term } = delimiters;

    const elements = [
      'GS',
      gs.functionalCode,
      gs.senderCode,
      gs.receiverCode,
      gs.date,
      gs.time,
      gs.controlNumber,
      gs.agencyCode,
      gs.versionCode,
    ];

    return elements.join(sep) + term;
  }

  /**
   * Generate GE segment
   */
  generateGESegment(ge: GESegment, delimiters: X12Delimiters): string {
    const { elementSeparator: sep, segmentTerminator: term } = delimiters;

    const elements = ['GE', ge.numberOfTransactionSets.toString(), ge.controlNumber];

    return elements.join(sep) + term;
  }

  /**
   * Generate ST segment
   */
  generateSTSegment(st: STSegment, delimiters: X12Delimiters): string {
    const { elementSeparator: sep, segmentTerminator: term } = delimiters;

    const elements = ['ST', st.transactionSetCode, this.padLeft(st.controlNumber, 4, '0')];

    if (st.implementationReference) {
      elements.push(st.implementationReference);
    }

    return elements.join(sep) + term;
  }

  /**
   * Generate SE segment
   */
  generateSESegment(se: SESegment, delimiters: X12Delimiters): string {
    const { elementSeparator: sep, segmentTerminator: term } = delimiters;

    const elements = ['SE', se.numberOfSegments.toString(), this.padLeft(se.controlNumber, 4, '0')];

    return elements.join(sep) + term;
  }

  /**
   * Generate generic segment
   */
  generateSegment(segment: X12Segment, delimiters: X12Delimiters): string {
    const { elementSeparator, subelementSeparator, repetitionSeparator, segmentTerminator } =
      delimiters;

    const parts = [segment.segmentId];

    for (const element of segment.elements) {
      let value = element.value;

      // Add subelements
      if (element.subelements && element.subelements.length > 1) {
        value = element.subelements.join(subelementSeparator);
      }

      // Add repetitions
      if (element.repetitions && element.repetitions.length > 0) {
        value = [value, ...element.repetitions].join(repetitionSeparator);
      }

      parts.push(value);
    }

    // Remove trailing empty elements
    while (parts.length > 1 && parts[parts.length - 1] === '') {
      parts.pop();
    }

    return parts.join(elementSeparator) + segmentTerminator;
  }

  /**
   * Create ISA segment with defaults
   */
  createISASegment(
    senderId: string,
    receiverId: string,
    controlNumber: string,
    options?: {
      senderIdQualifier?: string;
      receiverIdQualifier?: string;
      version?: X12Version;
      usageIndicator?: 'P' | 'T';
      acknowledgmentRequested?: boolean;
      delimiters?: Partial<X12Delimiters>;
    },
  ): ISASegment {
    const now = new Date();
    const delimiters = { ...DEFAULT_X12_DELIMITERS, ...options?.delimiters };

    return {
      segmentId: 'ISA',
      authorizationQualifier: '00',
      authorizationInfo: '          ',
      securityQualifier: '00',
      securityInfo: '          ',
      senderIdQualifier: options?.senderIdQualifier || 'ZZ',
      senderId: senderId.padEnd(15),
      receiverIdQualifier: options?.receiverIdQualifier || 'ZZ',
      receiverId: receiverId.padEnd(15),
      interchangeDate: this.formatDate(now, 'YYMMDD'),
      interchangeTime: this.formatTime(now, 'HHMM'),
      repetitionSeparator: options?.version === '005010' ? delimiters.repetitionSeparator : 'U',
      versionNumber: options?.version || '005010',
      controlNumber: controlNumber.padStart(9, '0'),
      acknowledgmentRequested: options?.acknowledgmentRequested ? '1' : '0',
      usageIndicator: options?.usageIndicator || 'T',
      componentSeparator: delimiters.subelementSeparator,
    };
  }

  /**
   * Create IEA segment
   */
  createIEASegment(numberOfGroups: number, controlNumber: string): IEASegment {
    return {
      segmentId: 'IEA',
      numberOfGroups,
      controlNumber: controlNumber.padStart(9, '0'),
    };
  }

  /**
   * Create GS segment
   */
  createGSSegment(
    functionalCode: string,
    senderCode: string,
    receiverCode: string,
    controlNumber: string,
    versionCode?: string,
  ): GSSegment {
    const now = new Date();

    return {
      segmentId: 'GS',
      functionalCode,
      senderCode,
      receiverCode,
      date: this.formatDate(now, 'CCYYMMDD'),
      time: this.formatTime(now, 'HHMM'),
      controlNumber,
      agencyCode: 'X',
      versionCode: versionCode || '005010X220A1',
    };
  }

  /**
   * Create GE segment
   */
  createGESegment(numberOfTransactionSets: number, controlNumber: string): GESegment {
    return {
      segmentId: 'GE',
      numberOfTransactionSets,
      controlNumber,
    };
  }

  /**
   * Create ST segment
   */
  createSTSegment(
    transactionSetCode: string,
    controlNumber: string,
    implementationReference?: string,
  ): STSegment {
    return {
      segmentId: 'ST',
      transactionSetCode,
      controlNumber: controlNumber.padStart(4, '0'),
      implementationReference,
    };
  }

  /**
   * Create SE segment
   */
  createSESegment(numberOfSegments: number, controlNumber: string): SESegment {
    return {
      segmentId: 'SE',
      numberOfSegments,
      controlNumber: controlNumber.padStart(4, '0'),
    };
  }

  /**
   * Build complete interchange from transaction sets
   */
  buildInterchange(
    transactionSets: X12TransactionSet[],
    senderConfig: {
      senderId: string;
      senderIdQualifier?: string;
      senderCode: string;
    },
    receiverConfig: {
      receiverId: string;
      receiverIdQualifier?: string;
      receiverCode: string;
    },
    options?: {
      controlNumber?: string;
      version?: X12Version;
      usageIndicator?: 'P' | 'T';
      delimiters?: Partial<X12Delimiters>;
    },
  ): X12Interchange {
    const controlNumber = options?.controlNumber || this.generateControlNumber();
    const delimiters = { ...DEFAULT_X12_DELIMITERS, ...options?.delimiters };

    // Group transaction sets by functional code
    const groupedSets = this.groupTransactionSets(transactionSets);

    const functionalGroups: X12FunctionalGroup[] = [];
    let groupControlNumber = 1;

    for (const [functionalCode, sets] of Object.entries(groupedSets)) {
      const gsControlNumber = groupControlNumber.toString().padStart(4, '0');

      functionalGroups.push({
        header: this.createGSSegment(
          functionalCode,
          senderConfig.senderCode,
          receiverConfig.receiverCode,
          gsControlNumber,
        ),
        transactionSets: sets,
        trailer: this.createGESegment(sets.length, gsControlNumber),
      });

      groupControlNumber++;
    }

    return {
      header: this.createISASegment(
        senderConfig.senderId,
        receiverConfig.receiverId,
        controlNumber,
        {
          senderIdQualifier: senderConfig.senderIdQualifier,
          receiverIdQualifier: receiverConfig.receiverIdQualifier,
          version: options?.version,
          usageIndicator: options?.usageIndicator,
          delimiters: options?.delimiters,
        },
      ),
      functionalGroups,
      trailer: this.createIEASegment(functionalGroups.length, controlNumber),
      delimiters,
    };
  }

  /**
   * Group transaction sets by functional identifier code
   */
  private groupTransactionSets(
    transactionSets: X12TransactionSet[],
  ): Record<string, X12TransactionSet[]> {
    const groups: Record<string, X12TransactionSet[]> = {};

    for (const set of transactionSets) {
      const functionalCode = this.getFunctionalCode(set.header.transactionSetCode);
      if (!groups[functionalCode]) {
        groups[functionalCode] = [];
      }
      groups[functionalCode].push(set);
    }

    return groups;
  }

  /**
   * Get functional identifier code for transaction set
   */
  private getFunctionalCode(transactionSetCode: string): string {
    const mapping: Record<string, string> = {
      '850': 'PO', // Purchase Order
      '855': 'PR', // Purchase Order Acknowledgment
      '856': 'SH', // Ship Notice/Manifest
      '810': 'IN', // Invoice
      '997': 'FA', // Functional Acknowledgment
    };
    return mapping[transactionSetCode] || 'XX';
  }

  /**
   * Generate unique control number
   */
  generateControlNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return ((timestamp % 100000000) * 1000 + random).toString().padStart(9, '0');
  }

  /**
   * Format date
   */
  private formatDate(date: Date, format: 'YYMMDD' | 'CCYYMMDD'): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    if (format === 'YYMMDD') {
      return year.toString().slice(-2) + month + day;
    }
    return year.toString() + month + day;
  }

  /**
   * Format time
   */
  private formatTime(date: Date, format: 'HHMM' | 'HHMMSS'): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    if (format === 'HHMM') {
      return hours + minutes;
    }
    return hours + minutes + seconds;
  }

  /**
   * Merge delimiters with defaults
   */
  private mergeDelimiters(
    base?: Partial<X12Delimiters>,
    override?: Partial<X12Delimiters>,
  ): X12Delimiters {
    return {
      ...DEFAULT_X12_DELIMITERS,
      ...base,
      ...override,
    };
  }

  /**
   * Pad string on the right
   */
  private padRight(str: string, length: number, char: string = ' '): string {
    return str.padEnd(length, char).slice(0, length);
  }

  /**
   * Pad string on the left
   */
  private padLeft(str: string, length: number, char: string = ' '): string {
    return str.padStart(length, char).slice(-length);
  }
}
