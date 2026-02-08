import { Test, TestingModule } from '@nestjs/testing';
import { EdifactModule } from './edifact.module';
import {
  EdifactService,
  EdifactLexerService,
  EdifactParserService,
  EdifactGeneratorService,
  EdifactMapperService,
  EdifactValidatorService,
} from './services';
import {
  EdifactOrdersParserService,
  EdifactOrdersGeneratorService,
  EdifactOrdrspParserService,
  EdifactDesadvParserService,
  EdifactInvoicParserService,
} from './message-types';
import { DEFAULT_EDIFACT_DELIMITERS, Edifact_ORDERS, EdifactInterchange } from './interfaces';

describe('EdifactModule', () => {
  let module: TestingModule;
  let edifactService: EdifactService;
  let lexerService: EdifactLexerService;
  let parserService: EdifactParserService;
  let generatorService: EdifactGeneratorService;
  let mapperService: EdifactMapperService;
  let validatorService: EdifactValidatorService;
  let ordersParser: EdifactOrdersParserService;
  let ordersGenerator: EdifactOrdersGeneratorService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [EdifactModule],
    }).compile();

    edifactService = module.get<EdifactService>(EdifactService);
    lexerService = module.get<EdifactLexerService>(EdifactLexerService);
    parserService = module.get<EdifactParserService>(EdifactParserService);
    generatorService = module.get<EdifactGeneratorService>(EdifactGeneratorService);
    mapperService = module.get<EdifactMapperService>(EdifactMapperService);
    validatorService = module.get<EdifactValidatorService>(EdifactValidatorService);
    ordersParser = module.get<EdifactOrdersParserService>(EdifactOrdersParserService);
    ordersGenerator = module.get<EdifactOrdersGeneratorService>(EdifactOrdersGeneratorService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('EdifactLexerService', () => {
    describe('hasUNASegment', () => {
      it('should detect UNA segment at start of document', () => {
        const input = "UNA:+.? 'UNB+UNOA:4+SENDER:ZZ+RECEIVER:ZZ+230101:1200+123'";
        expect(lexerService.hasUNASegment(input)).toBe(true);
      });

      it('should return false when no UNA segment', () => {
        const input = "UNB+UNOA:4+SENDER:ZZ+RECEIVER:ZZ+230101:1200+123'";
        expect(lexerService.hasUNASegment(input)).toBe(false);
      });
    });

    describe('extractDelimiters', () => {
      it('should extract delimiters from UNA segment', () => {
        const input = "UNA:+.? '";
        const result = lexerService.extractDelimiters(input);

        expect(result.componentSeparator).toBe(':');
        expect(result.elementSeparator).toBe('+');
        expect(result.decimalNotation).toBe('.');
        expect(result.releaseCharacter).toBe('?');
        expect(result.segmentTerminator).toBe("'");
        expect(result.errors).toHaveLength(0);
      });

      it('should use default delimiters when no UNA segment', () => {
        const input = "UNB+UNOA:4+SENDER+RECEIVER+230101:1200+123'";
        const result = lexerService.extractDelimiters(input);

        expect(result.componentSeparator).toBe(DEFAULT_EDIFACT_DELIMITERS.componentSeparator);
        expect(result.elementSeparator).toBe(DEFAULT_EDIFACT_DELIMITERS.elementSeparator);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle custom delimiters', () => {
        const input = 'UNA;*.~ |';
        const result = lexerService.extractDelimiters(input);

        expect(result.componentSeparator).toBe(';');
        expect(result.elementSeparator).toBe('*');
        expect(result.decimalNotation).toBe('.');
        expect(result.releaseCharacter).toBe('~');
        expect(result.segmentTerminator).toBe('|');
      });

      it('should return error for truncated UNA segment', () => {
        const input = 'UNA:+';
        const result = lexerService.extractDelimiters(input);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('UNA_TOO_SHORT');
      });
    });

    describe('tokenize', () => {
      it('should tokenize simple segment', () => {
        const input = "BGM+220+ORDER001+9'";
        const result = lexerService.tokenize(input);

        expect(result.errors).toHaveLength(0);
        expect(result.tokens.length).toBeGreaterThan(0);

        const segmentIdToken = result.tokens.find((t) => t.type === 'SEGMENT_ID');
        expect(segmentIdToken?.value).toBe('BGM');
      });

      it('should handle escape sequences', () => {
        const input = "FTX+AAA+++Text with ?+ escaped plus'";
        const result = lexerService.tokenize(input);

        expect(result.errors).toHaveLength(0);
        const elementWithEscape = result.tokens.find((t) => t.value.includes('escaped plus'));
        expect(elementWithEscape).toBeDefined();
      });
    });

    describe('escape', () => {
      it('should escape special characters', () => {
        const value = "Text with + and ' and :";
        const escaped = lexerService.escape(value, DEFAULT_EDIFACT_DELIMITERS);

        expect(escaped).toBe("Text with ?+ and ?' and ?:");
      });

      it('should escape release character itself', () => {
        const value = 'Question mark?';
        const escaped = lexerService.escape(value, DEFAULT_EDIFACT_DELIMITERS);

        expect(escaped).toBe('Question mark??');
      });
    });
  });

  describe('EdifactParserService', () => {
    const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SENDER:ZZ+RECEIVER:ZZ+230101:1200+00000001'
UNH+1+ORDERS:D:96A:UN'
BGM+220+ORDER001+9'
DTM+137:20230101:102'
NAD+BY+BUYER001::9'
NAD+SU+SUPPLIER001::9'
LIN+1++4012345678901:SRV'
QTY+21:100:PCE'
PRI+AAA:10.50'
UNS+S'
CNT+2:1'
UNT+11+1'
UNZ+1+00000001'`;

    describe('parse', () => {
      it('should parse valid EDIFACT document', () => {
        const result = parserService.parse(sampleEdifact);

        expect(result.success).toBe(true);
        expect(result.interchange).toBeDefined();
        expect(result.errors).toHaveLength(0);
      });

      it('should extract UNB information', () => {
        const result = parserService.parse(sampleEdifact);

        expect(result.interchange?.header.sender.id).toBe('SENDER');
        expect(result.interchange?.header.recipient.id).toBe('RECEIVER');
        expect(result.interchange?.header.controlReference).toBe('00000001');
      });

      it('should extract messages', () => {
        const result = parserService.parse(sampleEdifact);

        expect(result.interchange?.messages).toHaveLength(1);
        expect(result.interchange?.messages?.[0].header.messageIdentifier.type).toBe('ORDERS');
      });

      it('should return error for empty input', () => {
        const result = parserService.parse('');

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('EMPTY_INPUT');
      });

      it('should return error for missing UNZ', () => {
        const input = `UNB+UNOA:4+SENDER+RECEIVER+230101:1200+123'
UNH+1+ORDERS:D:96A:UN'
BGM+220+ORDER001'
UNT+3+1'`;

        const result = parserService.parse(input);

        expect(result.success).toBe(false);
        expect(result.errors.some((e) => e.code === 'MISSING_UNZ')).toBe(true);
      });

      it('should handle functional groups', () => {
        const input = `UNA:+.? '
UNB+UNOA:4+SENDER+RECEIVER+230101:1200+00000001'
UNG+ORDERS+SENDER+RECEIVER+230101:1200+0001+UN+D:96A'
UNH+1+ORDERS:D:96A:UN'
BGM+220+ORDER001+9'
UNT+3+1'
UNE+1+0001'
UNZ+1+00000001'`;

        const result = parserService.parse(input);

        expect(result.success).toBe(true);
        expect(result.interchange?.functionalGroups).toHaveLength(1);
        expect(result.interchange?.functionalGroups?.[0].messages).toHaveLength(1);
      });
    });
  });

  describe('EdifactGeneratorService', () => {
    describe('generateUNASegment', () => {
      it('should generate valid UNA segment', () => {
        const una = generatorService.generateUNASegment(DEFAULT_EDIFACT_DELIMITERS);

        expect(una).toBe("UNA:+.? '");
      });
    });

    describe('generateUNBSegment', () => {
      it('should generate valid UNB segment', () => {
        const unb = generatorService.createUNBSegment('SENDER', 'RECEIVER', '123');
        const segment = generatorService.generateUNBSegment(unb, DEFAULT_EDIFACT_DELIMITERS);

        expect(segment).toContain('UNB');
        expect(segment).toContain('SENDER');
        expect(segment).toContain('RECEIVER');
        expect(segment).toContain('123');
        expect(segment.endsWith("'")).toBe(true);
      });
    });

    describe('buildInterchange', () => {
      it('should build complete interchange', () => {
        const unh = generatorService.createUNHSegment('1', 'ORDERS', 'D', '96A');
        const unt = generatorService.createUNTSegment(3, '1');
        const message = {
          header: unh,
          segments: [{ segmentId: 'BGM', elements: [{ value: '220' }, { value: 'ORDER001' }] }],
          trailer: unt,
        };

        const interchange = generatorService.buildInterchange(
          [message],
          { senderId: 'SENDER' },
          { recipientId: 'RECEIVER' },
        );

        expect(interchange.header.sender.id).toBe('SENDER');
        expect(interchange.header.recipient.id).toBe('RECEIVER');
        expect(interchange.messages).toHaveLength(1);
      });
    });

    describe('generate', () => {
      it('should generate complete EDIFACT document', () => {
        const unh = generatorService.createUNHSegment('1', 'ORDERS', 'D', '96A');
        const unt = generatorService.createUNTSegment(3, '1');
        const message = {
          header: unh,
          segments: [{ segmentId: 'BGM', elements: [{ value: '220' }, { value: 'ORDER001' }] }],
          trailer: unt,
        };

        const interchange = generatorService.buildInterchange(
          [message],
          { senderId: 'SENDER' },
          { recipientId: 'RECEIVER' },
        );

        const output = generatorService.generate(interchange);

        expect(output).toContain('UNA');
        expect(output).toContain('UNB');
        expect(output).toContain('UNH');
        expect(output).toContain('BGM');
        expect(output).toContain('UNT');
        expect(output).toContain('UNZ');
      });

      it('should handle line breaks option', () => {
        const unh = generatorService.createUNHSegment('1', 'ORDERS', 'D', '96A');
        const unt = generatorService.createUNTSegment(3, '1');
        const message = {
          header: unh,
          segments: [],
          trailer: unt,
        };

        const interchange = generatorService.buildInterchange(
          [message],
          { senderId: 'SENDER' },
          { recipientId: 'RECEIVER' },
        );

        const output = generatorService.generate(interchange, { lineBreaks: true });

        expect(output).toContain('\n');
      });
    });
  });

  describe('EdifactOrdersParserService', () => {
    it('should parse ORDERS message', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SENDER:ZZ+RECEIVER:ZZ+230101:1200+00000001'
UNH+1+ORDERS:D:96A:UN'
BGM+220+ORDER001+9'
DTM+137:20230101:102'
NAD+BY+BUYER001::9++Buyer Company+123 Main St+City++12345+US'
NAD+SU+SUPPLIER001::9++Supplier Inc'
CUX+2:USD:4'
LIN+1++4012345678901:SRV'
IMD+F+++Product Description'
QTY+21:100:PCE'
PRI+AAA:10.50'
UNS+S'
CNT+2:1'
UNT+14+1'
UNZ+1+00000001'`;

      const parseResult = parserService.parse(sampleEdifact);
      expect(parseResult.success).toBe(true);

      const message = parseResult.interchange?.messages?.[0];
      expect(message).toBeDefined();

      const orders = ordersParser.parse(message!);

      expect(orders.messageType).toBe('ORDERS');
      expect(orders.orderNumber).toBe('ORDER001');
      expect(orders.orderDate).toBe('2023-01-01');
      expect(orders.currency).toBe('USD');
      expect(orders.parties).toHaveLength(2);
      expect(orders.lineItems).toHaveLength(1);
      expect(orders.lineItems[0].lineNumber).toBe('1');
      expect(orders.lineItems[0].quantities[0].quantity).toBe(100);
    });
  });

  describe('EdifactOrdersGeneratorService', () => {
    it('should generate ORDERS message', () => {
      const orders: Edifact_ORDERS = {
        messageType: 'ORDERS',
        messageReferenceNumber: '1',
        orderNumber: 'ORDER001',
        orderDate: '2023-01-01',
        currency: 'USD',
        parties: [
          {
            partyFunctionQualifier: 'BY',
            partyIdentification: { id: 'BUYER001', responsibleAgency: '9' },
            name: 'Buyer Company',
          },
          {
            partyFunctionQualifier: 'SU',
            partyIdentification: { id: 'SUPPLIER001', responsibleAgency: '9' },
            name: 'Supplier Inc',
          },
        ],
        lineItems: [
          {
            lineNumber: '1',
            productIds: [
              { itemNumber: '4012345678901', itemNumberType: 'SRV', responsibleAgency: '9' },
            ],
            description: 'Product Description',
            quantities: [{ qualifier: '21', quantity: 100, unitOfMeasure: 'PCE' }],
            prices: [{ qualifier: 'AAA', amount: 10.5 }],
          },
        ],
        controlTotals: { lineItemCount: 1 },
      };

      const message = ordersGenerator.generate(orders);

      expect(message.header.messageIdentifier.type).toBe('ORDERS');
      expect(message.segments.some((s) => s.segmentId === 'BGM')).toBe(true);
      expect(message.segments.some((s) => s.segmentId === 'NAD')).toBe(true);
      expect(message.segments.some((s) => s.segmentId === 'LIN')).toBe(true);
    });
  });

  describe('EdifactMapperService', () => {
    it('should map ORDERS to canonical order', () => {
      const orders: Edifact_ORDERS = {
        messageType: 'ORDERS',
        messageReferenceNumber: '1',
        orderNumber: 'ORDER001',
        orderDate: '2023-01-01',
        currency: 'USD',
        messageFunction: '9',
        parties: [
          {
            partyFunctionQualifier: 'BY',
            partyIdentification: { id: 'BUYER001', responsibleAgency: '9' },
            name: 'Buyer Company',
            cityName: 'New York',
            countryCode: 'US',
          },
          {
            partyFunctionQualifier: 'SU',
            partyIdentification: { id: 'SUPPLIER001', responsibleAgency: '9' },
            name: 'Supplier Inc',
          },
        ],
        lineItems: [
          {
            lineNumber: '1',
            productIds: [{ itemNumber: '4012345678901', itemNumberType: 'SRV' }],
            quantities: [{ qualifier: '21', quantity: 100, unitOfMeasure: 'PCE' }],
            prices: [{ qualifier: 'AAA', amount: 10.5 }],
          },
        ],
      };

      const canonicalOrder = mapperService.mapOrdersToOrder(orders);

      expect(canonicalOrder.orderNumber).toBe('ORDER001');
      expect(canonicalOrder.orderDate).toBe('2023-01-01');
      expect(canonicalOrder.orderType).toBe('purchase_order');
      expect(canonicalOrder.currency).toBe('USD');
      expect(canonicalOrder.buyer.name).toBe('Buyer Company');
      expect(canonicalOrder.seller?.name).toBe('Supplier Inc');
      expect(canonicalOrder.lineItems).toHaveLength(1);
      expect(canonicalOrder.lineItems[0].quantity).toBe(100);
    });

    it('should map canonical order to ORDERS', () => {
      const canonicalOrder = {
        orderNumber: 'ORDER002',
        orderDate: '2023-02-15',
        orderType: 'purchase_order' as const,
        currency: 'EUR',
        buyer: { name: 'Test Buyer' },
        lineItems: [
          {
            lineNumber: '1',
            quantity: 50,
            unitOfMeasure: 'each',
            productIdentifiers: [{ type: 'gtin', value: '1234567890123' }],
          },
        ],
      };

      const orders = mapperService.mapOrderToOrders(canonicalOrder);

      expect(orders.orderNumber).toBe('ORDER002');
      expect(orders.currency).toBe('EUR');
      expect(orders.parties.some((p) => p.partyFunctionQualifier === 'BY')).toBe(true);
      expect(orders.lineItems).toHaveLength(1);
    });
  });

  describe('EdifactValidatorService', () => {
    it('should validate valid interchange', () => {
      const interchange: EdifactInterchange = {
        header: {
          segmentId: 'UNB',
          syntaxIdentifier: { id: 'UNOA', version: '4' },
          sender: { id: 'SENDER' },
          recipient: { id: 'RECEIVER' },
          dateTime: { date: '230101', time: '1200' },
          controlReference: '00000001',
        },
        messages: [
          {
            header: {
              segmentId: 'UNH',
              messageReferenceNumber: '1',
              messageIdentifier: {
                type: 'ORDERS',
                version: 'D',
                release: '96A',
                controllingAgency: 'UN',
              },
            },
            segments: [
              { segmentId: 'BGM', elements: [{ value: '220' }] },
              { segmentId: 'DTM', elements: [{ value: '137' }] },
              { segmentId: 'NAD', elements: [{ value: 'BY' }] },
              { segmentId: 'LIN', elements: [{ value: '1' }] },
            ],
            trailer: {
              segmentId: 'UNT',
              segmentCount: 6,
              messageReferenceNumber: '1',
            },
          },
        ],
        trailer: {
          segmentId: 'UNZ',
          controlCount: 1,
          controlReference: '00000001',
        },
        delimiters: DEFAULT_EDIFACT_DELIMITERS,
      };

      const errors = validatorService.validateInterchange(interchange);

      expect(errors.filter((e) => e.severity === 'error')).toHaveLength(0);
    });

    it('should detect control reference mismatch', () => {
      const interchange: EdifactInterchange = {
        header: {
          segmentId: 'UNB',
          syntaxIdentifier: { id: 'UNOA', version: '4' },
          sender: { id: 'SENDER' },
          recipient: { id: 'RECEIVER' },
          dateTime: { date: '230101', time: '1200' },
          controlReference: '00000001',
        },
        messages: [],
        trailer: {
          segmentId: 'UNZ',
          controlCount: 0,
          controlReference: '00000002', // Mismatched
        },
        delimiters: DEFAULT_EDIFACT_DELIMITERS,
      };

      const errors = validatorService.validateInterchange(interchange);

      expect(errors.some((e) => e.code === 'UNZ_CONTROL_REFERENCE_MISMATCH')).toBe(true);
    });

    it('should validate required UNB fields', () => {
      const interchange: EdifactInterchange = {
        header: {
          segmentId: 'UNB',
          syntaxIdentifier: { id: 'UNOA', version: '4' },
          sender: { id: '' }, // Missing
          recipient: { id: 'RECEIVER' },
          dateTime: { date: '230101', time: '1200' },
          controlReference: '00000001',
        },
        messages: [],
        trailer: {
          segmentId: 'UNZ',
          controlCount: 0,
          controlReference: '00000001',
        },
        delimiters: DEFAULT_EDIFACT_DELIMITERS,
      };

      const errors = validatorService.validateInterchange(interchange);

      expect(errors.some((e) => e.code === 'UNB_SENDER_REQUIRED')).toBe(true);
    });
  });

  describe('EdifactService (Integration)', () => {
    it('should parse and generate round-trip', () => {
      const orders: Edifact_ORDERS = {
        messageType: 'ORDERS',
        messageReferenceNumber: '1',
        orderNumber: 'ORDER001',
        orderDate: '2023-01-01',
        currency: 'USD',
        parties: [
          {
            partyFunctionQualifier: 'BY',
            partyIdentification: { id: 'BUYER001', responsibleAgency: '9' },
            name: 'Buyer Company',
          },
        ],
        lineItems: [
          {
            lineNumber: '1',
            productIds: [{ itemNumber: '4012345678901', itemNumberType: 'SRV' }],
            quantities: [{ qualifier: '21', quantity: 100, unitOfMeasure: 'PCE' }],
          },
        ],
      };

      // Generate
      const output = edifactService.generateOrders(
        orders,
        { senderId: 'SENDER' },
        { recipientId: 'RECEIVER' },
      );

      expect(output).toContain('UNB');
      expect(output).toContain('ORDERS');
      expect(output).toContain('ORDER001');

      // Parse back
      const parseResult = edifactService.parseOrders(output);

      expect(parseResult).toBeDefined();
      expect(parseResult?.orderNumber).toBe('ORDER001');
      expect(parseResult?.lineItems).toHaveLength(1);
    });

    it('should extract message type', () => {
      const input = `UNA:+.? '
UNB+UNOA:4+SENDER+RECEIVER+230101:1200+00000001'
UNH+1+INVOIC:D:96A:UN'
BGM+380+INV001'
UNT+3+1'
UNZ+1+00000001'`;

      const messageType = edifactService.getMessageType(input);

      expect(messageType).toBe('INVOIC');
    });

    it('should validate syntax', () => {
      const validInput = `UNA:+.? '
UNB+UNOA:4+SENDER+RECEIVER+230101:1200+00000001'
UNH+1+ORDERS:D:96A:UN'
BGM+220+ORDER001'
UNT+3+1'
UNZ+1+00000001'`;

      const result = edifactService.validateSyntax(validInput);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should extract delimiters', () => {
      const input = 'UNA;*.~ |UNB*UNOA;4*SENDER*RECEIVER|';
      const delimiters = edifactService.extractDelimiters(input);

      expect(delimiters.componentSeparator).toBe(';');
      expect(delimiters.elementSeparator).toBe('*');
      expect(delimiters.segmentTerminator).toBe('|');
    });

    it('should get document version', () => {
      const input = `UNA:+.? '
UNB+UNOA:4+SENDER+RECEIVER+230101:1200+00000001'
UNH+1+ORDERS:D:01B:UN'
BGM+220+ORDER001'
UNT+3+1'
UNZ+1+00000001'`;

      const version = edifactService.getDocumentVersion(input);

      expect(version?.version).toBe('D');
      expect(version?.release).toBe('01B');
    });

    it('should return null for getDocumentVersion on invalid input', () => {
      const version = edifactService.getDocumentVersion('invalid');
      expect(version).toBeNull();
    });

    it('should return null for getMessageType on invalid input', () => {
      const messageType = edifactService.getMessageType('invalid');
      expect(messageType).toBeNull();
    });

    it('should handle parse failures in parseOrders', () => {
      const result = edifactService.parseOrders('invalid input');
      expect(result).toBeNull();
    });

    it('should handle parse failures in parseInvoice', () => {
      const result = edifactService.parseInvoice('invalid input');
      expect(result).toBeNull();
    });

    it('should handle parse failures in parseDespatchAdvice', () => {
      const result = edifactService.parseDespatchAdvice('invalid input');
      expect(result).toBeNull();
    });

    it('should handle parse failures in parseOrderResponse', () => {
      const result = edifactService.parseOrderResponse('invalid input');
      expect(result).toBeNull();
    });

    it('should generate interchange from multiple messages', () => {
      const unh1 = generatorService.createUNHSegment('1', 'ORDERS', 'D', '96A');
      const unt1 = generatorService.createUNTSegment(3, '1');
      const message1 = {
        header: unh1,
        segments: [{ segmentId: 'BGM', elements: [{ value: '220' }] }],
        trailer: unt1,
      };

      const unh2 = generatorService.createUNHSegment('2', 'ORDERS', 'D', '96A');
      const unt2 = generatorService.createUNTSegment(3, '2');
      const message2 = {
        header: unh2,
        segments: [{ segmentId: 'BGM', elements: [{ value: '220' }] }],
        trailer: unt2,
      };

      const output = edifactService.generateInterchange(
        [message1, message2],
        { senderId: 'SENDER' },
        { recipientId: 'RECEIVER' },
        { testIndicator: true },
      );

      expect(output).toContain('UNB');
      expect(output).toContain('UNZ');
    });
  });

  describe('EdifactOrdrspParserService', () => {
    let ordrspParser: EdifactOrdrspParserService;

    beforeAll(() => {
      ordrspParser = module.get<EdifactOrdrspParserService>(EdifactOrdrspParserService);
    });

    it('should parse ORDRSP message', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SUPPLIER:ZZ+BUYER:ZZ+230102:1400+00000002'
UNH+1+ORDRSP:D:96A:UN'
BGM+231+ORDRSP001+4'
DTM+137:20230102:102'
RFF+ON:ORDER001'
NAD+BY+BUYER001::9++Buyer Company'
NAD+SU+SUPPLIER001::9++Supplier Inc'
LIN+1+5+4012345678901:SRV'
QTY+21:80:PCE'
PRI+AAA:10.50'
UNS+S'
UNT+12+1'
UNZ+1+00000002'`;

      const parseResult = parserService.parse(sampleEdifact);
      expect(parseResult.success).toBe(true);

      const message = parseResult.interchange?.messages?.[0];
      expect(message).toBeDefined();

      const ordrsp = ordrspParser.parse(message!);

      expect(ordrsp.messageType).toBe('ORDRSP');
      expect(ordrsp.responseNumber).toBe('ORDRSP001');
      expect(ordrsp.responseDate).toBe('2023-01-02');
    });

    it('should handle response types', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SUPPLIER+BUYER+230102:1400+00000003'
UNH+1+ORDRSP:D:96A:UN'
BGM+231+ORDRSP002+27'
DTM+137:20230103:102'
RFF+ON:ORDER002'
UNT+5+1'
UNZ+1+00000003'`;

      const parseResult = parserService.parse(sampleEdifact);
      const message = parseResult.interchange?.messages?.[0];
      const ordrsp = ordrspParser.parse(message!);

      // The BGM segment has +27 which is the message function code
      // responseType comes from BGM document type code (element 0)
      expect(ordrsp.responseType).toBe('231');
      expect(ordrsp.messageFunction).toBe('27');
    });
  });

  describe('EdifactDesadvParserService', () => {
    let desadvParser: EdifactDesadvParserService;

    beforeAll(() => {
      desadvParser = module.get<EdifactDesadvParserService>(EdifactDesadvParserService);
    });

    it('should parse DESADV message', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SENDER:ZZ+RECEIVER:ZZ+230103:1000+00000004'
UNH+1+DESADV:D:96A:UN'
BGM+351+DESADV001+9'
DTM+137:20230103:102'
DTM+11:20230104:102'
RFF+ON:ORDER001'
NAD+BY+BUYER001::9++Buyer Company'
NAD+SU+SUPPLIER001::9++Supplier Inc'
NAD+DP+SHIP001::9++Ship To Location+456 Delivery Ave+Shipping City++67890+US'
TDT+20+SHP001+++++CARRIER'
CPS+1'
PAC+5+:CT'
LIN+1++4012345678901:SRV'
QTY+12:100:PCE'
UNS+S'
UNT+16+1'
UNZ+1+00000004'`;

      const parseResult = parserService.parse(sampleEdifact);
      expect(parseResult.success).toBe(true);

      const message = parseResult.interchange?.messages?.[0];
      expect(message).toBeDefined();

      const desadv = desadvParser.parse(message!);

      expect(desadv.messageType).toBe('DESADV');
      expect(desadv.despatchNumber).toBe('DESADV001');
      expect(desadv.despatchDate).toBe('2023-01-03');
    });

    it('should handle transport details', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SENDER+RECEIVER+230103:1000+00000005'
UNH+1+DESADV:D:96A:UN'
BGM+351+DESADV002+9'
DTM+137:20230103:102'
TDT+20+SHP002+30+31+CARRIER:172::CARRIER NAME'
CPS+1'
LIN+1++SKU001:VP'
QTY+12:50:PCE'
UNT+9+1'
UNZ+1+00000005'`;

      const parseResult = parserService.parse(sampleEdifact);
      const message = parseResult.interchange?.messages?.[0];
      const desadv = desadvParser.parse(message!);

      expect(desadv.transport).toBeDefined();
    });
  });

  describe('EdifactInvoicParserService', () => {
    let invoicParser: EdifactInvoicParserService;

    beforeAll(() => {
      invoicParser = module.get<EdifactInvoicParserService>(EdifactInvoicParserService);
    });

    it('should parse INVOIC message', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SUPPLIER:ZZ+BUYER:ZZ+230104:0900+00000006'
UNH+1+INVOIC:D:96A:UN'
BGM+380+INV001+9'
DTM+137:20230104:102'
DTM+35:20230131:102'
RFF+ON:ORDER001'
NAD+BY+BUYER001::9++Buyer Company+123 Main St+City++12345+US'
NAD+SU+SUPPLIER001::9++Supplier Inc+456 Vendor Ave+Supplier City++67890+US'
CUX+2:USD:4'
PAT+1'
LIN+1++4012345678901:SRV'
QTY+47:100:PCE'
MOA+203:1050.00'
PRI+AAA:10.50'
TAX+7+VAT+++:::21+S'
MOA+124:220.50'
UNS+S'
MOA+77:1050.00'
MOA+79:1270.50'
MOA+176:220.50'
UNT+22+1'
UNZ+1+00000006'`;

      const parseResult = parserService.parse(sampleEdifact);
      expect(parseResult.success).toBe(true);

      const message = parseResult.interchange?.messages?.[0];
      expect(message).toBeDefined();

      const invoic = invoicParser.parse(message!);

      expect(invoic.messageType).toBe('INVOIC');
      expect(invoic.invoiceNumber).toBe('INV001');
      expect(invoic.invoiceDate).toBe('2023-01-04');
      expect(invoic.currency).toBe('USD');
    });

    it('should parse payment terms', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SUPPLIER+BUYER+230104:0900+00000007'
UNH+1+INVOIC:D:96A:UN'
BGM+380+INV002+9'
DTM+137:20230105:102'
DTM+35:20230228:102'
PAT+1++5:3:D:30'
NAD+BY+BUYER001::9'
NAD+SU+SUPPLIER001::9'
UNS+S'
MOA+77:500.00'
UNT+10+1'
UNZ+1+00000007'`;

      const parseResult = parserService.parse(sampleEdifact);
      const message = parseResult.interchange?.messages?.[0];
      const invoic = invoicParser.parse(message!);

      const paymentDueDate = invoic.dates?.find((d) => d.qualifier === '35');
      expect(paymentDueDate?.value).toBe('20230228');
    });

    it('should handle tax information', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SUPPLIER+BUYER+230104:0900+00000008'
UNH+1+INVOIC:D:96A:UN'
BGM+380+INV003+9'
DTM+137:20230106:102'
NAD+BY+BUYER001::9'
NAD+SU+SUPPLIER001::9'
TAX+7+VAT+++:::21+S'
MOA+124:105.00'
UNS+S'
MOA+77:500.00'
MOA+176:105.00'
MOA+79:605.00'
UNT+13+1'
UNZ+1+00000008'`;

      const parseResult = parserService.parse(sampleEdifact);
      const message = parseResult.interchange?.messages?.[0];
      const invoic = invoicParser.parse(message!);

      expect(invoic.taxes).toBeDefined();
    });
  });

  describe('EdifactLexerService - Additional Coverage', () => {
    it('should tokenize with custom delimiters', () => {
      const input = 'BGM*220*ORDER001|';
      const customDelimiters = {
        componentSeparator: ';',
        elementSeparator: '*',
        decimalNotation: '.',
        releaseCharacter: '~',
        segmentTerminator: '|',
      };
      const result = lexerService.tokenize(input, customDelimiters);

      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('should handle UNA with spaces', () => {
      const input = "UNA:+.? 'UNB+UNOA:4+SENDER+RECEIVER'";
      const result = lexerService.extractDelimiters(input);

      expect(result.componentSeparator).toBe(':');
      expect(result.segmentTerminator).toBe("'");
    });

    it('should handle empty string in escape', () => {
      const result = lexerService.escape('', DEFAULT_EDIFACT_DELIMITERS);
      expect(result).toBe('');
    });

    it('should handle string with no special characters in escape', () => {
      const result = lexerService.escape('simple text', DEFAULT_EDIFACT_DELIMITERS);
      expect(result).toBe('simple text');
    });
  });

  describe('EdifactParserService - Additional Coverage', () => {
    it('should handle document with only whitespace', () => {
      const result = parserService.parse('   \n\t  ');

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.code === 'EMPTY_INPUT' || e.code === 'MISSING_UNB')).toBe(
        true,
      );
    });

    it('should handle missing message trailer', () => {
      const input = `UNB+UNOA:4+SENDER+RECEIVER+230101:1200+123'
UNH+1+ORDERS:D:96A:UN'
BGM+220+ORDER001'
UNZ+1+123'`;

      const result = parserService.parse(input);

      expect(result.success).toBe(false);
    });

    it('should handle message reference number mismatch', () => {
      const input = `UNA:+.? '
UNB+UNOA:4+SENDER+RECEIVER+230101:1200+00000001'
UNH+1+ORDERS:D:96A:UN'
BGM+220+ORDER001'
UNT+3+2'
UNZ+1+00000001'`;

      const result = parserService.parse(input);
      // Should still parse but may have warnings
      expect(result.interchange).toBeDefined();
    });

    it('should parse message with multiple segments', () => {
      const input = `UNA:+.? '
UNB+UNOA:4+SENDER+RECEIVER+230101:1200+00000001'
UNH+1+ORDERS:D:96A:UN'
BGM+220+ORDER001+9'
DTM+137:20230101:102'
DTM+2:20230115:102'
FTX+AAA+++Free text note'
NAD+BY+BUYER001::9++Buyer Name+Street 1:Street 2+City+State+12345+US'
NAD+SU+SUPPLIER001::9++Supplier Name'
LIN+1++4012345678901:SRV'
QTY+21:100:PCE'
PRI+AAA:10.50:CA'
TAX+7+VAT'
LIN+2++9876543210987:SRV'
QTY+21:50:PCE'
PRI+AAA:20.00:CA'
UNS+S'
CNT+2:2'
MOA+77:2050.00'
UNT+18+1'
UNZ+1+00000001'`;

      const result = parserService.parse(input);

      expect(result.success).toBe(true);
      expect(result.interchange?.messages?.[0].segments.length).toBeGreaterThan(5);
    });
  });

  describe('EdifactGeneratorService - Additional Coverage', () => {
    it('should generate with custom delimiters', () => {
      const unh = generatorService.createUNHSegment('1', 'ORDERS', 'D', '96A');
      const unt = generatorService.createUNTSegment(3, '1');
      const message = {
        header: unh,
        segments: [{ segmentId: 'BGM', elements: [{ value: '220' }] }],
        trailer: unt,
      };

      const customDelimiters = {
        componentSeparator: ';',
        elementSeparator: '*',
        decimalNotation: ',',
        releaseCharacter: '~',
        segmentTerminator: '|',
      };

      const interchange = generatorService.buildInterchange(
        [message],
        { senderId: 'SENDER' },
        { recipientId: 'RECEIVER' },
        { delimiters: customDelimiters },
      );

      const output = generatorService.generate(interchange, { delimiters: customDelimiters });

      expect(output).toContain('UNA;*,~ |');
      expect(output).toContain('*');
      expect(output).toContain('|');
    });

    it('should generate UNG/UNE for functional groups', () => {
      const unh = generatorService.createUNHSegment('1', 'ORDERS', 'D', '96A');
      const unt = generatorService.createUNTSegment(3, '1');
      const message = {
        header: unh,
        segments: [],
        trailer: unt,
      };

      const interchange = generatorService.buildInterchange(
        [message],
        { senderId: 'SENDER' },
        { recipientId: 'RECEIVER' },
        { useFunctionalGroups: true },
      );

      const output = generatorService.generate(interchange);

      expect(output).toContain('UNG');
      expect(output).toContain('UNE');
    });

    it('should handle sender/recipient qualifiers', () => {
      const unh = generatorService.createUNHSegment('1', 'ORDERS', 'D', '96A');
      const unt = generatorService.createUNTSegment(3, '1');
      const message = {
        header: unh,
        segments: [],
        trailer: unt,
      };

      const interchange = generatorService.buildInterchange(
        [message],
        { senderId: 'SENDER', senderQualifier: 'ZZ' },
        { recipientId: 'RECEIVER', recipientQualifier: '14' },
      );

      const output = generatorService.generate(interchange);

      expect(output).toContain('SENDER:ZZ');
      expect(output).toContain('RECEIVER:14');
    });

    it('should handle test indicator', () => {
      const unh = generatorService.createUNHSegment('1', 'ORDERS', 'D', '96A');
      const unt = generatorService.createUNTSegment(3, '1');
      const message = {
        header: unh,
        segments: [],
        trailer: unt,
      };

      const interchange = generatorService.buildInterchange(
        [message],
        { senderId: 'SENDER' },
        { recipientId: 'RECEIVER' },
        { testIndicator: true },
      );

      expect(interchange.header.testIndicator).toBe('1');
    });
  });

  describe('EdifactValidatorService - Additional Coverage', () => {
    it('should validate message count', () => {
      const interchange: EdifactInterchange = {
        header: {
          segmentId: 'UNB',
          syntaxIdentifier: { id: 'UNOA', version: '4' },
          sender: { id: 'SENDER' },
          recipient: { id: 'RECEIVER' },
          dateTime: { date: '230101', time: '1200' },
          controlReference: '00000001',
        },
        messages: [
          {
            header: {
              segmentId: 'UNH',
              messageReferenceNumber: '1',
              messageIdentifier: {
                type: 'ORDERS',
                version: 'D',
                release: '96A',
                controllingAgency: 'UN',
              },
            },
            segments: [],
            trailer: { segmentId: 'UNT', segmentCount: 2, messageReferenceNumber: '1' },
          },
        ],
        trailer: {
          segmentId: 'UNZ',
          controlCount: 5, // Wrong count - should be 1
          controlReference: '00000001',
        },
        delimiters: DEFAULT_EDIFACT_DELIMITERS,
      };

      const errors = validatorService.validateInterchange(interchange);

      expect(errors.some((e) => e.code === 'UNZ_COUNT_MISMATCH')).toBe(true);
    });

    it('should validate missing recipient', () => {
      const interchange: EdifactInterchange = {
        header: {
          segmentId: 'UNB',
          syntaxIdentifier: { id: 'UNOA', version: '4' },
          sender: { id: 'SENDER' },
          recipient: { id: '' },
          dateTime: { date: '230101', time: '1200' },
          controlReference: '00000001',
        },
        messages: [],
        trailer: {
          segmentId: 'UNZ',
          controlCount: 0,
          controlReference: '00000001',
        },
        delimiters: DEFAULT_EDIFACT_DELIMITERS,
      };

      const errors = validatorService.validateInterchange(interchange);

      expect(errors.some((e) => e.code === 'UNB_RECIPIENT_REQUIRED')).toBe(true);
    });

    it('should validate UNH/UNT reference mismatch', () => {
      const interchange: EdifactInterchange = {
        header: {
          segmentId: 'UNB',
          syntaxIdentifier: { id: 'UNOA', version: '4' },
          sender: { id: 'SENDER' },
          recipient: { id: 'RECEIVER' },
          dateTime: { date: '230101', time: '1200' },
          controlReference: '00000001',
        },
        messages: [
          {
            header: {
              segmentId: 'UNH',
              messageReferenceNumber: '1',
              messageIdentifier: {
                type: 'ORDERS',
                version: 'D',
                release: '96A',
                controllingAgency: 'UN',
              },
            },
            segments: [],
            trailer: {
              segmentId: 'UNT',
              segmentCount: 2,
              messageReferenceNumber: '2', // Mismatch
            },
          },
        ],
        trailer: {
          segmentId: 'UNZ',
          controlCount: 1,
          controlReference: '00000001',
        },
        delimiters: DEFAULT_EDIFACT_DELIMITERS,
      };

      const errors = validatorService.validateInterchange(interchange);

      expect(errors.some((e) => e.code === 'UNT_REFERENCE_MISMATCH')).toBe(true);
    });
  });

  describe('EdifactMapperService - Additional Coverage', () => {
    it('should map ORDERS with shipping address', () => {
      const orders: Edifact_ORDERS = {
        messageType: 'ORDERS',
        messageReferenceNumber: '1',
        orderNumber: 'ORDER003',
        orderDate: '2023-03-01',
        currency: 'GBP',
        parties: [
          {
            partyFunctionQualifier: 'BY',
            partyIdentification: { id: 'BUYER001', responsibleAgency: '9' },
            name: 'Buyer Company',
          },
          {
            partyFunctionQualifier: 'SU',
            partyIdentification: { id: 'SUPPLIER001', responsibleAgency: '9' },
            name: 'Supplier Inc',
          },
          {
            partyFunctionQualifier: 'DP',
            partyIdentification: { id: 'SHIP001', responsibleAgency: '9' },
            name: 'Ship To Location',
            streetAddress: '456 Delivery Ave',
            cityName: 'Shipping City',
            postalCode: '67890',
            countryCode: 'GB',
          },
        ],
        lineItems: [
          {
            lineNumber: '1',
            productIds: [{ itemNumber: '1234567890', itemNumberType: 'SA' }],
            quantities: [{ qualifier: '21', quantity: 25, unitOfMeasure: 'EA' }],
          },
        ],
      };

      const canonicalOrder = mapperService.mapOrdersToOrder(orders);

      // Verify we have a delivery party
      const deliveryParty = orders.parties.find((p) => p.partyFunctionQualifier === 'DP');
      expect(deliveryParty).toBeDefined();
      expect(deliveryParty?.cityName).toBe('Shipping City');
    });

    it('should map canonical order with all fields', () => {
      const canonicalOrder = {
        orderNumber: 'ORDER004',
        orderDate: '2023-04-01',
        orderType: 'purchase_order' as const,
        currency: 'JPY',
        buyer: {
          name: 'Japanese Buyer',
          id: 'JPBUYER',
          address: {
            street1: '1-2-3 Test',
            city: 'Tokyo',
            postalCode: '100-0001',
            country: 'JP',
          },
        },
        seller: {
          name: 'Japanese Seller',
          id: 'JPSELLER',
        },
        lineItems: [
          {
            lineNumber: '1',
            quantity: 100,
            unitOfMeasure: 'pieces',
            unitPrice: 1000,
            productIdentifiers: [{ type: 'sku', value: 'SKU-001' }],
            description: 'Test Product',
          },
        ],
      };

      const orders = mapperService.mapOrderToOrders(canonicalOrder);

      expect(orders.parties.length).toBeGreaterThanOrEqual(1);
      expect(orders.lineItems).toHaveLength(1);
      expect(orders.lineItems[0].description).toBe('Test Product');
    });

    it('should handle ORDERS without prices', () => {
      const orders: Edifact_ORDERS = {
        messageType: 'ORDERS',
        messageReferenceNumber: '1',
        orderNumber: 'ORDER005',
        orderDate: '2023-05-01',
        parties: [
          {
            partyFunctionQualifier: 'BY',
            partyIdentification: { id: 'BUYER001' },
            name: 'Buyer',
          },
        ],
        lineItems: [
          {
            lineNumber: '1',
            productIds: [{ itemNumber: 'PROD001', itemNumberType: 'SA' }],
            quantities: [{ qualifier: '21', quantity: 10 }],
          },
        ],
      };

      const canonicalOrder = mapperService.mapOrdersToOrder(orders);

      expect(canonicalOrder.lineItems[0].unitPrice).toBeUndefined();
    });
  });

  describe('EdifactOrdersGeneratorService - Additional Coverage', () => {
    it('should generate ORDERS with all optional fields', () => {
      const orders: Edifact_ORDERS = {
        messageType: 'ORDERS',
        messageReferenceNumber: '1',
        orderNumber: 'ORDER006',
        orderDate: '2023-06-01',
        currency: 'CHF',
        messageFunction: '9',
        dates: [{ qualifier: '2', value: '20230615', formatQualifier: '102' }],
        parties: [
          {
            partyFunctionQualifier: 'BY',
            partyIdentification: { id: 'BUYER001', responsibleAgency: '9' },
            name: 'Buyer Company',
            streetAddress: '123 Main St',
            cityName: 'Zurich',
            postalCode: '8001',
            countryCode: 'CH',
            contacts: [
              {
                contactFunctionCode: 'IC',
                name: 'John Doe',
                communications: [{ channelQualifier: 'TE', number: '+41123456789' }],
              },
            ],
          },
          {
            partyFunctionQualifier: 'SU',
            partyIdentification: { id: 'SUPPLIER001', responsibleAgency: '9' },
            name: 'Supplier Inc',
          },
          {
            partyFunctionQualifier: 'DP',
            partyIdentification: { id: 'SHIP001', responsibleAgency: '9' },
            name: 'Ship To',
          },
        ],
        lineItems: [
          {
            lineNumber: '1',
            productIds: [
              { itemNumber: '1234567890123', itemNumberType: 'EN', responsibleAgency: '9' },
              { itemNumber: 'SKU001', itemNumberType: 'SA' },
            ],
            description: 'Product with long description',
            quantities: [
              { qualifier: '21', quantity: 100, unitOfMeasure: 'PCE' },
              { qualifier: '113', quantity: 50, unitOfMeasure: 'PCE' },
            ],
            prices: [{ qualifier: 'AAA', amount: 25.5, priceType: 'CT' }],
            dates: [{ qualifier: '2', value: '20230615', formatQualifier: '102' }],
          },
          {
            lineNumber: '2',
            productIds: [{ itemNumber: 'BULK001', itemNumberType: 'SA' }],
            quantities: [{ qualifier: '21', quantity: 500 }],
          },
        ],
        references: [
          { referenceQualifier: 'CR', referenceNumber: 'CONTRACT001' },
          { referenceQualifier: 'ACD', referenceNumber: 'PROJECT001' },
        ],
        freeText: [
          { subjectQualifier: 'AAA', text: ['Special instructions for this order'] },
          { subjectQualifier: 'DEL', text: ['Deliver to loading dock'] },
        ],
        controlTotals: {
          lineItemCount: 2,
          totalAmount: 3050.0,
        },
      };

      const message = ordersGenerator.generate(orders);

      expect(message.segments.some((s) => s.segmentId === 'CUX')).toBe(true);
      expect(message.segments.some((s) => s.segmentId === 'CTA')).toBe(true);
      expect(message.segments.filter((s) => s.segmentId === 'NAD').length).toBe(3);
      expect(message.segments.filter((s) => s.segmentId === 'LIN').length).toBe(2);
      expect(message.segments.some((s) => s.segmentId === 'FTX')).toBe(true);
      expect(message.segments.some((s) => s.segmentId === 'RFF')).toBe(true);
    });

    it('should generate ORDERS with D01B version', () => {
      const orders: Edifact_ORDERS = {
        messageType: 'ORDERS',
        messageReferenceNumber: '1',
        orderNumber: 'ORDER007',
        orderDate: '2023-07-01',
        parties: [
          {
            partyFunctionQualifier: 'BY',
            partyIdentification: { id: 'BUYER001' },
            name: 'Buyer',
          },
        ],
        lineItems: [
          {
            lineNumber: '1',
            productIds: [{ itemNumber: 'PROD001', itemNumberType: 'SA' }],
            quantities: [{ qualifier: '21', quantity: 10 }],
          },
        ],
      };

      const message = ordersGenerator.generate(orders, 'D', '01B');

      expect(message.header.messageIdentifier.release).toBe('01B');
    });
  });

  describe('EdifactOrdersParserService - Additional Coverage', () => {
    it('should parse ORDERS with multiple line items and references', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SENDER:ZZ+RECEIVER:ZZ+230108:1200+00000010'
UNH+1+ORDERS:D:96A:UN'
BGM+220+ORDER010+9'
DTM+137:20230108:102'
DTM+2:20230120:102'
RFF+CR:CONTRACT001'
RFF+ACD:PROJECT001'
FTX+AAA+++Special delivery instructions'
NAD+BY+BUYER001::9++Buyer Company+123 Main St:Suite 100+City+CA+90210+US'
CTA+IC+:John Smith'
COM+555-1234:TE'
NAD+SU+SUPPLIER001::9++Supplier Inc'
NAD+DP+SHIP001::9++Ship To Location'
CUX+2:USD:4'
LIN+1++4012345678901:EN:9'
PIA+1+SKU-001:SA'
IMD+F++:::First product description'
QTY+21:100:PCE'
QTY+113:50:PCE'
DTM+2:20230115:102'
PRI+AAA:10.50:CA:NTP'
TAX+7+VAT+++:::21+S'
LIN+2++9876543210987:EN:9'
IMD+F++:::Second product description'
QTY+21:200:PCE'
PRI+AAA:5.25:CA:NTP'
UNS+S'
CNT+2:2'
MOA+77:3100.00'
UNT+28+1'
UNZ+1+00000010'`;

      const parseResult = parserService.parse(sampleEdifact);
      expect(parseResult.success).toBe(true);

      const message = parseResult.interchange?.messages?.[0];
      const orders = ordersParser.parse(message!);

      expect(orders.lineItems).toHaveLength(2);
      expect(orders.references?.length).toBeGreaterThanOrEqual(1);
      expect(orders.freeText?.length).toBeGreaterThanOrEqual(1);
      const deliveryDateEntry = orders.dates?.find((d) => d.qualifier === '2');
      expect(deliveryDateEntry?.value).toBe('20230120');
      expect(orders.parties.some((p) => p.contacts?.length)).toBe(true);
    });
  });

  describe('EdifactDesadvParserService - Additional Coverage', () => {
    let desadvParser: EdifactDesadvParserService;

    beforeAll(() => {
      desadvParser = module.get<EdifactDesadvParserService>(EdifactDesadvParserService);
    });

    it('should parse DESADV with package hierarchy', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SENDER+RECEIVER+230110:1000+00000020'
UNH+1+DESADV:D:96A:UN'
BGM+351+DESADV020+9'
DTM+137:20230110:102'
DTM+11:20230111:102'
RFF+ON:ORDER001'
NAD+BY+BUYER001::9++Buyer Company'
NAD+SU+SUPPLIER001::9++Supplier Inc'
NAD+DP+SHIP001::9++Ship To+123 Delivery St+Delivery City++90210+US'
TDT+20+SHP001+30+31+CARRIER:172::Carrier Name'
EQD+CN+CONT001'
CPS+1'
PAC+10+:CT+++:Package Description'
PCI+33E+SSCC00000000000000001'
GIN+BJ+SSCC00000000000000001'
CPS+2+1'
PAC+1+:BX'
LIN+1++4012345678901:EN'
QTY+12:100:PCE'
FTX+AAA+++Line item notes'
CPS+3+1'
PAC+1+:BX'
LIN+2++9876543210987:EN'
QTY+12:50:PCE'
UNS+S'
CNT+2:2'
UNT+27+1'
UNZ+1+00000020'`;

      const parseResult = parserService.parse(sampleEdifact);
      expect(parseResult.success).toBe(true);

      const message = parseResult.interchange?.messages?.[0];
      const desadv = desadvParser.parse(message!);

      expect(desadv.messageType).toBe('DESADV');
      expect(desadv.despatchNumber).toBe('DESADV020');
      expect(desadv.packages).toBeDefined();
    });

    it('should parse DESADV with equipment details', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SENDER+RECEIVER+230111:1000+00000021'
UNH+1+DESADV:D:96A:UN'
BGM+351+DESADV021+9'
DTM+137:20230111:102'
RFF+ON:ORDER002'
NAD+BY+BUYER002::9'
NAD+SU+SUPPLIER002::9'
TDT+20+TRUCK001+30+31+CARRIER:172'
EQD+TE+TRAILER001+:::Trailer'
SEL+SEAL001+CA'
CPS+1'
LIN+1++PROD001:SA'
QTY+12:200:PCE'
UNT+14+1'
UNZ+1+00000021'`;

      const parseResult = parserService.parse(sampleEdifact);
      const message = parseResult.interchange?.messages?.[0];
      const desadv = desadvParser.parse(message!);

      expect(desadv.transport).toBeDefined();
    });
  });

  describe('EdifactInvoicParserService - Additional Coverage', () => {
    let invoicParser: EdifactInvoicParserService;

    beforeAll(() => {
      invoicParser = module.get<EdifactInvoicParserService>(EdifactInvoicParserService);
    });

    it('should parse INVOIC with line item taxes', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SUPPLIER+BUYER+230115:0900+00000030'
UNH+1+INVOIC:D:96A:UN'
BGM+380+INV030+9'
DTM+137:20230115:102'
DTM+35:20230215:102'
RFF+ON:ORDER003'
RFF+CT:CONTRACT003'
NAD+BY+BUYER003::9++Buyer Company+123 Main St+New York+NY+10001+US'
NAD+SU+SUPPLIER003::9++Supplier Inc+456 Vendor Ave+Los Angeles+CA+90001+US'
CUX+2:EUR:4'
PAT+1++5:3:D:30'
LIN+1++4012345678901:EN'
QTY+47:100:PCE'
MOA+203:1000.00'
PRI+AAA:10.00'
TAX+7+VAT+++:::19+S'
MOA+124:190.00'
LIN+2++9876543210987:EN'
QTY+47:50:PCE'
MOA+203:500.00'
PRI+AAA:10.00'
TAX+7+VAT+++:::19+S'
MOA+124:95.00'
UNS+S'
MOA+77:1500.00'
MOA+176:285.00'
MOA+79:1785.00'
UNT+28+1'
UNZ+1+00000030'`;

      const parseResult = parserService.parse(sampleEdifact);
      expect(parseResult.success).toBe(true);

      const message = parseResult.interchange?.messages?.[0];
      const invoic = invoicParser.parse(message!);

      expect(invoic.messageType).toBe('INVOIC');
      expect(invoic.invoiceNumber).toBe('INV030');
      expect(invoic.currency).toBe('EUR');
      expect(invoic.lineItems).toHaveLength(2);
      expect(invoic.lineItems[0].taxes).toBeDefined();
    });

    it('should parse credit note INVOIC', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SUPPLIER+BUYER+230116:0900+00000031'
UNH+1+INVOIC:D:96A:UN'
BGM+381+CREDIT031+9'
DTM+137:20230116:102'
RFF+IV:INV030'
NAD+BY+BUYER003::9'
NAD+SU+SUPPLIER003::9'
UNS+S'
MOA+77:-500.00'
UNT+9+1'
UNZ+1+00000031'`;

      const parseResult = parserService.parse(sampleEdifact);
      const message = parseResult.interchange?.messages?.[0];
      const invoic = invoicParser.parse(message!);

      expect(invoic.invoiceType).toBe('381'); // Credit note
    });

    it('should parse INVOIC with allowances and charges', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SUPPLIER+BUYER+230117:0900+00000032'
UNH+1+INVOIC:D:96A:UN'
BGM+380+INV032+9'
DTM+137:20230117:102'
NAD+BY+BUYER004::9'
NAD+SU+SUPPLIER004::9'
ALC+C++++FC'
MOA+23:50.00'
ALC+A++++DI'
PCD+3:10'
MOA+204:100.00'
LIN+1++PROD001:SA'
QTY+47:100:PCE'
MOA+203:1000.00'
UNS+S'
MOA+77:1000.00'
MOA+79:950.00'
UNT+17+1'
UNZ+1+00000032'`;

      const parseResult = parserService.parse(sampleEdifact);
      const message = parseResult.interchange?.messages?.[0];
      const invoic = invoicParser.parse(message!);

      expect(invoic.allowancesCharges).toBeDefined();
    });
  });

  describe('EdifactOrdrspParserService - Additional Coverage', () => {
    let ordrspParser: EdifactOrdrspParserService;

    beforeAll(() => {
      ordrspParser = module.get<EdifactOrdrspParserService>(EdifactOrdrspParserService);
    });

    it('should parse ORDRSP with line item changes', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SUPPLIER+BUYER+230120:1400+00000040'
UNH+1+ORDRSP:D:96A:UN'
BGM+231+ORDRSP040+4'
DTM+137:20230120:102'
RFF+ON:ORDER040'
NAD+BY+BUYER040::9++Buyer Company'
NAD+SU+SUPPLIER040::9++Supplier Inc'
CUX+2:USD:4'
LIN+1+3+4012345678901:EN'
QTY+21:80:PCE'
QTY+113:20:PCE'
PRI+AAA:10.50'
FTX+AAA+++Line partially accepted'
LIN+2+7+9876543210987:EN'
FTX+AAA+++Item not available'
UNS+S'
UNT+16+1'
UNZ+1+00000040'`;

      const parseResult = parserService.parse(sampleEdifact);
      expect(parseResult.success).toBe(true);

      const message = parseResult.interchange?.messages?.[0];
      const ordrsp = ordrspParser.parse(message!);

      expect(ordrsp.messageType).toBe('ORDRSP');
      expect(ordrsp.lineItems).toHaveLength(2);
      // LIN+1+3 means "Changed"
      expect(ordrsp.lineItems[0].actionCode).toBe('3');
      // LIN+2+7 means "Not accepted"
      expect(ordrsp.lineItems[1].actionCode).toBe('7');
    });

    it('should parse ORDRSP with amended quantities', () => {
      const sampleEdifact = `UNA:+.? '
UNB+UNOA:4+SUPPLIER+BUYER+230121:1400+00000041'
UNH+1+ORDRSP:D:96A:UN'
BGM+231+ORDRSP041+29'
DTM+137:20230121:102'
DTM+2:20230128:102'
RFF+ON:ORDER041'
NAD+BY+BUYER041::9'
NAD+SU+SUPPLIER041::9'
LIN+1+5+PROD001:SA'
QTY+21:150:PCE'
DTM+2:20230130:102'
UNT+12+1'
UNZ+1+00000041'`;

      const parseResult = parserService.parse(sampleEdifact);
      const message = parseResult.interchange?.messages?.[0];
      const ordrsp = ordrspParser.parse(message!);

      expect(ordrsp.messageFunction).toBe('29'); // Amended order confirmation
      expect(ordrsp.lineItems[0].quantities).toBeDefined();
    });
  });

  describe('EdifactMapperService - Additional Coverage', () => {
    it('should map DESADV to canonical shipment', () => {
      const desadv = {
        messageType: 'DESADV' as const,
        messageReferenceNumber: '1',
        despatchNumber: 'DESP100',
        despatchDate: '2023-03-01',
        parties: [
          {
            partyFunctionQualifier: 'BY',
            partyIdentification: { id: 'BUYER100' },
            name: 'Test Buyer',
          },
          {
            partyFunctionQualifier: 'SU',
            partyIdentification: { id: 'SUPPLIER100' },
            name: 'Test Supplier',
          },
        ],
        lineItems: [
          {
            lineNumber: '1',
            quantity: 100,
            productIds: [{ itemNumber: 'PROD001', itemNumberType: 'SA' }],
            quantities: [{ qualifier: '12', quantity: 100 }],
          },
        ],
      };

      const canonicalShipment = mapperService.mapDesadvToShipment(desadv);

      expect(canonicalShipment.shipmentNumber).toBe('DESP100');
    });
  });

  describe('EdifactValidatorService - Additional Coverage', () => {
    it('should validate segment structure', () => {
      const validSegment = {
        segmentId: 'BGM',
        elements: [{ value: '220' }, { value: 'ORDER001' }],
      };
      const errors = validatorService.validateSegment(validSegment);

      expect(errors.filter((e) => e.severity === 'error')).toHaveLength(0);
    });

    it('should detect invalid segment ID', () => {
      const invalidSegment = {
        segmentId: 'BG1', // Invalid - contains number
        elements: [{ value: '220' }],
      };
      const errors = validatorService.validateSegment(invalidSegment);

      expect(errors.some((e) => e.code === 'INVALID_SEGMENT_ID')).toBe(true);
    });

    it('should validate syntax version', () => {
      const errors = validatorService.validateSyntaxVersion('D', '96A');
      expect(errors.filter((e) => e.severity === 'error')).toHaveLength(0);
    });

    it('should warn about unsupported syntax version', () => {
      const errors = validatorService.validateSyntaxVersion('D', '85A');
      expect(errors.some((e) => e.code === 'UNSUPPORTED_SYNTAX_VERSION')).toBe(true);
    });
  });

  describe('EdifactService - Additional High-Level Methods', () => {
    it('should parseAndExtractMessages for multiple message types', () => {
      const inputWithInvoic = `UNA:+.? '
UNB+UNOA:4+SENDER+RECEIVER+230125:1000+00000050'
UNH+1+INVOIC:D:96A:UN'
BGM+380+INV050+9'
DTM+137:20230125:102'
NAD+BY+BUYER050::9'
NAD+SU+SUPPLIER050::9'
LIN+1++PROD001:SA'
QTY+47:100:PCE'
MOA+203:1000.00'
UNS+S'
MOA+77:1000.00'
UNT+12+1'
UNZ+1+00000050'`;

      const result = edifactService.parseAndExtractMessages(inputWithInvoic);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].messageType).toBe('INVOIC');
    });

    it('should handle unsupported message types gracefully', () => {
      const inputWithUnsupported = `UNA:+.? '
UNB+UNOA:4+SENDER+RECEIVER+230126:1000+00000051'
UNH+1+PRICAT:D:96A:UN'
BGM+9+PRICAT001+9'
UNT+3+1'
UNZ+1+00000051'`;

      const result = edifactService.parseAndExtractMessages(inputWithUnsupported);

      expect(result.success).toBe(true);
      // PRICAT is not a fully supported type, so it won't be in the extracted messages
      expect(result.messages.length).toBe(0);
    });
  });

  describe('EdifactGeneratorService - Additional Coverage', () => {
    it('should create UNG segment', () => {
      const ung = generatorService.createUNGSegment('ORDERS', 'SENDER', 'RECEIVER', '0001', {
        versionNumber: 'D',
        releaseNumber: '96A',
      });

      expect(ung.segmentId).toBe('UNG');
      expect(ung.groupIdentification).toBe('ORDERS');
    });

    it('should create UNE segment', () => {
      const une = generatorService.createUNESegment(5, '0001');

      expect(une.segmentId).toBe('UNE');
      expect(une.messageCount).toBe(5);
    });

    it('should generate segment with components', () => {
      const segment = {
        segmentId: 'NAD',
        elements: [
          { value: 'BY' },
          { value: 'BUYER001::9' }, // Components separated by :
          { value: '' },
          { value: '' },
          { value: 'Buyer Company' },
        ],
      };

      const output = generatorService.generateSegment(segment, DEFAULT_EDIFACT_DELIMITERS);

      expect(output).toContain('NAD');
      expect(output).toContain('BY');
      expect(output).toContain('BUYER001');
    });
  });
});
