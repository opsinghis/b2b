/**
 * EDIFACT Message Type Interfaces
 * Structured representations for ORDERS, ORDRSP, DESADV, INVOIC
 */

/**
 * Common Party/Name and Address structure
 */
export interface EdifactParty {
  /** Party function qualifier (BY=Buyer, SU=Supplier, DP=Delivery party, etc.) */
  partyFunctionQualifier: string;
  /** Party identification */
  partyIdentification?: {
    /** Party identifier */
    id: string;
    /** Code list qualifier (optional) */
    codeListQualifier?: string;
    /** Code list responsible agency (optional, e.g., 9=EAN/GS1) */
    responsibleAgency?: string;
  };
  /** Party name */
  name?: string;
  /** Party name (continuation) */
  partyNameContinuation?: string;
  /** Street address */
  streetAddress?: string;
  /** City name */
  cityName?: string;
  /** Country sub-entity (state/province) */
  countrySubEntity?: string;
  /** Postal code */
  postalCode?: string;
  /** Country code (ISO 3166-1 alpha-2) */
  countryCode?: string;
  /** Contact information */
  contacts?: EdifactContact[];
  /** Reference information */
  references?: EdifactReference[];
}

/**
 * Contact information
 */
export interface EdifactContact {
  /** Contact function code (AD=Admin, OC=Order contact, etc.) */
  contactFunctionCode: string;
  /** Contact name */
  name?: string;
  /** Communication details */
  communications?: Array<{
    /** Number/identifier */
    number: string;
    /** Channel qualifier (TE=Telephone, FX=Fax, EM=Email, etc.) */
    channelQualifier: string;
  }>;
}

/**
 * Reference information
 */
export interface EdifactReference {
  /** Reference qualifier (ON=Order number, CT=Contract, IV=Invoice, etc.) */
  referenceQualifier: string;
  /** Reference number */
  referenceNumber?: string;
  /** Document/message number (optional) */
  documentNumber?: string;
  /** Line number (optional) */
  lineNumber?: string;
}

/**
 * Date/time/period information
 */
export interface EdifactDateTime {
  /** Date/time/period qualifier (137=Document date, 2=Delivery date, etc.) */
  qualifier: string;
  /** Date/time value */
  value?: string;
  /** Format qualifier (102=CCYYMMDD, 203=CCYYMMDDHHMM, etc.) */
  formatQualifier?: string;
}

/**
 * Monetary amount
 */
export interface EdifactMonetaryAmount {
  /** Amount type qualifier (39=Invoice amount, 86=Message total, etc.) */
  typeQualifier: string;
  /** Amount */
  amount: number;
  /** Currency (optional if specified at message level) */
  currency?: string;
}

/**
 * Quantity information
 */
export interface EdifactQuantity {
  /** Quantity qualifier (21=Ordered, 47=Invoiced, 12=Despatch, etc.) */
  qualifier: string;
  /** Quantity value */
  quantity: number;
  /** Unit of measure (PCE=Piece, KGM=Kilogram, etc.) */
  unitOfMeasure?: string;
}

/**
 * Price information
 */
export interface EdifactPrice {
  /** Price qualifier (AAA=Calculation net, AAB=Calculation gross, etc.) */
  qualifier: string;
  /** Price amount */
  amount: number;
  /** Price type (optional) */
  priceType?: string;
  /** Price specification code (optional) */
  specificationCode?: string;
  /** Unit price basis */
  unitPriceBasis?: number;
  /** Unit of measure */
  unitOfMeasure?: string;
}

/**
 * Tax information
 */
export interface EdifactTax {
  /** Duty/tax/fee function qualifier (7=Tax) */
  functionQualifier: string;
  /** Duty/tax/fee type (VAT, GST, etc.) */
  type?: string;
  /** Duty/tax/fee category (S=Standard, E=Exempt, etc.) */
  category?: string;
  /** Duty/tax/fee rate */
  rate?: number;
  /** Duty/tax/fee amount */
  amount?: number;
  /** Duty/tax/fee basis amount */
  basisAmount?: number;
}

/**
 * Allowance/charge information
 */
export interface EdifactAllowanceCharge {
  /** Allowance or charge indicator (A=Allowance, C=Charge) */
  indicator: 'A' | 'C';
  /** Allowance/charge type */
  type?: string;
  /** Sequence number */
  sequenceNumber?: string;
  /** Calculation sequence indicator */
  calculationSequence?: string;
  /** Allowance/charge percentage */
  percentage?: number;
  /** Allowance/charge amount */
  amount?: number;
  /** Basis amount */
  basisAmount?: number;
  /** Description */
  description?: string;
}

/**
 * Product identification
 */
export interface EdifactProductId {
  /** Item number (e.g., GTIN, buyer's article number) */
  itemNumber: string;
  /** Item number type (SRV=GS1 GTIN, IN=Buyer's item number, etc.) */
  itemNumberType?: string;
  /** Code list responsible agency (9=GS1) */
  responsibleAgency?: string;
}

/**
 * Free text information
 */
export interface EdifactFreeText {
  /** Text subject qualifier (AAA=General info, DEL=Delivery info, etc.) */
  subjectQualifier: string;
  /** Text function code (optional) */
  functionCode?: string;
  /** Text lines */
  text: string[];
}

// ============================================================================
// ORDERS Message - Purchase Order
// ============================================================================

/**
 * ORDERS line item
 */
export interface EdifactOrdersLineItem {
  /** Line item number */
  lineNumber: string;
  /** Action request/notification code (optional) */
  actionCode?: string;
  /** Product identifications */
  productIds: EdifactProductId[];
  /** Product description */
  description?: string;
  /** Quantities */
  quantities: EdifactQuantity[];
  /** Prices */
  prices?: EdifactPrice[];
  /** Monetary amounts */
  amounts?: EdifactMonetaryAmount[];
  /** References (e.g., to contract, previous order) */
  references?: EdifactReference[];
  /** Dates (e.g., requested delivery date) */
  dates?: EdifactDateTime[];
  /** Allowances/charges at line level */
  allowancesCharges?: EdifactAllowanceCharge[];
  /** Tax information at line level */
  taxes?: EdifactTax[];
  /** Additional item description */
  additionalDescription?: EdifactFreeText[];
  /** Package information */
  packages?: Array<{
    numberOfPackages?: number;
    packageType?: string;
    packagingLevel?: string;
  }>;
}

/**
 * ORDERS Message - Purchase Order
 */
export interface Edifact_ORDERS {
  messageType: 'ORDERS';
  messageReferenceNumber: string;
  /** Message function (9=Original, 5=Replace, 1=Cancellation) */
  messageFunction?: string;
  /** Document type code */
  documentTypeCode?: string;
  /** Order number */
  orderNumber: string;
  /** Order date */
  orderDate: string;
  /** Currency */
  currency?: string;
  /** Payment terms */
  paymentTerms?: {
    termsType?: string;
    termsPeriodType?: string;
    termsPeriodCount?: number;
    termsDescription?: string;
  };
  /** Delivery terms */
  deliveryTerms?: {
    deliveryTermsCode?: string;
    deliveryTermsCodeQualifier?: string;
    deliveryTermsLocation?: string;
  };
  /** Transport information */
  transport?: {
    transportStageQualifier?: string;
    transportMode?: string;
    transportMeansDescription?: string;
    carrierIdentification?: string;
    carrierName?: string;
  };
  /** Parties (buyer, supplier, delivery party, etc.) */
  parties: EdifactParty[];
  /** Header-level dates */
  dates?: EdifactDateTime[];
  /** Header-level references */
  references?: EdifactReference[];
  /** Header-level amounts */
  amounts?: EdifactMonetaryAmount[];
  /** Header-level allowances/charges */
  allowancesCharges?: EdifactAllowanceCharge[];
  /** Header-level taxes */
  taxes?: EdifactTax[];
  /** Free text at header level */
  freeText?: EdifactFreeText[];
  /** Line items */
  lineItems: EdifactOrdersLineItem[];
  /** Control totals */
  controlTotals?: {
    /** Total number of line items */
    lineItemCount?: number;
    /** Total monetary amount */
    totalAmount?: number;
    /** Total tax amount */
    totalTaxAmount?: number;
  };
}

// ============================================================================
// ORDRSP Message - Purchase Order Response
// ============================================================================

/**
 * ORDRSP line item
 */
export interface EdifactOrdrspLineItem extends EdifactOrdersLineItem {
  /** Response type (AC=Accepted, AK=Acknowledged, etc.) */
  responseType?: string;
  /** Status (3=Accepted, 5=Amended, 27=Not accepted, etc.) */
  status?: string;
  /** Reason for difference */
  reasonForChange?: string;
}

/**
 * ORDRSP Message - Purchase Order Response
 */
export interface Edifact_ORDRSP {
  messageType: 'ORDRSP';
  messageReferenceNumber: string;
  /** Message function */
  messageFunction?: string;
  /** Response number */
  responseNumber: string;
  /** Response date */
  responseDate: string;
  /** Original order reference */
  orderReference: string;
  /** Order date reference */
  orderDateReference?: string;
  /** Response type (AC=Accepted in full, AP=Accepted with amendment, etc.) */
  responseType?: string;
  /** Currency */
  currency?: string;
  /** Parties */
  parties: EdifactParty[];
  /** Dates */
  dates?: EdifactDateTime[];
  /** References */
  references?: EdifactReference[];
  /** Free text */
  freeText?: EdifactFreeText[];
  /** Line items */
  lineItems: EdifactOrdrspLineItem[];
  /** Control totals */
  controlTotals?: {
    lineItemCount?: number;
    totalAmount?: number;
  };
}

// ============================================================================
// DESADV Message - Despatch Advice (Ship Notice)
// ============================================================================

/**
 * DESADV package/handling unit information
 */
export interface EdifactDesadvPackage {
  /** Hierarchical level (shipment, order, pack, item) */
  hierarchicalLevel?: string;
  /** Package ID (SSCC) */
  packageId?: string;
  /** Package type code */
  packageType?: string;
  /** Number of packages */
  numberOfPackages?: number;
  /** Gross weight */
  grossWeight?: number;
  /** Weight unit (KGM, LBR) */
  weightUnit?: string;
  /** Measurements */
  measurements?: Array<{
    dimension: string;
    value: number;
    unit: string;
  }>;
  /** Marks and numbers */
  marks?: string[];
  /** Items in this package */
  items?: EdifactDesadvLineItem[];
}

/**
 * DESADV line item
 */
export interface EdifactDesadvLineItem {
  /** Line item number */
  lineNumber: string;
  /** Product identifications */
  productIds: EdifactProductId[];
  /** Product description */
  description?: string;
  /** Despatch quantity */
  quantity: number;
  /** Unit of measure */
  unitOfMeasure?: string;
  /** Order reference */
  orderReference?: string;
  /** Order line reference */
  orderLineReference?: string;
  /** Batch/lot number */
  batchNumber?: string;
  /** Serial numbers */
  serialNumbers?: string[];
  /** Best before date */
  bestBeforeDate?: string;
  /** Production date */
  productionDate?: string;
}

/**
 * DESADV Message - Despatch Advice
 */
export interface Edifact_DESADV {
  messageType: 'DESADV';
  messageReferenceNumber: string;
  /** Message function */
  messageFunction?: string;
  /** Despatch advice number */
  despatchNumber: string;
  /** Despatch date */
  despatchDate: string;
  /** Expected delivery date */
  deliveryDate?: string;
  /** Parties (consignor, consignee, carrier, etc.) */
  parties: EdifactParty[];
  /** Transport details */
  transport?: {
    transportMode?: string;
    transportMeansId?: string;
    transportMeansNationality?: string;
    carrierName?: string;
    trackingNumber?: string;
    vehicleId?: string;
  };
  /** Order references */
  orderReferences?: Array<{
    orderNumber: string;
    orderDate?: string;
  }>;
  /** References */
  references?: EdifactReference[];
  /** Dates */
  dates?: EdifactDateTime[];
  /** Packages/handling units */
  packages?: EdifactDesadvPackage[];
  /** Line items (if not nested in packages) */
  lineItems?: EdifactDesadvLineItem[];
  /** Control totals */
  controlTotals?: {
    lineItemCount?: number;
    packageCount?: number;
    totalQuantity?: number;
    totalGrossWeight?: number;
    totalNetWeight?: number;
  };
}

// ============================================================================
// INVOIC Message - Invoice
// ============================================================================

/**
 * INVOIC line item
 */
export interface EdifactInvoicLineItem {
  /** Line item number */
  lineNumber: string;
  /** Product identifications */
  productIds: EdifactProductId[];
  /** Product description */
  description?: string;
  /** Invoiced quantity */
  quantity: number;
  /** Unit of measure */
  unitOfMeasure?: string;
  /** Unit price */
  unitPrice: number;
  /** Price qualifier */
  priceQualifier?: string;
  /** Line amount */
  lineAmount: number;
  /** Order reference */
  orderReference?: string;
  /** Order line reference */
  orderLineReference?: string;
  /** Despatch reference */
  despatchReference?: string;
  /** Despatch line reference */
  despatchLineReference?: string;
  /** Allowances/charges at line level */
  allowancesCharges?: EdifactAllowanceCharge[];
  /** Tax information at line level */
  taxes?: EdifactTax[];
  /** Additional amounts */
  amounts?: EdifactMonetaryAmount[];
  /** Free text */
  freeText?: EdifactFreeText[];
}

/**
 * INVOIC Message - Invoice
 */
export interface Edifact_INVOIC {
  messageType: 'INVOIC';
  messageReferenceNumber: string;
  /** Message function */
  messageFunction?: string;
  /** Invoice number */
  invoiceNumber: string;
  /** Invoice date */
  invoiceDate: string;
  /** Invoice type (380=Commercial invoice, 381=Credit note, etc.) */
  invoiceType?: string;
  /** Original order reference */
  orderReference?: string;
  /** Order date */
  orderDate?: string;
  /** Despatch reference */
  despatchReference?: string;
  /** Currency */
  currency: string;
  /** Payment terms */
  paymentTerms?: {
    termsType?: string;
    netDueDate?: string;
    netDays?: number;
    discountPercent?: number;
    discountDays?: number;
    description?: string;
  };
  /** Payment instructions */
  paymentInstructions?: {
    paymentMeansCode?: string;
    paymentChannelCode?: string;
    accountHolderName?: string;
    accountNumber?: string;
    bankIdentifier?: string;
    bankName?: string;
  };
  /** Parties (seller, buyer, payer, payee, etc.) */
  parties: EdifactParty[];
  /** Dates */
  dates?: EdifactDateTime[];
  /** References */
  references?: EdifactReference[];
  /** Header-level allowances/charges */
  allowancesCharges?: EdifactAllowanceCharge[];
  /** Header-level taxes (summary) */
  taxes?: EdifactTax[];
  /** Free text at header level */
  freeText?: EdifactFreeText[];
  /** Line items */
  lineItems: EdifactInvoicLineItem[];
  /** Summary totals */
  totals: {
    /** Total line items amount before adjustments */
    lineItemsTotal?: number;
    /** Total allowances */
    totalAllowances?: number;
    /** Total charges */
    totalCharges?: number;
    /** Taxable amount */
    taxableAmount?: number;
    /** Total tax amount */
    totalTaxAmount?: number;
    /** Invoice total */
    invoiceTotal: number;
    /** Amount due */
    amountDue?: number;
    /** Pre-paid amount */
    prepaidAmount?: number;
  };
}

/**
 * Union type for all supported message types
 */
export type EdifactMessageData = Edifact_ORDERS | Edifact_ORDRSP | Edifact_DESADV | Edifact_INVOIC;
