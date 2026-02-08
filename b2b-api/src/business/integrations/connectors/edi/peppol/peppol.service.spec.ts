import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PeppolService, CreateInvoiceOptions } from './services/peppol.service';
import { UblInvoiceGeneratorService } from './services/ubl-invoice-generator.service';
import { UblCreditNoteGeneratorService } from './services/ubl-creditnote-generator.service';
import { PeppolValidatorService } from './services/peppol-validator.service';
import { SmpLookupService } from './services/smp-lookup.service';
import { AccessPointService } from './services/access-point.service';
import { DocumentStatusService } from './services/document-status.service';
import { XRechnungService } from './services/xrechnung.service';
import { PdfA3GeneratorService } from './services/pdfa3-generator.service';
import {
  UblInvoice,
  UblCreditNote,
  PeppolParticipant,
  PeppolDocumentStatus,
  UblTaxCategory,
} from './interfaces';

describe('PeppolService', () => {
  let module: TestingModule;
  let peppolService: PeppolService;
  let invoiceGenerator: UblInvoiceGeneratorService;
  let creditNoteGenerator: UblCreditNoteGeneratorService;
  let validator: PeppolValidatorService;
  let smpLookup: SmpLookupService;
  let accessPoint: AccessPointService;
  let statusService: DocumentStatusService;
  let xRechnungService: XRechnungService;
  let pdfGenerator: PdfA3GeneratorService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        PEPPOL_AP_URL: 'https://ap.test.peppol.example.com',
        PEPPOL_AP_API_KEY: 'test-api-key',
        PEPPOL_SENDER_ID: '7300010000001',
        PEPPOL_SENDER_SCHEME: '0088',
        PEPPOL_SML_DOMAIN: 'test.sml.peppol.example.com',
      };
      return config[key] || defaultValue;
    }),
  };

  const createSampleInvoice = (): UblInvoice => ({
    ublVersionId: '2.1',
    customizationId: 'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0',
    profileId: 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0',
    id: 'INV-2024-001',
    issueDate: '2024-01-15',
    dueDate: '2024-02-15',
    invoiceTypeCode: '380',
    documentCurrencyCode: 'EUR',
    buyerReference: 'PO-12345',
    accountingSupplierParty: {
      party: {
        endpointId: { schemeId: '0088', value: '7300010000001' },
        partyName: [{ name: 'Seller Company Ltd' }],
        postalAddress: {
          streetName: '123 Seller Street',
          cityName: 'Stockholm',
          postalZone: '11122',
          country: { identificationCode: 'SE' },
        },
        partyTaxScheme: [{ companyId: 'SE123456789001', taxScheme: { id: 'VAT' } }],
        partyLegalEntity: [{ registrationName: 'Seller Company Ltd' }],
        contact: {
          name: 'Sales Department',
          telephone: '+46123456789',
          electronicMail: 'sales@seller.example.com',
        },
      },
    },
    accountingCustomerParty: {
      party: {
        endpointId: { schemeId: '0088', value: '7300020000002' },
        partyName: [{ name: 'Buyer Company Ltd' }],
        postalAddress: {
          streetName: '456 Buyer Avenue',
          cityName: 'Oslo',
          postalZone: '0150',
          country: { identificationCode: 'NO' },
        },
        partyTaxScheme: [{ companyId: 'NO987654321MVA', taxScheme: { id: 'VAT' } }],
        partyLegalEntity: [{ registrationName: 'Buyer Company Ltd' }],
      },
    },
    paymentMeans: [
      {
        paymentMeansCode: { value: '30', name: 'Credit transfer' },
        paymentDueDate: '2024-02-15',
        payeeFinancialAccount: {
          id: 'SE4550000000058398257466',
          financialInstitutionBranch: { id: 'SWEDSESS' },
        },
      },
    ],
    taxTotal: [
      {
        taxAmount: { currencyId: 'EUR', value: 250.0 },
        taxSubtotal: [
          {
            taxableAmount: { currencyId: 'EUR', value: 1000.0 },
            taxAmount: { currencyId: 'EUR', value: 250.0 },
            taxCategory: {
              id: 'S',
              percent: 25,
              taxScheme: { id: 'VAT' },
            },
          },
        ],
      },
    ],
    legalMonetaryTotal: {
      lineExtensionAmount: { currencyId: 'EUR', value: 1000.0 },
      taxExclusiveAmount: { currencyId: 'EUR', value: 1000.0 },
      taxInclusiveAmount: { currencyId: 'EUR', value: 1250.0 },
      payableAmount: { currencyId: 'EUR', value: 1250.0 },
    },
    invoiceLine: [
      {
        id: '1',
        invoicedQuantity: { unitCode: 'EA', value: 10 },
        lineExtensionAmount: { currencyId: 'EUR', value: 1000.0 },
        item: {
          name: 'Product A',
          description: ['High quality product'],
          sellersItemIdentification: { id: 'PROD-A-001' },
          classifiedTaxCategory: {
            id: 'S',
            percent: 25,
            taxScheme: { id: 'VAT' },
          },
        },
        price: {
          priceAmount: { currencyId: 'EUR', value: 100.0 },
        },
      },
    ],
  });

  const createSampleCreditNote = (): UblCreditNote => ({
    ublVersionId: '2.1',
    customizationId: 'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0',
    profileId: 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0',
    id: 'CN-2024-001',
    issueDate: '2024-01-20',
    creditNoteTypeCode: '381',
    documentCurrencyCode: 'EUR',
    billingReference: [
      {
        invoiceDocumentReference: { id: 'INV-2024-001', issueDate: '2024-01-15' },
      },
    ],
    accountingSupplierParty: {
      party: {
        endpointId: { schemeId: '0088', value: '7300010000001' },
        partyName: [{ name: 'Seller Company Ltd' }],
        postalAddress: {
          streetName: '123 Seller Street',
          cityName: 'Stockholm',
          postalZone: '11122',
          country: { identificationCode: 'SE' },
        },
        partyLegalEntity: [{ registrationName: 'Seller Company Ltd' }],
      },
    },
    accountingCustomerParty: {
      party: {
        endpointId: { schemeId: '0088', value: '7300020000002' },
        partyName: [{ name: 'Buyer Company Ltd' }],
        postalAddress: {
          streetName: '456 Buyer Avenue',
          cityName: 'Oslo',
          postalZone: '0150',
          country: { identificationCode: 'NO' },
        },
        partyLegalEntity: [{ registrationName: 'Buyer Company Ltd' }],
      },
    },
    taxTotal: [
      {
        taxAmount: { currencyId: 'EUR', value: 25.0 },
        taxSubtotal: [
          {
            taxableAmount: { currencyId: 'EUR', value: 100.0 },
            taxAmount: { currencyId: 'EUR', value: 25.0 },
            taxCategory: {
              id: 'S',
              percent: 25,
              taxScheme: { id: 'VAT' },
            },
          },
        ],
      },
    ],
    legalMonetaryTotal: {
      lineExtensionAmount: { currencyId: 'EUR', value: 100.0 },
      taxExclusiveAmount: { currencyId: 'EUR', value: 100.0 },
      taxInclusiveAmount: { currencyId: 'EUR', value: 125.0 },
      payableAmount: { currencyId: 'EUR', value: 125.0 },
    },
    creditNoteLine: [
      {
        id: '1',
        creditedQuantity: { unitCode: 'EA', value: 1 },
        lineExtensionAmount: { currencyId: 'EUR', value: 100.0 },
        item: {
          name: 'Product A (Return)',
          classifiedTaxCategory: {
            id: 'S',
            percent: 25,
            taxScheme: { id: 'VAT' },
          },
        },
        price: {
          priceAmount: { currencyId: 'EUR', value: 100.0 },
        },
      },
    ],
  });

  const createSampleParticipant = (): PeppolParticipant => ({
    scheme: '0088',
    identifier: '7300010000001',
    name: 'Test Company',
    countryCode: 'SE',
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        PeppolService,
        UblInvoiceGeneratorService,
        UblCreditNoteGeneratorService,
        PeppolValidatorService,
        SmpLookupService,
        AccessPointService,
        DocumentStatusService,
        XRechnungService,
        PdfA3GeneratorService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    peppolService = module.get<PeppolService>(PeppolService);
    invoiceGenerator = module.get<UblInvoiceGeneratorService>(UblInvoiceGeneratorService);
    creditNoteGenerator = module.get<UblCreditNoteGeneratorService>(UblCreditNoteGeneratorService);
    validator = module.get<PeppolValidatorService>(PeppolValidatorService);
    smpLookup = module.get<SmpLookupService>(SmpLookupService);
    accessPoint = module.get<AccessPointService>(AccessPointService);
    statusService = module.get<DocumentStatusService>(DocumentStatusService);
    xRechnungService = module.get<XRechnungService>(XRechnungService);
    pdfGenerator = module.get<PdfA3GeneratorService>(PdfA3GeneratorService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('PeppolService (Main Facade)', () => {
    it('should be defined', () => {
      expect(peppolService).toBeDefined();
    });

    it('should generate invoice XML', () => {
      const invoice = createSampleInvoice();
      const xml = peppolService.generateInvoiceXml(invoice);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<Invoice');
      expect(xml).toContain('INV-2024-001');
      expect(xml).toContain('Seller Company Ltd');
    });

    it('should generate credit note XML', () => {
      const creditNote = createSampleCreditNote();
      const xml = peppolService.generateCreditNoteXml(creditNote);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<CreditNote');
      expect(xml).toContain('CN-2024-001');
    });

    it('should validate invoice', () => {
      const invoice = createSampleInvoice();
      const result = peppolService.validateInvoice(invoice);

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate credit note', () => {
      const creditNote = createSampleCreditNote();
      const result = peppolService.validateCreditNote(creditNote);

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });

    it('should get document statistics', () => {
      const stats = peppolService.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.total).toBe(0);
      expect(stats.byStatus).toBeDefined();
      expect(stats.byType).toBeDefined();
    });

    it('should parse participant ID', () => {
      const result = peppolService.parseParticipantId('0088:7300010000001');

      expect(result).toBeDefined();
      expect(result?.scheme).toBe('0088');
      expect(result?.identifier).toBe('7300010000001');
    });

    it('should format participant ID', () => {
      const participant = createSampleParticipant();
      const formatted = peppolService.formatParticipantId(participant);

      expect(formatted).toBe('0088:7300010000001');
    });
  });

  describe('UblInvoiceGeneratorService', () => {
    it('should generate valid UBL 2.1 Invoice XML', () => {
      const invoice = createSampleInvoice();
      const xml = invoiceGenerator.generateInvoice(invoice);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"');
      expect(xml).toContain(
        'xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"',
      );
      expect(xml).toContain(
        'xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"',
      );
    });

    it('should include customization ID', () => {
      const invoice = createSampleInvoice();
      const xml = invoiceGenerator.generateInvoice(invoice);

      expect(xml).toContain('<cbc:CustomizationID>urn:cen.eu:en16931:2017');
    });

    it('should include profile ID', () => {
      const invoice = createSampleInvoice();
      const xml = invoiceGenerator.generateInvoice(invoice);

      expect(xml).toContain(
        '<cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>',
      );
    });

    it('should include seller party information', () => {
      const invoice = createSampleInvoice();
      const xml = invoiceGenerator.generateInvoice(invoice);

      expect(xml).toContain('<cac:AccountingSupplierParty>');
      expect(xml).toContain('Seller Company Ltd');
      expect(xml).toContain('Stockholm');
      expect(xml).toContain('SE');
    });

    it('should include buyer party information', () => {
      const invoice = createSampleInvoice();
      const xml = invoiceGenerator.generateInvoice(invoice);

      expect(xml).toContain('<cac:AccountingCustomerParty>');
      expect(xml).toContain('Buyer Company Ltd');
      expect(xml).toContain('Oslo');
      expect(xml).toContain('NO');
    });

    it('should include payment means', () => {
      const invoice = createSampleInvoice();
      const xml = invoiceGenerator.generateInvoice(invoice);

      expect(xml).toContain('<cac:PaymentMeans>');
      expect(xml).toContain('<cbc:PaymentMeansCode');
      expect(xml).toContain('30');
    });

    it('should include tax total', () => {
      const invoice = createSampleInvoice();
      const xml = invoiceGenerator.generateInvoice(invoice);

      expect(xml).toContain('<cac:TaxTotal>');
      expect(xml).toContain('250.00');
    });

    it('should include invoice lines', () => {
      const invoice = createSampleInvoice();
      const xml = invoiceGenerator.generateInvoice(invoice);

      expect(xml).toContain('<cac:InvoiceLine>');
      expect(xml).toContain('Product A');
      expect(xml).toContain('<cbc:InvoicedQuantity');
    });

    it('should escape XML special characters', () => {
      const invoice = createSampleInvoice();
      invoice.invoiceLine[0].item.name = 'Product <A> & "B"';
      const xml = invoiceGenerator.generateInvoice(invoice);

      expect(xml).toContain('&lt;A&gt;');
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&quot;B&quot;');
    });
  });

  describe('UblCreditNoteGeneratorService', () => {
    it('should generate valid UBL 2.1 Credit Note XML', () => {
      const creditNote = createSampleCreditNote();
      const xml = creditNoteGenerator.generateCreditNote(creditNote);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"');
    });

    it('should include credit note type code', () => {
      const creditNote = createSampleCreditNote();
      const xml = creditNoteGenerator.generateCreditNote(creditNote);

      expect(xml).toContain('<cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode>');
    });

    it('should include billing reference', () => {
      const creditNote = createSampleCreditNote();
      const xml = creditNoteGenerator.generateCreditNote(creditNote);

      expect(xml).toContain('<cac:BillingReference>');
      expect(xml).toContain('INV-2024-001');
    });

    it('should include credit note lines', () => {
      const creditNote = createSampleCreditNote();
      const xml = creditNoteGenerator.generateCreditNote(creditNote);

      expect(xml).toContain('<cac:CreditNoteLine>');
      expect(xml).toContain('<cbc:CreditedQuantity');
    });
  });

  describe('PeppolValidatorService', () => {
    it('should validate a complete invoice', () => {
      const invoice = createSampleInvoice();
      const result = validator.validateInvoice(invoice);

      expect(result.valid).toBe(true);
      expect(result.profile).toBe('Peppol BIS Billing 3.0');
    });

    it('should detect missing invoice ID (BR-01)', () => {
      const invoice = createSampleInvoice();
      invoice.id = '';
      const result = validator.validateInvoice(invoice);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'BR-01')).toBe(true);
    });

    it('should detect missing issue date (BR-02)', () => {
      const invoice = createSampleInvoice();
      invoice.issueDate = '';
      const result = validator.validateInvoice(invoice);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'BR-02')).toBe(true);
    });

    it('should detect invalid invoice type code (BR-04)', () => {
      const invoice = createSampleInvoice();
      invoice.invoiceTypeCode = '999';
      const result = validator.validateInvoice(invoice);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'BR-04')).toBe(true);
    });

    it('should detect missing seller name (BR-06)', () => {
      const invoice = createSampleInvoice();
      invoice.accountingSupplierParty.party.partyLegalEntity = [];
      invoice.accountingSupplierParty.party.partyName = [];
      const result = validator.validateInvoice(invoice);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'BR-06')).toBe(true);
    });

    it('should detect missing invoice lines (BR-13)', () => {
      const invoice = createSampleInvoice();
      invoice.invoiceLine = [];
      const result = validator.validateInvoice(invoice);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'BR-13')).toBe(true);
    });

    it('should validate line extension sum (BR-CO-10)', () => {
      const invoice = createSampleInvoice();
      invoice.legalMonetaryTotal.lineExtensionAmount.value = 500; // Wrong sum
      const result = validator.validateInvoice(invoice);

      expect(result.errors.some((e) => e.code === 'BR-CO-10')).toBe(true);
    });

    it('should validate credit note', () => {
      const creditNote = createSampleCreditNote();
      const result = validator.validateCreditNote(creditNote);

      expect(result.valid).toBe(true);
    });

    it('should warn about missing billing reference in credit note (BR-55)', () => {
      const creditNote = createSampleCreditNote();
      creditNote.billingReference = [];
      const result = validator.validateCreditNote(creditNote);

      expect(result.warnings.some((e) => e.code === 'BR-55')).toBe(true);
    });
  });

  describe('SmpLookupService', () => {
    it('should parse participant ID', () => {
      const result = smpLookup.parseParticipantId('0088:7300010000001');

      expect(result).toBeDefined();
      expect(result?.scheme).toBe('0088');
      expect(result?.identifier).toBe('7300010000001');
    });

    it('should return null for invalid participant ID', () => {
      const result = smpLookup.parseParticipantId('invalid');

      expect(result).toBeNull();
    });

    it('should validate valid participant ID', () => {
      const participant = createSampleParticipant();
      const result = smpLookup.isValidParticipantId(participant);

      expect(result).toBe(true);
    });

    it('should reject invalid scheme', () => {
      const participant = { scheme: 'invalid', identifier: '123' };
      const result = smpLookup.isValidParticipantId(participant);

      expect(result).toBe(false);
    });

    it('should get invoice document type', () => {
      const docType = smpLookup.getInvoiceDocumentType();

      expect(docType).toBeDefined();
      expect(docType.identifier).toContain('Invoice');
    });

    it('should get credit note document type', () => {
      const docType = smpLookup.getCreditNoteDocumentType();

      expect(docType).toBeDefined();
      expect(docType.identifier).toContain('CreditNote');
    });

    it('should get billing process', () => {
      const process = smpLookup.getBillingProcess();

      expect(process).toBeDefined();
      expect(process.identifier).toContain('billing');
    });

    it('should lookup participant', async () => {
      const participant = createSampleParticipant();
      const result = await smpLookup.lookupParticipant(participant);

      expect(result).toBeDefined();
      expect(result.found).toBe(true);
    });
  });

  describe('AccessPointService', () => {
    it('should generate unique message IDs', () => {
      const participant = createSampleParticipant();
      const id1 = (accessPoint as any).generateMessageId();
      const id2 = (accessPoint as any).generateMessageId();

      expect(id1).not.toBe(id2);
      expect(id1).toContain('b2b-peppol');
    });

    it('should get sender participant from config', () => {
      const sender = accessPoint.getSenderParticipant();

      expect(sender).toBeDefined();
      expect(sender.scheme).toBe('0088');
      expect(sender.identifier).toBe('7300010000001');
    });

    it('should validate connection', async () => {
      const result = await accessPoint.validateConnection();

      expect(typeof result).toBe('boolean');
    });

    it('should send invoice', async () => {
      const sender = createSampleParticipant();
      const receiver = { ...createSampleParticipant(), identifier: '7300020000002' };
      const xml = '<Invoice/>';

      const result = await accessPoint.sendInvoice(sender, receiver, xml);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send credit note', async () => {
      const sender = createSampleParticipant();
      const receiver = { ...createSampleParticipant(), identifier: '7300020000002' };
      const xml = '<CreditNote/>';

      const result = await accessPoint.sendCreditNote(sender, receiver, xml);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('DocumentStatusService', () => {
    it('should create document', () => {
      const invoice = createSampleInvoice();
      const sender = createSampleParticipant();
      const receiver = { ...createSampleParticipant(), identifier: '7300020000002' };

      const doc = statusService.createDocument('invoice', invoice, sender, receiver);

      expect(doc).toBeDefined();
      expect(doc.documentId).toBeDefined();
      expect(doc.status).toBe(PeppolDocumentStatus.DRAFT);
      expect(doc.documentType).toBe('invoice');
    });

    it('should get document by ID', () => {
      const invoice = createSampleInvoice();
      const sender = createSampleParticipant();
      const receiver = { ...createSampleParticipant(), identifier: '7300020000002' };

      const created = statusService.createDocument('invoice', invoice, sender, receiver);
      const retrieved = statusService.getDocument(created.documentId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.documentId).toBe(created.documentId);
    });

    it('should return null for non-existent document', () => {
      const result = statusService.getDocument('non-existent');

      expect(result).toBeNull();
    });

    it('should get all documents', () => {
      const invoice = createSampleInvoice();
      const sender = createSampleParticipant();
      const receiver = { ...createSampleParticipant(), identifier: '7300020000002' };

      statusService.createDocument('invoice', invoice, sender, receiver);
      statusService.createDocument('invoice', { ...invoice, id: 'INV-002' }, sender, receiver);

      const all = statusService.getAllDocuments();

      expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('should track status history', () => {
      const invoice = createSampleInvoice();
      const sender = createSampleParticipant();
      const receiver = { ...createSampleParticipant(), identifier: '7300020000002' };

      const doc = statusService.createDocument('invoice', invoice, sender, receiver);
      const history = statusService.getStatusHistory(doc.documentId);

      expect(history).toBeDefined();
      expect(history.length).toBe(1);
      expect(history[0].status).toBe(PeppolDocumentStatus.DRAFT);
    });

    it('should transition status', async () => {
      const invoice = createSampleInvoice();
      const sender = createSampleParticipant();
      const receiver = { ...createSampleParticipant(), identifier: '7300020000002' };

      const doc = statusService.createDocument('invoice', invoice, sender, receiver);
      const result = await statusService.transitionStatus(
        doc.documentId,
        PeppolDocumentStatus.VALIDATED,
        'Validated successfully',
      );

      expect(result).toBe(true);
      const updated = statusService.getDocument(doc.documentId);
      expect(updated?.status).toBe(PeppolDocumentStatus.VALIDATED);
    });

    it('should reject invalid status transitions', async () => {
      const invoice = createSampleInvoice();
      const sender = createSampleParticipant();
      const receiver = { ...createSampleParticipant(), identifier: '7300020000002' };

      const doc = statusService.createDocument('invoice', invoice, sender, receiver);
      // DRAFT cannot go directly to DELIVERED
      const result = await statusService.transitionStatus(
        doc.documentId,
        PeppolDocumentStatus.DELIVERED,
      );

      expect(result).toBe(false);
    });

    it('should validate document and update status', async () => {
      const invoice = createSampleInvoice();
      const sender = createSampleParticipant();
      const receiver = { ...createSampleParticipant(), identifier: '7300020000002' };

      const doc = statusService.createDocument('invoice', invoice, sender, receiver);
      const result = await statusService.validateDocument(doc.documentId);

      expect(result.valid).toBe(true);
      const updated = statusService.getDocument(doc.documentId);
      expect(updated?.status).toBe(PeppolDocumentStatus.VALIDATED);
    });

    it('should delete document', () => {
      const invoice = createSampleInvoice();
      const sender = createSampleParticipant();
      const receiver = { ...createSampleParticipant(), identifier: '7300020000002' };

      const doc = statusService.createDocument('invoice', invoice, sender, receiver);
      const deleted = statusService.deleteDocument(doc.documentId);

      expect(deleted).toBe(true);
      expect(statusService.getDocument(doc.documentId)).toBeNull();
    });
  });

  describe('XRechnungService', () => {
    it('should apply XRechnung extension to invoice', () => {
      const invoice = createSampleInvoice();
      invoice.buyerReference = undefined; // Clear existing buyer reference
      const extension = { leitwegId: '04011000-12345-67' };

      const result = xRechnungService.applyXRechnungExtension(invoice, extension);

      expect(result.customizationId).toContain('xrechnung');
      // Leitweg-ID is added to additionalDocumentReference, not necessarily as buyerReference
      expect(
        result.additionalDocumentReference?.some(
          (ref) => ref.id.schemeId === 'Leitweg-ID' && ref.id.value === '04011000-12345-67',
        ),
      ).toBe(true);
    });

    it('should validate Leitweg-ID format', () => {
      const errors: any[] = [];
      const warnings: any[] = [];

      const invoice = createSampleInvoice();
      invoice.buyerReference = '04011000-12345-67';

      xRechnungService.validateLeitwegId(invoice, errors, warnings);

      expect(errors.length).toBe(0);
    });

    it('should reject invalid Leitweg-ID format', () => {
      const errors: any[] = [];
      const warnings: any[] = [];

      const invoice = createSampleInvoice();
      // Add invalid Leitweg-ID in additionalDocumentReference
      invoice.additionalDocumentReference = [
        {
          id: { schemeId: 'Leitweg-ID', value: 'invalid-format' },
        },
      ];

      xRechnungService.validateLeitwegId(invoice, errors, warnings);

      expect(errors.some((e) => e.code === 'BR-DE-17')).toBe(true);
    });

    it('should parse valid Leitweg-ID', () => {
      const result = xRechnungService.parseLeitwegId('04011000-12345-67');

      expect(result.valid).toBe(true);
      expect(result.coarseRouting).toBe('04011000');
      expect(result.fineRouting).toBe('12345');
      expect(result.checkDigits).toBe('67');
    });

    it('should reject invalid Leitweg-ID', () => {
      const result = xRechnungService.parseLeitwegId('invalid');

      expect(result.valid).toBe(false);
    });

    it('should validate XRechnung invoice', () => {
      const invoice = createSampleInvoice();
      // Add required XRechnung fields
      invoice.accountingSupplierParty.party.contact = {
        name: 'Sales',
        telephone: '+49123456789',
        electronicMail: 'sales@example.de',
      };
      invoice.buyerReference = '04011000-12345-67';

      const result = xRechnungService.validateXRechnung(invoice);

      // May have warnings but should not have critical errors
      expect(result.errors.filter((e) => e.code === 'BR-DE-3').length).toBe(0);
      expect(result.errors.filter((e) => e.code === 'BR-DE-4').length).toBe(0);
    });

    it('should detect missing seller telephone for XRechnung', () => {
      const invoice = createSampleInvoice();
      invoice.accountingSupplierParty.party.contact = {
        electronicMail: 'test@example.com',
      };

      const result = xRechnungService.validateXRechnung(invoice);

      expect(result.errors.some((e) => e.code === 'BR-DE-3')).toBe(true);
    });

    it('should detect missing seller email for XRechnung', () => {
      const invoice = createSampleInvoice();
      invoice.accountingSupplierParty.party.contact = {
        telephone: '+49123456789',
      };

      const result = xRechnungService.validateXRechnung(invoice);

      expect(result.errors.some((e) => e.code === 'BR-DE-4')).toBe(true);
    });
  });

  describe('PdfA3GeneratorService', () => {
    it('should be supported', () => {
      expect(pdfGenerator.isSupported()).toBe(true);
    });

    it('should generate PDF/A-3 for invoice', async () => {
      const invoice = createSampleInvoice();
      const xml = invoiceGenerator.generateInvoice(invoice);

      const result = await pdfGenerator.generatePdfA3({
        document: invoice,
        xmlContent: xml,
      });

      expect(result.success).toBe(true);
      expect(result.pdf).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should include document metadata', async () => {
      const invoice = createSampleInvoice();
      const xml = invoiceGenerator.generateInvoice(invoice);

      const result = await pdfGenerator.generatePdfA3({
        document: invoice,
        xmlContent: xml,
        metadata: {
          title: 'Custom Title',
          author: 'Custom Author',
        },
      });

      expect(result.metadata?.title).toBe('Custom Title');
      expect(result.metadata?.author).toBe('Custom Author');
    });

    it('should generate PDF for credit note', async () => {
      const creditNote = createSampleCreditNote();
      const xml = creditNoteGenerator.generateCreditNote(creditNote);

      const result = await pdfGenerator.generatePdfA3({
        document: creditNote,
        xmlContent: xml,
      });

      expect(result.success).toBe(true);
      expect(result.pdf).toBeDefined();
    });
  });

  describe('End-to-end workflow', () => {
    it('should complete full invoice workflow', async () => {
      const invoice = createSampleInvoice();
      const sender = createSampleParticipant();
      const receiver = { ...createSampleParticipant(), identifier: '7300020000002' };

      // 1. Create document
      const doc = statusService.createDocument('invoice', invoice, sender, receiver);
      expect(doc.status).toBe(PeppolDocumentStatus.DRAFT);

      // 2. Validate
      const validation = await statusService.validateDocument(doc.documentId);
      expect(validation.valid).toBe(true);

      // 3. Generate XML
      const xml = invoiceGenerator.generateInvoice(invoice);
      statusService.setDocumentXml(doc.documentId, xml);

      // 4. Submit
      const submitResult = await statusService.submitDocument(doc.documentId);
      expect(submitResult.success).toBe(true);

      // 5. Check status
      const finalDoc = statusService.getDocument(doc.documentId);
      expect(finalDoc?.status).toBe(PeppolDocumentStatus.SUBMITTED);
      expect(finalDoc?.statusHistory.length).toBeGreaterThan(1);
    });

    it('should handle validation failure', async () => {
      const invoice = createSampleInvoice();
      invoice.invoiceLine = []; // Invalid - no lines
      const sender = createSampleParticipant();
      const receiver = { ...createSampleParticipant(), identifier: '7300020000002' };

      const doc = statusService.createDocument('invoice', invoice, sender, receiver);
      const validation = await statusService.validateDocument(doc.documentId);

      expect(validation.valid).toBe(false);
      expect(validation.validationResult.errors.length).toBeGreaterThan(0);
    });
  });
});
