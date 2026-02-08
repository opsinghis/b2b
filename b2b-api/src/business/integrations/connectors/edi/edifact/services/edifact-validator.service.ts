import { Injectable } from '@nestjs/common';
import {
  EdifactInterchange,
  EdifactMessage,
  EdifactSegment,
  EdifactValidationError,
  EdifactSyntaxVersion,
} from '../interfaces';

/**
 * EDIFACT Validator Service
 *
 * Validates EDIFACT documents for structural and semantic correctness.
 */
@Injectable()
export class EdifactValidatorService {
  /**
   * Validate complete interchange
   */
  validateInterchange(interchange: EdifactInterchange): EdifactValidationError[] {
    const errors: EdifactValidationError[] = [];

    // Validate UNB
    errors.push(...this.validateUNB(interchange));

    // Validate messages or groups
    if (interchange.functionalGroups) {
      for (const group of interchange.functionalGroups) {
        errors.push(...this.validateGroup(group));
      }
    } else if (interchange.messages) {
      for (const message of interchange.messages) {
        errors.push(...this.validateMessage(message));
      }
    }

    // Validate UNZ
    errors.push(...this.validateUNZ(interchange));

    return errors;
  }

  /**
   * Validate UNB segment
   */
  private validateUNB(interchange: EdifactInterchange): EdifactValidationError[] {
    const errors: EdifactValidationError[] = [];
    const unb = interchange.header;

    // Validate sender ID
    if (!unb.sender.id || unb.sender.id.trim() === '') {
      errors.push({
        code: 'UNB_SENDER_REQUIRED',
        message: 'UNB sender identification is required',
        segmentId: 'UNB',
        elementIndex: 2,
        severity: 'error',
      });
    }

    // Validate recipient ID
    if (!unb.recipient.id || unb.recipient.id.trim() === '') {
      errors.push({
        code: 'UNB_RECIPIENT_REQUIRED',
        message: 'UNB recipient identification is required',
        segmentId: 'UNB',
        elementIndex: 3,
        severity: 'error',
      });
    }

    // Validate date format
    if (unb.dateTime.date) {
      if (!/^\d{6}$/.test(unb.dateTime.date) && !/^\d{8}$/.test(unb.dateTime.date)) {
        errors.push({
          code: 'UNB_INVALID_DATE',
          message: 'UNB date must be in YYMMDD or CCYYMMDD format',
          segmentId: 'UNB',
          elementIndex: 4,
          componentIndex: 1,
          severity: 'error',
        });
      }
    }

    // Validate time format
    if (unb.dateTime.time) {
      if (!/^\d{4}$/.test(unb.dateTime.time)) {
        errors.push({
          code: 'UNB_INVALID_TIME',
          message: 'UNB time must be in HHMM format',
          segmentId: 'UNB',
          elementIndex: 4,
          componentIndex: 2,
          severity: 'error',
        });
      }
    }

    // Validate control reference
    if (!unb.controlReference || unb.controlReference.trim() === '') {
      errors.push({
        code: 'UNB_CONTROL_REFERENCE_REQUIRED',
        message: 'UNB control reference is required',
        segmentId: 'UNB',
        elementIndex: 5,
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate UNZ segment
   */
  private validateUNZ(interchange: EdifactInterchange): EdifactValidationError[] {
    const errors: EdifactValidationError[] = [];
    const unz = interchange.trailer;

    // Validate control reference matches UNB
    if (unz.controlReference !== interchange.header.controlReference) {
      errors.push({
        code: 'UNZ_CONTROL_REFERENCE_MISMATCH',
        message: `UNZ control reference (${unz.controlReference}) does not match UNB control reference (${interchange.header.controlReference})`,
        segmentId: 'UNZ',
        elementIndex: 2,
        severity: 'error',
      });
    }

    // Validate count
    const actualCount = interchange.functionalGroups?.length || interchange.messages?.length || 0;

    if (unz.controlCount !== actualCount) {
      errors.push({
        code: 'UNZ_COUNT_MISMATCH',
        message: `UNZ control count (${unz.controlCount}) does not match actual count (${actualCount})`,
        segmentId: 'UNZ',
        elementIndex: 1,
        severity: 'warning',
      });
    }

    return errors;
  }

  /**
   * Validate functional group
   */
  private validateGroup(
    group: NonNullable<EdifactInterchange['functionalGroups']>[0],
  ): EdifactValidationError[] {
    const errors: EdifactValidationError[] = [];

    // Validate UNG/UNE reference match
    if (group.trailer.referenceNumber !== group.header.referenceNumber) {
      errors.push({
        code: 'UNE_REFERENCE_MISMATCH',
        message: `UNE reference number (${group.trailer.referenceNumber}) does not match UNG reference number (${group.header.referenceNumber})`,
        segmentId: 'UNE',
        elementIndex: 2,
        severity: 'error',
      });
    }

    // Validate message count
    if (group.trailer.messageCount !== group.messages.length) {
      errors.push({
        code: 'UNE_MESSAGE_COUNT_MISMATCH',
        message: `UNE message count (${group.trailer.messageCount}) does not match actual count (${group.messages.length})`,
        segmentId: 'UNE',
        elementIndex: 1,
        severity: 'warning',
      });
    }

    // Validate each message
    for (const message of group.messages) {
      errors.push(...this.validateMessage(message));
    }

    return errors;
  }

  /**
   * Validate message
   */
  validateMessage(message: EdifactMessage): EdifactValidationError[] {
    const errors: EdifactValidationError[] = [];

    // Validate UNH/UNT reference match
    if (message.trailer.messageReferenceNumber !== message.header.messageReferenceNumber) {
      errors.push({
        code: 'UNT_REFERENCE_MISMATCH',
        message: `UNT reference number (${message.trailer.messageReferenceNumber}) does not match UNH reference number (${message.header.messageReferenceNumber})`,
        segmentId: 'UNT',
        elementIndex: 2,
        severity: 'error',
      });
    }

    // Validate segment count
    const actualSegmentCount = message.segments.length + 2; // Include UNH and UNT
    if (message.trailer.segmentCount !== actualSegmentCount) {
      errors.push({
        code: 'UNT_SEGMENT_COUNT_MISMATCH',
        message: `UNT segment count (${message.trailer.segmentCount}) does not match actual count (${actualSegmentCount})`,
        segmentId: 'UNT',
        elementIndex: 1,
        severity: 'warning',
      });
    }

    // Validate message type is supported
    const supportedTypes = [
      'ORDERS',
      'ORDRSP',
      'DESADV',
      'INVOIC',
      'PRICAT',
      'INVRPT',
      'REMADV',
      'RECADV',
    ];
    if (!supportedTypes.includes(message.header.messageIdentifier.type)) {
      errors.push({
        code: 'UNSUPPORTED_MESSAGE_TYPE',
        message: `Message type ${message.header.messageIdentifier.type} is not fully supported`,
        segmentId: 'UNH',
        elementIndex: 2,
        componentIndex: 1,
        severity: 'warning',
      });
    }

    // Validate message-specific structure
    errors.push(...this.validateMessageStructure(message));

    return errors;
  }

  /**
   * Validate message structure based on type
   */
  private validateMessageStructure(message: EdifactMessage): EdifactValidationError[] {
    const errors: EdifactValidationError[] = [];
    const messageType = message.header.messageIdentifier.type;

    // Check for required segments based on message type
    const requiredSegments = this.getRequiredSegments(messageType);

    for (const required of requiredSegments) {
      const hasSegment = message.segments.some((s) => s.segmentId === required.segmentId);
      if (!hasSegment) {
        errors.push({
          code: 'MISSING_REQUIRED_SEGMENT',
          message: `Required segment ${required.segmentId} is missing for ${messageType} message`,
          segmentId: required.segmentId,
          severity: required.severity,
        });
      }
    }

    return errors;
  }

  /**
   * Get required segments for message type
   */
  private getRequiredSegments(
    messageType: string,
  ): Array<{ segmentId: string; severity: 'error' | 'warning' }> {
    switch (messageType) {
      case 'ORDERS':
        return [
          { segmentId: 'BGM', severity: 'error' },
          { segmentId: 'DTM', severity: 'error' },
          { segmentId: 'NAD', severity: 'error' },
          { segmentId: 'LIN', severity: 'error' },
        ];

      case 'INVOIC':
        return [
          { segmentId: 'BGM', severity: 'error' },
          { segmentId: 'DTM', severity: 'error' },
          { segmentId: 'NAD', severity: 'error' },
          { segmentId: 'LIN', severity: 'error' },
          { segmentId: 'MOA', severity: 'error' },
        ];

      case 'DESADV':
        return [
          { segmentId: 'BGM', severity: 'error' },
          { segmentId: 'DTM', severity: 'error' },
          { segmentId: 'NAD', severity: 'error' },
        ];

      case 'ORDRSP':
        return [
          { segmentId: 'BGM', severity: 'error' },
          { segmentId: 'DTM', severity: 'error' },
          { segmentId: 'RFF', severity: 'error' }, // Order reference required
        ];

      default:
        return [{ segmentId: 'BGM', severity: 'warning' }];
    }
  }

  /**
   * Validate segment structure
   */
  validateSegment(segment: EdifactSegment): EdifactValidationError[] {
    const errors: EdifactValidationError[] = [];

    // Validate segment ID format
    if (!/^[A-Z]{3}$/.test(segment.segmentId)) {
      errors.push({
        code: 'INVALID_SEGMENT_ID',
        message: `Segment ID ${segment.segmentId} is not valid (must be 3 uppercase letters)`,
        segmentId: segment.segmentId,
        severity: 'error',
      });
    }

    // Validate segment has at least one element for most segments
    const segmentsWithoutData = ['UNS']; // Section separator has no data
    if (!segmentsWithoutData.includes(segment.segmentId) && segment.elements.length === 0) {
      errors.push({
        code: 'EMPTY_SEGMENT',
        message: `Segment ${segment.segmentId} has no data elements`,
        segmentId: segment.segmentId,
        severity: 'warning',
      });
    }

    return errors;
  }

  /**
   * Validate syntax version is supported
   */
  validateSyntaxVersion(version: string, release: string): EdifactValidationError[] {
    const errors: EdifactValidationError[] = [];

    const supportedVersions: EdifactSyntaxVersion[] = [
      'D96A',
      'D01B',
      'D96B',
      'D97A',
      'D99A',
      'D99B',
      'D00A',
      'D01A',
    ];
    const fullVersion = `${version}${release}` as EdifactSyntaxVersion;

    if (!supportedVersions.includes(fullVersion)) {
      errors.push({
        code: 'UNSUPPORTED_SYNTAX_VERSION',
        message: `Syntax version ${fullVersion} may not be fully supported. Supported versions: ${supportedVersions.join(', ')}`,
        segmentId: 'UNH',
        elementIndex: 2,
        severity: 'warning',
      });
    }

    return errors;
  }
}
