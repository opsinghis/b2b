import { Injectable, Logger } from '@nestjs/common';
import {
  CfdiComprobante,
  CfdiConcepto,
  CfdiImpuestos,
  CfdiImpuestosConcepto,
  CfdiEmisor,
  CfdiReceptor,
  CfdiTimbreFiscalDigital,
  CfdiPagos20,
  CfdiComercioExterior,
  CfdisCfdiRelacionados,
  CfdiInformacionGlobal,
  CfdiTipoFactor,
  CfdiParte,
  CfdiAddenda,
  CfdiComplemento,
  CfdiAddendaAmazon,
  CfdiAddendaWalmart,
  CfdiAddendaLiverpool,
  CfdiAddendaSoriana,
  CfdiComercioExteriorDomicilio,
  CfdiComercioExteriorDestinatario,
  CfdiComercioExteriorMercancia,
  CfdiPagos20Pago,
  CfdiPagos20DoctoRelacionado,
  CfdiPagos20Totales,
  CfdiPagos20ImpuestosDR,
  CfdiPagos20ImpuestosP,
} from '../interfaces';

/**
 * CFDI 4.0 XML Generator Service
 *
 * Generates CFDI 4.0 compliant XML documents according to SAT Anexo 20 specification.
 *
 * @see https://www.sat.gob.mx/consultas/35025/formato-de-factura-electronica-(anexo-20)
 */
@Injectable()
export class CfdiXmlGeneratorService {
  private readonly logger = new Logger(CfdiXmlGeneratorService.name);

  // XML Namespaces
  private readonly CFDI_NAMESPACE = 'http://www.sat.gob.mx/cfd/4';
  private readonly XSI_NAMESPACE = 'http://www.w3.org/2001/XMLSchema-instance';
  private readonly TFD_NAMESPACE = 'http://www.sat.gob.mx/TimbreFiscalDigital';
  private readonly PAGOS20_NAMESPACE = 'http://www.sat.gob.mx/Pagos20';
  private readonly CCE20_NAMESPACE = 'http://www.sat.gob.mx/ComercioExterior20';

  // Schema Locations
  private readonly CFDI_SCHEMA_LOCATION =
    'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd';
  private readonly TFD_SCHEMA_LOCATION =
    'http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd';
  private readonly PAGOS20_SCHEMA_LOCATION =
    'http://www.sat.gob.mx/Pagos20 http://www.sat.gob.mx/sitio_internet/cfd/Pagos/Pagos20.xsd';
  private readonly CCE20_SCHEMA_LOCATION =
    'http://www.sat.gob.mx/ComercioExterior20 http://www.sat.gob.mx/sitio_internet/cfd/ComercioExterior20/ComercioExterior20.xsd';

  /**
   * Generate CFDI 4.0 XML document
   */
  generateCfdi(comprobante: CfdiComprobante): string {
    this.logger.debug(
      `Generating CFDI XML for ${comprobante.serie || ''}${comprobante.folio || ''}`,
    );

    const schemaLocations = this.buildSchemaLocations(comprobante);
    const xmlParts: string[] = [];

    // XML Declaration
    xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');

    // Root element with namespaces
    xmlParts.push(this.buildRootElement(comprobante, schemaLocations));

    // Related CFDIs
    if (comprobante.cfdiRelacionados && comprobante.cfdiRelacionados.length > 0) {
      xmlParts.push(this.buildCfdiRelacionados(comprobante.cfdiRelacionados));
    }

    // Issuer (Emisor)
    xmlParts.push(this.buildEmisor(comprobante.emisor));

    // Recipient (Receptor)
    xmlParts.push(this.buildReceptor(comprobante.receptor));

    // Concepts (Line Items)
    xmlParts.push(this.buildConceptos(comprobante.conceptos));

    // Document Level Taxes
    if (comprobante.impuestos) {
      xmlParts.push(this.buildImpuestos(comprobante.impuestos));
    }

    // Complements
    if (comprobante.complemento) {
      xmlParts.push(this.buildComplemento(comprobante.complemento));
    }

    // Addenda
    if (comprobante.addenda) {
      xmlParts.push(this.buildAddenda(comprobante.addenda));
    }

    // Close root element
    xmlParts.push('</cfdi:Comprobante>');

    return xmlParts.join('\n');
  }

  /**
   * Generate original string (cadena original) for sealing
   */
  generateCadenaOriginal(comprobante: CfdiComprobante): string {
    const parts: string[] = [];

    // Version and basic attributes
    parts.push(comprobante.version);
    if (comprobante.serie) parts.push(comprobante.serie);
    if (comprobante.folio) parts.push(comprobante.folio);
    parts.push(comprobante.fecha);
    if (comprobante.formaPago) parts.push(comprobante.formaPago.toString());
    if (comprobante.noCertificado) parts.push(comprobante.noCertificado);
    if (comprobante.condicionesDePago) parts.push(comprobante.condicionesDePago);
    parts.push(this.formatNumber(comprobante.subTotal));
    if (comprobante.descuento !== undefined) parts.push(this.formatNumber(comprobante.descuento));
    parts.push(comprobante.moneda);
    if (comprobante.tipoCambio !== undefined) parts.push(this.formatNumber(comprobante.tipoCambio));
    parts.push(this.formatNumber(comprobante.total));
    parts.push(comprobante.tipoDeComprobante);
    parts.push(comprobante.exportacion.toString());
    if (comprobante.metodoPago) parts.push(comprobante.metodoPago);
    parts.push(comprobante.lugarExpedicion);
    if (comprobante.confirmacion) parts.push(comprobante.confirmacion);

    // Global Information
    if (comprobante.informacionGlobal) {
      parts.push(comprobante.informacionGlobal.periodicidad);
      parts.push(comprobante.informacionGlobal.meses);
      parts.push(comprobante.informacionGlobal.año.toString());
    }

    // Related CFDIs
    if (comprobante.cfdiRelacionados) {
      for (const relacionados of comprobante.cfdiRelacionados) {
        parts.push(relacionados.tipoRelacion.toString());
        for (const rel of relacionados.cfdiRelacionado) {
          parts.push(rel.uuid);
        }
      }
    }

    // Emisor
    parts.push(comprobante.emisor.rfc);
    parts.push(comprobante.emisor.nombre);
    parts.push(comprobante.emisor.regimenFiscal.toString());
    if (comprobante.emisor.facAtrAdquirente) parts.push(comprobante.emisor.facAtrAdquirente);

    // Receptor
    parts.push(comprobante.receptor.rfc);
    parts.push(comprobante.receptor.nombre);
    parts.push(comprobante.receptor.domicilioFiscalReceptor);
    parts.push(comprobante.receptor.regimenFiscalReceptor.toString());
    parts.push(comprobante.receptor.usoCFDI.toString());
    if (comprobante.receptor.residenciaFiscal) parts.push(comprobante.receptor.residenciaFiscal);
    if (comprobante.receptor.numRegIdTrib) parts.push(comprobante.receptor.numRegIdTrib);

    // Conceptos
    for (const concepto of comprobante.conceptos) {
      parts.push(concepto.claveProdServ);
      if (concepto.noIdentificacion) parts.push(concepto.noIdentificacion);
      parts.push(this.formatNumber(concepto.cantidad));
      parts.push(concepto.claveUnidad);
      if (concepto.unidad) parts.push(concepto.unidad);
      parts.push(concepto.descripcion);
      parts.push(this.formatNumber(concepto.valorUnitario));
      parts.push(this.formatNumber(concepto.importe));
      if (concepto.descuento !== undefined) parts.push(this.formatNumber(concepto.descuento));
      parts.push(concepto.objetoImp.toString());

      // Concepto Impuestos
      if (concepto.impuestos) {
        if (concepto.impuestos.traslados?.traslados) {
          for (const traslado of concepto.impuestos.traslados.traslados) {
            parts.push(this.formatNumber(traslado.base));
            parts.push(traslado.impuesto.toString());
            parts.push(traslado.tipoFactor);
            if (traslado.tasaOCuota !== undefined)
              parts.push(this.formatTaxRate(traslado.tasaOCuota));
            if (traslado.importe !== undefined) parts.push(this.formatNumber(traslado.importe));
          }
        }
        if (concepto.impuestos.retenciones?.retenciones) {
          for (const retencion of concepto.impuestos.retenciones.retenciones) {
            parts.push(this.formatNumber(retencion.base));
            parts.push(retencion.impuesto.toString());
            parts.push(retencion.tipoFactor);
            if (retencion.tasaOCuota !== undefined)
              parts.push(this.formatTaxRate(retencion.tasaOCuota));
            if (retencion.importe !== undefined) parts.push(this.formatNumber(retencion.importe));
          }
        }
      }

      // ACuentaTerceros
      if (concepto.aCuentaTerceros) {
        parts.push(concepto.aCuentaTerceros.rfcACuentaTerceros);
        parts.push(concepto.aCuentaTerceros.nombreACuentaTerceros);
        parts.push(concepto.aCuentaTerceros.regimenFiscalACuentaTerceros.toString());
        parts.push(concepto.aCuentaTerceros.domicilioFiscalACuentaTerceros);
      }

      // InformacionAduanera
      if (concepto.informacionAduanera) {
        for (const aduanera of concepto.informacionAduanera) {
          parts.push(aduanera.numeroPedimento);
        }
      }

      // CuentaPredial
      if (concepto.cuentaPredial) {
        for (const predial of concepto.cuentaPredial) {
          parts.push(predial.numero);
        }
      }

      // Parte
      if (concepto.parte) {
        for (const parte of concepto.parte) {
          parts.push(parte.claveProdServ);
          if (parte.noIdentificacion) parts.push(parte.noIdentificacion);
          parts.push(this.formatNumber(parte.cantidad));
          if (parte.claveUnidad) parts.push(parte.claveUnidad);
          if (parte.unidad) parts.push(parte.unidad);
          parts.push(parte.descripcion);
          if (parte.valorUnitario !== undefined) parts.push(this.formatNumber(parte.valorUnitario));
          if (parte.importe !== undefined) parts.push(this.formatNumber(parte.importe));
          if (parte.informacionAduanera) {
            for (const aduanera of parte.informacionAduanera) {
              parts.push(aduanera.numeroPedimento);
            }
          }
        }
      }
    }

    // Document Level Impuestos
    if (comprobante.impuestos) {
      if (comprobante.impuestos.totalImpuestosRetenidos !== undefined) {
        parts.push(this.formatNumber(comprobante.impuestos.totalImpuestosRetenidos));
      }
      if (comprobante.impuestos.totalImpuestosTrasladados !== undefined) {
        parts.push(this.formatNumber(comprobante.impuestos.totalImpuestosTrasladados));
      }
      if (comprobante.impuestos.retenciones) {
        for (const ret of comprobante.impuestos.retenciones) {
          parts.push(ret.impuesto.toString());
          parts.push(this.formatNumber(ret.importe));
        }
      }
      if (comprobante.impuestos.traslados) {
        for (const tras of comprobante.impuestos.traslados) {
          parts.push(this.formatNumber(tras.base));
          parts.push(tras.impuesto.toString());
          parts.push(tras.tipoFactor);
          if (tras.tasaOCuota !== undefined) parts.push(this.formatTaxRate(tras.tasaOCuota));
          if (tras.importe !== undefined) parts.push(this.formatNumber(tras.importe));
        }
      }
    }

    // Build cadena original with pipe separators
    return `||${parts.join('|')}||`;
  }

  /**
   * Generate original string for TimbreFiscalDigital
   */
  generateCadenaOriginalTfd(timbre: CfdiTimbreFiscalDigital, selloCfd: string): string {
    const parts: string[] = [
      timbre.version,
      timbre.uuid,
      timbre.fechaTimbrado,
      timbre.rfcProvCertif,
      selloCfd,
      timbre.noCertificadoSAT,
    ];

    return `||${parts.join('|')}||`;
  }

  /**
   * Build schema locations based on complements present
   */
  private buildSchemaLocations(comprobante: CfdiComprobante): string {
    const locations: string[] = [this.CFDI_SCHEMA_LOCATION];

    if (comprobante.complemento) {
      if (comprobante.complemento.timbreFiscalDigital) {
        locations.push(this.TFD_SCHEMA_LOCATION);
      }
      if (comprobante.complemento.pagos) {
        locations.push(this.PAGOS20_SCHEMA_LOCATION);
      }
      if (comprobante.complemento.comercioExterior) {
        locations.push(this.CCE20_SCHEMA_LOCATION);
      }
    }

    return locations.join(' ');
  }

  /**
   * Build root Comprobante element with attributes
   */
  private buildRootElement(comprobante: CfdiComprobante, schemaLocations: string): string {
    const attrs: string[] = [
      `xmlns:cfdi="${this.CFDI_NAMESPACE}"`,
      `xmlns:xsi="${this.XSI_NAMESPACE}"`,
      `xsi:schemaLocation="${schemaLocations}"`,
      `Version="${comprobante.version}"`,
    ];

    // Add complement namespaces
    if (comprobante.complemento) {
      if (comprobante.complemento.timbreFiscalDigital) {
        attrs.push(`xmlns:tfd="${this.TFD_NAMESPACE}"`);
      }
      if (comprobante.complemento.pagos) {
        attrs.push(`xmlns:pago20="${this.PAGOS20_NAMESPACE}"`);
      }
      if (comprobante.complemento.comercioExterior) {
        attrs.push(`xmlns:cce20="${this.CCE20_NAMESPACE}"`);
      }
    }

    // Optional attributes
    if (comprobante.serie) attrs.push(`Serie="${this.escapeXml(comprobante.serie)}"`);
    if (comprobante.folio) attrs.push(`Folio="${this.escapeXml(comprobante.folio)}"`);
    attrs.push(`Fecha="${comprobante.fecha}"`);
    if (comprobante.sello) attrs.push(`Sello="${comprobante.sello}"`);
    if (comprobante.formaPago) attrs.push(`FormaPago="${comprobante.formaPago}"`);
    if (comprobante.noCertificado) attrs.push(`NoCertificado="${comprobante.noCertificado}"`);
    if (comprobante.certificado) attrs.push(`Certificado="${comprobante.certificado}"`);
    if (comprobante.condicionesDePago) {
      attrs.push(`CondicionesDePago="${this.escapeXml(comprobante.condicionesDePago)}"`);
    }
    attrs.push(`SubTotal="${this.formatNumber(comprobante.subTotal)}"`);
    if (comprobante.descuento !== undefined) {
      attrs.push(`Descuento="${this.formatNumber(comprobante.descuento)}"`);
    }
    attrs.push(`Moneda="${comprobante.moneda}"`);
    if (comprobante.tipoCambio !== undefined) {
      attrs.push(`TipoCambio="${this.formatNumber(comprobante.tipoCambio)}"`);
    }
    attrs.push(`Total="${this.formatNumber(comprobante.total)}"`);
    attrs.push(`TipoDeComprobante="${comprobante.tipoDeComprobante}"`);
    attrs.push(`Exportacion="${comprobante.exportacion}"`);
    if (comprobante.metodoPago) attrs.push(`MetodoPago="${comprobante.metodoPago}"`);
    attrs.push(`LugarExpedicion="${comprobante.lugarExpedicion}"`);
    if (comprobante.confirmacion) attrs.push(`Confirmacion="${comprobante.confirmacion}"`);

    return `<cfdi:Comprobante ${attrs.join(' ')}>`;
  }

  /**
   * Build InformacionGlobal element
   */
  private buildInformacionGlobal(info: CfdiInformacionGlobal): string {
    const attrs = [
      `Periodicidad="${info.periodicidad}"`,
      `Meses="${info.meses}"`,
      `Año="${info.año}"`,
    ];
    return `<cfdi:InformacionGlobal ${attrs.join(' ')}/>`;
  }

  /**
   * Build CfdiRelacionados elements
   */
  private buildCfdiRelacionados(relacionados: CfdisCfdiRelacionados[]): string {
    const parts: string[] = [];
    for (const grupo of relacionados) {
      parts.push(`<cfdi:CfdiRelacionados TipoRelacion="${grupo.tipoRelacion}">`);
      for (const rel of grupo.cfdiRelacionado) {
        parts.push(`<cfdi:CfdiRelacionado UUID="${rel.uuid}"/>`);
      }
      parts.push('</cfdi:CfdiRelacionados>');
    }
    return parts.join('\n');
  }

  /**
   * Build Emisor element
   */
  private buildEmisor(emisor: CfdiEmisor): string {
    const attrs = [
      `Rfc="${emisor.rfc}"`,
      `Nombre="${this.escapeXml(emisor.nombre)}"`,
      `RegimenFiscal="${emisor.regimenFiscal}"`,
    ];
    if (emisor.facAtrAdquirente) {
      attrs.push(`FacAtrAdquirente="${emisor.facAtrAdquirente}"`);
    }
    return `<cfdi:Emisor ${attrs.join(' ')}/>`;
  }

  /**
   * Build Receptor element
   */
  private buildReceptor(receptor: CfdiReceptor): string {
    const attrs = [
      `Rfc="${receptor.rfc}"`,
      `Nombre="${this.escapeXml(receptor.nombre)}"`,
      `DomicilioFiscalReceptor="${receptor.domicilioFiscalReceptor}"`,
      `RegimenFiscalReceptor="${receptor.regimenFiscalReceptor}"`,
      `UsoCFDI="${receptor.usoCFDI}"`,
    ];
    if (receptor.residenciaFiscal) {
      attrs.push(`ResidenciaFiscal="${receptor.residenciaFiscal}"`);
    }
    if (receptor.numRegIdTrib) {
      attrs.push(`NumRegIdTrib="${receptor.numRegIdTrib}"`);
    }
    return `<cfdi:Receptor ${attrs.join(' ')}/>`;
  }

  /**
   * Build Conceptos element
   */
  private buildConceptos(conceptos: CfdiConcepto[]): string {
    const parts: string[] = ['<cfdi:Conceptos>'];
    for (const concepto of conceptos) {
      parts.push(this.buildConcepto(concepto));
    }
    parts.push('</cfdi:Conceptos>');
    return parts.join('\n');
  }

  /**
   * Build individual Concepto element
   */
  private buildConcepto(concepto: CfdiConcepto): string {
    const attrs = [`ClaveProdServ="${concepto.claveProdServ}"`];
    if (concepto.noIdentificacion) {
      attrs.push(`NoIdentificacion="${this.escapeXml(concepto.noIdentificacion)}"`);
    }
    attrs.push(`Cantidad="${this.formatNumber(concepto.cantidad)}"`);
    attrs.push(`ClaveUnidad="${concepto.claveUnidad}"`);
    if (concepto.unidad) {
      attrs.push(`Unidad="${this.escapeXml(concepto.unidad)}"`);
    }
    attrs.push(`Descripcion="${this.escapeXml(concepto.descripcion)}"`);
    attrs.push(`ValorUnitario="${this.formatNumber(concepto.valorUnitario)}"`);
    attrs.push(`Importe="${this.formatNumber(concepto.importe)}"`);
    if (concepto.descuento !== undefined) {
      attrs.push(`Descuento="${this.formatNumber(concepto.descuento)}"`);
    }
    attrs.push(`ObjetoImp="${concepto.objetoImp}"`);

    const hasChildren =
      concepto.impuestos ||
      concepto.aCuentaTerceros ||
      concepto.informacionAduanera ||
      concepto.cuentaPredial ||
      concepto.complementoConcepto ||
      concepto.parte;

    if (!hasChildren) {
      return `<cfdi:Concepto ${attrs.join(' ')}/>`;
    }

    const parts: string[] = [`<cfdi:Concepto ${attrs.join(' ')}>`];

    // Impuestos
    if (concepto.impuestos) {
      parts.push(this.buildConceptoImpuestos(concepto.impuestos));
    }

    // ACuentaTerceros
    if (concepto.aCuentaTerceros) {
      const terceroAttrs = [
        `RfcACuentaTerceros="${concepto.aCuentaTerceros.rfcACuentaTerceros}"`,
        `NombreACuentaTerceros="${this.escapeXml(concepto.aCuentaTerceros.nombreACuentaTerceros)}"`,
        `RegimenFiscalACuentaTerceros="${concepto.aCuentaTerceros.regimenFiscalACuentaTerceros}"`,
        `DomicilioFiscalACuentaTerceros="${concepto.aCuentaTerceros.domicilioFiscalACuentaTerceros}"`,
      ];
      parts.push(`<cfdi:ACuentaTerceros ${terceroAttrs.join(' ')}/>`);
    }

    // InformacionAduanera
    if (concepto.informacionAduanera) {
      for (const aduanera of concepto.informacionAduanera) {
        parts.push(`<cfdi:InformacionAduanera NumeroPedimento="${aduanera.numeroPedimento}"/>`);
      }
    }

    // CuentaPredial
    if (concepto.cuentaPredial) {
      for (const predial of concepto.cuentaPredial) {
        parts.push(`<cfdi:CuentaPredial Numero="${predial.numero}"/>`);
      }
    }

    // ComplementoConcepto
    if (concepto.complementoConcepto) {
      parts.push('<cfdi:ComplementoConcepto>');
      // Handle specific concept complements here if needed
      parts.push('</cfdi:ComplementoConcepto>');
    }

    // Parte
    if (concepto.parte) {
      for (const parte of concepto.parte) {
        parts.push(this.buildParte(parte));
      }
    }

    parts.push('</cfdi:Concepto>');
    return parts.join('\n');
  }

  /**
   * Build Parte element for a concept
   */
  private buildParte(parte: CfdiParte): string {
    const attrs = [`ClaveProdServ="${parte.claveProdServ}"`];
    if (parte.noIdentificacion) {
      attrs.push(`NoIdentificacion="${this.escapeXml(parte.noIdentificacion)}"`);
    }
    attrs.push(`Cantidad="${this.formatNumber(parte.cantidad)}"`);
    if (parte.claveUnidad) attrs.push(`ClaveUnidad="${parte.claveUnidad}"`);
    if (parte.unidad) attrs.push(`Unidad="${this.escapeXml(parte.unidad)}"`);
    attrs.push(`Descripcion="${this.escapeXml(parte.descripcion)}"`);
    if (parte.valorUnitario !== undefined) {
      attrs.push(`ValorUnitario="${this.formatNumber(parte.valorUnitario)}"`);
    }
    if (parte.importe !== undefined) {
      attrs.push(`Importe="${this.formatNumber(parte.importe)}"`);
    }

    if (!parte.informacionAduanera || parte.informacionAduanera.length === 0) {
      return `<cfdi:Parte ${attrs.join(' ')}/>`;
    }

    const parts: string[] = [`<cfdi:Parte ${attrs.join(' ')}>`];
    for (const aduanera of parte.informacionAduanera) {
      parts.push(`<cfdi:InformacionAduanera NumeroPedimento="${aduanera.numeroPedimento}"/>`);
    }
    parts.push('</cfdi:Parte>');
    return parts.join('\n');
  }

  /**
   * Build Impuestos element for a concept
   */
  private buildConceptoImpuestos(impuestos: CfdiImpuestosConcepto): string {
    const parts: string[] = ['<cfdi:Impuestos>'];

    if (impuestos.traslados?.traslados && impuestos.traslados.traslados.length > 0) {
      parts.push('<cfdi:Traslados>');
      for (const traslado of impuestos.traslados.traslados) {
        const attrs = [
          `Base="${this.formatNumber(traslado.base)}"`,
          `Impuesto="${traslado.impuesto}"`,
          `TipoFactor="${traslado.tipoFactor}"`,
        ];
        if (traslado.tipoFactor !== CfdiTipoFactor.EXENTO) {
          if (traslado.tasaOCuota !== undefined) {
            attrs.push(`TasaOCuota="${this.formatTaxRate(traslado.tasaOCuota)}"`);
          }
          if (traslado.importe !== undefined) {
            attrs.push(`Importe="${this.formatNumber(traslado.importe)}"`);
          }
        }
        parts.push(`<cfdi:Traslado ${attrs.join(' ')}/>`);
      }
      parts.push('</cfdi:Traslados>');
    }

    if (impuestos.retenciones?.retenciones && impuestos.retenciones.retenciones.length > 0) {
      parts.push('<cfdi:Retenciones>');
      for (const retencion of impuestos.retenciones.retenciones) {
        const attrs = [
          `Base="${this.formatNumber(retencion.base)}"`,
          `Impuesto="${retencion.impuesto}"`,
          `TipoFactor="${retencion.tipoFactor}"`,
          `TasaOCuota="${this.formatTaxRate(retencion.tasaOCuota ?? 0)}"`,
          `Importe="${this.formatNumber(retencion.importe ?? 0)}"`,
        ];
        parts.push(`<cfdi:Retencion ${attrs.join(' ')}/>`);
      }
      parts.push('</cfdi:Retenciones>');
    }

    parts.push('</cfdi:Impuestos>');
    return parts.join('\n');
  }

  /**
   * Build document level Impuestos element
   */
  private buildImpuestos(impuestos: CfdiImpuestos): string {
    const attrs: string[] = [];
    if (impuestos.totalImpuestosRetenidos !== undefined) {
      attrs.push(
        `TotalImpuestosRetenidos="${this.formatNumber(impuestos.totalImpuestosRetenidos)}"`,
      );
    }
    if (impuestos.totalImpuestosTrasladados !== undefined) {
      attrs.push(
        `TotalImpuestosTrasladados="${this.formatNumber(impuestos.totalImpuestosTrasladados)}"`,
      );
    }

    const parts: string[] = [`<cfdi:Impuestos ${attrs.join(' ')}>`];

    if (impuestos.retenciones && impuestos.retenciones.length > 0) {
      parts.push('<cfdi:Retenciones>');
      for (const ret of impuestos.retenciones) {
        parts.push(
          `<cfdi:Retencion Impuesto="${ret.impuesto}" Importe="${this.formatNumber(ret.importe)}"/>`,
        );
      }
      parts.push('</cfdi:Retenciones>');
    }

    if (impuestos.traslados && impuestos.traslados.length > 0) {
      parts.push('<cfdi:Traslados>');
      for (const tras of impuestos.traslados) {
        const trasAttrs = [
          `Base="${this.formatNumber(tras.base)}"`,
          `Impuesto="${tras.impuesto}"`,
          `TipoFactor="${tras.tipoFactor}"`,
        ];
        if (tras.tipoFactor !== CfdiTipoFactor.EXENTO) {
          if (tras.tasaOCuota !== undefined) {
            trasAttrs.push(`TasaOCuota="${this.formatTaxRate(tras.tasaOCuota)}"`);
          }
          if (tras.importe !== undefined) {
            trasAttrs.push(`Importe="${this.formatNumber(tras.importe)}"`);
          }
        }
        parts.push(`<cfdi:Traslado ${trasAttrs.join(' ')}/>`);
      }
      parts.push('</cfdi:Traslados>');
    }

    parts.push('</cfdi:Impuestos>');
    return parts.join('\n');
  }

  /**
   * Build Complemento element
   */
  private buildComplemento(complemento: CfdiComplemento): string {
    const parts: string[] = ['<cfdi:Complemento>'];

    if (complemento.timbreFiscalDigital) {
      parts.push(this.buildTimbreFiscalDigital(complemento.timbreFiscalDigital));
    }

    if (complemento.pagos) {
      parts.push(this.buildPagos20(complemento.pagos));
    }

    if (complemento.comercioExterior) {
      parts.push(this.buildComercioExterior(complemento.comercioExterior));
    }

    parts.push('</cfdi:Complemento>');
    return parts.join('\n');
  }

  /**
   * Build TimbreFiscalDigital element
   */
  private buildTimbreFiscalDigital(tfd: CfdiTimbreFiscalDigital): string {
    const attrs = [
      `Version="${tfd.version}"`,
      `UUID="${tfd.uuid}"`,
      `FechaTimbrado="${tfd.fechaTimbrado}"`,
      `RfcProvCertif="${tfd.rfcProvCertif}"`,
      `SelloCFD="${tfd.selloCFD}"`,
      `NoCertificadoSAT="${tfd.noCertificadoSAT}"`,
      `SelloSAT="${tfd.selloSAT}"`,
    ];
    return `<tfd:TimbreFiscalDigital ${attrs.join(' ')}/>`;
  }

  /**
   * Build Pagos 2.0 complement
   */
  private buildPagos20(pagos: CfdiPagos20): string {
    const parts: string[] = [`<pago20:Pagos Version="${pagos.version}">`];

    // Totales
    parts.push(this.buildPagos20Totales(pagos.totales));

    // Individual payments
    for (const pago of pagos.pago) {
      parts.push(this.buildPagos20Pago(pago));
    }

    parts.push('</pago20:Pagos>');
    return parts.join('\n');
  }

  /**
   * Build Pagos 2.0 Totales
   */
  private buildPagos20Totales(totales: CfdiPagos20Totales): string {
    const attrs: string[] = [];
    if (totales.totalRetencionesIVA !== undefined) {
      attrs.push(`TotalRetencionesIVA="${this.formatNumber(totales.totalRetencionesIVA)}"`);
    }
    if (totales.totalRetencionesISR !== undefined) {
      attrs.push(`TotalRetencionesISR="${this.formatNumber(totales.totalRetencionesISR)}"`);
    }
    if (totales.totalRetencionesIEPS !== undefined) {
      attrs.push(`TotalRetencionesIEPS="${this.formatNumber(totales.totalRetencionesIEPS)}"`);
    }
    if (totales.totalTrasladosBaseIVA16 !== undefined) {
      attrs.push(`TotalTrasladosBaseIVA16="${this.formatNumber(totales.totalTrasladosBaseIVA16)}"`);
    }
    if (totales.totalTrasladosImpuestoIVA16 !== undefined) {
      attrs.push(
        `TotalTrasladosImpuestoIVA16="${this.formatNumber(totales.totalTrasladosImpuestoIVA16)}"`,
      );
    }
    if (totales.totalTrasladosBaseIVA8 !== undefined) {
      attrs.push(`TotalTrasladosBaseIVA8="${this.formatNumber(totales.totalTrasladosBaseIVA8)}"`);
    }
    if (totales.totalTrasladosImpuestoIVA8 !== undefined) {
      attrs.push(
        `TotalTrasladosImpuestoIVA8="${this.formatNumber(totales.totalTrasladosImpuestoIVA8)}"`,
      );
    }
    if (totales.totalTrasladosBaseIVA0 !== undefined) {
      attrs.push(`TotalTrasladosBaseIVA0="${this.formatNumber(totales.totalTrasladosBaseIVA0)}"`);
    }
    if (totales.totalTrasladosImpuestoIVA0 !== undefined) {
      attrs.push(
        `TotalTrasladosImpuestoIVA0="${this.formatNumber(totales.totalTrasladosImpuestoIVA0)}"`,
      );
    }
    if (totales.totalTrasladosBaseIVAExento !== undefined) {
      attrs.push(
        `TotalTrasladosBaseIVAExento="${this.formatNumber(totales.totalTrasladosBaseIVAExento)}"`,
      );
    }
    attrs.push(`MontoTotalPagos="${this.formatNumber(totales.montoTotalPagos)}"`);

    return `<pago20:Totales ${attrs.join(' ')}/>`;
  }

  /**
   * Build individual Pago element
   */
  private buildPagos20Pago(pago: CfdiPagos20Pago): string {
    const attrs = [
      `FechaPago="${pago.fechaPago}"`,
      `FormaDePagoP="${pago.formaDePagoP}"`,
      `MonedaP="${pago.monedaP}"`,
    ];
    if (pago.tipoCambioP !== undefined) {
      attrs.push(`TipoCambioP="${this.formatNumber(pago.tipoCambioP)}"`);
    }
    attrs.push(`Monto="${this.formatNumber(pago.monto)}"`);
    if (pago.rfcEmisorCtaOrd) attrs.push(`RfcEmisorCtaOrd="${pago.rfcEmisorCtaOrd}"`);
    if (pago.nomBancoOrdExt) attrs.push(`NomBancoOrdExt="${this.escapeXml(pago.nomBancoOrdExt)}"`);
    if (pago.ctaOrdenante) attrs.push(`CtaOrdenante="${pago.ctaOrdenante}"`);
    if (pago.rfcEmisorCtaBen) attrs.push(`RfcEmisorCtaBen="${pago.rfcEmisorCtaBen}"`);
    if (pago.ctaBeneficiario) attrs.push(`CtaBeneficiario="${pago.ctaBeneficiario}"`);
    if (pago.tipoCadPago) attrs.push(`TipoCadPago="${pago.tipoCadPago}"`);
    if (pago.certPago) attrs.push(`CertPago="${pago.certPago}"`);
    if (pago.cadPago) attrs.push(`CadPago="${pago.cadPago}"`);
    if (pago.selloPago) attrs.push(`SelloPago="${pago.selloPago}"`);

    const parts: string[] = [`<pago20:Pago ${attrs.join(' ')}>`];

    // DoctoRelacionado
    for (const docto of pago.doctoRelacionado) {
      parts.push(this.buildPagos20DoctoRelacionado(docto));
    }

    // ImpuestosP
    if (pago.impuestosP) {
      parts.push(this.buildPagos20ImpuestosP(pago.impuestosP));
    }

    parts.push('</pago20:Pago>');
    return parts.join('\n');
  }

  /**
   * Build DoctoRelacionado for Pagos 2.0
   */
  private buildPagos20DoctoRelacionado(docto: CfdiPagos20DoctoRelacionado): string {
    const attrs = [`IdDocumento="${docto.idDocumento}"`];
    if (docto.serie) attrs.push(`Serie="${this.escapeXml(docto.serie)}"`);
    if (docto.folio) attrs.push(`Folio="${this.escapeXml(docto.folio)}"`);
    attrs.push(`MonedaDR="${docto.monedaDR}"`);
    attrs.push(`EquivalenciaDR="${this.formatNumber(docto.equivalenciaDR)}"`);
    attrs.push(`NumParcialidad="${docto.numParcialidad}"`);
    attrs.push(`ImpSaldoAnt="${this.formatNumber(docto.impSaldoAnt)}"`);
    attrs.push(`ImpPagado="${this.formatNumber(docto.impPagado)}"`);
    attrs.push(`ImpSaldoInsoluto="${this.formatNumber(docto.impSaldoInsoluto)}"`);
    attrs.push(`ObjetoImpDR="${docto.objetoImpDR}"`);

    if (!docto.impuestosDR) {
      return `<pago20:DoctoRelacionado ${attrs.join(' ')}/>`;
    }

    const parts: string[] = [`<pago20:DoctoRelacionado ${attrs.join(' ')}>`];
    parts.push(this.buildPagos20ImpuestosDR(docto.impuestosDR));
    parts.push('</pago20:DoctoRelacionado>');
    return parts.join('\n');
  }

  /**
   * Build ImpuestosDR for DoctoRelacionado
   */
  private buildPagos20ImpuestosDR(impuestos: CfdiPagos20ImpuestosDR): string {
    const parts: string[] = ['<pago20:ImpuestosDR>'];

    if (impuestos.retencionesDR && impuestos.retencionesDR.length > 0) {
      parts.push('<pago20:RetencionesDR>');
      for (const ret of impuestos.retencionesDR) {
        parts.push(
          `<pago20:RetencionDR BaseDR="${this.formatNumber(ret.baseDR)}" ` +
            `ImpuestoDR="${ret.impuestoDR}" TipoFactorDR="${ret.tipoFactorDR}" ` +
            `TasaOCuotaDR="${this.formatTaxRate(ret.tasaOCuotaDR)}" ` +
            `ImporteDR="${this.formatNumber(ret.importeDR)}"/>`,
        );
      }
      parts.push('</pago20:RetencionesDR>');
    }

    if (impuestos.trasladosDR && impuestos.trasladosDR.length > 0) {
      parts.push('<pago20:TrasladosDR>');
      for (const tras of impuestos.trasladosDR) {
        const trasAttrs = [
          `BaseDR="${this.formatNumber(tras.baseDR)}"`,
          `ImpuestoDR="${tras.impuestoDR}"`,
          `TipoFactorDR="${tras.tipoFactorDR}"`,
        ];
        if (tras.tasaOCuotaDR !== undefined) {
          trasAttrs.push(`TasaOCuotaDR="${this.formatTaxRate(tras.tasaOCuotaDR)}"`);
        }
        if (tras.importeDR !== undefined) {
          trasAttrs.push(`ImporteDR="${this.formatNumber(tras.importeDR)}"`);
        }
        parts.push(`<pago20:TrasladoDR ${trasAttrs.join(' ')}/>`);
      }
      parts.push('</pago20:TrasladosDR>');
    }

    parts.push('</pago20:ImpuestosDR>');
    return parts.join('\n');
  }

  /**
   * Build ImpuestosP for Pago
   */
  private buildPagos20ImpuestosP(impuestos: CfdiPagos20ImpuestosP): string {
    const parts: string[] = ['<pago20:ImpuestosP>'];

    if (impuestos.retencionesP && impuestos.retencionesP.length > 0) {
      parts.push('<pago20:RetencionesP>');
      for (const ret of impuestos.retencionesP) {
        parts.push(
          `<pago20:RetencionP ImpuestoP="${ret.impuestoP}" ImporteP="${this.formatNumber(ret.importeP)}"/>`,
        );
      }
      parts.push('</pago20:RetencionesP>');
    }

    if (impuestos.trasladosP && impuestos.trasladosP.length > 0) {
      parts.push('<pago20:TrasladosP>');
      for (const tras of impuestos.trasladosP) {
        const trasAttrs = [
          `BaseP="${this.formatNumber(tras.baseP)}"`,
          `ImpuestoP="${tras.impuestoP}"`,
          `TipoFactorP="${tras.tipoFactorP}"`,
        ];
        if (tras.tasaOCuotaP !== undefined) {
          trasAttrs.push(`TasaOCuotaP="${this.formatTaxRate(tras.tasaOCuotaP)}"`);
        }
        if (tras.importeP !== undefined) {
          trasAttrs.push(`ImporteP="${this.formatNumber(tras.importeP)}"`);
        }
        parts.push(`<pago20:TrasladoP ${trasAttrs.join(' ')}/>`);
      }
      parts.push('</pago20:TrasladosP>');
    }

    parts.push('</pago20:ImpuestosP>');
    return parts.join('\n');
  }

  /**
   * Build Comercio Exterior 2.0 complement
   */
  private buildComercioExterior(cce: CfdiComercioExterior): string {
    const attrs = [`Version="${cce.version}"`];
    if (cce.motivoTraslado) attrs.push(`MotivoTraslado="${cce.motivoTraslado}"`);
    if (cce.claveDeOperacion) attrs.push(`ClavePedimento="${cce.claveDeOperacion}"`);
    if (cce.certificadoOrigen !== undefined)
      attrs.push(`CertificadoOrigen="${cce.certificadoOrigen}"`);
    if (cce.numCertificadoOrigen) attrs.push(`NumCertificadoOrigen="${cce.numCertificadoOrigen}"`);
    if (cce.numExportadorConfiable)
      attrs.push(`NumExportadorConfiable="${cce.numExportadorConfiable}"`);
    if (cce.incoterm) attrs.push(`Incoterm="${cce.incoterm}"`);
    if (cce.subdivision !== undefined) attrs.push(`Subdivision="${cce.subdivision}"`);
    if (cce.observaciones) attrs.push(`Observaciones="${this.escapeXml(cce.observaciones)}"`);
    attrs.push(`TipoCambioUSD="${this.formatNumber(cce.tipoCambioUSD)}"`);
    attrs.push(`TotalUSD="${this.formatNumber(cce.totalUSD)}"`);

    const parts: string[] = [`<cce20:ComercioExterior ${attrs.join(' ')}>`];

    // Emisor domicilio
    if (cce.emisor?.domicilio) {
      parts.push('<cce20:Emisor>');
      parts.push(this.buildComercioExteriorDomicilio(cce.emisor.domicilio));
      parts.push('</cce20:Emisor>');
    }

    // Propietario
    if (cce.propietario && cce.propietario.length > 0) {
      for (const prop of cce.propietario) {
        parts.push(
          `<cce20:Propietario NumRegIdTrib="${prop.numRegIdTrib}" ResidenciaFiscal="${prop.residenciaFiscal}"/>`,
        );
      }
    }

    // Destinatario
    if (cce.destinatario && cce.destinatario.length > 0) {
      for (const dest of cce.destinatario) {
        parts.push(this.buildComercioExteriorDestinatario(dest));
      }
    }

    // Mercancias
    if (cce.mercancias && cce.mercancias.length > 0) {
      parts.push('<cce20:Mercancias>');
      for (const merc of cce.mercancias) {
        parts.push(this.buildComercioExteriorMercancia(merc));
      }
      parts.push('</cce20:Mercancias>');
    }

    parts.push('</cce20:ComercioExterior>');
    return parts.join('\n');
  }

  /**
   * Build Domicilio for Comercio Exterior
   */
  private buildComercioExteriorDomicilio(dom: CfdiComercioExteriorDomicilio): string {
    const attrs = [`Calle="${this.escapeXml(dom.calle)}"`];
    if (dom.numeroExterior) attrs.push(`NumeroExterior="${this.escapeXml(dom.numeroExterior)}"`);
    if (dom.numeroInterior) attrs.push(`NumeroInterior="${this.escapeXml(dom.numeroInterior)}"`);
    if (dom.colonia) attrs.push(`Colonia="${dom.colonia}"`);
    if (dom.localidad) attrs.push(`Localidad="${dom.localidad}"`);
    if (dom.referencia) attrs.push(`Referencia="${this.escapeXml(dom.referencia)}"`);
    if (dom.municipio) attrs.push(`Municipio="${dom.municipio}"`);
    attrs.push(`Estado="${dom.estado}"`);
    attrs.push(`Pais="${dom.pais}"`);
    attrs.push(`CodigoPostal="${dom.codigoPostal}"`);

    return `<cce20:Domicilio ${attrs.join(' ')}/>`;
  }

  /**
   * Build Destinatario for Comercio Exterior
   */
  private buildComercioExteriorDestinatario(dest: CfdiComercioExteriorDestinatario): string {
    const attrs: string[] = [];
    if (dest.numRegIdTrib) attrs.push(`NumRegIdTrib="${dest.numRegIdTrib}"`);
    if (dest.nombre) attrs.push(`Nombre="${this.escapeXml(dest.nombre)}"`);

    if (!dest.domicilio) {
      return `<cce20:Destinatario ${attrs.join(' ')}/>`;
    }

    const parts: string[] = [`<cce20:Destinatario ${attrs.join(' ')}>`];
    parts.push(this.buildComercioExteriorDomicilio(dest.domicilio));
    parts.push('</cce20:Destinatario>');
    return parts.join('\n');
  }

  /**
   * Build Mercancia for Comercio Exterior
   */
  private buildComercioExteriorMercancia(merc: CfdiComercioExteriorMercancia): string {
    const attrs = [`NoIdentificacion="${this.escapeXml(merc.noIdentificacion)}"`];
    if (merc.fraccionArancelaria) attrs.push(`FraccionArancelaria="${merc.fraccionArancelaria}"`);
    if (merc.cantidadAduana !== undefined)
      attrs.push(`CantidadAduana="${this.formatNumber(merc.cantidadAduana)}"`);
    if (merc.unidadAduana) attrs.push(`UnidadAduana="${merc.unidadAduana}"`);
    if (merc.valorUnitarioAduana !== undefined) {
      attrs.push(`ValorUnitarioAduana="${this.formatNumber(merc.valorUnitarioAduana)}"`);
    }
    attrs.push(`ValorDolares="${this.formatNumber(merc.valorDolares)}"`);

    if (!merc.descripcionesEspecificas || merc.descripcionesEspecificas.length === 0) {
      return `<cce20:Mercancia ${attrs.join(' ')}/>`;
    }

    const parts: string[] = [`<cce20:Mercancia ${attrs.join(' ')}>`];
    for (const desc of merc.descripcionesEspecificas) {
      const descAttrs = [`Marca="${this.escapeXml(desc.marca)}"`];
      if (desc.modelo) descAttrs.push(`Modelo="${this.escapeXml(desc.modelo)}"`);
      if (desc.subModelo) descAttrs.push(`SubModelo="${this.escapeXml(desc.subModelo)}"`);
      if (desc.numeroSerie) descAttrs.push(`NumeroSerie="${this.escapeXml(desc.numeroSerie)}"`);
      parts.push(`<cce20:DescripcionesEspecificas ${descAttrs.join(' ')}/>`);
    }
    parts.push('</cce20:Mercancia>');
    return parts.join('\n');
  }

  /**
   * Build Addenda element
   */
  private buildAddenda(addenda: CfdiAddenda): string {
    const parts: string[] = ['<cfdi:Addenda>'];

    // Custom raw XML addenda takes precedence
    if (addenda.custom) {
      parts.push(addenda.custom);
    }

    // Amazon addenda
    if (addenda.amazon) {
      parts.push(this.buildAddendaAmazon(addenda.amazon));
    }

    // Walmart addenda
    if (addenda.walmart) {
      parts.push(this.buildAddendaWalmart(addenda.walmart));
    }

    // Liverpool addenda
    if (addenda.liverpool) {
      parts.push(this.buildAddendaLiverpool(addenda.liverpool));
    }

    // Soriana addenda
    if (addenda.soriana) {
      parts.push(this.buildAddendaSoriana(addenda.soriana));
    }

    parts.push('</cfdi:Addenda>');
    return parts.join('\n');
  }

  /**
   * Build Amazon addenda
   */
  private buildAddendaAmazon(amazon: CfdiAddendaAmazon): string {
    return `<amz:AdditionalInformation xmlns:amz="http://amazon.com/cfdi/addenda">
  <amz:VendorCode>${this.escapeXml(amazon.vendorCode)}</amz:VendorCode>
  <amz:ShipToLocationCode>${this.escapeXml(amazon.shipToLocationCode)}</amz:ShipToLocationCode>
  <amz:BillToLocationCode>${this.escapeXml(amazon.billToLocationCode)}</amz:BillToLocationCode>
  <amz:PurchaseOrderNumber>${this.escapeXml(amazon.purchaseOrderNumber)}</amz:PurchaseOrderNumber>
  <amz:PurchaseOrderDate>${amazon.purchaseOrderDate}</amz:PurchaseOrderDate>
  ${amazon.deliveryNoteNumber ? `<amz:DeliveryNoteNumber>${this.escapeXml(amazon.deliveryNoteNumber)}</amz:DeliveryNoteNumber>` : ''}
  ${amazon.asnNumber ? `<amz:ASNNumber>${this.escapeXml(amazon.asnNumber)}</amz:ASNNumber>` : ''}
</amz:AdditionalInformation>`;
  }

  /**
   * Build Walmart addenda
   */
  private buildAddendaWalmart(walmart: CfdiAddendaWalmart): string {
    return `<wm:WalmartAddenda xmlns:wm="http://www.walmart.com.mx/cfdi/addenda">
  <wm:ProviderNumber>${this.escapeXml(walmart.providerNumber)}</wm:ProviderNumber>
  <wm:StoreNumber>${this.escapeXml(walmart.storeNumber)}</wm:StoreNumber>
  <wm:PurchaseOrderNumber>${this.escapeXml(walmart.purchaseOrderNumber)}</wm:PurchaseOrderNumber>
  <wm:InvoiceType>${walmart.invoiceType}</wm:InvoiceType>
  ${walmart.deliveryDate ? `<wm:DeliveryDate>${walmart.deliveryDate}</wm:DeliveryDate>` : ''}
  ${walmart.reference ? `<wm:Reference>${this.escapeXml(walmart.reference)}</wm:Reference>` : ''}
</wm:WalmartAddenda>`;
  }

  /**
   * Build Liverpool addenda
   */
  private buildAddendaLiverpool(liverpool: CfdiAddendaLiverpool): string {
    return `<lp:LiverpoolAddenda xmlns:lp="http://www.liverpool.com.mx/cfdi/addenda">
  <lp:ProviderNumber>${this.escapeXml(liverpool.providerNumber)}</lp:ProviderNumber>
  <lp:PurchaseOrderNumber>${this.escapeXml(liverpool.purchaseOrderNumber)}</lp:PurchaseOrderNumber>
  ${liverpool.deliveryNumber ? `<lp:DeliveryNumber>${this.escapeXml(liverpool.deliveryNumber)}</lp:DeliveryNumber>` : ''}
  ${liverpool.reference1 ? `<lp:Reference1>${this.escapeXml(liverpool.reference1)}</lp:Reference1>` : ''}
  ${liverpool.reference2 ? `<lp:Reference2>${this.escapeXml(liverpool.reference2)}</lp:Reference2>` : ''}
</lp:LiverpoolAddenda>`;
  }

  /**
   * Build Soriana addenda
   */
  private buildAddendaSoriana(soriana: CfdiAddendaSoriana): string {
    return `<sor:SorianaAddenda xmlns:sor="http://www.soriana.com/cfdi/addenda">
  <sor:ProviderNumber>${this.escapeXml(soriana.providerNumber)}</sor:ProviderNumber>
  <sor:OrderNumber>${this.escapeXml(soriana.orderNumber)}</sor:OrderNumber>
  <sor:StoreNumber>${this.escapeXml(soriana.storeNumber)}</sor:StoreNumber>
  ${soriana.deliveryFolio ? `<sor:DeliveryFolio>${this.escapeXml(soriana.deliveryFolio)}</sor:DeliveryFolio>` : ''}
</sor:SorianaAddenda>`;
  }

  /**
   * Format number to 2 decimal places (SAT standard)
   */
  private formatNumber(value: number): string {
    return value.toFixed(2);
  }

  /**
   * Format tax rate to 6 decimal places (SAT standard for TasaOCuota)
   */
  private formatTaxRate(value: number): string {
    return value.toFixed(6);
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
