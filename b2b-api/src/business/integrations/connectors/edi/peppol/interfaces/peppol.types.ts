/**
 * Peppol E-Invoicing Types
 *
 * Core interfaces for Peppol BIS Billing 3.0 implementation
 * supporting UBL 2.1 Invoice and Credit Note documents.
 */

/**
 * Peppol Participant Identifier
 * Format: scheme:identifier (e.g., "0088:7300010000001")
 */
export interface PeppolParticipant {
  /** Participant identifier scheme (e.g., 0088 for GLN) */
  scheme: string;
  /** Actual identifier value */
  identifier: string;
  /** Endpoint ID for SMP lookup */
  endpointId?: string;
  /** Party name */
  name?: string;
  /** Country code (ISO 3166-1 alpha-2) */
  countryCode?: string;
}

/**
 * Peppol Document Type Identifier
 */
export interface PeppolDocumentType {
  /** Document type scheme */
  scheme: string;
  /** Document type identifier */
  identifier: string;
  /** Human-readable name */
  name: string;
}

/**
 * Peppol Process Identifier
 */
export interface PeppolProcess {
  /** Process scheme */
  scheme: string;
  /** Process identifier */
  identifier: string;
}

/**
 * UBL 2.1 Party (Common for supplier and customer)
 */
export interface UblParty {
  /** Endpoint ID (Peppol participant) */
  endpointId: {
    schemeId: string;
    value: string;
  };
  /** Party identification */
  partyIdentification?: Array<{
    id: {
      schemeId?: string;
      value: string;
    };
  }>;
  /** Party name */
  partyName?: Array<{
    name: string;
  }>;
  /** Postal address */
  postalAddress?: UblAddress;
  /** Tax scheme registration */
  partyTaxScheme?: Array<{
    companyId?: string;
    taxScheme: {
      id: string;
    };
  }>;
  /** Legal entity information */
  partyLegalEntity?: Array<{
    registrationName: string;
    companyId?: {
      schemeId?: string;
      value: string;
    };
    companyLegalForm?: string;
  }>;
  /** Contact information */
  contact?: UblContact;
}

/**
 * UBL 2.1 Address
 */
export interface UblAddress {
  streetName?: string;
  additionalStreetName?: string;
  cityName?: string;
  postalZone?: string;
  countrySubentity?: string;
  addressLine?: Array<{
    line: string;
  }>;
  country: {
    identificationCode: string;
  };
}

/**
 * UBL 2.1 Contact
 */
export interface UblContact {
  name?: string;
  telephone?: string;
  electronicMail?: string;
}

/**
 * UBL 2.1 Tax Category
 */
export interface UblTaxCategory {
  /** Tax category code (e.g., S, Z, E, AE, K, G, O, L, M) */
  id: string;
  /** Tax rate percentage */
  percent?: number;
  /** Tax exemption reason code */
  taxExemptionReasonCode?: string;
  /** Tax exemption reason text */
  taxExemptionReason?: string;
  /** Tax scheme */
  taxScheme: {
    id: string;
  };
}

/**
 * UBL 2.1 Tax Subtotal
 */
export interface UblTaxSubtotal {
  /** Taxable amount */
  taxableAmount: UblAmount;
  /** Tax amount */
  taxAmount: UblAmount;
  /** Tax category */
  taxCategory: UblTaxCategory;
}

/**
 * UBL 2.1 Tax Total
 */
export interface UblTaxTotal {
  /** Total tax amount */
  taxAmount: UblAmount;
  /** Tax subtotals by category */
  taxSubtotal?: UblTaxSubtotal[];
}

/**
 * UBL 2.1 Amount with currency
 */
export interface UblAmount {
  currencyId: string;
  value: number;
}

/**
 * UBL 2.1 Quantity
 */
export interface UblQuantity {
  unitCode: string;
  value: number;
}

/**
 * UBL 2.1 Period
 */
export interface UblPeriod {
  startDate?: string;
  endDate?: string;
  descriptionCode?: string;
}

/**
 * UBL 2.1 Payment Means
 */
export interface UblPaymentMeans {
  /** Payment means code (UNTDID 4461) */
  paymentMeansCode: {
    value: string;
    name?: string;
  };
  /** Payment due date */
  paymentDueDate?: string;
  /** Payment ID (reference) */
  paymentId?: string[];
  /** Bank account for credit transfer */
  payeeFinancialAccount?: {
    id: string;
    name?: string;
    financialInstitutionBranch?: {
      id: string;
      name?: string;
    };
  };
  /** Card account for card payment */
  cardAccount?: {
    primaryAccountNumberId: string;
    networkId: string;
    holderName?: string;
  };
  /** Direct debit mandate */
  paymentMandate?: {
    id: string;
    payerFinancialAccount?: {
      id: string;
    };
  };
}

/**
 * UBL 2.1 Payment Terms
 */
export interface UblPaymentTerms {
  note?: string[];
}

/**
 * UBL 2.1 Allowance/Charge
 */
export interface UblAllowanceCharge {
  /** true = charge, false = allowance */
  chargeIndicator: boolean;
  /** Reason code (UNCL5189 for allowances, UNCL7161 for charges) */
  allowanceChargeReasonCode?: string;
  /** Reason text */
  allowanceChargeReason?: string;
  /** Multiplier factor (percentage) */
  multiplierFactorNumeric?: number;
  /** Amount */
  amount: UblAmount;
  /** Base amount for percentage calculation */
  baseAmount?: UblAmount;
  /** Tax category */
  taxCategory?: UblTaxCategory;
}

/**
 * UBL 2.1 Invoice Line Item
 */
export interface UblItem {
  /** Item description */
  description?: string[];
  /** Item name */
  name: string;
  /** Buyer's item identification */
  buyersItemIdentification?: {
    id: string;
  };
  /** Seller's item identification */
  sellersItemIdentification?: {
    id: string;
  };
  /** Standard item identification (e.g., GTIN) */
  standardItemIdentification?: {
    id: {
      schemeId: string;
      value: string;
    };
  };
  /** Origin country */
  originCountry?: {
    identificationCode: string;
  };
  /** Commodity classification */
  commodityClassification?: Array<{
    itemClassificationCode: {
      listId: string;
      value: string;
    };
  }>;
  /** Classified tax category */
  classifiedTaxCategory: UblTaxCategory;
  /** Additional item properties */
  additionalItemProperty?: Array<{
    name: string;
    value: string;
  }>;
}

/**
 * UBL 2.1 Price
 */
export interface UblPrice {
  /** Price amount */
  priceAmount: UblAmount;
  /** Base quantity */
  baseQuantity?: UblQuantity;
  /** Price allowance/charge */
  allowanceCharge?: UblAllowanceCharge;
}

/**
 * UBL 2.1 Order Line Reference
 */
export interface UblOrderLineReference {
  lineId: string;
}

/**
 * UBL 2.1 Document Reference
 */
export interface UblDocumentReference {
  id: {
    schemeId?: string;
    value: string;
  };
  issueDate?: string;
  documentTypeCode?: string;
  documentDescription?: string[];
  attachment?: UblAttachment;
}

/**
 * UBL 2.1 Attachment
 */
export interface UblAttachment {
  embeddedDocumentBinaryObject?: {
    mimeCode: string;
    filename: string;
    content: string; // Base64 encoded
  };
  externalReference?: {
    uri: string;
  };
}

/**
 * UBL 2.1 Invoice Line
 */
export interface UblInvoiceLine {
  /** Line ID (unique within document) */
  id: string;
  /** Note */
  note?: string[];
  /** Invoiced quantity */
  invoicedQuantity: UblQuantity;
  /** Line extension amount (net) */
  lineExtensionAmount: UblAmount;
  /** Accounting cost code */
  accountingCost?: string;
  /** Invoice period */
  invoicePeriod?: UblPeriod;
  /** Order line reference */
  orderLineReference?: UblOrderLineReference;
  /** Document references */
  documentReference?: UblDocumentReference[];
  /** Line allowances/charges */
  allowanceCharge?: UblAllowanceCharge[];
  /** Item details */
  item: UblItem;
  /** Price information */
  price: UblPrice;
}

/**
 * UBL 2.1 Credit Note Line
 */
export interface UblCreditNoteLine {
  /** Line ID (unique within document) */
  id: string;
  /** Note */
  note?: string[];
  /** Credited quantity */
  creditedQuantity: UblQuantity;
  /** Line extension amount (net) */
  lineExtensionAmount: UblAmount;
  /** Accounting cost code */
  accountingCost?: string;
  /** Credit note period */
  invoicePeriod?: UblPeriod;
  /** Order line reference */
  orderLineReference?: UblOrderLineReference;
  /** Document references */
  documentReference?: UblDocumentReference[];
  /** Line allowances/charges */
  allowanceCharge?: UblAllowanceCharge[];
  /** Item details */
  item: UblItem;
  /** Price information */
  price: UblPrice;
}

/**
 * UBL 2.1 Legal Monetary Total
 */
export interface UblLegalMonetaryTotal {
  /** Sum of line extension amounts */
  lineExtensionAmount: UblAmount;
  /** Total amount excluding tax */
  taxExclusiveAmount: UblAmount;
  /** Total amount including tax */
  taxInclusiveAmount: UblAmount;
  /** Total document level allowances */
  allowanceTotalAmount?: UblAmount;
  /** Total document level charges */
  chargeTotalAmount?: UblAmount;
  /** Prepaid amount */
  prepaidAmount?: UblAmount;
  /** Payable rounding amount */
  payableRoundingAmount?: UblAmount;
  /** Amount due for payment */
  payableAmount: UblAmount;
}

/**
 * Billing Reference for Credit Notes
 */
export interface UblBillingReference {
  invoiceDocumentReference?: {
    id: string;
    issueDate?: string;
  };
  creditNoteDocumentReference?: {
    id: string;
    issueDate?: string;
  };
}

/**
 * UBL 2.1 Invoice Document
 */
export interface UblInvoice {
  /** UBL version ID */
  ublVersionId: string;
  /** Customization ID (Peppol BIS) */
  customizationId: string;
  /** Profile ID (Process) */
  profileId: string;
  /** Invoice number */
  id: string;
  /** Issue date */
  issueDate: string;
  /** Due date */
  dueDate?: string;
  /** Invoice type code (380, 381, 384, 389, 751) */
  invoiceTypeCode: string;
  /** Note */
  note?: string[];
  /** Tax point date */
  taxPointDate?: string;
  /** Document currency */
  documentCurrencyCode: string;
  /** Tax currency */
  taxCurrencyCode?: string;
  /** Accounting cost */
  accountingCost?: string;
  /** Buyer reference */
  buyerReference?: string;
  /** Invoice period */
  invoicePeriod?: UblPeriod;
  /** Order reference */
  orderReference?: {
    id: string;
    salesOrderId?: string;
  };
  /** Billing reference (previous invoice for corrections) */
  billingReference?: UblBillingReference[];
  /** Despatch document reference */
  despatchDocumentReference?: UblDocumentReference;
  /** Receipt document reference */
  receiptDocumentReference?: UblDocumentReference;
  /** Originator document reference */
  originatorDocumentReference?: UblDocumentReference;
  /** Contract document reference */
  contractDocumentReference?: UblDocumentReference;
  /** Additional document references */
  additionalDocumentReference?: UblDocumentReference[];
  /** Project reference */
  projectReference?: {
    id: string;
  };
  /** Supplier/Seller party */
  accountingSupplierParty: {
    party: UblParty;
  };
  /** Customer/Buyer party */
  accountingCustomerParty: {
    party: UblParty;
  };
  /** Payee party */
  payeeParty?: UblParty;
  /** Tax representative party */
  taxRepresentativeParty?: UblParty;
  /** Delivery information */
  delivery?: Array<{
    actualDeliveryDate?: string;
    deliveryLocation?: {
      id?: {
        schemeId?: string;
        value: string;
      };
      address?: UblAddress;
    };
    deliveryParty?: {
      partyName?: Array<{
        name: string;
      }>;
    };
  }>;
  /** Payment means */
  paymentMeans?: UblPaymentMeans[];
  /** Payment terms */
  paymentTerms?: UblPaymentTerms;
  /** Document level allowances/charges */
  allowanceCharge?: UblAllowanceCharge[];
  /** Tax total */
  taxTotal: UblTaxTotal[];
  /** Legal monetary total */
  legalMonetaryTotal: UblLegalMonetaryTotal;
  /** Invoice lines */
  invoiceLine: UblInvoiceLine[];
}

/**
 * UBL 2.1 Credit Note Document
 */
export interface UblCreditNote {
  /** UBL version ID */
  ublVersionId: string;
  /** Customization ID (Peppol BIS) */
  customizationId: string;
  /** Profile ID (Process) */
  profileId: string;
  /** Credit note number */
  id: string;
  /** Issue date */
  issueDate: string;
  /** Credit note type code (381, 396) */
  creditNoteTypeCode: string;
  /** Note */
  note?: string[];
  /** Tax point date */
  taxPointDate?: string;
  /** Document currency */
  documentCurrencyCode: string;
  /** Tax currency */
  taxCurrencyCode?: string;
  /** Accounting cost */
  accountingCost?: string;
  /** Buyer reference */
  buyerReference?: string;
  /** Credit note period */
  invoicePeriod?: UblPeriod;
  /** Order reference */
  orderReference?: {
    id: string;
    salesOrderId?: string;
  };
  /** Billing reference (original invoice) */
  billingReference?: UblBillingReference[];
  /** Despatch document reference */
  despatchDocumentReference?: UblDocumentReference;
  /** Receipt document reference */
  receiptDocumentReference?: UblDocumentReference;
  /** Originator document reference */
  originatorDocumentReference?: UblDocumentReference;
  /** Contract document reference */
  contractDocumentReference?: UblDocumentReference;
  /** Additional document references */
  additionalDocumentReference?: UblDocumentReference[];
  /** Project reference */
  projectReference?: {
    id: string;
  };
  /** Supplier/Seller party */
  accountingSupplierParty: {
    party: UblParty;
  };
  /** Customer/Buyer party */
  accountingCustomerParty: {
    party: UblParty;
  };
  /** Payee party */
  payeeParty?: UblParty;
  /** Tax representative party */
  taxRepresentativeParty?: UblParty;
  /** Delivery information */
  delivery?: Array<{
    actualDeliveryDate?: string;
    deliveryLocation?: {
      id?: {
        schemeId?: string;
        value: string;
      };
      address?: UblAddress;
    };
    deliveryParty?: {
      partyName?: Array<{
        name: string;
      }>;
    };
  }>;
  /** Payment means */
  paymentMeans?: UblPaymentMeans[];
  /** Payment terms */
  paymentTerms?: UblPaymentTerms;
  /** Document level allowances/charges */
  allowanceCharge?: UblAllowanceCharge[];
  /** Tax total */
  taxTotal: UblTaxTotal[];
  /** Legal monetary total */
  legalMonetaryTotal: UblLegalMonetaryTotal;
  /** Credit note lines */
  creditNoteLine: UblCreditNoteLine[];
}

/**
 * Peppol Document Status
 */
export enum PeppolDocumentStatus {
  DRAFT = 'draft',
  VALIDATED = 'validated',
  SIGNED = 'signed',
  SUBMITTED = 'submitted',
  DELIVERED = 'delivered',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

/**
 * Peppol Document Envelope
 */
export interface PeppolDocument<T = UblInvoice | UblCreditNote> {
  /** Document unique identifier */
  documentId: string;
  /** Document type (invoice or creditNote) */
  documentType: 'invoice' | 'creditNote';
  /** Peppol document type identifier */
  peppolDocumentType: PeppolDocumentType;
  /** Peppol process identifier */
  peppolProcess: PeppolProcess;
  /** Sender participant */
  sender: PeppolParticipant;
  /** Receiver participant */
  receiver: PeppolParticipant;
  /** Current status */
  status: PeppolDocumentStatus;
  /** The UBL document content */
  document: T;
  /** XML representation */
  xml?: string;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Status history */
  statusHistory: Array<{
    status: PeppolDocumentStatus;
    timestamp: Date;
    message?: string;
  }>;
  /** Validation errors if any */
  validationErrors?: PeppolValidationError[];
  /** Access Point message ID */
  accessPointMessageId?: string;
  /** Delivery receipt */
  deliveryReceipt?: {
    timestamp: Date;
    receiptId: string;
  };
}

/**
 * Validation Error
 */
export interface PeppolValidationError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Location in document (XPath or element name) */
  location?: string;
  /** Severity */
  severity: 'error' | 'warning' | 'info';
  /** Rule ID (from Schematron) */
  ruleId?: string;
}

/**
 * Validation Result
 */
export interface PeppolValidationResult {
  /** Is the document valid */
  valid: boolean;
  /** Validation errors */
  errors: PeppolValidationError[];
  /** Validation warnings */
  warnings: PeppolValidationError[];
  /** Validation info messages */
  infos: PeppolValidationError[];
  /** Validation profile used */
  profile: string;
  /** Timestamp */
  validatedAt: Date;
}

/**
 * SMP Lookup Result
 */
export interface SmpLookupResult {
  /** Participant found */
  found: boolean;
  /** Participant details */
  participant?: PeppolParticipant;
  /** Supported document types */
  documentTypes?: Array<{
    documentType: PeppolDocumentType;
    processes: PeppolProcess[];
    endpoints: Array<{
      transportProfile: string;
      endpointUrl: string;
      certificate?: string;
    }>;
  }>;
  /** Error if not found */
  error?: string;
}

/**
 * Access Point Send Request
 */
export interface AccessPointSendRequest {
  /** Sender participant */
  sender: PeppolParticipant;
  /** Receiver participant */
  receiver: PeppolParticipant;
  /** Document type */
  documentType: PeppolDocumentType;
  /** Process */
  process: PeppolProcess;
  /** UBL XML content */
  xmlContent: string;
  /** Optional metadata */
  metadata?: Record<string, string>;
}

/**
 * Access Point Send Response
 */
export interface AccessPointSendResponse {
  /** Success indicator */
  success: boolean;
  /** Message ID assigned by Access Point */
  messageId?: string;
  /** Timestamp */
  timestamp?: Date;
  /** Error details if failed */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * XRechnung Extension data
 */
export interface XRechnungExtension {
  /** Leitweg-ID (routing ID) */
  leitwegId: string;
  /** Buyer reference */
  buyerReference?: string;
}

/**
 * PDF/A-3 Generation Options
 */
export interface PdfA3Options {
  /** Invoice/Credit Note data */
  document: UblInvoice | UblCreditNote;
  /** XML content to embed */
  xmlContent: string;
  /** Template name */
  template?: string;
  /** Logo (base64) */
  logo?: string;
  /** Additional metadata */
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
  };
}

/**
 * Peppol Configuration
 */
export interface PeppolConfig {
  /** Access Point URL */
  accessPointUrl: string;
  /** Access Point API key */
  accessPointApiKey: string;
  /** SMP Lookup URL (default: directory.peppol.eu) */
  smpUrl?: string;
  /** Own participant identifier */
  ownParticipant: PeppolParticipant;
  /** Certificate for signing */
  signingCertificate?: string;
  /** Private key for signing */
  signingPrivateKey?: string;
  /** Enable XRechnung support */
  enableXRechnung?: boolean;
  /** Default document profile */
  defaultProfile?: string;
}
