import { Injectable } from '@nestjs/common';
import { EdifactLexerService } from './edifact-lexer.service';
import {
  EdifactInterchange,
  EdifactFunctionalGroup,
  EdifactMessage,
  EdifactSegment,
  EdifactDelimiters,
  EdifactGenerationOptions,
  EdifactSyntaxVersion,
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
 * EDIFACT Generator Service
 *
 * Generates EDIFACT documents from structured objects.
 */
@Injectable()
export class EdifactGeneratorService {
  constructor(private readonly lexer: EdifactLexerService) {}

  /**
   * Generate EDIFACT document from interchange
   */
  generate(interchange: EdifactInterchange, options?: EdifactGenerationOptions): string {
    const delimiters = this.mergeDelimiters(interchange.delimiters, options?.delimiters);
    const lineBreak = options?.lineBreaks ? '\n' : '';
    const includeUNA = options?.includeUNA !== false;

    const segments: string[] = [];

    // UNA segment (optional but recommended)
    if (includeUNA) {
      segments.push(this.generateUNASegment(delimiters));
    }

    // UNB segment
    segments.push(this.generateUNBSegment(interchange.header, delimiters));

    // Functional groups or direct messages
    if (interchange.functionalGroups && interchange.functionalGroups.length > 0) {
      for (const group of interchange.functionalGroups) {
        segments.push(this.generateUNGSegment(group.header, delimiters));

        for (const message of group.messages) {
          segments.push(this.generateUNHSegment(message.header, delimiters));

          for (const segment of message.segments) {
            segments.push(this.generateSegment(segment, delimiters));
          }

          segments.push(this.generateUNTSegment(message.trailer, delimiters));
        }

        segments.push(this.generateUNESegment(group.trailer, delimiters));
      }
    } else if (interchange.messages && interchange.messages.length > 0) {
      for (const message of interchange.messages) {
        segments.push(this.generateUNHSegment(message.header, delimiters));

        for (const segment of message.segments) {
          segments.push(this.generateSegment(segment, delimiters));
        }

        segments.push(this.generateUNTSegment(message.trailer, delimiters));
      }
    }

    // UNZ segment
    segments.push(this.generateUNZSegment(interchange.trailer, delimiters));

    return segments.join(lineBreak);
  }

  /**
   * Generate UNA segment (service string advice)
   */
  generateUNASegment(delimiters: EdifactDelimiters): string {
    return `UNA${delimiters.componentSeparator}${delimiters.elementSeparator}${delimiters.decimalNotation}${delimiters.releaseCharacter} ${delimiters.segmentTerminator}`;
  }

  /**
   * Generate UNB segment
   */
  generateUNBSegment(unb: UNBSegment, delimiters: EdifactDelimiters): string {
    const { elementSeparator: sep, componentSeparator: comp, segmentTerminator: term } = delimiters;

    const s001 = this.joinComposite(
      [
        unb.syntaxIdentifier.id,
        unb.syntaxIdentifier.version,
        unb.syntaxIdentifier.serviceCodeVersion,
        unb.syntaxIdentifier.characterEncoding,
      ],
      comp,
    );

    const s002 = this.joinComposite(
      [unb.sender.id, unb.sender.qualifier, unb.sender.reverseRoutingAddress],
      comp,
    );

    const s003 = this.joinComposite(
      [unb.recipient.id, unb.recipient.qualifier, unb.recipient.routingAddress],
      comp,
    );

    const s004 = this.joinComposite([unb.dateTime.date, unb.dateTime.time], comp);

    const elements = ['UNB', s001, s002, s003, s004, unb.controlReference];

    // Optional elements
    if (unb.recipientReference) {
      elements.push(
        this.joinComposite(
          [unb.recipientReference.reference, unb.recipientReference.qualifier],
          comp,
        ),
      );
    } else if (
      unb.applicationReference ||
      unb.processingPriorityCode ||
      unb.acknowledgementRequest ||
      unb.agreementIdentifier ||
      unb.testIndicator
    ) {
      elements.push('');
    }

    if (unb.applicationReference) {
      elements.push(unb.applicationReference);
    } else if (
      unb.processingPriorityCode ||
      unb.acknowledgementRequest ||
      unb.agreementIdentifier ||
      unb.testIndicator
    ) {
      elements.push('');
    }

    if (unb.processingPriorityCode) {
      elements.push(unb.processingPriorityCode);
    } else if (unb.acknowledgementRequest || unb.agreementIdentifier || unb.testIndicator) {
      elements.push('');
    }

    if (unb.acknowledgementRequest) {
      elements.push(unb.acknowledgementRequest);
    } else if (unb.agreementIdentifier || unb.testIndicator) {
      elements.push('');
    }

    if (unb.agreementIdentifier) {
      elements.push(unb.agreementIdentifier);
    } else if (unb.testIndicator) {
      elements.push('');
    }

    if (unb.testIndicator) {
      elements.push(unb.testIndicator);
    }

    return this.trimTrailingEmpty(elements).join(sep) + term;
  }

  /**
   * Generate UNZ segment
   */
  generateUNZSegment(unz: UNZSegment, delimiters: EdifactDelimiters): string {
    const { elementSeparator: sep, segmentTerminator: term } = delimiters;
    return ['UNZ', unz.controlCount.toString(), unz.controlReference].join(sep) + term;
  }

  /**
   * Generate UNG segment
   */
  generateUNGSegment(ung: UNGSegment, delimiters: EdifactDelimiters): string {
    const { elementSeparator: sep, componentSeparator: comp, segmentTerminator: term } = delimiters;

    const s006 = this.joinComposite(
      [ung.senderIdentification.id, ung.senderIdentification.qualifier],
      comp,
    );

    const s007 = this.joinComposite(
      [ung.recipientIdentification.id, ung.recipientIdentification.qualifier],
      comp,
    );

    const s004 = this.joinComposite([ung.dateTime.date, ung.dateTime.time], comp);

    const s008 = this.joinComposite(
      [
        ung.messageVersion.versionNumber,
        ung.messageVersion.releaseNumber,
        ung.messageVersion.associationAssignedCode,
      ],
      comp,
    );

    const elements = [
      'UNG',
      ung.groupIdentification,
      s006,
      s007,
      s004,
      ung.referenceNumber,
      ung.controllingAgency,
      s008,
    ];

    if (ung.applicationPassword) {
      elements.push(ung.applicationPassword);
    }

    return this.trimTrailingEmpty(elements).join(sep) + term;
  }

  /**
   * Generate UNE segment
   */
  generateUNESegment(une: UNESegment, delimiters: EdifactDelimiters): string {
    const { elementSeparator: sep, segmentTerminator: term } = delimiters;
    return ['UNE', une.messageCount.toString(), une.referenceNumber].join(sep) + term;
  }

  /**
   * Generate UNH segment
   */
  generateUNHSegment(unh: UNHSegment, delimiters: EdifactDelimiters): string {
    const { elementSeparator: sep, componentSeparator: comp, segmentTerminator: term } = delimiters;

    const s009 = this.joinComposite(
      [
        unh.messageIdentifier.type,
        unh.messageIdentifier.version,
        unh.messageIdentifier.release,
        unh.messageIdentifier.controllingAgency,
        unh.messageIdentifier.associationAssignedCode,
        unh.messageIdentifier.codeListVersion,
        unh.messageIdentifier.subFunction,
      ],
      comp,
    );

    const elements = ['UNH', unh.messageReferenceNumber, s009];

    if (unh.commonAccessReference) {
      elements.push(unh.commonAccessReference);
    } else if (
      unh.statusOfTransfer ||
      unh.messageSubsetId ||
      unh.implementationGuidelineId ||
      unh.scenarioId
    ) {
      elements.push('');
    }

    if (unh.statusOfTransfer) {
      elements.push(
        this.joinComposite(
          [unh.statusOfTransfer.sequenceOfTransfers, unh.statusOfTransfer.firstAndLastTransfer],
          comp,
        ),
      );
    } else if (unh.messageSubsetId || unh.implementationGuidelineId || unh.scenarioId) {
      elements.push('');
    }

    if (unh.messageSubsetId) {
      elements.push(
        this.joinComposite(
          [
            unh.messageSubsetId.id,
            unh.messageSubsetId.version,
            unh.messageSubsetId.release,
            unh.messageSubsetId.controllingAgency,
          ],
          comp,
        ),
      );
    } else if (unh.implementationGuidelineId || unh.scenarioId) {
      elements.push('');
    }

    if (unh.implementationGuidelineId) {
      elements.push(
        this.joinComposite(
          [
            unh.implementationGuidelineId.id,
            unh.implementationGuidelineId.version,
            unh.implementationGuidelineId.release,
            unh.implementationGuidelineId.controllingAgency,
          ],
          comp,
        ),
      );
    } else if (unh.scenarioId) {
      elements.push('');
    }

    if (unh.scenarioId) {
      elements.push(
        this.joinComposite(
          [
            unh.scenarioId.id,
            unh.scenarioId.version,
            unh.scenarioId.release,
            unh.scenarioId.controllingAgency,
          ],
          comp,
        ),
      );
    }

    return this.trimTrailingEmpty(elements).join(sep) + term;
  }

  /**
   * Generate UNT segment
   */
  generateUNTSegment(unt: UNTSegment, delimiters: EdifactDelimiters): string {
    const { elementSeparator: sep, segmentTerminator: term } = delimiters;
    return ['UNT', unt.segmentCount.toString(), unt.messageReferenceNumber].join(sep) + term;
  }

  /**
   * Generate generic segment
   */
  generateSegment(segment: EdifactSegment, delimiters: EdifactDelimiters): string {
    const { elementSeparator: sep, componentSeparator: comp, segmentTerminator: term } = delimiters;

    const parts = [segment.segmentId];

    for (const element of segment.elements) {
      let value: string;
      if (element.components && element.components.length > 1) {
        value = element.components.map((c) => this.lexer.escape(c, delimiters)).join(comp);
      } else {
        value = this.lexer.escape(element.value, delimiters);
      }
      parts.push(value);
    }

    return this.trimTrailingEmpty(parts).join(sep) + term;
  }

  /**
   * Create UNB segment with defaults
   */
  createUNBSegment(
    senderId: string,
    recipientId: string,
    controlReference: string,
    options?: {
      senderQualifier?: string;
      recipientQualifier?: string;
      syntaxIdentifier?: string;
      syntaxVersion?: string;
      testIndicator?: boolean;
      acknowledgementRequest?: boolean;
    },
  ): UNBSegment {
    const now = new Date();

    return {
      segmentId: 'UNB',
      syntaxIdentifier: {
        id: options?.syntaxIdentifier || 'UNOA',
        version: options?.syntaxVersion || '4',
      },
      sender: {
        id: senderId,
        qualifier: options?.senderQualifier,
      },
      recipient: {
        id: recipientId,
        qualifier: options?.recipientQualifier,
      },
      dateTime: {
        date: this.formatDate(now, 'YYMMDD'),
        time: this.formatTime(now),
      },
      controlReference,
      testIndicator: options?.testIndicator ? '1' : undefined,
      acknowledgementRequest: options?.acknowledgementRequest ? '1' : undefined,
    };
  }

  /**
   * Create UNZ segment
   */
  createUNZSegment(controlCount: number, controlReference: string): UNZSegment {
    return {
      segmentId: 'UNZ',
      controlCount,
      controlReference,
    };
  }

  /**
   * Create UNG segment
   */
  createUNGSegment(
    groupIdentification: string,
    senderId: string,
    recipientId: string,
    referenceNumber: string,
    messageVersion: {
      versionNumber: string;
      releaseNumber: string;
      associationAssignedCode?: string;
    },
  ): UNGSegment {
    const now = new Date();

    return {
      segmentId: 'UNG',
      groupIdentification,
      senderIdentification: { id: senderId },
      recipientIdentification: { id: recipientId },
      dateTime: {
        date: this.formatDate(now, 'YYMMDD'),
        time: this.formatTime(now),
      },
      referenceNumber,
      controllingAgency: 'UN',
      messageVersion,
    };
  }

  /**
   * Create UNE segment
   */
  createUNESegment(messageCount: number, referenceNumber: string): UNESegment {
    return {
      segmentId: 'UNE',
      messageCount,
      referenceNumber,
    };
  }

  /**
   * Create UNH segment
   */
  createUNHSegment(
    messageReferenceNumber: string,
    messageType: string,
    version: string,
    release: string,
    controllingAgency: string = 'UN',
    associationAssignedCode?: string,
  ): UNHSegment {
    return {
      segmentId: 'UNH',
      messageReferenceNumber,
      messageIdentifier: {
        type: messageType,
        version,
        release,
        controllingAgency,
        associationAssignedCode,
      },
    };
  }

  /**
   * Create UNT segment
   */
  createUNTSegment(segmentCount: number, messageReferenceNumber: string): UNTSegment {
    return {
      segmentId: 'UNT',
      segmentCount,
      messageReferenceNumber,
    };
  }

  /**
   * Build complete interchange from messages
   */
  buildInterchange(
    messages: EdifactMessage[],
    senderConfig: {
      senderId: string;
      senderQualifier?: string;
    },
    recipientConfig: {
      recipientId: string;
      recipientQualifier?: string;
    },
    options?: {
      controlReference?: string;
      syntaxIdentifier?: string;
      syntaxVersion?: string;
      testIndicator?: boolean;
      useFunctionalGroups?: boolean;
      delimiters?: Partial<EdifactDelimiters>;
    },
  ): EdifactInterchange {
    const controlReference = options?.controlReference || this.generateControlReference();
    const delimiters = { ...DEFAULT_EDIFACT_DELIMITERS, ...options?.delimiters };

    if (options?.useFunctionalGroups) {
      // Group messages by type
      const groupedMessages = this.groupMessagesByType(messages);
      const functionalGroups: EdifactFunctionalGroup[] = [];

      let groupNumber = 1;
      for (const [messageType, msgs] of Object.entries(groupedMessages)) {
        const groupRef = groupNumber.toString().padStart(4, '0');
        const firstMsg = msgs[0];

        functionalGroups.push({
          header: this.createUNGSegment(
            messageType,
            senderConfig.senderId,
            recipientConfig.recipientId,
            groupRef,
            {
              versionNumber: firstMsg.header.messageIdentifier.version,
              releaseNumber: firstMsg.header.messageIdentifier.release,
              associationAssignedCode: firstMsg.header.messageIdentifier.associationAssignedCode,
            },
          ),
          messages: msgs,
          trailer: this.createUNESegment(msgs.length, groupRef),
        });

        groupNumber++;
      }

      return {
        header: this.createUNBSegment(
          senderConfig.senderId,
          recipientConfig.recipientId,
          controlReference,
          {
            senderQualifier: senderConfig.senderQualifier,
            recipientQualifier: recipientConfig.recipientQualifier,
            syntaxIdentifier: options?.syntaxIdentifier,
            syntaxVersion: options?.syntaxVersion,
            testIndicator: options?.testIndicator,
          },
        ),
        functionalGroups,
        trailer: this.createUNZSegment(functionalGroups.length, controlReference),
        delimiters,
      };
    }

    // No functional groups
    return {
      header: this.createUNBSegment(
        senderConfig.senderId,
        recipientConfig.recipientId,
        controlReference,
        {
          senderQualifier: senderConfig.senderQualifier,
          recipientQualifier: recipientConfig.recipientQualifier,
          syntaxIdentifier: options?.syntaxIdentifier,
          syntaxVersion: options?.syntaxVersion,
          testIndicator: options?.testIndicator,
        },
      ),
      messages,
      trailer: this.createUNZSegment(messages.length, controlReference),
      delimiters,
    };
  }

  /**
   * Group messages by type
   */
  private groupMessagesByType(messages: EdifactMessage[]): Record<string, EdifactMessage[]> {
    const groups: Record<string, EdifactMessage[]> = {};

    for (const message of messages) {
      const type = message.header.messageIdentifier.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(message);
    }

    return groups;
  }

  /**
   * Generate unique control reference
   */
  generateControlReference(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return ((timestamp % 10000000000) + random).toString().slice(0, 14);
  }

  /**
   * Generate message reference number
   */
  generateMessageReference(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return ((timestamp % 100000) * 1000 + random).toString().slice(0, 14);
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
  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return hours + minutes;
  }

  /**
   * Join composite elements, removing trailing empty
   */
  private joinComposite(components: (string | undefined)[], separator: string): string {
    const filtered = this.trimTrailingEmpty(components.map((c) => c || ''));
    return filtered.join(separator);
  }

  /**
   * Remove trailing empty strings from array
   */
  private trimTrailingEmpty(arr: string[]): string[] {
    const result = [...arr];
    while (result.length > 1 && result[result.length - 1] === '') {
      result.pop();
    }
    return result;
  }

  /**
   * Merge delimiters with defaults
   */
  private mergeDelimiters(
    base?: Partial<EdifactDelimiters>,
    override?: Partial<EdifactDelimiters>,
  ): EdifactDelimiters {
    return {
      ...DEFAULT_EDIFACT_DELIMITERS,
      ...base,
      ...override,
    };
  }
}
