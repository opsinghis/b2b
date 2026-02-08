import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CfdiSatValidationRequest,
  CfdiSatValidationResponse,
  CfdiComprobante,
  CfdiValidationResult,
  CfdiValidationError,
  CfdiTipoComprobante,
  CfdiMetodoPago,
  CfdiImpuesto,
  CfdiTipoFactor,
  CfdiObjetoImp,
} from '../interfaces';

/**
 * CFDI SAT Validation Service
 *
 * Provides validation against SAT (Servicio de Administracion Tributaria) web services
 * and local structural validation of CFDI 4.0 documents.
 *
 * @see https://www.sat.gob.mx/consultas/93856/consulta-de-verificacion-de-comprobantes-fiscales-digitales-por-internet
 */
@Injectable()
export class CfdiSatValidationService {
  private readonly logger = new Logger(CfdiSatValidationService.name);
  private readonly SAT_VERIFICATION_URL =
    'https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Validate CFDI against SAT web service
   */
  async validateWithSat(request: CfdiSatValidationRequest): Promise<CfdiSatValidationResponse> {
    this.logger.debug(`Validating CFDI ${request.uuid} with SAT`);

    try {
      // Build SOAP request
      const soapRequest = this.buildSoapRequest(
        request.uuid,
        request.rfcEmisor,
        request.rfcReceptor,
        request.total,
      );

      const response = await fetch(this.SAT_VERIFICATION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: 'http://tempuri.org/IConsultaCFDIService/Consulta',
        },
        body: soapRequest,
      });

      if (!response.ok) {
        return {
          valid: false,
          error: `SAT service returned HTTP ${response.status}`,
        };
      }

      const responseText = await response.text();
      return this.parseSatResponse(responseText);
    } catch (error) {
      this.logger.error('SAT validation error', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'SAT validation failed',
      };
    }
  }

  /**
   * Validate CFDI structure locally (without SAT)
   */
  validateStructure(comprobante: CfdiComprobante): CfdiValidationResult {
    const errors: CfdiValidationError[] = [];
    const warnings: CfdiValidationError[] = [];

    // Validate version
    if (comprobante.version !== '4.0') {
      errors.push({
        code: 'CFDI40001',
        message: `Version must be "4.0", got "${comprobante.version}"`,
        field: 'version',
        severity: 'error',
      });
    }

    // Validate fecha format (ISO 8601)
    if (!this.isValidIso8601Date(comprobante.fecha)) {
      errors.push({
        code: 'CFDI40002',
        message: 'Fecha must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)',
        field: 'fecha',
        severity: 'error',
      });
    }

    // Validate RFC emisor
    this.validateRfc(comprobante.emisor.rfc, 'emisor.rfc', errors);

    // Validate RFC receptor
    this.validateRfc(comprobante.receptor.rfc, 'receptor.rfc', errors);

    // Validate postal codes (5 digits)
    if (!this.isValidPostalCode(comprobante.lugarExpedicion)) {
      errors.push({
        code: 'CFDI40005',
        message: 'LugarExpedicion must be a valid 5-digit postal code',
        field: 'lugarExpedicion',
        severity: 'error',
        catalogReference: 'c_CodigoPostal',
      });
    }

    if (!this.isValidPostalCode(comprobante.receptor.domicilioFiscalReceptor)) {
      errors.push({
        code: 'CFDI40006',
        message: 'DomicilioFiscalReceptor must be a valid 5-digit postal code',
        field: 'receptor.domicilioFiscalReceptor',
        severity: 'error',
        catalogReference: 'c_CodigoPostal',
      });
    }

    // Validate moneda
    if (!this.isValidCurrency(comprobante.moneda)) {
      errors.push({
        code: 'CFDI40007',
        message: 'Invalid currency code',
        field: 'moneda',
        severity: 'error',
        catalogReference: 'c_Moneda',
      });
    }

    // Validate TipoCambio for non-MXN
    if (comprobante.moneda !== 'MXN' && comprobante.moneda !== 'XXX') {
      if (comprobante.tipoCambio === undefined || comprobante.tipoCambio <= 0) {
        errors.push({
          code: 'CFDI40008',
          message: 'TipoCambio is required when Moneda is not MXN',
          field: 'tipoCambio',
          severity: 'error',
        });
      }
    }

    // Validate tipoDeComprobante
    const validTipos = Object.values(CfdiTipoComprobante);
    if (!validTipos.includes(comprobante.tipoDeComprobante as CfdiTipoComprobante)) {
      errors.push({
        code: 'CFDI40009',
        message: `Invalid TipoDeComprobante: ${comprobante.tipoDeComprobante}`,
        field: 'tipoDeComprobante',
        severity: 'error',
        catalogReference: 'c_TipoDeComprobante',
      });
    }

    // Validate formaPago and metodoPago based on tipoDeComprobante
    if (
      comprobante.tipoDeComprobante === CfdiTipoComprobante.INGRESO ||
      comprobante.tipoDeComprobante === CfdiTipoComprobante.EGRESO
    ) {
      if (!comprobante.metodoPago) {
        errors.push({
          code: 'CFDI40010',
          message: 'MetodoPago is required for Ingreso/Egreso',
          field: 'metodoPago',
          severity: 'error',
        });
      }

      // If metodoPago is PUE, formaPago is required
      if (comprobante.metodoPago === CfdiMetodoPago.PUE && !comprobante.formaPago) {
        errors.push({
          code: 'CFDI40011',
          message: 'FormaPago is required when MetodoPago is PUE',
          field: 'formaPago',
          severity: 'error',
        });
      }
    }

    // Validate conceptos
    if (!comprobante.conceptos || comprobante.conceptos.length === 0) {
      errors.push({
        code: 'CFDI40012',
        message: 'At least one Concepto is required',
        field: 'conceptos',
        severity: 'error',
      });
    } else {
      comprobante.conceptos.forEach((concepto, index) => {
        this.validateConcepto(concepto, index, errors, warnings);
      });
    }

    // Validate subtotal calculation
    const calculatedSubtotal = comprobante.conceptos.reduce((sum, c) => sum + c.importe, 0);
    if (Math.abs(calculatedSubtotal - comprobante.subTotal) > 0.01) {
      errors.push({
        code: 'CFDI40013',
        message: `SubTotal mismatch. Expected ${calculatedSubtotal.toFixed(2)}, got ${comprobante.subTotal.toFixed(2)}`,
        field: 'subTotal',
        severity: 'error',
      });
    }

    // Validate total calculation
    const descuento = comprobante.descuento || 0;
    const totalImpuestosTrasladados = comprobante.impuestos?.totalImpuestosTrasladados || 0;
    const totalImpuestosRetenidos = comprobante.impuestos?.totalImpuestosRetenidos || 0;
    const calculatedTotal =
      comprobante.subTotal - descuento + totalImpuestosTrasladados - totalImpuestosRetenidos;
    if (Math.abs(calculatedTotal - comprobante.total) > 0.01) {
      errors.push({
        code: 'CFDI40014',
        message: `Total mismatch. Expected ${calculatedTotal.toFixed(2)}, got ${comprobante.total.toFixed(2)}`,
        field: 'total',
        severity: 'error',
      });
    }

    // Validate impuestos section matches conceptos
    this.validateImpuestosConsistency(comprobante, errors, warnings);

    // Validate regimen fiscal
    this.validateRegimenFiscal(
      comprobante.emisor.regimenFiscal.toString(),
      'emisor.regimenFiscal',
      errors,
    );
    this.validateRegimenFiscal(
      comprobante.receptor.regimenFiscalReceptor.toString(),
      'receptor.regimenFiscalReceptor',
      errors,
    );

    // Validate UsoCFDI is compatible with receptor type (persona fisica vs moral)
    this.validateUsoCfdi(comprobante.receptor, errors);

    // Validate for Pago type
    if (comprobante.tipoDeComprobante === CfdiTipoComprobante.PAGO) {
      this.validatePagoType(comprobante, errors);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      validatedAt: new Date(),
    };
  }

  /**
   * Validate a specific concept
   */
  private validateConcepto(
    concepto: CfdiComprobante['conceptos'][0],
    index: number,
    errors: CfdiValidationError[],
    warnings: CfdiValidationError[],
  ): void {
    const prefix = `conceptos[${index}]`;

    // Validate ClaveProdServ (8 digits)
    if (!/^\d{8}$/.test(concepto.claveProdServ)) {
      errors.push({
        code: 'CFDI40020',
        message: 'ClaveProdServ must be 8 digits',
        field: `${prefix}.claveProdServ`,
        severity: 'error',
        catalogReference: 'c_ClaveProdServ',
      });
    }

    // Validate ClaveUnidad (3 characters)
    if (!/^[A-Z0-9]{2,3}$/.test(concepto.claveUnidad)) {
      errors.push({
        code: 'CFDI40021',
        message: 'ClaveUnidad must be 2-3 alphanumeric characters',
        field: `${prefix}.claveUnidad`,
        severity: 'error',
        catalogReference: 'c_ClaveUnidad',
      });
    }

    // Validate cantidad
    if (concepto.cantidad <= 0) {
      errors.push({
        code: 'CFDI40022',
        message: 'Cantidad must be greater than 0',
        field: `${prefix}.cantidad`,
        severity: 'error',
      });
    }

    // Validate valorUnitario
    if (concepto.valorUnitario < 0) {
      errors.push({
        code: 'CFDI40023',
        message: 'ValorUnitario cannot be negative',
        field: `${prefix}.valorUnitario`,
        severity: 'error',
      });
    }

    // Validate importe calculation
    const calculatedImporte = concepto.cantidad * concepto.valorUnitario;
    if (Math.abs(calculatedImporte - concepto.importe) > 0.01) {
      warnings.push({
        code: 'CFDI40024',
        message: `Importe calculation mismatch. Expected ${calculatedImporte.toFixed(2)}, got ${concepto.importe.toFixed(2)}`,
        field: `${prefix}.importe`,
        severity: 'warning',
      });
    }

    // Validate descuento
    if (concepto.descuento !== undefined && concepto.descuento < 0) {
      errors.push({
        code: 'CFDI40025',
        message: 'Descuento cannot be negative',
        field: `${prefix}.descuento`,
        severity: 'error',
      });
    }

    // Validate objetoImp
    const validObjetoImp = Object.values(CfdiObjetoImp);
    if (!validObjetoImp.includes(concepto.objetoImp as CfdiObjetoImp)) {
      errors.push({
        code: 'CFDI40026',
        message: `Invalid ObjetoImp: ${concepto.objetoImp}`,
        field: `${prefix}.objetoImp`,
        severity: 'error',
        catalogReference: 'c_ObjetoImp',
      });
    }

    // If objetoImp is "02" (Si objeto de impuesto), impuestos must be present
    if (concepto.objetoImp === CfdiObjetoImp.SI_OBJETO_IMPUESTO) {
      if (!concepto.impuestos || !concepto.impuestos.traslados?.traslados?.length) {
        errors.push({
          code: 'CFDI40027',
          message: 'Impuestos required when ObjetoImp is "02"',
          field: `${prefix}.impuestos`,
          severity: 'error',
        });
      }
    }

    // Validate taxes if present
    if (concepto.impuestos) {
      this.validateConceptoImpuestos(concepto.impuestos, prefix, errors, warnings);
    }
  }

  /**
   * Validate concept taxes
   */
  private validateConceptoImpuestos(
    impuestos: CfdiComprobante['conceptos'][0]['impuestos'],
    prefix: string,
    errors: CfdiValidationError[],
    _warnings: CfdiValidationError[],
  ): void {
    if (!impuestos) return;
    if (impuestos.traslados?.traslados) {
      impuestos.traslados.traslados.forEach((traslado, i) => {
        const trasPrefix = `${prefix}.impuestos.traslados[${i}]`;

        // Validate impuesto code
        const validImpuestos = Object.values(CfdiImpuesto);
        if (!validImpuestos.includes(traslado.impuesto as CfdiImpuesto)) {
          errors.push({
            code: 'CFDI40030',
            message: `Invalid Impuesto: ${traslado.impuesto}`,
            field: `${trasPrefix}.impuesto`,
            severity: 'error',
            catalogReference: 'c_Impuesto',
          });
        }

        // Validate tipoFactor
        const validTipoFactor = Object.values(CfdiTipoFactor);
        if (!validTipoFactor.includes(traslado.tipoFactor)) {
          errors.push({
            code: 'CFDI40031',
            message: `Invalid TipoFactor: ${traslado.tipoFactor}`,
            field: `${trasPrefix}.tipoFactor`,
            severity: 'error',
            catalogReference: 'c_TipoFactor',
          });
        }

        // Validate base
        if (traslado.base <= 0) {
          errors.push({
            code: 'CFDI40032',
            message: 'Base must be greater than 0',
            field: `${trasPrefix}.base`,
            severity: 'error',
          });
        }

        // If not Exento, tasaOCuota and importe are required
        if (traslado.tipoFactor !== CfdiTipoFactor.EXENTO) {
          if (traslado.tasaOCuota === undefined) {
            errors.push({
              code: 'CFDI40033',
              message: 'TasaOCuota is required when TipoFactor is not Exento',
              field: `${trasPrefix}.tasaOCuota`,
              severity: 'error',
            });
          }
          if (traslado.importe === undefined) {
            errors.push({
              code: 'CFDI40034',
              message: 'Importe is required when TipoFactor is not Exento',
              field: `${trasPrefix}.importe`,
              severity: 'error',
            });
          }
        }
      });
    }
  }

  /**
   * Validate document level impuestos match sum of concepto taxes
   */
  private validateImpuestosConsistency(
    comprobante: CfdiComprobante,
    errors: CfdiValidationError[],
    _warnings: CfdiValidationError[],
  ): void {
    if (!comprobante.impuestos) {
      return;
    }

    // Calculate totals from conceptos
    let totalTrasladados = 0;
    let totalRetenidos = 0;

    for (const concepto of comprobante.conceptos) {
      if (concepto.impuestos?.traslados?.traslados) {
        for (const traslado of concepto.impuestos.traslados.traslados) {
          if (traslado.importe !== undefined) {
            totalTrasladados += traslado.importe;
          }
        }
      }
      if (concepto.impuestos?.retenciones?.retenciones) {
        for (const retencion of concepto.impuestos.retenciones.retenciones) {
          if (retencion.importe !== undefined) {
            totalRetenidos += retencion.importe;
          }
        }
      }
    }

    // Compare with document level totals
    if (comprobante.impuestos.totalImpuestosTrasladados !== undefined) {
      if (Math.abs(totalTrasladados - comprobante.impuestos.totalImpuestosTrasladados) > 0.01) {
        errors.push({
          code: 'CFDI40040',
          message: `TotalImpuestosTrasladados mismatch. Sum of conceptos: ${totalTrasladados.toFixed(2)}, Document: ${comprobante.impuestos.totalImpuestosTrasladados.toFixed(2)}`,
          field: 'impuestos.totalImpuestosTrasladados',
          severity: 'error',
        });
      }
    }

    if (comprobante.impuestos.totalImpuestosRetenidos !== undefined) {
      if (Math.abs(totalRetenidos - comprobante.impuestos.totalImpuestosRetenidos) > 0.01) {
        errors.push({
          code: 'CFDI40041',
          message: `TotalImpuestosRetenidos mismatch. Sum of conceptos: ${totalRetenidos.toFixed(2)}, Document: ${comprobante.impuestos.totalImpuestosRetenidos.toFixed(2)}`,
          field: 'impuestos.totalImpuestosRetenidos',
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validate RFC format
   */
  private validateRfc(rfc: string, field: string, errors: CfdiValidationError[]): void {
    // RFC for personas morales: 3 letters + 6 digits + 3 homoclave
    // RFC for personas fisicas: 4 letters + 6 digits + 3 homoclave
    // Generic public RFC: XAXX010101000
    // Generic foreign RFC: XEXX010101000

    const rfcPersonaMoral = /^[A-ZÑ&]{3}\d{6}[A-Z\d]{3}$/;
    const rfcPersonaFisica = /^[A-ZÑ&]{4}\d{6}[A-Z\d]{3}$/;
    const rfcGenerico = /^(XAXX010101000|XEXX010101000)$/;

    if (!rfcPersonaMoral.test(rfc) && !rfcPersonaFisica.test(rfc) && !rfcGenerico.test(rfc)) {
      errors.push({
        code: 'CFDI40003',
        message: `Invalid RFC format: ${rfc}`,
        field,
        severity: 'error',
      });
    }
  }

  /**
   * Validate regimen fiscal code
   */
  private validateRegimenFiscal(
    regimen: string,
    field: string,
    errors: CfdiValidationError[],
  ): void {
    const validRegimens = [
      '601',
      '603',
      '605',
      '606',
      '607',
      '608',
      '609',
      '610',
      '611',
      '612',
      '614',
      '615',
      '616',
      '620',
      '621',
      '622',
      '623',
      '624',
      '625',
      '626',
    ];

    if (!validRegimens.includes(regimen)) {
      errors.push({
        code: 'CFDI40004',
        message: `Invalid RegimenFiscal: ${regimen}`,
        field,
        severity: 'error',
        catalogReference: 'c_RegimenFiscal',
      });
    }
  }

  /**
   * Validate UsoCFDI based on receptor type
   */
  private validateUsoCfdi(
    receptor: CfdiComprobante['receptor'],
    errors: CfdiValidationError[],
  ): void {
    const isPersonaFisica = receptor.rfc.length === 13;
    const usoCfdi = receptor.usoCFDI.toString();

    // UsoCFDI for persona fisica only
    const personaFisicaOnly = [
      'D01',
      'D02',
      'D03',
      'D04',
      'D05',
      'D06',
      'D07',
      'D08',
      'D09',
      'D10',
    ];

    if (!isPersonaFisica && personaFisicaOnly.includes(usoCfdi)) {
      errors.push({
        code: 'CFDI40050',
        message: `UsoCFDI ${usoCfdi} is only valid for persona fisica`,
        field: 'receptor.usoCFDI',
        severity: 'error',
        catalogReference: 'c_UsoCFDI',
      });
    }
  }

  /**
   * Validate comprobante type Pago
   */
  private validatePagoType(comprobante: CfdiComprobante, errors: CfdiValidationError[]): void {
    // For Pago type, subTotal and total must be 0
    if (comprobante.subTotal !== 0) {
      errors.push({
        code: 'CFDI40060',
        message: 'SubTotal must be 0 for TipoDeComprobante P (Pago)',
        field: 'subTotal',
        severity: 'error',
      });
    }

    if (comprobante.total !== 0) {
      errors.push({
        code: 'CFDI40061',
        message: 'Total must be 0 for TipoDeComprobante P (Pago)',
        field: 'total',
        severity: 'error',
      });
    }

    // Must not have formaPago or metodoPago
    if (comprobante.formaPago) {
      errors.push({
        code: 'CFDI40062',
        message: 'FormaPago is not allowed for TipoDeComprobante P (Pago)',
        field: 'formaPago',
        severity: 'error',
      });
    }

    if (comprobante.metodoPago) {
      errors.push({
        code: 'CFDI40063',
        message: 'MetodoPago is not allowed for TipoDeComprobante P (Pago)',
        field: 'metodoPago',
        severity: 'error',
      });
    }

    // Must have Pagos 2.0 complement
    if (!comprobante.complemento?.pagos) {
      errors.push({
        code: 'CFDI40064',
        message: 'Pagos 2.0 complement is required for TipoDeComprobante P (Pago)',
        field: 'complemento.pagos',
        severity: 'error',
      });
    }

    // Must have exactly one concept with specific values
    if (comprobante.conceptos.length !== 1) {
      errors.push({
        code: 'CFDI40065',
        message: 'Exactly one Concepto is required for TipoDeComprobante P (Pago)',
        field: 'conceptos',
        severity: 'error',
      });
    } else {
      const concepto = comprobante.conceptos[0];
      if (concepto.claveProdServ !== '84111506') {
        errors.push({
          code: 'CFDI40066',
          message: 'ClaveProdServ must be 84111506 for Pago type',
          field: 'conceptos[0].claveProdServ',
          severity: 'error',
        });
      }
      if (concepto.claveUnidad !== 'ACT') {
        errors.push({
          code: 'CFDI40067',
          message: 'ClaveUnidad must be ACT for Pago type',
          field: 'conceptos[0].claveUnidad',
          severity: 'error',
        });
      }
    }
  }

  /**
   * Check if string is valid ISO 8601 date
   */
  private isValidIso8601Date(dateStr: string): boolean {
    // Format: YYYY-MM-DDTHH:MM:SS
    const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
    if (!regex.test(dateStr)) {
      return false;
    }
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  /**
   * Check if postal code is valid (5 digits)
   */
  private isValidPostalCode(cp: string): boolean {
    return /^\d{5}$/.test(cp);
  }

  /**
   * Check if currency code is valid (ISO 4217)
   */
  private isValidCurrency(currency: string): boolean {
    const validCurrencies = [
      'MXN',
      'USD',
      'EUR',
      'GBP',
      'CAD',
      'JPY',
      'CHF',
      'AUD',
      'CNY',
      'HKD',
      'NZD',
      'SEK',
      'DKK',
      'NOK',
      'SGD',
      'ZAR',
      'BRL',
      'ARS',
      'CLP',
      'COP',
      'XXX', // No currency
    ];
    return validCurrencies.includes(currency);
  }

  /**
   * Build SOAP request for SAT verification
   */
  private buildSoapRequest(
    uuid: string,
    rfcEmisor: string,
    rfcReceptor: string,
    total: number,
  ): string {
    // Format total with exactly 6 decimal places and padded to 17 characters
    const totalFormatted = total.toFixed(6).padStart(17, '0');

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soap:Body>
    <tem:Consulta>
      <tem:expresionImpresa>?re=${rfcEmisor}&amp;rr=${rfcReceptor}&amp;tt=${totalFormatted}&amp;id=${uuid}</tem:expresionImpresa>
    </tem:Consulta>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Parse SAT SOAP response
   */
  private parseSatResponse(xml: string): CfdiSatValidationResponse {
    try {
      // Extract estado
      const estadoMatch = xml.match(/<a:Estado>([^<]+)<\/a:Estado>/);
      const estado = estadoMatch ? estadoMatch[1] : null;

      // Extract es cancelable
      const cancelableMatch = xml.match(/<a:EsCancelable>([^<]+)<\/a:EsCancelable>/);
      const esCancelable = cancelableMatch ? cancelableMatch[1] : undefined;

      // Extract estatus cancelacion
      const estatusCancelacionMatch = xml.match(
        /<a:EstatusCancelacion>([^<]+)<\/a:EstatusCancelacion>/,
      );
      const estatusCancelacion = estatusCancelacionMatch ? estatusCancelacionMatch[1] : undefined;

      if (!estado) {
        return {
          valid: false,
          error: 'Could not parse SAT response',
        };
      }

      const isValid = estado === 'Vigente';
      const isCancelled = estado === 'Cancelado';

      return {
        valid: isValid,
        estado: (isValid
          ? 'Vigente'
          : isCancelled
            ? 'Cancelado'
            : 'No Encontrado') as CfdiSatValidationResponse['estado'],
        esCancelable: esCancelable as CfdiSatValidationResponse['esCancelable'],
        estatusCancelacion,
        fechaValidacion: new Date().toISOString(),
      };
    } catch (error) {
      return {
        valid: false,
        error: 'Failed to parse SAT response',
      };
    }
  }
}
