import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CfdiComprobante,
  CfdiDocument,
  CfdiStatus,
  CfdiMotivoCancelacion,
  CfdiCsdCertificate,
  CfdiValidationResult,
} from '../interfaces';
import { CfdiXmlGeneratorService } from './cfdi-xml-generator.service';
import { CfdiSignatureService } from './cfdi-signature.service';
import { CfdiPacService } from './cfdi-pac.service';
import { CfdiSatValidationService } from './cfdi-sat-validation.service';
import { CfdiPdfService } from './cfdi-pdf.service';

/**
 * Document Creation Options
 */
export interface CreateDocumentOptions {
  /** Tenant ID */
  tenantId: string;
  /** CSD Certificate for signing */
  csd: CfdiCsdCertificate;
  /** Generate PDF after stamping */
  generatePdf?: boolean;
  /** PDF logo (base64) */
  pdfLogo?: string;
  /** Validate with SAT after stamping */
  validateWithSat?: boolean;
}

/**
 * Document Processing Result
 */
export interface DocumentProcessingResult {
  success: boolean;
  document?: CfdiDocument;
  error?: string;
  validationResult?: CfdiValidationResult;
}

/**
 * CFDI Document Service
 *
 * Manages CFDI document lifecycle including:
 * - Document creation and tracking
 * - Sealing and stamping workflow
 * - UUID tracking
 * - Cancellation processing
 * - Status management
 */
@Injectable()
export class CfdiDocumentService {
  private readonly logger = new Logger(CfdiDocumentService.name);

  // In-memory document store (in production, use database)
  private documents: Map<string, CfdiDocument> = new Map();
  private uuidIndex: Map<string, string> = new Map(); // UUID -> documentId

  // Status change callbacks
  private statusChangeCallbacks: Array<(event: any) => void> = [];

  constructor(
    private readonly xmlGenerator: CfdiXmlGeneratorService,
    private readonly signatureService: CfdiSignatureService,
    private readonly pacService: CfdiPacService,
    private readonly satValidationService: CfdiSatValidationService,
    private readonly pdfService: CfdiPdfService,
  ) {}

  /**
   * Create, seal, and stamp a CFDI document
   */
  async createAndStamp(
    comprobante: CfdiComprobante,
    options: CreateDocumentOptions,
  ): Promise<DocumentProcessingResult> {
    this.logger.log(`Creating CFDI document for ${options.tenantId}`);

    // Validate structure first
    const validationResult = this.satValidationService.validateStructure(comprobante);
    if (!validationResult.valid) {
      return {
        success: false,
        validationResult,
        error: `Validation failed with ${validationResult.errors.length} errors`,
      };
    }

    // Create document record
    const document = this.createDocument(comprobante, options.tenantId);

    try {
      // Apply signature (seal)
      const signResult = this.signatureService.applySignature(comprobante, options.csd);
      if (!signResult.success) {
        this.updateStatus(document.documentId, CfdiStatus.DRAFT, signResult.error);
        return {
          success: false,
          document: this.documents.get(document.documentId),
          error: signResult.error,
        };
      }

      // Update document with signed comprobante
      document.comprobante = signResult.comprobante!;
      document.cadenaOriginal = signResult.cadenaOriginal;

      // Generate sealed XML
      const sealedXml = this.xmlGenerator.generateCfdi(signResult.comprobante!);
      document.sealedXml = sealedXml;
      this.updateStatus(document.documentId, CfdiStatus.SEALED, 'Document sealed successfully');

      // Submit to PAC for timbrado
      const stampResult = await this.pacService.stamp({ xml: sealedXml });
      if (!stampResult.success) {
        this.updateStatus(document.documentId, CfdiStatus.DRAFT, stampResult.errorMessage);
        return {
          success: false,
          document: this.documents.get(document.documentId),
          error: stampResult.errorMessage,
        };
      }

      // Update with stamped data
      document.stampedXml = stampResult.xml;
      document.timbre = this.pacService.extractTimbre(stampResult.xml!) ?? undefined;

      if (document.timbre) {
        // Index by UUID
        this.uuidIndex.set(document.timbre.uuid, document.documentId);

        // Generate QR string
        document.qrString = this.signatureService.generateQrString(
          document.timbre.uuid,
          comprobante.emisor.rfc,
          comprobante.receptor.rfc,
          comprobante.total,
          document.comprobante.sello || '',
        );
      }

      this.updateStatus(
        document.documentId,
        CfdiStatus.STAMPED,
        `Stamped with UUID: ${document.timbre?.uuid}`,
      );

      // Generate PDF if requested
      if (options.generatePdf && document.timbre) {
        const pdfResult = await this.pdfService.generatePdf({
          comprobante: document.comprobante,
          timbre: document.timbre,
          cadenaOriginal: document.cadenaOriginal,
          logo: options.pdfLogo,
        });
        if (pdfResult.success && pdfResult.pdf) {
          document.pdf = pdfResult.pdf.toString('base64');
        }
      }

      // Validate with SAT if requested
      if (options.validateWithSat && document.timbre) {
        const satResult = await this.satValidationService.validateWithSat({
          uuid: document.timbre.uuid,
          rfcEmisor: comprobante.emisor.rfc,
          rfcReceptor: comprobante.receptor.rfc,
          total: comprobante.total,
        });
        if (satResult.valid && satResult.estado === 'Vigente') {
          this.updateStatus(document.documentId, CfdiStatus.VALID, 'Validated with SAT');
        }
      }

      return {
        success: true,
        document: this.documents.get(document.documentId),
        validationResult,
      };
    } catch (error) {
      this.logger.error('Document processing failed', error);
      this.updateStatus(
        document.documentId,
        CfdiStatus.DRAFT,
        error instanceof Error ? error.message : 'Processing failed',
      );
      return {
        success: false,
        document: this.documents.get(document.documentId),
        error: error instanceof Error ? error.message : 'Processing failed',
      };
    }
  }

  /**
   * Cancel a CFDI document
   */
  async cancelDocument(
    documentIdOrUuid: string,
    motivo: CfdiMotivoCancelacion,
    folioSustitucion?: string,
  ): Promise<DocumentProcessingResult> {
    // Find document
    let document = this.documents.get(documentIdOrUuid);
    if (!document) {
      const docIdFromUuid = this.uuidIndex.get(documentIdOrUuid);
      if (docIdFromUuid) {
        document = this.documents.get(docIdFromUuid);
      }
    }

    if (!document) {
      return {
        success: false,
        error: 'Document not found',
      };
    }

    if (!document.timbre) {
      return {
        success: false,
        error: 'Document has not been stamped',
      };
    }

    // Check if already cancelled
    if (document.status === CfdiStatus.CANCELLED) {
      return {
        success: false,
        document,
        error: 'Document is already cancelled',
      };
    }

    // Validate motivo 01 requires folioSustitucion
    if (motivo === CfdiMotivoCancelacion.COMPROBANTE_ERRORES_CON_RELACION && !folioSustitucion) {
      return {
        success: false,
        error: 'folioSustitucion is required when motivo is 01',
      };
    }

    this.logger.log(`Cancelling CFDI ${document.timbre.uuid} with motivo ${motivo}`);

    // Record cancellation request
    document.cancellation = {
      motivo,
      folioSustitucion,
      requestedAt: new Date(),
    };
    this.updateStatus(
      document.documentId,
      CfdiStatus.CANCELLATION_PENDING,
      'Cancellation requested',
    );

    // Submit cancellation to PAC
    const cancelResult = await this.pacService.cancel({
      uuid: document.timbre.uuid,
      rfcEmisor: document.comprobante.emisor.rfc,
      rfcReceptor: document.comprobante.receptor.rfc,
      total: document.comprobante.total,
      motivo,
      folioSustitucion,
    });

    if (!cancelResult.success) {
      this.updateStatus(
        document.documentId,
        CfdiStatus.CANCELLATION_REJECTED,
        cancelResult.errorMessage,
      );
      return {
        success: false,
        document: this.documents.get(document.documentId),
        error: cancelResult.errorMessage,
      };
    }

    // Update cancellation info
    document.cancellation.processedAt = new Date();
    document.cancellation.acuse = cancelResult.acuse;

    // Update status based on result
    if (cancelResult.status === 'cancelled') {
      this.updateStatus(document.documentId, CfdiStatus.CANCELLED, 'Cancellation completed');
    } else if (cancelResult.status === 'pending') {
      this.updateStatus(
        document.documentId,
        CfdiStatus.CANCELLATION_PENDING,
        'Awaiting receiver acceptance',
      );
    } else {
      this.updateStatus(
        document.documentId,
        CfdiStatus.CANCELLATION_REJECTED,
        'Cancellation rejected',
      );
    }

    return {
      success: cancelResult.success,
      document: this.documents.get(document.documentId),
    };
  }

  /**
   * Get document by ID
   */
  getDocument(documentId: string): CfdiDocument | null {
    return this.documents.get(documentId) || null;
  }

  /**
   * Get document by UUID
   */
  getDocumentByUuid(uuid: string): CfdiDocument | null {
    const documentId = this.uuidIndex.get(uuid);
    if (!documentId) return null;
    return this.documents.get(documentId) || null;
  }

  /**
   * Get all documents for a tenant
   */
  getDocumentsByTenant(tenantId: string): CfdiDocument[] {
    return Array.from(this.documents.values()).filter((doc) => doc.tenantId === tenantId);
  }

  /**
   * Get documents by status
   */
  getDocumentsByStatus(status: CfdiStatus, tenantId?: string): CfdiDocument[] {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.status === status && (!tenantId || doc.tenantId === tenantId),
    );
  }

  /**
   * Get statistics
   */
  getStatistics(tenantId?: string): {
    total: number;
    byStatus: Record<CfdiStatus, number>;
  } {
    const docs = tenantId
      ? this.getDocumentsByTenant(tenantId)
      : Array.from(this.documents.values());

    const byStatus: Record<CfdiStatus, number> = {
      [CfdiStatus.DRAFT]: 0,
      [CfdiStatus.SEALED]: 0,
      [CfdiStatus.STAMPED]: 0,
      [CfdiStatus.VALID]: 0,
      [CfdiStatus.CANCELLED]: 0,
      [CfdiStatus.CANCELLATION_PENDING]: 0,
      [CfdiStatus.CANCELLATION_REJECTED]: 0,
    };

    for (const doc of docs) {
      byStatus[doc.status]++;
    }

    return {
      total: docs.length,
      byStatus,
    };
  }

  /**
   * Refresh document status from SAT
   */
  async refreshStatus(documentId: string): Promise<CfdiDocument | null> {
    const document = this.documents.get(documentId);
    if (!document || !document.timbre) return null;

    const satResult = await this.satValidationService.validateWithSat({
      uuid: document.timbre.uuid,
      rfcEmisor: document.comprobante.emisor.rfc,
      rfcReceptor: document.comprobante.receptor.rfc,
      total: document.comprobante.total,
    });

    if (satResult.estado === 'Vigente' && document.status !== CfdiStatus.VALID) {
      this.updateStatus(document.documentId, CfdiStatus.VALID, 'Validated with SAT');
    } else if (satResult.estado === 'Cancelado' && document.status !== CfdiStatus.CANCELLED) {
      this.updateStatus(document.documentId, CfdiStatus.CANCELLED, 'Cancelled per SAT');
    }

    return this.documents.get(documentId) || null;
  }

  /**
   * Register status change callback
   */
  onStatusChange(callback: (event: any) => void): void {
    this.statusChangeCallbacks.push(callback);
  }

  /**
   * Create a new document record
   */
  private createDocument(comprobante: CfdiComprobante, tenantId: string): CfdiDocument {
    const documentId = uuidv4();
    const now = new Date();

    const document: CfdiDocument = {
      documentId,
      tenantId,
      status: CfdiStatus.DRAFT,
      comprobante,
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          status: CfdiStatus.DRAFT,
          timestamp: now,
          message: 'Document created',
        },
      ],
    };

    this.documents.set(documentId, document);
    return document;
  }

  /**
   * Update document status
   */
  private updateStatus(documentId: string, status: CfdiStatus, message?: string): void {
    const document = this.documents.get(documentId);
    if (!document) return;

    const now = new Date();
    document.status = status;
    document.updatedAt = now;
    document.statusHistory.push({
      status,
      timestamp: now,
      message,
    });

    // Emit status change event
    this.emitStatusChange({
      documentId,
      status,
      previousStatus: document.statusHistory[document.statusHistory.length - 2]?.status,
      message,
      timestamp: now,
    });
  }

  /**
   * Emit status change event
   */
  private emitStatusChange(event: any): void {
    for (const callback of this.statusChangeCallbacks) {
      try {
        callback(event);
      } catch (error) {
        this.logger.error('Status change callback error', error);
      }
    }
  }
}
