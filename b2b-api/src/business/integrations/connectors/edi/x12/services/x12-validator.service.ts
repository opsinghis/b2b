import { Injectable } from '@nestjs/common';
import { X12Interchange, X12TransactionSet, X12Segment, X12ValidationError } from '../interfaces';

/**
 * Segment validation rules
 */
interface SegmentRule {
  id: string;
  required: boolean;
  maxOccurs?: number;
  elements?: ElementRule[];
}

/**
 * Element validation rules
 */
interface ElementRule {
  position: number;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  type?: 'AN' | 'N' | 'DT' | 'TM' | 'ID';
  validValues?: string[];
}

/**
 * X12 Validator Service
 *
 * Validates X12 segments and transaction sets according to rules.
 */
@Injectable()
export class X12ValidatorService {
  /**
   * Validate complete interchange
   */
  validateInterchange(interchange: X12Interchange): X12ValidationError[] {
    const errors: X12ValidationError[] = [];

    // Validate ISA
    errors.push(...this.validateISASegment(interchange));

    // Validate functional groups
    for (let i = 0; i < interchange.functionalGroups.length; i++) {
      const group = interchange.functionalGroups[i];

      // Validate GS
      errors.push(...this.validateGSSegment(group.header, i));

      // Validate transaction sets
      for (let j = 0; j < group.transactionSets.length; j++) {
        errors.push(...this.validateTransactionSet(group.transactionSets[j], i, j));
      }

      // Validate GE
      errors.push(...this.validateGESegment(group.trailer, group.transactionSets.length, i));
    }

    // Validate IEA
    errors.push(
      ...this.validateIEASegment(
        interchange.trailer,
        interchange.functionalGroups.length,
        interchange.header.controlNumber,
      ),
    );

    return errors;
  }

  /**
   * Validate ISA segment
   */
  private validateISASegment(interchange: X12Interchange): X12ValidationError[] {
    const errors: X12ValidationError[] = [];
    const isa = interchange.header;

    // Validate authorization qualifier
    if (!['00', '01', '02', '03', '04', '05', '06'].includes(isa.authorizationQualifier)) {
      errors.push({
        code: 'ISA01_INVALID',
        message: `Invalid authorization qualifier: ${isa.authorizationQualifier}`,
        segmentId: 'ISA',
        elementIndex: 1,
        severity: 'error',
      });
    }

    // Validate security qualifier
    if (!['00', '01'].includes(isa.securityQualifier)) {
      errors.push({
        code: 'ISA03_INVALID',
        message: `Invalid security qualifier: ${isa.securityQualifier}`,
        segmentId: 'ISA',
        elementIndex: 3,
        severity: 'error',
      });
    }

    // Validate sender ID qualifier
    if (!this.isValidIdQualifier(isa.senderIdQualifier)) {
      errors.push({
        code: 'ISA05_INVALID',
        message: `Invalid sender ID qualifier: ${isa.senderIdQualifier}`,
        segmentId: 'ISA',
        elementIndex: 5,
        severity: 'error',
      });
    }

    // Validate receiver ID qualifier
    if (!this.isValidIdQualifier(isa.receiverIdQualifier)) {
      errors.push({
        code: 'ISA07_INVALID',
        message: `Invalid receiver ID qualifier: ${isa.receiverIdQualifier}`,
        segmentId: 'ISA',
        elementIndex: 7,
        severity: 'error',
      });
    }

    // Validate date format
    if (!/^\d{6}$/.test(isa.interchangeDate)) {
      errors.push({
        code: 'ISA09_INVALID',
        message: `Invalid interchange date format: ${isa.interchangeDate}`,
        segmentId: 'ISA',
        elementIndex: 9,
        severity: 'error',
      });
    }

    // Validate time format
    if (!/^\d{4}$/.test(isa.interchangeTime)) {
      errors.push({
        code: 'ISA10_INVALID',
        message: `Invalid interchange time format: ${isa.interchangeTime}`,
        segmentId: 'ISA',
        elementIndex: 10,
        severity: 'error',
      });
    }

    // Validate version
    if (!['004010', '005010'].includes(isa.versionNumber)) {
      errors.push({
        code: 'ISA12_INVALID',
        message: `Invalid or unsupported version: ${isa.versionNumber}`,
        segmentId: 'ISA',
        elementIndex: 12,
        severity: 'error',
      });
    }

    // Validate control number
    if (!/^\d{9}$/.test(isa.controlNumber)) {
      errors.push({
        code: 'ISA13_INVALID',
        message: `Control number must be 9 digits: ${isa.controlNumber}`,
        segmentId: 'ISA',
        elementIndex: 13,
        severity: 'error',
      });
    }

    // Validate acknowledgment requested
    if (!['0', '1'].includes(isa.acknowledgmentRequested)) {
      errors.push({
        code: 'ISA14_INVALID',
        message: `Invalid acknowledgment requested value: ${isa.acknowledgmentRequested}`,
        segmentId: 'ISA',
        elementIndex: 14,
        severity: 'error',
      });
    }

    // Validate usage indicator
    if (!['P', 'T', 'I'].includes(isa.usageIndicator)) {
      errors.push({
        code: 'ISA15_INVALID',
        message: `Invalid usage indicator: ${isa.usageIndicator}`,
        segmentId: 'ISA',
        elementIndex: 15,
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate GS segment
   */
  private validateGSSegment(gs: any, groupIndex: number): X12ValidationError[] {
    const errors: X12ValidationError[] = [];

    // Validate functional identifier code
    const validFunctionalCodes = [
      'AA',
      'AB',
      'AD',
      'AF',
      'AG',
      'AH',
      'AI',
      'AK',
      'AL',
      'AM',
      'AN',
      'AO',
      'AP',
      'AQ',
      'AR',
      'AS',
      'AT',
      'AU',
      'AV',
      'AW',
      'AX',
      'AY',
      'AZ',
      'BA',
      'BB',
      'BC',
      'BD',
      'BE',
      'BF',
      'BG',
      'BH',
      'BI',
      'BJ',
      'BK',
      'BL',
      'BM',
      'BN',
      'BO',
      'BP',
      'BQ',
      'BR',
      'BS',
      'BT',
      'BU',
      'BV',
      'BW',
      'BX',
      'BY',
      'BZ',
      'CA',
      'CB',
      'CC',
      'CD',
      'CE',
      'CF',
      'CG',
      'CH',
      'CI',
      'CJ',
      'CK',
      'CL',
      'CM',
      'CN',
      'CO',
      'CP',
      'FA',
      'GC',
      'GE',
      'GP',
      'GR',
      'GT',
      'HB',
      'HC',
      'HI',
      'HN',
      'HP',
      'HS',
      'IA',
      'IB',
      'IC',
      'ID',
      'IE',
      'IF',
      'IG',
      'IH',
      'II',
      'IJ',
      'IM',
      'IN',
      'IO',
      'IP',
      'IR',
      'IS',
      'JB',
      'KM',
      'LA',
      'LB',
      'LI',
      'LN',
      'LR',
      'ME',
      'MF',
      'MG',
      'MH',
      'MI',
      'MJ',
      'MK',
      'MM',
      'MN',
      'MO',
      'MP',
      'MQ',
      'MR',
      'MS',
      'MT',
      'MV',
      'MW',
      'NC',
      'NL',
      'NP',
      'OG',
      'OR',
      'PD',
      'PE',
      'PF',
      'PG',
      'PH',
      'PI',
      'PK',
      'PL',
      'PN',
      'PO',
      'PP',
      'PR',
      'PS',
      'PT',
      'PU',
      'PV',
      'PY',
      'QG',
      'RA',
      'RB',
      'RC',
      'RD',
      'RE',
      'RF',
      'RG',
      'RH',
      'RI',
      'RJ',
      'RK',
      'RL',
      'RM',
      'RN',
      'RO',
      'RP',
      'RQ',
      'RR',
      'RS',
      'RT',
      'RU',
      'RV',
      'RW',
      'RX',
      'RY',
      'RZ',
      'SA',
      'SB',
      'SC',
      'SD',
      'SE',
      'SH',
      'SI',
      'SJ',
      'SL',
      'SM',
      'SN',
      'SO',
      'SP',
      'SQ',
      'SR',
      'SS',
      'ST',
      'SU',
      'SV',
      'SW',
      'TA',
      'TC',
      'TD',
      'TF',
      'TI',
      'TM',
      'TN',
      'TO',
      'TP',
      'TR',
      'TS',
      'TT',
      'TU',
      'TX',
      'UA',
      'UB',
      'UC',
      'UD',
      'UI',
      'UP',
      'UW',
      'VA',
      'VB',
      'VC',
      'VD',
      'VE',
      'VH',
      'VI',
      'VS',
      'WA',
      'WB',
      'WG',
      'WI',
      'WL',
      'WR',
      'WT',
      'XX',
    ];

    if (!validFunctionalCodes.includes(gs.functionalCode)) {
      errors.push({
        code: 'GS01_INVALID',
        message: `Invalid functional identifier code: ${gs.functionalCode}`,
        segmentId: 'GS',
        elementIndex: 1,
        severity: 'warning',
        path: `functionalGroups[${groupIndex}]`,
      });
    }

    // Validate date format (CCYYMMDD)
    if (!/^\d{8}$/.test(gs.date)) {
      errors.push({
        code: 'GS04_INVALID',
        message: `Invalid date format (expected CCYYMMDD): ${gs.date}`,
        segmentId: 'GS',
        elementIndex: 4,
        severity: 'error',
        path: `functionalGroups[${groupIndex}]`,
      });
    }

    // Validate time format (HHMM or HHMMSS or HHMMSSD)
    if (!/^\d{4,8}$/.test(gs.time)) {
      errors.push({
        code: 'GS05_INVALID',
        message: `Invalid time format: ${gs.time}`,
        segmentId: 'GS',
        elementIndex: 5,
        severity: 'error',
        path: `functionalGroups[${groupIndex}]`,
      });
    }

    // Validate agency code
    if (!['T', 'X'].includes(gs.agencyCode)) {
      errors.push({
        code: 'GS07_INVALID',
        message: `Invalid responsible agency code: ${gs.agencyCode}`,
        segmentId: 'GS',
        elementIndex: 7,
        severity: 'warning',
        path: `functionalGroups[${groupIndex}]`,
      });
    }

    return errors;
  }

  /**
   * Validate GE segment
   */
  private validateGESegment(
    ge: any,
    expectedSetCount: number,
    groupIndex: number,
  ): X12ValidationError[] {
    const errors: X12ValidationError[] = [];

    if (ge.numberOfTransactionSets !== expectedSetCount) {
      errors.push({
        code: 'GE01_MISMATCH',
        message: `GE01 count (${ge.numberOfTransactionSets}) doesn't match actual transaction sets (${expectedSetCount})`,
        segmentId: 'GE',
        elementIndex: 1,
        severity: 'warning',
        path: `functionalGroups[${groupIndex}]`,
      });
    }

    return errors;
  }

  /**
   * Validate IEA segment
   */
  private validateIEASegment(
    iea: any,
    expectedGroupCount: number,
    isaControlNumber: string,
  ): X12ValidationError[] {
    const errors: X12ValidationError[] = [];

    if (iea.numberOfGroups !== expectedGroupCount) {
      errors.push({
        code: 'IEA01_MISMATCH',
        message: `IEA01 count (${iea.numberOfGroups}) doesn't match actual groups (${expectedGroupCount})`,
        segmentId: 'IEA',
        elementIndex: 1,
        severity: 'warning',
      });
    }

    if (iea.controlNumber.trim() !== isaControlNumber.trim()) {
      errors.push({
        code: 'IEA02_MISMATCH',
        message: `IEA02 control number (${iea.controlNumber}) doesn't match ISA13 (${isaControlNumber})`,
        segmentId: 'IEA',
        elementIndex: 2,
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate transaction set structure
   */
  validateTransactionSet(
    transactionSet: X12TransactionSet,
    groupIndex: number,
    setIndex: number,
  ): X12ValidationError[] {
    const errors: X12ValidationError[] = [];
    const path = `functionalGroups[${groupIndex}].transactionSets[${setIndex}]`;

    // Get rules for this transaction set type
    const rules = this.getTransactionSetRules(transactionSet.header.transactionSetCode);

    if (!rules) {
      // No specific rules defined, just validate basic structure
      return errors;
    }

    // Track segment occurrences
    const segmentCounts: Record<string, number> = {};
    for (const segment of transactionSet.segments) {
      segmentCounts[segment.segmentId] = (segmentCounts[segment.segmentId] || 0) + 1;
    }

    // Check required segments
    for (const rule of rules) {
      const count = segmentCounts[rule.id] || 0;

      if (rule.required && count === 0) {
        errors.push({
          code: 'MISSING_REQUIRED_SEGMENT',
          message: `Required segment ${rule.id} is missing`,
          segmentId: rule.id,
          severity: 'error',
          path,
        });
      }

      if (rule.maxOccurs && count > rule.maxOccurs) {
        errors.push({
          code: 'TOO_MANY_SEGMENTS',
          message: `Segment ${rule.id} appears ${count} times, max allowed is ${rule.maxOccurs}`,
          segmentId: rule.id,
          severity: 'error',
          path,
        });
      }
    }

    // Validate elements within each segment
    for (const segment of transactionSet.segments) {
      const segmentRule = rules.find((r) => r.id === segment.segmentId);
      if (segmentRule?.elements) {
        errors.push(...this.validateSegmentElements(segment, segmentRule.elements, path));
      }
    }

    return errors;
  }

  /**
   * Validate segment elements
   */
  private validateSegmentElements(
    segment: X12Segment,
    elementRules: ElementRule[],
    path: string,
  ): X12ValidationError[] {
    const errors: X12ValidationError[] = [];

    for (const rule of elementRules) {
      const element = segment.elements[rule.position - 1];
      const value = element?.value || '';

      // Check required
      if (rule.required && (!value || value.trim() === '')) {
        errors.push({
          code: 'MISSING_REQUIRED_ELEMENT',
          message: `Required element ${segment.segmentId}${rule.position.toString().padStart(2, '0')} is missing`,
          segmentId: segment.segmentId,
          elementIndex: rule.position,
          severity: 'error',
          path,
        });
        continue;
      }

      if (!value) continue;

      // Check min length
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          code: 'ELEMENT_TOO_SHORT',
          message: `Element ${segment.segmentId}${rule.position.toString().padStart(2, '0')} is too short (min: ${rule.minLength})`,
          segmentId: segment.segmentId,
          elementIndex: rule.position,
          severity: 'error',
          path,
        });
      }

      // Check max length
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({
          code: 'ELEMENT_TOO_LONG',
          message: `Element ${segment.segmentId}${rule.position.toString().padStart(2, '0')} is too long (max: ${rule.maxLength})`,
          segmentId: segment.segmentId,
          elementIndex: rule.position,
          severity: 'error',
          path,
        });
      }

      // Check type
      if (rule.type) {
        const typeError = this.validateElementType(value, rule.type);
        if (typeError) {
          errors.push({
            code: 'INVALID_ELEMENT_TYPE',
            message: `Element ${segment.segmentId}${rule.position.toString().padStart(2, '0')}: ${typeError}`,
            segmentId: segment.segmentId,
            elementIndex: rule.position,
            severity: 'error',
            path,
          });
        }
      }

      // Check valid values
      if (rule.validValues && !rule.validValues.includes(value)) {
        errors.push({
          code: 'INVALID_ELEMENT_VALUE',
          message: `Element ${segment.segmentId}${rule.position.toString().padStart(2, '0')} has invalid value: ${value}`,
          segmentId: segment.segmentId,
          elementIndex: rule.position,
          severity: 'error',
          path,
        });
      }
    }

    return errors;
  }

  /**
   * Validate element type
   */
  private validateElementType(value: string, type: string): string | null {
    switch (type) {
      case 'N': // Numeric
        if (!/^-?\d+\.?\d*$/.test(value)) {
          return 'Expected numeric value';
        }
        break;
      case 'DT': // Date
        if (!/^\d{6}$|^\d{8}$/.test(value)) {
          return 'Expected date format (YYMMDD or CCYYMMDD)';
        }
        break;
      case 'TM': // Time
        if (!/^\d{4}$|^\d{6}$|^\d{8}$/.test(value)) {
          return 'Expected time format (HHMM, HHMMSS, or HHMMSSDD)';
        }
        break;
      case 'AN': // Alphanumeric - accept anything
      case 'ID': // Identifier - accept anything
        break;
    }
    return null;
  }

  /**
   * Check if ID qualifier is valid
   */
  private isValidIdQualifier(qualifier: string): boolean {
    const validQualifiers = [
      '01',
      '02',
      '03',
      '04',
      '07',
      '08',
      '09',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
      '23',
      '24',
      '25',
      '26',
      '27',
      '28',
      '29',
      '30',
      '31',
      '32',
      '33',
      '34',
      '35',
      '36',
      '37',
      '38',
      'AM',
      'NR',
      'SA',
      'SN',
      'ZZ',
    ];
    return validQualifiers.includes(qualifier);
  }

  /**
   * Get validation rules for transaction set type
   */
  private getTransactionSetRules(transactionSetCode: string): SegmentRule[] | null {
    // Basic rules for supported transaction sets
    const rules: Record<string, SegmentRule[]> = {
      '850': [
        { id: 'BEG', required: true, maxOccurs: 1 },
        { id: 'CUR', required: false, maxOccurs: 1 },
        { id: 'REF', required: false },
        { id: 'PER', required: false },
        { id: 'DTM', required: false },
        { id: 'TD5', required: false },
        { id: 'N1', required: false },
        { id: 'N3', required: false },
        { id: 'N4', required: false },
        { id: 'PO1', required: true },
        { id: 'PID', required: false },
        { id: 'CTT', required: false, maxOccurs: 1 },
      ],
      '855': [
        { id: 'BAK', required: true, maxOccurs: 1 },
        { id: 'CUR', required: false, maxOccurs: 1 },
        { id: 'REF', required: false },
        { id: 'PER', required: false },
        { id: 'DTM', required: false },
        { id: 'N1', required: false },
        { id: 'PO1', required: false },
        { id: 'ACK', required: false },
        { id: 'CTT', required: false, maxOccurs: 1 },
      ],
      '856': [
        { id: 'BSN', required: true, maxOccurs: 1 },
        { id: 'DTM', required: false },
        { id: 'HL', required: true },
        { id: 'TD1', required: false },
        { id: 'TD5', required: false },
        { id: 'REF', required: false },
        { id: 'N1', required: false },
        { id: 'LIN', required: false },
        { id: 'SN1', required: false },
        { id: 'CTT', required: false, maxOccurs: 1 },
      ],
      '810': [
        { id: 'BIG', required: true, maxOccurs: 1 },
        { id: 'CUR', required: false, maxOccurs: 1 },
        { id: 'REF', required: false },
        { id: 'N1', required: false },
        { id: 'N3', required: false },
        { id: 'N4', required: false },
        { id: 'ITD', required: false },
        { id: 'DTM', required: false },
        { id: 'IT1', required: true },
        { id: 'PID', required: false },
        { id: 'TXI', required: false },
        { id: 'TDS', required: true, maxOccurs: 1 },
        { id: 'CAD', required: false },
        { id: 'ISS', required: false },
        { id: 'CTT', required: false, maxOccurs: 1 },
      ],
      '997': [
        { id: 'AK1', required: true, maxOccurs: 1 },
        { id: 'AK2', required: false },
        { id: 'AK3', required: false },
        { id: 'AK4', required: false },
        { id: 'AK5', required: true },
        { id: 'AK9', required: true, maxOccurs: 1 },
      ],
    };

    return rules[transactionSetCode] || null;
  }
}
