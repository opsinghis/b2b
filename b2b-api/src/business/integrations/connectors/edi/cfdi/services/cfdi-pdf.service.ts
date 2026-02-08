import { Injectable, Logger } from '@nestjs/common';
import { CfdiPdfOptions, CfdiTipoComprobante } from '../interfaces';
import { CfdiSignatureService } from './cfdi-signature.service';

/**
 * PDF Generation Result
 */
export interface PdfGenerationResult {
  success: boolean;
  pdf?: Buffer;
  error?: string;
}

/**
 * CFDI PDF Service
 *
 * Generates PDF representations of CFDI documents for human consumption.
 * Includes all required elements: QR code, UUID, seals, and document data.
 *
 * Note: This implementation uses HTML-to-PDF approach. In production,
 * consider using a dedicated PDF library like PDFKit, pdf-lib, or puppeteer.
 */
@Injectable()
export class CfdiPdfService {
  private readonly logger = new Logger(CfdiPdfService.name);

  constructor(private readonly signatureService: CfdiSignatureService) {}

  /**
   * Generate PDF representation of a CFDI
   */
  async generatePdf(options: CfdiPdfOptions): Promise<PdfGenerationResult> {
    this.logger.debug(
      `Generating PDF for CFDI ${options.comprobante.serie || ''}${options.comprobante.folio || ''}`,
    );

    try {
      const html = this.generateHtml(options);
      const pdf = await this.htmlToPdf(html);

      return {
        success: true,
        pdf,
      };
    } catch (error) {
      this.logger.error('PDF generation failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF generation failed',
      };
    }
  }

  /**
   * Generate HTML representation (can be used directly or converted to PDF)
   */
  generateHtml(options: CfdiPdfOptions): string {
    const { comprobante, timbre, cadenaOriginal, logo, colors, notes } = options;
    // template option can be extended for different PDF layouts
    void options.template;

    const primaryColor = colors?.primary || '#1a5276';
    const secondaryColor = colors?.secondary || '#f8f9fa';

    // Generate QR code URL (for embedding in HTML)
    let qrString = '';
    if (timbre && comprobante.sello) {
      qrString = this.signatureService.generateQrString(
        timbre.uuid,
        comprobante.emisor.rfc,
        comprobante.receptor.rfc,
        comprobante.total,
        comprobante.sello,
      );
    }

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CFDI ${comprobante.serie || ''}${comprobante.folio || ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #333;
      padding: 15mm;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 2px solid ${primaryColor};
    }
    .logo {
      max-width: 150px;
      max-height: 60px;
    }
    .document-type {
      text-align: right;
    }
    .document-type h1 {
      color: ${primaryColor};
      font-size: 16pt;
      margin-bottom: 5px;
    }
    .document-type .folio {
      font-size: 12pt;
      font-weight: bold;
    }
    .parties {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
    }
    .party {
      flex: 1;
      padding: 10px;
      background: ${secondaryColor};
      border-radius: 4px;
    }
    .party h3 {
      color: ${primaryColor};
      font-size: 9pt;
      text-transform: uppercase;
      margin-bottom: 8px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .party p {
      margin-bottom: 3px;
      font-size: 9pt;
    }
    .party .name {
      font-weight: bold;
      font-size: 10pt;
    }
    .details-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 15px;
      padding: 10px;
      background: ${secondaryColor};
      border-radius: 4px;
    }
    .detail-item {
      text-align: center;
    }
    .detail-item label {
      display: block;
      font-size: 7pt;
      color: #666;
      text-transform: uppercase;
    }
    .detail-item value {
      display: block;
      font-weight: bold;
      font-size: 9pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    th {
      background: ${primaryColor};
      color: white;
      padding: 8px;
      font-size: 8pt;
      text-transform: uppercase;
      text-align: left;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #eee;
      font-size: 9pt;
    }
    tr:nth-child(even) {
      background: #fafafa;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 15px;
    }
    .totals-table {
      width: 250px;
    }
    .totals-table td {
      padding: 5px 10px;
    }
    .totals-table .total-row {
      background: ${primaryColor};
      color: white;
      font-weight: bold;
      font-size: 11pt;
    }
    .fiscal-stamp {
      margin-top: 20px;
      padding: 15px;
      background: ${secondaryColor};
      border-radius: 4px;
      font-size: 8pt;
    }
    .fiscal-stamp h3 {
      color: ${primaryColor};
      margin-bottom: 10px;
      font-size: 9pt;
    }
    .qr-section {
      display: flex;
      gap: 15px;
      margin-top: 10px;
    }
    .qr-code {
      width: 100px;
      height: 100px;
      background: white;
      padding: 5px;
      border: 1px solid #ddd;
    }
    .stamp-details {
      flex: 1;
    }
    .stamp-details p {
      margin-bottom: 5px;
      word-break: break-all;
    }
    .stamp-details label {
      font-weight: bold;
      color: #666;
    }
    .seal-string {
      font-family: monospace;
      font-size: 6pt;
      word-break: break-all;
      padding: 5px;
      background: white;
      border: 1px solid #ddd;
      margin-top: 10px;
    }
    .notes {
      margin-top: 15px;
      padding: 10px;
      background: #fff3cd;
      border-radius: 4px;
      font-size: 9pt;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 7pt;
      color: #666;
    }
    @media print {
      body { padding: 10mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-container">
      ${logo ? `<img src="data:image/png;base64,${logo}" class="logo" alt="Logo">` : ''}
      <p class="name">${this.escapeHtml(comprobante.emisor.nombre)}</p>
    </div>
    <div class="document-type">
      <h1>${this.getTipoComprobanteLabel(comprobante.tipoDeComprobante)}</h1>
      <p class="folio">${comprobante.serie || ''}${comprobante.folio || ''}</p>
      <p>Fecha: ${this.formatDate(comprobante.fecha)}</p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Emisor</h3>
      <p class="name">${this.escapeHtml(comprobante.emisor.nombre)}</p>
      <p>RFC: ${comprobante.emisor.rfc}</p>
      <p>Régimen Fiscal: ${this.getRegimenFiscalLabel(comprobante.emisor.regimenFiscal.toString())}</p>
      <p>Lugar de Expedición: ${comprobante.lugarExpedicion}</p>
    </div>
    <div class="party">
      <h3>Receptor</h3>
      <p class="name">${this.escapeHtml(comprobante.receptor.nombre)}</p>
      <p>RFC: ${comprobante.receptor.rfc}</p>
      <p>Régimen Fiscal: ${this.getRegimenFiscalLabel(comprobante.receptor.regimenFiscalReceptor.toString())}</p>
      <p>Domicilio Fiscal: ${comprobante.receptor.domicilioFiscalReceptor}</p>
      <p>Uso CFDI: ${this.getUsoCfdiLabel(comprobante.receptor.usoCFDI.toString())}</p>
    </div>
  </div>

  <div class="details-grid">
    <div class="detail-item">
      <label>Moneda</label>
      <value>${comprobante.moneda}</value>
    </div>
    <div class="detail-item">
      <label>Tipo de Cambio</label>
      <value>${comprobante.tipoCambio?.toFixed(4) || 'N/A'}</value>
    </div>
    <div class="detail-item">
      <label>Forma de Pago</label>
      <value>${comprobante.formaPago ? this.getFormaPagoLabel(comprobante.formaPago.toString()) : 'N/A'}</value>
    </div>
    <div class="detail-item">
      <label>Método de Pago</label>
      <value>${comprobante.metodoPago ? this.getMetodoPagoLabel(comprobante.metodoPago.toString()) : 'N/A'}</value>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 15%">Clave</th>
        <th style="width: 35%">Descripción</th>
        <th class="text-center" style="width: 10%">Cantidad</th>
        <th style="width: 10%">Unidad</th>
        <th class="text-right" style="width: 15%">P. Unitario</th>
        <th class="text-right" style="width: 15%">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${comprobante.conceptos
        .map(
          (c) => `
        <tr>
          <td>${c.claveProdServ}</td>
          <td>${this.escapeHtml(c.descripcion)}</td>
          <td class="text-center">${c.cantidad.toFixed(2)}</td>
          <td>${c.claveUnidad} ${c.unidad ? `(${this.escapeHtml(c.unidad)})` : ''}</td>
          <td class="text-right">$${this.formatMoney(c.valorUnitario)}</td>
          <td class="text-right">$${this.formatMoney(c.importe)}</td>
        </tr>
      `,
        )
        .join('')}
    </tbody>
  </table>

  <div class="totals">
    <table class="totals-table">
      <tr>
        <td>Subtotal:</td>
        <td class="text-right">$${this.formatMoney(comprobante.subTotal)}</td>
      </tr>
      ${
        comprobante.descuento
          ? `
        <tr>
          <td>Descuento:</td>
          <td class="text-right">-$${this.formatMoney(comprobante.descuento)}</td>
        </tr>
      `
          : ''
      }
      ${
        comprobante.impuestos?.traslados
          ?.map(
            (t) => `
        <tr>
          <td>IVA (${((t.tasaOCuota || 0) * 100).toFixed(0)}%):</td>
          <td class="text-right">$${this.formatMoney(t.importe || 0)}</td>
        </tr>
      `,
          )
          .join('') || ''
      }
      ${
        comprobante.impuestos?.retenciones
          ?.map(
            (r) => `
        <tr>
          <td>Retención ${this.getImpuestoLabel(r.impuesto.toString())}:</td>
          <td class="text-right">-$${this.formatMoney(r.importe)}</td>
        </tr>
      `,
          )
          .join('') || ''
      }
      <tr class="total-row">
        <td>Total:</td>
        <td class="text-right">$${this.formatMoney(comprobante.total)} ${comprobante.moneda}</td>
      </tr>
    </table>
  </div>

  ${
    timbre
      ? `
    <div class="fiscal-stamp">
      <h3>Timbre Fiscal Digital</h3>
      <div class="qr-section">
        <div class="qr-code">
          ${
            options.showQr !== false
              ? `
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(qrString)}" alt="QR Code" style="width: 90px; height: 90px;">
          `
              : ''
          }
        </div>
        <div class="stamp-details">
          <p><label>UUID:</label> ${timbre.uuid}</p>
          <p><label>Fecha Timbrado:</label> ${timbre.fechaTimbrado}</p>
          <p><label>No. Certificado SAT:</label> ${timbre.noCertificadoSAT}</p>
          <p><label>RFC Proveedor:</label> ${timbre.rfcProvCertif}</p>
        </div>
      </div>
      ${
        cadenaOriginal
          ? `
        <div class="seal-string">
          <label>Cadena Original del Complemento de Certificación Digital del SAT:</label>
          <p>${cadenaOriginal}</p>
        </div>
      `
          : ''
      }
      <div class="seal-string">
        <label>Sello Digital del CFDI:</label>
        <p>${comprobante.sello || ''}</p>
      </div>
      <div class="seal-string">
        <label>Sello del SAT:</label>
        <p>${timbre.selloSAT}</p>
      </div>
    </div>
  `
      : ''
  }

  ${
    notes
      ? `
    <div class="notes">
      <strong>Notas:</strong> ${this.escapeHtml(notes)}
    </div>
  `
      : ''
  }

  <div class="footer">
    <p>Este documento es una representación impresa de un CFDI</p>
    <p>Verificar en: https://verificacfdi.facturaelectronica.sat.gob.mx</p>
  </div>
</body>
</html>`;
  }

  /**
   * Convert HTML to PDF buffer
   * Note: This is a simplified implementation. In production, use puppeteer or similar.
   */
  private async htmlToPdf(html: string): Promise<Buffer> {
    // For a production implementation, you would use puppeteer like this:
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    // await page.setContent(html);
    // const pdf = await page.pdf({ format: 'Letter' });
    // await browser.close();
    // return pdf;

    // For now, return HTML as buffer (can be rendered by client)
    return Buffer.from(html, 'utf-8');
  }

  /**
   * Get label for TipoComprobante
   */
  private getTipoComprobanteLabel(tipo: CfdiTipoComprobante | string): string {
    const labels: Record<string, string> = {
      I: 'Factura',
      E: 'Nota de Crédito',
      T: 'Traslado',
      N: 'Nómina',
      P: 'Recepción de Pagos',
    };
    return labels[tipo] || tipo;
  }

  /**
   * Get label for FormaPago
   */
  private getFormaPagoLabel(forma: string): string {
    const labels: Record<string, string> = {
      '01': 'Efectivo',
      '02': 'Cheque nominativo',
      '03': 'Transferencia electrónica',
      '04': 'Tarjeta de crédito',
      '28': 'Tarjeta de débito',
      '99': 'Por definir',
    };
    return labels[forma] || forma;
  }

  /**
   * Get label for MetodoPago
   */
  private getMetodoPagoLabel(metodo: string): string {
    const labels: Record<string, string> = {
      PUE: 'Pago en una sola exhibición',
      PPD: 'Pago en parcialidades o diferido',
    };
    return labels[metodo] || metodo;
  }

  /**
   * Get label for UsoCFDI
   */
  private getUsoCfdiLabel(uso: string): string {
    const labels: Record<string, string> = {
      G01: 'Adquisición de mercancías',
      G02: 'Devoluciones, descuentos o bonificaciones',
      G03: 'Gastos en general',
      I01: 'Construcciones',
      I02: 'Mobiliario y equipo de oficina',
      I03: 'Equipo de transporte',
      I04: 'Equipo de cómputo',
      I08: 'Otra maquinaria y equipo',
      S01: 'Sin efectos fiscales',
      CP01: 'Pagos',
    };
    return labels[uso] || uso;
  }

  /**
   * Get label for RegimenFiscal
   */
  private getRegimenFiscalLabel(regimen: string): string {
    const labels: Record<string, string> = {
      '601': 'General de Ley Personas Morales',
      '603': 'Personas Morales con Fines no Lucrativos',
      '605': 'Sueldos y Salarios',
      '606': 'Arrendamiento',
      '612': 'Personas Físicas con Actividades Empresariales',
      '616': 'Sin obligaciones fiscales',
      '621': 'Incorporación Fiscal',
      '625': 'Régimen de las Actividades Empresariales (Plataformas)',
      '626': 'Régimen Simplificado de Confianza',
    };
    return labels[regimen] || regimen;
  }

  /**
   * Get label for Impuesto
   */
  private getImpuestoLabel(impuesto: string): string {
    const labels: Record<string, string> = {
      '001': 'ISR',
      '002': 'IVA',
      '003': 'IEPS',
    };
    return labels[impuesto] || impuesto;
  }

  /**
   * Format money amount
   */
  private formatMoney(amount: number): string {
    return amount.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Format date from ISO string
   */
  private formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
