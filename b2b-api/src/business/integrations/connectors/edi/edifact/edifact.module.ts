import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  EdifactLexerService,
  EdifactParserService,
  EdifactGeneratorService,
  EdifactService,
  EdifactMapperService,
  EdifactValidatorService,
} from './services';
import {
  EdifactOrdersParserService,
  EdifactOrdersGeneratorService,
  EdifactOrdrspParserService,
  EdifactDesadvParserService,
  EdifactInvoicParserService,
} from './message-types';

/**
 * EDIFACT Module
 *
 * Provides EDIFACT parsing, generation, and validation services.
 * Supports message types: ORDERS, ORDRSP, DESADV, INVOIC
 * Supports syntax versions: D96A, D01B (and others)
 */
@Module({
  imports: [ConfigModule],
  providers: [
    // Core services
    EdifactLexerService,
    EdifactParserService,
    EdifactGeneratorService,
    EdifactValidatorService,
    EdifactService,
    EdifactMapperService,

    // Message type parsers
    EdifactOrdersParserService,
    EdifactOrdrspParserService,
    EdifactDesadvParserService,
    EdifactInvoicParserService,

    // Message type generators
    EdifactOrdersGeneratorService,
  ],
  exports: [
    // Main service
    EdifactService,
    EdifactMapperService,
    EdifactValidatorService,

    // Low-level services for advanced usage
    EdifactLexerService,
    EdifactParserService,
    EdifactGeneratorService,

    // Message type services
    EdifactOrdersParserService,
    EdifactOrdersGeneratorService,
    EdifactOrdrspParserService,
    EdifactDesadvParserService,
    EdifactInvoicParserService,
  ],
})
export class EdifactModule {}
