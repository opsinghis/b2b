/**
 * X12 EDI Types and Interfaces
 * Supports versions 4010 and 5010
 */

/**
 * X12 Version identifiers
 */
export type X12Version = '004010' | '005010';

/**
 * Default delimiters for X12 documents
 */
export interface X12Delimiters {
  /** Element separator (default: *) */
  elementSeparator: string;
  /** Subelement separator (default: :) */
  subelementSeparator: string;
  /** Repetition separator (default: ^) */
  repetitionSeparator: string;
  /** Segment terminator (default: ~) */
  segmentTerminator: string;
}

/**
 * Default X12 delimiters
 */
export const DEFAULT_X12_DELIMITERS: X12Delimiters = {
  elementSeparator: '*',
  subelementSeparator: ':',
  repetitionSeparator: '^',
  segmentTerminator: '~',
};

/**
 * ISA Interchange Control Header
 */
export interface ISASegment {
  segmentId: 'ISA';
  /** ISA01 - Authorization Information Qualifier */
  authorizationQualifier: string;
  /** ISA02 - Authorization Information */
  authorizationInfo: string;
  /** ISA03 - Security Information Qualifier */
  securityQualifier: string;
  /** ISA04 - Security Information */
  securityInfo: string;
  /** ISA05 - Interchange ID Qualifier (Sender) */
  senderIdQualifier: string;
  /** ISA06 - Interchange Sender ID */
  senderId: string;
  /** ISA07 - Interchange ID Qualifier (Receiver) */
  receiverIdQualifier: string;
  /** ISA08 - Interchange Receiver ID */
  receiverId: string;
  /** ISA09 - Interchange Date (YYMMDD) */
  interchangeDate: string;
  /** ISA10 - Interchange Time (HHMM) */
  interchangeTime: string;
  /** ISA11 - Repetition Separator (5010) or Standards Identifier (4010) */
  repetitionSeparator: string;
  /** ISA12 - Interchange Control Version Number */
  versionNumber: X12Version;
  /** ISA13 - Interchange Control Number */
  controlNumber: string;
  /** ISA14 - Acknowledgment Requested (0 or 1) */
  acknowledgmentRequested: '0' | '1';
  /** ISA15 - Usage Indicator (P=Production, T=Test) */
  usageIndicator: 'P' | 'T';
  /** ISA16 - Component Element Separator */
  componentSeparator: string;
}

/**
 * IEA Interchange Control Trailer
 */
export interface IEASegment {
  segmentId: 'IEA';
  /** IEA01 - Number of Included Functional Groups */
  numberOfGroups: number;
  /** IEA02 - Interchange Control Number (must match ISA13) */
  controlNumber: string;
}

/**
 * GS Functional Group Header
 */
export interface GSSegment {
  segmentId: 'GS';
  /** GS01 - Functional Identifier Code */
  functionalCode: string;
  /** GS02 - Application Sender's Code */
  senderCode: string;
  /** GS03 - Application Receiver's Code */
  receiverCode: string;
  /** GS04 - Date (CCYYMMDD) */
  date: string;
  /** GS05 - Time (HHMM or HHMMSS) */
  time: string;
  /** GS06 - Group Control Number */
  controlNumber: string;
  /** GS07 - Responsible Agency Code */
  agencyCode: string;
  /** GS08 - Version/Release/Industry Identifier Code */
  versionCode: string;
}

/**
 * GE Functional Group Trailer
 */
export interface GESegment {
  segmentId: 'GE';
  /** GE01 - Number of Transaction Sets Included */
  numberOfTransactionSets: number;
  /** GE02 - Group Control Number (must match GS06) */
  controlNumber: string;
}

/**
 * ST Transaction Set Header
 */
export interface STSegment {
  segmentId: 'ST';
  /** ST01 - Transaction Set Identifier Code (850, 855, 856, 810, 997) */
  transactionSetCode: string;
  /** ST02 - Transaction Set Control Number */
  controlNumber: string;
  /** ST03 - Implementation Convention Reference (optional) */
  implementationReference?: string;
}

/**
 * SE Transaction Set Trailer
 */
export interface SESegment {
  segmentId: 'SE';
  /** SE01 - Number of Included Segments */
  numberOfSegments: number;
  /** SE02 - Transaction Set Control Number (must match ST02) */
  controlNumber: string;
}

/**
 * Generic X12 Segment
 */
export interface X12Segment {
  segmentId: string;
  elements: X12Element[];
  raw?: string;
}

/**
 * X12 Element (can contain subelements)
 */
export interface X12Element {
  value: string;
  subelements?: string[];
  repetitions?: string[];
}

/**
 * Functional Group containing transaction sets
 */
export interface X12FunctionalGroup {
  header: GSSegment;
  transactionSets: X12TransactionSet[];
  trailer: GESegment;
}

/**
 * Transaction Set (contains actual business data)
 */
export interface X12TransactionSet {
  header: STSegment;
  segments: X12Segment[];
  trailer: SESegment;
}

/**
 * Complete X12 Interchange
 */
export interface X12Interchange {
  /** ISA/IEA envelope */
  header: ISASegment;
  /** Functional groups within the interchange */
  functionalGroups: X12FunctionalGroup[];
  /** IEA trailer */
  trailer: IEASegment;
  /** Original delimiters detected */
  delimiters: X12Delimiters;
}

/**
 * Transaction Set types supported
 */
export enum TransactionSetType {
  /** Purchase Order */
  PO_850 = '850',
  /** Purchase Order Acknowledgment */
  POA_855 = '855',
  /** Ship Notice/Manifest */
  ASN_856 = '856',
  /** Invoice */
  INV_810 = '810',
  /** Functional Acknowledgment */
  FA_997 = '997',
}

/**
 * Functional identifier codes for GS01
 */
export enum FunctionalIdentifierCode {
  /** Purchase Order */
  PO = 'PO',
  /** Purchase Order Acknowledgment */
  PR = 'PR',
  /** Ship Notice/Manifest */
  SH = 'SH',
  /** Invoice */
  IN = 'IN',
  /** Functional Acknowledgment */
  FA = 'FA',
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
}

/**
 * Parse error with location information
 */
export interface X12ParseError {
  code: string;
  message: string;
  position: ParsePosition;
  segmentId?: string;
  elementIndex?: number;
  severity: 'error' | 'warning';
}

/**
 * Validation error for semantic validation
 */
export interface X12ValidationError {
  code: string;
  message: string;
  segmentId: string;
  elementIndex?: number;
  severity: 'error' | 'warning';
  path?: string;
}

/**
 * Parser result containing parsed document and any errors
 */
export interface X12ParseResult {
  success: boolean;
  interchange?: X12Interchange;
  errors: X12ParseError[];
  warnings: X12ParseError[];
}

/**
 * Generation options
 */
export interface X12GenerationOptions {
  /** Delimiters to use */
  delimiters?: Partial<X12Delimiters>;
  /** X12 version (default: 005010) */
  version?: X12Version;
  /** Line breaks between segments */
  lineBreaks?: boolean;
  /** Include ISA/IEA envelope */
  includeEnvelope?: boolean;
}

/**
 * Partner-specific configuration
 */
export interface X12PartnerConfig {
  partnerId: string;
  partnerName: string;
  /** ISA ID Qualifier */
  idQualifier: string;
  /** ISA ID */
  partnerId_ISA: string;
  /** Custom delimiters */
  delimiters?: Partial<X12Delimiters>;
  /** Preferred version */
  preferredVersion?: X12Version;
  /** Usage indicator */
  usageIndicator?: 'P' | 'T';
}

/**
 * Token types for lexer
 */
export enum X12TokenType {
  SEGMENT_ID = 'SEGMENT_ID',
  ELEMENT = 'ELEMENT',
  SUBELEMENT = 'SUBELEMENT',
  REPETITION = 'REPETITION',
  SEGMENT_TERMINATOR = 'SEGMENT_TERMINATOR',
  EOF = 'EOF',
}

/**
 * Lexer token
 */
export interface X12Token {
  type: X12TokenType;
  value: string;
  position: ParsePosition;
}
