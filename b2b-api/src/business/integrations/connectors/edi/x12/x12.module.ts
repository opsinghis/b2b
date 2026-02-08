import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  X12LexerService,
  X12ParserService,
  X12GeneratorService,
  X12ValidatorService,
  X12Service,
  X12MapperService,
} from './services';
import {
  X12_850_ParserService,
  X12_850_GeneratorService,
  X12_855_ParserService,
  X12_856_ParserService,
  X12_810_ParserService,
  X12_997_ParserService,
  X12_997_GeneratorService,
} from './transaction-sets';

/**
 * X12 EDI Module
 *
 * Provides X12 EDI parsing, generation, and validation services.
 * Supports transaction sets: 850, 855, 856, 810, 997
 * Supports versions: 4010, 5010
 */
@Module({
  imports: [ConfigModule],
  providers: [
    // Core services
    X12LexerService,
    X12ParserService,
    X12GeneratorService,
    X12ValidatorService,
    X12Service,
    X12MapperService,

    // Transaction set parsers
    X12_850_ParserService,
    X12_855_ParserService,
    X12_856_ParserService,
    X12_810_ParserService,
    X12_997_ParserService,

    // Transaction set generators
    X12_850_GeneratorService,
    X12_997_GeneratorService,
  ],
  exports: [
    // Main service
    X12Service,
    X12MapperService,

    // Low-level services for advanced usage
    X12LexerService,
    X12ParserService,
    X12GeneratorService,
    X12ValidatorService,

    // Transaction set services
    X12_850_ParserService,
    X12_850_GeneratorService,
    X12_855_ParserService,
    X12_856_ParserService,
    X12_810_ParserService,
    X12_997_ParserService,
    X12_997_GeneratorService,
  ],
})
export class X12Module {}
