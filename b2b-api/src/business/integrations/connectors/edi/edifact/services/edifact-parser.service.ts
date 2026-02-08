import { Injectable } from '@nestjs/common';
import { EdifactLexerService } from './edifact-lexer.service';
import {
  EdifactInterchange,
  EdifactFunctionalGroup,
  EdifactMessage,
  EdifactSegment,
  EdifactElement,
  EdifactParseResult,
  EdifactParseError,
  EdifactDelimiters,
  DEFAULT_EDIFACT_DELIMITERS,
  UNASegment,
  UNBSegment,
  UNZSegment,
  UNGSegment,
  UNESegment,
  UNHSegment,
  UNTSegment,
} from '../interfaces';

/**
 * EDIFACT Parser Service
 *
 * Parses EDIFACT documents into structured objects.
 * Handles UNA/UNB/UNZ envelopes and UNG/UNE groups.
 * Supports both grouped and ungrouped message structures.
 */
@Injectable()
export class EdifactParserService {
  constructor(private readonly lexer: EdifactLexerService) {}

  /**
   * Parse EDIFACT document from string
   */
  parse(input: string): EdifactParseResult {
    const errors: EdifactParseError[] = [];
    const warnings: EdifactParseError[] = [];

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

    const delimiters: EdifactDelimiters = {
      componentSeparator: delimResult.componentSeparator,
      elementSeparator: delimResult.elementSeparator,
      decimalNotation: delimResult.decimalNotation,
      releaseCharacter: delimResult.releaseCharacter,
      segmentTerminator: delimResult.segmentTerminator,
    };

    // Split into segments
    const segments = this.splitIntoSegments(input, delimiters, this.lexer.hasUNASegment(input));
    if (segments.length === 0) {
      errors.push({
        code: 'NO_SEGMENTS',
        message: 'No segments found in input',
        position: { line: 1, column: 1, offset: 0 },
        severity: 'error',
      });
      return { success: false, errors, warnings };
    }

    // Parse UNB segment
    const unbResult = this.parseUNBSegment(segments[0], delimiters);
    if (unbResult.errors.length > 0) {
      errors.push(...unbResult.errors);
      return { success: false, errors, warnings };
    }

    const unbSegment = unbResult.segment!;

    // Find UNZ segment
    const unzIndex = segments.findIndex((s) => s.startsWith('UNZ'));
    if (unzIndex === -1) {
      errors.push({
        code: 'MISSING_UNZ',
        message: 'UNZ trailer segment not found',
        position: { line: 1, column: 1, offset: input.length },
        severity: 'error',
      });
      return { success: false, errors, warnings };
    }

    const unzResult = this.parseUNZSegment(
      segments[unzIndex],
      delimiters,
      unbSegment.controlReference,
    );
    if (unzResult.errors.length > 0) {
      errors.push(...unzResult.errors);
    }
    warnings.push(...unzResult.warnings);

    const unzSegment = unzResult.segment!;

    // Parse body (between UNB and UNZ)
    const bodySegments = segments.slice(1, unzIndex);

    // Check if we have functional groups (UNG/UNE) or direct messages (UNH/UNT)
    const hasGroups = bodySegments.some((s) => s.startsWith('UNG'));

    let functionalGroups: EdifactFunctionalGroup[] | undefined;
    let messages: EdifactMessage[] | undefined;

    if (hasGroups) {
      // Parse functional groups
      const groupsResult = this.parseFunctionalGroups(bodySegments, delimiters);
      errors.push(...groupsResult.errors);
      warnings.push(...groupsResult.warnings);
      functionalGroups = groupsResult.groups;

      // Validate group count
      const totalMessages = functionalGroups.reduce((sum, g) => sum + g.messages.length, 0);
      if (unzSegment && functionalGroups.length !== unzSegment.controlCount) {
        // In EDIFACT, UNZ count can be either groups or messages depending on structure
        // Let's check if it matches message count instead
        if (totalMessages !== unzSegment.controlCount) {
          warnings.push({
            code: 'COUNT_MISMATCH',
            message: `UNZ control count (${unzSegment.controlCount}) does not match groups (${functionalGroups.length}) or messages (${totalMessages})`,
            position: { line: 1, column: 1, offset: 0 },
            severity: 'warning',
          });
        }
      }
    } else {
      // Parse messages directly
      const messagesResult = this.parseMessages(bodySegments, delimiters);
      errors.push(...messagesResult.errors);
      warnings.push(...messagesResult.warnings);
      messages = messagesResult.messages;

      // Validate message count
      if (unzSegment && messages.length !== unzSegment.controlCount) {
        warnings.push({
          code: 'MESSAGE_COUNT_MISMATCH',
          message: `UNZ control count (${unzSegment.controlCount}) does not match message count (${messages.length})`,
          position: { line: 1, column: 1, offset: 0 },
          severity: 'warning',
        });
      }
    }

    const interchange: EdifactInterchange = {
      serviceStringAdvice: delimResult.unaSegment,
      header: unbSegment,
      functionalGroups: hasGroups ? functionalGroups : undefined,
      messages: !hasGroups ? messages : undefined,
      trailer: unzSegment,
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
  private splitIntoSegments(
    input: string,
    delimiters: EdifactDelimiters,
    hasUNA: boolean,
  ): string[] {
    // Normalize line endings
    let normalized = input.replace(/\r\n/g, '\n').replace(/\n/g, '');

    // Skip UNA segment if present
    if (hasUNA) {
      normalized = normalized.substring(9);
    }

    // Split by segment terminator, handling escape sequences
    return this.splitByTerminator(
      normalized,
      delimiters.segmentTerminator,
      delimiters.releaseCharacter,
    );
  }

  /**
   * Split string by terminator, handling escape character
   */
  private splitByTerminator(input: string, terminator: string, releaseChar: string): string[] {
    const segments: string[] = [];
    let current = '';
    let i = 0;

    while (i < input.length) {
      const char = input[i];

      if (char === releaseChar && i + 1 < input.length) {
        // Escape sequence - keep both chars
        current += char + input[i + 1];
        i += 2;
        continue;
      }

      if (char === terminator) {
        if (current.trim()) {
          segments.push(current.trim());
        }
        current = '';
        i++;
        continue;
      }

      current += char;
      i++;
    }

    if (current.trim()) {
      segments.push(current.trim());
    }

    return segments;
  }

  /**
   * Parse UNB segment
   */
  private parseUNBSegment(
    segment: string,
    delimiters: EdifactDelimiters,
  ): { segment?: UNBSegment; errors: EdifactParseError[] } {
    const errors: EdifactParseError[] = [];
    const elements = this.parseSegmentElements(segment, delimiters);

    if (elements[0] !== 'UNB') {
      errors.push({
        code: 'INVALID_UNB',
        message: `Expected UNB segment, found: ${elements[0]}`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'UNB',
        severity: 'error',
      });
      return { errors };
    }

    if (elements.length < 5) {
      errors.push({
        code: 'UNB_ELEMENT_COUNT',
        message: `UNB segment requires at least 4 data elements, found ${elements.length - 1}`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'UNB',
        severity: 'error',
      });
      return { errors };
    }

    // Parse S001 - Syntax identifier (composite)
    const s001 = this.parseComposite(elements[1], delimiters);
    const syntaxIdentifier = {
      id: s001[0] || 'UNOA',
      version: s001[1] || '4',
      serviceCodeVersion: s001[2],
      characterEncoding: s001[3],
    };

    // Parse S002 - Interchange sender
    const s002 = this.parseComposite(elements[2], delimiters);
    const sender = {
      id: s002[0] || '',
      qualifier: s002[1],
      reverseRoutingAddress: s002[2],
    };

    // Parse S003 - Interchange recipient
    const s003 = this.parseComposite(elements[3], delimiters);
    const recipient = {
      id: s003[0] || '',
      qualifier: s003[1],
      routingAddress: s003[2],
    };

    // Parse S004 - Date/time of preparation
    const s004 = this.parseComposite(elements[4], delimiters);
    const dateTime = {
      date: s004[0] || '',
      time: s004[1] || '',
    };

    // 0020 - Interchange control reference
    const controlReference = elements[5] || '';

    // Optional fields
    let recipientReference: UNBSegment['recipientReference'];
    if (elements[6]) {
      const s005 = this.parseComposite(elements[6], delimiters);
      recipientReference = {
        reference: s005[0],
        qualifier: s005[1],
      };
    }

    const unbSegment: UNBSegment = {
      segmentId: 'UNB',
      syntaxIdentifier,
      sender,
      recipient,
      dateTime,
      controlReference,
      recipientReference,
      applicationReference: elements[7],
      processingPriorityCode: elements[8],
      acknowledgementRequest: elements[9] as '0' | '1',
      agreementIdentifier: elements[10],
      testIndicator: elements[11] as '0' | '1',
    };

    return { segment: unbSegment, errors };
  }

  /**
   * Parse UNZ segment
   */
  private parseUNZSegment(
    segment: string,
    delimiters: EdifactDelimiters,
    unbControlReference: string,
  ): { segment?: UNZSegment; errors: EdifactParseError[]; warnings: EdifactParseError[] } {
    const errors: EdifactParseError[] = [];
    const warnings: EdifactParseError[] = [];
    const elements = this.parseSegmentElements(segment, delimiters);

    if (elements[0] !== 'UNZ') {
      errors.push({
        code: 'INVALID_UNZ',
        message: `Expected UNZ segment, found: ${elements[0]}`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'UNZ',
        severity: 'error',
      });
      return { errors, warnings };
    }

    if (elements.length < 3) {
      errors.push({
        code: 'UNZ_ELEMENT_COUNT',
        message: `UNZ segment requires 2 data elements, found ${elements.length - 1}`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'UNZ',
        severity: 'error',
      });
      return { errors, warnings };
    }

    const unzSegment: UNZSegment = {
      segmentId: 'UNZ',
      controlCount: parseInt(elements[1], 10),
      controlReference: elements[2],
    };

    // Validate control reference matches UNB
    if (unzSegment.controlReference !== unbControlReference) {
      warnings.push({
        code: 'CONTROL_REFERENCE_MISMATCH',
        message: `UNZ control reference (${unzSegment.controlReference}) does not match UNB control reference (${unbControlReference})`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'UNZ',
        severity: 'warning',
      });
    }

    return { segment: unzSegment, errors, warnings };
  }

  /**
   * Parse functional groups (UNG/UNE pairs)
   */
  private parseFunctionalGroups(
    segments: string[],
    delimiters: EdifactDelimiters,
  ): {
    groups: EdifactFunctionalGroup[];
    errors: EdifactParseError[];
    warnings: EdifactParseError[];
  } {
    const groups: EdifactFunctionalGroup[] = [];
    const errors: EdifactParseError[] = [];
    const warnings: EdifactParseError[] = [];

    let i = 0;
    while (i < segments.length) {
      if (!segments[i].startsWith('UNG')) {
        // If we find a UNH outside of groups, it's an ungrouped message - this shouldn't happen here
        i++;
        continue;
      }

      // Parse UNG segment
      const ungResult = this.parseUNGSegment(segments[i], delimiters);
      if (ungResult.errors.length > 0) {
        errors.push(...ungResult.errors);
        i++;
        continue;
      }

      const ungSegment = ungResult.segment!;
      i++;

      // Find corresponding UNE
      const uneIndex = this.findUNEIndex(segments, i, ungSegment.referenceNumber);
      if (uneIndex === -1) {
        errors.push({
          code: 'MISSING_UNE',
          message: `UNE trailer not found for UNG group ${ungSegment.referenceNumber}`,
          position: { line: 1, column: 1, offset: 0 },
          segmentId: 'UNG',
          severity: 'error',
        });
        continue;
      }

      // Parse messages within group
      const messagesResult = this.parseMessages(segments.slice(i, uneIndex), delimiters);
      errors.push(...messagesResult.errors);
      warnings.push(...messagesResult.warnings);

      // Parse UNE segment
      const uneResult = this.parseUNESegment(
        segments[uneIndex],
        delimiters,
        ungSegment.referenceNumber,
        messagesResult.messages.length,
      );
      errors.push(...uneResult.errors);
      warnings.push(...uneResult.warnings);

      groups.push({
        header: ungSegment,
        messages: messagesResult.messages,
        trailer: uneResult.segment!,
      });

      i = uneIndex + 1;
    }

    return { groups, errors, warnings };
  }

  /**
   * Parse UNG segment
   */
  private parseUNGSegment(
    segment: string,
    delimiters: EdifactDelimiters,
  ): { segment?: UNGSegment; errors: EdifactParseError[] } {
    const errors: EdifactParseError[] = [];
    const elements = this.parseSegmentElements(segment, delimiters);

    if (elements.length < 8) {
      errors.push({
        code: 'UNG_ELEMENT_COUNT',
        message: `UNG segment requires at least 7 data elements`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'UNG',
        severity: 'error',
      });
      return { errors };
    }

    const s006 = this.parseComposite(elements[2], delimiters);
    const s007 = this.parseComposite(elements[3], delimiters);
    const s004 = this.parseComposite(elements[4], delimiters);
    const s008 = this.parseComposite(elements[7], delimiters);

    const ungSegment: UNGSegment = {
      segmentId: 'UNG',
      groupIdentification: elements[1],
      senderIdentification: {
        id: s006[0] || '',
        qualifier: s006[1],
      },
      recipientIdentification: {
        id: s007[0] || '',
        qualifier: s007[1],
      },
      dateTime: {
        date: s004[0] || '',
        time: s004[1] || '',
      },
      referenceNumber: elements[5],
      controllingAgency: elements[6],
      messageVersion: {
        versionNumber: s008[0] || '',
        releaseNumber: s008[1] || '',
        associationAssignedCode: s008[2],
      },
      applicationPassword: elements[8],
    };

    return { segment: ungSegment, errors };
  }

  /**
   * Parse UNE segment
   */
  private parseUNESegment(
    segment: string,
    delimiters: EdifactDelimiters,
    ungReferenceNumber: string,
    expectedMessages: number,
  ): { segment?: UNESegment; errors: EdifactParseError[]; warnings: EdifactParseError[] } {
    const errors: EdifactParseError[] = [];
    const warnings: EdifactParseError[] = [];
    const elements = this.parseSegmentElements(segment, delimiters);

    if (elements.length < 3) {
      errors.push({
        code: 'UNE_ELEMENT_COUNT',
        message: `UNE segment requires 2 data elements`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'UNE',
        severity: 'error',
      });
      return { errors, warnings };
    }

    const uneSegment: UNESegment = {
      segmentId: 'UNE',
      messageCount: parseInt(elements[1], 10),
      referenceNumber: elements[2],
    };

    // Validate reference number
    if (uneSegment.referenceNumber !== ungReferenceNumber) {
      warnings.push({
        code: 'UNE_REFERENCE_MISMATCH',
        message: `UNE reference (${uneSegment.referenceNumber}) does not match UNG reference (${ungReferenceNumber})`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'UNE',
        severity: 'warning',
      });
    }

    // Validate message count
    if (uneSegment.messageCount !== expectedMessages) {
      warnings.push({
        code: 'MESSAGE_COUNT_MISMATCH',
        message: `UNE message count (${uneSegment.messageCount}) does not match actual (${expectedMessages})`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'UNE',
        severity: 'warning',
      });
    }

    return { segment: uneSegment, errors, warnings };
  }

  /**
   * Find UNE index matching UNG
   */
  private findUNEIndex(segments: string[], startIndex: number, ungReference: string): number {
    let depth = 1;
    for (let i = startIndex; i < segments.length; i++) {
      if (segments[i].startsWith('UNG')) {
        depth++;
      } else if (segments[i].startsWith('UNE')) {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
    return -1;
  }

  /**
   * Parse messages (UNH/UNT pairs)
   */
  private parseMessages(
    segments: string[],
    delimiters: EdifactDelimiters,
  ): { messages: EdifactMessage[]; errors: EdifactParseError[]; warnings: EdifactParseError[] } {
    const messages: EdifactMessage[] = [];
    const errors: EdifactParseError[] = [];
    const warnings: EdifactParseError[] = [];

    let i = 0;
    while (i < segments.length) {
      if (!segments[i].startsWith('UNH')) {
        i++;
        continue;
      }

      // Parse UNH segment
      const unhResult = this.parseUNHSegment(segments[i], delimiters);
      if (unhResult.errors.length > 0) {
        errors.push(...unhResult.errors);
        i++;
        continue;
      }

      const unhSegment = unhResult.segment!;
      i++;

      // Find corresponding UNT
      const untIndex = this.findUNTIndex(segments, i, unhSegment.messageReferenceNumber);
      if (untIndex === -1) {
        errors.push({
          code: 'MISSING_UNT',
          message: `UNT trailer not found for UNH message ${unhSegment.messageReferenceNumber}`,
          position: { line: 1, column: 1, offset: 0 },
          segmentId: 'UNH',
          severity: 'error',
        });
        continue;
      }

      // Parse body segments
      const bodySegments = segments
        .slice(i, untIndex)
        .map((s) => this.parseGenericSegment(s, delimiters));
      const segmentCount = bodySegments.length + 2; // Include UNH and UNT

      // Parse UNT segment
      const untResult = this.parseUNTSegment(
        segments[untIndex],
        delimiters,
        unhSegment.messageReferenceNumber,
        segmentCount,
      );
      errors.push(...untResult.errors);
      warnings.push(...untResult.warnings);

      messages.push({
        header: unhSegment,
        segments: bodySegments,
        trailer: untResult.segment!,
      });

      i = untIndex + 1;
    }

    return { messages, errors, warnings };
  }

  /**
   * Parse UNH segment
   */
  private parseUNHSegment(
    segment: string,
    delimiters: EdifactDelimiters,
  ): { segment?: UNHSegment; errors: EdifactParseError[] } {
    const errors: EdifactParseError[] = [];
    const elements = this.parseSegmentElements(segment, delimiters);

    if (elements.length < 3) {
      errors.push({
        code: 'UNH_ELEMENT_COUNT',
        message: `UNH segment requires at least 2 data elements`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'UNH',
        severity: 'error',
      });
      return { errors };
    }

    // Parse S009 - Message identifier (composite)
    const s009 = this.parseComposite(elements[2], delimiters);

    const messageIdentifier = {
      type: s009[0] || '',
      version: s009[1] || '',
      release: s009[2] || '',
      controllingAgency: s009[3] || 'UN',
      associationAssignedCode: s009[4],
      codeListVersion: s009[5],
      subFunction: s009[6],
    };

    const unhSegment: UNHSegment = {
      segmentId: 'UNH',
      messageReferenceNumber: elements[1],
      messageIdentifier,
      commonAccessReference: elements[3],
    };

    // Parse optional S010 - Status of transfer
    if (elements[4]) {
      const s010 = this.parseComposite(elements[4], delimiters);
      unhSegment.statusOfTransfer = {
        sequenceOfTransfers: s010[0],
        firstAndLastTransfer: s010[1] as 'C' | 'F' | 'I' | 'L',
      };
    }

    // Parse optional S016 - Message subset
    if (elements[5]) {
      const s016 = this.parseComposite(elements[5], delimiters);
      unhSegment.messageSubsetId = {
        id: s016[0],
        version: s016[1],
        release: s016[2],
        controllingAgency: s016[3],
      };
    }

    // Parse optional S017 - Implementation guideline
    if (elements[6]) {
      const s017 = this.parseComposite(elements[6], delimiters);
      unhSegment.implementationGuidelineId = {
        id: s017[0],
        version: s017[1],
        release: s017[2],
        controllingAgency: s017[3],
      };
    }

    // Parse optional S018 - Scenario
    if (elements[7]) {
      const s018 = this.parseComposite(elements[7], delimiters);
      unhSegment.scenarioId = {
        id: s018[0],
        version: s018[1],
        release: s018[2],
        controllingAgency: s018[3],
      };
    }

    return { segment: unhSegment, errors };
  }

  /**
   * Parse UNT segment
   */
  private parseUNTSegment(
    segment: string,
    delimiters: EdifactDelimiters,
    unhMessageReference: string,
    expectedSegmentCount: number,
  ): { segment?: UNTSegment; errors: EdifactParseError[]; warnings: EdifactParseError[] } {
    const errors: EdifactParseError[] = [];
    const warnings: EdifactParseError[] = [];
    const elements = this.parseSegmentElements(segment, delimiters);

    if (elements.length < 3) {
      errors.push({
        code: 'UNT_ELEMENT_COUNT',
        message: `UNT segment requires 2 data elements`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'UNT',
        severity: 'error',
      });
      return { errors, warnings };
    }

    const untSegment: UNTSegment = {
      segmentId: 'UNT',
      segmentCount: parseInt(elements[1], 10),
      messageReferenceNumber: elements[2],
    };

    // Validate message reference
    if (untSegment.messageReferenceNumber !== unhMessageReference) {
      warnings.push({
        code: 'UNT_REFERENCE_MISMATCH',
        message: `UNT reference (${untSegment.messageReferenceNumber}) does not match UNH reference (${unhMessageReference})`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'UNT',
        severity: 'warning',
      });
    }

    // Validate segment count
    if (untSegment.segmentCount !== expectedSegmentCount) {
      warnings.push({
        code: 'SEGMENT_COUNT_MISMATCH',
        message: `UNT segment count (${untSegment.segmentCount}) does not match actual (${expectedSegmentCount})`,
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'UNT',
        severity: 'warning',
      });
    }

    return { segment: untSegment, errors, warnings };
  }

  /**
   * Find UNT index matching UNH
   */
  private findUNTIndex(segments: string[], startIndex: number, unhReference: string): number {
    let depth = 1;
    for (let i = startIndex; i < segments.length; i++) {
      if (segments[i].startsWith('UNH')) {
        depth++;
      } else if (segments[i].startsWith('UNT')) {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
    return -1;
  }

  /**
   * Parse generic segment
   */
  private parseGenericSegment(segment: string, delimiters: EdifactDelimiters): EdifactSegment {
    const elements = this.parseSegmentElements(segment, delimiters);
    const segmentId = elements[0];

    const parsedElements: EdifactElement[] = elements.slice(1).map((element) => {
      const components = this.parseComposite(element, delimiters);
      if (components.length > 1) {
        return {
          value: components[0],
          components,
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
   * Parse segment into elements (split by element separator)
   */
  private parseSegmentElements(segment: string, delimiters: EdifactDelimiters): string[] {
    return this.splitWithEscape(segment, delimiters.elementSeparator, delimiters.releaseCharacter);
  }

  /**
   * Parse composite element (split by component separator)
   */
  private parseComposite(element: string, delimiters: EdifactDelimiters): string[] {
    return this.splitWithEscape(
      element,
      delimiters.componentSeparator,
      delimiters.releaseCharacter,
    );
  }

  /**
   * Split string by separator, respecting escape character
   */
  private splitWithEscape(input: string, separator: string, escapeChar: string): string[] {
    const parts: string[] = [];
    let current = '';
    let i = 0;

    while (i < input.length) {
      const char = input[i];

      if (char === escapeChar && i + 1 < input.length) {
        // Add escaped character without the escape
        current += input[i + 1];
        i += 2;
        continue;
      }

      if (char === separator) {
        parts.push(current);
        current = '';
        i++;
        continue;
      }

      current += char;
      i++;
    }

    parts.push(current);
    return parts;
  }

  /**
   * Get element value from segment by position
   */
  getElementValue(segment: EdifactSegment, elementIndex: number): string | undefined {
    if (elementIndex < 1 || elementIndex > segment.elements.length) {
      return undefined;
    }
    return segment.elements[elementIndex - 1].value;
  }

  /**
   * Get component value from element
   */
  getComponentValue(
    segment: EdifactSegment,
    elementIndex: number,
    componentIndex: number,
  ): string | undefined {
    const element = segment.elements[elementIndex - 1];
    if (!element || !element.components) {
      return componentIndex === 1 ? element?.value : undefined;
    }
    return element.components[componentIndex - 1];
  }
}
