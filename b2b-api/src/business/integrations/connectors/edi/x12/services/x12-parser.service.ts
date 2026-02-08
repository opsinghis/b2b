import { Injectable } from '@nestjs/common';
import { X12LexerService } from './x12-lexer.service';
import {
  X12Interchange,
  X12FunctionalGroup,
  X12TransactionSet,
  X12Segment,
  X12Element,
  X12ParseResult,
  X12ParseError,
  X12Delimiters,
  X12Version,
  ISASegment,
  IEASegment,
  GSSegment,
  GESegment,
  STSegment,
  SESegment,
  ParsePosition,
} from '../interfaces';

/**
 * X12 Parser Service
 *
 * Parses X12 EDI documents into structured objects.
 * Handles ISA/GS/ST envelopes and validates structure.
 */
@Injectable()
export class X12ParserService {
  constructor(private readonly lexer: X12LexerService) {}

  /**
   * Parse X12 document from string
   */
  parse(input: string): X12ParseResult {
    const errors: X12ParseError[] = [];
    const warnings: X12ParseError[] = [];

    if (!input || input.trim().length === 0) {
      errors.push({
        code: 'EMPTY_INPUT',
        message: 'Input is empty',
        position: { line: 1, column: 1, offset: 0 },
        severity: 'error',
      });
      return { success: false, errors, warnings };
    }

    // Extract delimiters
    const delimResult = this.lexer.extractDelimiters(input);
    if (delimResult.errors.length > 0) {
      return {
        success: false,
        errors: delimResult.errors,
        warnings,
      };
    }

    const delimiters: X12Delimiters = {
      elementSeparator: delimResult.elementSeparator,
      subelementSeparator: delimResult.subelementSeparator,
      repetitionSeparator: delimResult.repetitionSeparator,
      segmentTerminator: delimResult.segmentTerminator,
    };

    // Split into segments
    const segments = this.splitIntoSegments(input, delimiters);
    if (segments.length === 0) {
      errors.push({
        code: 'NO_SEGMENTS',
        message: 'No segments found in input',
        position: { line: 1, column: 1, offset: 0 },
        severity: 'error',
      });
      return { success: false, errors, warnings };
    }

    // Parse ISA segment
    const isaResult = this.parseISASegment(segments[0], delimiters);
    if (isaResult.errors.length > 0) {
      errors.push(...isaResult.errors);
      return { success: false, errors, warnings };
    }

    const isaSegment = isaResult.segment!;

    // Find IEA segment
    const ieaIndex = segments.findIndex((s) => s.startsWith('IEA'));
    if (ieaIndex === -1) {
      errors.push({
        code: 'MISSING_IEA',
        message: 'IEA trailer segment not found',
        position: { line: 1, column: 1, offset: input.length },
        severity: 'error',
      });
      return { success: false, errors, warnings };
    }

    const ieaResult = this.parseIEASegment(
      segments[ieaIndex],
      delimiters,
      isaSegment.controlNumber,
    );
    if (ieaResult.errors.length > 0) {
      errors.push(...ieaResult.errors);
    }
    warnings.push(...ieaResult.warnings);

    const ieaSegment = ieaResult.segment!;

    // Parse functional groups
    const functionalGroupsResult = this.parseFunctionalGroups(
      segments.slice(1, ieaIndex),
      delimiters,
    );

    errors.push(...functionalGroupsResult.errors);
    warnings.push(...functionalGroupsResult.warnings);

    // Validate functional group count
    if (ieaSegment && functionalGroupsResult.groups.length !== ieaSegment.numberOfGroups) {
      warnings.push({
        code: 'GROUP_COUNT_MISMATCH',
        message: `IEA01 says ${ieaSegment.numberOfGroups} groups, but found ${functionalGroupsResult.groups.length}`,
        position: { line: 1, column: 1, offset: 0 },
        severity: 'warning',
      });
    }

    const interchange: X12Interchange = {
      header: isaSegment,
      functionalGroups: functionalGroupsResult.groups,
      trailer: ieaSegment,
      delimiters,
    };

    return {
      success: errors.length === 0,
      interchange,
      errors,
      warnings,
    };
  }

  /**
   * Split input into segments
   */
  private splitIntoSegments(input: string, delimiters: X12Delimiters): string[] {
    // Remove line breaks
    const normalized = input.replace(/\r\n/g, '\n').replace(/\n/g, '');

    // Split by segment terminator
    return normalized
      .split(delimiters.segmentTerminator)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Parse ISA segment
   */
  private parseISASegment(
    segment: string,
    delimiters: X12Delimiters,
  ): { segment?: ISASegment; errors: X12ParseError[] } {
    const errors: X12ParseError[] = [];
    const elements = segment.split(delimiters.elementSeparator);

    if (elements[0] !== 'ISA') {
      errors.push({
        code: 'INVALID_ISA',
        message: `Expected ISA segment, found: ${elements[0]}`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'ISA',
        severity: 'error',
      });
      return { errors };
    }

    if (elements.length < 17) {
      errors.push({
        code: 'ISA_ELEMENT_COUNT',
        message: `ISA segment requires 16 elements, found ${elements.length - 1}`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'ISA',
        severity: 'error',
      });
      return { errors };
    }

    // Extract ISA16 (may contain segment terminator appended)
    let isa16 = elements[16];
    if (isa16.length > 1) {
      isa16 = isa16[0];
    }

    const isaSegment: ISASegment = {
      segmentId: 'ISA',
      authorizationQualifier: elements[1].trim(),
      authorizationInfo: elements[2],
      securityQualifier: elements[3].trim(),
      securityInfo: elements[4],
      senderIdQualifier: elements[5].trim(),
      senderId: elements[6],
      receiverIdQualifier: elements[7].trim(),
      receiverId: elements[8],
      interchangeDate: elements[9],
      interchangeTime: elements[10],
      repetitionSeparator: elements[11],
      versionNumber: elements[12] as X12Version,
      controlNumber: elements[13],
      acknowledgmentRequested: elements[14] as '0' | '1',
      usageIndicator: elements[15] as 'P' | 'T',
      componentSeparator: isa16,
    };

    // Validate version
    if (!['004010', '005010'].includes(isaSegment.versionNumber)) {
      errors.push({
        code: 'UNSUPPORTED_VERSION',
        message: `Unsupported X12 version: ${isaSegment.versionNumber}. Supported: 004010, 005010`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'ISA',
        elementIndex: 12,
        severity: 'error',
      });
    }

    return { segment: isaSegment, errors };
  }

  /**
   * Parse IEA segment
   */
  private parseIEASegment(
    segment: string,
    delimiters: X12Delimiters,
    isaControlNumber: string,
  ): { segment?: IEASegment; errors: X12ParseError[]; warnings: X12ParseError[] } {
    const errors: X12ParseError[] = [];
    const warnings: X12ParseError[] = [];
    const elements = segment.split(delimiters.elementSeparator);

    if (elements[0] !== 'IEA') {
      errors.push({
        code: 'INVALID_IEA',
        message: `Expected IEA segment, found: ${elements[0]}`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'IEA',
        severity: 'error',
      });
      return { errors, warnings };
    }

    if (elements.length < 3) {
      errors.push({
        code: 'IEA_ELEMENT_COUNT',
        message: `IEA segment requires 2 elements, found ${elements.length - 1}`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'IEA',
        severity: 'error',
      });
      return { errors, warnings };
    }

    const ieaSegment: IEASegment = {
      segmentId: 'IEA',
      numberOfGroups: parseInt(elements[1], 10),
      controlNumber: elements[2],
    };

    // Validate control number matches ISA
    if (ieaSegment.controlNumber.trim() !== isaControlNumber.trim()) {
      warnings.push({
        code: 'CONTROL_NUMBER_MISMATCH',
        message: `IEA control number (${ieaSegment.controlNumber}) does not match ISA control number (${isaControlNumber})`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'IEA',
        severity: 'warning',
      });
    }

    return { segment: ieaSegment, errors, warnings };
  }

  /**
   * Parse functional groups (GS/GE pairs)
   */
  private parseFunctionalGroups(
    segments: string[],
    delimiters: X12Delimiters,
  ): { groups: X12FunctionalGroup[]; errors: X12ParseError[]; warnings: X12ParseError[] } {
    const groups: X12FunctionalGroup[] = [];
    const errors: X12ParseError[] = [];
    const warnings: X12ParseError[] = [];

    let i = 0;
    while (i < segments.length) {
      if (!segments[i].startsWith('GS')) {
        i++;
        continue;
      }

      // Parse GS segment
      const gsResult = this.parseGSSegment(segments[i], delimiters);
      if (gsResult.errors.length > 0) {
        errors.push(...gsResult.errors);
        i++;
        continue;
      }

      const gsSegment = gsResult.segment!;
      i++;

      // Find corresponding GE
      const geIndex = this.findGEIndex(segments, i, gsSegment.controlNumber);
      if (geIndex === -1) {
        errors.push({
          code: 'MISSING_GE',
          message: `GE trailer not found for GS group ${gsSegment.controlNumber}`,
          position: { line: 1, column: 1, offset: 0 },
          segmentId: 'GS',
          severity: 'error',
        });
        continue;
      }

      // Parse transaction sets between GS and GE
      const transactionSetResult = this.parseTransactionSets(
        segments.slice(i, geIndex),
        delimiters,
      );
      errors.push(...transactionSetResult.errors);
      warnings.push(...transactionSetResult.warnings);

      // Parse GE segment
      const geResult = this.parseGESegment(
        segments[geIndex],
        delimiters,
        gsSegment.controlNumber,
        transactionSetResult.sets.length,
      );
      errors.push(...geResult.errors);
      warnings.push(...geResult.warnings);

      groups.push({
        header: gsSegment,
        transactionSets: transactionSetResult.sets,
        trailer: geResult.segment!,
      });

      i = geIndex + 1;
    }

    return { groups, errors, warnings };
  }

  /**
   * Parse GS segment
   */
  private parseGSSegment(
    segment: string,
    delimiters: X12Delimiters,
  ): { segment?: GSSegment; errors: X12ParseError[] } {
    const errors: X12ParseError[] = [];
    const elements = segment.split(delimiters.elementSeparator);

    if (elements.length < 9) {
      errors.push({
        code: 'GS_ELEMENT_COUNT',
        message: `GS segment requires 8 elements, found ${elements.length - 1}`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'GS',
        severity: 'error',
      });
      return { errors };
    }

    return {
      segment: {
        segmentId: 'GS',
        functionalCode: elements[1],
        senderCode: elements[2],
        receiverCode: elements[3],
        date: elements[4],
        time: elements[5],
        controlNumber: elements[6],
        agencyCode: elements[7],
        versionCode: elements[8],
      },
      errors,
    };
  }

  /**
   * Parse GE segment
   */
  private parseGESegment(
    segment: string,
    delimiters: X12Delimiters,
    gsControlNumber: string,
    expectedSets: number,
  ): { segment?: GESegment; errors: X12ParseError[]; warnings: X12ParseError[] } {
    const errors: X12ParseError[] = [];
    const warnings: X12ParseError[] = [];
    const elements = segment.split(delimiters.elementSeparator);

    if (elements.length < 3) {
      errors.push({
        code: 'GE_ELEMENT_COUNT',
        message: `GE segment requires 2 elements, found ${elements.length - 1}`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'GE',
        severity: 'error',
      });
      return { errors, warnings };
    }

    const geSegment: GESegment = {
      segmentId: 'GE',
      numberOfTransactionSets: parseInt(elements[1], 10),
      controlNumber: elements[2],
    };

    // Validate control number matches GS
    if (geSegment.controlNumber !== gsControlNumber) {
      warnings.push({
        code: 'GE_CONTROL_NUMBER_MISMATCH',
        message: `GE control number (${geSegment.controlNumber}) does not match GS control number (${gsControlNumber})`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'GE',
        severity: 'warning',
      });
    }

    // Validate transaction set count
    if (geSegment.numberOfTransactionSets !== expectedSets) {
      warnings.push({
        code: 'TRANSACTION_SET_COUNT_MISMATCH',
        message: `GE01 says ${geSegment.numberOfTransactionSets} transaction sets, but found ${expectedSets}`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'GE',
        severity: 'warning',
      });
    }

    return { segment: geSegment, errors, warnings };
  }

  /**
   * Find index of GE segment matching GS
   */
  private findGEIndex(segments: string[], startIndex: number, gsControlNumber: string): number {
    let depth = 1; // Track nested GS/GE
    for (let i = startIndex; i < segments.length; i++) {
      if (segments[i].startsWith('GS')) {
        depth++;
      } else if (segments[i].startsWith('GE')) {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
    return -1;
  }

  /**
   * Parse transaction sets (ST/SE pairs)
   */
  private parseTransactionSets(
    segments: string[],
    delimiters: X12Delimiters,
  ): { sets: X12TransactionSet[]; errors: X12ParseError[]; warnings: X12ParseError[] } {
    const sets: X12TransactionSet[] = [];
    const errors: X12ParseError[] = [];
    const warnings: X12ParseError[] = [];

    let i = 0;
    while (i < segments.length) {
      if (!segments[i].startsWith('ST')) {
        i++;
        continue;
      }

      // Parse ST segment
      const stResult = this.parseSTSegment(segments[i], delimiters);
      if (stResult.errors.length > 0) {
        errors.push(...stResult.errors);
        i++;
        continue;
      }

      const stSegment = stResult.segment!;
      i++;

      // Find corresponding SE
      const seIndex = this.findSEIndex(segments, i, stSegment.controlNumber);
      if (seIndex === -1) {
        errors.push({
          code: 'MISSING_SE',
          message: `SE trailer not found for ST transaction set ${stSegment.controlNumber}`,
          position: { line: 1, column: 1, offset: 0 },
          segmentId: 'ST',
          severity: 'error',
        });
        continue;
      }

      // Parse segments between ST and SE
      const bodySegments = segments
        .slice(i, seIndex)
        .map((s) => this.parseGenericSegment(s, delimiters));
      const segmentCount = bodySegments.length + 2; // Include ST and SE

      // Parse SE segment
      const seResult = this.parseSESegment(
        segments[seIndex],
        delimiters,
        stSegment.controlNumber,
        segmentCount,
      );
      errors.push(...seResult.errors);
      warnings.push(...seResult.warnings);

      sets.push({
        header: stSegment,
        segments: bodySegments,
        trailer: seResult.segment!,
      });

      i = seIndex + 1;
    }

    return { sets, errors, warnings };
  }

  /**
   * Parse ST segment
   */
  private parseSTSegment(
    segment: string,
    delimiters: X12Delimiters,
  ): { segment?: STSegment; errors: X12ParseError[] } {
    const errors: X12ParseError[] = [];
    const elements = segment.split(delimiters.elementSeparator);

    if (elements.length < 3) {
      errors.push({
        code: 'ST_ELEMENT_COUNT',
        message: `ST segment requires at least 2 elements, found ${elements.length - 1}`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'ST',
        severity: 'error',
      });
      return { errors };
    }

    return {
      segment: {
        segmentId: 'ST',
        transactionSetCode: elements[1],
        controlNumber: elements[2],
        implementationReference: elements.length > 3 ? elements[3] : undefined,
      },
      errors,
    };
  }

  /**
   * Parse SE segment
   */
  private parseSESegment(
    segment: string,
    delimiters: X12Delimiters,
    stControlNumber: string,
    expectedSegmentCount: number,
  ): { segment?: SESegment; errors: X12ParseError[]; warnings: X12ParseError[] } {
    const errors: X12ParseError[] = [];
    const warnings: X12ParseError[] = [];
    const elements = segment.split(delimiters.elementSeparator);

    if (elements.length < 3) {
      errors.push({
        code: 'SE_ELEMENT_COUNT',
        message: `SE segment requires 2 elements, found ${elements.length - 1}`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'SE',
        severity: 'error',
      });
      return { errors, warnings };
    }

    const seSegment: SESegment = {
      segmentId: 'SE',
      numberOfSegments: parseInt(elements[1], 10),
      controlNumber: elements[2],
    };

    // Validate control number matches ST
    if (seSegment.controlNumber !== stControlNumber) {
      warnings.push({
        code: 'SE_CONTROL_NUMBER_MISMATCH',
        message: `SE control number (${seSegment.controlNumber}) does not match ST control number (${stControlNumber})`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'SE',
        severity: 'warning',
      });
    }

    // Validate segment count
    if (seSegment.numberOfSegments !== expectedSegmentCount) {
      warnings.push({
        code: 'SEGMENT_COUNT_MISMATCH',
        message: `SE01 says ${seSegment.numberOfSegments} segments, but found ${expectedSegmentCount}`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'SE',
        severity: 'warning',
      });
    }

    return { segment: seSegment, errors, warnings };
  }

  /**
   * Find index of SE segment matching ST
   */
  private findSEIndex(segments: string[], startIndex: number, stControlNumber: string): number {
    let depth = 1;
    for (let i = startIndex; i < segments.length; i++) {
      if (segments[i].startsWith('ST')) {
        depth++;
      } else if (segments[i].startsWith('SE')) {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
    return -1;
  }

  /**
   * Parse generic segment into structured format
   */
  private parseGenericSegment(segment: string, delimiters: X12Delimiters): X12Segment {
    const elements = segment.split(delimiters.elementSeparator);
    const segmentId = elements[0];

    const parsedElements: X12Element[] = elements.slice(1).map((element) => {
      // Check for repetitions
      if (element.includes(delimiters.repetitionSeparator)) {
        const repetitions = element.split(delimiters.repetitionSeparator);
        return {
          value: repetitions[0],
          repetitions: repetitions.slice(1),
          subelements: repetitions[0].includes(delimiters.subelementSeparator)
            ? repetitions[0].split(delimiters.subelementSeparator)
            : undefined,
        };
      }

      // Check for subelements
      if (element.includes(delimiters.subelementSeparator)) {
        const subelements = element.split(delimiters.subelementSeparator);
        return {
          value: subelements[0],
          subelements,
        };
      }

      return { value: element };
    });

    return {
      segmentId,
      elements: parsedElements,
      raw: segment,
    };
  }

  /**
   * Get element value from segment by position
   */
  getElementValue(segment: X12Segment, elementIndex: number): string | undefined {
    if (elementIndex < 1 || elementIndex > segment.elements.length) {
      return undefined;
    }
    return segment.elements[elementIndex - 1].value;
  }

  /**
   * Get subelement value from segment
   */
  getSubelementValue(
    segment: X12Segment,
    elementIndex: number,
    subelementIndex: number,
  ): string | undefined {
    const element = segment.elements[elementIndex - 1];
    if (!element || !element.subelements) {
      return undefined;
    }
    return element.subelements[subelementIndex - 1];
  }
}
