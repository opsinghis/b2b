/**
 * QuickBooks Online Connector Interfaces
 * Implements REST API client for Intuit QuickBooks Online integration
 */

/**
 * QuickBooks Online authentication type
 */
export type QuickBooksAuthType = 'oauth2';

/**
 * QuickBooks Online environment
 */
export type QuickBooksEnvironment = 'sandbox' | 'production';

/**
 * QuickBooks Online connection configuration
 */
export interface QuickBooksConnectionConfig {
  /** QuickBooks Company ID (Realm ID) */
  realmId: string;

  /** Environment (sandbox or production) */
  environment: QuickBooksEnvironment;

  /** Minor version for API requests (default: 65) */
  minorVersion?: number;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Enable request/response logging */
  logging?: boolean;
}

/**
 * OAuth2 configuration for QuickBooks Online
 */
export interface QuickBooksOAuth2Config {
  /** OAuth2 client ID */
  clientId: string;

  /** OAuth2 client secret */
  clientSecret: string;

  /** OAuth2 access token */
  accessToken: string;

  /** OAuth2 refresh token */
  refreshToken: string;

  /** Token expiry time (Unix timestamp in ms) */
  expiresAt?: number;
}

/**
 * Combined QuickBooks credentials
 */
export interface QuickBooksCredentials {
  oauth2: QuickBooksOAuth2Config;
}

/**
 * QuickBooks REST API query options
 */
export interface QuickBooksQueryOptions {
  /** SQL-like query string */
  query?: string;

  /** Start position for pagination (1-based) */
  startPosition?: number;

  /** Max results per page (max 1000) */
  maxResults?: number;

  /** Order by clause */
  orderBy?: string;
}

/**
 * QuickBooks REST API response metadata
 */
export interface QuickBooksResponseMetadata {
  /** Start position */
  startPosition?: number;

  /** Max results */
  maxResults?: number;

  /** Total count */
  totalCount?: number;
}

/**
 * QuickBooks Query Response Base
 */
export interface QuickBooksQueryResponseBase {
  startPosition?: number;
  maxResults?: number;
  totalCount?: number;
}

/**
 * QuickBooks Query Response with typed entities
 */
export interface QuickBooksQueryResponse<T> extends QuickBooksQueryResponseBase {
  Customer?: T[];
  Item?: T[];
  Invoice?: T[];
  SalesReceipt?: T[];
  Payment?: T[];
  Account?: T[];
  Vendor?: T[];
  Bill?: T[];
  PurchaseOrder?: T[];
  Estimate?: T[];
  CreditMemo?: T[];
  RefundReceipt?: T[];
  JournalEntry?: T[];
  Transfer?: T[];
  Deposit?: T[];
  CompanyInfo?: T[];
}

/**
 * QuickBooks REST API response wrapper
 */
export interface QuickBooksApiResponse<T = unknown> {
  /** Query response */
  QueryResponse?: QuickBooksQueryResponse<T>;

  /** Response time */
  time?: string;
}

/**
 * QuickBooks Online Customer
 */
export interface QuickBooksCustomer {
  Id?: string;
  SyncToken?: string;
  DisplayName?: string;
  Title?: string;
  GivenName?: string;
  MiddleName?: string;
  FamilyName?: string;
  Suffix?: string;
  CompanyName?: string;
  FullyQualifiedName?: string;
  PrimaryEmailAddr?: QuickBooksEmailAddress;
  PrimaryPhone?: QuickBooksTelephoneNumber;
  Mobile?: QuickBooksTelephoneNumber;
  AlternatePhone?: QuickBooksTelephoneNumber;
  Fax?: QuickBooksTelephoneNumber;
  WebAddr?: QuickBooksWebAddress;
  BillAddr?: QuickBooksAddress;
  ShipAddr?: QuickBooksAddress;
  Notes?: string;
  Active?: boolean;
  Taxable?: boolean;
  Balance?: number;
  BalanceWithJobs?: number;
  CurrencyRef?: QuickBooksRef;
  PreferredDeliveryMethod?: string;
  PaymentMethodRef?: QuickBooksRef;
  DefaultTaxCodeRef?: QuickBooksRef;
  SalesTermRef?: QuickBooksRef;
  Job?: boolean;
  ParentRef?: QuickBooksRef;
  Level?: number;
  PrintOnCheckName?: string;
  MetaData?: QuickBooksMetaData;
}

/**
 * QuickBooks Online Item (Product/Service)
 */
export interface QuickBooksItem {
  Id?: string;
  SyncToken?: string;
  Name?: string;
  Description?: string;
  Active?: boolean;
  FullyQualifiedName?: string;
  Taxable?: boolean;
  UnitPrice?: number;
  Type?: QuickBooksItemType;
  IncomeAccountRef?: QuickBooksRef;
  ExpenseAccountRef?: QuickBooksRef;
  AssetAccountRef?: QuickBooksRef;
  PurchaseDesc?: string;
  PurchaseCost?: number;
  TrackQtyOnHand?: boolean;
  QtyOnHand?: number;
  InvStartDate?: string;
  Sku?: string;
  SalesTaxIncluded?: boolean;
  PurchaseTaxIncluded?: boolean;
  SalesTaxCodeRef?: QuickBooksRef;
  PurchaseTaxCodeRef?: QuickBooksRef;
  ParentRef?: QuickBooksRef;
  Level?: number;
  SubItem?: boolean;
  AbatementRate?: number;
  ReverseChargeRate?: number;
  ServiceType?: string;
  ItemCategoryType?: string;
  MetaData?: QuickBooksMetaData;
}

/**
 * QuickBooks Item types
 */
export type QuickBooksItemType = 'Inventory' | 'NonInventory' | 'Service' | 'Group' | 'Category';

/**
 * QuickBooks Online Invoice
 */
export interface QuickBooksInvoice {
  Id?: string;
  SyncToken?: string;
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  PrivateNote?: string;
  CustomerMemo?: QuickBooksMemoRef;
  CustomerRef?: QuickBooksRef;
  Line?: QuickBooksLine[];
  TxnTaxDetail?: QuickBooksTxnTaxDetail;
  BillAddr?: QuickBooksAddress;
  ShipAddr?: QuickBooksAddress;
  ShipFromAddr?: QuickBooksAddress;
  ShipDate?: string;
  TrackingNum?: string;
  ShipMethodRef?: QuickBooksRef;
  TotalAmt?: number;
  Balance?: number;
  HomeBalance?: number;
  HomeTotalAmt?: number;
  ApplyTaxAfterDiscount?: boolean;
  PrintStatus?: string;
  EmailStatus?: string;
  BillEmail?: QuickBooksEmailAddress;
  BillEmailCc?: QuickBooksEmailAddress;
  BillEmailBcc?: QuickBooksEmailAddress;
  DeliveryInfo?: QuickBooksDeliveryInfo;
  CurrencyRef?: QuickBooksRef;
  ExchangeRate?: number;
  GlobalTaxCalculation?: string;
  AllowIPNPayment?: boolean;
  AllowOnlinePayment?: boolean;
  AllowOnlineCreditCardPayment?: boolean;
  AllowOnlineACHPayment?: boolean;
  Deposit?: number;
  DepositToAccountRef?: QuickBooksRef;
  SalesTermRef?: QuickBooksRef;
  DepartmentRef?: QuickBooksRef;
  ClassRef?: QuickBooksRef;
  RecurDataRef?: QuickBooksRef;
  TaxExemptionRef?: QuickBooksRef;
  CustomField?: QuickBooksCustomField[];
  LinkedTxn?: QuickBooksLinkedTxn[];
  MetaData?: QuickBooksMetaData;
}

/**
 * QuickBooks Online Sales Receipt
 */
export interface QuickBooksSalesReceipt {
  Id?: string;
  SyncToken?: string;
  DocNumber?: string;
  TxnDate?: string;
  PrivateNote?: string;
  CustomerMemo?: QuickBooksMemoRef;
  CustomerRef?: QuickBooksRef;
  Line?: QuickBooksLine[];
  TxnTaxDetail?: QuickBooksTxnTaxDetail;
  BillAddr?: QuickBooksAddress;
  ShipAddr?: QuickBooksAddress;
  ShipFromAddr?: QuickBooksAddress;
  ShipDate?: string;
  TrackingNum?: string;
  ShipMethodRef?: QuickBooksRef;
  TotalAmt?: number;
  HomeBalance?: number;
  HomeTotalAmt?: number;
  ApplyTaxAfterDiscount?: boolean;
  PrintStatus?: string;
  EmailStatus?: string;
  BillEmail?: QuickBooksEmailAddress;
  DeliveryInfo?: QuickBooksDeliveryInfo;
  CurrencyRef?: QuickBooksRef;
  ExchangeRate?: number;
  GlobalTaxCalculation?: string;
  PaymentMethodRef?: QuickBooksRef;
  PaymentRefNum?: string;
  DepositToAccountRef?: QuickBooksRef;
  CreditCardPayment?: QuickBooksCreditCardPayment;
  DepartmentRef?: QuickBooksRef;
  ClassRef?: QuickBooksRef;
  CustomField?: QuickBooksCustomField[];
  MetaData?: QuickBooksMetaData;
}

/**
 * QuickBooks Online Payment
 */
export interface QuickBooksPayment {
  Id?: string;
  SyncToken?: string;
  TxnDate?: string;
  TotalAmt?: number;
  CustomerRef?: QuickBooksRef;
  CurrencyRef?: QuickBooksRef;
  ExchangeRate?: number;
  PaymentMethodRef?: QuickBooksRef;
  DepositToAccountRef?: QuickBooksRef;
  PaymentRefNum?: string;
  PrivateNote?: string;
  UnappliedAmt?: number;
  ProcessPayment?: boolean;
  Line?: QuickBooksPaymentLine[];
  CreditCardPayment?: QuickBooksCreditCardPayment;
  ARAccountRef?: QuickBooksRef;
  MetaData?: QuickBooksMetaData;
}

/**
 * QuickBooks Payment Line
 */
export interface QuickBooksPaymentLine {
  Amount?: number;
  LinkedTxn?: QuickBooksLinkedTxn[];
}

/**
 * QuickBooks Line item
 */
export interface QuickBooksLine {
  Id?: string;
  LineNum?: number;
  Description?: string;
  Amount?: number;
  DetailType?: QuickBooksLineDetailType;
  SalesItemLineDetail?: QuickBooksSalesItemLineDetail;
  SubTotalLineDetail?: Record<string, unknown>;
  DiscountLineDetail?: QuickBooksDiscountLineDetail;
  GroupLineDetail?: QuickBooksGroupLineDetail;
  DescriptionOnly?: boolean;
}

/**
 * QuickBooks Line detail types
 */
export type QuickBooksLineDetailType =
  | 'SalesItemLineDetail'
  | 'SubTotalLineDetail'
  | 'DiscountLineDetail'
  | 'GroupLineDetail'
  | 'DescriptionOnly';

/**
 * QuickBooks Sales Item Line Detail
 */
export interface QuickBooksSalesItemLineDetail {
  ItemRef?: QuickBooksRef;
  ItemAccountRef?: QuickBooksRef;
  ClassRef?: QuickBooksRef;
  TaxCodeRef?: QuickBooksRef;
  ServiceDate?: string;
  Qty?: number;
  UnitPrice?: number;
  DiscountRate?: number;
  DiscountAmt?: number;
  TaxInclusiveAmt?: number;
}

/**
 * QuickBooks Discount Line Detail
 */
export interface QuickBooksDiscountLineDetail {
  PercentBased?: boolean;
  DiscountPercent?: number;
  DiscountAccountRef?: QuickBooksRef;
  ClassRef?: QuickBooksRef;
}

/**
 * QuickBooks Group Line Detail
 */
export interface QuickBooksGroupLineDetail {
  GroupItemRef?: QuickBooksRef;
  Quantity?: number;
  Line?: QuickBooksLine[];
}

/**
 * QuickBooks Tax Detail
 */
export interface QuickBooksTxnTaxDetail {
  TxnTaxCodeRef?: QuickBooksRef;
  TotalTax?: number;
  TaxLine?: QuickBooksTaxLine[];
}

/**
 * QuickBooks Tax Line
 */
export interface QuickBooksTaxLine {
  Amount?: number;
  DetailType?: string;
  TaxLineDetail?: {
    TaxRateRef?: QuickBooksRef;
    PercentBased?: boolean;
    TaxPercent?: number;
    NetAmountTaxable?: number;
  };
}

/**
 * QuickBooks Reference type
 */
export interface QuickBooksRef {
  value?: string;
  name?: string;
  type?: string;
}

/**
 * QuickBooks Address
 */
export interface QuickBooksAddress {
  Id?: string;
  Line1?: string;
  Line2?: string;
  Line3?: string;
  Line4?: string;
  Line5?: string;
  City?: string;
  Country?: string;
  CountrySubDivisionCode?: string;
  PostalCode?: string;
  Lat?: string;
  Long?: string;
}

/**
 * QuickBooks Email Address
 */
export interface QuickBooksEmailAddress {
  Address?: string;
}

/**
 * QuickBooks Telephone Number
 */
export interface QuickBooksTelephoneNumber {
  FreeFormNumber?: string;
}

/**
 * QuickBooks Web Address
 */
export interface QuickBooksWebAddress {
  URI?: string;
}

/**
 * QuickBooks Memo Reference
 */
export interface QuickBooksMemoRef {
  value?: string;
}

/**
 * QuickBooks MetaData
 */
export interface QuickBooksMetaData {
  CreateTime?: string;
  LastUpdatedTime?: string;
}

/**
 * QuickBooks Delivery Info
 */
export interface QuickBooksDeliveryInfo {
  DeliveryType?: string;
  DeliveryTime?: string;
}

/**
 * QuickBooks Credit Card Payment
 */
export interface QuickBooksCreditCardPayment {
  CreditChargeInfo?: {
    Type?: string;
    NameOnAcct?: string;
    CcExpiryMonth?: number;
    CcExpiryYear?: number;
    BillAddrStreet?: string;
    PostalCode?: string;
    Amount?: number;
    ProcessPayment?: boolean;
  };
  CreditChargeResponse?: {
    Status?: string;
    AuthCode?: string;
    TxnAuthorizationTime?: string;
    CCTransId?: string;
  };
}

/**
 * QuickBooks Custom Field
 */
export interface QuickBooksCustomField {
  DefinitionId?: string;
  Name?: string;
  Type?: string;
  StringValue?: string;
}

/**
 * QuickBooks Linked Transaction
 */
export interface QuickBooksLinkedTxn {
  TxnId?: string;
  TxnType?: string;
  TxnLineId?: string;
}

/**
 * QuickBooks API endpoints
 */
export const QuickBooksApiPaths = {
  // Base URLs by environment
  BASE_URL_SANDBOX: 'https://sandbox-quickbooks.api.intuit.com',
  BASE_URL_PRODUCTION: 'https://quickbooks.api.intuit.com',

  // OAuth2 endpoints
  TOKEN_ENDPOINT_SANDBOX: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
  TOKEN_ENDPOINT_PRODUCTION: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
  REVOKE_ENDPOINT: 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
  USERINFO_ENDPOINT: 'https://accounts.platform.intuit.com/v1/openid_connect/userinfo',

  // Entity endpoints
  CUSTOMER: '/v3/company/{realmId}/customer',
  CUSTOMER_QUERY: '/v3/company/{realmId}/query',
  ITEM: '/v3/company/{realmId}/item',
  INVOICE: '/v3/company/{realmId}/invoice',
  SALES_RECEIPT: '/v3/company/{realmId}/salesreceipt',
  PAYMENT: '/v3/company/{realmId}/payment',
  ACCOUNT: '/v3/company/{realmId}/account',
  COMPANY_INFO: '/v3/company/{realmId}/companyinfo/{realmId}',
} as const;

/**
 * QuickBooks connector operation types
 */
export type QuickBooksOperationType =
  | 'createCustomer'
  | 'getCustomer'
  | 'listCustomers'
  | 'updateCustomer'
  | 'createItem'
  | 'getItem'
  | 'listItems'
  | 'updateItem'
  | 'createInvoice'
  | 'getInvoice'
  | 'listInvoices'
  | 'updateInvoice'
  | 'voidInvoice'
  | 'sendInvoice'
  | 'createSalesReceipt'
  | 'getSalesReceipt'
  | 'listSalesReceipts'
  | 'updateSalesReceipt'
  | 'createPayment'
  | 'getPayment'
  | 'listPayments';

/**
 * QuickBooks error response
 */
export interface QuickBooksErrorResponse {
  Fault?: {
    Error?: QuickBooksErrorDetail[];
    type?: string;
  };
  time?: string;
}

/**
 * QuickBooks error detail
 */
export interface QuickBooksErrorDetail {
  Message?: string;
  Detail?: string;
  code?: string;
  element?: string;
}

/**
 * Create Customer input
 */
export interface QuickBooksCreateCustomerInput {
  /** Display name (required, unique) */
  displayName: string;

  /** Company name */
  companyName?: string;

  /** First name */
  firstName?: string;

  /** Last name */
  lastName?: string;

  /** Title */
  title?: string;

  /** Email address */
  email?: string;

  /** Primary phone */
  phone?: string;

  /** Mobile phone */
  mobile?: string;

  /** Website */
  website?: string;

  /** Notes */
  notes?: string;

  /** Billing address */
  billingAddress?: QuickBooksAddressInput;

  /** Shipping address */
  shippingAddress?: QuickBooksAddressInput;

  /** Is taxable */
  taxable?: boolean;

  /** Payment terms reference ID */
  paymentTermsId?: string;

  /** Currency code */
  currency?: string;
}

/**
 * Create Item input
 */
export interface QuickBooksCreateItemInput {
  /** Item name (required, unique) */
  name: string;

  /** Item type */
  type: QuickBooksItemType;

  /** Description */
  description?: string;

  /** SKU */
  sku?: string;

  /** Unit price */
  unitPrice?: number;

  /** Purchase cost */
  purchaseCost?: number;

  /** Purchase description */
  purchaseDescription?: string;

  /** Is active */
  active?: boolean;

  /** Is taxable */
  taxable?: boolean;

  /** Track quantity on hand */
  trackQtyOnHand?: boolean;

  /** Quantity on hand (for inventory items) */
  qtyOnHand?: number;

  /** Inventory start date (for inventory items) */
  invStartDate?: string;

  /** Income account reference ID */
  incomeAccountId?: string;

  /** Expense account reference ID */
  expenseAccountId?: string;

  /** Asset account reference ID (for inventory items) */
  assetAccountId?: string;
}

/**
 * Create Invoice input
 */
export interface QuickBooksCreateInvoiceInput {
  /** Customer reference ID (required) */
  customerId: string;

  /** Transaction date */
  txnDate?: string;

  /** Due date */
  dueDate?: string;

  /** Line items */
  lines: QuickBooksInvoiceLineInput[];

  /** Document number */
  docNumber?: string;

  /** Private note (internal) */
  privateNote?: string;

  /** Customer memo */
  customerMemo?: string;

  /** Billing address */
  billingAddress?: QuickBooksAddressInput;

  /** Shipping address */
  shippingAddress?: QuickBooksAddressInput;

  /** Ship date */
  shipDate?: string;

  /** Tracking number */
  trackingNum?: string;

  /** Email to send invoice to */
  billEmail?: string;

  /** Payment terms reference ID */
  paymentTermsId?: string;

  /** Apply tax after discount */
  applyTaxAfterDiscount?: boolean;
}

/**
 * Invoice Line input
 */
export interface QuickBooksInvoiceLineInput {
  /** Item reference ID */
  itemId?: string;

  /** Description */
  description?: string;

  /** Quantity */
  quantity?: number;

  /** Unit price */
  unitPrice?: number;

  /** Amount (calculated if not provided) */
  amount?: number;

  /** Service date */
  serviceDate?: string;

  /** Tax code reference ID */
  taxCodeId?: string;
}

/**
 * Create Sales Receipt input
 */
export interface QuickBooksCreateSalesReceiptInput {
  /** Customer reference ID (optional for sales receipts) */
  customerId?: string;

  /** Transaction date */
  txnDate?: string;

  /** Line items */
  lines: QuickBooksInvoiceLineInput[];

  /** Document number */
  docNumber?: string;

  /** Private note */
  privateNote?: string;

  /** Customer memo */
  customerMemo?: string;

  /** Billing address */
  billingAddress?: QuickBooksAddressInput;

  /** Shipping address */
  shippingAddress?: QuickBooksAddressInput;

  /** Payment method reference ID */
  paymentMethodId?: string;

  /** Payment reference number */
  paymentRefNum?: string;

  /** Deposit to account reference ID */
  depositToAccountId?: string;
}

/**
 * Create Payment input
 */
export interface QuickBooksCreatePaymentInput {
  /** Customer reference ID (required) */
  customerId: string;

  /** Total payment amount */
  totalAmt: number;

  /** Transaction date */
  txnDate?: string;

  /** Payment method reference ID */
  paymentMethodId?: string;

  /** Payment reference number */
  paymentRefNum?: string;

  /** Private note */
  privateNote?: string;

  /** Deposit to account reference ID */
  depositToAccountId?: string;

  /** Invoices to apply payment to */
  invoices?: {
    invoiceId: string;
    amount?: number;
  }[];

  /** Process payment (credit card) */
  processPayment?: boolean;
}

/**
 * Address input
 */
export interface QuickBooksAddressInput {
  line1: string;
  line2?: string;
  line3?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Connector result wrapper
 */
export interface QuickBooksConnectorResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: QuickBooksErrorDetail[];
    retryable: boolean;
    requestId?: string;
  };
  metadata?: {
    requestId: string;
    durationMs: number;
    totalResults?: number;
    hasMore?: boolean;
  };
}

/**
 * Token refresh result
 */
export interface QuickBooksTokenRefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
}
