import { Injectable, Logger } from '@nestjs/common';
import {
  NfeInfNfe,
  NfeUf,
  NfeModelo,
  NfeProduto,
  NfeIcms,
  NfePis,
  NfeCofins,
  NfeIpi,
  NfeCobranca,
  NfePagamento,
  NfeTransporte,
  NfeEmitente,
  NfeDestinatario,
  NfeEndereco,
  NfeTotais,
  NfeProtocolo,
  NfeTipoEmissao,
} from '../interfaces';

/**
 * NF-e XML Generator Service
 *
 * Generates NF-e XML documents compliant with layout 4.0 specification.
 * Handles all aspects of XML generation including namespace management,
 * element ordering (critical for SEFAZ validation), and proper formatting.
 *
 * @see Manual de Integração - Contribuinte (versão 4.0.1)
 */
@Injectable()
export class NfeXmlGeneratorService {
  private readonly logger = new Logger(NfeXmlGeneratorService.name);

  private readonly NFE_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe';
  private readonly NFE_VERSION = '4.00';

  /**
   * Generate NF-e XML (infNFe element)
   */
  generateNfe(nfe: NfeInfNfe): string {
    this.logger.debug('Generating NF-e XML');

    const chaveAcesso = this.generateAccessKey(nfe);
    const nfeWithId = { ...nfe, id: `NFe${chaveAcesso}` };

    const xml = this.buildNfeXml(nfeWithId);
    return xml;
  }

  /**
   * Generate the access key (chave de acesso) - 44 digits
   */
  generateAccessKey(nfe: NfeInfNfe): string {
    const ide = nfe.ide;

    // Format: cUF + AAMM + CNPJ + mod + serie + nNF + tpEmis + cNF + cDV
    const cUF = String(ide.cUF).padStart(2, '0');
    const aamm = this.extractAamm(ide.dhEmi);
    const cnpj = nfe.emit.cnpjCpf.replace(/\D/g, '').padStart(14, '0');
    const mod = String(ide.mod).padStart(2, '0');
    const serie = String(ide.serie).padStart(3, '0');
    const nNF = String(ide.nNF).padStart(9, '0');
    const tpEmis = String(ide.tpEmis);
    const cNF = ide.cNF.padStart(8, '0');

    // Calculate check digit
    const chaveBase = `${cUF}${aamm}${cnpj}${mod}${serie}${nNF}${tpEmis}${cNF}`;
    const cDV = this.calculateMod11(chaveBase);

    return `${chaveBase}${cDV}`;
  }

  /**
   * Extract AAMM from date string
   */
  private extractAamm(dateStr: string): string {
    // Format: YYYY-MM-DDTHH:mm:ss-03:00
    const date = new Date(dateStr);
    const year = String(date.getFullYear()).slice(2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
  }

  /**
   * Calculate Mod11 check digit for NF-e access key
   */
  private calculateMod11(value: string): number {
    let soma = 0;
    let peso = 2;

    for (let i = value.length - 1; i >= 0; i--) {
      soma += parseInt(value[i], 10) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }

    const resto = soma % 11;
    const digito = 11 - resto;

    return digito === 0 || digito === 1 || digito >= 11 ? 0 : digito;
  }

  /**
   * Build complete NF-e XML structure
   */
  private buildNfeXml(nfe: NfeInfNfe): string {
    const lines: string[] = [];

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(`<NFe xmlns="${this.NFE_NAMESPACE}">`);
    lines.push(`  <infNFe versao="${this.NFE_VERSION}" Id="${nfe.id}">`);

    // ide - Identification
    lines.push(this.buildIde(nfe));

    // emit - Issuer
    lines.push(this.buildEmit(nfe.emit));

    // dest - Recipient (optional for some cases)
    if (nfe.dest) {
      lines.push(this.buildDest(nfe.dest));
    }

    // autXML - Authorized XML access
    if (nfe.autXML && nfe.autXML.length > 0) {
      for (const aut of nfe.autXML) {
        lines.push('    <autXML>');
        if (aut.cnpj) lines.push(`      <CNPJ>${aut.cnpj}</CNPJ>`);
        if (aut.cpf) lines.push(`      <CPF>${aut.cpf}</CPF>`);
        lines.push('    </autXML>');
      }
    }

    // det - Products/Items
    for (const prod of nfe.det) {
      lines.push(this.buildDet(prod));
    }

    // total - Totals
    lines.push(this.buildTotal(nfe.total));

    // transp - Transport
    lines.push(this.buildTransp(nfe.transp));

    // cobr - Billing (optional)
    if (nfe.cobr) {
      lines.push(this.buildCobr(nfe.cobr));
    }

    // pag - Payment
    lines.push(this.buildPag(nfe.pag));

    // infAdic - Additional Info (optional)
    if (nfe.infAdic) {
      lines.push(this.buildInfAdic(nfe.infAdic));
    }

    // exporta - Export Info (optional)
    if (nfe.exporta) {
      lines.push('    <exporta>');
      lines.push(`      <UFSaidaPais>${nfe.exporta.ufSaidaPais}</UFSaidaPais>`);
      lines.push(`      <xLocExporta>${this.escapeXml(nfe.exporta.xLocExporta)}</xLocExporta>`);
      if (nfe.exporta.xLocDespacho) {
        lines.push(
          `      <xLocDespacho>${this.escapeXml(nfe.exporta.xLocDespacho)}</xLocDespacho>`,
        );
      }
      lines.push('    </exporta>');
    }

    // compra - Purchase Info (optional)
    if (nfe.compra) {
      lines.push('    <compra>');
      if (nfe.compra.xNEmp) lines.push(`      <xNEmp>${this.escapeXml(nfe.compra.xNEmp)}</xNEmp>`);
      if (nfe.compra.xPed) lines.push(`      <xPed>${this.escapeXml(nfe.compra.xPed)}</xPed>`);
      if (nfe.compra.xCont) lines.push(`      <xCont>${this.escapeXml(nfe.compra.xCont)}</xCont>`);
      lines.push('    </compra>');
    }

    // infRespTec - Responsible Technical (optional)
    if (nfe.infRespTec) {
      lines.push(this.buildInfRespTec(nfe.infRespTec));
    }

    // infNFeSupl - Supplement Info for NFC-e (optional)
    if (nfe.infNFeSupl) {
      lines.push('    <infNFeSupl>');
      lines.push(`      <qrCode><![CDATA[${nfe.infNFeSupl.qrCode}]]></qrCode>`);
      lines.push(`      <urlChave>${nfe.infNFeSupl.urlChave}</urlChave>`);
      lines.push('    </infNFeSupl>');
    }

    lines.push('  </infNFe>');
    lines.push('</NFe>');

    return lines.join('\n');
  }

  /**
   * Build ide (Identification) element
   */
  private buildIde(nfe: NfeInfNfe): string {
    const ide = nfe.ide;
    const lines: string[] = [];

    lines.push('    <ide>');
    lines.push(`      <cUF>${ide.cUF}</cUF>`);
    lines.push(`      <cNF>${ide.cNF}</cNF>`);
    lines.push(`      <natOp>${this.escapeXml(ide.natOp)}</natOp>`);
    lines.push(`      <mod>${ide.mod}</mod>`);
    lines.push(`      <serie>${ide.serie}</serie>`);
    lines.push(`      <nNF>${ide.nNF}</nNF>`);
    lines.push(`      <dhEmi>${ide.dhEmi}</dhEmi>`);

    if (ide.dhSaiEnt) {
      lines.push(`      <dhSaiEnt>${ide.dhSaiEnt}</dhSaiEnt>`);
    }

    lines.push(`      <tpNF>${ide.tpNF}</tpNF>`);
    lines.push(`      <idDest>${ide.idDest}</idDest>`);
    lines.push(`      <cMunFG>${ide.cMunFG}</cMunFG>`);
    lines.push(`      <tpImp>${ide.tpImp}</tpImp>`);
    lines.push(`      <tpEmis>${ide.tpEmis}</tpEmis>`);
    lines.push(`      <cDV>${ide.cDV}</cDV>`);
    lines.push(`      <tpAmb>${ide.tpAmb}</tpAmb>`);
    lines.push(`      <finNFe>${ide.finNFe}</finNFe>`);
    lines.push(`      <indFinal>${ide.indFinal}</indFinal>`);
    lines.push(`      <indPres>${ide.indPres}</indPres>`);
    lines.push(`      <procEmi>${ide.procEmi}</procEmi>`);
    lines.push(`      <verProc>${ide.verProc}</verProc>`);

    // Contingency fields
    if (ide.dhCont) {
      lines.push(`      <dhCont>${ide.dhCont}</dhCont>`);
      lines.push(`      <xJust>${this.escapeXml(ide.xJust || '')}</xJust>`);
    }

    // Referenced NFes
    if (ide.NFref && ide.NFref.length > 0) {
      for (const ref of ide.NFref) {
        lines.push('      <NFref>');
        if (ref.refNFe) {
          lines.push(`        <refNFe>${ref.refNFe}</refNFe>`);
        }
        if (ref.refNF) {
          lines.push('        <refNF>');
          lines.push(`          <cUF>${ref.refNF.cUF}</cUF>`);
          lines.push(`          <AAMM>${ref.refNF.aamm}</AAMM>`);
          lines.push(`          <CNPJ>${ref.refNF.cnpj}</CNPJ>`);
          lines.push(`          <mod>${ref.refNF.mod}</mod>`);
          lines.push(`          <serie>${ref.refNF.serie}</serie>`);
          lines.push(`          <nNF>${ref.refNF.nNF}</nNF>`);
          lines.push('        </refNF>');
        }
        if (ref.refCTe) {
          lines.push(`        <refCTe>${ref.refCTe}</refCTe>`);
        }
        lines.push('      </NFref>');
      }
    }

    lines.push('    </ide>');
    return lines.join('\n');
  }

  /**
   * Build emit (Issuer) element
   */
  private buildEmit(emit: NfeEmitente): string {
    const lines: string[] = [];

    lines.push('    <emit>');

    if (emit.cnpjCpf.length === 14 || emit.cnpjCpf.length > 11) {
      lines.push(`      <CNPJ>${emit.cnpjCpf.replace(/\D/g, '')}</CNPJ>`);
    } else {
      lines.push(`      <CPF>${emit.cnpjCpf.replace(/\D/g, '')}</CPF>`);
    }

    lines.push(`      <xNome>${this.escapeXml(emit.razaoSocial)}</xNome>`);

    if (emit.nomeFantasia) {
      lines.push(`      <xFant>${this.escapeXml(emit.nomeFantasia)}</xFant>`);
    }

    lines.push(this.buildEnderEmit(emit.endereco));
    lines.push(`      <IE>${emit.ie}</IE>`);

    if (emit.im) {
      lines.push(`      <IM>${emit.im}</IM>`);
    }

    if (emit.cnae) {
      lines.push(`      <CNAE>${emit.cnae}</CNAE>`);
    }

    lines.push(`      <CRT>${emit.crt}</CRT>`);
    lines.push('    </emit>');

    return lines.join('\n');
  }

  /**
   * Build enderEmit (Issuer Address) element
   */
  private buildEnderEmit(end: NfeEndereco): string {
    const lines: string[] = [];

    lines.push('      <enderEmit>');
    lines.push(`        <xLgr>${this.escapeXml(end.logradouro)}</xLgr>`);
    lines.push(`        <nro>${this.escapeXml(end.numero)}</nro>`);

    if (end.complemento) {
      lines.push(`        <xCpl>${this.escapeXml(end.complemento)}</xCpl>`);
    }

    lines.push(`        <xBairro>${this.escapeXml(end.bairro)}</xBairro>`);
    lines.push(`        <cMun>${end.codigoMunicipio}</cMun>`);
    lines.push(`        <xMun>${this.escapeXml(end.municipio)}</xMun>`);
    lines.push(`        <UF>${end.uf}</UF>`);
    lines.push(`        <CEP>${end.cep.replace(/\D/g, '')}</CEP>`);
    lines.push(`        <cPais>${end.codigoPais || '1058'}</cPais>`);
    lines.push(`        <xPais>${this.escapeXml(end.pais || 'Brasil')}</xPais>`);

    if (end.fone) {
      lines.push(`        <fone>${end.fone.replace(/\D/g, '')}</fone>`);
    }

    lines.push('      </enderEmit>');

    return lines.join('\n');
  }

  /**
   * Build dest (Recipient) element
   */
  private buildDest(dest: NfeDestinatario): string {
    const lines: string[] = [];

    lines.push('    <dest>');

    if (dest.cnpjCpf) {
      const doc = dest.cnpjCpf.replace(/\D/g, '');
      if (doc.length === 14) {
        lines.push(`      <CNPJ>${doc}</CNPJ>`);
      } else if (doc.length === 11) {
        lines.push(`      <CPF>${doc}</CPF>`);
      }
    } else if (dest.idEstrangeiro) {
      lines.push(`      <idEstrangeiro>${dest.idEstrangeiro}</idEstrangeiro>`);
    }

    lines.push(`      <xNome>${this.escapeXml(dest.razaoSocial)}</xNome>`);
    lines.push(this.buildEnderDest(dest.endereco));
    lines.push(`      <indIEDest>${dest.indIEDest}</indIEDest>`);

    if (dest.ie && dest.indIEDest === 1) {
      lines.push(`      <IE>${dest.ie}</IE>`);
    }

    if (dest.isuf) {
      lines.push(`      <ISUF>${dest.isuf}</ISUF>`);
    }

    if (dest.email) {
      lines.push(`      <email>${dest.email}</email>`);
    }

    lines.push('    </dest>');

    return lines.join('\n');
  }

  /**
   * Build enderDest (Recipient Address) element
   */
  private buildEnderDest(end: NfeEndereco): string {
    const lines: string[] = [];

    lines.push('      <enderDest>');
    lines.push(`        <xLgr>${this.escapeXml(end.logradouro)}</xLgr>`);
    lines.push(`        <nro>${this.escapeXml(end.numero)}</nro>`);

    if (end.complemento) {
      lines.push(`        <xCpl>${this.escapeXml(end.complemento)}</xCpl>`);
    }

    lines.push(`        <xBairro>${this.escapeXml(end.bairro)}</xBairro>`);
    lines.push(`        <cMun>${end.codigoMunicipio}</cMun>`);
    lines.push(`        <xMun>${this.escapeXml(end.municipio)}</xMun>`);
    lines.push(`        <UF>${end.uf}</UF>`);
    lines.push(`        <CEP>${end.cep.replace(/\D/g, '')}</CEP>`);
    lines.push(`        <cPais>${end.codigoPais || '1058'}</cPais>`);
    lines.push(`        <xPais>${this.escapeXml(end.pais || 'Brasil')}</xPais>`);

    if (end.fone) {
      lines.push(`        <fone>${end.fone.replace(/\D/g, '')}</fone>`);
    }

    lines.push('      </enderDest>');

    return lines.join('\n');
  }

  /**
   * Build det (Product/Item) element
   */
  private buildDet(prod: NfeProduto): string {
    const lines: string[] = [];

    lines.push(`    <det nItem="${prod.nItem}">`);
    lines.push('      <prod>');
    lines.push(`        <cProd>${this.escapeXml(prod.codigo)}</cProd>`);
    lines.push(`        <cEAN>${prod.cEAN || 'SEM GTIN'}</cEAN>`);
    lines.push(`        <xProd>${this.escapeXml(prod.descricao)}</xProd>`);
    lines.push(`        <NCM>${prod.ncm}</NCM>`);

    if (prod.nve && prod.nve.length > 0) {
      for (const nve of prod.nve) {
        lines.push(`        <NVE>${nve}</NVE>`);
      }
    }

    if (prod.cest) {
      lines.push(`        <CEST>${prod.cest}</CEST>`);
    }

    lines.push(`        <CFOP>${prod.cfop}</CFOP>`);
    lines.push(`        <uCom>${this.escapeXml(prod.uCom)}</uCom>`);
    lines.push(`        <qCom>${this.formatDecimal(prod.qCom, 4)}</qCom>`);
    lines.push(`        <vUnCom>${this.formatDecimal(prod.vUnCom, 10)}</vUnCom>`);
    lines.push(`        <vProd>${this.formatDecimal(prod.vProd, 2)}</vProd>`);
    lines.push(`        <cEANTrib>${prod.cEANTrib || 'SEM GTIN'}</cEANTrib>`);
    lines.push(`        <uTrib>${this.escapeXml(prod.uTrib)}</uTrib>`);
    lines.push(`        <qTrib>${this.formatDecimal(prod.qTrib, 4)}</qTrib>`);
    lines.push(`        <vUnTrib>${this.formatDecimal(prod.vUnTrib, 10)}</vUnTrib>`);

    if (prod.vFrete !== undefined && prod.vFrete > 0) {
      lines.push(`        <vFrete>${this.formatDecimal(prod.vFrete, 2)}</vFrete>`);
    }

    if (prod.vSeg !== undefined && prod.vSeg > 0) {
      lines.push(`        <vSeg>${this.formatDecimal(prod.vSeg, 2)}</vSeg>`);
    }

    if (prod.vDesc !== undefined && prod.vDesc > 0) {
      lines.push(`        <vDesc>${this.formatDecimal(prod.vDesc, 2)}</vDesc>`);
    }

    if (prod.vOutro !== undefined && prod.vOutro > 0) {
      lines.push(`        <vOutro>${this.formatDecimal(prod.vOutro, 2)}</vOutro>`);
    }

    lines.push(`        <indTot>${prod.indTot}</indTot>`);

    if (prod.infAdProd) {
      lines.push(`        <infAdProd>${this.escapeXml(prod.infAdProd)}</infAdProd>`);
    }

    lines.push('      </prod>');

    // Taxes
    lines.push(this.buildImposto(prod.imposto));

    lines.push('    </det>');

    return lines.join('\n');
  }

  /**
   * Build imposto (Tax) element
   */
  private buildImposto(imposto: NfeProduto['imposto']): string {
    const lines: string[] = [];

    lines.push('      <imposto>');

    if (imposto.vTotTrib !== undefined) {
      lines.push(`        <vTotTrib>${this.formatDecimal(imposto.vTotTrib, 2)}</vTotTrib>`);
    }

    // ICMS
    lines.push(this.buildIcms(imposto.icms));

    // IPI (optional)
    if (imposto.ipi) {
      lines.push(this.buildIpi(imposto.ipi));
    }

    // PIS
    lines.push(this.buildPis(imposto.pis));

    // COFINS
    lines.push(this.buildCofins(imposto.cofins));

    // II (optional)
    if (imposto.ii) {
      lines.push('        <II>');
      lines.push(`          <vBC>${this.formatDecimal(imposto.ii.vBC, 2)}</vBC>`);
      lines.push(`          <vDespAdu>${this.formatDecimal(imposto.ii.vDespAdu, 2)}</vDespAdu>`);
      lines.push(`          <vII>${this.formatDecimal(imposto.ii.vII, 2)}</vII>`);
      lines.push(`          <vIOF>${this.formatDecimal(imposto.ii.vIOF, 2)}</vIOF>`);
      lines.push('        </II>');
    }

    lines.push('      </imposto>');

    return lines.join('\n');
  }

  /**
   * Build ICMS element (handles multiple CST/CSOSN variations)
   */
  private buildIcms(icms: NfeIcms): string {
    const lines: string[] = [];

    lines.push('        <ICMS>');

    // Determine the ICMS group based on CST/CSOSN
    if (icms.csosn) {
      // Simples Nacional
      lines.push(this.buildIcmsSimples(icms));
    } else if (icms.cst) {
      // Regime Normal
      lines.push(this.buildIcmsNormal(icms));
    }

    lines.push('        </ICMS>');

    return lines.join('\n');
  }

  /**
   * Build ICMS for Simples Nacional (CSOSN)
   */
  private buildIcmsSimples(icms: NfeIcms): string {
    const lines: string[] = [];
    const csosn = icms.csosn;

    switch (csosn) {
      case '101':
        lines.push('          <ICMSSN101>');
        lines.push(`            <orig>${icms.orig}</orig>`);
        lines.push(`            <CSOSN>${csosn}</CSOSN>`);
        lines.push(`            <pCredSN>${this.formatDecimal(icms.pCredSN || 0, 4)}</pCredSN>`);
        lines.push(
          `            <vCredICMSSN>${this.formatDecimal(icms.vCredICMSSN || 0, 2)}</vCredICMSSN>`,
        );
        lines.push('          </ICMSSN101>');
        break;

      case '102':
      case '103':
      case '300':
      case '400':
        lines.push('          <ICMSSN102>');
        lines.push(`            <orig>${icms.orig}</orig>`);
        lines.push(`            <CSOSN>${csosn}</CSOSN>`);
        lines.push('          </ICMSSN102>');
        break;

      case '201':
        lines.push('          <ICMSSN201>');
        lines.push(`            <orig>${icms.orig}</orig>`);
        lines.push(`            <CSOSN>${csosn}</CSOSN>`);
        lines.push(`            <modBCST>${icms.modBCST || 0}</modBCST>`);
        if (icms.pMVAST !== undefined) {
          lines.push(`            <pMVAST>${this.formatDecimal(icms.pMVAST, 4)}</pMVAST>`);
        }
        if (icms.pRedBCST !== undefined) {
          lines.push(`            <pRedBCST>${this.formatDecimal(icms.pRedBCST, 4)}</pRedBCST>`);
        }
        lines.push(`            <vBCST>${this.formatDecimal(icms.vBCST || 0, 2)}</vBCST>`);
        lines.push(`            <pICMSST>${this.formatDecimal(icms.pICMSST || 0, 4)}</pICMSST>`);
        lines.push(`            <vICMSST>${this.formatDecimal(icms.vICMSST || 0, 2)}</vICMSST>`);
        lines.push(`            <pCredSN>${this.formatDecimal(icms.pCredSN || 0, 4)}</pCredSN>`);
        lines.push(
          `            <vCredICMSSN>${this.formatDecimal(icms.vCredICMSSN || 0, 2)}</vCredICMSSN>`,
        );
        lines.push('          </ICMSSN201>');
        break;

      case '202':
      case '203':
        lines.push('          <ICMSSN202>');
        lines.push(`            <orig>${icms.orig}</orig>`);
        lines.push(`            <CSOSN>${csosn}</CSOSN>`);
        lines.push(`            <modBCST>${icms.modBCST || 0}</modBCST>`);
        if (icms.pMVAST !== undefined) {
          lines.push(`            <pMVAST>${this.formatDecimal(icms.pMVAST, 4)}</pMVAST>`);
        }
        if (icms.pRedBCST !== undefined) {
          lines.push(`            <pRedBCST>${this.formatDecimal(icms.pRedBCST, 4)}</pRedBCST>`);
        }
        lines.push(`            <vBCST>${this.formatDecimal(icms.vBCST || 0, 2)}</vBCST>`);
        lines.push(`            <pICMSST>${this.formatDecimal(icms.pICMSST || 0, 4)}</pICMSST>`);
        lines.push(`            <vICMSST>${this.formatDecimal(icms.vICMSST || 0, 2)}</vICMSST>`);
        lines.push('          </ICMSSN202>');
        break;

      case '500':
        lines.push('          <ICMSSN500>');
        lines.push(`            <orig>${icms.orig}</orig>`);
        lines.push(`            <CSOSN>${csosn}</CSOSN>`);
        if (icms.vBCSTRet !== undefined) {
          lines.push(
            `            <vBCSTRet>${this.formatDecimal(icms.vBCSTRet || 0, 2)}</vBCSTRet>`,
          );
        }
        if (icms.pST !== undefined) {
          lines.push(`            <pST>${this.formatDecimal(icms.pST || 0, 4)}</pST>`);
        }
        if (icms.vICMSSTRet !== undefined) {
          lines.push(
            `            <vICMSSTRet>${this.formatDecimal(icms.vICMSSTRet || 0, 2)}</vICMSSTRet>`,
          );
        }
        lines.push('          </ICMSSN500>');
        break;

      case '900':
      default:
        lines.push('          <ICMSSN900>');
        lines.push(`            <orig>${icms.orig}</orig>`);
        lines.push(`            <CSOSN>${csosn || '900'}</CSOSN>`);
        if (icms.modBC !== undefined) {
          lines.push(`            <modBC>${icms.modBC}</modBC>`);
          lines.push(`            <vBC>${this.formatDecimal(icms.vBC || 0, 2)}</vBC>`);
          if (icms.pRedBC !== undefined) {
            lines.push(`            <pRedBC>${this.formatDecimal(icms.pRedBC, 4)}</pRedBC>`);
          }
          lines.push(`            <pICMS>${this.formatDecimal(icms.pICMS || 0, 4)}</pICMS>`);
          lines.push(`            <vICMS>${this.formatDecimal(icms.vICMS || 0, 2)}</vICMS>`);
        }
        if (icms.modBCST !== undefined) {
          lines.push(`            <modBCST>${icms.modBCST}</modBCST>`);
          if (icms.pMVAST !== undefined) {
            lines.push(`            <pMVAST>${this.formatDecimal(icms.pMVAST, 4)}</pMVAST>`);
          }
          if (icms.pRedBCST !== undefined) {
            lines.push(`            <pRedBCST>${this.formatDecimal(icms.pRedBCST, 4)}</pRedBCST>`);
          }
          lines.push(`            <vBCST>${this.formatDecimal(icms.vBCST || 0, 2)}</vBCST>`);
          lines.push(`            <pICMSST>${this.formatDecimal(icms.pICMSST || 0, 4)}</pICMSST>`);
          lines.push(`            <vICMSST>${this.formatDecimal(icms.vICMSST || 0, 2)}</vICMSST>`);
        }
        if (icms.pCredSN !== undefined) {
          lines.push(`            <pCredSN>${this.formatDecimal(icms.pCredSN, 4)}</pCredSN>`);
          lines.push(
            `            <vCredICMSSN>${this.formatDecimal(icms.vCredICMSSN || 0, 2)}</vCredICMSSN>`,
          );
        }
        lines.push('          </ICMSSN900>');
        break;
    }

    return lines.join('\n');
  }

  /**
   * Build ICMS for Regime Normal (CST)
   */
  private buildIcmsNormal(icms: NfeIcms): string {
    const lines: string[] = [];
    const cst = icms.cst;

    switch (cst) {
      case '00':
        lines.push('          <ICMS00>');
        lines.push(`            <orig>${icms.orig}</orig>`);
        lines.push(`            <CST>${cst}</CST>`);
        lines.push(`            <modBC>${icms.modBC || 0}</modBC>`);
        lines.push(`            <vBC>${this.formatDecimal(icms.vBC || 0, 2)}</vBC>`);
        lines.push(`            <pICMS>${this.formatDecimal(icms.pICMS || 0, 4)}</pICMS>`);
        lines.push(`            <vICMS>${this.formatDecimal(icms.vICMS || 0, 2)}</vICMS>`);
        if (icms.pFCP !== undefined && icms.pFCP > 0) {
          lines.push(`            <vBCFCP>${this.formatDecimal(icms.vBCFCP || 0, 2)}</vBCFCP>`);
          lines.push(`            <pFCP>${this.formatDecimal(icms.pFCP, 4)}</pFCP>`);
          lines.push(`            <vFCP>${this.formatDecimal(icms.vFCP || 0, 2)}</vFCP>`);
        }
        lines.push('          </ICMS00>');
        break;

      case '10':
        lines.push('          <ICMS10>');
        lines.push(`            <orig>${icms.orig}</orig>`);
        lines.push(`            <CST>${cst}</CST>`);
        lines.push(`            <modBC>${icms.modBC || 0}</modBC>`);
        lines.push(`            <vBC>${this.formatDecimal(icms.vBC || 0, 2)}</vBC>`);
        lines.push(`            <pICMS>${this.formatDecimal(icms.pICMS || 0, 4)}</pICMS>`);
        lines.push(`            <vICMS>${this.formatDecimal(icms.vICMS || 0, 2)}</vICMS>`);
        if (icms.vBCFCP !== undefined) {
          lines.push(`            <vBCFCP>${this.formatDecimal(icms.vBCFCP, 2)}</vBCFCP>`);
          lines.push(`            <pFCP>${this.formatDecimal(icms.pFCP || 0, 4)}</pFCP>`);
          lines.push(`            <vFCP>${this.formatDecimal(icms.vFCP || 0, 2)}</vFCP>`);
        }
        lines.push(`            <modBCST>${icms.modBCST || 0}</modBCST>`);
        if (icms.pMVAST !== undefined) {
          lines.push(`            <pMVAST>${this.formatDecimal(icms.pMVAST, 4)}</pMVAST>`);
        }
        if (icms.pRedBCST !== undefined) {
          lines.push(`            <pRedBCST>${this.formatDecimal(icms.pRedBCST, 4)}</pRedBCST>`);
        }
        lines.push(`            <vBCST>${this.formatDecimal(icms.vBCST || 0, 2)}</vBCST>`);
        lines.push(`            <pICMSST>${this.formatDecimal(icms.pICMSST || 0, 4)}</pICMSST>`);
        lines.push(`            <vICMSST>${this.formatDecimal(icms.vICMSST || 0, 2)}</vICMSST>`);
        if (icms.vBCFCPST !== undefined) {
          lines.push(`            <vBCFCPST>${this.formatDecimal(icms.vBCFCPST, 2)}</vBCFCPST>`);
          lines.push(`            <pFCPST>${this.formatDecimal(icms.pFCPST || 0, 4)}</pFCPST>`);
          lines.push(`            <vFCPST>${this.formatDecimal(icms.vFCPST || 0, 2)}</vFCPST>`);
        }
        lines.push('          </ICMS10>');
        break;

      case '20':
        lines.push('          <ICMS20>');
        lines.push(`            <orig>${icms.orig}</orig>`);
        lines.push(`            <CST>${cst}</CST>`);
        lines.push(`            <modBC>${icms.modBC || 0}</modBC>`);
        lines.push(`            <pRedBC>${this.formatDecimal(icms.pRedBC || 0, 4)}</pRedBC>`);
        lines.push(`            <vBC>${this.formatDecimal(icms.vBC || 0, 2)}</vBC>`);
        lines.push(`            <pICMS>${this.formatDecimal(icms.pICMS || 0, 4)}</pICMS>`);
        lines.push(`            <vICMS>${this.formatDecimal(icms.vICMS || 0, 2)}</vICMS>`);
        if (icms.vBCFCP !== undefined) {
          lines.push(`            <vBCFCP>${this.formatDecimal(icms.vBCFCP, 2)}</vBCFCP>`);
          lines.push(`            <pFCP>${this.formatDecimal(icms.pFCP || 0, 4)}</pFCP>`);
          lines.push(`            <vFCP>${this.formatDecimal(icms.vFCP || 0, 2)}</vFCP>`);
        }
        lines.push('          </ICMS20>');
        break;

      case '30':
        lines.push('          <ICMS30>');
        lines.push(`            <orig>${icms.orig}</orig>`);
        lines.push(`            <CST>${cst}</CST>`);
        lines.push(`            <modBCST>${icms.modBCST || 0}</modBCST>`);
        if (icms.pMVAST !== undefined) {
          lines.push(`            <pMVAST>${this.formatDecimal(icms.pMVAST, 4)}</pMVAST>`);
        }
        if (icms.pRedBCST !== undefined) {
          lines.push(`            <pRedBCST>${this.formatDecimal(icms.pRedBCST, 4)}</pRedBCST>`);
        }
        lines.push(`            <vBCST>${this.formatDecimal(icms.vBCST || 0, 2)}</vBCST>`);
        lines.push(`            <pICMSST>${this.formatDecimal(icms.pICMSST || 0, 4)}</pICMSST>`);
        lines.push(`            <vICMSST>${this.formatDecimal(icms.vICMSST || 0, 2)}</vICMSST>`);
        if (icms.vBCFCPST !== undefined) {
          lines.push(`            <vBCFCPST>${this.formatDecimal(icms.vBCFCPST, 2)}</vBCFCPST>`);
          lines.push(`            <pFCPST>${this.formatDecimal(icms.pFCPST || 0, 4)}</pFCPST>`);
          lines.push(`            <vFCPST>${this.formatDecimal(icms.vFCPST || 0, 2)}</vFCPST>`);
        }
        lines.push('          </ICMS30>');
        break;

      case '40':
      case '41':
      case '50':
        lines.push('          <ICMS40>');
        lines.push(`            <orig>${icms.orig}</orig>`);
        lines.push(`            <CST>${cst}</CST>`);
        lines.push('          </ICMS40>');
        break;

      case '51':
        lines.push('          <ICMS51>');
        lines.push(`            <orig>${icms.orig}</orig>`);
        lines.push(`            <CST>${cst}</CST>`);
        if (icms.modBC !== undefined) {
          lines.push(`            <modBC>${icms.modBC}</modBC>`);
        }
        if (icms.pRedBC !== undefined) {
          lines.push(`            <pRedBC>${this.formatDecimal(icms.pRedBC, 4)}</pRedBC>`);
        }
        if (icms.vBC !== undefined) {
          lines.push(`            <vBC>${this.formatDecimal(icms.vBC, 2)}</vBC>`);
        }
        if (icms.pICMS !== undefined) {
          lines.push(`            <pICMS>${this.formatDecimal(icms.pICMS, 4)}</pICMS>`);
        }
        if (icms.vICMSOp !== undefined) {
          lines.push(`            <vICMSOp>${this.formatDecimal(icms.vICMSOp, 2)}</vICMSOp>`);
        }
        if (icms.pDif !== undefined) {
          lines.push(`            <pDif>${this.formatDecimal(icms.pDif, 4)}</pDif>`);
        }
        if (icms.vICMSDif !== undefined) {
          lines.push(`            <vICMSDif>${this.formatDecimal(icms.vICMSDif, 2)}</vICMSDif>`);
        }
        if (icms.vICMS !== undefined) {
          lines.push(`            <vICMS>${this.formatDecimal(icms.vICMS, 2)}</vICMS>`);
        }
        lines.push('          </ICMS51>');
        break;

      case '60':
        lines.push('          <ICMS60>');
        lines.push(`            <orig>${icms.orig}</orig>`);
        lines.push(`            <CST>${cst}</CST>`);
        if (icms.vBCSTRet !== undefined) {
          lines.push(`            <vBCSTRet>${this.formatDecimal(icms.vBCSTRet, 2)}</vBCSTRet>`);
        }
        if (icms.pST !== undefined) {
          lines.push(`            <pST>${this.formatDecimal(icms.pST, 4)}</pST>`);
        }
        if (icms.vICMSSTRet !== undefined) {
          lines.push(
            `            <vICMSSTRet>${this.formatDecimal(icms.vICMSSTRet, 2)}</vICMSSTRet>`,
          );
        }
        lines.push('          </ICMS60>');
        break;

      case '70':
        lines.push('          <ICMS70>');
        lines.push(`            <orig>${icms.orig}</orig>`);
        lines.push(`            <CST>${cst}</CST>`);
        lines.push(`            <modBC>${icms.modBC || 0}</modBC>`);
        lines.push(`            <pRedBC>${this.formatDecimal(icms.pRedBC || 0, 4)}</pRedBC>`);
        lines.push(`            <vBC>${this.formatDecimal(icms.vBC || 0, 2)}</vBC>`);
        lines.push(`            <pICMS>${this.formatDecimal(icms.pICMS || 0, 4)}</pICMS>`);
        lines.push(`            <vICMS>${this.formatDecimal(icms.vICMS || 0, 2)}</vICMS>`);
        if (icms.vBCFCP !== undefined) {
          lines.push(`            <vBCFCP>${this.formatDecimal(icms.vBCFCP, 2)}</vBCFCP>`);
          lines.push(`            <pFCP>${this.formatDecimal(icms.pFCP || 0, 4)}</pFCP>`);
          lines.push(`            <vFCP>${this.formatDecimal(icms.vFCP || 0, 2)}</vFCP>`);
        }
        lines.push(`            <modBCST>${icms.modBCST || 0}</modBCST>`);
        if (icms.pMVAST !== undefined) {
          lines.push(`            <pMVAST>${this.formatDecimal(icms.pMVAST, 4)}</pMVAST>`);
        }
        if (icms.pRedBCST !== undefined) {
          lines.push(`            <pRedBCST>${this.formatDecimal(icms.pRedBCST, 4)}</pRedBCST>`);
        }
        lines.push(`            <vBCST>${this.formatDecimal(icms.vBCST || 0, 2)}</vBCST>`);
        lines.push(`            <pICMSST>${this.formatDecimal(icms.pICMSST || 0, 4)}</pICMSST>`);
        lines.push(`            <vICMSST>${this.formatDecimal(icms.vICMSST || 0, 2)}</vICMSST>`);
        if (icms.vBCFCPST !== undefined) {
          lines.push(`            <vBCFCPST>${this.formatDecimal(icms.vBCFCPST, 2)}</vBCFCPST>`);
          lines.push(`            <pFCPST>${this.formatDecimal(icms.pFCPST || 0, 4)}</pFCPST>`);
          lines.push(`            <vFCPST>${this.formatDecimal(icms.vFCPST || 0, 2)}</vFCPST>`);
        }
        lines.push('          </ICMS70>');
        break;

      case '90':
      default:
        lines.push('          <ICMS90>');
        lines.push(`            <orig>${icms.orig}</orig>`);
        lines.push(`            <CST>${cst || '90'}</CST>`);
        if (icms.modBC !== undefined) {
          lines.push(`            <modBC>${icms.modBC}</modBC>`);
          lines.push(`            <vBC>${this.formatDecimal(icms.vBC || 0, 2)}</vBC>`);
          if (icms.pRedBC !== undefined) {
            lines.push(`            <pRedBC>${this.formatDecimal(icms.pRedBC, 4)}</pRedBC>`);
          }
          lines.push(`            <pICMS>${this.formatDecimal(icms.pICMS || 0, 4)}</pICMS>`);
          lines.push(`            <vICMS>${this.formatDecimal(icms.vICMS || 0, 2)}</vICMS>`);
        }
        if (icms.modBCST !== undefined) {
          lines.push(`            <modBCST>${icms.modBCST}</modBCST>`);
          if (icms.pMVAST !== undefined) {
            lines.push(`            <pMVAST>${this.formatDecimal(icms.pMVAST, 4)}</pMVAST>`);
          }
          if (icms.pRedBCST !== undefined) {
            lines.push(`            <pRedBCST>${this.formatDecimal(icms.pRedBCST, 4)}</pRedBCST>`);
          }
          lines.push(`            <vBCST>${this.formatDecimal(icms.vBCST || 0, 2)}</vBCST>`);
          lines.push(`            <pICMSST>${this.formatDecimal(icms.pICMSST || 0, 4)}</pICMSST>`);
          lines.push(`            <vICMSST>${this.formatDecimal(icms.vICMSST || 0, 2)}</vICMSST>`);
        }
        lines.push('          </ICMS90>');
        break;
    }

    return lines.join('\n');
  }

  /**
   * Build IPI element
   */
  private buildIpi(ipi: NfeIpi): string {
    const lines: string[] = [];

    lines.push('        <IPI>');
    lines.push(`          <cEnq>${ipi.cEnq}</cEnq>`);

    // Determine if taxed or not based on CST
    const notTaxedCst = ['01', '02', '03', '04', '05', '51', '52', '53', '54', '55'];

    if (notTaxedCst.includes(ipi.cst)) {
      lines.push('          <IPINT>');
      lines.push(`            <CST>${ipi.cst}</CST>`);
      lines.push('          </IPINT>');
    } else {
      lines.push('          <IPITrib>');
      lines.push(`            <CST>${ipi.cst}</CST>`);

      if (ipi.vBC !== undefined && ipi.pIPI !== undefined) {
        lines.push(`            <vBC>${this.formatDecimal(ipi.vBC, 2)}</vBC>`);
        lines.push(`            <pIPI>${this.formatDecimal(ipi.pIPI, 4)}</pIPI>`);
      } else if (ipi.qUnid !== undefined && ipi.vUnid !== undefined) {
        lines.push(`            <qUnid>${this.formatDecimal(ipi.qUnid, 4)}</qUnid>`);
        lines.push(`            <vUnid>${this.formatDecimal(ipi.vUnid, 4)}</vUnid>`);
      }

      lines.push(`            <vIPI>${this.formatDecimal(ipi.vIPI || 0, 2)}</vIPI>`);
      lines.push('          </IPITrib>');
    }

    lines.push('        </IPI>');

    return lines.join('\n');
  }

  /**
   * Build PIS element
   */
  private buildPis(pis: NfePis): string {
    const lines: string[] = [];

    lines.push('        <PIS>');

    const notTaxedCst = ['04', '05', '06', '07', '08', '09'];

    if (notTaxedCst.includes(pis.cst)) {
      lines.push('          <PISNT>');
      lines.push(`            <CST>${pis.cst}</CST>`);
      lines.push('          </PISNT>');
    } else if (pis.cst === '01' || pis.cst === '02') {
      lines.push('          <PISAliq>');
      lines.push(`            <CST>${pis.cst}</CST>`);
      lines.push(`            <vBC>${this.formatDecimal(pis.vBC || 0, 2)}</vBC>`);
      lines.push(`            <pPIS>${this.formatDecimal(pis.pPIS || 0, 4)}</pPIS>`);
      lines.push(`            <vPIS>${this.formatDecimal(pis.vPIS || 0, 2)}</vPIS>`);
      lines.push('          </PISAliq>');
    } else if (pis.cst === '03') {
      lines.push('          <PISQtde>');
      lines.push(`            <CST>${pis.cst}</CST>`);
      lines.push(`            <qBCProd>${this.formatDecimal(pis.qBCProd || 0, 4)}</qBCProd>`);
      lines.push(`            <vAliqProd>${this.formatDecimal(pis.vAliqProd || 0, 4)}</vAliqProd>`);
      lines.push(`            <vPIS>${this.formatDecimal(pis.vPIS || 0, 2)}</vPIS>`);
      lines.push('          </PISQtde>');
    } else {
      lines.push('          <PISOutr>');
      lines.push(`            <CST>${pis.cst}</CST>`);
      if (pis.vBC !== undefined && pis.pPIS !== undefined) {
        lines.push(`            <vBC>${this.formatDecimal(pis.vBC, 2)}</vBC>`);
        lines.push(`            <pPIS>${this.formatDecimal(pis.pPIS, 4)}</pPIS>`);
      } else if (pis.qBCProd !== undefined && pis.vAliqProd !== undefined) {
        lines.push(`            <qBCProd>${this.formatDecimal(pis.qBCProd, 4)}</qBCProd>`);
        lines.push(`            <vAliqProd>${this.formatDecimal(pis.vAliqProd, 4)}</vAliqProd>`);
      }
      lines.push(`            <vPIS>${this.formatDecimal(pis.vPIS || 0, 2)}</vPIS>`);
      lines.push('          </PISOutr>');
    }

    lines.push('        </PIS>');

    return lines.join('\n');
  }

  /**
   * Build COFINS element
   */
  private buildCofins(cofins: NfeCofins): string {
    const lines: string[] = [];

    lines.push('        <COFINS>');

    const notTaxedCst = ['04', '05', '06', '07', '08', '09'];

    if (notTaxedCst.includes(cofins.cst)) {
      lines.push('          <COFINSNT>');
      lines.push(`            <CST>${cofins.cst}</CST>`);
      lines.push('          </COFINSNT>');
    } else if (cofins.cst === '01' || cofins.cst === '02') {
      lines.push('          <COFINSAliq>');
      lines.push(`            <CST>${cofins.cst}</CST>`);
      lines.push(`            <vBC>${this.formatDecimal(cofins.vBC || 0, 2)}</vBC>`);
      lines.push(`            <pCOFINS>${this.formatDecimal(cofins.pCOFINS || 0, 4)}</pCOFINS>`);
      lines.push(`            <vCOFINS>${this.formatDecimal(cofins.vCOFINS || 0, 2)}</vCOFINS>`);
      lines.push('          </COFINSAliq>');
    } else if (cofins.cst === '03') {
      lines.push('          <COFINSQtde>');
      lines.push(`            <CST>${cofins.cst}</CST>`);
      lines.push(`            <qBCProd>${this.formatDecimal(cofins.qBCProd || 0, 4)}</qBCProd>`);
      lines.push(
        `            <vAliqProd>${this.formatDecimal(cofins.vAliqProd || 0, 4)}</vAliqProd>`,
      );
      lines.push(`            <vCOFINS>${this.formatDecimal(cofins.vCOFINS || 0, 2)}</vCOFINS>`);
      lines.push('          </COFINSQtde>');
    } else {
      lines.push('          <COFINSOutr>');
      lines.push(`            <CST>${cofins.cst}</CST>`);
      if (cofins.vBC !== undefined && cofins.pCOFINS !== undefined) {
        lines.push(`            <vBC>${this.formatDecimal(cofins.vBC, 2)}</vBC>`);
        lines.push(`            <pCOFINS>${this.formatDecimal(cofins.pCOFINS, 4)}</pCOFINS>`);
      } else if (cofins.qBCProd !== undefined && cofins.vAliqProd !== undefined) {
        lines.push(`            <qBCProd>${this.formatDecimal(cofins.qBCProd, 4)}</qBCProd>`);
        lines.push(`            <vAliqProd>${this.formatDecimal(cofins.vAliqProd, 4)}</vAliqProd>`);
      }
      lines.push(`            <vCOFINS>${this.formatDecimal(cofins.vCOFINS || 0, 2)}</vCOFINS>`);
      lines.push('          </COFINSOutr>');
    }

    lines.push('        </COFINS>');

    return lines.join('\n');
  }

  /**
   * Build total element
   */
  private buildTotal(total: NfeInfNfe['total']): string {
    const lines: string[] = [];
    const t = total.ICMSTot;

    lines.push('    <total>');
    lines.push('      <ICMSTot>');
    lines.push(`        <vBC>${this.formatDecimal(t.vBC, 2)}</vBC>`);
    lines.push(`        <vICMS>${this.formatDecimal(t.vICMS, 2)}</vICMS>`);
    lines.push(`        <vICMSDeson>${this.formatDecimal(t.vICMSDeson, 2)}</vICMSDeson>`);

    if (t.vFCPUFDest !== undefined) {
      lines.push(`        <vFCPUFDest>${this.formatDecimal(t.vFCPUFDest, 2)}</vFCPUFDest>`);
    }
    if (t.vICMSUFDest !== undefined) {
      lines.push(`        <vICMSUFDest>${this.formatDecimal(t.vICMSUFDest, 2)}</vICMSUFDest>`);
    }
    if (t.vICMSUFRemet !== undefined) {
      lines.push(`        <vICMSUFRemet>${this.formatDecimal(t.vICMSUFRemet, 2)}</vICMSUFRemet>`);
    }

    lines.push(`        <vFCP>${this.formatDecimal(t.vFCP, 2)}</vFCP>`);
    lines.push(`        <vBCST>${this.formatDecimal(t.vBCST, 2)}</vBCST>`);
    lines.push(`        <vST>${this.formatDecimal(t.vST, 2)}</vST>`);
    lines.push(`        <vFCPST>${this.formatDecimal(t.vFCPST, 2)}</vFCPST>`);
    lines.push(`        <vFCPSTRet>${this.formatDecimal(t.vFCPSTRet, 2)}</vFCPSTRet>`);
    lines.push(`        <vProd>${this.formatDecimal(t.vProd, 2)}</vProd>`);
    lines.push(`        <vFrete>${this.formatDecimal(t.vFrete, 2)}</vFrete>`);
    lines.push(`        <vSeg>${this.formatDecimal(t.vSeg, 2)}</vSeg>`);
    lines.push(`        <vDesc>${this.formatDecimal(t.vDesc, 2)}</vDesc>`);
    lines.push(`        <vII>${this.formatDecimal(t.vII, 2)}</vII>`);
    lines.push(`        <vIPI>${this.formatDecimal(t.vIPI, 2)}</vIPI>`);
    lines.push(`        <vIPIDevol>${this.formatDecimal(t.vIPIDevol, 2)}</vIPIDevol>`);
    lines.push(`        <vPIS>${this.formatDecimal(t.vPIS, 2)}</vPIS>`);
    lines.push(`        <vCOFINS>${this.formatDecimal(t.vCOFINS, 2)}</vCOFINS>`);
    lines.push(`        <vOutro>${this.formatDecimal(t.vOutro, 2)}</vOutro>`);
    lines.push(`        <vNF>${this.formatDecimal(t.vNF, 2)}</vNF>`);

    if (t.vTotTrib !== undefined) {
      lines.push(`        <vTotTrib>${this.formatDecimal(t.vTotTrib, 2)}</vTotTrib>`);
    }

    lines.push('      </ICMSTot>');
    lines.push('    </total>');

    return lines.join('\n');
  }

  /**
   * Build transp (Transport) element
   */
  private buildTransp(transp: NfeTransporte): string {
    const lines: string[] = [];

    lines.push('    <transp>');
    lines.push(`      <modFrete>${transp.modFrete}</modFrete>`);

    if (transp.transporta) {
      const t = transp.transporta;
      lines.push('      <transporta>');
      if (t.cnpjCpf) {
        const doc = t.cnpjCpf.replace(/\D/g, '');
        if (doc.length === 14) {
          lines.push(`        <CNPJ>${doc}</CNPJ>`);
        } else {
          lines.push(`        <CPF>${doc}</CPF>`);
        }
      }
      if (t.xNome) lines.push(`        <xNome>${this.escapeXml(t.xNome)}</xNome>`);
      if (t.ie) lines.push(`        <IE>${t.ie}</IE>`);
      if (t.xEnder) lines.push(`        <xEnder>${this.escapeXml(t.xEnder)}</xEnder>`);
      if (t.xMun) lines.push(`        <xMun>${this.escapeXml(t.xMun)}</xMun>`);
      if (t.uf) lines.push(`        <UF>${t.uf}</UF>`);
      lines.push('      </transporta>');
    }

    if (transp.veicTransp) {
      lines.push('      <veicTransp>');
      lines.push(`        <placa>${transp.veicTransp.placa}</placa>`);
      lines.push(`        <UF>${transp.veicTransp.uf}</UF>`);
      if (transp.veicTransp.rntc) {
        lines.push(`        <RNTC>${transp.veicTransp.rntc}</RNTC>`);
      }
      lines.push('      </veicTransp>');
    }

    if (transp.vol && transp.vol.length > 0) {
      for (const vol of transp.vol) {
        lines.push('      <vol>');
        if (vol.qVol !== undefined) lines.push(`        <qVol>${vol.qVol}</qVol>`);
        if (vol.esp) lines.push(`        <esp>${this.escapeXml(vol.esp)}</esp>`);
        if (vol.marca) lines.push(`        <marca>${this.escapeXml(vol.marca)}</marca>`);
        if (vol.nVol) lines.push(`        <nVol>${vol.nVol}</nVol>`);
        if (vol.pesoL !== undefined) {
          lines.push(`        <pesoL>${this.formatDecimal(vol.pesoL, 3)}</pesoL>`);
        }
        if (vol.pesoB !== undefined) {
          lines.push(`        <pesoB>${this.formatDecimal(vol.pesoB, 3)}</pesoB>`);
        }
        if (vol.lacres && vol.lacres.length > 0) {
          for (const lacre of vol.lacres) {
            lines.push('        <lacres>');
            lines.push(`          <nLacre>${lacre.nLacre}</nLacre>`);
            lines.push('        </lacres>');
          }
        }
        lines.push('      </vol>');
      }
    }

    lines.push('    </transp>');

    return lines.join('\n');
  }

  /**
   * Build cobr (Billing) element
   */
  private buildCobr(cobr: NfeCobranca): string {
    const lines: string[] = [];

    lines.push('    <cobr>');

    if (cobr.fat) {
      lines.push('      <fat>');
      if (cobr.fat.nFat) lines.push(`        <nFat>${cobr.fat.nFat}</nFat>`);
      if (cobr.fat.vOrig !== undefined) {
        lines.push(`        <vOrig>${this.formatDecimal(cobr.fat.vOrig, 2)}</vOrig>`);
      }
      if (cobr.fat.vDesc !== undefined) {
        lines.push(`        <vDesc>${this.formatDecimal(cobr.fat.vDesc, 2)}</vDesc>`);
      }
      if (cobr.fat.vLiq !== undefined) {
        lines.push(`        <vLiq>${this.formatDecimal(cobr.fat.vLiq, 2)}</vLiq>`);
      }
      lines.push('      </fat>');
    }

    if (cobr.dup && cobr.dup.length > 0) {
      for (const dup of cobr.dup) {
        lines.push('      <dup>');
        if (dup.nDup) lines.push(`        <nDup>${dup.nDup}</nDup>`);
        if (dup.dVenc) lines.push(`        <dVenc>${dup.dVenc}</dVenc>`);
        lines.push(`        <vDup>${this.formatDecimal(dup.vDup, 2)}</vDup>`);
        lines.push('      </dup>');
      }
    }

    lines.push('    </cobr>');

    return lines.join('\n');
  }

  /**
   * Build pag (Payment) element
   */
  private buildPag(pag: NfePagamento): string {
    const lines: string[] = [];

    lines.push('    <pag>');

    for (const det of pag.detPag) {
      lines.push('      <detPag>');
      if (det.indPag !== undefined) {
        lines.push(`        <indPag>${det.indPag}</indPag>`);
      }
      lines.push(`        <tPag>${det.tPag}</tPag>`);
      if (det.xPag) {
        lines.push(`        <xPag>${this.escapeXml(det.xPag)}</xPag>`);
      }
      lines.push(`        <vPag>${this.formatDecimal(det.vPag, 2)}</vPag>`);

      if (det.card) {
        lines.push('        <card>');
        lines.push(`          <tpIntegra>${det.card.tpIntegra}</tpIntegra>`);
        if (det.card.cnpj) lines.push(`          <CNPJ>${det.card.cnpj}</CNPJ>`);
        if (det.card.tBand) lines.push(`          <tBand>${det.card.tBand}</tBand>`);
        if (det.card.cAut) lines.push(`          <cAut>${det.card.cAut}</cAut>`);
        lines.push('        </card>');
      }

      lines.push('      </detPag>');
    }

    if (pag.vTroco !== undefined && pag.vTroco > 0) {
      lines.push(`      <vTroco>${this.formatDecimal(pag.vTroco, 2)}</vTroco>`);
    }

    lines.push('    </pag>');

    return lines.join('\n');
  }

  /**
   * Build infAdic (Additional Info) element
   */
  private buildInfAdic(infAdic: NfeInfNfe['infAdic']): string {
    if (!infAdic) return '';

    const lines: string[] = [];

    lines.push('    <infAdic>');

    if (infAdic.infAdFisco) {
      lines.push(`      <infAdFisco>${this.escapeXml(infAdic.infAdFisco)}</infAdFisco>`);
    }

    if (infAdic.infCpl) {
      lines.push(`      <infCpl>${this.escapeXml(infAdic.infCpl)}</infCpl>`);
    }

    lines.push('    </infAdic>');

    return lines.join('\n');
  }

  /**
   * Build infRespTec (Responsible Technical) element
   */
  private buildInfRespTec(infRespTec: NfeInfNfe['infRespTec']): string {
    if (!infRespTec) return '';

    const lines: string[] = [];

    lines.push('    <infRespTec>');
    lines.push(`      <CNPJ>${infRespTec.cnpj}</CNPJ>`);
    lines.push(`      <xContato>${this.escapeXml(infRespTec.xContato)}</xContato>`);
    lines.push(`      <email>${infRespTec.email}</email>`);
    lines.push(`      <fone>${infRespTec.fone.replace(/\D/g, '')}</fone>`);

    if (infRespTec.idCSRT) {
      lines.push(`      <idCSRT>${infRespTec.idCSRT}</idCSRT>`);
      lines.push(`      <hashCSRT>${infRespTec.hashCSRT}</hashCSRT>`);
    }

    lines.push('    </infRespTec>');

    return lines.join('\n');
  }

  /**
   * Generate nfeProc XML (authorized NF-e with protocol)
   */
  generateNfeProc(signedXml: string, protocolo: NfeProtocolo): string {
    const lines: string[] = [];

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(`<nfeProc xmlns="${this.NFE_NAMESPACE}" versao="${this.NFE_VERSION}">`);

    // Remove XML declaration from signed XML and add it
    const nfeContent = signedXml.replace(/<\?xml[^?]*\?>\s*/, '');
    lines.push(nfeContent);

    // Add protocol
    lines.push(`  <protNFe versao="${this.NFE_VERSION}">`);
    lines.push('    <infProt>');
    lines.push(`      <tpAmb>${protocolo.infProt.tpAmb}</tpAmb>`);
    lines.push(`      <verAplic>${protocolo.infProt.verAplic}</verAplic>`);
    lines.push(`      <chNFe>${protocolo.infProt.chNFe}</chNFe>`);
    lines.push(`      <dhRecbto>${protocolo.infProt.dhRecbto}</dhRecbto>`);
    lines.push(`      <nProt>${protocolo.infProt.nProt}</nProt>`);
    if (protocolo.infProt.digVal) {
      lines.push(`      <digVal>${protocolo.infProt.digVal}</digVal>`);
    }
    lines.push(`      <cStat>${protocolo.infProt.cStat}</cStat>`);
    lines.push(`      <xMotivo>${this.escapeXml(protocolo.infProt.xMotivo)}</xMotivo>`);
    lines.push('    </infProt>');
    lines.push('  </protNFe>');
    lines.push('</nfeProc>');

    return lines.join('\n');
  }

  /**
   * Generate event XML
   */
  generateEvento(
    chNFe: string,
    tpEvento: string,
    nSeqEvento: number,
    detEvento: { descEvento: string; nProt?: string; xJust?: string; xCorrecao?: string },
    cnpj: string,
    tpAmb: 1 | 2,
  ): string {
    const cOrgao = parseInt(chNFe.substring(0, 2), 10);
    const dhEvento = new Date().toISOString().replace('Z', '-03:00');
    const id = `ID${tpEvento}${chNFe}${String(nSeqEvento).padStart(2, '0')}`;

    const lines: string[] = [];

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(`<evento xmlns="${this.NFE_NAMESPACE}" versao="1.00">`);
    lines.push(`  <infEvento Id="${id}">`);
    lines.push(`    <cOrgao>${cOrgao}</cOrgao>`);
    lines.push(`    <tpAmb>${tpAmb}</tpAmb>`);
    lines.push(`    <CNPJ>${cnpj}</CNPJ>`);
    lines.push(`    <chNFe>${chNFe}</chNFe>`);
    lines.push(`    <dhEvento>${dhEvento}</dhEvento>`);
    lines.push(`    <tpEvento>${tpEvento}</tpEvento>`);
    lines.push(`    <nSeqEvento>${nSeqEvento}</nSeqEvento>`);
    lines.push('    <verEvento>1.00</verEvento>');
    lines.push('    <detEvento versao="1.00">');
    lines.push(`      <descEvento>${detEvento.descEvento}</descEvento>`);

    if (detEvento.nProt) {
      lines.push(`      <nProt>${detEvento.nProt}</nProt>`);
    }
    if (detEvento.xJust) {
      lines.push(`      <xJust>${this.escapeXml(detEvento.xJust)}</xJust>`);
    }
    if (detEvento.xCorrecao) {
      lines.push(`      <xCorrecao>${this.escapeXml(detEvento.xCorrecao)}</xCorrecao>`);
      lines.push(
        '      <xCondUso>A Carta de Correção é disciplinada pelo § 1º-A do art. 7º do Convênio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularização de erro ocorrido na emissão de documento fiscal, desde que o erro não esteja relacionado com: I - as variáveis que determinam o valor do imposto tais como: base de cálculo, alíquota, diferença de preço, quantidade, valor da operação ou da prestação; II - a correção de dados cadastrais que implique mudança do remetente ou do destinatário; III - a data de emissão ou de saída.</xCondUso>',
      );
    }

    lines.push('    </detEvento>');
    lines.push('  </infEvento>');
    lines.push('</evento>');

    return lines.join('\n');
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Format decimal number with specified precision
   */
  private formatDecimal(value: number, precision: number): string {
    return value.toFixed(precision);
  }
}
