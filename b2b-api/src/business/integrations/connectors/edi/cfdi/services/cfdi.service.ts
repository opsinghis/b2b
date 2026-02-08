import { Injectable, Logger } from '@nestjs/common';
import {
  CfdiComprobante,
  CfdiDocument,
  CfdiStatus,
  CfdiTimbreFiscalDigital,
  CfdiMotivoCancelacion,
  CfdiCsdCertificate,
  CfdiValidationResult,
  CfdiSatValidationResponse,
  CfdiPagos20,
  CfdiComercioExterior,
  CfdiAddenda,
  CfdiTipoComprobante,
  CfdiMetodoPago,
  CfdiExportacion,
  CfdiObjetoImp,
} from '../interfaces';
import { CfdiXmlGeneratorService } from './cfdi-xml-generator.service';
import { CfdiSignatureService, CertificateInfo } from './cfdi-signature.service';
import { CfdiPacService } from './cfdi-pac.service';
import { CfdiSatValidationService } from './cfdi-sat-validation.service';
import { CfdiPdfService, PdfGenerationResult } from './cfdi-pdf.service';
import { CfdiDocumentService, DocumentProcessingResult } from './cfdi-document.service';

/**
 * Create Invoice Options
 */
export interface CreateInvoiceOptions {
  /** Tenant ID */
  tenantId: string;
  /** CSD Certificate */
  csd: CfdiCsdCertificate;
  /** Generate PDF */
  generatePdf?: boolean;
  /** PDF Logo (base64) */
  pdfLogo?: string;
  /** Validate with SAT after stamping */
  validateWithSat?: boolean;
  /** Pagos 2.0 complement (for payment receipts) */
  pagos?: CfdiPagos20;
  /** Comercio Exterior complement (for exports) */
  comercioExterior?: CfdiComercioExterior;
  /** Addenda */
  addenda?: CfdiAddenda;
}

/**
 * CFDI Service
 *
 * Main facade service for CFDI 4.0 (Mexican electronic invoicing) operations.
 * Orchestrates all CFDI-related functionality including:
 * - Invoice/document creation and stamping
 * - CSD certificate management
 * - PAC integration
 * - SAT validation
 * - PDF generation
 * - Cancellation handling
 * - Pagos 2.0 complement
 * - Comercio Exterior complement
 * - Common addenda support
 */
@Injectable()
export class CfdiService {
  private readonly logger = new Logger(CfdiService.name);

  constructor(
    private readonly xmlGenerator: CfdiXmlGeneratorService,
    private readonly signatureService: CfdiSignatureService,
    private readonly pacService: CfdiPacService,
    private readonly satValidation: CfdiSatValidationService,
    private readonly pdfService: CfdiPdfService,
    private readonly documentService: CfdiDocumentService,
  ) {}

  // ===========================================================================
  // Document Creation
  // ===========================================================================

  /**
   * Create and stamp a regular invoice (Ingreso)
   */
  async createInvoice(
    comprobante: CfdiComprobante,
    options: CreateInvoiceOptions,
  ): Promise<DocumentProcessingResult> {
    this.logger.log(`Creating invoice ${comprobante.serie || ''}${comprobante.folio || ''}`);

    // Ensure tipo is Ingreso
    if (comprobante.tipoDeComprobante !== CfdiTipoComprobante.INGRESO) {
      comprobante.tipoDeComprobante = CfdiTipoComprobante.INGRESO;
    }

    // Apply complements if provided
    if (options.comercioExterior || options.addenda) {
      comprobante = this.applyComplements(comprobante, options);
    }

    return this.documentService.createAndStamp(comprobante, {
      tenantId: options.tenantId,
      csd: options.csd,
      generatePdf: options.generatePdf,
      pdfLogo: options.pdfLogo,
      validateWithSat: options.validateWithSat,
    });
  }

  /**
   * Create and stamp a credit note (Egreso)
   */
  async createCreditNote(
    comprobante: CfdiComprobante,
    options: CreateInvoiceOptions,
  ): Promise<DocumentProcessingResult> {
    this.logger.log(`Creating credit note ${comprobante.serie || ''}${comprobante.folio || ''}`);

    // Ensure tipo is Egreso
    if (comprobante.tipoDeComprobante !== CfdiTipoComprobante.EGRESO) {
      comprobante.tipoDeComprobante = CfdiTipoComprobante.EGRESO;
    }

    return this.documentService.createAndStamp(comprobante, {
      tenantId: options.tenantId,
      csd: options.csd,
      generatePdf: options.generatePdf,
      pdfLogo: options.pdfLogo,
      validateWithSat: options.validateWithSat,
    });
  }

  /**
   * Create and stamp a payment receipt (Pago)
   */
  async createPaymentReceipt(
    comprobante: CfdiComprobante,
    pagos: CfdiPagos20,
    options: CreateInvoiceOptions,
  ): Promise<DocumentProcessingResult> {
    this.logger.log(
      `Creating payment receipt ${comprobante.serie || ''}${comprobante.folio || ''}`,
    );

    // Configure for Pago type
    comprobante.tipoDeComprobante = CfdiTipoComprobante.PAGO;
    comprobante.subTotal = 0;
    comprobante.total = 0;
    comprobante.metodoPago = undefined;
    comprobante.formaPago = undefined;

    // Set standard concept for Pago
    comprobante.conceptos = [
      {
        claveProdServ: '84111506',
        cantidad: 1,
        claveUnidad: 'ACT',
        descripcion: 'Pago',
        valorUnitario: 0,
        importe: 0,
        objetoImp: CfdiObjetoImp.NO_OBJETO_IMPUESTO,
      },
    ];

    // Add Pagos 2.0 complement
    comprobante.complemento = {
      ...comprobante.complemento,
      pagos,
    };

    return this.documentService.createAndStamp(comprobante, {
      tenantId: options.tenantId,
      csd: options.csd,
      generatePdf: options.generatePdf,
      pdfLogo: options.pdfLogo,
      validateWithSat: options.validateWithSat,
    });
  }

  /**
   * Create and stamp a transfer document (Traslado)
   */
  async createTransfer(
    comprobante: CfdiComprobante,
    options: CreateInvoiceOptions,
  ): Promise<DocumentProcessingResult> {
    this.logger.log(`Creating transfer ${comprobante.serie || ''}${comprobante.folio || ''}`);

    // Ensure tipo is Traslado
    comprobante.tipoDeComprobante = CfdiTipoComprobante.TRASLADO;
    comprobante.metodoPago = undefined;
    comprobante.formaPago = undefined;

    return this.documentService.createAndStamp(comprobante, {
      tenantId: options.tenantId,
      csd: options.csd,
      generatePdf: options.generatePdf,
      pdfLogo: options.pdfLogo,
      validateWithSat: options.validateWithSat,
    });
  }

  // ===========================================================================
  // Document Management
  // ===========================================================================

  /**
   * Cancel a CFDI
   */
  async cancelCfdi(
    documentIdOrUuid: string,
    motivo: CfdiMotivoCancelacion,
    folioSustitucion?: string,
  ): Promise<DocumentProcessingResult> {
    return this.documentService.cancelDocument(documentIdOrUuid, motivo, folioSustitucion);
  }

  /**
   * Get document by ID
   */
  getDocument(documentId: string): CfdiDocument | null {
    return this.documentService.getDocument(documentId);
  }

  /**
   * Get document by UUID
   */
  getDocumentByUuid(uuid: string): CfdiDocument | null {
    return this.documentService.getDocumentByUuid(uuid);
  }

  /**
   * Get documents by tenant
   */
  getDocumentsByTenant(tenantId: string): CfdiDocument[] {
    return this.documentService.getDocumentsByTenant(tenantId);
  }

  /**
   * Get documents by status
   */
  getDocumentsByStatus(status: CfdiStatus, tenantId?: string): CfdiDocument[] {
    return this.documentService.getDocumentsByStatus(status, tenantId);
  }

  /**
   * Refresh document status from SAT
   */
  async refreshDocumentStatus(documentId: string): Promise<CfdiDocument | null> {
    return this.documentService.refreshStatus(documentId);
  }

  // ===========================================================================
  // XML Generation
  // ===========================================================================

  /**
   * Generate CFDI XML without stamping
   */
  generateXml(comprobante: CfdiComprobante): string {
    return this.xmlGenerator.generateCfdi(comprobante);
  }

  /**
   * Generate original string (cadena original)
   */
  generateCadenaOriginal(comprobante: CfdiComprobante): string {
    return this.xmlGenerator.generateCadenaOriginal(comprobante);
  }

  // ===========================================================================
  // Validation
  // ===========================================================================

  /**
   * Validate CFDI structure
   */
  validateStructure(comprobante: CfdiComprobante): CfdiValidationResult {
    return this.satValidation.validateStructure(comprobante);
  }

  /**
   * Validate CFDI with SAT
   */
  async validateWithSat(
    uuid: string,
    rfcEmisor: string,
    rfcReceptor: string,
    total: number,
  ): Promise<CfdiSatValidationResponse> {
    return this.satValidation.validateWithSat({
      uuid,
      rfcEmisor,
      rfcReceptor,
      total,
    });
  }

  // ===========================================================================
  // Certificate Management
  // ===========================================================================

  /**
   * Parse CSD certificate
   */
  parseCertificate(certificateBuffer: Buffer): CertificateInfo {
    return this.signatureService.parseCertificate(certificateBuffer);
  }

  /**
   * Validate CSD certificate and key pair
   */
  validateCsdPair(
    certificateBuffer: Buffer,
    keyBuffer: Buffer,
    password: string,
  ): { valid: boolean; error?: string } {
    return this.signatureService.validateCsdPair(certificateBuffer, keyBuffer, password);
  }

  /**
   * Generate test CSD (for development only)
   */
  generateTestCsd(rfc: string, nombre: string): CfdiCsdCertificate {
    return this.signatureService.generateTestCsd(rfc, nombre);
  }

  // ===========================================================================
  // PDF Generation
  // ===========================================================================

  /**
   * Generate PDF for a document
   */
  async generatePdf(
    comprobante: CfdiComprobante,
    timbre?: CfdiTimbreFiscalDigital,
    cadenaOriginal?: string,
    logo?: string,
  ): Promise<PdfGenerationResult> {
    return this.pdfService.generatePdf({
      comprobante,
      timbre,
      cadenaOriginal,
      logo,
    });
  }

  /**
   * Generate HTML representation
   */
  generateHtml(
    comprobante: CfdiComprobante,
    timbre?: CfdiTimbreFiscalDigital,
    cadenaOriginal?: string,
    logo?: string,
  ): string {
    return this.pdfService.generateHtml({
      comprobante,
      timbre,
      cadenaOriginal,
      logo,
    });
  }

  // ===========================================================================
  // PAC Operations
  // ===========================================================================

  /**
   * Get available PAC providers
   */
  getAvailablePacProviders(): string[] {
    return this.pacService.getAvailableProviders();
  }

  /**
   * Test PAC connection
   */
  async testPacConnection(): Promise<{ success: boolean; error?: string }> {
    return this.pacService.testConnection();
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get document statistics
   */
  getStatistics(tenantId?: string): {
    total: number;
    byStatus: Record<CfdiStatus, number>;
  } {
    return this.documentService.getStatistics(tenantId);
  }

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  /**
   * Register status change callback
   */
  onStatusChange(callback: (event: any) => void): void {
    this.documentService.onStatusChange(callback);
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Apply complements to comprobante
   */
  private applyComplements(
    comprobante: CfdiComprobante,
    options: CreateInvoiceOptions,
  ): CfdiComprobante {
    const result = { ...comprobante };

    if (!result.complemento) {
      result.complemento = {};
    }

    if (options.comercioExterior) {
      result.complemento.comercioExterior = options.comercioExterior;
      // Set exportacion if comercio exterior is present
      if (!result.exportacion || result.exportacion === CfdiExportacion.NO_APLICA) {
        result.exportacion = CfdiExportacion.DEFINITIVA;
      }
    }

    if (options.addenda) {
      result.addenda = options.addenda;
    }

    return result;
  }

  /**
   * Generate QR code string
   */
  generateQrString(
    uuid: string,
    rfcEmisor: string,
    rfcReceptor: string,
    total: number,
    sello: string,
  ): string {
    return this.signatureService.generateQrString(uuid, rfcEmisor, rfcReceptor, total, sello);
  }

  /**
   * Build a basic comprobante structure
   */
  buildComprobante(params: {
    serie?: string;
    folio?: string;
    fecha: string;
    emisor: CfdiComprobante['emisor'];
    receptor: CfdiComprobante['receptor'];
    conceptos: CfdiComprobante['conceptos'];
    formaPago?: string;
    metodoPago?: CfdiMetodoPago;
    condicionesDePago?: string;
    moneda?: string;
    tipoCambio?: number;
    lugarExpedicion: string;
  }): CfdiComprobante {
    const subtotal = params.conceptos.reduce((sum, c) => sum + c.importe, 0);
    const descuento = params.conceptos.reduce((sum, c) => sum + (c.descuento || 0), 0);

    // Calculate taxes
    let totalTraslados = 0;
    let totalRetenciones = 0;

    for (const concepto of params.conceptos) {
      if (concepto.impuestos?.traslados?.traslados) {
        for (const t of concepto.impuestos.traslados.traslados) {
          totalTraslados += t.importe || 0;
        }
      }
      if (concepto.impuestos?.retenciones?.retenciones) {
        for (const r of concepto.impuestos.retenciones.retenciones) {
          totalRetenciones += r.importe || 0;
        }
      }
    }

    const total = subtotal - descuento + totalTraslados - totalRetenciones;

    return {
      version: '4.0',
      serie: params.serie,
      folio: params.folio,
      fecha: params.fecha,
      formaPago: params.formaPago,
      metodoPago: params.metodoPago,
      condicionesDePago: params.condicionesDePago,
      subTotal: subtotal,
      descuento: descuento > 0 ? descuento : undefined,
      moneda: params.moneda || 'MXN',
      tipoCambio: params.tipoCambio,
      total,
      tipoDeComprobante: CfdiTipoComprobante.INGRESO,
      exportacion: CfdiExportacion.NO_APLICA,
      lugarExpedicion: params.lugarExpedicion,
      emisor: params.emisor,
      receptor: params.receptor,
      conceptos: params.conceptos,
      impuestos:
        totalTraslados > 0 || totalRetenciones > 0
          ? {
              totalImpuestosTrasladados: totalTraslados > 0 ? totalTraslados : undefined,
              totalImpuestosRetenidos: totalRetenciones > 0 ? totalRetenciones : undefined,
            }
          : undefined,
    };
  }
}
