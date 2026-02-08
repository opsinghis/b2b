/**
 * EDIFACT Types and Interfaces
 * UN/EDIFACT (United Nations/Electronic Data Interchange for Administration, Commerce and Transport)
 * Supports syntax versions D96A and D01B
 */

/**
 * EDIFACT Syntax version identifiers
 */
export type EdifactSyntaxVersion =
  | 'D96A'
  | 'D01B'
  | 'D96B'
  | 'D97A'
  | 'D99A'
  | 'D99B'
  | 'D00A'
  | 'D01A';

/**
 * Default delimiters for EDIFACT documents
 */
export interface EdifactDelimiters {
  /** Component data element separator (default: :) */
  componentSeparator: string;
  /** Data element separator (default: +) */
  elementSeparator: string;
  /** Decimal notation (default: .) */
  decimalNotation: string;
  /** Release character (default: ?) */
  releaseCharacter: string;
  /** Segment terminator (default: ') */
  segmentTerminator: string;
}

/**
 * Default EDIFACT delimiters (UNOA charset)
 */
export const DEFAULT_EDIFACT_DELIMITERS: EdifactDelimiters = {
  componentSeparator: ':',
  elementSeparator: '+',
  decimalNotation: '.',
  releaseCharacter: '?',
  segmentTerminator: "'",
};

/**
 * UNA Service String Advice - defines delimiters
 */
export interface UNASegment {
  segmentId: 'UNA';
  componentSeparator: string;
  elementSeparator: string;
  decimalNotation: string;
  releaseCharacter: string;
  reserved: string;
  segmentTerminator: string;
}

/**
 * UNB Interchange Header
 */
export interface UNBSegment {
  segmentId: 'UNB';
  /** S001 - Syntax identifier */
  syntaxIdentifier: {
    /** Syntax identifier (e.g., UNOA, UNOB, UNOC) */
    id: string;
    /** Syntax version number */
    version: string;
    /** Service code directory version (optional) */
    serviceCodeVersion?: string;
    /** Character encoding (optional) */
    characterEncoding?: string;
  };
  /** S002 - Interchange sender */
  sender: {
    /** Sender identification */
    id: string;
    /** Identification code qualifier */
    qualifier?: string;
    /** Interchange ID reverse routing address */
    reverseRoutingAddress?: string;
  };
  /** S003 - Interchange recipient */
  recipient: {
    /** Recipient identification */
    id: string;
    /** Identification code qualifier */
    qualifier?: string;
    /** Interchange ID routing address */
    routingAddress?: string;
  };
  /** S004 - Date/time of preparation */
  dateTime: {
    /** Date (YYMMDD or CCYYMMDD) */
    date: string;
    /** Time (HHMM) */
    time: string;
  };
  /** 0020 - Interchange control reference */
  controlReference: string;
  /** S005 - Recipient reference/password (optional) */
  recipientReference?: {
    /** Recipient reference/password */
    reference: string;
    /** Recipient reference/password qualifier */
    qualifier?: string;
  };
  /** 0026 - Application reference (optional) */
  applicationReference?: string;
  /** 0029 - Processing priority code (optional) */
  processingPriorityCode?: string;
  /** 0031 - Acknowledgement request (optional) */
  acknowledgementRequest?: '1' | '0';
  /** 0032 - Interchange agreement identifier (optional) */
  agreementIdentifier?: string;
  /** 0035 - Test indicator (optional, 1 = test) */
  testIndicator?: '1' | '0';
}

/**
 * UNZ Interchange Trailer
 */
export interface UNZSegment {
  segmentId: 'UNZ';
  /** 0036 - Interchange control count (number of messages or groups) */
  controlCount: number;
  /** 0020 - Interchange control reference (must match UNB) */
  controlReference: string;
}

/**
 * UNG Functional Group Header (optional in EDIFACT)
 */
export interface UNGSegment {
  segmentId: 'UNG';
  /** 0038 - Message group identification */
  groupIdentification: string;
  /** S006 - Application sender identification */
  senderIdentification: {
    id: string;
    qualifier?: string;
  };
  /** S007 - Application recipient identification */
  recipientIdentification: {
    id: string;
    qualifier?: string;
  };
  /** S004 - Date/time of preparation */
  dateTime: {
    date: string;
    time: string;
  };
  /** 0048 - Group reference number */
  referenceNumber: string;
  /** 0051 - Controlling agency */
  controllingAgency: string;
  /** S008 - Message version */
  messageVersion: {
    versionNumber: string;
    releaseNumber: string;
    associationAssignedCode?: string;
  };
  /** 0058 - Application password (optional) */
  applicationPassword?: string;
}

/**
 * UNE Functional Group Trailer
 */
export interface UNESegment {
  segmentId: 'UNE';
  /** 0060 - Number of messages in group */
  messageCount: number;
  /** 0048 - Group reference number (must match UNG) */
  referenceNumber: string;
}

/**
 * UNH Message Header
 */
export interface UNHSegment {
  segmentId: 'UNH';
  /** 0062 - Message reference number */
  messageReferenceNumber: string;
  /** S009 - Message identifier */
  messageIdentifier: {
    /** Message type (e.g., ORDERS, INVOIC) */
    type: string;
    /** Message version number */
    version: string;
    /** Message release number */
    release: string;
    /** Controlling agency */
    controllingAgency: string;
    /** Association assigned code (optional) */
    associationAssignedCode?: string;
    /** Code list directory version number (optional) */
    codeListVersion?: string;
    /** Message type sub-function identification (optional) */
    subFunction?: string;
  };
  /** 0068 - Common access reference (optional) */
  commonAccessReference?: string;
  /** S010 - Status of the transfer (optional) */
  statusOfTransfer?: {
    /** Sequence of transfers */
    sequenceOfTransfers: string;
    /** First and last transfer (C = complete, F = first, I = intermediate, L = last) */
    firstAndLastTransfer?: 'C' | 'F' | 'I' | 'L';
  };
  /** S016 - Message subset identification (optional) */
  messageSubsetId?: {
    id: string;
    version?: string;
    release?: string;
    controllingAgency?: string;
  };
  /** S017 - Message implementation guideline identification (optional) */
  implementationGuidelineId?: {
    id: string;
    version?: string;
    release?: string;
    controllingAgency?: string;
  };
  /** S018 - Scenario identification (optional) */
  scenarioId?: {
    id: string;
    version?: string;
    release?: string;
    controllingAgency?: string;
  };
}

/**
 * UNT Message Trailer
 */
export interface UNTSegment {
  segmentId: 'UNT';
  /** 0074 - Number of segments in message */
  segmentCount: number;
  /** 0062 - Message reference number (must match UNH) */
  messageReferenceNumber: string;
}

/**
 * Generic EDIFACT Segment
 */
export interface EdifactSegment {
  segmentId: string;
  elements: EdifactElement[];
  raw?: string;
}

/**
 * EDIFACT Data Element (can contain components)
 */
export interface EdifactElement {
  value: string;
  components?: string[];
}

/**
 * EDIFACT Message (within a message group or interchange)
 */
export interface EdifactMessage {
  header: UNHSegment;
  segments: EdifactSegment[];
  trailer: UNTSegment;
}

/**
 * EDIFACT Functional Group (optional)
 */
export interface EdifactFunctionalGroup {
  header: UNGSegment;
  messages: EdifactMessage[];
  trailer: UNESegment;
}

/**
 * Complete EDIFACT Interchange
 */
export interface EdifactInterchange {
  /** UNA segment (optional, contains delimiter definitions) */
  serviceStringAdvice?: UNASegment;
  /** UNB header */
  header: UNBSegment;
  /** Functional groups (if present) */
  functionalGroups?: EdifactFunctionalGroup[];
  /** Messages (if not using functional groups) */
  messages?: EdifactMessage[];
  /** UNZ trailer */
  trailer: UNZSegment;
  /** Delimiters used in this interchange */
  delimiters: EdifactDelimiters;
}

/**
 * EDIFACT Message Types supported
 */
export enum EdifactMessageType {
  /** Purchase order message */
  ORDERS = 'ORDERS',
  /** Purchase order response message */
  ORDRSP = 'ORDRSP',
  /** Despatch advice message */
  DESADV = 'DESADV',
  /** Invoice message */
  INVOIC = 'INVOIC',
  /** Price/sales catalogue message */
  PRICAT = 'PRICAT',
  /** Inventory report message */
  INVRPT = 'INVRPT',
  /** Remittance advice message */
  REMADV = 'REMADV',
  /** Receiving advice message */
  RECADV = 'RECADV',
}

/**
 * Parser position for error reporting
 */
export interface ParsePosition {
  /** Line number (1-based) */
  line: number;
  /** Column number (1-based) */
  column: number;
  /** Character offset from start */
  offset: number;
  /** Segment index */
  segmentIndex?: number;
  /** Element index within segment */
  elementIndex?: number;
  /** Component index within element */
  componentIndex?: number;
}

/**
 * Parse error with location information
 */
export interface EdifactParseError {
  code: string;
  message: string;
  position: ParsePosition;
  segmentId?: string;
  elementIndex?: number;
  componentIndex?: number;
  severity: 'error' | 'warning';
}

/**
 * Validation error for semantic validation
 */
export interface EdifactValidationError {
  code: string;
  message: string;
  segmentId: string;
  elementIndex?: number;
  componentIndex?: number;
  severity: 'error' | 'warning';
  path?: string;
}

/**
 * Parser result containing parsed document and any errors
 */
export interface EdifactParseResult {
  success: boolean;
  interchange?: EdifactInterchange;
  errors: EdifactParseError[];
  warnings: EdifactParseError[];
}

/**
 * Generation options
 */
export interface EdifactGenerationOptions {
  /** Delimiters to use */
  delimiters?: Partial<EdifactDelimiters>;
  /** Include UNA segment (default: true) */
  includeUNA?: boolean;
  /** Line breaks between segments */
  lineBreaks?: boolean;
  /** Syntax identifier (default: UNOA) */
  syntaxIdentifier?: string;
  /** Syntax version (default: 4) */
  syntaxVersion?: string;
  /** Use functional groups */
  useFunctionalGroups?: boolean;
}

/**
 * Partner-specific configuration
 */
export interface EdifactPartnerConfig {
  partnerId: string;
  partnerName: string;
  /** Partner EDIFACT ID */
  edifactId: string;
  /** ID qualifier (e.g., 14 for EAN, ZZZ for mutually defined) */
  idQualifier?: string;
  /** Custom delimiters */
  delimiters?: Partial<EdifactDelimiters>;
  /** Preferred syntax identifier */
  syntaxIdentifier?: string;
  /** Preferred message version */
  preferredVersion?: EdifactSyntaxVersion;
  /** Test indicator */
  testIndicator?: boolean;
}

/**
 * Token types for lexer
 */
export enum EdifactTokenType {
  SEGMENT_ID = 'SEGMENT_ID',
  ELEMENT = 'ELEMENT',
  COMPONENT = 'COMPONENT',
  SEGMENT_TERMINATOR = 'SEGMENT_TERMINATOR',
  RELEASE_CHARACTER = 'RELEASE_CHARACTER',
  EOF = 'EOF',
}

/**
 * Lexer token
 */
export interface EdifactToken {
  type: EdifactTokenType;
  value: string;
  position: ParsePosition;
}

/**
 * Controlling Agency codes
 */
export enum ControllingAgency {
  UN = 'UN', // United Nations
  EAN = 'EAN', // EAN International (now GS1)
}

/**
 * Syntax Identifier codes
 */
export enum SyntaxIdentifier {
  UNOA = 'UNOA', // Level A - ISO 646 basic set
  UNOB = 'UNOB', // Level B - ISO 646 extended set
  UNOC = 'UNOC', // Level C - Latin-1 (ISO 8859-1)
  UNOD = 'UNOD', // Level D - Latin-2 (ISO 8859-2)
  UNOE = 'UNOE', // Level E - Latin-5 (ISO 8859-9)
  UNOF = 'UNOF', // Level F - Latin-9 (ISO 8859-15)
  UNOG = 'UNOG', // Level G - Arabic (ISO 8859-6)
  UNOH = 'UNOH', // Level H - Hebrew (ISO 8859-8)
  UNOI = 'UNOI', // Level I - Japanese (JIS X 0212)
  UNOJ = 'UNOJ', // Level J - Japanese (JIS X 0208)
  UNOK = 'UNOK', // Level K - Korean (KS C 5601)
  UNOL = 'UNOL', // Level L - Chinese (GB 2312)
  UNOM = 'UNOM', // Level M - Chinese (Big5)
  UNON = 'UNON', // Level N - Greek (ISO 8859-7)
  UNOO = 'UNOO', // Level O - Thai (TIS-620)
  UNOP = 'UNOP', // Level P - UTF-8
  UNOQ = 'UNOQ', // Level Q - UTF-16
}
