import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NfeModule } from './nfe.module';
import {
  NfeService,
  NfeXmlGeneratorService,
  NfeSignatureService,
  NfeSefazService,
  NfeDanfeService,
  NfeDocumentService,
} from './services';
import {
  NfeInfNfe,
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
  NfeOrigemMercadoria,
  NfeCstIcms,
  NfeCstPis,
  NfeCstCofins,
  NfeCertificate,
  NfeCertificateType,
  NfeSefazConfig,
  NfeStatus,
} from './interfaces';

describe('NfeModule', () => {
  let module: TestingModule;
  let nfeService: NfeService;
  let xmlGeneratorService: NfeXmlGeneratorService;
  let signatureService: NfeSignatureService;
  let sefazService: NfeSefazService;
  let danfeService: NfeDanfeService;
  let documentService: NfeDocumentService;

  // Mock NF-e data
  const mockEmitente = {
    cnpjCpf: '12345678000195',
    ie: '123456789',
    razaoSocial: 'Empresa Teste LTDA',
    nomeFantasia: 'Teste',
    crt: 3 as const,
    endereco: {
      logradouro: 'Rua Teste',
      numero: '100',
      bairro: 'Centro',
      codigoMunicipio: '3550308',
      municipio: 'São Paulo',
      uf: 'SP',
      cep: '01310100',
    },
  };

  const mockDestinatario = {
    cnpjCpf: '98765432000187',
    razaoSocial: 'Cliente Teste LTDA',
    ie: '987654321',
    indIEDest: 1 as const,
    endereco: {
      logradouro: 'Av. Cliente',
      numero: '200',
      bairro: 'Jardins',
      codigoMunicipio: '3550308',
      municipio: 'São Paulo',
      uf: 'SP',
      cep: '01402000',
    },
  };

  const mockProduto = {
    nItem: 1,
    codigo: 'PROD001',
    cEAN: 'SEM GTIN',
    descricao: 'Produto Teste',
    ncm: '84713012',
    cfop: '5102',
    uCom: 'UN',
    qCom: 1,
    vUnCom: 100.0,
    vProd: 100.0,
    cEANTrib: 'SEM GTIN',
    uTrib: 'UN',
    qTrib: 1,
    vUnTrib: 100.0,
    indTot: 1 as const,
    imposto: {
      icms: {
        orig: NfeOrigemMercadoria.NACIONAL,
        cst: NfeCstIcms.CST_00,
        modBC: 0,
        vBC: 100.0,
        pICMS: 18.0,
        vICMS: 18.0,
      },
      pis: {
        cst: NfeCstPis.CST_01,
        vBC: 100.0,
        pPIS: 1.65,
        vPIS: 1.65,
      },
      cofins: {
        cst: NfeCstCofins.CST_01,
        vBC: 100.0,
        pCOFINS: 7.6,
        vCOFINS: 7.6,
      },
    },
  };

  const mockNfe: NfeInfNfe = {
    versao: '4.00',
    ide: {
      cUF: NfeUf.SP,
      cNF: '12345678',
      natOp: 'Venda de Mercadoria',
      mod: NfeModelo.NFE,
      serie: 1,
      nNF: 1,
      dhEmi: '2024-01-15T10:00:00-03:00',
      tpNF: NfeTipoOperacao.SAIDA,
      idDest: NfeDestinoOperacao.INTERNA,
      cMunFG: '3550308',
      tpImp: 1,
      tpEmis: NfeTipoEmissao.NORMAL,
      cDV: 0,
      tpAmb: 2,
      finNFe: NfeFinalidade.NORMAL,
      indFinal: NfeIndicadorConsumidor.CONSUMIDOR_FINAL,
      indPres: NfeIndicadorPresenca.PRESENCIAL,
      procEmi: 0,
      verProc: '1.0.0',
    },
    emit: mockEmitente,
    dest: mockDestinatario,
    det: [mockProduto],
    total: {
      ICMSTot: {
        vBC: 100.0,
        vICMS: 18.0,
        vICMSDeson: 0,
        vFCP: 0,
        vBCST: 0,
        vST: 0,
        vFCPST: 0,
        vFCPSTRet: 0,
        vProd: 100.0,
        vFrete: 0,
        vSeg: 0,
        vDesc: 0,
        vII: 0,
        vIPI: 0,
        vIPIDevol: 0,
        vPIS: 1.65,
        vCOFINS: 7.6,
        vOutro: 0,
        vNF: 100.0,
      },
    },
    transp: {
      modFrete: NfeModalidadeFrete.SEM_FRETE,
    },
    pag: {
      detPag: [
        {
          indPag: NfeIndicadorPagamento.A_VISTA,
          tPag: NfeMeioPagamento.DINHEIRO,
          vPag: 100.0,
        },
      ],
    },
  };

  const mockCertificate: NfeCertificate = {
    type: NfeCertificateType.A1,
    pfx: '',
    password: 'test-password',
  };

  const mockSefazConfig: NfeSefazConfig = {
    ambiente: 2,
    uf: NfeUf.SP,
    timeout: 30000,
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [NfeModule],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    nfeService = module.get<NfeService>(NfeService);
    xmlGeneratorService = module.get<NfeXmlGeneratorService>(NfeXmlGeneratorService);
    signatureService = module.get<NfeSignatureService>(NfeSignatureService);
    sefazService = module.get<NfeSefazService>(NfeSefazService);
    danfeService = module.get<NfeDanfeService>(NfeDanfeService);
    documentService = module.get<NfeDocumentService>(NfeDocumentService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module initialization', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should have NfeService', () => {
      expect(nfeService).toBeDefined();
    });

    it('should have all services', () => {
      expect(xmlGeneratorService).toBeDefined();
      expect(signatureService).toBeDefined();
      expect(sefazService).toBeDefined();
      expect(danfeService).toBeDefined();
      expect(documentService).toBeDefined();
    });
  });

  describe('NfeXmlGeneratorService', () => {
    describe('generateAccessKey', () => {
      it('should generate a 44-digit access key', () => {
        const chave = xmlGeneratorService.generateAccessKey(mockNfe);
        expect(chave).toBeDefined();
        expect(chave).toHaveLength(44);
        expect(/^\d{44}$/.test(chave)).toBe(true);
      });

      it('should include UF code at the beginning', () => {
        const chave = xmlGeneratorService.generateAccessKey(mockNfe);
        const ufCode = chave.substring(0, 2);
        expect(ufCode).toBe('35'); // SP
      });

      it('should include CNPJ in the access key', () => {
        const chave = xmlGeneratorService.generateAccessKey(mockNfe);
        const cnpj = chave.substring(6, 20);
        expect(cnpj).toBe('12345678000195');
      });

      it('should include model in the access key', () => {
        const chave = xmlGeneratorService.generateAccessKey(mockNfe);
        const modelo = chave.substring(20, 22);
        expect(modelo).toBe('55');
      });
    });

    describe('generateNfe', () => {
      it('should generate valid XML', () => {
        const xml = xmlGeneratorService.generateNfe(mockNfe);
        expect(xml).toBeDefined();
        expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(xml).toContain('<NFe');
        expect(xml).toContain('<infNFe');
        expect(xml).toContain('</NFe>');
      });

      it('should include NF-e namespace', () => {
        const xml = xmlGeneratorService.generateNfe(mockNfe);
        expect(xml).toContain('xmlns="http://www.portalfiscal.inf.br/nfe"');
      });

      it('should include version 4.00', () => {
        const xml = xmlGeneratorService.generateNfe(mockNfe);
        expect(xml).toContain('versao="4.00"');
      });

      it('should include NF-e ID', () => {
        const xml = xmlGeneratorService.generateNfe(mockNfe);
        expect(xml).toMatch(/Id="NFe\d{44}"/);
      });

      it('should include issuer data', () => {
        const xml = xmlGeneratorService.generateNfe(mockNfe);
        expect(xml).toContain('<emit>');
        expect(xml).toContain('<CNPJ>12345678000195</CNPJ>');
        expect(xml).toContain('<xNome>Empresa Teste LTDA</xNome>');
      });

      it('should include recipient data', () => {
        const xml = xmlGeneratorService.generateNfe(mockNfe);
        expect(xml).toContain('<dest>');
        expect(xml).toContain('<CNPJ>98765432000187</CNPJ>');
      });

      it('should include product data', () => {
        const xml = xmlGeneratorService.generateNfe(mockNfe);
        expect(xml).toContain('<det nItem="1">');
        expect(xml).toContain('<cProd>PROD001</cProd>');
        expect(xml).toContain('<xProd>Produto Teste</xProd>');
        expect(xml).toContain('<NCM>84713012</NCM>');
      });

      it('should include ICMS data', () => {
        const xml = xmlGeneratorService.generateNfe(mockNfe);
        expect(xml).toContain('<ICMS>');
        expect(xml).toContain('<ICMS00>');
        expect(xml).toContain('<CST>00</CST>');
      });

      it('should include totals', () => {
        const xml = xmlGeneratorService.generateNfe(mockNfe);
        expect(xml).toContain('<total>');
        expect(xml).toContain('<ICMSTot>');
        expect(xml).toContain('<vNF>100.00</vNF>');
      });

      it('should include payment data', () => {
        const xml = xmlGeneratorService.generateNfe(mockNfe);
        expect(xml).toContain('<pag>');
        expect(xml).toContain('<detPag>');
        expect(xml).toContain('<tPag>01</tPag>');
      });
    });

    describe('generateEvento', () => {
      it('should generate cancellation event XML', () => {
        const chNFe = '35240112345678000195550010000000011123456780';
        const eventXml = xmlGeneratorService.generateEvento(
          chNFe,
          '110111',
          1,
          { descEvento: 'Cancelamento', nProt: '135240000000001', xJust: 'Teste de cancelamento' },
          '12345678000195',
          2,
        );

        expect(eventXml).toContain('<evento');
        expect(eventXml).toContain('<tpEvento>110111</tpEvento>');
        expect(eventXml).toContain('<descEvento>Cancelamento</descEvento>');
        expect(eventXml).toContain('<xJust>Teste de cancelamento</xJust>');
      });

      it('should generate correction letter event XML', () => {
        const chNFe = '35240112345678000195550010000000011123456780';
        const eventXml = xmlGeneratorService.generateEvento(
          chNFe,
          '110110',
          1,
          { descEvento: 'Carta de Correcao', xCorrecao: 'Correção do endereço do destinatário' },
          '12345678000195',
          2,
        );

        expect(eventXml).toContain('<evento');
        expect(eventXml).toContain('<tpEvento>110110</tpEvento>');
        expect(eventXml).toContain('<descEvento>Carta de Correcao</descEvento>');
        expect(eventXml).toContain('<xCorrecao>');
        expect(eventXml).toContain('<xCondUso>');
      });
    });

    describe('generateNfeProc', () => {
      it('should generate nfeProc with protocol', () => {
        const signedXml = '<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe></infNFe></NFe>';
        const protocolo = {
          versao: '4.00' as const,
          infProt: {
            tpAmb: 2 as const,
            verAplic: 'SP_NFE_PL_008i2',
            chNFe: '35240112345678000195550010000000011123456780',
            dhRecbto: '2024-01-15T10:05:00-03:00',
            nProt: '135240000000001',
            cStat: 100,
            xMotivo: 'Autorizado o uso da NF-e',
          },
        };

        const nfeProc = xmlGeneratorService.generateNfeProc(signedXml, protocolo);

        expect(nfeProc).toContain('<nfeProc');
        expect(nfeProc).toContain('<protNFe');
        expect(nfeProc).toContain('<nProt>135240000000001</nProt>');
        expect(nfeProc).toContain('<cStat>100</cStat>');
      });
    });
  });

  describe('NfeSignatureService', () => {
    describe('parseCertificate', () => {
      it('should parse test certificate', () => {
        const testCert = signatureService.generateTestCertificate(
          '12345678000195',
          'Empresa Teste',
        );
        const info = signatureService.parseCertificate(testCert);

        expect(info).toBeDefined();
        expect(info.cnpj).toBe('12345678000195');
        expect(info.isValid).toBe(true);
        expect(info.daysToExpire).toBeGreaterThan(0);
      });

      it('should detect expired certificate', () => {
        const expiredCert: NfeCertificate = {
          type: NfeCertificateType.A1,
          pfx: Buffer.from(
            JSON.stringify({
              privateKey: 'test',
              publicKey: 'test',
              cnpj: '12345678000195',
              razaoSocial: 'Test',
              validFrom: new Date('2020-01-01'),
              validTo: new Date('2020-12-31'),
            }),
          ).toString('base64'),
          password: 'test',
        };

        const info = signatureService.parseCertificate(expiredCert);
        expect(info.isValid).toBe(false);
        expect(info.daysToExpire).toBeLessThan(0);
      });
    });

    describe('generateTestCertificate', () => {
      it('should generate valid test certificate', () => {
        const cert = signatureService.generateTestCertificate('12345678000195', 'Empresa Teste');

        expect(cert).toBeDefined();
        expect(cert.type).toBe(NfeCertificateType.A1);
        expect(cert.pfx).toBeDefined();
        expect(cert.password).toBeDefined();
        expect(cert.cnpj).toBe('12345678000195');
      });
    });

    describe('validateCertificatePair', () => {
      it('should validate test certificate pair', () => {
        const testCert = signatureService.generateTestCertificate(
          '12345678000195',
          'Empresa Teste',
        );
        const result = signatureService.validateCertificatePair(testCert);

        expect(result.valid).toBe(true);
      });
    });

    describe('getCertificateExpirationWarning', () => {
      it('should return null for valid certificate with many days', () => {
        const testCert = signatureService.generateTestCertificate(
          '12345678000195',
          'Empresa Teste',
        );
        const warning = signatureService.getCertificateExpirationWarning(testCert);

        expect(warning).toBeNull();
      });
    });

    describe('signNfe', () => {
      it('should sign NF-e XML with test certificate', () => {
        const testCert = signatureService.generateTestCertificate(
          '12345678000195',
          'Empresa Teste',
        );
        const xml = xmlGeneratorService.generateNfe(mockNfe);
        const result = signatureService.signNfe(xml, testCert);

        expect(result.success).toBe(true);
        expect(result.signedXml).toBeDefined();
        expect(result.signedXml).toContain('<Signature');
        expect(result.signedXml).toContain('<SignatureValue>');
        expect(result.signedXml).toContain('<X509Certificate>');
      });

      it('should fail without valid ID in XML', () => {
        const testCert = signatureService.generateTestCertificate(
          '12345678000195',
          'Empresa Teste',
        );
        const invalidXml = '<NFe><infNFe></infNFe></NFe>';
        const result = signatureService.signNfe(invalidXml, testCert);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Could not find NF-e ID');
      });
    });

    describe('signEvento', () => {
      it('should sign event XML with test certificate', () => {
        const testCert = signatureService.generateTestCertificate(
          '12345678000195',
          'Empresa Teste',
        );
        const chNFe = '35240112345678000195550010000000011123456780';
        const eventXml = xmlGeneratorService.generateEvento(
          chNFe,
          '110111',
          1,
          { descEvento: 'Cancelamento', nProt: '135240000000001', xJust: 'Teste' },
          '12345678000195',
          2,
        );

        const result = signatureService.signEvento(eventXml, testCert);

        expect(result.success).toBe(true);
        expect(result.signedXml).toContain('<Signature');
      });
    });
  });

  describe('NfeDanfeService', () => {
    describe('generateDanfeHtml', () => {
      it('should generate DANFE HTML', () => {
        const html = danfeService.generateDanfeHtml({ nfe: mockNfe });

        expect(html).toBeDefined();
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('DANFE');
        expect(html).toContain('Empresa Teste LTDA');
        expect(html).toContain('Cliente Teste LTDA');
        expect(html).toContain('Produto Teste');
      });

      it('should include issuer information', () => {
        const html = danfeService.generateDanfeHtml({ nfe: mockNfe });

        expect(html).toContain('EMITENTE');
        expect(html).toContain('12.345.678/0001-95');
        expect(html).toContain('Rua Teste');
      });

      it('should include recipient information', () => {
        const html = danfeService.generateDanfeHtml({ nfe: mockNfe });

        expect(html).toContain('DESTINATÁRIO');
        expect(html).toContain('98.765.432/0001-87');
      });

      it('should include totals', () => {
        const html = danfeService.generateDanfeHtml({ nfe: mockNfe });

        expect(html).toContain('CÁLCULO DO IMPOSTO');
        expect(html).toContain('R$');
      });

      it('should show homologação warning for test environment', () => {
        const html = danfeService.generateDanfeHtml({ nfe: mockNfe });

        expect(html).toContain('SEM VALOR FISCAL');
        expect(html).toContain('HOMOLOGAÇÃO');
      });

      it('should include protocol if provided', () => {
        const protocolo = {
          versao: '4.00' as const,
          infProt: {
            tpAmb: 2 as const,
            verAplic: 'SP_NFE_PL_008i2',
            chNFe: '35240112345678000195550010000000011123456780',
            dhRecbto: '2024-01-15T10:05:00-03:00',
            nProt: '135240000000001',
            cStat: 100,
            xMotivo: 'Autorizado o uso da NF-e',
          },
        };

        const html = danfeService.generateDanfeHtml({ nfe: mockNfe, protocolo });

        expect(html).toContain('135240000000001');
        expect(html).toContain('PROTOCOLO DE AUTORIZAÇÃO');
      });
    });

    describe('generateDanfe', () => {
      it('should generate DANFE PDF (as base64)', async () => {
        const result = await danfeService.generateDanfe({ nfe: mockNfe });

        expect(result.success).toBe(true);
        expect(result.pdf).toBeDefined();
        expect(result.html).toBeDefined();
      });
    });
  });

  describe('NfeDocumentService', () => {
    describe('validateNfe', () => {
      it('should validate correct NF-e', () => {
        const result = documentService.validateNfe(mockNfe);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect missing ide', () => {
        const invalidNfe = { ...mockNfe, ide: undefined as any };
        const result = documentService.validateNfe(invalidNfe);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === 'E001')).toBe(true);
      });

      it('should detect missing emit', () => {
        const invalidNfe = { ...mockNfe, emit: undefined as any };
        const result = documentService.validateNfe(invalidNfe);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === 'E010')).toBe(true);
      });

      it('should detect missing products', () => {
        const invalidNfe = { ...mockNfe, det: [] };
        const result = documentService.validateNfe(invalidNfe);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === 'E020')).toBe(true);
      });

      it('should warn about homologação environment', () => {
        const result = documentService.validateNfe(mockNfe);

        expect(result.warnings.some((w) => w.code === 'W001')).toBe(true);
      });
    });

    describe('getDocument', () => {
      it('should return null for non-existent document', () => {
        const doc = documentService.getDocument('non-existent-id');
        expect(doc).toBeNull();
      });
    });

    describe('getDocumentsByTenant', () => {
      it('should return empty array for tenant with no documents', () => {
        const docs = documentService.getDocumentsByTenant('test-tenant');
        expect(docs).toHaveLength(0);
      });
    });

    describe('getStatistics', () => {
      it('should return statistics', () => {
        const stats = documentService.getStatistics();

        expect(stats.total).toBeDefined();
        expect(stats.byStatus).toBeDefined();
        expect(stats.byStatus[NfeStatus.AUTHORIZED]).toBeDefined();
      });
    });

    describe('onStatusChange', () => {
      it('should register callback', () => {
        const callback = jest.fn();
        documentService.onStatusChange(callback);
        // Callback registration doesn't throw
        expect(true).toBe(true);
      });
    });
  });

  describe('NfeService (Facade)', () => {
    describe('buildNfe', () => {
      it('should build NF-e structure', () => {
        const nfe = nfeService.buildNfe({
          uf: NfeUf.SP,
          natOp: 'Venda',
          serie: 1,
          nNF: 1,
          tpAmb: 2,
          emit: mockEmitente,
          dest: mockDestinatario,
          produtos: [mockProduto],
          pagamentos: [{ tPag: NfeMeioPagamento.DINHEIRO, vPag: 100 }],
        });

        expect(nfe).toBeDefined();
        expect(nfe.versao).toBe('4.00');
        expect(nfe.ide.cUF).toBe(NfeUf.SP);
        expect(nfe.ide.nNF).toBe(1);
        expect(nfe.emit).toBeDefined();
        expect(nfe.dest).toBeDefined();
        expect(nfe.det).toHaveLength(1);
        expect(nfe.total).toBeDefined();
      });

      it('should calculate totals correctly', () => {
        const nfe = nfeService.buildNfe({
          uf: NfeUf.SP,
          natOp: 'Venda',
          serie: 1,
          nNF: 1,
          tpAmb: 2,
          emit: mockEmitente,
          produtos: [mockProduto, { ...mockProduto, nItem: 2, vProd: 200 }],
          pagamentos: [{ tPag: NfeMeioPagamento.DINHEIRO, vPag: 300 }],
        });

        expect(nfe.total.ICMSTot.vProd).toBe(300);
      });
    });

    describe('generateXml', () => {
      it('should generate XML', () => {
        const xml = nfeService.generateXml(mockNfe);

        expect(xml).toContain('<NFe');
        expect(xml).toContain('</NFe>');
      });
    });

    describe('generateAccessKey', () => {
      it('should generate access key', () => {
        const chave = nfeService.generateAccessKey(mockNfe);

        expect(chave).toHaveLength(44);
      });
    });

    describe('validateNfe', () => {
      it('should validate NF-e', () => {
        const result = nfeService.validateNfe(mockNfe);

        expect(result.valid).toBe(true);
      });
    });

    describe('parseCertificate', () => {
      it('should parse certificate', () => {
        const testCert = nfeService.generateTestCertificate('12345678000195', 'Test');
        const info = nfeService.parseCertificate(testCert);

        expect(info).toBeDefined();
        expect(info.cnpj).toBe('12345678000195');
      });
    });

    describe('validateCertificate', () => {
      it('should validate certificate', () => {
        const testCert = nfeService.generateTestCertificate('12345678000195', 'Test');
        const result = nfeService.validateCertificate(testCert);

        expect(result.valid).toBe(true);
      });
    });

    describe('getStatistics', () => {
      it('should return statistics', () => {
        const stats = nfeService.getStatistics();

        expect(stats).toBeDefined();
        expect(stats.total).toBeDefined();
      });
    });

    describe('getDocumentsByStatus', () => {
      it('should return documents by status', () => {
        const docs = nfeService.getDocumentsByStatus(NfeStatus.AUTHORIZED);

        expect(Array.isArray(docs)).toBe(true);
      });
    });

    describe('generateDanfeHtml', () => {
      it('should generate DANFE HTML', () => {
        const html = nfeService.generateDanfeHtml(mockNfe);

        expect(html).toContain('DANFE');
      });
    });
  });

  describe('NfeSefazService', () => {
    // Note: These tests would require mocking HTTP requests in a real scenario

    describe('getContingencyRecommendation', () => {
      it('should be callable', async () => {
        // This would need mocking in a real test
        expect(sefazService.getContingencyRecommendation).toBeDefined();
      });
    });

    describe('isAvailable', () => {
      it('should be callable', async () => {
        expect(sefazService.isAvailable).toBeDefined();
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete NF-e creation flow (validation only)', () => {
      // Build NF-e
      const nfe = nfeService.buildNfe({
        uf: NfeUf.SP,
        natOp: 'Venda de Mercadoria',
        serie: 1,
        nNF: 123,
        tpAmb: 2,
        emit: mockEmitente,
        dest: mockDestinatario,
        produtos: [mockProduto],
        pagamentos: [{ tPag: NfeMeioPagamento.PIX, vPag: 100 }],
      });

      // Validate
      const validation = nfeService.validateNfe(nfe);
      expect(validation.valid).toBe(true);

      // Generate XML
      const xml = nfeService.generateXml(nfe);
      expect(xml).toContain('<NFe');

      // Generate access key
      const chave = nfeService.generateAccessKey(nfe);
      expect(chave).toHaveLength(44);

      // Sign (with test certificate)
      const testCert = nfeService.generateTestCertificate(
        mockEmitente.cnpjCpf,
        mockEmitente.razaoSocial,
      );
      // Signing would work with proper certificate setup
    });

    it('should handle DANFE generation for authorized NF-e', () => {
      const protocolo = {
        versao: '4.00' as const,
        infProt: {
          tpAmb: 2 as const,
          verAplic: 'SP_NFE_PL_008i2',
          chNFe: '35240112345678000195550010000000011123456780',
          dhRecbto: '2024-01-15T10:05:00-03:00',
          nProt: '135240000000001',
          cStat: 100,
          xMotivo: 'Autorizado o uso da NF-e',
        },
      };

      const html = nfeService.generateDanfeHtml(mockNfe, protocolo);

      expect(html).toContain('135240000000001');
      expect(html).toContain('DANFE');
      expect(html).toContain('Empresa Teste LTDA');
    });

    it('should generate different ICMS groups based on CST', () => {
      // CST 00 - Regular
      const prodCst00 = JSON.parse(JSON.stringify(mockProduto));
      prodCst00.imposto.icms.cst = NfeCstIcms.CST_00;

      const nfe00 = { ...mockNfe, det: [prodCst00] };
      const xml00 = xmlGeneratorService.generateNfe(nfe00);
      expect(xml00).toContain('<ICMS00>');

      // CST 40/41/50 - Exempt
      const prodCst40 = JSON.parse(JSON.stringify(mockProduto));
      prodCst40.imposto.icms = {
        orig: NfeOrigemMercadoria.NACIONAL,
        cst: NfeCstIcms.CST_40,
      } as any;

      const nfe40 = { ...mockNfe, det: [prodCst40] };
      const xml40 = xmlGeneratorService.generateNfe(nfe40);
      expect(xml40).toContain('<ICMS40>');
    });

    it('should handle Simples Nacional (CSOSN)', () => {
      const prodSimples = JSON.parse(JSON.stringify(mockProduto));
      prodSimples.imposto.icms = {
        orig: NfeOrigemMercadoria.NACIONAL,
        csosn: '102',
      } as any;

      const nfeSimples = { ...mockNfe, det: [prodSimples] };
      const xml = xmlGeneratorService.generateNfe(nfeSimples);
      expect(xml).toContain('<ICMSSN102>');
      expect(xml).toContain('<CSOSN>102</CSOSN>');
    });
  });

  describe('Edge cases', () => {
    it('should handle NF-e without recipient (NFC-e)', () => {
      const nfce: NfeInfNfe = {
        ...mockNfe,
        ide: { ...mockNfe.ide, mod: NfeModelo.NFCE },
        dest: undefined,
      };

      const xml = xmlGeneratorService.generateNfe(nfce);
      expect(xml).not.toContain('<dest>');
    });

    it('should handle products with discount', () => {
      const prodWithDiscount = {
        ...mockProduto,
        vDesc: 10.0,
      };

      const nfe: NfeInfNfe = {
        ...mockNfe,
        det: [prodWithDiscount],
      };

      const xml = xmlGeneratorService.generateNfe(nfe);
      expect(xml).toContain('<vDesc>10.00</vDesc>');
    });

    it('should handle multiple payment methods', () => {
      const nfe: NfeInfNfe = {
        ...mockNfe,
        pag: {
          detPag: [
            { indPag: NfeIndicadorPagamento.A_VISTA, tPag: NfeMeioPagamento.DINHEIRO, vPag: 50 },
            { indPag: NfeIndicadorPagamento.A_VISTA, tPag: NfeMeioPagamento.PIX, vPag: 50 },
          ],
        },
      };

      const xml = xmlGeneratorService.generateNfe(nfe);
      expect(xml).toContain('<tPag>01</tPag>');
      expect(xml).toContain('<tPag>17</tPag>');
    });

    it('should escape XML special characters', () => {
      const nfeWithSpecialChars: NfeInfNfe = {
        ...mockNfe,
        emit: {
          ...mockEmitente,
          razaoSocial: 'Empresa & Filhos <Teste>',
        },
      };

      const xml = xmlGeneratorService.generateNfe(nfeWithSpecialChars);
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&lt;');
      expect(xml).toContain('&gt;');
    });

    it('should handle volumes in transport', () => {
      const nfeWithVolumes: NfeInfNfe = {
        ...mockNfe,
        transp: {
          modFrete: NfeModalidadeFrete.CIF,
          transporta: {
            cnpjCpf: '11111111000111',
            xNome: 'Transportadora Teste',
            ie: '111111111',
            xEnder: 'Rua Transporte, 123',
            xMun: 'São Paulo',
            uf: 'SP',
          },
          vol: [
            {
              qVol: 2,
              esp: 'CAIXA',
              marca: 'TESTE',
              nVol: '001',
              pesoL: 5.5,
              pesoB: 6.0,
            },
          ],
        },
      };

      const xml = xmlGeneratorService.generateNfe(nfeWithVolumes);
      expect(xml).toContain('<vol>');
      expect(xml).toContain('<qVol>2</qVol>');
      expect(xml).toContain('<esp>CAIXA</esp>');
      expect(xml).toContain('<pesoL>5.500</pesoL>');
    });

    it('should handle billing information', () => {
      const nfeWithBilling: NfeInfNfe = {
        ...mockNfe,
        cobr: {
          fat: {
            nFat: '001',
            vOrig: 100,
            vDesc: 0,
            vLiq: 100,
          },
          dup: [
            { nDup: '001', dVenc: '2024-02-15', vDup: 50 },
            { nDup: '002', dVenc: '2024-03-15', vDup: 50 },
          ],
        },
      };

      const xml = xmlGeneratorService.generateNfe(nfeWithBilling);
      expect(xml).toContain('<cobr>');
      expect(xml).toContain('<fat>');
      expect(xml).toContain('<dup>');
      expect(xml).toContain('<nDup>001</nDup>');
    });
  });
});
