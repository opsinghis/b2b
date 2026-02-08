import { Injectable } from '@nestjs/common';
import { X12TransactionSet, X12Segment, X12ParseError } from '../interfaces';
import { X12_997_FunctionalAck } from '../interfaces/transaction-sets.types';

/**
 * X12 997 Functional Acknowledgment Parser
 */
@Injectable()
export class X12_997_ParserService {
  /**
   * Parse 997 transaction set
   */
  parse(transactionSet: X12TransactionSet): {
    data?: X12_997_FunctionalAck;
    errors: X12ParseError[];
  } {
    const errors: X12ParseError[] = [];
    const segments = transactionSet.segments;

    // Find AK1 segment (required)
    const ak1Segment = segments.find((s) => s.segmentId === 'AK1');
    if (!ak1Segment) {
      errors.push({
        code: 'MISSING_AK1',
        message: 'AK1 segment is required for 997',
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'AK1',
        severity: 'error',
      });
      return { errors };
    }

    // Find AK9 segment (required)
    const ak9Segment = segments.find((s) => s.segmentId === 'AK9');
    if (!ak9Segment) {
      errors.push({
        code: 'MISSING_AK9',
        message: 'AK9 segment is required for 997',
        position: { line: 1, column: 1, offset: 0 },
        segmentId: 'AK9',
        severity: 'error',
      });
      return { errors };
    }

    const data: X12_997_FunctionalAck = {
      transactionSetCode: '997',
      controlNumber: transactionSet.header.controlNumber,
      ak1: this.parseAK1(ak1Segment),
      ak9: this.parseAK9(ak9Segment),
    };

    // Parse AK2/AK3/AK4/AK5 loops (transaction set responses)
    data.transactionSetResponses = this.parseTransactionSetResponses(segments);

    return { data, errors };
  }

  /**
   * Parse AK1 segment
   */
  private parseAK1(segment: X12Segment): X12_997_FunctionalAck['ak1'] {
    return {
      functionalIdCode: this.getElement(segment, 1),
      groupControlNumber: this.getElement(segment, 2),
      versionCode: this.getElement(segment, 3) || undefined,
    };
  }

  /**
   * Parse AK9 segment
   */
  private parseAK9(segment: X12Segment): X12_997_FunctionalAck['ak9'] {
    const includedStr = this.getElement(segment, 2);
    const receivedStr = this.getElement(segment, 3);
    const acceptedStr = this.getElement(segment, 4);

    const ak9: X12_997_FunctionalAck['ak9'] = {
      functionalGroupAcknowledgeCode: this.getElement(segment, 1),
      numberOfTransactionSetsIncluded: includedStr ? parseInt(includedStr, 10) : 0,
      numberOfReceivedTransactionSets: receivedStr ? parseInt(receivedStr, 10) : 0,
      numberOfAcceptedTransactionSets: acceptedStr ? parseInt(acceptedStr, 10) : 0,
    };

    // Parse syntax error codes (elements 5-10)
    const syntaxErrorCodes: string[] = [];
    for (let i = 5; i <= 10; i++) {
      const code = this.getElement(segment, i);
      if (code) {
        syntaxErrorCodes.push(code);
      }
    }

    if (syntaxErrorCodes.length > 0) {
      ak9.syntaxErrorCodes = syntaxErrorCodes;
    }

    return ak9;
  }

  /**
   * Parse transaction set responses (AK2/AK3/AK4/AK5 loops)
   */
  private parseTransactionSetResponses(
    segments: X12Segment[],
  ): X12_997_FunctionalAck['transactionSetResponses'] {
    const responses: NonNullable<X12_997_FunctionalAck['transactionSetResponses']> = [];

    let currentResponse: NonNullable<X12_997_FunctionalAck['transactionSetResponses']>[0] | null =
      null;
    let currentSegmentErrors: NonNullable<
      NonNullable<X12_997_FunctionalAck['transactionSetResponses']>[0]['segmentErrors']
    > = [];
    let currentSegmentError:
      | NonNullable<
          NonNullable<X12_997_FunctionalAck['transactionSetResponses']>[0]['segmentErrors']
        >[0]
      | null = null;

    for (const segment of segments) {
      if (segment.segmentId === 'AK2') {
        // Save previous response
        if (currentResponse) {
          if (currentSegmentError) {
            currentSegmentErrors.push(currentSegmentError);
          }
          if (currentSegmentErrors.length > 0) {
            currentResponse.segmentErrors = currentSegmentErrors;
          }
          responses.push(currentResponse);
        }

        // Start new response
        currentResponse = {
          transactionSetIdCode: this.getElement(segment, 1),
          transactionSetControlNumber: this.getElement(segment, 2),
          implementationConventionReference: this.getElement(segment, 3) || undefined,
          acknowledgmentCode: '', // Will be filled by AK5
        };
        currentSegmentErrors = [];
        currentSegmentError = null;
      } else if (currentResponse) {
        if (segment.segmentId === 'AK3') {
          // Save previous segment error
          if (currentSegmentError) {
            currentSegmentErrors.push(currentSegmentError);
          }

          // Start new segment error
          currentSegmentError = {
            segmentIdCode: this.getElement(segment, 1),
            segmentPositionInTransactionSet: parseInt(this.getElement(segment, 2), 10),
            loopIdCode: this.getElement(segment, 3) || undefined,
            segmentSyntaxErrorCode: this.getElement(segment, 4) || undefined,
          };
        } else if (segment.segmentId === 'AK4' && currentSegmentError) {
          currentSegmentError.elementErrors = currentSegmentError.elementErrors || [];
          currentSegmentError.elementErrors.push(this.parseAK4(segment));
        } else if (segment.segmentId === 'AK5') {
          // Save final segment error
          if (currentSegmentError) {
            currentSegmentErrors.push(currentSegmentError);
            currentSegmentError = null;
          }

          currentResponse.acknowledgmentCode = this.getElement(segment, 1);

          // Parse syntax error codes (elements 2-6)
          const syntaxErrorCodes: string[] = [];
          for (let i = 2; i <= 6; i++) {
            const code = this.getElement(segment, i);
            if (code) {
              syntaxErrorCodes.push(code);
            }
          }

          if (syntaxErrorCodes.length > 0) {
            currentResponse.syntaxErrorCodes = syntaxErrorCodes;
          }

          // Save segment errors
          if (currentSegmentErrors.length > 0) {
            currentResponse.segmentErrors = currentSegmentErrors;
          }

          responses.push(currentResponse);
          currentResponse = null;
          currentSegmentErrors = [];
        }
      }
    }

    // Save last response if AK5 was missing
    if (currentResponse) {
      if (currentSegmentError) {
        currentSegmentErrors.push(currentSegmentError);
      }
      if (currentSegmentErrors.length > 0) {
        currentResponse.segmentErrors = currentSegmentErrors;
      }
      responses.push(currentResponse);
    }

    return responses.length > 0 ? responses : undefined;
  }

  /**
   * Parse AK4 segment
   */
  private parseAK4(
    segment: X12Segment,
  ): NonNullable<
    NonNullable<
      NonNullable<X12_997_FunctionalAck['transactionSetResponses']>[0]['segmentErrors']
    >[0]['elementErrors']
  >[0] {
    const positionStr = this.getElement(segment, 1);
    const componentPosStr = this.getElement(segment, 2);
    const dataRefStr = this.getElement(segment, 3);

    return {
      elementPositionInSegment: parseInt(positionStr, 10) || 0,
      componentDataElementPositionInComposite: componentPosStr
        ? parseInt(componentPosStr, 10)
        : undefined,
      dataElementReferenceNumber: dataRefStr ? parseInt(dataRefStr, 10) : undefined,
      dataElementSyntaxErrorCode: this.getElement(segment, 4),
      copyOfBadDataElement: this.getElement(segment, 5) || undefined,
    };
  }

  /**
   * Get element value by position (1-based)
   */
  private getElement(segment: X12Segment, position: number): string {
    return segment.elements[position - 1]?.value || '';
  }
}
