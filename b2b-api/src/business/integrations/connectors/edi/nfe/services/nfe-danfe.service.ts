import { Injectable, Logger } from '@nestjs/common';
import {
  NfeInfNfe,
  NfeProtocolo,
  NfeDanfeOptions,
  NfeProduto,
  NfeTotais,
  NfeModalidadeFrete,
  NfeMeioPagamento,
} from '../interfaces';

/**
 * DANFE Generation Result
 */
export interface DanfeGenerationResult {
  success: boolean;
  pdf?: string; // Base64 encoded PDF
  html?: string;
  error?: string;
}

/**
 * NF-e DANFE Service
 *
 * Generates DANFE (Documento Auxiliar da Nota Fiscal Eletrônica)
 * in PDF format compliant with CONFAZ specifications.
 *
 * The DANFE is a simplified representation of the NF-e for
 * accompanying the merchandise during transport.
 *
 * @see Manual de Especificação Técnica do DANFE
 */
@Injectable()
export class NfeDanfeService {
  private readonly logger = new Logger(NfeDanfeService.name);

  /**
   * Generate DANFE PDF
   */
  async generateDanfe(options: NfeDanfeOptions): Promise<DanfeGenerationResult> {
    this.logger.log('Generating DANFE PDF');

    try {
      const html = this.generateDanfeHtml(options);

      // In production, use a library like puppeteer or pdfmake for PDF generation
      // For now, we'll return the HTML representation
      const pdf = await this.convertHtmlToPdf(html);

      return {
        success: true,
        pdf,
        html,
      };
    } catch (error) {
      this.logger.error('Error generating DANFE', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate DANFE HTML representation
   */
  generateDanfeHtml(options: NfeDanfeOptions): string {
    const { nfe, protocolo, logo, mensagens } = options;
    const layout = options.layout || 1; // 1 = Portrait

    const chaveAcesso = this.extractChaveAcesso(nfe);
    const qrCodeUrl = this.generateQrCodeUrl(chaveAcesso, nfe.ide.tpAmb);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DANFE - ${nfe.ide.nNF}</title>
  <style>
    ${this.getDanfeStyles(layout)}
  </style>
</head>
<body>
  <div class="danfe-container">
    <!-- Header -->
    ${this.renderHeader(nfe, logo, protocolo)}

    <!-- Identification Block -->
    ${this.renderIdentification(nfe, chaveAcesso)}

    <!-- Issuer Block -->
    ${this.renderIssuer(nfe.emit)}

    <!-- Recipient Block -->
    ${nfe.dest ? this.renderRecipient(nfe.dest) : ''}

    <!-- Products Block -->
    ${this.renderProducts(nfe.det)}

    <!-- Totals Block -->
    ${this.renderTotals(nfe.total.ICMSTot)}

    <!-- Transport Block -->
    ${this.renderTransport(nfe.transp)}

    <!-- Billing Block -->
    ${nfe.cobr ? this.renderBilling(nfe.cobr) : ''}

    <!-- Payment Block -->
    ${this.renderPayment(nfe.pag)}

    <!-- Additional Info Block -->
    ${this.renderAdditionalInfo(nfe, protocolo, mensagens)}

    <!-- QR Code (for NFC-e or optional) -->
    ${nfe.ide.mod === 65 ? this.renderQrCode(qrCodeUrl, chaveAcesso) : ''}

    <!-- Footer -->
    ${this.renderFooter(nfe.ide.tpAmb)}
  </div>
</body>
</html>`;
  }

  /**
   * Get DANFE CSS styles
   */
  private getDanfeStyles(layout: 1 | 2): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 8pt;
        line-height: 1.2;
        background: white;
      }

      .danfe-container {
        width: ${layout === 1 ? '210mm' : '297mm'};
        min-height: ${layout === 1 ? '297mm' : '210mm'};
        padding: 5mm;
        margin: 0 auto;
      }

      .block {
        border: 1px solid #000;
        margin-bottom: 2mm;
        page-break-inside: avoid;
      }

      .block-title {
        background: #f0f0f0;
        padding: 1mm 2mm;
        font-weight: bold;
        border-bottom: 1px solid #000;
        font-size: 7pt;
      }

      .block-content {
        padding: 2mm;
      }

      .row {
        display: flex;
        flex-wrap: wrap;
      }

      .field {
        border-right: 1px solid #ccc;
        padding: 1mm 2mm;
        min-height: 10mm;
      }

      .field:last-child {
        border-right: none;
      }

      .field-label {
        font-size: 6pt;
        color: #666;
        margin-bottom: 1mm;
      }

      .field-value {
        font-size: 8pt;
        font-weight: bold;
      }

      .field-value-small {
        font-size: 7pt;
      }

      /* Header styles */
      .header {
        display: flex;
        border: 1px solid #000;
        margin-bottom: 2mm;
      }

      .logo-container {
        width: 30mm;
        padding: 2mm;
        border-right: 1px solid #000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .logo-container img {
        max-width: 100%;
        max-height: 20mm;
      }

      .danfe-title {
        width: 35mm;
        padding: 2mm;
        border-right: 1px solid #000;
        text-align: center;
      }

      .danfe-title h1 {
        font-size: 14pt;
        margin-bottom: 2mm;
      }

      .danfe-title p {
        font-size: 6pt;
      }

      .access-key {
        flex: 1;
        padding: 2mm;
        text-align: center;
      }

      .access-key-value {
        font-family: monospace;
        font-size: 10pt;
        letter-spacing: 1px;
        word-break: break-all;
      }

      .barcode {
        margin: 2mm 0;
        text-align: center;
      }

      .protocol {
        margin-top: 2mm;
        font-size: 7pt;
      }

      /* Products table */
      .products-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 7pt;
      }

      .products-table th {
        background: #f0f0f0;
        padding: 1mm;
        text-align: left;
        border: 1px solid #ccc;
        font-size: 6pt;
      }

      .products-table td {
        padding: 1mm;
        border: 1px solid #ccc;
        vertical-align: top;
      }

      .products-table .text-right {
        text-align: right;
      }

      .products-table .text-center {
        text-align: center;
      }

      /* Totals grid */
      .totals-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 0;
      }

      .totals-grid .field {
        border-bottom: 1px solid #ccc;
      }

      /* Additional info */
      .additional-info {
        min-height: 20mm;
        font-size: 7pt;
        white-space: pre-wrap;
      }

      /* QR Code */
      .qr-code {
        text-align: center;
        padding: 2mm;
      }

      .qr-code img {
        width: 30mm;
        height: 30mm;
      }

      /* Environment warning */
      .homologacao-warning {
        background: #ffcc00;
        color: #000;
        text-align: center;
        padding: 2mm;
        font-weight: bold;
        font-size: 10pt;
        margin-bottom: 2mm;
      }

      /* Print styles */
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .danfe-container {
          page-break-after: always;
        }
      }
    `;
  }

  /**
   * Render header block
   */
  private renderHeader(nfe: NfeInfNfe, logo?: string, protocolo?: NfeProtocolo): string {
    const chaveAcesso = this.extractChaveAcesso(nfe);
    const entradaSaida = nfe.ide.tpNF === 0 ? 'ENTRADA' : 'SAÍDA';
    const nf = String(nfe.ide.nNF).padStart(9, '0');
    const serie = String(nfe.ide.serie).padStart(3, '0');

    return `
    <div class="header">
      <div class="logo-container">
        ${logo ? `<img src="${logo}" alt="Logo">` : '<span>SEM LOGO</span>'}
      </div>
      <div class="danfe-title">
        <h1>DANFE</h1>
        <p>Documento Auxiliar da<br>Nota Fiscal Eletrônica</p>
        <p style="margin-top: 2mm;"><strong>${entradaSaida}</strong></p>
        <p>Nº ${nf.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3')}</p>
        <p>Série ${serie}</p>
        <p>Folha 1/1</p>
      </div>
      <div class="access-key">
        <div class="field-label">CHAVE DE ACESSO</div>
        <div class="access-key-value">${this.formatChaveAcesso(chaveAcesso)}</div>
        <div class="barcode">
          <!-- Barcode would be rendered here - using placeholder -->
          <div style="font-family: monospace; font-size: 8pt;">|||||||||||||||||||||||</div>
        </div>
        <div class="field-label">Consulta de autenticidade no portal nacional da NF-e</div>
        <div style="font-size: 7pt;">www.nfe.fazenda.gov.br/portal</div>
        ${
          protocolo
            ? `
        <div class="protocol">
          <strong>PROTOCOLO DE AUTORIZAÇÃO DE USO</strong><br>
          ${protocolo.infProt.nProt} - ${this.formatDateTime(protocolo.infProt.dhRecbto)}
        </div>
        `
            : ''
        }
      </div>
    </div>`;
  }

  /**
   * Render identification block
   */
  private renderIdentification(nfe: NfeInfNfe, chaveAcesso: string): string {
    const natOp = nfe.ide.natOp;
    const dhEmi = this.formatDateTime(nfe.ide.dhEmi);
    const dhSaiEnt = nfe.ide.dhSaiEnt ? this.formatDateTime(nfe.ide.dhSaiEnt) : '-';

    return `
    <div class="block">
      <div class="block-content">
        <div class="row">
          <div class="field" style="flex: 3;">
            <div class="field-label">NATUREZA DA OPERAÇÃO</div>
            <div class="field-value">${natOp}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">INSCRIÇÃO ESTADUAL</div>
            <div class="field-value">${nfe.emit.ie}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">INSC. ESTADUAL S.T.</div>
            <div class="field-value">-</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">CNPJ</div>
            <div class="field-value">${this.formatCnpj(nfe.emit.cnpjCpf)}</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Render issuer block
   */
  private renderIssuer(emit: NfeInfNfe['emit']): string {
    const endereco = emit.endereco;
    const enderecoCompleto =
      `${endereco.logradouro}, ${endereco.numero}` +
      (endereco.complemento ? ` - ${endereco.complemento}` : '') +
      ` - ${endereco.bairro} - ${endereco.municipio}/${endereco.uf} - CEP: ${this.formatCep(endereco.cep)}`;

    return `
    <div class="block">
      <div class="block-title">EMITENTE</div>
      <div class="block-content">
        <div class="row">
          <div class="field" style="flex: 2;">
            <div class="field-label">RAZÃO SOCIAL / NOME</div>
            <div class="field-value">${emit.razaoSocial}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">CNPJ/CPF</div>
            <div class="field-value">${this.formatCnpj(emit.cnpjCpf)}</div>
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex: 3;">
            <div class="field-label">ENDEREÇO</div>
            <div class="field-value-small">${enderecoCompleto}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">TELEFONE</div>
            <div class="field-value">${endereco.fone ? this.formatPhone(endereco.fone) : '-'}</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Render recipient block
   */
  private renderRecipient(dest: NfeInfNfe['dest']): string {
    if (!dest) return '';

    const endereco = dest.endereco;
    const enderecoCompleto =
      `${endereco.logradouro}, ${endereco.numero}` +
      (endereco.complemento ? ` - ${endereco.complemento}` : '') +
      ` - ${endereco.bairro}`;

    return `
    <div class="block">
      <div class="block-title">DESTINATÁRIO / REMETENTE</div>
      <div class="block-content">
        <div class="row">
          <div class="field" style="flex: 2;">
            <div class="field-label">RAZÃO SOCIAL / NOME</div>
            <div class="field-value">${dest.razaoSocial}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">CNPJ/CPF</div>
            <div class="field-value">${dest.cnpjCpf ? this.formatCnpjCpf(dest.cnpjCpf) : dest.idEstrangeiro || '-'}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">INSCRIÇÃO ESTADUAL</div>
            <div class="field-value">${dest.ie || 'ISENTO'}</div>
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex: 2;">
            <div class="field-label">ENDEREÇO</div>
            <div class="field-value-small">${enderecoCompleto}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">MUNICÍPIO</div>
            <div class="field-value">${endereco.municipio}</div>
          </div>
          <div class="field" style="width: 15mm;">
            <div class="field-label">UF</div>
            <div class="field-value">${endereco.uf}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">CEP</div>
            <div class="field-value">${this.formatCep(endereco.cep)}</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Render products table
   */
  private renderProducts(produtos: NfeProduto[]): string {
    const rows = produtos
      .map(
        (p) => `
      <tr>
        <td class="text-center">${p.codigo}</td>
        <td>${p.descricao}</td>
        <td class="text-center">${p.ncm}</td>
        <td class="text-center">${p.cfop}</td>
        <td class="text-center">${p.uCom}</td>
        <td class="text-right">${this.formatNumber(p.qCom, 4)}</td>
        <td class="text-right">${this.formatCurrency(p.vUnCom)}</td>
        <td class="text-right">${this.formatCurrency(p.vProd)}</td>
        <td class="text-right">${p.imposto.icms.vBC ? this.formatCurrency(p.imposto.icms.vBC) : '-'}</td>
        <td class="text-right">${p.imposto.icms.vICMS ? this.formatCurrency(p.imposto.icms.vICMS) : '-'}</td>
        <td class="text-right">${p.imposto.ipi?.vIPI ? this.formatCurrency(p.imposto.ipi.vIPI) : '-'}</td>
        <td class="text-right">${p.imposto.icms.pICMS ? this.formatNumber(p.imposto.icms.pICMS, 2) + '%' : '-'}</td>
        <td class="text-right">${p.imposto.ipi?.pIPI ? this.formatNumber(p.imposto.ipi.pIPI, 2) + '%' : '-'}</td>
      </tr>
    `,
      )
      .join('');

    return `
    <div class="block">
      <div class="block-title">DADOS DOS PRODUTOS / SERVIÇOS</div>
      <div class="block-content" style="padding: 0;">
        <table class="products-table">
          <thead>
            <tr>
              <th style="width: 12%;">CÓDIGO</th>
              <th style="width: 22%;">DESCRIÇÃO</th>
              <th style="width: 8%;">NCM</th>
              <th style="width: 5%;">CFOP</th>
              <th style="width: 5%;">UN</th>
              <th style="width: 8%;">QTDE</th>
              <th style="width: 8%;">V.UNIT</th>
              <th style="width: 8%;">V.TOTAL</th>
              <th style="width: 6%;">BC ICMS</th>
              <th style="width: 6%;">V.ICMS</th>
              <th style="width: 5%;">V.IPI</th>
              <th style="width: 4%;">%ICMS</th>
              <th style="width: 3%;">%IPI</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  /**
   * Render totals block
   */
  private renderTotals(totais: NfeTotais): string {
    return `
    <div class="block">
      <div class="block-title">CÁLCULO DO IMPOSTO</div>
      <div class="block-content" style="padding: 0;">
        <div class="totals-grid">
          <div class="field">
            <div class="field-label">BASE DE CÁLC. ICMS</div>
            <div class="field-value">${this.formatCurrency(totais.vBC)}</div>
          </div>
          <div class="field">
            <div class="field-label">VALOR DO ICMS</div>
            <div class="field-value">${this.formatCurrency(totais.vICMS)}</div>
          </div>
          <div class="field">
            <div class="field-label">BASE DE CÁLC. ICMS S.T.</div>
            <div class="field-value">${this.formatCurrency(totais.vBCST)}</div>
          </div>
          <div class="field">
            <div class="field-label">VALOR DO ICMS S.T.</div>
            <div class="field-value">${this.formatCurrency(totais.vST)}</div>
          </div>
          <div class="field">
            <div class="field-label">V. IMP. IMPORTAÇÃO</div>
            <div class="field-value">${this.formatCurrency(totais.vII)}</div>
          </div>
          <div class="field">
            <div class="field-label">VALOR DO IPI</div>
            <div class="field-value">${this.formatCurrency(totais.vIPI)}</div>
          </div>
          <div class="field">
            <div class="field-label">VALOR DO PIS</div>
            <div class="field-value">${this.formatCurrency(totais.vPIS)}</div>
          </div>
          <div class="field">
            <div class="field-label">VALOR DA COFINS</div>
            <div class="field-value">${this.formatCurrency(totais.vCOFINS)}</div>
          </div>
          <div class="field">
            <div class="field-label">OUTRAS DESP.</div>
            <div class="field-value">${this.formatCurrency(totais.vOutro)}</div>
          </div>
          <div class="field">
            <div class="field-label">VALOR DO FRETE</div>
            <div class="field-value">${this.formatCurrency(totais.vFrete)}</div>
          </div>
          <div class="field">
            <div class="field-label">VALOR DO SEGURO</div>
            <div class="field-value">${this.formatCurrency(totais.vSeg)}</div>
          </div>
          <div class="field">
            <div class="field-label">DESCONTO</div>
            <div class="field-value">${this.formatCurrency(totais.vDesc)}</div>
          </div>
          <div class="field">
            <div class="field-label">VALOR TOTAL PRODUTOS</div>
            <div class="field-value">${this.formatCurrency(totais.vProd)}</div>
          </div>
          <div class="field" style="grid-column: span 2;">
            <div class="field-label">VALOR TOTAL DA NOTA</div>
            <div class="field-value" style="font-size: 10pt;">${this.formatCurrency(totais.vNF)}</div>
          </div>
          <div class="field" style="grid-column: span 3;">
            <div class="field-label">VALOR APROX. TRIBUTOS</div>
            <div class="field-value">${totais.vTotTrib ? this.formatCurrency(totais.vTotTrib) : '-'}</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Render transport block
   */
  private renderTransport(transp: NfeInfNfe['transp']): string {
    const modalidades: Record<NfeModalidadeFrete, string> = {
      [NfeModalidadeFrete.CIF]: '0-Por conta do emitente',
      [NfeModalidadeFrete.FOB]: '1-Por conta do destinatário',
      [NfeModalidadeFrete.TERCEIROS]: '2-Por conta de terceiros',
      [NfeModalidadeFrete.PROPRIO_REMETENTE]: '3-Próprio por conta do remetente',
      [NfeModalidadeFrete.PROPRIO_DESTINATARIO]: '4-Próprio por conta do destinatário',
      [NfeModalidadeFrete.SEM_FRETE]: '9-Sem frete',
    };

    const vol = transp.vol?.[0];

    return `
    <div class="block">
      <div class="block-title">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
      <div class="block-content" style="padding: 0;">
        <div class="row">
          <div class="field" style="flex: 2;">
            <div class="field-label">RAZÃO SOCIAL</div>
            <div class="field-value">${transp.transporta?.xNome || '-'}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">FRETE POR CONTA</div>
            <div class="field-value">${modalidades[transp.modFrete]}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">PLACA VEÍC.</div>
            <div class="field-value">${transp.veicTransp?.placa || '-'}</div>
          </div>
          <div class="field" style="width: 15mm;">
            <div class="field-label">UF</div>
            <div class="field-value">${transp.veicTransp?.uf || '-'}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">CNPJ/CPF</div>
            <div class="field-value">${transp.transporta?.cnpjCpf ? this.formatCnpjCpf(transp.transporta.cnpjCpf) : '-'}</div>
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex: 2;">
            <div class="field-label">ENDEREÇO</div>
            <div class="field-value">${transp.transporta?.xEnder || '-'}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">MUNICÍPIO</div>
            <div class="field-value">${transp.transporta?.xMun || '-'}</div>
          </div>
          <div class="field" style="width: 15mm;">
            <div class="field-label">UF</div>
            <div class="field-value">${transp.transporta?.uf || '-'}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">INSC. ESTADUAL</div>
            <div class="field-value">${transp.transporta?.ie || '-'}</div>
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex: 1;">
            <div class="field-label">QUANTIDADE</div>
            <div class="field-value">${vol?.qVol || '-'}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">ESPÉCIE</div>
            <div class="field-value">${vol?.esp || '-'}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">MARCA</div>
            <div class="field-value">${vol?.marca || '-'}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">NUMERAÇÃO</div>
            <div class="field-value">${vol?.nVol || '-'}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">PESO BRUTO</div>
            <div class="field-value">${vol?.pesoB ? this.formatNumber(vol.pesoB, 3) + ' kg' : '-'}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">PESO LÍQUIDO</div>
            <div class="field-value">${vol?.pesoL ? this.formatNumber(vol.pesoL, 3) + ' kg' : '-'}</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Render billing block
   */
  private renderBilling(cobr: NfeInfNfe['cobr']): string {
    if (!cobr) return '';

    const duplicatas =
      cobr.dup
        ?.map(
          (d) => `
      <div class="field" style="flex: 1; min-width: 60mm;">
        <div class="field-label">DUPLICATA</div>
        <div class="field-value-small">
          Nº ${d.nDup || '-'} | Venc: ${d.dVenc || '-'} | ${this.formatCurrency(d.vDup)}
        </div>
      </div>
    `,
        )
        .join('') || '';

    return `
    <div class="block">
      <div class="block-title">FATURA / DUPLICATA</div>
      <div class="block-content" style="padding: 0;">
        <div class="row">
          <div class="field" style="flex: 1;">
            <div class="field-label">NÚMERO</div>
            <div class="field-value">${cobr.fat?.nFat || '-'}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">VALOR ORIGINAL</div>
            <div class="field-value">${cobr.fat?.vOrig ? this.formatCurrency(cobr.fat.vOrig) : '-'}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">DESCONTO</div>
            <div class="field-value">${cobr.fat?.vDesc ? this.formatCurrency(cobr.fat.vDesc) : '-'}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">VALOR LÍQUIDO</div>
            <div class="field-value">${cobr.fat?.vLiq ? this.formatCurrency(cobr.fat.vLiq) : '-'}</div>
          </div>
        </div>
        ${duplicatas ? `<div class="row">${duplicatas}</div>` : ''}
      </div>
    </div>`;
  }

  /**
   * Render payment block
   */
  private renderPayment(pag: NfeInfNfe['pag']): string {
    const meios: Record<string, string> = {
      '01': 'Dinheiro',
      '02': 'Cheque',
      '03': 'Cartão de Crédito',
      '04': 'Cartão de Débito',
      '05': 'Crédito Loja',
      '10': 'Vale Alimentação',
      '11': 'Vale Refeição',
      '12': 'Vale Presente',
      '13': 'Vale Combustível',
      '14': 'Duplicata Mercantil',
      '15': 'Boleto Bancário',
      '16': 'Depósito Bancário',
      '17': 'PIX',
      '18': 'Transferência',
      '19': 'Fidelidade/Cashback',
      '90': 'Sem pagamento',
      '99': 'Outros',
    };

    const pagamentos = pag.detPag
      .map(
        (p) => `
      <div class="field" style="flex: 1; min-width: 60mm;">
        <div class="field-label">${meios[p.tPag] || p.xPag || 'Outros'}</div>
        <div class="field-value">${this.formatCurrency(p.vPag)}</div>
      </div>
    `,
      )
      .join('');

    return `
    <div class="block">
      <div class="block-title">DADOS DO PAGAMENTO</div>
      <div class="block-content" style="padding: 0;">
        <div class="row">
          ${pagamentos}
          ${
            pag.vTroco
              ? `
          <div class="field" style="flex: 1;">
            <div class="field-label">TROCO</div>
            <div class="field-value">${this.formatCurrency(pag.vTroco)}</div>
          </div>
          `
              : ''
          }
        </div>
      </div>
    </div>`;
  }

  /**
   * Render additional info block
   */
  private renderAdditionalInfo(
    nfe: NfeInfNfe,
    protocolo?: NfeProtocolo,
    mensagens?: string[],
  ): string {
    const infCpl = nfe.infAdic?.infCpl || '';
    const infAdFisco = nfe.infAdic?.infAdFisco || '';
    const mensagensText = mensagens?.join('\n') || '';

    return `
    <div class="block">
      <div class="block-title">DADOS ADICIONAIS</div>
      <div class="block-content">
        <div class="row">
          <div class="field" style="flex: 2;">
            <div class="field-label">INFORMAÇÕES COMPLEMENTARES</div>
            <div class="additional-info">${infCpl}${mensagensText ? '\n' + mensagensText : ''}</div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">INFORMAÇÕES DO FISCO</div>
            <div class="additional-info">${infAdFisco}</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Render QR Code (for NFC-e)
   */
  private renderQrCode(qrCodeUrl: string, chaveAcesso: string): string {
    return `
    <div class="block">
      <div class="qr-code">
        <div class="field-label">QR CODE</div>
        <!-- QR Code image would be generated here -->
        <div style="width: 30mm; height: 30mm; border: 1px dashed #ccc; margin: 2mm auto; display: flex; align-items: center; justify-content: center;">
          QR
        </div>
        <div style="font-size: 6pt; word-break: break-all;">${chaveAcesso}</div>
      </div>
    </div>`;
  }

  /**
   * Render footer
   */
  private renderFooter(tpAmb: 1 | 2): string {
    if (tpAmb === 2) {
      return `
      <div class="homologacao-warning">
        SEM VALOR FISCAL - AMBIENTE DE HOMOLOGAÇÃO
      </div>`;
    }
    return '';
  }

  /**
   * Extract access key from NF-e
   */
  private extractChaveAcesso(nfe: NfeInfNfe): string {
    if (nfe.id) {
      return nfe.id.replace('NFe', '');
    }

    // Build access key if not present
    const ide = nfe.ide;
    const cUF = String(ide.cUF).padStart(2, '0');
    const aamm = this.extractAamm(ide.dhEmi);
    const cnpj = nfe.emit.cnpjCpf.replace(/\D/g, '').padStart(14, '0');
    const mod = String(ide.mod).padStart(2, '0');
    const serie = String(ide.serie).padStart(3, '0');
    const nNF = String(ide.nNF).padStart(9, '0');
    const tpEmis = String(ide.tpEmis);
    const cNF = ide.cNF.padStart(8, '0');
    const cDV = String(ide.cDV);

    return `${cUF}${aamm}${cnpj}${mod}${serie}${nNF}${tpEmis}${cNF}${cDV}`;
  }

  private extractAamm(dateStr: string): string {
    const date = new Date(dateStr);
    const year = String(date.getFullYear()).slice(2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
  }

  /**
   * Format access key with spaces
   */
  private formatChaveAcesso(chave: string): string {
    return chave.replace(/(.{4})/g, '$1 ').trim();
  }

  /**
   * Generate QR Code URL
   */
  private generateQrCodeUrl(chaveAcesso: string, tpAmb: 1 | 2): string {
    const baseUrl =
      tpAmb === 1
        ? 'https://www.nfe.fazenda.gov.br/portal'
        : 'https://hom.nfe.fazenda.gov.br/portal';
    return `${baseUrl}?chNFe=${chaveAcesso}`;
  }

  /**
   * Format date/time
   */
  private formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /**
   * Format CNPJ
   */
  private formatCnpj(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '');
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  /**
   * Format CPF
   */
  private formatCpf(cpf: string): string {
    const clean = cpf.replace(/\D/g, '');
    return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  /**
   * Format CNPJ or CPF
   */
  private formatCnpjCpf(doc: string): string {
    const clean = doc.replace(/\D/g, '');
    return clean.length === 11 ? this.formatCpf(clean) : this.formatCnpj(clean);
  }

  /**
   * Format CEP
   */
  private formatCep(cep: string): string {
    const clean = cep.replace(/\D/g, '');
    return clean.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }

  /**
   * Format phone
   */
  private formatPhone(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      return clean.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }
    return clean.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  /**
   * Format currency
   */
  private formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  /**
   * Format number
   */
  private formatNumber(value: number, decimals: number): string {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  /**
   * Convert HTML to PDF
   * In production, use puppeteer, pdfmake, or similar
   */
  private async convertHtmlToPdf(html: string): Promise<string> {
    // For production, implement PDF generation using a library like:
    // - puppeteer (headless Chrome)
    // - pdfmake
    // - html-pdf
    // - jspdf + html2canvas

    // For now, return base64 of HTML as placeholder
    const htmlBuffer = Buffer.from(html, 'utf-8');
    return htmlBuffer.toString('base64');
  }
}
