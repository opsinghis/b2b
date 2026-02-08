/**
 * Oracle ERP Cloud Connector Interfaces
 * Implements REST API client for Oracle Fusion Cloud ERP integration
 */

/**
 * Oracle ERP Cloud authentication types
 */
export type OracleAuthType = 'oauth2' | 'basic_auth';

/**
 * Oracle ERP Cloud connection configuration
 */
export interface OracleConnectionConfig {
  /** Oracle ERP Cloud instance URL (e.g., https://fa-xxxx.fa.ocs.oraclecloud.com) */
  instanceUrl: string;

  /** Authentication type */
  authType: OracleAuthType;

  /** API version (default: v1) */
  apiVersion?: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Enable request/response logging */
  logging?: boolean;

  /** Default business unit */
  defaultBusinessUnit?: string;

  /** Default currency code */
  defaultCurrency?: string;

  /** Default legal entity */
  defaultLegalEntity?: string;
}

/**
 * OAuth2 configuration for Oracle ERP Cloud
 */
export interface OracleOAuth2Config {
  /** OAuth2 client ID */
  clientId: string;

  /** OAuth2 client secret */
  clientSecret: string;

  /** OAuth2 token endpoint (e.g., https://idcs-xxxx.identity.oraclecloud.com/oauth2/v1/token) */
  tokenEndpoint: string;

  /** OAuth2 scopes */
  scopes?: string[];
}

/**
 * Basic authentication configuration
 */
export interface OracleBasicAuthConfig {
  /** Username */
  username: string;

  /** Password */
  password: string;
}

/**
 * Combined Oracle credentials
 */
export interface OracleCredentials {
  oauth2?: OracleOAuth2Config;
  basicAuth?: OracleBasicAuthConfig;
}

/**
 * Oracle REST API query options
 */
export interface OracleQueryOptions {
  /** Fields to select (comma-separated) */
  fields?: string[];

  /** Filter query parameter */
  q?: string;

  /** Limit results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Sort by field and direction */
  orderBy?: string;

  /** Expand related resources */
  expand?: string[];

  /** Include total count */
  totalResults?: boolean;

  /** Custom headers */
  customHeaders?: Record<string, string>;

  /** Custom query parameters */
  customParams?: Record<string, string>;
}

/**
 * Oracle REST API finder query
 */
export interface OracleFinderQuery {
  /** Finder name */
  finder: string;

  /** Finder parameters */
  finderParams?: Record<string, string | number | boolean>;
}

/**
 * Oracle REST API response metadata
 */
export interface OracleResponseMetadata {
  /** Total count (if requested) */
  totalResults?: number;

  /** Has more results */
  hasMore?: boolean;

  /** Current offset */
  offset?: number;

  /** Results count */
  count?: number;

  /** Links for pagination */
  links?: OracleLink[];
}

/**
 * Oracle HATEOAS link
 */
export interface OracleLink {
  rel: string;
  href: string;
  name?: string;
  kind?: string;
}

/**
 * Oracle REST API response wrapper
 */
export interface OracleApiResponse<T = unknown> {
  /** Response data - items array for list queries */
  items?: T[];

  /** Single item response */
  data?: T;

  /** Response metadata */
  metadata: OracleResponseMetadata;

  /** Links for navigation */
  links?: OracleLink[];
}

/**
 * Oracle ERP Cloud Sales Order (Order Management)
 */
export interface OracleSalesOrder {
  OrderId?: number;
  OrderNumber?: string;
  OrderedDate?: string;
  SourceTransactionNumber?: string;
  SourceTransactionSystem?: string;
  RequestedFulfillmentDate?: string;
  RequestedShipDate?: string;
  CustomerPONumber?: string;
  TransactionalCurrencyCode?: string;
  TransactionalCurrencyName?: string;
  BuyingPartyId?: number;
  BuyingPartyName?: string;
  BuyingPartyNumber?: string;
  SellingBusinessUnitId?: number;
  SellingBusinessUnitName?: string;
  BillToCustomerAccountId?: number;
  BillToCustomerAccountNumber?: string;
  ShipToCustomerAccountId?: number;
  ShipToCustomerAccountNumber?: string;
  StatusCode?: string;
  FulfillmentStatus?: string;
  TotalAmount?: number;
  TaxAmount?: number;
  FreightAmount?: number;
  DiscountAmount?: number;
  CreatedBy?: string;
  CreationDate?: string;
  LastUpdatedBy?: string;
  LastUpdateDate?: string;
  lines?: OracleSalesOrderLine[];
}

/**
 * Oracle ERP Cloud Sales Order Line
 */
export interface OracleSalesOrderLine {
  OrderLineId?: number;
  OrderId?: number;
  LineNumber?: number;
  SourceLineNumber?: string;
  ProductId?: number;
  ProductNumber?: string;
  ProductDescription?: string;
  OrderedQuantity?: number;
  OrderedUOMCode?: string;
  UnitSellingPrice?: number;
  UnitListPrice?: number;
  ExtendedAmount?: number;
  TaxAmount?: number;
  DiscountAmount?: number;
  LineStatus?: string;
  FulfillmentLineStatus?: string;
  RequestedShipDate?: string;
  RequestedFulfillmentDate?: string;
  ScheduleShipDate?: string;
  ActualShipDate?: string;
  ShipToPartyId?: number;
  ShipToPartySiteId?: number;
  ShipToAddress?: OracleAddress;
  CreationDate?: string;
  LastUpdateDate?: string;
}

/**
 * Oracle ERP Cloud Customer (Trading Community Architecture)
 */
export interface OracleCustomer {
  PartyId?: number;
  PartyNumber?: string;
  PartyName?: string;
  PartyType?: string;
  Status?: string;
  CustomerAccountId?: number;
  CustomerAccountNumber?: string;
  CustomerAccountStatus?: string;
  CustomerType?: string;
  CustomerClassCode?: string;
  CustomerCategoryCode?: string;
  TaxpayerIdentificationNumber?: string;
  PrimaryEmailAddress?: string;
  PrimaryPhoneNumber?: string;
  PrimaryURL?: string;
  CurrencyCode?: string;
  SalesPersonId?: number;
  SalesPersonName?: string;
  PaymentTermsCode?: string;
  PaymentTermsName?: string;
  CreditLimit?: number;
  CreditHold?: boolean;
  Addresses?: OracleAddress[];
  Contacts?: OracleContact[];
  CreationDate?: string;
  LastUpdateDate?: string;
}

/**
 * Oracle ERP Cloud Contact
 */
export interface OracleContact {
  ContactId?: number;
  ContactNumber?: string;
  FirstName?: string;
  LastName?: string;
  FullName?: string;
  JobTitle?: string;
  EmailAddress?: string;
  PhoneNumber?: string;
  MobileNumber?: string;
  Status?: string;
  IsPrimary?: boolean;
}

/**
 * Oracle ERP Cloud Address
 */
export interface OracleAddress {
  AddressId?: number;
  AddressNumber?: string;
  AddressType?: string;
  Address1?: string;
  Address2?: string;
  Address3?: string;
  City?: string;
  State?: string;
  PostalCode?: string;
  Country?: string;
  IsPrimary?: boolean;
  Status?: string;
}

/**
 * Oracle ERP Cloud Item (Product Information Management)
 */
export interface OracleItem {
  InventoryItemId?: number;
  ItemNumber?: string;
  ItemDescription?: string;
  ItemType?: string;
  ItemStatus?: string;
  PrimaryUOMCode?: string;
  SecondaryUOMCode?: string;
  ItemCatalogGroupId?: number;
  OrganizationId?: number;
  OrganizationCode?: string;
  ListPrice?: number;
  StandardCost?: number;
  ShippableFlag?: boolean;
  OrderableFlag?: boolean;
  StockEnabledFlag?: boolean;
  PurchasingEnabledFlag?: boolean;
  SalesAccountId?: number;
  ExpenseAccountId?: number;
  LongDescription?: string;
  Weight?: number;
  WeightUOMCode?: string;
  Volume?: number;
  VolumeUOMCode?: string;
  CreationDate?: string;
  LastUpdateDate?: string;
}

/**
 * Oracle ERP Cloud Invoice (Receivables)
 */
export interface OracleInvoice {
  CustomerTrxId?: number;
  TransactionNumber?: string;
  TransactionDate?: string;
  TransactionType?: string;
  TransactionTypeId?: number;
  TransactionTypeName?: string;
  CustomerAccountId?: number;
  CustomerAccountNumber?: string;
  CustomerName?: string;
  BillToCustomerId?: number;
  BillToSiteId?: number;
  CurrencyCode?: string;
  InvoicedAmount?: number;
  TaxAmount?: number;
  FreightAmount?: number;
  DueDate?: string;
  PaymentTermsId?: number;
  PaymentTermsName?: string;
  Status?: string;
  StatusCode?: string;
  AmountDue?: number;
  AmountApplied?: number;
  BalanceDue?: number;
  SalesOrderNumber?: string;
  SalesOrderId?: number;
  BusinessUnitId?: number;
  BusinessUnitName?: string;
  LegalEntityId?: number;
  LegalEntityName?: string;
  Lines?: OracleInvoiceLine[];
  CreationDate?: string;
  LastUpdateDate?: string;
}

/**
 * Oracle ERP Cloud Invoice Line
 */
export interface OracleInvoiceLine {
  CustomerTrxLineId?: number;
  LineNumber?: number;
  Description?: string;
  Quantity?: number;
  UnitSellingPrice?: number;
  ExtendedAmount?: number;
  TaxAmount?: number;
  UOMCode?: string;
  InventoryItemId?: number;
  ItemNumber?: string;
  ItemDescription?: string;
  LineType?: string;
}

/**
 * Oracle ERP Cloud error response
 */
export interface OracleErrorResponse {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  'o:errorCode'?: string;
  'o:errorPath'?: string;
  'o:errorDetails'?: OracleErrorDetail[];
}

/**
 * Oracle ERP Cloud error detail
 */
export interface OracleErrorDetail {
  code: string;
  message: string;
  detail?: string;
  path?: string;
  severity?: string;
}

/**
 * Oracle ERP Cloud entity types
 */
export type OracleEntityType =
  | 'salesOrders'
  | 'customers'
  | 'items'
  | 'invoices'
  | 'accounts'
  | 'parties';

/**
 * Oracle ERP Cloud REST API paths
 */
export const OracleApiPaths = {
  // Order Management
  SALES_ORDERS: '/fscmRestApi/resources/11.13.18.05/salesOrdersForOrderHub',
  ORDER_LINES: '/fscmRestApi/resources/11.13.18.05/salesOrdersForOrderHub/{OrderId}/child/lines',

  // Trading Community Architecture
  CUSTOMERS: '/crmRestApi/resources/11.13.18.05/accounts',
  PARTIES: '/crmRestApi/resources/11.13.18.05/parties',
  CONTACTS: '/crmRestApi/resources/11.13.18.05/contacts',
  ADDRESSES: '/crmRestApi/resources/11.13.18.05/addresses',

  // Product Information Management
  ITEMS: '/fscmRestApi/resources/11.13.18.05/itemsV2',
  ITEM_CATEGORIES: '/fscmRestApi/resources/11.13.18.05/itemCatalogCategories',

  // Receivables
  INVOICES: '/fscmRestApi/resources/11.13.18.05/receivablesInvoices',
  INVOICE_LINES:
    '/fscmRestApi/resources/11.13.18.05/receivablesInvoices/{CustomerTrxId}/child/receivablesInvoiceLines',

  // Inventory
  INVENTORY_BALANCES: '/fscmRestApi/resources/11.13.18.05/inventoryBalances',

  // Common
  BUSINESS_UNITS: '/fscmRestApi/resources/11.13.18.05/businessUnits',
  LEGAL_ENTITIES: '/fscmRestApi/resources/11.13.18.05/legalEntities',
  CURRENCIES: '/fscmRestApi/resources/11.13.18.05/currencies',
  PAYMENT_TERMS: '/fscmRestApi/resources/11.13.18.05/standardPaymentTerms',
} as const;

/**
 * Oracle ERP Cloud connector operation types
 */
export type OracleOperationType =
  | 'createSalesOrder'
  | 'getSalesOrder'
  | 'getSalesOrderStatus'
  | 'listSalesOrders'
  | 'updateSalesOrder'
  | 'cancelSalesOrder'
  | 'getCustomer'
  | 'createCustomer'
  | 'listCustomers'
  | 'updateCustomer'
  | 'getItem'
  | 'listItems'
  | 'searchItems'
  | 'getInvoice'
  | 'listInvoices'
  | 'getInventoryBalance';

/**
 * Oracle Sales Order status codes
 */
export enum OracleSalesOrderStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  BOOKED = 'BOOKED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
  AWAITING_BILLING = 'AWAITING_BILLING',
  AWAITING_SHIPPING = 'AWAITING_SHIPPING',
  PARTIALLY_SHIPPED = 'PARTIALLY_SHIPPED',
  SHIPPED = 'SHIPPED',
  PARTIALLY_FULFILLED = 'PARTIALLY_FULFILLED',
  FULFILLED = 'FULFILLED',
}

/**
 * Oracle Invoice status codes
 */
export enum OracleInvoiceStatus {
  INCOMPLETE = 'INCOMPLETE',
  COMPLETE = 'COMPLETE',
  APPROVED = 'APPROVED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
  VOID = 'VOID',
}

/**
 * Create Sales Order input
 */
export interface OracleCreateSalesOrderInput {
  /** Source transaction number (your system's order ID) */
  sourceTransactionNumber: string;

  /** Source system identifier */
  sourceTransactionSystem?: string;

  /** Customer account ID or number */
  customerId: string;

  /** Buying party ID */
  buyingPartyId?: number;

  /** Business unit ID */
  businessUnitId?: number;

  /** Requested ship date */
  requestedShipDate?: string;

  /** Requested fulfillment date */
  requestedFulfillmentDate?: string;

  /** Customer PO number */
  customerPONumber?: string;

  /** Currency code */
  currencyCode?: string;

  /** Order lines */
  lines: OracleCreateSalesOrderLineInput[];

  /** Ship-to party ID */
  shipToPartyId?: number;

  /** Ship-to address */
  shipToAddress?: OracleAddressInput;

  /** Bill-to customer account ID */
  billToAccountId?: number;

  /** Additional attributes */
  additionalAttributes?: Record<string, unknown>;
}

/**
 * Create Sales Order Line input
 */
export interface OracleCreateSalesOrderLineInput {
  /** Item number (SKU) */
  itemNumber: string;

  /** Quantity */
  quantity: number;

  /** Unit of measure */
  uomCode?: string;

  /** Unit selling price (override) */
  unitSellingPrice?: number;

  /** Requested ship date */
  requestedShipDate?: string;

  /** Requested fulfillment date */
  requestedFulfillmentDate?: string;

  /** Ship-to party ID */
  shipToPartyId?: number;

  /** Additional attributes */
  additionalAttributes?: Record<string, unknown>;
}

/**
 * Address input
 */
export interface OracleAddressInput {
  address1: string;
  address2?: string;
  address3?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

/**
 * Create Customer input
 */
export interface OracleCreateCustomerInput {
  /** Party/Customer name */
  name: string;

  /** Customer type */
  customerType?: string;

  /** Customer classification */
  customerClassCode?: string;

  /** Tax ID */
  taxpayerIdentificationNumber?: string;

  /** Primary email */
  email?: string;

  /** Primary phone */
  phone?: string;

  /** Website URL */
  url?: string;

  /** Currency code */
  currencyCode?: string;

  /** Payment terms */
  paymentTermsCode?: string;

  /** Credit limit */
  creditLimit?: number;

  /** Primary address */
  address?: OracleAddressInput;

  /** Additional attributes */
  additionalAttributes?: Record<string, unknown>;
}

/**
 * Connector result wrapper
 */
export interface OracleConnectorResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: OracleErrorDetail[];
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
 * Batch request item
 */
export interface OracleBatchRequestItem {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Batch response item
 */
export interface OracleBatchResponseItem {
  id: string;
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
}
