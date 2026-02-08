import { Injectable } from '@nestjs/common';
import { X12ParserService } from './x12-parser.service';
import { X12GeneratorService } from './x12-generator.service';
import { X12ValidatorService } from './x12-validator.service';
import {
  X12_850_ParserService,
  X12_850_GeneratorService,
  X12_855_ParserService,
  X12_856_ParserService,
  X12_810_ParserService,
  X12_997_ParserService,
  X12_997_GeneratorService,
} from '../transaction-sets';
import {
  X12Interchange,
  X12TransactionSet,
  X12ParseResult,
  X12ParseError,
  X12ValidationError,
  X12GenerationOptions,
  TransactionSetType,
} from '../interfaces';
import {
  X12TransactionSetData,
  X12_850_PurchaseOrder,
  X12_997_FunctionalAck,
} from '../interfaces/transaction-sets.types';

/**
 * Unified X12 EDI Service
 *
 * Provides a high-level API for parsing, generating, and validating X12 documents.
 */
@Injectable()
export class X12Service {
  constructor(
    private readonly parser: X12ParserService,
    private readonly generator: X12GeneratorService,
    private readonly validator: X12ValidatorService,
    private readonly parser850: X12_850_ParserService,
    private readonly generator850: X12_850_GeneratorService,
    private readonly parser855: X12_855_ParserService,
    private readonly parser856: X12_856_ParserService,
    private readonly parser810: X12_810_ParserService,
    private readonly parser997: X12_997_ParserService,
    private readonly generator997: X12_997_GeneratorService,
  ) {}

  /**
   * Parse X12 document from string
   */
  parseDocument(input: string): X12ParseResult {
    return this.parser.parse(input);
  }

  /**
   * Generate X12 document string from interchange
   */
  generateDocument(interchange: X12Interchange, options?: X12GenerationOptions): string {
    return this.generator.generate(interchange, options);
  }

  /**
   * Validate X12 interchange
   */
  validateInterchange(interchange: X12Interchange): X12ValidationError[] {
    return this.validator.validateInterchange(interchange);
  }

  /**
   * Parse and extract all transaction sets with typed data
   */
  parseAndExtractTransactionSets(input: string): {
    interchange?: X12Interchange;
    transactionSets: Array<{
      type: string;
      controlNumber: string;
      data?: X12TransactionSetData;
      errors: X12ParseError[];
    }>;
    errors: X12ParseError[];
  } {
    const parseResult = this.parseDocument(input);

    if (!parseResult.success || !parseResult.interchange) {
      return {
        transactionSets: [],
        errors: parseResult.errors,
      };
    }

    const transactionSets: Array<{
      type: string;
      controlNumber: string;
      data?: X12TransactionSetData;
      errors: X12ParseError[];
    }> = [];

    for (const group of parseResult.interchange.functionalGroups) {
      for (const transactionSet of group.transactionSets) {
        const result = this.parseTransactionSet(transactionSet);
        transactionSets.push({
          type: transactionSet.header.transactionSetCode,
          controlNumber: transactionSet.header.controlNumber,
          data: result.data,
          errors: result.errors,
        });
      }
    }

    return {
      interchange: parseResult.interchange,
      transactionSets,
      errors: parseResult.errors,
    };
  }

  /**
   * Parse individual transaction set into typed data
   */
  parseTransactionSet(transactionSet: X12TransactionSet): {
    data?: X12TransactionSetData;
    errors: X12ParseError[];
  } {
    const type = transactionSet.header.transactionSetCode;

    switch (type) {
      case TransactionSetType.PO_850:
        return this.parser850.parse(transactionSet);

      case TransactionSetType.POA_855:
        return this.parser855.parse(transactionSet);

      case TransactionSetType.ASN_856:
        return this.parser856.parse(transactionSet);

      case TransactionSetType.INV_810:
        return this.parser810.parse(transactionSet);

      case TransactionSetType.FA_997:
        return this.parser997.parse(transactionSet);

      default:
        return {
          errors: [
            {
              code: 'UNSUPPORTED_TRANSACTION_SET',
              message: `Transaction set type ${type} is not supported`,
              position: { line: 1, column: 1, offset: 0 },
              severity: 'error',
            },
          ],
        };
    }
  }

  /**
   * Generate 850 Purchase Order document
   */
  generate850(
    purchaseOrder: X12_850_PurchaseOrder,
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
    options?: X12GenerationOptions,
  ): string {
    const transactionSet = this.generator850.generate(purchaseOrder);

    const interchange = this.generator.buildInterchange(
      [transactionSet],
      senderConfig,
      receiverConfig,
      options,
    );

    return this.generator.generate(interchange, options);
  }

  /**
   * Generate 997 Functional Acknowledgment for received document
   */
  generate997ForDocument(
    input: string,
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
    options?: X12GenerationOptions,
  ): string | null {
    const parseResult = this.parseDocument(input);

    if (!parseResult.interchange) {
      return null;
    }

    const ackTransactionSets: X12TransactionSet[] = [];

    for (const group of parseResult.interchange.functionalGroups) {
      const ackSet = this.generator997.generateForFunctionalGroup(
        group,
        parseResult.errors.length === 0,
      );
      ackTransactionSets.push(ackSet);
    }

    const interchange = this.generator.buildInterchange(
      ackTransactionSets,
      senderConfig,
      receiverConfig,
      options,
    );

    return this.generator.generate(interchange, options);
  }

  /**
   * Generate 997 from explicit data
   */
  generate997(
    functionalAck: X12_997_FunctionalAck,
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
    options?: X12GenerationOptions,
  ): string {
    const transactionSet = this.generator997.generate(functionalAck);

    const interchange = this.generator.buildInterchange(
      [transactionSet],
      senderConfig,
      receiverConfig,
      options,
    );

    return this.generator.generate(interchange, options);
  }

  /**
   * Get transaction set type from code
   */
  getTransactionSetType(code: string): TransactionSetType | null {
    const mapping: Record<string, TransactionSetType> = {
      '850': TransactionSetType.PO_850,
      '855': TransactionSetType.POA_855,
      '856': TransactionSetType.ASN_856,
      '810': TransactionSetType.INV_810,
      '997': TransactionSetType.FA_997,
    };

    return mapping[code] || null;
  }

  /**
   * Check if transaction set type is supported
   */
  isTransactionSetSupported(code: string): boolean {
    return ['850', '855', '856', '810', '997'].includes(code);
  }
}
