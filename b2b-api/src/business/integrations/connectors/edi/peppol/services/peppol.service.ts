import { Injectable, Logger } from '@nestjs/common';
import {
  UblInvoice,
  UblCreditNote,
  PeppolDocument,
  PeppolParticipant,
  PeppolValidationResult,
  PeppolDocumentStatus,
  XRechnungExtension,
  PdfA3Options,
} from '../interfaces';
import { UblInvoiceGeneratorService } from './ubl-invoice-generator.service';
import { UblCreditNoteGeneratorService } from './ubl-creditnote-generator.service';
import { PeppolValidatorService } from './peppol-validator.service';
import { SmpLookupService } from './smp-lookup.service';
import { AccessPointService } from './access-point.service';
import { DocumentStatusService } from './document-status.service';
import { XRechnungService } from './xrechnung.service';
import { PdfA3GeneratorService, PdfA3Result } from './pdfa3-generator.service';

/**
 * Invoice Create Options
 */
export interface CreateInvoiceOptions {
  /** Sender participant */
  sender: PeppolParticipant;
  /** Receiver participant */
  receiver: PeppolParticipant;
  /** Apply XRechnung extension */
  xRechnung?: XRechnungExtension;
  /** Generate PDF/A-3 */
  generatePdf?: boolean;
  /** PDF logo (base64) */
  pdfLogo?: string;
}

/**
 * Document Send Result
 */
export interface SendDocumentResult {
  success: boolean;
  document?: PeppolDocument;
  messageId?: string;
  error?: string;
  validationResult?: PeppolValidationResult;
  pdf?: Buffer;
}

/**
 * Peppol Service
 *
 * Main facade service for Peppol e-invoicing operations.
 * Orchestrates all Peppol-related functionality including:
 * - UBL 2.1 Invoice and Credit Note generation
 * - Peppol BIS Billing 3.0 validation
 * - SMP participant lookup
 * - Access Point integration
 * - Document status tracking
 * - XRechnung (German) extension
 * - PDF/A-3 generation with embedded XML
 */
@Injectable()
export class PeppolService {
  private readonly logger = new Logger(PeppolService.name);

  constructor(
    private readonly invoiceGenerator: UblInvoiceGeneratorService,
    private readonly creditNoteGenerator: UblCreditNoteGeneratorService,
    private readonly validator: PeppolValidatorService,
    private readonly smpLookup: SmpLookupService,
    private readonly accessPoint: AccessPointService,
    private readonly statusService: DocumentStatusService,
    private readonly xRechnungService: XRechnungService,
    private readonly pdfGenerator: PdfA3GeneratorService,
  ) {}

  /**
   * Create and send an invoice through Peppol network
   */
  async createAndSendInvoice(
    invoice: UblInvoice,
    options: CreateInvoiceOptions,
  ): Promise<SendDocumentResult> {
    this.logger.log(`Creating invoice ${invoice.id} for ${options.receiver.identifier}`);

    try {
      // Apply XRechnung extension if specified
      let processedInvoice = invoice;
      if (options.xRechnung) {
        processedInvoice = this.xRechnungService.applyXRechnungExtension(
          invoice,
          options.xRechnung,
        );
      }

      // Create tracked document
      const document = this.statusService.createDocument(
        'invoice',
        processedInvoice,
        options.sender,
        options.receiver,
      );

      // Validate
      const validationResult = await this.statusService.validateDocument(document.documentId);
      if (!validationResult.valid) {
        return {
          success: false,
          document: validationResult.document,
          validationResult: validationResult.validationResult,
          error: `Validation failed with ${validationResult.validationResult.errors.length} errors`,
        };
      }

      // Additional XRechnung validation if applicable
      if (options.xRechnung) {
        const xRechnungValidation = this.xRechnungService.validateXRechnung(processedInvoice);
        if (!xRechnungValidation.valid) {
          return {
            success: false,
            document: validationResult.document,
            validationResult: xRechnungValidation,
            error: `XRechnung validation failed with ${xRechnungValidation.errors.length} errors`,
          };
        }
      }

      // Generate XML
      const xml = this.invoiceGenerator.generateInvoice(processedInvoice);
      this.statusService.setDocumentXml(document.documentId, xml);

      // Generate PDF if requested
      let pdf: Buffer | undefined;
      if (options.generatePdf) {
        const pdfResult = await this.pdfGenerator.generatePdfA3({
          document: processedInvoice,
          xmlContent: xml,
          logo: options.pdfLogo,
        });
        if (pdfResult.success) {
          pdf = pdfResult.pdf;
        }
      }

      // Submit to Peppol network
      const submitResult = await this.statusService.submitDocument(document.documentId);
      if (!submitResult.success) {
        return {
          success: false,
          document: submitResult.document,
          validationResult: validationResult.validationResult,
          error: submitResult.error,
        };
      }

      return {
        success: true,
        document: submitResult.document,
        messageId: submitResult.messageId,
        validationResult: validationResult.validationResult,
        pdf,
      };
    } catch (error) {
      this.logger.error(`Failed to create and send invoice ${invoice.id}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create and send a credit note through Peppol network
   */
  async createAndSendCreditNote(
    creditNote: UblCreditNote,
    options: CreateInvoiceOptions,
  ): Promise<SendDocumentResult> {
    this.logger.log(`Creating credit note ${creditNote.id} for ${options.receiver.identifier}`);

    try {
      // Apply XRechnung extension if specified
      let processedCreditNote = creditNote;
      if (options.xRechnung) {
        processedCreditNote = this.xRechnungService.applyXRechnungExtensionToCreditNote(
          creditNote,
          options.xRechnung,
        );
      }

      // Create tracked document
      const document = this.statusService.createDocument(
        'creditNote',
        processedCreditNote,
        options.sender,
        options.receiver,
      );

      // Validate
      const validationResult = await this.statusService.validateDocument(document.documentId);
      if (!validationResult.valid) {
        return {
          success: false,
          document: validationResult.document,
          validationResult: validationResult.validationResult,
          error: `Validation failed with ${validationResult.validationResult.errors.length} errors`,
        };
      }

      // Additional XRechnung validation if applicable
      if (options.xRechnung) {
        const xRechnungValidation = this.xRechnungService.validateXRechnung(processedCreditNote);
        if (!xRechnungValidation.valid) {
          return {
            success: false,
            document: validationResult.document,
            validationResult: xRechnungValidation,
            error: `XRechnung validation failed with ${xRechnungValidation.errors.length} errors`,
          };
        }
      }

      // Generate XML
      const xml = this.creditNoteGenerator.generateCreditNote(processedCreditNote);
      this.statusService.setDocumentXml(document.documentId, xml);

      // Generate PDF if requested
      let pdf: Buffer | undefined;
      if (options.generatePdf) {
        const pdfResult = await this.pdfGenerator.generatePdfA3({
          document: processedCreditNote,
          xmlContent: xml,
          logo: options.pdfLogo,
        });
        if (pdfResult.success) {
          pdf = pdfResult.pdf;
        }
      }

      // Submit to Peppol network
      const submitResult = await this.statusService.submitDocument(document.documentId);
      if (!submitResult.success) {
        return {
          success: false,
          document: submitResult.document,
          validationResult: validationResult.validationResult,
          error: submitResult.error,
        };
      }

      return {
        success: true,
        document: submitResult.document,
        messageId: submitResult.messageId,
        validationResult: validationResult.validationResult,
        pdf,
      };
    } catch (error) {
      this.logger.error(`Failed to create and send credit note ${creditNote.id}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate invoice XML without sending
   */
  generateInvoiceXml(invoice: UblInvoice, xRechnung?: XRechnungExtension): string {
    let processedInvoice = invoice;
    if (xRechnung) {
      processedInvoice = this.xRechnungService.applyXRechnungExtension(invoice, xRechnung);
    }
    return this.invoiceGenerator.generateInvoice(processedInvoice);
  }

  /**
   * Generate credit note XML without sending
   */
  generateCreditNoteXml(creditNote: UblCreditNote, xRechnung?: XRechnungExtension): string {
    let processedCreditNote = creditNote;
    if (xRechnung) {
      processedCreditNote = this.xRechnungService.applyXRechnungExtensionToCreditNote(
        creditNote,
        xRechnung,
      );
    }
    return this.creditNoteGenerator.generateCreditNote(processedCreditNote);
  }

  /**
   * Validate invoice
   */
  validateInvoice(invoice: UblInvoice): PeppolValidationResult {
    return this.validator.validateInvoice(invoice);
  }

  /**
   * Validate credit note
   */
  validateCreditNote(creditNote: UblCreditNote): PeppolValidationResult {
    return this.validator.validateCreditNote(creditNote);
  }

  /**
   * Validate invoice with XRechnung rules
   */
  validateXRechnungInvoice(invoice: UblInvoice): {
    peppol: PeppolValidationResult;
    xRechnung: PeppolValidationResult;
    valid: boolean;
  } {
    const peppolResult = this.validator.validateInvoice(invoice);
    const xRechnungResult = this.xRechnungService.validateXRechnung(invoice);

    return {
      peppol: peppolResult,
      xRechnung: xRechnungResult,
      valid: peppolResult.valid && xRechnungResult.valid,
    };
  }

  /**
   * Lookup participant in Peppol network
   */
  async lookupParticipant(participant: PeppolParticipant) {
    return this.smpLookup.lookupParticipant(participant);
  }

  /**
   * Check if participant can receive invoices
   */
  async canReceiveInvoice(participant: PeppolParticipant): Promise<boolean> {
    return this.smpLookup.canReceiveDocument(participant, this.smpLookup.getInvoiceDocumentType());
  }

  /**
   * Check if participant can receive credit notes
   */
  async canReceiveCreditNote(participant: PeppolParticipant): Promise<boolean> {
    return this.smpLookup.canReceiveDocument(
      participant,
      this.smpLookup.getCreditNoteDocumentType(),
    );
  }

  /**
   * Search Peppol Directory
   */
  async searchParticipants(query: string, countryCode?: string) {
    return this.smpLookup.searchDirectory(query, countryCode);
  }

  /**
   * Get document by ID
   */
  getDocument(documentId: string): PeppolDocument | null {
    return this.statusService.getDocument(documentId);
  }

  /**
   * Get all documents
   */
  getAllDocuments(): PeppolDocument[] {
    return this.statusService.getAllDocuments();
  }

  /**
   * Get documents by status
   */
  getDocumentsByStatus(status: PeppolDocumentStatus): PeppolDocument[] {
    return this.statusService.getDocumentsByStatus(status);
  }

  /**
   * Refresh document status from Access Point
   */
  async refreshDocumentStatus(documentId: string): Promise<PeppolDocument | null> {
    return this.statusService.refreshDocumentStatus(documentId);
  }

  /**
   * Generate PDF/A-3 for document
   */
  async generatePdf(
    document: UblInvoice | UblCreditNote,
    xml: string,
    logo?: string,
  ): Promise<PdfA3Result> {
    return this.pdfGenerator.generatePdfA3({
      document,
      xmlContent: xml,
      logo,
    });
  }

  /**
   * Validate Access Point connection
   */
  async validateConnection(): Promise<boolean> {
    return this.accessPoint.validateConnection();
  }

  /**
   * Get document statistics
   */
  getStatistics() {
    return this.statusService.getStatistics();
  }

  /**
   * Register status change callback
   */
  onDocumentStatusChange(callback: (event: any) => void): void {
    this.statusService.onStatusChange(callback);
  }

  /**
   * Get own sender participant from configuration
   */
  getOwnParticipant(): PeppolParticipant {
    return this.accessPoint.getSenderParticipant();
  }

  /**
   * Parse participant ID string
   */
  parseParticipantId(participantIdString: string): PeppolParticipant | null {
    return this.smpLookup.parseParticipantId(participantIdString);
  }

  /**
   * Format participant ID for display
   */
  formatParticipantId(participant: PeppolParticipant): string {
    return this.smpLookup.formatParticipantId(participant);
  }
}
