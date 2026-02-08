import { Injectable, Logger } from '@nestjs/common';
import {
  NfeDocument,
  NfeStatus,
  NfeInfNfe,
  NfeProtocolo,
  NfeSefazConfig,
  NfeCertificate,
  NfeValidationResult,
  NfeValidationError,
  NfeTipoEvento,
  NfeTipoEmissao,
  NfeEvento,
  NfeRetornoEvento,
} from '../interfaces';
import { NfeXmlGeneratorService } from './nfe-xml-generator.service';
import { NfeSignatureService } from './nfe-signature.service';
import { NfeSefazService } from './nfe-sefaz.service';
import { NfeDanfeService } from './nfe-danfe.service';

/**
 * Document Processing Result
 */
export interface DocumentProcessingResult {
  success: boolean;
  document?: NfeDocument;
  error?: string;
  validationErrors?: NfeValidationError[];
}

/**
 * NF-e Document Service
 *
 * Manages NF-e document lifecycle including:
 * - Document creation and storage
 * - Authorization workflow
 * - Status tracking
 * - Event management
 * - Validation
 */
@Injectable()
export class NfeDocumentService {
  private readonly logger = new Logger(NfeDocumentService.name);

  // In-memory storage (replace with database in production)
  private documents: Map<string, NfeDocument> = new Map();
  private documentsByChave: Map<string, string> = new Map();

  // Event callbacks
  private statusChangeCallbacks: Array<(event: any) => void> = [];

  constructor(
    private readonly xmlGenerator: NfeXmlGeneratorService,
    private readonly signatureService: NfeSignatureService,
    private readonly sefazService: NfeSefazService,
    private readonly danfeService: NfeDanfeService,
  ) {}

  /**
   * Create and authorize NF-e
   */
  async createAndAuthorize(
    nfe: NfeInfNfe,
    config: NfeSefazConfig,
    certificate: NfeCertificate,
    options: {
      tenantId: string;
      generateDanfe?: boolean;
      danfeLogo?: string;
    },
  ): Promise<DocumentProcessingResult> {
    this.logger.log('Creating and authorizing NF-e');

    try {
      // Validate NF-e structure
      const validation = this.validateNfe(nfe);
      if (!validation.valid) {
        return {
          success: false,
          error: 'Validation failed',
          validationErrors: validation.errors,
        };
      }

      // Generate XML
      const xml = this.xmlGenerator.generateNfe(nfe);
      const chaveAcesso = this.xmlGenerator.generateAccessKey(nfe);

      // Sign XML
      const signResult = this.signatureService.signNfe(xml, certificate);
      if (!signResult.success || !signResult.signedXml) {
        return { success: false, error: signResult.error || 'Signature failed' };
      }

      // Create document
      const documentId = this.generateDocumentId();
      const document: NfeDocument = {
        documentId,
        tenantId: options.tenantId,
        status: NfeStatus.SIGNED,
        chaveAcesso,
        nfe,
        signedXml: signResult.signedXml,
        createdAt: new Date(),
        updatedAt: new Date(),
        statusHistory: [
          {
            status: NfeStatus.DRAFT,
            timestamp: new Date(),
            message: 'Document created',
          },
          {
            status: NfeStatus.SIGNED,
            timestamp: new Date(),
            message: 'Document signed',
          },
        ],
      };

      this.documents.set(documentId, document);
      this.documentsByChave.set(chaveAcesso, documentId);

      // Send to SEFAZ
      const authResult = await this.sefazService.autorizar(
        signResult.signedXml,
        config,
        certificate,
        { sincrono: true },
      );

      if (authResult.success && authResult.protocolo) {
        // Update document with protocol
        document.status = NfeStatus.AUTHORIZED;
        document.protocolo = authResult.protocolo;
        document.authorizedXml =
          authResult.xml ||
          this.xmlGenerator.generateNfeProc(signResult.signedXml, authResult.protocolo);
        document.updatedAt = new Date();
        document.statusHistory.push({
          status: NfeStatus.AUTHORIZED,
          timestamp: new Date(),
          message: `Authorized: ${authResult.protocolo.infProt.nProt}`,
        });

        // Generate DANFE if requested
        if (options.generateDanfe) {
          const danfeResult = await this.danfeService.generateDanfe({
            nfe,
            protocolo: authResult.protocolo,
            logo: options.danfeLogo,
          });
          if (danfeResult.success) {
            document.danfe = danfeResult.pdf;
          }
        }

        this.emitStatusChange(document);
        return { success: true, document };
      } else if (authResult.recibo) {
        // Async processing - need to query receipt later
        document.status = NfeStatus.PENDING_AUTHORIZATION;
        document.updatedAt = new Date();
        document.statusHistory.push({
          status: NfeStatus.PENDING_AUTHORIZATION,
          timestamp: new Date(),
          message: `Receipt: ${authResult.recibo}`,
        });

        this.emitStatusChange(document);
        return { success: true, document };
      } else {
        // Authorization failed
        document.status = NfeStatus.DENIED;
        document.updatedAt = new Date();
        document.statusHistory.push({
          status: NfeStatus.DENIED,
          timestamp: new Date(),
          message: authResult.xMotivo || authResult.error || 'Authorization denied',
        });

        this.emitStatusChange(document);
        return {
          success: false,
          document,
          error: authResult.xMotivo || authResult.error,
        };
      }
    } catch (error) {
      this.logger.error('Error creating NF-e', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel NF-e
   */
  async cancelDocument(
    documentIdOrChave: string,
    xJust: string,
    config: NfeSefazConfig,
    certificate: NfeCertificate,
  ): Promise<DocumentProcessingResult> {
    this.logger.log(`Cancelling NF-e: ${documentIdOrChave}`);

    const document =
      this.getDocument(documentIdOrChave) || this.getDocumentByChave(documentIdOrChave);

    if (!document) {
      return { success: false, error: 'Document not found' };
    }

    if (document.status !== NfeStatus.AUTHORIZED) {
      return { success: false, error: 'Only authorized documents can be cancelled' };
    }

    if (!document.protocolo) {
      return { success: false, error: 'Document has no protocol' };
    }

    if (xJust.length < 15) {
      return { success: false, error: 'Justification must have at least 15 characters' };
    }

    try {
      // Generate cancellation event
      const eventXml = this.xmlGenerator.generateEvento(
        document.chaveAcesso!,
        NfeTipoEvento.CANCELAMENTO,
        1,
        {
          descEvento: 'Cancelamento',
          nProt: document.protocolo.infProt.nProt,
          xJust,
        },
        document.nfe.emit.cnpjCpf,
        config.ambiente,
      );

      // Sign event
      const signResult = this.signatureService.signEvento(eventXml, certificate);
      if (!signResult.success || !signResult.signedXml) {
        return { success: false, error: signResult.error || 'Event signature failed' };
      }

      // Send event to SEFAZ
      const eventResult = await this.sefazService.enviarEvento(
        signResult.signedXml,
        config,
        certificate,
      );

      if (eventResult.success) {
        document.status = NfeStatus.CANCELLED;
        document.updatedAt = new Date();
        document.eventos = document.eventos || [];
        document.eventos.push({
          tipo: NfeTipoEvento.CANCELAMENTO,
          sequencia: 1,
          evento: {} as NfeEvento, // Would parse from XML
          retorno: {} as NfeRetornoEvento,
          xml: signResult.signedXml,
        });
        document.statusHistory.push({
          status: NfeStatus.CANCELLED,
          timestamp: new Date(),
          message: `Cancelled: ${eventResult.nProt || 'Protocol pending'}`,
        });

        this.emitStatusChange(document);
        return { success: true, document };
      } else {
        return {
          success: false,
          document,
          error: eventResult.xMotivo || eventResult.error,
        };
      }
    } catch (error) {
      this.logger.error('Error cancelling NF-e', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Issue correction letter (CC-e)
   */
  async issueCorrection(
    documentIdOrChave: string,
    xCorrecao: string,
    config: NfeSefazConfig,
    certificate: NfeCertificate,
  ): Promise<DocumentProcessingResult> {
    this.logger.log(`Issuing correction letter for: ${documentIdOrChave}`);

    const document =
      this.getDocument(documentIdOrChave) || this.getDocumentByChave(documentIdOrChave);

    if (!document) {
      return { success: false, error: 'Document not found' };
    }

    if (document.status !== NfeStatus.AUTHORIZED) {
      return { success: false, error: 'Only authorized documents can have correction letters' };
    }

    if (xCorrecao.length < 15) {
      return { success: false, error: 'Correction text must have at least 15 characters' };
    }

    try {
      // Determine sequence number (max 20 corrections per NF-e)
      const existingCorrections =
        document.eventos?.filter((e) => e.tipo === NfeTipoEvento.CARTA_CORRECAO).length || 0;

      if (existingCorrections >= 20) {
        return { success: false, error: 'Maximum of 20 correction letters per NF-e' };
      }

      const nSeqEvento = existingCorrections + 1;

      // Generate correction event
      const eventXml = this.xmlGenerator.generateEvento(
        document.chaveAcesso!,
        NfeTipoEvento.CARTA_CORRECAO,
        nSeqEvento,
        {
          descEvento: 'Carta de Correcao',
          xCorrecao,
        },
        document.nfe.emit.cnpjCpf,
        config.ambiente,
      );

      // Sign event
      const signResult = this.signatureService.signEvento(eventXml, certificate);
      if (!signResult.success || !signResult.signedXml) {
        return { success: false, error: signResult.error || 'Event signature failed' };
      }

      // Send event to SEFAZ
      const eventResult = await this.sefazService.enviarEvento(
        signResult.signedXml,
        config,
        certificate,
      );

      if (eventResult.success) {
        document.status = NfeStatus.CORRECTED;
        document.updatedAt = new Date();
        document.eventos = document.eventos || [];
        document.eventos.push({
          tipo: NfeTipoEvento.CARTA_CORRECAO,
          sequencia: nSeqEvento,
          evento: {} as NfeEvento,
          retorno: {} as NfeRetornoEvento,
          xml: signResult.signedXml,
        });
        document.statusHistory.push({
          status: NfeStatus.CORRECTED,
          timestamp: new Date(),
          message: `Correction letter #${nSeqEvento}: ${eventResult.nProt || 'Protocol pending'}`,
        });

        this.emitStatusChange(document);
        return { success: true, document };
      } else {
        return {
          success: false,
          document,
          error: eventResult.xMotivo || eventResult.error,
        };
      }
    } catch (error) {
      this.logger.error('Error issuing correction letter', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Query document status from SEFAZ
   */
  async refreshStatus(
    documentIdOrChave: string,
    config: NfeSefazConfig,
    certificate: NfeCertificate,
  ): Promise<DocumentProcessingResult> {
    const document =
      this.getDocument(documentIdOrChave) || this.getDocumentByChave(documentIdOrChave);

    if (!document) {
      return { success: false, error: 'Document not found' };
    }

    if (!document.chaveAcesso) {
      return { success: false, error: 'Document has no access key' };
    }

    try {
      const result = await this.sefazService.consultarChave(
        document.chaveAcesso,
        config,
        certificate,
      );

      if (result.success && result.protocolo) {
        // Update document with latest info
        document.protocolo = result.protocolo;
        document.updatedAt = new Date();

        // Update status based on SEFAZ response
        const cStat = result.protocolo.infProt.cStat;
        if (cStat === 100) {
          document.status = NfeStatus.AUTHORIZED;
        } else if (cStat === 101) {
          document.status = NfeStatus.CANCELLED;
        } else if (cStat === 110) {
          document.status = NfeStatus.DENIED;
        }

        return { success: true, document };
      }

      return {
        success: false,
        document,
        error: result.xMotivo || result.error,
      };
    } catch (error) {
      this.logger.error('Error refreshing status', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate DANFE for document
   */
  async generateDanfe(
    documentIdOrChave: string,
    logo?: string,
  ): Promise<{ success: boolean; danfe?: string; error?: string }> {
    const document =
      this.getDocument(documentIdOrChave) || this.getDocumentByChave(documentIdOrChave);

    if (!document) {
      return { success: false, error: 'Document not found' };
    }

    const result = await this.danfeService.generateDanfe({
      nfe: document.nfe,
      protocolo: document.protocolo,
      logo,
    });

    if (result.success) {
      document.danfe = result.pdf;
      document.updatedAt = new Date();
    }

    return {
      success: result.success,
      danfe: result.pdf,
      error: result.error,
    };
  }

  /**
   * Validate NF-e structure
   */
  validateNfe(nfe: NfeInfNfe): NfeValidationResult {
    const errors: NfeValidationError[] = [];
    const warnings: NfeValidationError[] = [];

    // Required fields validation
    if (!nfe.ide) {
      errors.push({ code: 'E001', message: 'Missing ide (identification)', severity: 'error' });
    } else {
      if (!nfe.ide.cUF) {
        errors.push({ code: 'E002', message: 'Missing cUF', field: 'ide.cUF', severity: 'error' });
      }
      if (!nfe.ide.natOp) {
        errors.push({
          code: 'E003',
          message: 'Missing natOp',
          field: 'ide.natOp',
          severity: 'error',
        });
      }
      if (!nfe.ide.dhEmi) {
        errors.push({
          code: 'E004',
          message: 'Missing dhEmi',
          field: 'ide.dhEmi',
          severity: 'error',
        });
      }
    }

    if (!nfe.emit) {
      errors.push({ code: 'E010', message: 'Missing emit (issuer)', severity: 'error' });
    } else {
      if (!nfe.emit.cnpjCpf) {
        errors.push({
          code: 'E011',
          message: 'Missing issuer CNPJ/CPF',
          field: 'emit.cnpjCpf',
          severity: 'error',
        });
      }
      if (!nfe.emit.ie) {
        errors.push({
          code: 'E012',
          message: 'Missing issuer IE',
          field: 'emit.ie',
          severity: 'error',
        });
      }
      if (!nfe.emit.razaoSocial) {
        errors.push({
          code: 'E013',
          message: 'Missing issuer name',
          field: 'emit.razaoSocial',
          severity: 'error',
        });
      }
    }

    if (!nfe.det || nfe.det.length === 0) {
      errors.push({ code: 'E020', message: 'Missing products', severity: 'error' });
    } else {
      nfe.det.forEach((prod, idx) => {
        if (!prod.codigo) {
          errors.push({
            code: 'E021',
            message: `Missing product code`,
            field: `det[${idx}].codigo`,
            severity: 'error',
          });
        }
        if (!prod.descricao) {
          errors.push({
            code: 'E022',
            message: `Missing product description`,
            field: `det[${idx}].descricao`,
            severity: 'error',
          });
        }
        if (!prod.ncm) {
          errors.push({
            code: 'E023',
            message: `Missing NCM`,
            field: `det[${idx}].ncm`,
            severity: 'error',
          });
        }
        if (!prod.cfop) {
          errors.push({
            code: 'E024',
            message: `Missing CFOP`,
            field: `det[${idx}].cfop`,
            severity: 'error',
          });
        }
      });
    }

    if (!nfe.total) {
      errors.push({ code: 'E030', message: 'Missing totals', severity: 'error' });
    }

    if (!nfe.transp) {
      errors.push({ code: 'E040', message: 'Missing transport info', severity: 'error' });
    }

    if (!nfe.pag) {
      errors.push({ code: 'E050', message: 'Missing payment info', severity: 'error' });
    }

    // Warnings
    if (nfe.ide?.tpAmb === 2) {
      warnings.push({
        code: 'W001',
        message: 'Environment is homologação (testing)',
        severity: 'warning',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      validatedAt: new Date(),
    };
  }

  /**
   * Get document by ID
   */
  getDocument(documentId: string): NfeDocument | null {
    return this.documents.get(documentId) || null;
  }

  /**
   * Get document by access key
   */
  getDocumentByChave(chaveAcesso: string): NfeDocument | null {
    const documentId = this.documentsByChave.get(chaveAcesso);
    return documentId ? this.documents.get(documentId) || null : null;
  }

  /**
   * Get documents by tenant
   */
  getDocumentsByTenant(tenantId: string): NfeDocument[] {
    return Array.from(this.documents.values()).filter((doc) => doc.tenantId === tenantId);
  }

  /**
   * Get documents by status
   */
  getDocumentsByStatus(status: NfeStatus, tenantId?: string): NfeDocument[] {
    let docs = Array.from(this.documents.values()).filter((doc) => doc.status === status);

    if (tenantId) {
      docs = docs.filter((doc) => doc.tenantId === tenantId);
    }

    return docs;
  }

  /**
   * Get statistics
   */
  getStatistics(tenantId?: string): {
    total: number;
    byStatus: Record<NfeStatus, number>;
  } {
    let docs = Array.from(this.documents.values());

    if (tenantId) {
      docs = docs.filter((doc) => doc.tenantId === tenantId);
    }

    const byStatus: Record<NfeStatus, number> = {
      [NfeStatus.DRAFT]: 0,
      [NfeStatus.SIGNED]: 0,
      [NfeStatus.AUTHORIZED]: 0,
      [NfeStatus.DENIED]: 0,
      [NfeStatus.CANCELLED]: 0,
      [NfeStatus.CORRECTED]: 0,
      [NfeStatus.PENDING_AUTHORIZATION]: 0,
      [NfeStatus.PENDING_CANCELLATION]: 0,
    };

    docs.forEach((doc) => {
      byStatus[doc.status]++;
    });

    return {
      total: docs.length,
      byStatus,
    };
  }

  /**
   * Register status change callback
   */
  onStatusChange(callback: (event: any) => void): void {
    this.statusChangeCallbacks.push(callback);
  }

  /**
   * Emit status change event
   */
  private emitStatusChange(document: NfeDocument): void {
    const event = {
      documentId: document.documentId,
      chaveAcesso: document.chaveAcesso,
      tenantId: document.tenantId,
      status: document.status,
      timestamp: new Date(),
    };

    this.statusChangeCallbacks.forEach((cb) => {
      try {
        cb(event);
      } catch (error) {
        this.logger.error('Error in status change callback', error);
      }
    });
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(): string {
    return `nfe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
