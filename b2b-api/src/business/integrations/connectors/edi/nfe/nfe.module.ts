import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  NfeXmlGeneratorService,
  NfeSignatureService,
  NfeSefazService,
  NfeDanfeService,
  NfeDocumentService,
  NfeService,
} from './services';

/**
 * NF-e Module
 *
 * Provides complete NF-e (Nota Fiscal Eletrônica) implementation for Brazil including:
 * - NF-e XML generation (layout 4.0)
 * - Digital signature with A1/A3 certificates
 * - SEFAZ webservice integration (all states)
 * - Authorization and status check
 * - Cancellation (Evento)
 * - Correction letter (CC-e)
 * - DANFE PDF generation
 * - Contingency modes (SVC-AN, SVC-RS, FS-DA, EPEC)
 *
 * @see http://www.nfe.fazenda.gov.br/portal/principal.aspx
 * @see Manual de Integração - Contribuinte (versão 4.0.1)
 */
@Module({
  imports: [ConfigModule],
  providers: [
    // XML Generation
    NfeXmlGeneratorService,

    // Certificate & Signature
    NfeSignatureService,

    // SEFAZ Communication
    NfeSefazService,

    // DANFE Generation
    NfeDanfeService,

    // Document Management
    NfeDocumentService,

    // Main Service (Facade)
    NfeService,
  ],
  exports: [
    // Main service for external use
    NfeService,

    // Individual services for advanced usage
    NfeXmlGeneratorService,
    NfeSignatureService,
    NfeSefazService,
    NfeDanfeService,
    NfeDocumentService,
  ],
})
export class NfeModule {}
