import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import {
  NfeSefazConfig,
  NfeUf,
  NfeAutorizacaoRequest,
  NfeAutorizacaoResponse,
  NfeProtocolo,
  NfeTipoEmissao,
  NfeCertificate,
  NfeCertificateType,
} from '../interfaces';

/**
 * SEFAZ Webservice URLs by State (Production)
 */
const SEFAZ_URLS_PRODUCAO: Record<
  number,
  { autorizacao: string; consulta: string; evento: string; status: string }
> = {
  // São Paulo
  [NfeUf.SP]: {
    autorizacao: 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
    consulta: 'https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
    evento: 'https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx',
    status: 'https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
  },
  // Rio Grande do Sul
  [NfeUf.RS]: {
    autorizacao: 'https://nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    consulta: 'https://nfe.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    evento: 'https://nfe.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
    status: 'https://nfe.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
  },
  // Minas Gerais
  [NfeUf.MG]: {
    autorizacao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4',
    consulta: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4',
    evento: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4',
    status: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4',
  },
  // Paraná
  [NfeUf.PR]: {
    autorizacao: 'https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4?wsdl',
    consulta: 'https://nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4?wsdl',
    evento: 'https://nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4?wsdl',
    status: 'https://nfe.sefa.pr.gov.br/nfe/NFeStatusServico4?wsdl',
  },
  // Bahia
  [NfeUf.BA]: {
    autorizacao: 'https://nfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx',
    consulta:
      'https://nfe.sefaz.ba.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
    evento: 'https://nfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
    status: 'https://nfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx',
  },
  // Goiás
  [NfeUf.GO]: {
    autorizacao: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4',
    consulta: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4',
    evento: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4',
    status: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeStatusServico4',
  },
  // Pernambuco
  [NfeUf.PE]: {
    autorizacao: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4',
    consulta: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeConsultaProtocolo4',
    evento: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeRecepcaoEvento4',
    status: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico4',
  },
  // Mato Grosso
  [NfeUf.MT]: {
    autorizacao: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4',
    consulta: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeConsulta4',
    evento: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/RecepcaoEvento4',
    status: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeStatusServico4',
  },
};

/**
 * SEFAZ Webservice URLs by State (Homologação/Testing)
 */
const SEFAZ_URLS_HOMOLOGACAO: Record<
  number,
  { autorizacao: string; consulta: string; evento: string; status: string }
> = {
  [NfeUf.SP]: {
    autorizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
    consulta: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
    evento: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx',
    status: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
  },
  [NfeUf.RS]: {
    autorizacao: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    consulta: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    evento: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
    status: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
  },
  [NfeUf.MG]: {
    autorizacao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4',
    consulta: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4',
    evento: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4',
    status: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4',
  },
  // Default to SVRS for states without own infrastructure
};

/**
 * SVRS (Sefaz Virtual do Rio Grande do Sul) - serves multiple states
 */
const SVRS_URLS = {
  producao: {
    autorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    consulta: 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    evento: 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
    status: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
  },
  homologacao: {
    autorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    consulta: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    evento: 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
    status: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
  },
};

/**
 * SVC-AN (Contingência) - Amazon
 */
const SVC_AN_URLS = {
  producao: {
    autorizacao: 'https://www.svc.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx',
    consulta: 'https://www.svc.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
    evento: 'https://www.svc.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
    status: 'https://www.svc.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
  },
  homologacao: {
    autorizacao: 'https://hom.svc.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx',
    consulta: 'https://hom.svc.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
    evento: 'https://hom.svc.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
    status: 'https://hom.svc.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
  },
};

/**
 * SVC-RS (Contingência) - Rio Grande do Sul
 */
const SVC_RS_URLS = {
  producao: {
    autorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    consulta: 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    evento: 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
    status: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
  },
  homologacao: {
    autorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    consulta: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    evento: 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
    status: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
  },
};

/**
 * States served by SVRS
 */
const SVRS_STATES = [
  NfeUf.AC,
  NfeUf.AL,
  NfeUf.AP,
  NfeUf.DF,
  NfeUf.ES,
  NfeUf.PB,
  NfeUf.PI,
  NfeUf.RJ,
  NfeUf.RN,
  NfeUf.RO,
  NfeUf.RR,
  NfeUf.SC,
  NfeUf.SE,
  NfeUf.TO,
];

/**
 * SEFAZ Response Status
 */
export interface SefazStatusResponse {
  success: boolean;
  cStat: number;
  xMotivo: string;
  dhRecbto?: string;
  tMed?: number;
  error?: string;
}

/**
 * NF-e SEFAZ Service
 *
 * Handles all communication with SEFAZ webservices including:
 * - NF-e authorization (synchronous and asynchronous)
 * - Protocol consultation
 * - Event reception (cancellation, correction letter)
 * - Service status check
 * - Contingency modes (SVC-AN, SVC-RS)
 *
 * @see Manual de Integração - Contribuinte (versão 4.0.1)
 */
@Injectable()
export class NfeSefazService {
  private readonly logger = new Logger(NfeSefazService.name);

  private readonly NFE_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe';
  private readonly SOAP_NAMESPACE = 'http://www.w3.org/2003/05/soap-envelope';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Send NF-e for authorization
   */
  async autorizar(
    signedXml: string,
    config: NfeSefazConfig,
    certificate: NfeCertificate,
    options: { sincrono?: boolean; compactar?: boolean; idLote?: string } = {},
  ): Promise<NfeAutorizacaoResponse> {
    this.logger.log('Sending NF-e for authorization');

    try {
      const urls = this.getWebserviceUrls(config.uf, config.ambiente, config.contingencia?.tipo);
      const url = urls.autorizacao;

      const idLote = options.idLote || Date.now().toString();
      const indSinc = options.sincrono !== false ? '1' : '0';

      // Build SOAP envelope
      const soapBody = this.buildAutorizacaoSoapEnvelope(
        signedXml,
        idLote,
        indSinc,
        config.ambiente,
      );

      // Send request
      const response = await this.sendSoapRequest(url, soapBody, certificate, 'nfeAutorizacaoLote');

      // Parse response
      return this.parseAutorizacaoResponse(response);
    } catch (error) {
      this.logger.error('Error authorizing NF-e', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Query authorization status by receipt number
   */
  async consultarRecibo(
    recibo: string,
    config: NfeSefazConfig,
    certificate: NfeCertificate,
  ): Promise<NfeAutorizacaoResponse> {
    this.logger.log(`Consulting receipt: ${recibo}`);

    try {
      const urls = this.getWebserviceUrls(config.uf, config.ambiente, config.contingencia?.tipo);
      const url = urls.consulta;

      const soapBody = this.buildConsultaReciboSoapEnvelope(recibo, config.ambiente);
      const response = await this.sendSoapRequest(
        url,
        soapBody,
        certificate,
        'nfeRetAutorizacaoLote',
      );

      return this.parseAutorizacaoResponse(response);
    } catch (error) {
      this.logger.error('Error consulting receipt', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Query NF-e by access key
   */
  async consultarChave(
    chNFe: string,
    config: NfeSefazConfig,
    certificate: NfeCertificate,
  ): Promise<NfeAutorizacaoResponse> {
    this.logger.log(`Consulting NF-e: ${chNFe}`);

    try {
      const urls = this.getWebserviceUrls(config.uf, config.ambiente, config.contingencia?.tipo);
      const url = urls.consulta;

      const soapBody = this.buildConsultaChaveSoapEnvelope(chNFe, config.ambiente);
      const response = await this.sendSoapRequest(url, soapBody, certificate, 'nfeConsultaNF');

      return this.parseConsultaResponse(response);
    } catch (error) {
      this.logger.error('Error consulting NF-e', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send event (cancellation, correction letter, etc.)
   */
  async enviarEvento(
    signedEventXml: string,
    config: NfeSefazConfig,
    certificate: NfeCertificate,
  ): Promise<{
    success: boolean;
    cStat?: number;
    xMotivo?: string;
    nProt?: string;
    error?: string;
  }> {
    this.logger.log('Sending event');

    try {
      const urls = this.getWebserviceUrls(config.uf, config.ambiente, config.contingencia?.tipo);
      const url = urls.evento;

      const idLote = Date.now().toString();
      const soapBody = this.buildEventoSoapEnvelope(signedEventXml, idLote, config.ambiente);

      const response = await this.sendSoapRequest(url, soapBody, certificate, 'nfeRecepcaoEvento');

      return this.parseEventoResponse(response);
    } catch (error) {
      this.logger.error('Error sending event', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check SEFAZ service status
   */
  async consultarStatus(
    config: NfeSefazConfig,
    certificate: NfeCertificate,
  ): Promise<SefazStatusResponse> {
    this.logger.log('Checking SEFAZ status');

    try {
      const urls = this.getWebserviceUrls(config.uf, config.ambiente, config.contingencia?.tipo);
      const url = urls.status;

      const soapBody = this.buildStatusSoapEnvelope(config.uf, config.ambiente);
      const response = await this.sendSoapRequest(url, soapBody, certificate, 'nfeStatusServico');

      return this.parseStatusResponse(response);
    } catch (error) {
      this.logger.error('Error checking status', error);
      return {
        success: false,
        cStat: 999,
        xMotivo: 'Falha na comunicação com SEFAZ',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get webservice URLs for state and environment
   */
  private getWebserviceUrls(
    uf: NfeUf | number,
    ambiente: 1 | 2,
    tipoEmissao?: NfeTipoEmissao,
  ): { autorizacao: string; consulta: string; evento: string; status: string } {
    // Handle contingency modes
    if (tipoEmissao === NfeTipoEmissao.CONTINGENCIA_SVC_AN) {
      return ambiente === 1 ? SVC_AN_URLS.producao : SVC_AN_URLS.homologacao;
    }

    if (tipoEmissao === NfeTipoEmissao.CONTINGENCIA_SVC_RS) {
      return ambiente === 1 ? SVC_RS_URLS.producao : SVC_RS_URLS.homologacao;
    }

    // Check if state uses SVRS
    if (SVRS_STATES.includes(uf as NfeUf)) {
      return ambiente === 1 ? SVRS_URLS.producao : SVRS_URLS.homologacao;
    }

    // Get state-specific URLs
    const stateUrls =
      ambiente === 1 ? SEFAZ_URLS_PRODUCAO[uf as number] : SEFAZ_URLS_HOMOLOGACAO[uf as number];

    if (stateUrls) {
      return stateUrls;
    }

    // Default to SVRS
    return ambiente === 1 ? SVRS_URLS.producao : SVRS_URLS.homologacao;
  }

  /**
   * Build SOAP envelope for authorization
   */
  private buildAutorizacaoSoapEnvelope(
    signedXml: string,
    idLote: string,
    indSinc: string,
    tpAmb: 1 | 2,
  ): string {
    const nfeData = signedXml.replace(/<\?xml[^?]*\?>\s*/, '');

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="${this.SOAP_NAMESPACE}">
  <soap12:Body>
    <nfeDadosMsg xmlns="${this.NFE_NAMESPACE}">
      <enviNFe xmlns="${this.NFE_NAMESPACE}" versao="4.00">
        <idLote>${idLote}</idLote>
        <indSinc>${indSinc}</indSinc>
        ${nfeData}
      </enviNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }

  /**
   * Build SOAP envelope for receipt consultation
   */
  private buildConsultaReciboSoapEnvelope(recibo: string, tpAmb: 1 | 2): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="${this.SOAP_NAMESPACE}">
  <soap12:Body>
    <nfeDadosMsg xmlns="${this.NFE_NAMESPACE}">
      <consReciNFe xmlns="${this.NFE_NAMESPACE}" versao="4.00">
        <tpAmb>${tpAmb}</tpAmb>
        <nRec>${recibo}</nRec>
      </consReciNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }

  /**
   * Build SOAP envelope for key consultation
   */
  private buildConsultaChaveSoapEnvelope(chNFe: string, tpAmb: 1 | 2): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="${this.SOAP_NAMESPACE}">
  <soap12:Body>
    <nfeDadosMsg xmlns="${this.NFE_NAMESPACE}">
      <consSitNFe xmlns="${this.NFE_NAMESPACE}" versao="4.00">
        <tpAmb>${tpAmb}</tpAmb>
        <xServ>CONSULTAR</xServ>
        <chNFe>${chNFe}</chNFe>
      </consSitNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }

  /**
   * Build SOAP envelope for event
   */
  private buildEventoSoapEnvelope(signedEventXml: string, idLote: string, tpAmb: 1 | 2): string {
    const eventData = signedEventXml.replace(/<\?xml[^?]*\?>\s*/, '');

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="${this.SOAP_NAMESPACE}">
  <soap12:Body>
    <nfeDadosMsg xmlns="${this.NFE_NAMESPACE}">
      <envEvento xmlns="${this.NFE_NAMESPACE}" versao="1.00">
        <idLote>${idLote}</idLote>
        ${eventData}
      </envEvento>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }

  /**
   * Build SOAP envelope for status check
   */
  private buildStatusSoapEnvelope(uf: NfeUf | number, tpAmb: 1 | 2): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="${this.SOAP_NAMESPACE}">
  <soap12:Body>
    <nfeDadosMsg xmlns="${this.NFE_NAMESPACE}">
      <consStatServ xmlns="${this.NFE_NAMESPACE}" versao="4.00">
        <tpAmb>${tpAmb}</tpAmb>
        <cUF>${uf}</cUF>
        <xServ>STATUS</xServ>
      </consStatServ>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }

  /**
   * Send SOAP request to SEFAZ
   */
  private async sendSoapRequest(
    url: string,
    soapBody: string,
    certificate: NfeCertificate,
    soapAction: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);

      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'Content-Length': Buffer.byteLength(soapBody),
          SOAPAction: soapAction,
        },
        timeout: 30000,
      };

      // Add certificate for mutual TLS
      if (certificate.type === NfeCertificateType.A1 && certificate.pfx) {
        const pfxBuffer = Buffer.from(certificate.pfx, 'base64');
        options.pfx = pfxBuffer;
        options.passphrase = certificate.password;
      }

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(soapBody);
      req.end();
    });
  }

  /**
   * Parse authorization response
   */
  private parseAutorizacaoResponse(response: string): NfeAutorizacaoResponse {
    // Extract cStat and xMotivo
    const cStatMatch = response.match(/<cStat>(\d+)<\/cStat>/);
    const xMotivoMatch = response.match(/<xMotivo>([^<]+)<\/xMotivo>/);
    const nRecMatch = response.match(/<nRec>([^<]+)<\/nRec>/);

    const cStat = cStatMatch ? parseInt(cStatMatch[1], 10) : 999;
    const xMotivo = xMotivoMatch ? xMotivoMatch[1] : 'Resposta não reconhecida';

    // Check for successful authorization (100, 101, 103, 104)
    if ([100, 104].includes(cStat)) {
      // Extract protocol information
      const protocolMatch = response.match(/<protNFe[^>]*>([\s\S]*?)<\/protNFe>/);

      if (protocolMatch) {
        const protocolo = this.parseProtocol(protocolMatch[1]);
        const nfeProcMatch = response.match(/<nfeProc[^>]*>([\s\S]*?)<\/nfeProc>/);

        return {
          success: true,
          protocolo,
          xml: nfeProcMatch ? nfeProcMatch[0] : undefined,
          cStat,
          xMotivo,
        };
      }
    }

    // Batch received (103) - return receipt number
    if (cStat === 103) {
      return {
        success: true,
        recibo: nRecMatch ? nRecMatch[1] : undefined,
        cStat,
        xMotivo,
      };
    }

    // Processing (105) - need to consult later
    if (cStat === 105) {
      return {
        success: true,
        recibo: nRecMatch ? nRecMatch[1] : undefined,
        cStat,
        xMotivo,
      };
    }

    // Rejection or error
    return {
      success: false,
      cStat,
      xMotivo,
      error: xMotivo,
    };
  }

  /**
   * Parse consultation response
   */
  private parseConsultaResponse(response: string): NfeAutorizacaoResponse {
    const cStatMatch = response.match(/<cStat>(\d+)<\/cStat>/);
    const xMotivoMatch = response.match(/<xMotivo>([^<]+)<\/xMotivo>/);

    const cStat = cStatMatch ? parseInt(cStatMatch[1], 10) : 999;
    const xMotivo = xMotivoMatch ? xMotivoMatch[1] : 'Resposta não reconhecida';

    if (cStat === 100) {
      const protocolMatch = response.match(/<protNFe[^>]*>([\s\S]*?)<\/protNFe>/);

      return {
        success: true,
        protocolo: protocolMatch ? this.parseProtocol(protocolMatch[1]) : undefined,
        cStat,
        xMotivo,
      };
    }

    return {
      success: false,
      cStat,
      xMotivo,
      error: xMotivo,
    };
  }

  /**
   * Parse event response
   */
  private parseEventoResponse(response: string): {
    success: boolean;
    cStat?: number;
    xMotivo?: string;
    nProt?: string;
    error?: string;
  } {
    const cStatMatch = response.match(/<cStat>(\d+)<\/cStat>/);
    const xMotivoMatch = response.match(/<xMotivo>([^<]+)<\/xMotivo>/);
    const nProtMatch = response.match(/<nProt>([^<]+)<\/nProt>/);

    const cStat = cStatMatch ? parseInt(cStatMatch[1], 10) : 999;
    const xMotivo = xMotivoMatch ? xMotivoMatch[1] : 'Resposta não reconhecida';

    // Success codes: 135 (Evento registrado e vinculado a NF-e), 136 (Evento registrado)
    if ([135, 136].includes(cStat)) {
      return {
        success: true,
        cStat,
        xMotivo,
        nProt: nProtMatch ? nProtMatch[1] : undefined,
      };
    }

    return {
      success: false,
      cStat,
      xMotivo,
      error: xMotivo,
    };
  }

  /**
   * Parse status response
   */
  private parseStatusResponse(response: string): SefazStatusResponse {
    const cStatMatch = response.match(/<cStat>(\d+)<\/cStat>/);
    const xMotivoMatch = response.match(/<xMotivo>([^<]+)<\/xMotivo>/);
    const dhRecbtoMatch = response.match(/<dhRecbto>([^<]+)<\/dhRecbto>/);
    const tMedMatch = response.match(/<tMed>(\d+)<\/tMed>/);

    const cStat = cStatMatch ? parseInt(cStatMatch[1], 10) : 999;
    const xMotivo = xMotivoMatch ? xMotivoMatch[1] : 'Resposta não reconhecida';

    // 107 = Serviço em operação
    return {
      success: cStat === 107,
      cStat,
      xMotivo,
      dhRecbto: dhRecbtoMatch ? dhRecbtoMatch[1] : undefined,
      tMed: tMedMatch ? parseInt(tMedMatch[1], 10) : undefined,
    };
  }

  /**
   * Parse protocol from XML
   */
  private parseProtocol(protocolXml: string): NfeProtocolo {
    const tpAmbMatch = protocolXml.match(/<tpAmb>(\d)<\/tpAmb>/);
    const verAplicMatch = protocolXml.match(/<verAplic>([^<]+)<\/verAplic>/);
    const chNFeMatch = protocolXml.match(/<chNFe>([^<]+)<\/chNFe>/);
    const dhRecbtoMatch = protocolXml.match(/<dhRecbto>([^<]+)<\/dhRecbto>/);
    const nProtMatch = protocolXml.match(/<nProt>([^<]+)<\/nProt>/);
    const digValMatch = protocolXml.match(/<digVal>([^<]+)<\/digVal>/);
    const cStatMatch = protocolXml.match(/<cStat>(\d+)<\/cStat>/);
    const xMotivoMatch = protocolXml.match(/<xMotivo>([^<]+)<\/xMotivo>/);

    return {
      versao: '4.00',
      infProt: {
        tpAmb: (tpAmbMatch ? parseInt(tpAmbMatch[1], 10) : 2) as 1 | 2,
        verAplic: verAplicMatch ? verAplicMatch[1] : '',
        chNFe: chNFeMatch ? chNFeMatch[1] : '',
        dhRecbto: dhRecbtoMatch ? dhRecbtoMatch[1] : '',
        nProt: nProtMatch ? nProtMatch[1] : '',
        digVal: digValMatch ? digValMatch[1] : undefined,
        cStat: cStatMatch ? parseInt(cStatMatch[1], 10) : 999,
        xMotivo: xMotivoMatch ? xMotivoMatch[1] : '',
      },
    };
  }

  /**
   * Check if SEFAZ is available
   */
  async isAvailable(config: NfeSefazConfig, certificate: NfeCertificate): Promise<boolean> {
    const status = await this.consultarStatus(config, certificate);
    return status.success && status.cStat === 107;
  }

  /**
   * Get contingency mode recommendation
   */
  async getContingencyRecommendation(
    config: NfeSefazConfig,
    certificate: NfeCertificate,
  ): Promise<NfeTipoEmissao | null> {
    // First try normal SEFAZ
    const normalStatus = await this.consultarStatus(config, certificate);
    if (normalStatus.success) {
      return null; // No contingency needed
    }

    // Try SVC-AN
    const svcAnConfig = {
      ...config,
      contingencia: { tipo: NfeTipoEmissao.CONTINGENCIA_SVC_AN, justificativa: '', dataHora: '' },
    };
    const svcAnStatus = await this.consultarStatus(svcAnConfig, certificate);
    if (svcAnStatus.success) {
      return NfeTipoEmissao.CONTINGENCIA_SVC_AN;
    }

    // Try SVC-RS
    const svcRsConfig = {
      ...config,
      contingencia: { tipo: NfeTipoEmissao.CONTINGENCIA_SVC_RS, justificativa: '', dataHora: '' },
    };
    const svcRsStatus = await this.consultarStatus(svcRsConfig, certificate);
    if (svcRsStatus.success) {
      return NfeTipoEmissao.CONTINGENCIA_SVC_RS;
    }

    // If both contingencies are unavailable, recommend FS-DA or EPEC
    return NfeTipoEmissao.CONTINGENCIA_FSDA;
  }
}
