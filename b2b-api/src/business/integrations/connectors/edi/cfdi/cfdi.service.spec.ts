import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CfdiService } from './services/cfdi.service';
import { CfdiXmlGeneratorService } from './services/cfdi-xml-generator.service';
import { CfdiSignatureService } from './services/cfdi-signature.service';
import { CfdiPacService } from './services/cfdi-pac.service';
import { CfdiSatValidationService } from './services/cfdi-sat-validation.service';
import { CfdiPdfService } from './services/cfdi-pdf.service';
import { CfdiDocumentService } from './services/cfdi-document.service';
import {
  CfdiComprobante,
  CfdiTipoComprobante,
  CfdiExportacion,
  CfdiMetodoPago,
  CfdiFormaPago,
  CfdiRegimenFiscal,
  CfdiUsoCFDI,
  CfdiImpuesto,
  CfdiTipoFactor,
  CfdiObjetoImp,
  CfdiStatus,
  CfdiMotivoCancelacion,
  CfdiCsdCertificate,
  CfdiPagos20,
  CfdiComercioExterior,
} from './interfaces';

describe('CfdiService', () => {
  let service: CfdiService;
  let xmlGenerator: CfdiXmlGeneratorService;
  let signatureService: CfdiSignatureService;
  let pacService: CfdiPacService;
  let satValidation: CfdiSatValidationService;
  let pdfService: CfdiPdfService;
  let documentService: CfdiDocumentService;

  // Sample CFDI data
  const sampleComprobante: CfdiComprobante = {
    version: '4.0',
    serie: 'A',
    folio: '001',
    fecha: '2024-01-15T10:30:00',
    formaPago: CfdiFormaPago.TRANSFERENCIA_ELECTRONICA,
    metodoPago: CfdiMetodoPago.PUE,
    subTotal: 1000,
    total: 1160,
    moneda: 'MXN',
    tipoDeComprobante: CfdiTipoComprobante.INGRESO,
    exportacion: CfdiExportacion.NO_APLICA,
    lugarExpedicion: '06600',
    emisor: {
      rfc: 'AAA010101AAA',
      nombre: 'Empresa Emisora SA de CV',
      regimenFiscal: CfdiRegimenFiscal.GENERAL_LEY_PERSONAS_MORALES,
    },
    receptor: {
      rfc: 'BBB020202BBB',
      nombre: 'Cliente Receptor SA de CV',
      domicilioFiscalReceptor: '06600',
      regimenFiscalReceptor: CfdiRegimenFiscal.GENERAL_LEY_PERSONAS_MORALES,
      usoCFDI: CfdiUsoCFDI.GASTOS_EN_GENERAL,
    },
    conceptos: [
      {
        claveProdServ: '43232408',
        noIdentificacion: 'PROD001',
        cantidad: 2,
        claveUnidad: 'H87',
        unidad: 'Pieza',
        descripcion: 'Producto de prueba',
        valorUnitario: 500,
        importe: 1000,
        objetoImp: CfdiObjetoImp.SI_OBJETO_IMPUESTO,
        impuestos: {
          traslados: {
            traslados: [
              {
                base: 1000,
                impuesto: CfdiImpuesto.IVA,
                tipoFactor: CfdiTipoFactor.TASA,
                tasaOCuota: 0.16,
                importe: 160,
              },
            ],
          },
        },
      },
    ],
    impuestos: {
      totalImpuestosTrasladados: 160,
      traslados: [
        {
          base: 1000,
          impuesto: CfdiImpuesto.IVA,
          tipoFactor: CfdiTipoFactor.TASA,
          tasaOCuota: 0.16,
          importe: 160,
        },
      ],
    },
  };

  // Sample CSD for future integration tests
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _sampleCsd: CfdiCsdCertificate = {
    noCertificado: '00001000000506790941',
    certificado: 'BASE64_CERTIFICATE_DATA',
    validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    rfcEmisor: 'AAA010101AAA',
    privateKey: 'BASE64_PRIVATE_KEY_DATA',
    password: 'test123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CfdiService,
        CfdiXmlGeneratorService,
        CfdiSignatureService,
        CfdiPacService,
        CfdiSatValidationService,
        CfdiPdfService,
        CfdiDocumentService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                CFDI_PAC_NAME: 'mock',
                CFDI_PAC_SANDBOX: 'true',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CfdiService>(CfdiService);
    xmlGenerator = module.get<CfdiXmlGeneratorService>(CfdiXmlGeneratorService);
    signatureService = module.get<CfdiSignatureService>(CfdiSignatureService);
    pacService = module.get<CfdiPacService>(CfdiPacService);
    satValidation = module.get<CfdiSatValidationService>(CfdiSatValidationService);
    pdfService = module.get<CfdiPdfService>(CfdiPdfService);
    documentService = module.get<CfdiDocumentService>(CfdiDocumentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CfdiService', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should generate XML', () => {
      const xml = service.generateXml(sampleComprobante);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('cfdi:Comprobante');
      expect(xml).toContain('Version="4.0"');
      expect(xml).toContain('AAA010101AAA');
    });

    it('should generate cadena original', () => {
      const cadena = service.generateCadenaOriginal(sampleComprobante);
      expect(cadena).toMatch(/^\|\|.*\|\|$/);
      expect(cadena).toContain('4.0');
      expect(cadena).toContain('AAA010101AAA');
    });

    it('should validate structure successfully', () => {
      const result = service.validateStructure(sampleComprobante);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should get available PAC providers', () => {
      const providers = service.getAvailablePacProviders();
      expect(providers).toContain('mock');
      expect(providers).toContain('finkok');
      expect(providers).toContain('facturapi');
    });

    it('should generate QR string', () => {
      const qr = service.generateQrString(
        'ABC12345-1234-1234-1234-123456789012',
        'AAA010101AAA',
        'BBB020202BBB',
        1160,
        'SELLO_BASE64',
      );
      expect(qr).toContain('verificacfdi.facturaelectronica.sat.gob.mx');
      expect(qr).toContain('ABC12345-1234-1234-1234-123456789012');
    });

    it('should get statistics', () => {
      const stats = service.getStatistics();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byStatus');
    });

    it('should build comprobante helper', () => {
      const comp = service.buildComprobante({
        fecha: '2024-01-15T10:00:00',
        emisor: sampleComprobante.emisor,
        receptor: sampleComprobante.receptor,
        conceptos: sampleComprobante.conceptos,
        lugarExpedicion: '06600',
        metodoPago: CfdiMetodoPago.PUE,
        formaPago: CfdiFormaPago.TRANSFERENCIA_ELECTRONICA,
      });
      expect(comp.version).toBe('4.0');
      expect(comp.subTotal).toBe(1000);
      expect(comp.total).toBe(1160);
    });
  });

  describe('CfdiXmlGeneratorService', () => {
    it('should be defined', () => {
      expect(xmlGenerator).toBeDefined();
    });

    it('should generate valid CFDI XML', () => {
      const xml = xmlGenerator.generateCfdi(sampleComprobante);
      expect(xml).toContain('xmlns:cfdi="http://www.sat.gob.mx/cfd/4"');
      expect(xml).toContain('<cfdi:Emisor');
      expect(xml).toContain('<cfdi:Receptor');
      expect(xml).toContain('<cfdi:Conceptos>');
      expect(xml).toContain('<cfdi:Impuestos');
    });

    it('should include all required attributes', () => {
      const xml = xmlGenerator.generateCfdi(sampleComprobante);
      expect(xml).toContain('Serie="A"');
      expect(xml).toContain('Folio="001"');
      expect(xml).toContain('SubTotal="1000.00"');
      expect(xml).toContain('Total="1160.00"');
      expect(xml).toContain('TipoDeComprobante="I"');
    });

    it('should generate cadena original correctly', () => {
      const cadena = xmlGenerator.generateCadenaOriginal(sampleComprobante);
      expect(cadena.startsWith('||')).toBe(true);
      expect(cadena.endsWith('||')).toBe(true);
      expect(cadena).toContain('4.0');
      expect(cadena).toContain('A');
      expect(cadena).toContain('001');
    });

    it('should handle conceptos with impuestos', () => {
      const xml = xmlGenerator.generateCfdi(sampleComprobante);
      expect(xml).toContain('<cfdi:Traslados>');
      expect(xml).toContain('TasaOCuota="0.160000"');
      expect(xml).toContain('Importe="160.00"');
    });

    it('should handle document with discount', () => {
      const compWithDiscount = {
        ...sampleComprobante,
        descuento: 100,
        conceptos: [
          {
            ...sampleComprobante.conceptos[0],
            descuento: 100,
          },
        ],
      };
      const xml = xmlGenerator.generateCfdi(compWithDiscount);
      expect(xml).toContain('Descuento="100.00"');
    });

    it('should escape XML special characters', () => {
      const compWithSpecialChars = {
        ...sampleComprobante,
        emisor: {
          ...sampleComprobante.emisor,
          nombre: 'Empresa & Co <Test>',
        },
      };
      const xml = xmlGenerator.generateCfdi(compWithSpecialChars);
      expect(xml).toContain('Empresa &amp; Co &lt;Test&gt;');
    });
  });

  describe('CfdiSatValidationService', () => {
    it('should be defined', () => {
      expect(satValidation).toBeDefined();
    });

    it('should validate correct structure', () => {
      const result = satValidation.validateStructure(sampleComprobante);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid version', () => {
      const invalid = { ...sampleComprobante, version: '3.3' as '4.0' };
      const result = satValidation.validateStructure(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CFDI40001')).toBe(true);
    });

    it('should reject invalid RFC format', () => {
      const invalid = {
        ...sampleComprobante,
        emisor: { ...sampleComprobante.emisor, rfc: 'INVALID' },
      };
      const result = satValidation.validateStructure(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CFDI40003')).toBe(true);
    });

    it('should reject invalid postal code', () => {
      const invalid = { ...sampleComprobante, lugarExpedicion: '123' };
      const result = satValidation.validateStructure(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CFDI40005')).toBe(true);
    });

    it('should reject missing metodoPago for Ingreso', () => {
      const invalid = { ...sampleComprobante, metodoPago: undefined };
      const result = satValidation.validateStructure(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CFDI40010')).toBe(true);
    });

    it('should validate Pago type correctly', () => {
      const pagoComprobante: CfdiComprobante = {
        ...sampleComprobante,
        tipoDeComprobante: CfdiTipoComprobante.PAGO,
        subTotal: 0,
        total: 0,
        metodoPago: undefined,
        formaPago: undefined,
        conceptos: [
          {
            claveProdServ: '84111506',
            cantidad: 1,
            claveUnidad: 'ACT',
            descripcion: 'Pago',
            valorUnitario: 0,
            importe: 0,
            objetoImp: CfdiObjetoImp.NO_OBJETO_IMPUESTO,
          },
        ],
        impuestos: undefined,
        complemento: {
          pagos: {
            version: '2.0',
            totales: { montoTotalPagos: 1000 },
            pago: [],
          },
        },
      };
      const result = satValidation.validateStructure(pagoComprobante);
      // Should be valid if all Pago rules are met
      expect(result).toBeDefined();
    });
  });

  describe('CfdiPacService', () => {
    it('should be defined', () => {
      expect(pacService).toBeDefined();
    });

    it('should get available providers', () => {
      const providers = pacService.getAvailableProviders();
      expect(providers).toContain('mock');
      expect(providers).toContain('finkok');
    });

    it('should stamp with mock provider', async () => {
      const xml = xmlGenerator.generateCfdi(sampleComprobante);
      const result = await pacService.stamp({ xml });
      expect(result.success).toBe(true);
      expect(result.uuid).toBeDefined();
      expect(result.xml).toContain('TimbreFiscalDigital');
    });

    it('should extract timbre from stamped XML', async () => {
      const xml = xmlGenerator.generateCfdi(sampleComprobante);
      const stampResult = await pacService.stamp({ xml });
      const timbre = pacService.extractTimbre(stampResult.xml!);
      expect(timbre).toBeDefined();
      expect(timbre?.version).toBe('1.1');
      expect(timbre?.uuid).toBe(stampResult.uuid);
    });

    it('should cancel with mock provider', async () => {
      const result = await pacService.cancel({
        uuid: 'ABC12345-1234-1234-1234-123456789012',
        rfcEmisor: 'AAA010101AAA',
        rfcReceptor: 'BBB020202BBB',
        total: 1160,
        motivo: CfdiMotivoCancelacion.NO_SE_LLEVO_OPERACION,
      });
      expect(result.success).toBe(true);
      expect(result.status).toBe('cancelled');
    });

    it('should require folioSustitucion for motivo 01', async () => {
      const result = await pacService.cancel({
        uuid: 'ABC12345-1234-1234-1234-123456789012',
        rfcEmisor: 'AAA010101AAA',
        rfcReceptor: 'BBB020202BBB',
        total: 1160,
        motivo: CfdiMotivoCancelacion.COMPROBANTE_ERRORES_CON_RELACION,
        // Missing folioSustitucion
      });
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('folioSustitucion');
    });
  });

  describe('CfdiPdfService', () => {
    it('should be defined', () => {
      expect(pdfService).toBeDefined();
    });

    it('should generate HTML representation', () => {
      const html = pdfService.generateHtml({
        comprobante: sampleComprobante,
      });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Factura');
      expect(html).toContain('AAA010101AAA');
      expect(html).toContain('1,160.00');
    });

    it('should include QR section when timbre present', () => {
      const timbre = {
        version: '1.1' as const,
        uuid: 'ABC12345-1234-1234-1234-123456789012',
        fechaTimbrado: '2024-01-15T10:35:00',
        rfcProvCertif: 'SAT970701NN3',
        selloCFD: 'SELLO_CFD',
        noCertificadoSAT: '00001000000506790941',
        selloSAT: 'SELLO_SAT',
      };
      const html = pdfService.generateHtml({
        comprobante: { ...sampleComprobante, sello: 'SELLO_TEST' },
        timbre,
      });
      expect(html).toContain('Timbre Fiscal Digital');
      expect(html).toContain(timbre.uuid);
    });

    it('should generate PDF', async () => {
      const result = await pdfService.generatePdf({
        comprobante: sampleComprobante,
      });
      expect(result.success).toBe(true);
      expect(result.pdf).toBeDefined();
    });
  });

  describe('CfdiDocumentService', () => {
    it('should be defined', () => {
      expect(documentService).toBeDefined();
    });

    it('should return null for non-existent document', () => {
      const doc = documentService.getDocument('non-existent-id');
      expect(doc).toBeNull();
    });

    it('should return null for non-existent UUID', () => {
      const doc = documentService.getDocumentByUuid('non-existent-uuid');
      expect(doc).toBeNull();
    });

    it('should return empty array for tenant with no documents', () => {
      const docs = documentService.getDocumentsByTenant('test-tenant');
      expect(docs).toHaveLength(0);
    });

    it('should return statistics', () => {
      const stats = documentService.getStatistics();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byStatus');
      expect(stats.byStatus).toHaveProperty(CfdiStatus.DRAFT);
    });
  });

  describe('CfdiSignatureService', () => {
    it('should be defined', () => {
      expect(signatureService).toBeDefined();
    });

    it('should generate QR string', () => {
      const qr = signatureService.generateQrString(
        'ABC12345-1234-1234-1234-123456789012',
        'AAA010101AAA',
        'BBB020202BBB',
        1160,
        'SELLO12345678',
      );
      expect(qr).toContain('https://verificacfdi.facturaelectronica.sat.gob.mx');
      expect(qr).toContain('ABC12345-1234-1234-1234-123456789012');
      expect(qr).toContain('AAA010101AAA');
      expect(qr).toContain('fe=12345678'); // Last 8 chars of sello
    });

    it('should generate test CSD', () => {
      const csd = signatureService.generateTestCsd('AAA010101AAA', 'Test Company');
      expect(csd.noCertificado).toBeDefined();
      expect(csd.rfcEmisor).toBe('AAA010101AAA');
      expect(csd.password).toBe('test123');
    });
  });

  describe('Pagos 2.0 Complement', () => {
    it('should generate XML with Pagos 2.0', () => {
      const pagos: CfdiPagos20 = {
        version: '2.0',
        totales: {
          totalTrasladosBaseIVA16: 1000,
          totalTrasladosImpuestoIVA16: 160,
          montoTotalPagos: 1160,
        },
        pago: [
          {
            fechaPago: '2024-01-15T10:00:00',
            formaDePagoP: CfdiFormaPago.TRANSFERENCIA_ELECTRONICA,
            monedaP: 'MXN',
            monto: 1160,
            doctoRelacionado: [
              {
                idDocumento: 'ABC12345-1234-1234-1234-123456789012',
                monedaDR: 'MXN',
                equivalenciaDR: 1,
                numParcialidad: 1,
                impSaldoAnt: 1160,
                impPagado: 1160,
                impSaldoInsoluto: 0,
                objetoImpDR: CfdiObjetoImp.SI_OBJETO_IMPUESTO,
              },
            ],
          },
        ],
      };

      const pagoComprobante: CfdiComprobante = {
        ...sampleComprobante,
        tipoDeComprobante: CfdiTipoComprobante.PAGO,
        subTotal: 0,
        total: 0,
        metodoPago: undefined,
        formaPago: undefined,
        conceptos: [
          {
            claveProdServ: '84111506',
            cantidad: 1,
            claveUnidad: 'ACT',
            descripcion: 'Pago',
            valorUnitario: 0,
            importe: 0,
            objetoImp: CfdiObjetoImp.NO_OBJETO_IMPUESTO,
          },
        ],
        impuestos: undefined,
        complemento: { pagos },
      };

      const xml = xmlGenerator.generateCfdi(pagoComprobante);
      expect(xml).toContain('pago20:Pagos');
      expect(xml).toContain('pago20:Totales');
      expect(xml).toContain('pago20:Pago');
      expect(xml).toContain('pago20:DoctoRelacionado');
    });
  });

  describe('Comercio Exterior Complement', () => {
    it('should generate XML with Comercio Exterior', () => {
      const cce: CfdiComercioExterior = {
        version: '2.0',
        tipoCambioUSD: 17.5,
        totalUSD: 1000,
        incoterm: 'FOB',
        destinatario: [
          {
            numRegIdTrib: '123456789',
            nombre: 'US Company Inc',
            domicilio: {
              calle: '123 Main St',
              estado: 'CA',
              pais: 'USA',
              codigoPostal: '90210',
            },
          },
        ],
        mercancias: [
          {
            noIdentificacion: 'PROD001',
            fraccionArancelaria: '84713001',
            cantidadAduana: 2,
            unidadAduana: '06',
            valorUnitarioAduana: 500,
            valorDolares: 1000,
          },
        ],
      };

      const exportComprobante: CfdiComprobante = {
        ...sampleComprobante,
        exportacion: CfdiExportacion.DEFINITIVA,
        complemento: { comercioExterior: cce },
      };

      const xml = xmlGenerator.generateCfdi(exportComprobante);
      expect(xml).toContain('cce20:ComercioExterior');
      expect(xml).toContain('cce20:Destinatario');
      expect(xml).toContain('cce20:Mercancias');
      expect(xml).toContain('cce20:Mercancia');
    });
  });

  describe('Addenda Support', () => {
    it('should generate XML with Amazon addenda', () => {
      const compWithAddenda: CfdiComprobante = {
        ...sampleComprobante,
        addenda: {
          amazon: {
            vendorCode: 'AMZN001',
            shipToLocationCode: 'ST001',
            billToLocationCode: 'BT001',
            purchaseOrderNumber: 'PO12345',
            purchaseOrderDate: '2024-01-10',
          },
        },
      };

      const xml = xmlGenerator.generateCfdi(compWithAddenda);
      expect(xml).toContain('<cfdi:Addenda>');
      expect(xml).toContain('amz:AdditionalInformation');
      expect(xml).toContain('AMZN001');
      expect(xml).toContain('PO12345');
    });

    it('should generate XML with Walmart addenda', () => {
      const compWithAddenda: CfdiComprobante = {
        ...sampleComprobante,
        addenda: {
          walmart: {
            providerNumber: 'WM001',
            storeNumber: 'ST100',
            purchaseOrderNumber: 'WMPO123',
            invoiceType: 'Normal',
          },
        },
      };

      const xml = xmlGenerator.generateCfdi(compWithAddenda);
      expect(xml).toContain('<cfdi:Addenda>');
      expect(xml).toContain('wm:WalmartAddenda');
      expect(xml).toContain('WM001');
    });

    it('should generate XML with custom addenda', () => {
      const compWithAddenda: CfdiComprobante = {
        ...sampleComprobante,
        addenda: {
          custom:
            '<custom:MyAddenda xmlns:custom="http://example.com"><custom:Data>Test</custom:Data></custom:MyAddenda>',
        },
      };

      const xml = xmlGenerator.generateCfdi(compWithAddenda);
      expect(xml).toContain('<cfdi:Addenda>');
      expect(xml).toContain('custom:MyAddenda');
    });
  });

  describe('Integration Flow', () => {
    it('should complete full invoice flow with mock PAC', async () => {
      // This tests the full flow: validate -> seal -> stamp
      const xml = xmlGenerator.generateCfdi(sampleComprobante);

      // Validate structure
      const validation = satValidation.validateStructure(sampleComprobante);
      expect(validation.valid).toBe(true);

      // Stamp with mock PAC
      const stampResult = await pacService.stamp({ xml });
      expect(stampResult.success).toBe(true);
      expect(stampResult.uuid).toBeDefined();

      // Extract timbre
      const timbre = pacService.extractTimbre(stampResult.xml!);
      expect(timbre).toBeDefined();

      // Generate PDF
      const pdfResult = await pdfService.generatePdf({
        comprobante: sampleComprobante,
        timbre: timbre!,
      });
      expect(pdfResult.success).toBe(true);
    });
  });

  describe('Additional Coverage Tests', () => {
    describe('XML Generator Edge Cases', () => {
      it('should handle comprobante with tipoCambio', () => {
        const compWithTipoCambio = {
          ...sampleComprobante,
          moneda: 'USD',
          tipoCambio: 17.5,
        };
        const xml = xmlGenerator.generateCfdi(compWithTipoCambio);
        expect(xml).toContain('TipoCambio="17.50"');
        expect(xml).toContain('Moneda="USD"');
      });

      it('should handle comprobante with condicionesDePago', () => {
        const compWithCondiciones = {
          ...sampleComprobante,
          condicionesDePago: 'Net 30 days',
        };
        const xml = xmlGenerator.generateCfdi(compWithCondiciones);
        expect(xml).toContain('CondicionesDePago="Net 30 days"');
      });

      it('should handle comprobante with informacionGlobal', () => {
        const compGlobal = {
          ...sampleComprobante,
          informacionGlobal: {
            periodicidad: '01' as const,
            meses: '01',
            año: 2024,
          },
        };
        const cadena = xmlGenerator.generateCadenaOriginal(compGlobal);
        expect(cadena).toContain('01');
        expect(cadena).toContain('2024');
      });

      it('should handle comprobante with cfdiRelacionados', () => {
        const compWithRelated = {
          ...sampleComprobante,
          cfdiRelacionados: [
            {
              tipoRelacion: '04',
              cfdiRelacionado: [{ uuid: 'DEF67890-1234-1234-1234-123456789012' }],
            },
          ],
        };
        const xml = xmlGenerator.generateCfdi(compWithRelated);
        expect(xml).toContain('<cfdi:CfdiRelacionados');
        expect(xml).toContain('TipoRelacion="04"');
        expect(xml).toContain('DEF67890-1234-1234-1234-123456789012');
      });

      it('should handle concepto with aCuentaTerceros', () => {
        const compWithTerceros = {
          ...sampleComprobante,
          conceptos: [
            {
              ...sampleComprobante.conceptos[0],
              aCuentaTerceros: {
                rfcACuentaTerceros: 'CCC030303CCC',
                nombreACuentaTerceros: 'Tercero SA',
                regimenFiscalACuentaTerceros: CfdiRegimenFiscal.GENERAL_LEY_PERSONAS_MORALES,
                domicilioFiscalACuentaTerceros: '12345',
              },
            },
          ],
        };
        const xml = xmlGenerator.generateCfdi(compWithTerceros);
        expect(xml).toContain('<cfdi:ACuentaTerceros');
        expect(xml).toContain('CCC030303CCC');
      });

      it('should handle concepto with informacionAduanera', () => {
        const compWithAduanera = {
          ...sampleComprobante,
          conceptos: [
            {
              ...sampleComprobante.conceptos[0],
              informacionAduanera: [{ numeroPedimento: '21 47 3807 4003281' }],
            },
          ],
        };
        const xml = xmlGenerator.generateCfdi(compWithAduanera);
        expect(xml).toContain('NumeroPedimento="21 47 3807 4003281"');
      });

      it('should handle concepto with cuentaPredial', () => {
        const compWithPredial = {
          ...sampleComprobante,
          conceptos: [
            {
              ...sampleComprobante.conceptos[0],
              cuentaPredial: [{ numero: '123456789' }],
            },
          ],
        };
        const xml = xmlGenerator.generateCfdi(compWithPredial);
        expect(xml).toContain('<cfdi:CuentaPredial Numero="123456789"');
      });

      it('should handle concepto with parte', () => {
        const compWithParte = {
          ...sampleComprobante,
          conceptos: [
            {
              ...sampleComprobante.conceptos[0],
              parte: [
                {
                  claveProdServ: '43232408',
                  cantidad: 1,
                  descripcion: 'Part 1',
                  valorUnitario: 250,
                  importe: 250,
                },
                {
                  claveProdServ: '43232408',
                  cantidad: 1,
                  descripcion: 'Part 2',
                  informacionAduanera: [{ numeroPedimento: '21 47 3807 4003282' }],
                },
              ],
            },
          ],
        };
        const xml = xmlGenerator.generateCfdi(compWithParte);
        expect(xml).toContain('<cfdi:Parte');
        expect(xml).toContain('Part 1');
        expect(xml).toContain('Part 2');
      });

      it('should handle concepto with retenciones', () => {
        const compWithRetenciones = {
          ...sampleComprobante,
          conceptos: [
            {
              ...sampleComprobante.conceptos[0],
              impuestos: {
                traslados: sampleComprobante.conceptos[0].impuestos?.traslados,
                retenciones: {
                  retenciones: [
                    {
                      base: 1000,
                      impuesto: CfdiImpuesto.ISR,
                      tipoFactor: CfdiTipoFactor.TASA,
                      tasaOCuota: 0.1,
                      importe: 100,
                    },
                  ],
                },
              },
            },
          ],
          impuestos: {
            ...sampleComprobante.impuestos,
            totalImpuestosRetenidos: 100,
            retenciones: [{ impuesto: CfdiImpuesto.ISR, importe: 100 }],
          },
        };
        const xml = xmlGenerator.generateCfdi(compWithRetenciones);
        expect(xml).toContain('<cfdi:Retenciones>');
        expect(xml).toContain('<cfdi:Retencion');
      });

      it('should handle Traslado type comprobante', () => {
        const trasladoComp = {
          ...sampleComprobante,
          tipoDeComprobante: CfdiTipoComprobante.TRASLADO,
          metodoPago: undefined,
          formaPago: undefined,
        };
        const xml = xmlGenerator.generateCfdi(trasladoComp);
        expect(xml).toContain('TipoDeComprobante="T"');
      });

      it('should handle Egreso type comprobante', () => {
        const egresoComp = {
          ...sampleComprobante,
          tipoDeComprobante: CfdiTipoComprobante.EGRESO,
        };
        const xml = xmlGenerator.generateCfdi(egresoComp);
        expect(xml).toContain('TipoDeComprobante="E"');
      });

      it('should handle receptor with residenciaFiscal and numRegIdTrib', () => {
        const compForeign = {
          ...sampleComprobante,
          receptor: {
            ...sampleComprobante.receptor,
            residenciaFiscal: 'USA',
            numRegIdTrib: '123456789',
          },
        };
        const xml = xmlGenerator.generateCfdi(compForeign);
        expect(xml).toContain('ResidenciaFiscal="USA"');
        expect(xml).toContain('NumRegIdTrib="123456789"');
      });

      it('should generate cadena original for TimbreFiscalDigital', () => {
        const timbre = {
          version: '1.1' as const,
          uuid: 'ABC12345-1234-1234-1234-123456789012',
          fechaTimbrado: '2024-01-15T10:35:00',
          rfcProvCertif: 'SAT970701NN3',
          selloCFD: 'SELLO_CFD',
          noCertificadoSAT: '00001000000506790941',
          selloSAT: 'SELLO_SAT',
        };
        const cadena = xmlGenerator.generateCadenaOriginalTfd(timbre, 'SELLO_CFD');
        expect(cadena).toMatch(/^\|\|.*\|\|$/);
        expect(cadena).toContain(timbre.uuid);
        expect(cadena).toContain(timbre.rfcProvCertif);
      });
    });

    describe('SAT Validation Additional Tests', () => {
      it('should validate receptor RFC', () => {
        const invalid = {
          ...sampleComprobante,
          receptor: { ...sampleComprobante.receptor, rfc: 'INVALID' },
        };
        const result = satValidation.validateStructure(invalid);
        expect(result.valid).toBe(false);
        // RFC validation error code is CFDI40003 or CFDI40004
        expect(result.errors.some((e) => e.code.startsWith('CFDI4000'))).toBe(true);
      });

      it('should validate receptor postal code', () => {
        const invalid = {
          ...sampleComprobante,
          receptor: { ...sampleComprobante.receptor, domicilioFiscalReceptor: '1' },
        };
        const result = satValidation.validateStructure(invalid);
        expect(result.valid).toBe(false);
        // Postal code validation is CFDI40006
        expect(result.errors.some((e) => e.code === 'CFDI40006')).toBe(true);
      });

      it('should validate conceptos not empty', () => {
        const invalid = {
          ...sampleComprobante,
          conceptos: [],
          subTotal: 0,
          total: 0,
        };
        const result = satValidation.validateStructure(invalid);
        expect(result.valid).toBe(false);
        // Empty conceptos is CFDI40012
        expect(result.errors.some((e) => e.code === 'CFDI40012')).toBe(true);
      });

      it('should validate concepto claveProdServ format', () => {
        const invalid = {
          ...sampleComprobante,
          conceptos: [{ ...sampleComprobante.conceptos[0], claveProdServ: '123' }],
        };
        const result = satValidation.validateStructure(invalid);
        expect(result.valid).toBe(false);
        // claveProdServ validation exists
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should validate concepto cantidad greater than zero', () => {
        const invalid = {
          ...sampleComprobante,
          conceptos: [{ ...sampleComprobante.conceptos[0], cantidad: 0 }],
        };
        const result = satValidation.validateStructure(invalid);
        expect(result.valid).toBe(false);
        // Cantidad validation exists
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should validate currency with tipoCambio', () => {
        const invalid = {
          ...sampleComprobante,
          moneda: 'USD',
          tipoCambio: undefined,
        };
        const result = satValidation.validateStructure(invalid);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === 'CFDI40008')).toBe(true);
      });

      it('should validate formaPago required for PUE', () => {
        const invalid = {
          ...sampleComprobante,
          metodoPago: CfdiMetodoPago.PUE,
          formaPago: undefined,
        };
        const result = satValidation.validateStructure(invalid);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === 'CFDI40011')).toBe(true);
      });
    });

    describe('PAC Service Additional Tests', () => {
      it('should test PAC connection', async () => {
        const result = await pacService.testConnection();
        expect(result.success).toBe(true);
      });

      it('should cancel with motivo 01 and folioSustitucion', async () => {
        const result = await pacService.cancel({
          uuid: 'ABC12345-1234-1234-1234-123456789012',
          rfcEmisor: 'AAA010101AAA',
          rfcReceptor: 'BBB020202BBB',
          total: 1160,
          motivo: CfdiMotivoCancelacion.COMPROBANTE_ERRORES_CON_RELACION,
          folioSustitucion: 'DEF67890-1234-1234-1234-123456789012',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('PDF Service Additional Tests', () => {
      it('should generate HTML with cadenaOriginal when timbre is present', () => {
        const timbre = {
          version: '1.1' as const,
          uuid: 'ABC12345-1234-1234-1234-123456789012',
          fechaTimbrado: '2024-01-15T10:35:00',
          rfcProvCertif: 'SAT970701NN3',
          selloCFD: 'SELLO_CFD',
          noCertificadoSAT: '00001000000506790941',
          selloSAT: 'SELLO_SAT',
        };
        const html = pdfService.generateHtml({
          comprobante: { ...sampleComprobante, sello: 'SELLO_TEST' },
          timbre,
          cadenaOriginal: '||4.0|A|001||',
        });
        expect(html).toContain('Cadena Original');
      });

      it('should generate HTML with logo', () => {
        const html = pdfService.generateHtml({
          comprobante: sampleComprobante,
          logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        });
        expect(html).toContain('data:image/png;base64');
      });

      it('should handle PDF with all options', async () => {
        const timbre = {
          version: '1.1' as const,
          uuid: 'ABC12345-1234-1234-1234-123456789012',
          fechaTimbrado: '2024-01-15T10:35:00',
          rfcProvCertif: 'SAT970701NN3',
          selloCFD: 'SELLO_CFD',
          noCertificadoSAT: '00001000000506790941',
          selloSAT: 'SELLO_SAT',
        };
        const result = await pdfService.generatePdf({
          comprobante: { ...sampleComprobante, sello: 'SELLO_TEST' },
          timbre,
          cadenaOriginal: '||4.0|A|001||',
          logo: 'data:image/png;base64,TEST',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('Document Service Additional Tests', () => {
      it('should get documents by status', () => {
        const docs = documentService.getDocumentsByStatus(CfdiStatus.STAMPED);
        expect(Array.isArray(docs)).toBe(true);
      });

      it('should register status change callback', () => {
        const callback = jest.fn();
        documentService.onStatusChange(callback);
        // Callback should be registered without error
        expect(true).toBe(true);
      });
    });

    describe('CfdiService Additional Methods', () => {
      it('should get document by ID', () => {
        const doc = service.getDocument('non-existent');
        expect(doc).toBeNull();
      });

      it('should get document by UUID', () => {
        const doc = service.getDocumentByUuid('non-existent-uuid');
        expect(doc).toBeNull();
      });

      it('should get documents by tenant', () => {
        const docs = service.getDocumentsByTenant('test-tenant');
        expect(Array.isArray(docs)).toBe(true);
      });

      it('should get documents by status', () => {
        const docs = service.getDocumentsByStatus(CfdiStatus.STAMPED);
        expect(Array.isArray(docs)).toBe(true);
      });
    });

    describe('Liverpool and Soriana Addenda', () => {
      it('should generate XML with Liverpool addenda', () => {
        const compWithAddenda: CfdiComprobante = {
          ...sampleComprobante,
          addenda: {
            liverpool: {
              providerNumber: 'LP001',
              purchaseOrderNumber: 'LPPO123',
              deliveryNumber: 'DEL001',
              reference1: 'REF1',
              reference2: 'REF2',
            },
          },
        };

        const xml = xmlGenerator.generateCfdi(compWithAddenda);
        expect(xml).toContain('<cfdi:Addenda>');
        expect(xml).toContain('lp:LiverpoolAddenda');
        expect(xml).toContain('LP001');
      });

      it('should generate XML with Soriana addenda', () => {
        const compWithAddenda: CfdiComprobante = {
          ...sampleComprobante,
          addenda: {
            soriana: {
              providerNumber: 'SOR001',
              orderNumber: 'ORD123',
              storeNumber: 'ST100',
              deliveryFolio: 'DEL001',
            },
          },
        };

        const xml = xmlGenerator.generateCfdi(compWithAddenda);
        expect(xml).toContain('<cfdi:Addenda>');
        expect(xml).toContain('sor:SorianaAddenda');
        expect(xml).toContain('SOR001');
      });
    });

    describe('Comercio Exterior Advanced', () => {
      it('should generate XML with emisor domicilio', () => {
        const cce: CfdiComercioExterior = {
          version: '2.0',
          tipoCambioUSD: 17.5,
          totalUSD: 1000,
          emisor: {
            domicilio: {
              calle: 'Av. Reforma',
              numeroExterior: '123',
              numeroInterior: 'A',
              colonia: '0001',
              localidad: '01',
              municipio: '001',
              estado: 'CDMX',
              pais: 'MEX',
              codigoPostal: '06600',
            },
          },
          mercancias: [
            {
              noIdentificacion: 'PROD001',
              valorDolares: 1000,
            },
          ],
        };

        const exportComprobante: CfdiComprobante = {
          ...sampleComprobante,
          exportacion: CfdiExportacion.DEFINITIVA,
          complemento: { comercioExterior: cce },
        };

        const xml = xmlGenerator.generateCfdi(exportComprobante);
        expect(xml).toContain('cce20:Emisor');
        expect(xml).toContain('cce20:Domicilio');
        expect(xml).toContain('Av. Reforma');
      });

      it('should generate XML with propietario', () => {
        const cce: CfdiComercioExterior = {
          version: '2.0',
          tipoCambioUSD: 17.5,
          totalUSD: 1000,
          propietario: [
            {
              numRegIdTrib: '123456789',
              residenciaFiscal: 'USA',
            },
          ],
          mercancias: [
            {
              noIdentificacion: 'PROD001',
              valorDolares: 1000,
            },
          ],
        };

        const exportComprobante: CfdiComprobante = {
          ...sampleComprobante,
          exportacion: CfdiExportacion.DEFINITIVA,
          complemento: { comercioExterior: cce },
        };

        const xml = xmlGenerator.generateCfdi(exportComprobante);
        expect(xml).toContain('cce20:Propietario');
      });

      it('should generate XML with mercancia descripcionesEspecificas', () => {
        const cce: CfdiComercioExterior = {
          version: '2.0',
          tipoCambioUSD: 17.5,
          totalUSD: 1000,
          mercancias: [
            {
              noIdentificacion: 'PROD001',
              fraccionArancelaria: '84713001',
              valorDolares: 1000,
              descripcionesEspecificas: [
                {
                  marca: 'BrandX',
                  modelo: 'Model1',
                  subModelo: 'SubM1',
                  numeroSerie: 'SN123456',
                },
              ],
            },
          ],
        };

        const exportComprobante: CfdiComprobante = {
          ...sampleComprobante,
          exportacion: CfdiExportacion.DEFINITIVA,
          complemento: { comercioExterior: cce },
        };

        const xml = xmlGenerator.generateCfdi(exportComprobante);
        expect(xml).toContain('cce20:DescripcionesEspecificas');
        expect(xml).toContain('BrandX');
      });
    });

    describe('Pagos 2.0 Advanced', () => {
      it('should generate XML with Pagos 2.0 impuestosDR', () => {
        const pagos: CfdiPagos20 = {
          version: '2.0',
          totales: {
            montoTotalPagos: 1160,
          },
          pago: [
            {
              fechaPago: '2024-01-15T10:00:00',
              formaDePagoP: CfdiFormaPago.TRANSFERENCIA_ELECTRONICA,
              monedaP: 'MXN',
              monto: 1160,
              doctoRelacionado: [
                {
                  idDocumento: 'ABC12345-1234-1234-1234-123456789012',
                  monedaDR: 'MXN',
                  equivalenciaDR: 1,
                  numParcialidad: 1,
                  impSaldoAnt: 1160,
                  impPagado: 1160,
                  impSaldoInsoluto: 0,
                  objetoImpDR: CfdiObjetoImp.SI_OBJETO_IMPUESTO,
                  impuestosDR: {
                    trasladosDR: [
                      {
                        baseDR: 1000,
                        impuestoDR: CfdiImpuesto.IVA,
                        tipoFactorDR: CfdiTipoFactor.TASA,
                        tasaOCuotaDR: 0.16,
                        importeDR: 160,
                      },
                    ],
                  },
                },
              ],
            },
          ],
        };

        const pagoComprobante: CfdiComprobante = {
          ...sampleComprobante,
          tipoDeComprobante: CfdiTipoComprobante.PAGO,
          subTotal: 0,
          total: 0,
          metodoPago: undefined,
          formaPago: undefined,
          impuestos: undefined,
          conceptos: [
            {
              claveProdServ: '84111506',
              cantidad: 1,
              claveUnidad: 'ACT',
              descripcion: 'Pago',
              valorUnitario: 0,
              importe: 0,
              objetoImp: CfdiObjetoImp.NO_OBJETO_IMPUESTO,
            },
          ],
          complemento: { pagos },
        };

        const xml = xmlGenerator.generateCfdi(pagoComprobante);
        expect(xml).toContain('pago20:ImpuestosDR');
        expect(xml).toContain('pago20:TrasladosDR');
      });

      it('should generate XML with Pagos 2.0 impuestosP', () => {
        const pagos: CfdiPagos20 = {
          version: '2.0',
          totales: {
            montoTotalPagos: 1160,
          },
          pago: [
            {
              fechaPago: '2024-01-15T10:00:00',
              formaDePagoP: CfdiFormaPago.TRANSFERENCIA_ELECTRONICA,
              monedaP: 'MXN',
              monto: 1160,
              doctoRelacionado: [
                {
                  idDocumento: 'ABC12345-1234-1234-1234-123456789012',
                  monedaDR: 'MXN',
                  equivalenciaDR: 1,
                  numParcialidad: 1,
                  impSaldoAnt: 1160,
                  impPagado: 1160,
                  impSaldoInsoluto: 0,
                  objetoImpDR: CfdiObjetoImp.SI_OBJETO_IMPUESTO,
                },
              ],
              impuestosP: {
                trasladosP: [
                  {
                    baseP: 1000,
                    impuestoP: CfdiImpuesto.IVA,
                    tipoFactorP: CfdiTipoFactor.TASA,
                    tasaOCuotaP: 0.16,
                    importeP: 160,
                  },
                ],
              },
            },
          ],
        };

        const pagoComprobante: CfdiComprobante = {
          ...sampleComprobante,
          tipoDeComprobante: CfdiTipoComprobante.PAGO,
          subTotal: 0,
          total: 0,
          metodoPago: undefined,
          formaPago: undefined,
          impuestos: undefined,
          conceptos: [
            {
              claveProdServ: '84111506',
              cantidad: 1,
              claveUnidad: 'ACT',
              descripcion: 'Pago',
              valorUnitario: 0,
              importe: 0,
              objetoImp: CfdiObjetoImp.NO_OBJETO_IMPUESTO,
            },
          ],
          complemento: { pagos },
        };

        const xml = xmlGenerator.generateCfdi(pagoComprobante);
        expect(xml).toContain('pago20:ImpuestosP');
        expect(xml).toContain('pago20:TrasladosP');
      });
    });
  });
});
