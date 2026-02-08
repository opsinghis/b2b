/**
 * Microsoft Dynamics 365 Connector Interfaces
 * Implements Web API (OData V4) client for Dynamics 365 integration
 */

/**
 * Dynamics 365 authentication types
 */
export type DynamicsAuthType = 'azure_ad' | 'client_credentials' | 'on_behalf_of';

/**
 * Dynamics 365 connection configuration
 */
export interface DynamicsConnectionConfig {
  /** Dynamics 365 organization URL (e.g., https://org.crm.dynamics.com) */
  organizationUrl: string;

  /** Azure tenant ID */
  tenantId: string;

  /** Authentication type */
  authType: DynamicsAuthType;

  /** API version (default: v9.2) */
  apiVersion?: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Enable request/response logging */
  logging?: boolean;

  /** Default currency */
  defaultCurrency?: string;

  /** Default price level ID */
  defaultPriceLevelId?: string;
}

/**
 * Azure AD OAuth2 configuration for client credentials flow
 */
export interface DynamicsClientCredentialsConfig {
  /** Azure AD client/application ID */
  clientId: string;

  /** Azure AD client secret */
  clientSecret: string;

  /** OAuth2 scopes (typically https://org.crm.dynamics.com/.default) */
  scopes?: string[];
}

/**
 * Azure AD on-behalf-of flow configuration
 */
export interface DynamicsOnBehalfOfConfig {
  /** Azure AD client/application ID */
  clientId: string;

  /** Azure AD client secret */
  clientSecret: string;

  /** User assertion token */
  userAssertion: string;

  /** OAuth2 scopes */
  scopes?: string[];
}

/**
 * Combined Dynamics credentials
 */
export interface DynamicsCredentials {
  clientCredentials?: DynamicsClientCredentialsConfig;
  onBehalfOf?: DynamicsOnBehalfOfConfig;
}

/**
 * Dynamics 365 Web API query options
 */
export interface DynamicsQueryOptions {
  /** $select - fields to return */
  $select?: string[];

  /** $expand - related entities to expand */
  $expand?: string[];

  /** $filter - OData filter expression */
  $filter?: string;

  /** $orderby - sort expression */
  $orderby?: string;

  /** $top - limit results */
  $top?: number;

  /** $skip - offset for pagination */
  $skip?: number;

  /** $count - include total count */
  $count?: boolean;

  /** Prefer header options */
  prefer?: {
    /** Include annotations */
    includeAnnotations?: string;
    /** Max page size */
    maxPageSize?: number;
    /** Return representation after create/update */
    returnRepresentation?: boolean;
  };

  /** Custom headers */
  customHeaders?: Record<string, string>;
}

/**
 * Dynamics 365 OData response metadata
 */
export interface DynamicsODataMetadata {
  /** OData context URL */
  '@odata.context'?: string;

  /** Total count (if requested) */
  '@odata.count'?: number;

  /** Next page link */
  '@odata.nextLink'?: string;

  /** Entity ETag for optimistic concurrency */
  '@odata.etag'?: string;
}

/**
 * Dynamics 365 OData response wrapper
 */
export interface DynamicsODataResponse<T = unknown> {
  /** Response data - array for list queries, single entity for get-by-key */
  value: T;

  /** OData metadata */
  metadata: DynamicsODataMetadata;
}

/**
 * Dynamics 365 Sales Order (salesorder)
 */
export interface DynamicsSalesOrder {
  salesorderid?: string;
  name?: string;
  ordernumber?: string;
  customerid_account?: DynamicsLookupValue;
  customerid_contact?: DynamicsLookupValue;
  pricelevelid?: DynamicsLookupValue;
  transactioncurrencyid?: DynamicsLookupValue;
  totalamount?: number;
  totallineitemamount?: number;
  totaltax?: number;
  totaldiscountamount?: number;
  freightamount?: number;
  requestdeliveryby?: string;
  datedelivered?: string;
  datefulfilled?: string;
  statecode?: number;
  statuscode?: number;
  description?: string;
  billto_line1?: string;
  billto_city?: string;
  billto_stateorprovince?: string;
  billto_postalcode?: string;
  billto_country?: string;
  shipto_line1?: string;
  shipto_city?: string;
  shipto_stateorprovince?: string;
  shipto_postalcode?: string;
  shipto_country?: string;
  createdon?: string;
  modifiedon?: string;
  salesorder_details?: DynamicsSalesOrderDetail[];
}

/**
 * Dynamics 365 Sales Order Detail (salesorderdetail)
 */
export interface DynamicsSalesOrderDetail {
  salesorderdetailid?: string;
  salesorderid?: DynamicsLookupValue;
  productid?: DynamicsLookupValue;
  uomid?: DynamicsLookupValue;
  quantity?: number;
  priceperunit?: number;
  baseamount?: number;
  extendedamount?: number;
  manualdiscountamount?: number;
  tax?: number;
  productdescription?: string;
  isproductoverridden?: boolean;
  lineitemnumber?: number;
  requestdeliveryby?: string;
}

/**
 * Dynamics 365 Account (account)
 */
export interface DynamicsAccount {
  accountid?: string;
  name?: string;
  accountnumber?: string;
  primarycontactid?: DynamicsLookupValue;
  parentaccountid?: DynamicsLookupValue;
  address1_line1?: string;
  address1_line2?: string;
  address1_city?: string;
  address1_stateorprovince?: string;
  address1_postalcode?: string;
  address1_country?: string;
  telephone1?: string;
  telephone2?: string;
  fax?: string;
  emailaddress1?: string;
  websiteurl?: string;
  industrycode?: number;
  revenue?: number;
  numberofemployees?: number;
  creditlimit?: number;
  creditonhold?: boolean;
  paymenttermscode?: number;
  transactioncurrencyid?: DynamicsLookupValue;
  statecode?: number;
  statuscode?: number;
  createdon?: string;
  modifiedon?: string;
}

/**
 * Dynamics 365 Contact (contact)
 */
export interface DynamicsContact {
  contactid?: string;
  firstname?: string;
  lastname?: string;
  fullname?: string;
  jobtitle?: string;
  parentcustomerid_account?: DynamicsLookupValue;
  address1_line1?: string;
  address1_city?: string;
  address1_stateorprovince?: string;
  address1_postalcode?: string;
  address1_country?: string;
  telephone1?: string;
  mobilephone?: string;
  emailaddress1?: string;
  statecode?: number;
  statuscode?: number;
  createdon?: string;
  modifiedon?: string;
}

/**
 * Dynamics 365 Product (product)
 */
export interface DynamicsProduct {
  productid?: string;
  name?: string;
  productnumber?: string;
  description?: string;
  productstructure?: number; // 1=Product, 2=Product Family, 3=Product Bundle
  producttypecode?: number;
  defaultuomid?: DynamicsLookupValue;
  defaultuomscheduleid?: DynamicsLookupValue;
  currentcost?: number;
  standardcost?: number;
  price?: number;
  quantityonhand?: number;
  quantitydecimal?: number;
  iskit?: boolean;
  isstockitem?: boolean;
  statecode?: number;
  statuscode?: number;
  createdon?: string;
  modifiedon?: string;
}

/**
 * Dynamics 365 Product Price Level (productpricelevel)
 */
export interface DynamicsProductPriceLevel {
  productpricelevelid?: string;
  productid?: DynamicsLookupValue;
  pricelevelid?: DynamicsLookupValue;
  uomid?: DynamicsLookupValue;
  transactioncurrencyid?: DynamicsLookupValue;
  amount?: number;
  percentage?: number;
  roundingpolicycode?: number;
  roundingoptionamount?: number;
  roundingoptioncode?: number;
  pricingmethodcode?: number;
  quantitysellingcode?: number;
}

/**
 * Dynamics 365 Price Level / Price List (pricelevel)
 */
export interface DynamicsPriceLevel {
  pricelevelid?: string;
  name?: string;
  description?: string;
  begindate?: string;
  enddate?: string;
  transactioncurrencyid?: DynamicsLookupValue;
  statecode?: number;
  statuscode?: number;
}

/**
 * Dynamics 365 Invoice (invoice)
 */
export interface DynamicsInvoice {
  invoiceid?: string;
  name?: string;
  invoicenumber?: string;
  customerid_account?: DynamicsLookupValue;
  salesorderid?: DynamicsLookupValue;
  pricelevelid?: DynamicsLookupValue;
  transactioncurrencyid?: DynamicsLookupValue;
  totalamount?: number;
  totallineitemamount?: number;
  totaltax?: number;
  totaldiscountamount?: number;
  datedelivered?: string;
  duedate?: string;
  ispricelocked?: boolean;
  statecode?: number;
  statuscode?: number;
  billto_line1?: string;
  billto_city?: string;
  billto_stateorprovince?: string;
  billto_postalcode?: string;
  billto_country?: string;
  shipto_line1?: string;
  shipto_city?: string;
  shipto_stateorprovince?: string;
  shipto_postalcode?: string;
  shipto_country?: string;
  createdon?: string;
  modifiedon?: string;
  invoice_details?: DynamicsInvoiceDetail[];
}

/**
 * Dynamics 365 Invoice Detail (invoicedetail)
 */
export interface DynamicsInvoiceDetail {
  invoicedetailid?: string;
  invoiceid?: DynamicsLookupValue;
  productid?: DynamicsLookupValue;
  uomid?: DynamicsLookupValue;
  quantity?: number;
  priceperunit?: number;
  baseamount?: number;
  extendedamount?: number;
  manualdiscountamount?: number;
  tax?: number;
  productdescription?: string;
  lineitemnumber?: number;
}

/**
 * Dynamics 365 lookup value structure
 */
export interface DynamicsLookupValue {
  /** Entity ID */
  id?: string;
  /** Logical name of the entity */
  logicalName?: string;
  /** Display name/value */
  name?: string;
  /** OData bind path for create/update (e.g., /accounts(guid)) */
  '@odata.bind'?: string;
}

/**
 * Dynamics 365 Unit of Measure (uom)
 */
export interface DynamicsUom {
  uomid?: string;
  name?: string;
  uomscheduleid?: DynamicsLookupValue;
  baseuom?: DynamicsLookupValue;
  quantity?: number;
}

/**
 * Dynamics 365 error response
 */
export interface DynamicsErrorResponse {
  error: {
    code: string;
    message: string;
    innererror?: {
      message?: string;
      type?: string;
      stacktrace?: string;
      internalexception?: {
        message?: string;
        type?: string;
        stacktrace?: string;
      };
    };
  };
}

/**
 * Dynamics 365 error detail
 */
export interface DynamicsErrorDetail {
  code: string;
  message: string;
  field?: string;
  severity?: 'error' | 'warning' | 'info';
}

/**
 * Dynamics 365 entity types
 */
export type DynamicsEntityType =
  | 'salesorder'
  | 'salesorderdetail'
  | 'account'
  | 'contact'
  | 'product'
  | 'invoice'
  | 'invoicedetail'
  | 'pricelevel'
  | 'productpricelevel'
  | 'uom';

/**
 * Dynamics 365 Web API paths
 */
export const DynamicsApiPaths = {
  SALES_ORDERS: 'salesorders',
  SALES_ORDER_DETAILS: 'salesorderdetails',
  ACCOUNTS: 'accounts',
  CONTACTS: 'contacts',
  PRODUCTS: 'products',
  INVOICES: 'invoices',
  INVOICE_DETAILS: 'invoicedetails',
  PRICE_LEVELS: 'pricelevels',
  PRODUCT_PRICE_LEVELS: 'productpricelevels',
  UOMS: 'uoms',
} as const;

/**
 * Dynamics 365 connector operation types
 */
export type DynamicsOperationType =
  | 'createSalesOrder'
  | 'getSalesOrder'
  | 'getSalesOrderStatus'
  | 'listSalesOrders'
  | 'updateSalesOrder'
  | 'getAccount'
  | 'createAccount'
  | 'listAccounts'
  | 'updateAccount'
  | 'getContact'
  | 'createContact'
  | 'listContacts'
  | 'getProduct'
  | 'listProducts'
  | 'getInvoice'
  | 'listInvoices'
  | 'getPriceLevel'
  | 'listPriceLevels'
  | 'getProductPrice';

/**
 * Dynamics 365 Sales Order state codes
 */
export enum DynamicsSalesOrderState {
  ACTIVE = 0,
  SUBMITTED = 1,
  CANCELED = 2,
  FULFILLED = 3,
  INVOICED = 4,
}

/**
 * Dynamics 365 Sales Order status codes (for Active state)
 */
export enum DynamicsSalesOrderStatus {
  NEW = 1,
  PENDING = 2,
  IN_PROGRESS = 3,
}

/**
 * Dynamics 365 Invoice state codes
 */
export enum DynamicsInvoiceState {
  ACTIVE = 0,
  CLOSED = 1,
  PAID = 2,
  CANCELED = 3,
}

/**
 * Dynamics 365 Account/Contact state codes
 */
export enum DynamicsEntityState {
  ACTIVE = 0,
  INACTIVE = 1,
}

/**
 * Create Sales Order input
 */
export interface DynamicsCreateSalesOrderInput {
  name: string;
  customerId: string;
  customerType: 'account' | 'contact';
  priceLevelId?: string;
  currencyId?: string;
  requestDeliveryBy?: string;
  description?: string;
  billToAddress?: DynamicsAddressInput;
  shipToAddress?: DynamicsAddressInput;
  items: DynamicsCreateSalesOrderItemInput[];
}

/**
 * Create Sales Order Item input
 */
export interface DynamicsCreateSalesOrderItemInput {
  productId: string;
  quantity: number;
  uomId?: string;
  pricePerUnit?: number;
  manualDiscountAmount?: number;
  description?: string;
  requestDeliveryBy?: string;
}

/**
 * Address input
 */
export interface DynamicsAddressInput {
  line1: string;
  line2?: string;
  city: string;
  stateOrProvince?: string;
  postalCode: string;
  country: string;
}

/**
 * Create Account input
 */
export interface DynamicsCreateAccountInput {
  name: string;
  accountNumber?: string;
  primaryContactId?: string;
  parentAccountId?: string;
  address?: DynamicsAddressInput;
  telephone?: string;
  email?: string;
  website?: string;
  industryCode?: number;
  creditLimit?: number;
  paymentTermsCode?: number;
  currencyId?: string;
}

/**
 * Connector result wrapper
 */
export interface DynamicsConnectorResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: DynamicsErrorDetail[];
    retryable: boolean;
    requestId?: string;
  };
  metadata?: {
    requestId: string;
    durationMs: number;
    etag?: string;
  };
}

/**
 * Batch request item
 */
export interface DynamicsBatchRequestItem {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Batch response item
 */
export interface DynamicsBatchResponseItem {
  id: string;
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
}
