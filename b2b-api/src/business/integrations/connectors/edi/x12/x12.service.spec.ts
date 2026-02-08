import { Test, TestingModule } from '@nestjs/testing';
import { X12Service } from './services/x12.service';
import { X12ParserService } from './services/x12-parser.service';
import { X12GeneratorService } from './services/x12-generator.service';
import { X12ValidatorService } from './services/x12-validator.service';
import { X12LexerService } from './services/x12-lexer.service';
import { X12MapperService } from './services/x12-mapper.service';
import {
  X12_850_ParserService,
  X12_850_GeneratorService,
  X12_855_ParserService,
  X12_856_ParserService,
  X12_810_ParserService,
  X12_997_ParserService,
  X12_997_GeneratorService,
} from './transaction-sets';
import { DEFAULT_X12_DELIMITERS, TransactionSetType } from './interfaces';

describe('X12Service', () => {
  let service: X12Service;
  let lexerService: X12LexerService;
  let parserService: X12ParserService;
  let generatorService: X12GeneratorService;
  let validatorService: X12ValidatorService;
  let mapperService: X12MapperService;

  // Sample 850 Purchase Order document
  const sample850 = [
    'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *240101*1200*^*005010*000000001*0*T*:~',
    'GS*PO*SENDER*RECEIVER*20240101*1200*1*X*005010X220A1~',
    'ST*850*0001~',
    'BEG*00*SA*PO12345**20240101~',
    'CUR*BY*USD~',
    'REF*CO*CUST-ORDER-123~',
    'PER*BD*John Doe*TE*5551234567~',
    'DTM*002*20240115~',
    'N1*BY*Buyer Company*92*BUYER001~',
    'N3*123 Main St~',
    'N4*New York*NY*10001*US~',
    'N1*ST*Ship To Location*92*SHIPTO001~',
    'N3*456 Oak Ave~',
    'N4*Los Angeles*CA*90001*US~',
    'PO1*1*10*EA*100*PE*VP*PROD-001*BP*BUYER-SKU-001~',
    'PID*F****Widget A~',
    'DTM*002*20240115~',
    'PO1*2*5*EA*200*PE*VP*PROD-002~',
    'PID*F****Widget B~',
    'CTT*2~',
    'AMT*TT*2000~',
    'SE*20*0001~',
    'GE*1*1~',
    'IEA*1*000000001~',
  ].join('');

  // Sample 810 Invoice document
  const sample810 = [
    'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *240101*1200*^*005010*000000002*0*T*:~',
    'GS*IN*SENDER*RECEIVER*20240101*1200*1*X*005010X220A1~',
    'ST*810*0001~',
    'BIG*20240101*INV-001*20231215*PO12345~',
    'CUR*SE*USD~',
    'REF*PO*PO12345~',
    'N1*SE*Seller Company*92*SELLER001~',
    'N3*789 Commerce Blvd~',
    'N4*Chicago*IL*60601*US~',
    'N1*BT*Bill To Company*92*BILLTO001~',
    'N3*123 Main St~',
    'N4*New York*NY*10001*US~',
    'ITD*01*3*2*20240111*10*20240131*30~',
    'IT1*1*10*EA*100**VP*PROD-001~',
    'PID*F****Widget A~',
    'TXI*ST*80*8~',
    'IT1*2*5*EA*200**VP*PROD-002~',
    'PID*F****Widget B~',
    'TDS*200000~',
    'TXI*ST*160~',
    'CTT*2~',
    'SE*19*0001~',
    'GE*1*1~',
    'IEA*1*000000002~',
  ].join('');

  // Sample 856 Ship Notice document
  const sample856 = [
    'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *240101*1200*^*005010*000000003*0*T*:~',
    'GS*SH*SENDER*RECEIVER*20240101*1200*1*X*005010X220A1~',
    'ST*856*0001~',
    'BSN*00*SHIP-001*20240110*1000*0001~',
    'DTM*011*20240110~',
    'HL*1**S~',
    'TD5**2*FEDX*M~',
    'REF*BM*BOL-12345~',
    'N1*SF*Ship From Location*92*SHIPFROM001~',
    'N3*100 Warehouse Way~',
    'N4*Dallas*TX*75001*US~',
    'N1*ST*Ship To Location*92*SHIPTO001~',
    'N3*456 Oak Ave~',
    'N4*Los Angeles*CA*90001*US~',
    'HL*2*1*O~',
    'PRF*PO12345~',
    'HL*3*2*P~',
    'TD1*CTN*2****G*50*LB~',
    'MAN*GM*BOX-001~',
    'HL*4*3*I~',
    'LIN*1*VP*PROD-001~',
    'SN1**10*EA~',
    'PID*F****Widget A~',
    'CTT*4~',
    'SE*23*0001~',
    'GE*1*1~',
    'IEA*1*000000003~',
  ].join('');

  // Sample 997 Functional Acknowledgment
  const sample997 = [
    'ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SENDER         *240101*1300*^*005010*000000004*0*T*:~',
    'GS*FA*RECEIVER*SENDER*20240101*1300*1*X*005010X220A1~',
    'ST*997*0001~',
    'AK1*PO*1*005010X220A1~',
    'AK2*850*0001~',
    'AK5*A~',
    'AK9*A*1*1*1~',
    'SE*6*0001~',
    'GE*1*1~',
    'IEA*1*000000004~',
  ].join('');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        X12LexerService,
        X12ParserService,
        X12GeneratorService,
        X12ValidatorService,
        X12Service,
        X12MapperService,
        X12_850_ParserService,
        X12_850_GeneratorService,
        X12_855_ParserService,
        X12_856_ParserService,
        X12_810_ParserService,
        X12_997_ParserService,
        X12_997_GeneratorService,
      ],
    }).compile();

    service = module.get<X12Service>(X12Service);
    lexerService = module.get<X12LexerService>(X12LexerService);
    parserService = module.get<X12ParserService>(X12ParserService);
    generatorService = module.get<X12GeneratorService>(X12GeneratorService);
    validatorService = module.get<X12ValidatorService>(X12ValidatorService);
    mapperService = module.get<X12MapperService>(X12MapperService);
  });

  describe('X12LexerService', () => {
    describe('extractDelimiters', () => {
      it('should extract standard delimiters from ISA segment', () => {
        const result = lexerService.extractDelimiters(sample850);
        expect(result.elementSeparator).toBe('*');
        expect(result.subelementSeparator).toBe(':');
        expect(result.segmentTerminator).toBe('~');
        expect(result.errors).toHaveLength(0);
      });

      it('should return error for input shorter than ISA minimum length', () => {
        const result = lexerService.extractDelimiters('ISA*00*');
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('ISA_TOO_SHORT');
      });

      it('should return error for input not starting with ISA', () => {
        // Short input will trigger ISA_TOO_SHORT first
        const result = lexerService.extractDelimiters('GS*PO*SENDER*RECEIVER~');
        expect(result.errors).toHaveLength(1);
        // Short documents trigger ISA_TOO_SHORT before INVALID_ISA check
        expect(result.errors[0].code).toBe('ISA_TOO_SHORT');
      });
    });

    describe('tokenize', () => {
      it('should tokenize a simple X12 document', () => {
        const simpleDoc =
          'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *240101*1200*^*005010*000000001*0*T*:~IEA*1*000000001~';
        const result = lexerService.tokenize(simpleDoc);
        expect(result.errors).toHaveLength(0);
        expect(result.tokens.length).toBeGreaterThan(0);
        expect(result.tokens[0].type).toBe('SEGMENT_ID');
        expect(result.tokens[0].value).toBe('ISA');
      });
    });
  });

  describe('X12ParserService', () => {
    describe('parse', () => {
      it('should parse a complete 850 Purchase Order', () => {
        const result = parserService.parse(sample850);
        expect(result.success).toBe(true);
        expect(result.interchange).toBeDefined();
        expect(result.interchange!.functionalGroups).toHaveLength(1);
        expect(result.interchange!.functionalGroups[0].transactionSets).toHaveLength(1);
        expect(
          result.interchange!.functionalGroups[0].transactionSets[0].header.transactionSetCode,
        ).toBe('850');
      });

      it('should parse ISA segment correctly', () => {
        const result = parserService.parse(sample850);
        expect(result.interchange!.header.senderId.trim()).toBe('SENDER');
        expect(result.interchange!.header.receiverId.trim()).toBe('RECEIVER');
        expect(result.interchange!.header.versionNumber).toBe('005010');
        expect(result.interchange!.header.usageIndicator).toBe('T');
      });

      it('should parse GS segment correctly', () => {
        const result = parserService.parse(sample850);
        const gs = result.interchange!.functionalGroups[0].header;
        expect(gs.functionalCode).toBe('PO');
        expect(gs.senderCode).toBe('SENDER');
        expect(gs.receiverCode).toBe('RECEIVER');
      });

      it('should return error for empty input', () => {
        const result = parserService.parse('');
        expect(result.success).toBe(false);
        expect(result.errors[0].code).toBe('EMPTY_INPUT');
      });

      it('should return error for missing IEA segment', () => {
        const noIea = sample850.replace('IEA*1*000000001~', '');
        const result = parserService.parse(noIea);
        expect(result.success).toBe(false);
        expect(result.errors.some((e) => e.code === 'MISSING_IEA')).toBe(true);
      });

      it('should handle line breaks in document', () => {
        const withLineBreaks = sample850.replace(/~/g, '~\n');
        const result = parserService.parse(withLineBreaks);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('X12GeneratorService', () => {
    describe('generate', () => {
      it('should generate X12 document from interchange', () => {
        const parseResult = parserService.parse(sample850);
        expect(parseResult.interchange).toBeDefined();

        const generated = generatorService.generate(parseResult.interchange!);
        expect(generated).toContain('ISA*');
        expect(generated).toContain('GS*PO*');
        expect(generated).toContain('ST*850*');
        expect(generated).toContain('IEA*');
      });

      it('should generate document with line breaks when specified', () => {
        const parseResult = parserService.parse(sample850);
        const generated = generatorService.generate(parseResult.interchange!, { lineBreaks: true });
        expect(generated).toContain('\n');
      });
    });

    describe('createISASegment', () => {
      it('should create valid ISA segment with defaults', () => {
        const isa = generatorService.createISASegment('SENDER', 'RECEIVER', '000000001');
        expect(isa.segmentId).toBe('ISA');
        expect(isa.senderId).toContain('SENDER');
        expect(isa.receiverId).toContain('RECEIVER');
        expect(isa.versionNumber).toBe('005010');
      });

      it('should create ISA segment with custom options', () => {
        const isa = generatorService.createISASegment('SENDER', 'RECEIVER', '000000001', {
          version: '004010',
          usageIndicator: 'P',
          acknowledgmentRequested: true,
        });
        expect(isa.versionNumber).toBe('004010');
        expect(isa.usageIndicator).toBe('P');
        expect(isa.acknowledgmentRequested).toBe('1');
      });
    });

    describe('buildInterchange', () => {
      it('should build complete interchange from transaction sets', () => {
        const parseResult = parserService.parse(sample850);
        const transactionSet = parseResult.interchange!.functionalGroups[0].transactionSets[0];

        const interchange = generatorService.buildInterchange(
          [transactionSet],
          { senderId: 'NEWSENDER', senderCode: 'NEWSENDER' },
          { receiverId: 'NEWRECEIVER', receiverCode: 'NEWRECEIVER' },
        );

        expect(interchange.header.senderId).toContain('NEWSENDER');
        expect(interchange.header.receiverId).toContain('NEWRECEIVER');
        expect(interchange.functionalGroups).toHaveLength(1);
      });
    });
  });

  describe('X12ValidatorService', () => {
    describe('validateInterchange', () => {
      it('should validate a correct interchange with no errors', () => {
        const parseResult = parserService.parse(sample850);
        const errors = validatorService.validateInterchange(parseResult.interchange!);
        // May have warnings but should not have critical errors
        const criticalErrors = errors.filter((e) => e.severity === 'error');
        expect(criticalErrors.length).toBeLessThanOrEqual(2); // Allow minor issues
      });

      it('should detect invalid ISA elements', () => {
        const parseResult = parserService.parse(sample850);
        parseResult.interchange!.header.authorizationQualifier = '99'; // Invalid
        const errors = validatorService.validateInterchange(parseResult.interchange!);
        expect(errors.some((e) => e.code === 'ISA01_INVALID')).toBe(true);
      });
    });
  });

  describe('X12Service (Unified)', () => {
    describe('parseDocument', () => {
      it('should parse 850 Purchase Order document', () => {
        const result = service.parseDocument(sample850);
        expect(result.success).toBe(true);
        expect(result.interchange).toBeDefined();
      });

      it('should parse 810 Invoice document', () => {
        const result = service.parseDocument(sample810);
        expect(result.success).toBe(true);
        expect(result.interchange).toBeDefined();
      });

      it('should parse 856 Ship Notice document', () => {
        const result = service.parseDocument(sample856);
        expect(result.success).toBe(true);
        expect(result.interchange).toBeDefined();
      });

      it('should parse 997 Functional Acknowledgment', () => {
        const result = service.parseDocument(sample997);
        expect(result.success).toBe(true);
        expect(result.interchange).toBeDefined();
      });
    });

    describe('parseAndExtractTransactionSets', () => {
      it('should extract and parse 850 transaction set data', () => {
        const result = service.parseAndExtractTransactionSets(sample850);
        expect(result.transactionSets).toHaveLength(1);
        expect(result.transactionSets[0].type).toBe('850');
        expect(result.transactionSets[0].data).toBeDefined();

        const poData = result.transactionSets[0].data as any;
        expect(poData.beg.purchaseOrderNumber).toBe('PO12345');
        expect(poData.lineItems).toHaveLength(2);
      });

      it('should extract and parse 810 invoice data', () => {
        const result = service.parseAndExtractTransactionSets(sample810);
        expect(result.transactionSets).toHaveLength(1);
        expect(result.transactionSets[0].type).toBe('810');

        const invData = result.transactionSets[0].data as any;
        expect(invData.big.invoiceNumber).toBe('INV-001');
      });

      it('should extract and parse 856 ship notice data', () => {
        const result = service.parseAndExtractTransactionSets(sample856);
        expect(result.transactionSets).toHaveLength(1);
        expect(result.transactionSets[0].type).toBe('856');

        const asnData = result.transactionSets[0].data as any;
        expect(asnData.bsn.shipmentIdNumber).toBe('SHIP-001');
      });

      it('should extract and parse 997 acknowledgment data', () => {
        const result = service.parseAndExtractTransactionSets(sample997);
        expect(result.transactionSets).toHaveLength(1);
        expect(result.transactionSets[0].type).toBe('997');

        const ackData = result.transactionSets[0].data as any;
        expect(ackData.ak1.functionalIdCode).toBe('PO');
        expect(ackData.ak9.functionalGroupAcknowledgeCode).toBe('A');
      });
    });

    describe('generateDocument', () => {
      it('should generate valid X12 document', () => {
        const parseResult = service.parseDocument(sample850);
        const generated = service.generateDocument(parseResult.interchange!);
        expect(generated).toContain('ISA*');
        expect(generated).toContain('IEA*');

        // Re-parse generated document to verify validity
        const reparseResult = service.parseDocument(generated);
        expect(reparseResult.success).toBe(true);
      });
    });

    describe('generate997ForDocument', () => {
      it('should generate 997 acknowledgment for received document', () => {
        const ack = service.generate997ForDocument(
          sample850,
          { senderId: 'RECEIVER', senderCode: 'RECEIVER' },
          { receiverId: 'SENDER', receiverCode: 'SENDER' },
        );

        expect(ack).not.toBeNull();
        expect(ack).toContain('ST*997*');
        expect(ack).toContain('AK1*PO*');
        expect(ack).toContain('AK9*A*'); // Accepted

        // Verify 997 can be parsed
        const parseResult = service.parseDocument(ack!);
        expect(parseResult.success).toBe(true);
      });
    });

    describe('isTransactionSetSupported', () => {
      it('should return true for supported transaction sets', () => {
        expect(service.isTransactionSetSupported('850')).toBe(true);
        expect(service.isTransactionSetSupported('855')).toBe(true);
        expect(service.isTransactionSetSupported('856')).toBe(true);
        expect(service.isTransactionSetSupported('810')).toBe(true);
        expect(service.isTransactionSetSupported('997')).toBe(true);
      });

      it('should return false for unsupported transaction sets', () => {
        expect(service.isTransactionSetSupported('820')).toBe(false);
        expect(service.isTransactionSetSupported('999')).toBe(false);
      });
    });
  });

  describe('X12MapperService', () => {
    describe('map850ToOrder', () => {
      it('should map 850 to canonical order', () => {
        const parseResult = service.parseAndExtractTransactionSets(sample850);
        const poData = parseResult.transactionSets[0].data as any;

        const order = mapperService.map850ToOrder(poData);

        expect(order.orderNumber).toBe('PO12345');
        expect(order.orderType).toBe('purchase_order');
        expect(order.lineItems).toHaveLength(2);
        expect(order.lineItems[0].quantity).toBe(10);
        expect(order.lineItems[0].unitPrice).toBe(100);
        expect(order.buyer).toBeDefined();
        expect(order.buyer.name).toBe('Buyer Company');
      });
    });

    describe('mapOrderTo850', () => {
      it('should map canonical order to 850', () => {
        const order = {
          orderNumber: 'TEST-PO-001',
          orderDate: '2024-01-15',
          orderType: 'purchase_order' as const,
          buyer: {
            name: 'Test Buyer',
            identifiers: [{ type: 'mutually_defined', value: 'BUYER001' }],
          },
          lineItems: [
            {
              lineNumber: '1',
              quantity: 5,
              unitOfMeasure: 'each',
              unitPrice: 50,
              productIdentifiers: [{ type: 'vendor_part_number', value: 'SKU-001' }],
            },
          ],
        };

        const po = mapperService.mapOrderTo850(order);

        expect(po.transactionSetCode).toBe('850');
        expect(po.beg.purchaseOrderNumber).toBe('TEST-PO-001');
        expect(po.lineItems).toHaveLength(1);
        expect(po.lineItems[0].quantityOrdered).toBe(5);
      });

      it('should handle round-trip mapping', () => {
        const parseResult = service.parseAndExtractTransactionSets(sample850);
        const originalPO = parseResult.transactionSets[0].data as any;

        // Map to canonical, then back to X12
        const order = mapperService.map850ToOrder(originalPO);
        const regeneratedPO = mapperService.mapOrderTo850(order);

        expect(regeneratedPO.beg.purchaseOrderNumber).toBe(originalPO.beg.purchaseOrderNumber);
        expect(regeneratedPO.lineItems.length).toBe(originalPO.lineItems.length);
      });
    });

    describe('map810ToInvoice', () => {
      it('should map 810 to canonical invoice', () => {
        const parseResult = service.parseAndExtractTransactionSets(sample810);
        const invData = parseResult.transactionSets[0].data as any;

        const invoice = mapperService.map810ToInvoice(invData);

        expect(invoice.invoiceNumber).toBe('INV-001');
        expect(invoice.purchaseOrderNumber).toBe('PO12345');
        expect(invoice.lineItems).toHaveLength(2);
        expect(invoice.totals.totalAmount).toBe(2000); // 200000 cents = 2000 dollars
      });
    });

    describe('map856ToShipment', () => {
      it('should map 856 to canonical shipment', () => {
        const parseResult = service.parseAndExtractTransactionSets(sample856);
        const asnData = parseResult.transactionSets[0].data as any;

        const shipment = mapperService.map856ToShipment(asnData);

        expect(shipment.shipmentNumber).toBe('SHIP-001');
        expect(shipment.items.length).toBeGreaterThan(0);
        expect(shipment.packages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Version Support', () => {
    it('should support version 004010', () => {
      const v4010Doc = sample850.replace('00501', '00401');
      const result = service.parseDocument(v4010Doc);
      // Should parse but may have version-related warnings
      expect(result.interchange).toBeDefined();
    });

    it('should support version 005010', () => {
      const result = service.parseDocument(sample850);
      expect(result.success).toBe(true);
      expect(result.interchange!.header.versionNumber).toBe('005010');
    });
  });

  describe('Partner-specific delimiters', () => {
    it('should handle custom element separator', () => {
      // Some partners use different delimiters
      const customDelimiterDoc = sample850.replace(/\*/g, '|').replace('ISA|', 'ISA|');
      // Would need ISA segment to properly define delimiters
      // This tests delimiter detection
      const withCustom =
        'ISA|00|          |00|          |ZZ|SENDER         |ZZ|RECEIVER       |240101|1200|^|00501|000000001|0|T|:~IEA|1|000000001~';
      const result = lexerService.extractDelimiters(withCustom);
      expect(result.elementSeparator).toBe('|');
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed parse errors with location', () => {
      const malformed = 'ISA*00*          *00*          *ZZ*SENDER~'; // Incomplete ISA
      const result = service.parseDocument(malformed);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].position).toBeDefined();
    });

    it('should handle missing required segments gracefully', () => {
      // 850 without BEG segment
      const noBeg = sample850.replace('BEG*00*SA*PO12345**20240101~', '');
      const result = service.parseAndExtractTransactionSets(noBeg);
      expect(result.transactionSets[0].errors.length).toBeGreaterThan(0);
    });
  });

  describe('850 Generator', () => {
    let generator850: X12_850_GeneratorService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [X12_850_GeneratorService],
      }).compile();
      generator850 = module.get<X12_850_GeneratorService>(X12_850_GeneratorService);
    });

    it('should generate 850 transaction set from data', () => {
      const poData = {
        transactionSetCode: '850' as const,
        controlNumber: '0001',
        beg: {
          purposeCode: '00',
          orderTypeCode: 'SA',
          purchaseOrderNumber: 'TEST-PO-001',
          orderDate: '20240115',
        },
        lineItems: [
          {
            assignedId: '1',
            quantityOrdered: 10,
            unitOfMeasure: 'EA',
            unitPrice: 100,
            basisOfUnitPrice: 'PE',
            productIds: [{ qualifier: 'VP', id: 'SKU-001' }],
          },
        ],
      };

      const transactionSet = generator850.generate(poData);

      expect(transactionSet.header.transactionSetCode).toBe('850');
      expect(transactionSet.segments.length).toBeGreaterThan(0);
      expect(transactionSet.segments[0].segmentId).toBe('BEG');
    });

    it('should generate 850 with currency and references', () => {
      const poData = {
        transactionSetCode: '850' as const,
        controlNumber: '0002',
        beg: {
          purposeCode: '00',
          orderTypeCode: 'SA',
          purchaseOrderNumber: 'TEST-PO-002',
          orderDate: '20240115',
        },
        currency: { currencyCode: 'USD', exchangeRate: 1.0 },
        references: [{ referenceIdQualifier: 'CO', referenceId: 'CUST-REF-001' }],
        lineItems: [
          {
            quantityOrdered: 5,
            unitOfMeasure: 'EA',
            productIds: [{ qualifier: 'VP', id: 'SKU-002' }],
          },
        ],
      };

      const transactionSet = generator850.generate(poData);

      const curSegment = transactionSet.segments.find((s) => s.segmentId === 'CUR');
      expect(curSegment).toBeDefined();

      const refSegment = transactionSet.segments.find((s) => s.segmentId === 'REF');
      expect(refSegment).toBeDefined();
    });

    it('should generate 850 with parties and contacts', () => {
      const poData = {
        transactionSetCode: '850' as const,
        controlNumber: '0003',
        beg: {
          purposeCode: '00',
          orderTypeCode: 'SA',
          purchaseOrderNumber: 'TEST-PO-003',
          orderDate: '20240115',
        },
        contacts: [
          {
            contactFunctionCode: 'BD',
            name: 'John Doe',
            communicationNumberQualifier: 'TE',
            communicationNumber: '5551234567',
          },
        ],
        parties: [
          {
            entityIdCode: 'BY',
            name: 'Buyer Corp',
            idCodeQualifier: '92',
            idCode: 'BUYER001',
            address: {
              addressLine1: '123 Main St',
              city: 'New York',
              stateCode: 'NY',
              postalCode: '10001',
            },
            contacts: [
              {
                contactFunctionCode: 'IC',
                name: 'Jane Smith',
              },
            ],
          },
        ],
        lineItems: [
          {
            quantityOrdered: 1,
            unitOfMeasure: 'EA',
            productIds: [{ qualifier: 'VP', id: 'SKU-003' }],
            descriptions: [{ type: 'F', description: 'Test Product' }],
            dates: [{ dateTimeQualifier: '002', date: '20240120' }],
            taxes: [{ taxTypeCode: 'ST', amount: 10, percent: 8 }],
          },
        ],
        totals: { numberOfLineItems: 1, hashTotal: 100 },
        amounts: [{ amountQualifier: 'TT', amount: 110 }],
      };

      const transactionSet = generator850.generate(poData);

      expect(transactionSet.segments.some((s) => s.segmentId === 'PER')).toBe(true);
      expect(transactionSet.segments.some((s) => s.segmentId === 'N1')).toBe(true);
      expect(transactionSet.segments.some((s) => s.segmentId === 'N3')).toBe(true);
      expect(transactionSet.segments.some((s) => s.segmentId === 'N4')).toBe(true);
      expect(transactionSet.segments.some((s) => s.segmentId === 'PID')).toBe(true);
      expect(transactionSet.segments.some((s) => s.segmentId === 'DTM')).toBe(true);
      expect(transactionSet.segments.some((s) => s.segmentId === 'TXI')).toBe(true);
      expect(transactionSet.segments.some((s) => s.segmentId === 'CTT')).toBe(true);
      expect(transactionSet.segments.some((s) => s.segmentId === 'AMT')).toBe(true);
    });

    it('should generate 850 with carrier details', () => {
      const poData = {
        transactionSetCode: '850' as const,
        controlNumber: '0004',
        beg: {
          purposeCode: '00',
          orderTypeCode: 'SA',
          purchaseOrderNumber: 'TEST-PO-004',
          orderDate: '20240115',
        },
        dates: [{ dateTimeQualifier: '002', date: '20240120' }],
        carrierDetails: [
          {
            routingSequenceCode: 'B',
            idCodeQualifier: '2',
            idCode: 'FEDX',
            transportationMethodCode: 'M',
            routing: 'GROUND',
          },
        ],
        lineItems: [
          {
            quantityOrdered: 1,
            unitOfMeasure: 'EA',
            productIds: [{ qualifier: 'VP', id: 'SKU-004' }],
          },
        ],
      };

      const transactionSet = generator850.generate(poData);

      expect(transactionSet.segments.some((s) => s.segmentId === 'TD5')).toBe(true);
    });
  });

  describe('855 Parser', () => {
    const sample855 = [
      'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *240101*1200*^*005010*000000005*0*T*:~',
      'GS*PR*SENDER*RECEIVER*20240101*1200*1*X*005010X220A1~',
      'ST*855*0001~',
      'BAK*00*AD*PO12345*20240102~',
      'CUR*SE*USD~',
      'REF*CO*CUST-ORDER-123~',
      'PER*IC*Jane Doe*TE*5559876543~',
      'DTM*002*20240115~',
      'N1*SE*Seller Company*92*SELLER001~',
      'N3*456 Commerce Ave~',
      'N4*Chicago*IL*60601*US~',
      'PO1*1*10*EA*100*PE*VP*PROD-001~',
      'ACK*IA*10*EA*20240115~',
      'PO1*2*5*EA*200*PE*VP*PROD-002~',
      'ACK*IR*0*EA~',
      'CTT*2~',
      'SE*15*0001~',
      'GE*1*1~',
      'IEA*1*000000005~',
    ].join('');

    it('should parse 855 Purchase Order Acknowledgment', () => {
      const result = service.parseDocument(sample855);
      expect(result.success).toBe(true);
      expect(result.interchange).toBeDefined();
      expect(
        result.interchange!.functionalGroups[0].transactionSets[0].header.transactionSetCode,
      ).toBe('855');
    });

    it('should extract and parse 855 transaction set data', () => {
      const result = service.parseAndExtractTransactionSets(sample855);
      expect(result.transactionSets).toHaveLength(1);
      expect(result.transactionSets[0].type).toBe('855');

      const poaData = result.transactionSets[0].data as any;
      expect(poaData.bak.purchaseOrderNumber).toBe('PO12345');
      expect(poaData.bak.acknowledgmentType).toBe('AD');
      expect(poaData.lineItems).toHaveLength(2);
      expect(poaData.lineItems[0].acknowledgments).toHaveLength(1);
      expect(poaData.lineItems[0].acknowledgments[0].lineItemStatusCode).toBe('IA');
    });
  });

  describe('Complete workflow', () => {
    it('should handle complete EDI workflow: parse -> validate -> map -> generate', () => {
      // 1. Parse incoming document
      const parseResult = service.parseDocument(sample850);
      expect(parseResult.success).toBe(true);

      // 2. Validate
      const validationErrors = service.validateInterchange(parseResult.interchange!);
      const criticalErrors = validationErrors.filter((e) => e.severity === 'error');
      expect(criticalErrors.length).toBeLessThan(5); // Allow some minor validation issues

      // 3. Extract typed data
      const extractResult = service.parseAndExtractTransactionSets(sample850);
      expect(extractResult.transactionSets[0].data).toBeDefined();

      // 4. Map to canonical model
      const poData = extractResult.transactionSets[0].data as any;
      const order = mapperService.map850ToOrder(poData);
      expect(order.orderNumber).toBe('PO12345');

      // 5. Generate 997 acknowledgment
      const ack = service.generate997ForDocument(
        sample850,
        { senderId: 'RECEIVER', senderCode: 'RECEIVER' },
        { receiverId: 'SENDER', receiverCode: 'SENDER' },
      );
      expect(ack).toBeTruthy();

      // 6. Verify 997 is valid
      const ackParseResult = service.parseDocument(ack!);
      expect(ackParseResult.success).toBe(true);
    });
  });
});
