import { Injectable, Logger } from '@nestjs/common';
import {
  NfeInfNfe,
  NfeDocument,
  NfeStatus,
  NfeProtocolo,
  NfeCertificate,
  NfeSefazConfig,
  NfeConfig,
  NfeValidationResult,
  NfeUf,
  NfeModelo,
  NfeTipoOperacao,
  NfeDestinoOperacao,
  NfeIndicadorConsumidor,
  NfeIndicadorPresenca,
  NfeFinalidade,
  NfeTipoEmissao,
  NfeModalidadeFrete,
  NfeMeioPagamento,
  NfeIndicadorPagamento,
  NfeProduto,
  NfeEmitente,
  NfeDestinatario,
} from '../interfaces';
import { NfeXmlGeneratorService } from './nfe-xml-generator.service';
import { NfeSignatureService, CertificateInfo } from './nfe-signature.service';
import { NfeSefazService, SefazStatusResponse } from './nfe-sefaz.service';
import { NfeDanfeService, DanfeGenerationResult } from './nfe-danfe.service';
import { NfeDocumentService, DocumentProcessingResult } from './nfe-document.service';

/**
 * Create NF-e Options
 */
export interface CreateNfeOptions {
  /** Tenant ID */
  tenantId: string;
  /** Digital Certificate */
  certificate: NfeCertificate;
  /** SEFAZ Configuration */
  sefazConfig: NfeSefazConfig;
  /** Generate DANFE */
  generateDanfe?: boolean;
  /** DANFE Logo (base64) */
  danfeLogo?: string;
}

/**
 * NF-e Service
 *
 * Main facade service for NF-e (Brazilian electronic invoicing) operations.
 * Orchestrates all NF-e-related functionality including:
 * - Invoice creation and authorization
 * - Certificate management
 * - SEFAZ communication
 * - DANFE generation
 * - Cancellation and correction letters
 * - Contingency modes
 *
 * @see Manual de Integração - Contribuinte (versão 4.0.1)
 */
@Injectable()
export class NfeService {
  private readonly logger = new Logger(NfeService.name);

  constructor(
    private readonly xmlGenerator: NfeXmlGeneratorService,
    private readonly signatureService: NfeSignatureService,
    private readonly sefazService: NfeSefazService,
    private readonly danfeService: NfeDanfeService,
    private readonly documentService: NfeDocumentService,
  ) {}

  // ===========================================================================
  // Document Creation
  // ===========================================================================

  /**
   * Create and authorize NF-e
   */
  async createNfe(nfe: NfeInfNfe, options: CreateNfeOptions): Promise<DocumentProcessingResult> {
    this.logger.log(`Creating NF-e ${nfe.ide.serie}/${nfe.ide.nNF}`);

    return this.documentService.createAndAuthorize(nfe, options.sefazConfig, options.certificate, {
      tenantId: options.tenantId,
      generateDanfe: options.generateDanfe,
      danfeLogo: options.danfeLogo,
    });
  }

  /**
   * Create NF-e with contingency mode
   */
  async createNfeContingencia(
    nfe: NfeInfNfe,
    options: CreateNfeOptions,
    contingencia: {
      tipo: NfeTipoEmissao;
      justificativa: string;
    },
  ): Promise<DocumentProcessingResult> {
    this.logger.log(`Creating NF-e in contingency mode: ${contingencia.tipo}`);

    // Update NF-e with contingency info
    const nfeContingencia: NfeInfNfe = {
      ...nfe,
      ide: {
        ...nfe.ide,
        tpEmis: contingencia.tipo,
        dhCont: new Date().toISOString().replace('Z', '-03:00'),
        xJust: contingencia.justificativa,
      },
    };

    const configContingencia: NfeSefazConfig = {
      ...options.sefazConfig,
      contingencia: {
        tipo: contingencia.tipo,
        justificativa: contingencia.justificativa,
        dataHora: new Date().toISOString(),
      },
    };

    return this.documentService.createAndAuthorize(
      nfeContingencia,
      configContingencia,
      options.certificate,
      {
        tenantId: options.tenantId,
        generateDanfe: options.generateDanfe,
        danfeLogo: options.danfeLogo,
      },
    );
  }

  // ===========================================================================
  // Document Management
  // ===========================================================================

  /**
   * Cancel NF-e
   */
  async cancelNfe(
    documentIdOrChave: string,
    xJust: string,
    config: NfeSefazConfig,
    certificate: NfeCertificate,
  ): Promise<DocumentProcessingResult> {
    return this.documentService.cancelDocument(documentIdOrChave, xJust, config, certificate);
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
    return this.documentService.issueCorrection(documentIdOrChave, xCorrecao, config, certificate);
  }

  /**
   * Refresh document status from SEFAZ
   */
  async refreshDocumentStatus(
    documentIdOrChave: string,
    config: NfeSefazConfig,
    certificate: NfeCertificate,
  ): Promise<DocumentProcessingResult> {
    return this.documentService.refreshStatus(documentIdOrChave, config, certificate);
  }

  /**
   * Get document by ID
   */
  getDocument(documentId: string): NfeDocument | null {
    return this.documentService.getDocument(documentId);
  }

  /**
   * Get document by access key
   */
  getDocumentByChave(chaveAcesso: string): NfeDocument | null {
    return this.documentService.getDocumentByChave(chaveAcesso);
  }

  /**
   * Get documents by tenant
   */
  getDocumentsByTenant(tenantId: string): NfeDocument[] {
    return this.documentService.getDocumentsByTenant(tenantId);
  }

  /**
   * Get documents by status
   */
  getDocumentsByStatus(status: NfeStatus, tenantId?: string): NfeDocument[] {
    return this.documentService.getDocumentsByStatus(status, tenantId);
  }

  // ===========================================================================
  // XML Generation
  // ===========================================================================

  /**
   * Generate NF-e XML without authorization
   */
  generateXml(nfe: NfeInfNfe): string {
    return this.xmlGenerator.generateNfe(nfe);
  }

  /**
   * Generate access key
   */
  generateAccessKey(nfe: NfeInfNfe): string {
    return this.xmlGenerator.generateAccessKey(nfe);
  }

  // ===========================================================================
  // Validation
  // ===========================================================================

  /**
   * Validate NF-e structure
   */
  validateNfe(nfe: NfeInfNfe): NfeValidationResult {
    return this.documentService.validateNfe(nfe);
  }

  // ===========================================================================
  // Certificate Management
  // ===========================================================================

  /**
   * Parse certificate and get information
   */
  parseCertificate(certificate: NfeCertificate): CertificateInfo {
    return this.signatureService.parseCertificate(certificate);
  }

  /**
   * Validate certificate
   */
  validateCertificate(certificate: NfeCertificate): { valid: boolean; error?: string } {
    return this.signatureService.validateCertificatePair(certificate);
  }

  /**
   * Get certificate expiration warning
   */
  getCertificateExpirationWarning(certificate: NfeCertificate): string | null {
    return this.signatureService.getCertificateExpirationWarning(certificate);
  }

  /**
   * Generate test certificate (development only)
   */
  generateTestCertificate(cnpj: string, razaoSocial: string): NfeCertificate {
    return this.signatureService.generateTestCertificate(cnpj, razaoSocial);
  }

  // ===========================================================================
  // SEFAZ Operations
  // ===========================================================================

  /**
   * Check SEFAZ status
   */
  async checkSefazStatus(
    config: NfeSefazConfig,
    certificate: NfeCertificate,
  ): Promise<SefazStatusResponse> {
    return this.sefazService.consultarStatus(config, certificate);
  }

  /**
   * Check if SEFAZ is available
   */
  async isSefazAvailable(config: NfeSefazConfig, certificate: NfeCertificate): Promise<boolean> {
    return this.sefazService.isAvailable(config, certificate);
  }

  /**
   * Get contingency recommendation
   */
  async getContingencyRecommendation(
    config: NfeSefazConfig,
    certificate: NfeCertificate,
  ): Promise<NfeTipoEmissao | null> {
    return this.sefazService.getContingencyRecommendation(config, certificate);
  }

  /**
   * Query NF-e by access key
   */
  async queryNfeByChave(
    chNFe: string,
    config: NfeSefazConfig,
    certificate: NfeCertificate,
  ): Promise<{ success: boolean; protocolo?: NfeProtocolo; error?: string }> {
    const result = await this.sefazService.consultarChave(chNFe, config, certificate);
    return {
      success: result.success,
      protocolo: result.protocolo,
      error: result.error,
    };
  }

  // ===========================================================================
  // DANFE Generation
  // ===========================================================================

  /**
   * Generate DANFE for document
   */
  async generateDanfe(
    documentIdOrChave: string,
    logo?: string,
  ): Promise<{ success: boolean; danfe?: string; error?: string }> {
    return this.documentService.generateDanfe(documentIdOrChave, logo);
  }

  /**
   * Generate DANFE from NF-e data
   */
  async generateDanfeFromData(
    nfe: NfeInfNfe,
    protocolo?: NfeProtocolo,
    logo?: string,
  ): Promise<DanfeGenerationResult> {
    return this.danfeService.generateDanfe({
      nfe,
      protocolo,
      logo,
    });
  }

  /**
   * Generate DANFE HTML
   */
  generateDanfeHtml(nfe: NfeInfNfe, protocolo?: NfeProtocolo, logo?: string): string {
    return this.danfeService.generateDanfeHtml({
      nfe,
      protocolo,
      logo,
    });
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get document statistics
   */
  getStatistics(tenantId?: string): {
    total: number;
    byStatus: Record<NfeStatus, number>;
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
  // Builder Helpers
  // ===========================================================================

  /**
   * Build basic NF-e structure
   */
  buildNfe(params: {
    uf: NfeUf | number;
    natOp: string;
    modelo?: NfeModelo;
    serie: number;
    nNF: number;
    tpNF?: NfeTipoOperacao;
    idDest?: NfeDestinoOperacao;
    tpAmb: 1 | 2;
    emit: NfeEmitente;
    dest?: NfeDestinatario;
    produtos: NfeProduto[];
    modFrete?: NfeModalidadeFrete;
    pagamentos: Array<{ tPag: NfeMeioPagamento | string; vPag: number }>;
  }): NfeInfNfe {
    const cNF = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
    const dhEmi = new Date().toISOString().replace('Z', '-03:00');

    // Calculate totals
    const totais = this.calculateTotals(params.produtos);

    // Calculate check digit (simplified - actual calculation in XML generator)
    const cDV = 0;

    return {
      versao: '4.00',
      ide: {
        cUF: params.uf,
        cNF,
        natOp: params.natOp,
        mod: params.modelo || NfeModelo.NFE,
        serie: params.serie,
        nNF: params.nNF,
        dhEmi,
        tpNF: params.tpNF ?? NfeTipoOperacao.SAIDA,
        idDest: params.idDest ?? NfeDestinoOperacao.INTERNA,
        cMunFG: params.emit.endereco.codigoMunicipio,
        tpImp: 1, // DANFE Retrato
        tpEmis: NfeTipoEmissao.NORMAL,
        cDV,
        tpAmb: params.tpAmb,
        finNFe: NfeFinalidade.NORMAL,
        indFinal: NfeIndicadorConsumidor.CONSUMIDOR_FINAL,
        indPres: NfeIndicadorPresenca.PRESENCIAL,
        procEmi: 0,
        verProc: '1.0.0',
      },
      emit: params.emit,
      dest: params.dest,
      det: params.produtos,
      total: {
        ICMSTot: totais,
      },
      transp: {
        modFrete: params.modFrete ?? NfeModalidadeFrete.SEM_FRETE,
      },
      pag: {
        detPag: params.pagamentos.map((p) => ({
          indPag: NfeIndicadorPagamento.A_VISTA,
          tPag: p.tPag,
          vPag: p.vPag,
        })),
      },
    };
  }

  /**
   * Calculate totals from products
   */
  private calculateTotals(produtos: NfeProduto[]): NfeInfNfe['total']['ICMSTot'] {
    let vBC = 0;
    let vICMS = 0;
    const vICMSDeson = 0;
    let vFCP = 0;
    let vBCST = 0;
    let vST = 0;
    let vFCPST = 0;
    const vFCPSTRet = 0;
    let vProd = 0;
    let vFrete = 0;
    let vSeg = 0;
    let vDesc = 0;
    let vII = 0;
    let vIPI = 0;
    const vIPIDevol = 0;
    let vPIS = 0;
    let vCOFINS = 0;
    let vOutro = 0;

    for (const prod of produtos) {
      vProd += prod.vProd;
      vFrete += prod.vFrete || 0;
      vSeg += prod.vSeg || 0;
      vDesc += prod.vDesc || 0;
      vOutro += prod.vOutro || 0;

      // ICMS
      if (prod.imposto.icms) {
        vBC += prod.imposto.icms.vBC || 0;
        vICMS += prod.imposto.icms.vICMS || 0;
        vFCP += prod.imposto.icms.vFCP || 0;
        vBCST += prod.imposto.icms.vBCST || 0;
        vST += prod.imposto.icms.vICMSST || 0;
        vFCPST += prod.imposto.icms.vFCPST || 0;
      }

      // IPI
      if (prod.imposto.ipi) {
        vIPI += prod.imposto.ipi.vIPI || 0;
      }

      // PIS
      if (prod.imposto.pis) {
        vPIS += prod.imposto.pis.vPIS || 0;
      }

      // COFINS
      if (prod.imposto.cofins) {
        vCOFINS += prod.imposto.cofins.vCOFINS || 0;
      }

      // II
      if (prod.imposto.ii) {
        vII += prod.imposto.ii.vII || 0;
      }
    }

    const vNF = vProd - vDesc + vST + vFrete + vSeg + vOutro + vII + vIPI;

    return {
      vBC,
      vICMS,
      vICMSDeson,
      vFCP,
      vBCST,
      vST,
      vFCPST,
      vFCPSTRet,
      vProd,
      vFrete,
      vSeg,
      vDesc,
      vII,
      vIPI,
      vIPIDevol,
      vPIS,
      vCOFINS,
      vOutro,
      vNF,
    };
  }
}
