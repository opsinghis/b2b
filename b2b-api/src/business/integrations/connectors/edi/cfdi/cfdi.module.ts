import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  CfdiXmlGeneratorService,
  CfdiSignatureService,
  CfdiPacService,
  CfdiSatValidationService,
  CfdiPdfService,
  CfdiDocumentService,
  CfdiService,
} from './services';

/**
 * CFDI 4.0 Module
 *
 * Provides complete CFDI 4.0 (Mexican electronic invoicing) implementation including:
 * - CFDI 4.0 XML generation per SAT Anexo 20
 * - Digital signature with CSD certificates
 * - PAC integration for timbrado (stamping)
 * - UUID tracking and document management
 * - Cancellation with motivo support
 * - Pagos 2.0 complement (payment receipts)
 * - Comercio Exterior 2.0 complement (exports)
 * - SAT validation integration
 * - PDF representation generation
 * - Common addenda support (Amazon, Walmart, Liverpool, Soriana)
 *
 * @see https://www.sat.gob.mx/consultas/35025/formato-de-factura-electronica-(anexo-20)
 */
@Module({
  imports: [ConfigModule],
  providers: [
    // XML Generation
    CfdiXmlGeneratorService,

    // Certificate & Signature
    CfdiSignatureService,

    // PAC Integration
    CfdiPacService,

    // SAT Validation
    CfdiSatValidationService,

    // PDF Generation
    CfdiPdfService,

    // Document Management
    CfdiDocumentService,

    // Main Service (Facade)
    CfdiService,
  ],
  exports: [
    // Main service for external use
    CfdiService,

    // Individual services for advanced usage
    CfdiXmlGeneratorService,
    CfdiSignatureService,
    CfdiPacService,
    CfdiSatValidationService,
    CfdiPdfService,
    CfdiDocumentService,
  ],
})
export class CfdiModule {}
