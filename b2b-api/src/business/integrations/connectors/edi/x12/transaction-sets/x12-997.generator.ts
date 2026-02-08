import { Injectable } from '@nestjs/common';
import {
  X12TransactionSet,
  X12Segment,
  X12FunctionalGroup,
  STSegment,
  SESegment,
} from '../interfaces';
import {
  X12_997_FunctionalAck,
  X12_997_AcknowledgmentCode,
  X12_997_GroupAckCode,
} from '../interfaces/transaction-sets.types';

/**
 * X12 997 Functional Acknowledgment Generator
 */
@Injectable()
export class X12_997_GeneratorService {
  /**
   * Generate 997 functional acknowledgment for received functional group
   */
  generateForFunctionalGroup(
    functionalGroup: X12FunctionalGroup,
    acknowledged: boolean = true,
    controlNumber?: string,
  ): X12TransactionSet {
    const transactionSets = functionalGroup.transactionSets;
    const receivedCount = transactionSets.length;
    const acceptedCount = acknowledged ? receivedCount : 0;

    const data: X12_997_FunctionalAck = {
      transactionSetCode: '997',
      controlNumber: controlNumber || '0001',
      ak1: {
        functionalIdCode: functionalGroup.header.functionalCode,
        groupControlNumber: functionalGroup.header.controlNumber,
        versionCode: functionalGroup.header.versionCode,
      },
      transactionSetResponses: transactionSets.map((ts) => ({
        transactionSetIdCode: ts.header.transactionSetCode,
        transactionSetControlNumber: ts.header.controlNumber,
        acknowledgmentCode: acknowledged
          ? X12_997_AcknowledgmentCode.A
          : X12_997_AcknowledgmentCode.R,
      })),
      ak9: {
        functionalGroupAcknowledgeCode: acknowledged
          ? X12_997_GroupAckCode.A
          : X12_997_GroupAckCode.R,
        numberOfTransactionSetsIncluded: receivedCount,
        numberOfReceivedTransactionSets: receivedCount,
        numberOfAcceptedTransactionSets: acceptedCount,
      },
    };

    return this.generate(data, controlNumber);
  }

  /**
   * Generate 997 transaction set from data
   */
  generate(data: X12_997_FunctionalAck, controlNumber?: string): X12TransactionSet {
    const segments: X12Segment[] = [];
    const stControlNumber = controlNumber || data.controlNumber || '0001';

    // AK1 segment
    segments.push(this.generateAK1(data.ak1));

    // AK2/AK3/AK4/AK5 loops
    if (data.transactionSetResponses) {
      for (const response of data.transactionSetResponses) {
        segments.push(...this.generateTransactionSetResponse(response));
      }
    }

    // AK9 segment
    segments.push(this.generateAK9(data.ak9));

    const header: STSegment = {
      segmentId: 'ST',
      transactionSetCode: '997',
      controlNumber: stControlNumber.padStart(4, '0'),
    };

    const trailer: SESegment = {
      segmentId: 'SE',
      numberOfSegments: segments.length + 2, // Include ST and SE
      controlNumber: stControlNumber.padStart(4, '0'),
    };

    return { header, segments, trailer };
  }

  private generateAK1(ak1: X12_997_FunctionalAck['ak1']): X12Segment {
    const elements = [{ value: ak1.functionalIdCode }, { value: ak1.groupControlNumber }];

    if (ak1.versionCode) {
      elements.push({ value: ak1.versionCode });
    }

    return {
      segmentId: 'AK1',
      elements,
    };
  }

  private generateTransactionSetResponse(
    response: NonNullable<X12_997_FunctionalAck['transactionSetResponses']>[0],
  ): X12Segment[] {
    const segments: X12Segment[] = [];

    // AK2 segment
    const ak2Elements = [
      { value: response.transactionSetIdCode },
      { value: response.transactionSetControlNumber },
    ];

    if (response.implementationConventionReference) {
      ak2Elements.push({ value: response.implementationConventionReference });
    }

    segments.push({
      segmentId: 'AK2',
      elements: ak2Elements,
    });

    // AK3/AK4 segments for segment errors
    if (response.segmentErrors) {
      for (const segmentError of response.segmentErrors) {
        segments.push(this.generateAK3(segmentError));

        if (segmentError.elementErrors) {
          for (const elementError of segmentError.elementErrors) {
            segments.push(this.generateAK4(elementError));
          }
        }
      }
    }

    // AK5 segment
    segments.push(this.generateAK5(response.acknowledgmentCode, response.syntaxErrorCodes));

    return segments;
  }

  private generateAK3(
    segmentError: NonNullable<
      NonNullable<X12_997_FunctionalAck['transactionSetResponses']>[0]['segmentErrors']
    >[0],
  ): X12Segment {
    const elements = [
      { value: segmentError.segmentIdCode },
      { value: segmentError.segmentPositionInTransactionSet.toString() },
    ];

    if (segmentError.loopIdCode) {
      elements.push({ value: segmentError.loopIdCode });
    } else {
      elements.push({ value: '' });
    }

    if (segmentError.segmentSyntaxErrorCode) {
      elements.push({ value: segmentError.segmentSyntaxErrorCode });
    }

    return {
      segmentId: 'AK3',
      elements,
    };
  }

  private generateAK4(
    elementError: NonNullable<
      NonNullable<
        NonNullable<X12_997_FunctionalAck['transactionSetResponses']>[0]['segmentErrors']
      >[0]['elementErrors']
    >[0],
  ): X12Segment {
    const elements = [
      { value: elementError.elementPositionInSegment.toString() },
      { value: elementError.componentDataElementPositionInComposite?.toString() || '' },
      { value: elementError.dataElementReferenceNumber?.toString() || '' },
      { value: elementError.dataElementSyntaxErrorCode },
    ];

    if (elementError.copyOfBadDataElement) {
      elements.push({ value: elementError.copyOfBadDataElement });
    }

    return {
      segmentId: 'AK4',
      elements,
    };
  }

  private generateAK5(acknowledgmentCode: string, syntaxErrorCodes?: string[]): X12Segment {
    const elements = [{ value: acknowledgmentCode }];

    if (syntaxErrorCodes) {
      for (const code of syntaxErrorCodes) {
        elements.push({ value: code });
      }
    }

    return {
      segmentId: 'AK5',
      elements,
    };
  }

  private generateAK9(ak9: X12_997_FunctionalAck['ak9']): X12Segment {
    const elements = [
      { value: ak9.functionalGroupAcknowledgeCode },
      { value: ak9.numberOfTransactionSetsIncluded.toString() },
      { value: ak9.numberOfReceivedTransactionSets.toString() },
      { value: ak9.numberOfAcceptedTransactionSets.toString() },
    ];

    if (ak9.syntaxErrorCodes) {
      for (const code of ak9.syntaxErrorCodes) {
        elements.push({ value: code });
      }
    }

    return {
      segmentId: 'AK9',
      elements,
    };
  }
}
