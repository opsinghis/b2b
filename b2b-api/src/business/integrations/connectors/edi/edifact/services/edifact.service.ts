import { Injectable } from '@nestjs/common';
import { EdifactLexerService } from './edifact-lexer.service';
import { EdifactParserService } from './edifact-parser.service';
import { EdifactGeneratorService } from './edifact-generator.service';
import {
  EdifactInterchange,
  EdifactMessage,
  EdifactParseResult,
  EdifactDelimiters,
  EdifactGenerationOptions,
  EdifactSyntaxVersion,
  DEFAULT_EDIFACT_DELIMITERS,
  Edifact_ORDERS,
  Edifact_ORDRSP,
  Edifact_DESADV,
  Edifact_INVOIC,
  EdifactMessageData,
} from '../interfaces';
import {
  EdifactOrdersParserService,
  EdifactOrdersGeneratorService,
  EdifactOrdrspParserService,
  EdifactDesadvParserService,
  EdifactInvoicParserService,
} from '../message-types';

/**
 * Main EDIFACT Service
 *
 * High-level service for parsing and generating EDIFACT documents.
 * Supports message types: ORDERS, ORDRSP, DESADV, INVOIC
 * Supports syntax versions: D96A, D01B
 */
@Injectable()
export class EdifactService {
  constructor(
    private readonly lexer: EdifactLexerService,
    private readonly parser: EdifactParserService,
    private readonly generator: EdifactGeneratorService,
    private readonly ordersParser: EdifactOrdersParserService,
    private readonly ordersGenerator: EdifactOrdersGeneratorService,
    private readonly ordrspParser: EdifactOrdrspParserService,
    private readonly desadvParser: EdifactDesadvParserService,
    private readonly invoicParser: EdifactInvoicParserService,
  ) {}

  /**
   * Parse raw EDIFACT document
   */
  parseDocument(input: string): EdifactParseResult {
    return this.parser.parse(input);
  }

  /**
   * Generate EDIFACT document from interchange
   */
  generateDocument(interchange: EdifactInterchange, options?: EdifactGenerationOptions): string {
    return this.generator.generate(interchange, options);
  }

  /**
   * Parse EDIFACT document and extract typed messages
   */
  parseAndExtractMessages(input: string): {
    success: boolean;
    errors: EdifactParseResult['errors'];
    warnings: EdifactParseResult['warnings'];
    messages: EdifactMessageData[];
  } {
    const result = this.parser.parse(input);

    if (!result.success || !result.interchange) {
      return {
        success: false,
        errors: result.errors,
        warnings: result.warnings,
        messages: [],
      };
    }

    const messages: EdifactMessageData[] = [];
    const allMessages = result.interchange.messages || [];

    // Also extract messages from functional groups
    if (result.interchange.functionalGroups) {
      for (const group of result.interchange.functionalGroups) {
        allMessages.push(...group.messages);
      }
    }

    for (const message of allMessages) {
      const messageType = message.header.messageIdentifier.type;
      const parsedMessage = this.parseMessageByType(message);
      if (parsedMessage) {
        messages.push(parsedMessage);
      }
    }

    return {
      success: true,
      errors: result.errors,
      warnings: result.warnings,
      messages,
    };
  }

  /**
   * Parse a single message by its type
   */
  parseMessageByType(message: EdifactMessage): EdifactMessageData | null {
    const messageType = message.header.messageIdentifier.type;

    switch (messageType) {
      case 'ORDERS':
        return this.ordersParser.parse(message);
      case 'ORDRSP':
        return this.ordrspParser.parse(message);
      case 'DESADV':
        return this.desadvParser.parse(message);
      case 'INVOIC':
        return this.invoicParser.parse(message);
      default:
        return null;
    }
  }

  /**
   * Parse ORDERS message from raw document
   */
  parseOrders(input: string): Edifact_ORDERS | null {
    const result = this.parseAndExtractMessages(input);
    if (!result.success) return null;

    const ordersMessages = result.messages.filter(
      (m): m is Edifact_ORDERS => m.messageType === 'ORDERS',
    );
    return ordersMessages[0] || null;
  }

  /**
   * Parse INVOIC message from raw document
   */
  parseInvoice(input: string): Edifact_INVOIC | null {
    const result = this.parseAndExtractMessages(input);
    if (!result.success) return null;

    const invoicMessages = result.messages.filter(
      (m): m is Edifact_INVOIC => m.messageType === 'INVOIC',
    );
    return invoicMessages[0] || null;
  }

  /**
   * Parse DESADV message from raw document
   */
  parseDespatchAdvice(input: string): Edifact_DESADV | null {
    const result = this.parseAndExtractMessages(input);
    if (!result.success) return null;

    const desadvMessages = result.messages.filter(
      (m): m is Edifact_DESADV => m.messageType === 'DESADV',
    );
    return desadvMessages[0] || null;
  }

  /**
   * Parse ORDRSP message from raw document
   */
  parseOrderResponse(input: string): Edifact_ORDRSP | null {
    const result = this.parseAndExtractMessages(input);
    if (!result.success) return null;

    const ordrspMessages = result.messages.filter(
      (m): m is Edifact_ORDRSP => m.messageType === 'ORDRSP',
    );
    return ordrspMessages[0] || null;
  }

  /**
   * Generate ORDERS message
   */
  generateOrders(
    orders: Edifact_ORDERS,
    senderConfig: {
      senderId: string;
      senderQualifier?: string;
    },
    recipientConfig: {
      recipientId: string;
      recipientQualifier?: string;
    },
    options?: {
      version?: string;
      release?: string;
      testIndicator?: boolean;
      delimiters?: Partial<EdifactDelimiters>;
      lineBreaks?: boolean;
    },
  ): string {
    const version = options?.version || 'D';
    const release = options?.release || '96A';

    const message = this.ordersGenerator.generate(orders, version, release);

    const interchange = this.generator.buildInterchange([message], senderConfig, recipientConfig, {
      testIndicator: options?.testIndicator,
      delimiters: options?.delimiters,
    });

    return this.generator.generate(interchange, {
      delimiters: options?.delimiters,
      lineBreaks: options?.lineBreaks,
    });
  }

  /**
   * Generate complete interchange from multiple messages
   */
  generateInterchange(
    messages: EdifactMessage[],
    senderConfig: {
      senderId: string;
      senderQualifier?: string;
    },
    recipientConfig: {
      recipientId: string;
      recipientQualifier?: string;
    },
    options?: EdifactGenerationOptions & {
      testIndicator?: boolean;
    },
  ): string {
    const interchange = this.generator.buildInterchange(messages, senderConfig, recipientConfig, {
      testIndicator: options?.testIndicator,
      useFunctionalGroups: options?.useFunctionalGroups,
      delimiters: options?.delimiters,
    });

    return this.generator.generate(interchange, options);
  }

  /**
   * Validate EDIFACT document syntax
   */
  validateSyntax(input: string): {
    valid: boolean;
    errors: EdifactParseResult['errors'];
    warnings: EdifactParseResult['warnings'];
  } {
    const result = this.parser.parse(input);
    return {
      valid: result.success,
      errors: result.errors,
      warnings: result.warnings,
    };
  }

  /**
   * Get syntax version from document
   */
  getDocumentVersion(input: string): { version?: string; release?: string } | null {
    const result = this.parser.parse(input);
    if (!result.success || !result.interchange) return null;

    const firstMessage =
      result.interchange.messages?.[0] || result.interchange.functionalGroups?.[0]?.messages[0];

    if (!firstMessage) return null;

    return {
      version: firstMessage.header.messageIdentifier.version,
      release: firstMessage.header.messageIdentifier.release,
    };
  }

  /**
   * Get message type from document
   */
  getMessageType(input: string): string | null {
    const result = this.parser.parse(input);
    if (!result.success || !result.interchange) return null;

    const firstMessage =
      result.interchange.messages?.[0] || result.interchange.functionalGroups?.[0]?.messages[0];

    return firstMessage?.header.messageIdentifier.type || null;
  }

  /**
   * Extract delimiters from document
   */
  extractDelimiters(input: string): EdifactDelimiters {
    const delimResult = this.lexer.extractDelimiters(input);
    return {
      componentSeparator: delimResult.componentSeparator,
      elementSeparator: delimResult.elementSeparator,
      decimalNotation: delimResult.decimalNotation,
      releaseCharacter: delimResult.releaseCharacter,
      segmentTerminator: delimResult.segmentTerminator,
    };
  }
}
