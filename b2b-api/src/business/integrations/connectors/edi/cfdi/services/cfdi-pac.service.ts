import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CfdiPacConfig,
  CfdiStampRequest,
  CfdiStampResponse,
  CfdiCancelRequest,
  CfdiCancelResponse,
  CfdiTimbreFiscalDigital,
  CfdiMotivoCancelacion,
} from '../interfaces';

/**
 * PAC Provider Interface
 * Each PAC provider implements this interface
 */
export interface PacProvider {
  name: string;
  stamp(xml: string, config: CfdiPacConfig): Promise<CfdiStampResponse>;
  cancel(request: CfdiCancelRequest, config: CfdiPacConfig): Promise<CfdiCancelResponse>;
  getStatus(
    uuid: string,
    rfcEmisor: string,
    config: CfdiPacConfig,
  ): Promise<{ status: string; error?: string }>;
}

/**
 * Finkok PAC Provider Implementation
 */
class FinkokProvider implements PacProvider {
  name = 'finkok';

  async stamp(xml: string, config: CfdiPacConfig): Promise<CfdiStampResponse> {
    const url = config.sandbox ? config.sandboxUrl : config.productionUrl;
    const endpoint = `${url}/stamp`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
        },
        body: xml,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          errorCode: response.status.toString(),
          errorMessage: errorText || `HTTP ${response.status}`,
        };
      }

      const result = await response.text();
      return this.parseStampResponse(result);
    } catch (error) {
      return {
        success: false,
        errorCode: 'CONNECTION_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async cancel(request: CfdiCancelRequest, config: CfdiPacConfig): Promise<CfdiCancelResponse> {
    const url = config.sandbox ? config.sandboxUrl : config.productionUrl;
    const endpoint = `${url}/cancel`;

    try {
      const body = this.buildCancelRequest(request);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          errorCode: response.status.toString(),
          errorMessage: errorText || `HTTP ${response.status}`,
        };
      }

      const result = await response.text();
      return this.parseCancelResponse(result);
    } catch (error) {
      return {
        success: false,
        errorCode: 'CONNECTION_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async getStatus(
    uuid: string,
    rfcEmisor: string,
    config: CfdiPacConfig,
  ): Promise<{ status: string; error?: string }> {
    const url = config.sandbox ? config.sandboxUrl : config.productionUrl;
    const endpoint = `${url}/status?uuid=${uuid}&rfc=${rfcEmisor}`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
        },
      });

      if (!response.ok) {
        return { status: 'unknown', error: `HTTP ${response.status}` };
      }

      const result = await response.json();
      return { status: result.status || 'unknown' };
    } catch (error) {
      return { status: 'unknown', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private parseStampResponse(xml: string): CfdiStampResponse {
    // Parse XML response from Finkok
    // This is a simplified parser - in production, use a proper XML parser
    const uuidMatch = xml.match(/UUID="([^"]+)"/);
    const fechaMatch = xml.match(/FechaTimbrado="([^"]+)"/);
    const noCertSatMatch = xml.match(/NoCertificadoSAT="([^"]+)"/);
    const selloSatMatch = xml.match(/SelloSAT="([^"]+)"/);

    if (uuidMatch && fechaMatch) {
      return {
        success: true,
        xml,
        uuid: uuidMatch[1],
        fechaTimbrado: fechaMatch[1],
        noCertificadoSAT: noCertSatMatch?.[1],
        selloSAT: selloSatMatch?.[1],
      };
    }

    // Check for error
    const errorMatch =
      xml.match(/<fault>([^<]+)<\/fault>/i) || xml.match(/<error>([^<]+)<\/error>/i);
    return {
      success: false,
      errorCode: 'STAMP_FAILED',
      errorMessage: errorMatch?.[1] || 'Failed to stamp CFDI',
    };
  }

  private parseCancelResponse(xml: string): CfdiCancelResponse {
    const statusMatch = xml.match(/<status>([^<]+)<\/status>/i);
    const acuseMatch = xml.match(/<acuse>([^<]+)<\/acuse>/i);

    if (statusMatch) {
      const status = statusMatch[1].toLowerCase();
      return {
        success: status === 'cancelled' || status === '201' || status === '202',
        status:
          status === '201' || status === 'cancelled'
            ? 'cancelled'
            : status === '202'
              ? 'pending'
              : 'rejected',
        acuse: acuseMatch?.[1],
      };
    }

    return {
      success: false,
      errorCode: 'CANCEL_FAILED',
      errorMessage: 'Failed to parse cancellation response',
    };
  }

  private buildCancelRequest(request: CfdiCancelRequest): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<cancelacion>
  <uuid>${request.uuid}</uuid>
  <rfcEmisor>${request.rfcEmisor}</rfcEmisor>
  <rfcReceptor>${request.rfcReceptor}</rfcReceptor>
  <total>${request.total.toFixed(2)}</total>
  <motivo>${request.motivo}</motivo>
  ${request.folioSustitucion ? `<folioSustitucion>${request.folioSustitucion}</folioSustitucion>` : ''}
</cancelacion>`;
  }
}

/**
 * Facturapi PAC Provider Implementation
 */
class FacturapiProvider implements PacProvider {
  name = 'facturapi';

  async stamp(xml: string, config: CfdiPacConfig): Promise<CfdiStampResponse> {
    const url = config.sandbox ? config.sandboxUrl : config.productionUrl;

    try {
      const response = await fetch(`${url}/v2/invoices/stamp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          Authorization: `Bearer ${config.password}`,
        },
        body: xml,
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          errorCode: result.code || response.status.toString(),
          errorMessage: result.message || 'Stamp failed',
        };
      }

      return {
        success: true,
        xml: result.xml,
        uuid: result.uuid,
        fechaTimbrado: result.fecha_timbrado,
        noCertificadoSAT: result.no_certificado_sat,
        selloSAT: result.sello_sat,
        cadenaOriginal: result.cadena_original,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: 'CONNECTION_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async cancel(request: CfdiCancelRequest, config: CfdiPacConfig): Promise<CfdiCancelResponse> {
    const url = config.sandbox ? config.sandboxUrl : config.productionUrl;

    try {
      const response = await fetch(`${url}/v2/invoices/${request.uuid}/cancel`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.password}`,
        },
        body: JSON.stringify({
          motive: request.motivo,
          substitution: request.folioSustitucion,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          errorCode: result.code || response.status.toString(),
          errorMessage: result.message || 'Cancel failed',
        };
      }

      return {
        success: true,
        status: result.status,
        acuse: result.acuse,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: 'CONNECTION_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async getStatus(
    uuid: string,
    rfcEmisor: string,
    config: CfdiPacConfig,
  ): Promise<{ status: string; error?: string }> {
    const url = config.sandbox ? config.sandboxUrl : config.productionUrl;

    try {
      const response = await fetch(`${url}/v2/invoices/${uuid}/status`, {
        headers: {
          Authorization: `Bearer ${config.password}`,
        },
      });

      if (!response.ok) {
        return { status: 'unknown', error: `HTTP ${response.status}` };
      }

      const result = await response.json();
      return { status: result.status || 'unknown' };
    } catch (error) {
      return { status: 'unknown', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

/**
 * SW Sapien PAC Provider Implementation
 */
class SwSapienProvider implements PacProvider {
  name = 'swsapien';

  async stamp(xml: string, config: CfdiPacConfig): Promise<CfdiStampResponse> {
    const url = config.sandbox ? config.sandboxUrl : config.productionUrl;

    try {
      // SW Sapien uses a two-step auth process
      const tokenResponse = await fetch(`${url}/security/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: config.username, password: config.password }),
      });

      if (!tokenResponse.ok) {
        return {
          success: false,
          errorCode: 'AUTH_FAILED',
          errorMessage: 'Failed to authenticate with SW Sapien',
        };
      }

      const {
        data: { token },
      } = await tokenResponse.json();

      // Stamp the CFDI
      const stampResponse = await fetch(`${url}/cfdi33/stamp/v4`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ xml: Buffer.from(xml).toString('base64') }),
      });

      const result = await stampResponse.json();

      if (!stampResponse.ok || result.status !== 'success') {
        return {
          success: false,
          errorCode: result.messageDetail || result.status,
          errorMessage: result.message || 'Stamp failed',
        };
      }

      return {
        success: true,
        xml: Buffer.from(result.data.cfdi, 'base64').toString('utf8'),
        uuid: result.data.uuid,
        fechaTimbrado: result.data.fechaTimbrado,
        noCertificadoSAT: result.data.noCertificadoSAT,
        selloSAT: result.data.selloSAT,
        cadenaOriginal: result.data.cadenaOriginalSAT,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: 'CONNECTION_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async cancel(request: CfdiCancelRequest, config: CfdiPacConfig): Promise<CfdiCancelResponse> {
    const url = config.sandbox ? config.sandboxUrl : config.productionUrl;

    try {
      // Authenticate first
      const tokenResponse = await fetch(`${url}/security/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: config.username, password: config.password }),
      });

      if (!tokenResponse.ok) {
        return {
          success: false,
          errorCode: 'AUTH_FAILED',
          errorMessage: 'Failed to authenticate with SW Sapien',
        };
      }

      const {
        data: { token },
      } = await tokenResponse.json();

      // Cancel
      const cancelResponse = await fetch(`${url}/cfdi33/cancel/csd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uuid: request.uuid,
          rfc: request.rfcEmisor,
          motivo: request.motivo,
          folioSustitucion: request.folioSustitucion || '',
        }),
      });

      const result = await cancelResponse.json();

      if (!cancelResponse.ok || result.status !== 'success') {
        return {
          success: false,
          errorCode: result.messageDetail || result.status,
          errorMessage: result.message || 'Cancel failed',
        };
      }

      return {
        success: true,
        status: result.data.status,
        acuse: result.data.acuse,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: 'CONNECTION_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async getStatus(
    _uuid: string,
    _rfcEmisor: string,
    _config: CfdiPacConfig,
  ): Promise<{ status: string; error?: string }> {
    // SW Sapien status check implementation
    return { status: 'unknown', error: 'Not implemented' };
  }
}

/**
 * Mock PAC Provider for Testing
 */
class MockPacProvider implements PacProvider {
  name = 'mock';

  async stamp(xml: string, _config: CfdiPacConfig): Promise<CfdiStampResponse> {
    // Simulate a successful stamp
    const uuid = this.generateMockUuid();
    const fechaTimbrado = new Date().toISOString().replace('Z', '');

    // Extract sello from XML
    const selloMatch = xml.match(/Sello="([^"]+)"/);
    const selloCfd = selloMatch ? selloMatch[1] : 'mock-sello';

    // Insert TimbreFiscalDigital into XML
    const tfdXml = `<tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="${uuid}" FechaTimbrado="${fechaTimbrado}" RfcProvCertif="SAT970701NN3" SelloCFD="${selloCfd}" NoCertificadoSAT="00001000000506790941" SelloSAT="MOCK_SELLO_SAT_BASE64_ENCODED"/>`;

    // Insert before </cfdi:Complemento> or add Complemento section
    let stampedXml: string;
    if (xml.includes('</cfdi:Complemento>')) {
      stampedXml = xml.replace('</cfdi:Complemento>', `${tfdXml}</cfdi:Complemento>`);
    } else if (xml.includes('</cfdi:Comprobante>')) {
      stampedXml = xml.replace(
        '</cfdi:Comprobante>',
        `<cfdi:Complemento>${tfdXml}</cfdi:Complemento></cfdi:Comprobante>`,
      );
    } else {
      stampedXml = xml;
    }

    return {
      success: true,
      xml: stampedXml,
      uuid,
      fechaTimbrado,
      noCertificadoSAT: '00001000000506790941',
      selloSAT: 'MOCK_SELLO_SAT_BASE64_ENCODED',
      cadenaOriginal: `||1.1|${uuid}|${fechaTimbrado}|SAT970701NN3|${selloCfd}|00001000000506790941||`,
    };
  }

  async cancel(request: CfdiCancelRequest, _config: CfdiPacConfig): Promise<CfdiCancelResponse> {
    // Simulate successful cancellation
    return {
      success: true,
      status: 'cancelled',
      acuse: `<?xml version="1.0"?><Acuse><UUID>${request.uuid}</UUID><Status>Cancelado</Status></Acuse>`,
      statusDate: new Date().toISOString(),
    };
  }

  async getStatus(
    _uuid: string,
    _rfcEmisor: string,
    _config: CfdiPacConfig,
  ): Promise<{ status: string; error?: string }> {
    return { status: 'Vigente' };
  }

  private generateMockUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16).toUpperCase();
    });
  }
}

/**
 * CFDI PAC Service
 *
 * Manages PAC (Proveedor Autorizado de Certificacion) integrations
 * for CFDI stamping (timbrado) and cancellation.
 *
 * Supports multiple PAC providers:
 * - Finkok
 * - Facturapi
 * - SW Sapien
 * - Mock (for testing)
 */
@Injectable()
export class CfdiPacService {
  private readonly logger = new Logger(CfdiPacService.name);
  private readonly providers: Map<string, PacProvider>;

  constructor(private readonly configService: ConfigService) {
    this.providers = new Map([
      ['finkok', new FinkokProvider()],
      ['facturapi', new FacturapiProvider()],
      ['swsapien', new SwSapienProvider()],
      ['mock', new MockPacProvider()],
    ]);
  }

  /**
   * Get PAC configuration from environment
   */
  getPacConfig(): CfdiPacConfig {
    const pacName = this.configService.get<string>('CFDI_PAC_NAME', 'mock');
    const sandbox = this.configService.get<string>('CFDI_PAC_SANDBOX', 'true') === 'true';

    return {
      pacName: pacName as CfdiPacConfig['pacName'],
      productionUrl: this.configService.get<string>(
        `CFDI_PAC_${pacName.toUpperCase()}_PRODUCTION_URL`,
        '',
      ),
      sandboxUrl: this.configService.get<string>(
        `CFDI_PAC_${pacName.toUpperCase()}_SANDBOX_URL`,
        '',
      ),
      username: this.configService.get<string>(`CFDI_PAC_${pacName.toUpperCase()}_USERNAME`, ''),
      password: this.configService.get<string>(`CFDI_PAC_${pacName.toUpperCase()}_PASSWORD`, ''),
      sandbox,
    };
  }

  /**
   * Stamp (timbrar) a CFDI
   */
  async stamp(request: CfdiStampRequest, config?: CfdiPacConfig): Promise<CfdiStampResponse> {
    const pacConfig = config || this.getPacConfig();
    const provider = this.providers.get(pacConfig.pacName);

    if (!provider) {
      return {
        success: false,
        errorCode: 'INVALID_PAC',
        errorMessage: `Unknown PAC provider: ${pacConfig.pacName}`,
      };
    }

    this.logger.log(`Stamping CFDI with PAC: ${pacConfig.pacName} (sandbox: ${pacConfig.sandbox})`);

    try {
      const result = await provider.stamp(request.xml, pacConfig);

      if (result.success) {
        this.logger.log(`CFDI stamped successfully. UUID: ${result.uuid}`);
      } else {
        this.logger.warn(`CFDI stamp failed: ${result.errorMessage}`);
      }

      return result;
    } catch (error) {
      this.logger.error('PAC stamp error', error);
      return {
        success: false,
        errorCode: 'PAC_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown PAC error',
      };
    }
  }

  /**
   * Cancel a CFDI
   */
  async cancel(request: CfdiCancelRequest, config?: CfdiPacConfig): Promise<CfdiCancelResponse> {
    const pacConfig = config || this.getPacConfig();
    const provider = this.providers.get(pacConfig.pacName);

    if (!provider) {
      return {
        success: false,
        errorCode: 'INVALID_PAC',
        errorMessage: `Unknown PAC provider: ${pacConfig.pacName}`,
      };
    }

    this.logger.log(`Cancelling CFDI ${request.uuid} with PAC: ${pacConfig.pacName}`);

    // Validate motivo
    if (
      request.motivo === CfdiMotivoCancelacion.COMPROBANTE_ERRORES_CON_RELACION &&
      !request.folioSustitucion
    ) {
      return {
        success: false,
        errorCode: 'INVALID_REQUEST',
        errorMessage: 'folioSustitucion is required when motivo is 01',
      };
    }

    try {
      const result = await provider.cancel(request, pacConfig);

      if (result.success) {
        this.logger.log(`CFDI ${request.uuid} cancellation: ${result.status}`);
      } else {
        this.logger.warn(`CFDI cancellation failed: ${result.errorMessage}`);
      }

      return result;
    } catch (error) {
      this.logger.error('PAC cancel error', error);
      return {
        success: false,
        errorCode: 'PAC_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown PAC error',
      };
    }
  }

  /**
   * Get CFDI status from PAC
   */
  async getStatus(
    uuid: string,
    rfcEmisor: string,
    config?: CfdiPacConfig,
  ): Promise<{ status: string; error?: string }> {
    const pacConfig = config || this.getPacConfig();
    const provider = this.providers.get(pacConfig.pacName);

    if (!provider) {
      return { status: 'unknown', error: `Unknown PAC provider: ${pacConfig.pacName}` };
    }

    return provider.getStatus(uuid, rfcEmisor, pacConfig);
  }

  /**
   * Extract TimbreFiscalDigital from stamped XML
   */
  extractTimbre(stampedXml: string): CfdiTimbreFiscalDigital | null {
    try {
      const tfdMatch = stampedXml.match(
        /<tfd:TimbreFiscalDigital[^>]+Version="([^"]+)"[^>]+UUID="([^"]+)"[^>]+FechaTimbrado="([^"]+)"[^>]+RfcProvCertif="([^"]+)"[^>]+SelloCFD="([^"]+)"[^>]+NoCertificadoSAT="([^"]+)"[^>]+SelloSAT="([^"]+)"/,
      );

      if (!tfdMatch) {
        // Try alternative order
        const uuidMatch = stampedXml.match(/UUID="([^"]+)"/);
        const fechaMatch = stampedXml.match(/FechaTimbrado="([^"]+)"/);
        const rfcProvMatch = stampedXml.match(/RfcProvCertif="([^"]+)"/);
        const selloCfdMatch = stampedXml.match(/SelloCFD="([^"]+)"/);
        const noCertSatMatch = stampedXml.match(/NoCertificadoSAT="([^"]+)"/);
        const selloSatMatch = stampedXml.match(/SelloSAT="([^"]+)"/);

        if (uuidMatch && fechaMatch) {
          return {
            version: '1.1',
            uuid: uuidMatch[1],
            fechaTimbrado: fechaMatch[1],
            rfcProvCertif: rfcProvMatch?.[1] || '',
            selloCFD: selloCfdMatch?.[1] || '',
            noCertificadoSAT: noCertSatMatch?.[1] || '',
            selloSAT: selloSatMatch?.[1] || '',
          };
        }

        return null;
      }

      return {
        version: tfdMatch[1] as '1.1',
        uuid: tfdMatch[2],
        fechaTimbrado: tfdMatch[3],
        rfcProvCertif: tfdMatch[4],
        selloCFD: tfdMatch[5],
        noCertificadoSAT: tfdMatch[6],
        selloSAT: tfdMatch[7],
      };
    } catch (error) {
      this.logger.error('Failed to extract TimbreFiscalDigital', error);
      return null;
    }
  }

  /**
   * Register a custom PAC provider
   */
  registerProvider(name: string, provider: PacProvider): void {
    this.providers.set(name, provider);
    this.logger.log(`Registered PAC provider: ${name}`);
  }

  /**
   * Get list of available PAC providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Test PAC connection
   */
  async testConnection(config?: CfdiPacConfig): Promise<{ success: boolean; error?: string }> {
    const pacConfig = config || this.getPacConfig();

    try {
      // Try to get status of a known UUID (this will fail but confirms connectivity)
      await this.getStatus('00000000-0000-0000-0000-000000000000', 'XAXX010101000', pacConfig);
      // If we get any response (even not found), connection works
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }
}
