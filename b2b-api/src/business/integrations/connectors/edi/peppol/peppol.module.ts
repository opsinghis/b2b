import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  UblInvoiceGeneratorService,
  UblCreditNoteGeneratorService,
  PeppolValidatorService,
  SmpLookupService,
  AccessPointService,
  DocumentStatusService,
  XRechnungService,
  PdfA3GeneratorService,
  PeppolService,
} from './services';

/**
 * Peppol E-Invoicing Module
 *
 * Provides complete Peppol BIS Billing 3.0 implementation including:
 * - UBL 2.1 Invoice and Credit Note generation
 * - EN 16931 and Peppol validation
 * - Schematron validation rules
 * - SMP participant lookup
 * - Access Point integration
 * - Document status tracking
 * - XRechnung (German CIUS) extension
 * - PDF/A-3 with embedded XML
 */
@Module({
  imports: [ConfigModule],
  providers: [
    // XML Generation
    UblInvoiceGeneratorService,
    UblCreditNoteGeneratorService,

    // Validation
    PeppolValidatorService,

    // Network Services
    SmpLookupService,
    AccessPointService,

    // Document Management
    DocumentStatusService,

    // Extensions
    XRechnungService,

    // PDF Generation
    PdfA3GeneratorService,

    // Main Service (Facade)
    PeppolService,
  ],
  exports: [
    // Main service for external use
    PeppolService,

    // Individual services for advanced usage
    UblInvoiceGeneratorService,
    UblCreditNoteGeneratorService,
    PeppolValidatorService,
    SmpLookupService,
    AccessPointService,
    DocumentStatusService,
    XRechnungService,
    PdfA3GeneratorService,
  ],
})
export class PeppolModule {}
