/**
 * NetSuite Connection Configuration
 */
export interface NetSuiteConnectionConfig {
  accountId: string;
  baseUrl?: string;
  apiVersion?: string;
  timeout?: number;
  retryAttempts?: number;
  consumerKey?: string;
  consumerSecret?: string;
  tokenId?: string;
  tokenSecret?: string;
}

/**
 * NetSuite TBA Credentials
 */
export interface NetSuiteCredentials {
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
  realm: string;
}

/**
 * NetSuite OAuth1 Token
 */
export interface NetSuiteOAuth1Token {
  oauth_token: string;
  oauth_token_secret: string;
  oauth_consumer_key: string;
  oauth_nonce: string;
  oauth_timestamp: string;
  oauth_signature_method: string;
  oauth_version: string;
  oauth_signature: string;
}

/**
 * NetSuite REST API Response wrapper
 */
export interface NetSuiteApiResponse<T = unknown> {
  items?: T[];
  totalResults?: number;
  count?: number;
  hasMore?: boolean;
  offset?: number;
  links?: NetSuiteLink[];
  id?: string;
  data?: T;
}

export interface NetSuiteLink {
  rel: string;
  href: string;
}

/**
 * NetSuite Error Response
 */
export interface NetSuiteErrorResponse {
  'o:errorCode'?: string;
  'o:errorDetails'?: NetSuiteErrorDetail[];
  status?: {
    isSuccess: boolean;
    statusDetail?: Array<{
      code: string;
      message: string;
      type: string;
    }>;
  };
  title?: string;
  type?: string;
  detail?: string;
}

export interface NetSuiteErrorDetail {
  detail: string;
  errorCode: string;
  paths?: string[];
}

/**
 * NetSuite Sales Order
 */
export interface NetSuiteSalesOrder {
  id?: string;
  tranId?: string;
  tranDate?: string;
  status?: NetSuiteSalesOrderStatus;
  entity?: NetSuiteRef;
  subsidiary?: NetSuiteRef;
  location?: NetSuiteRef;
  currency?: NetSuiteRef;
  exchangeRate?: number;
  terms?: NetSuiteRef;
  memo?: string;
  email?: string;
  billingAddress?: NetSuiteAddress;
  shippingAddress?: NetSuiteAddress;
  shipMethod?: NetSuiteRef;
  shipDate?: string;
  item?: NetSuiteSalesOrderItem[];
  subTotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  total?: number;
  custbody_external_id?: string;
  custbody_b2b_order_id?: string;
  links?: NetSuiteLink[];
}

export interface NetSuiteSalesOrderStatus {
  id: string;
  refName: string;
}

export interface NetSuiteSalesOrderItem {
  lineNumber?: number;
  item?: NetSuiteRef;
  description?: string;
  quantity?: number;
  units?: NetSuiteRef;
  rate?: number;
  amount?: number;
  taxCode?: NetSuiteRef;
  location?: NetSuiteRef;
  isClosed?: boolean;
  quantityBilled?: number;
  quantityFulfilled?: number;
}

/**
 * NetSuite Customer
 */
export interface NetSuiteCustomer {
  id?: string;
  entityId?: string;
  companyName?: string;
  isPerson?: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  fax?: string;
  subsidiary?: NetSuiteRef;
  parent?: NetSuiteRef;
  category?: NetSuiteRef;
  terms?: NetSuiteRef;
  currency?: NetSuiteRef;
  priceLevel?: NetSuiteRef;
  creditLimit?: number;
  balance?: number;
  overdueBalance?: number;
  unbilledOrders?: number;
  isInactive?: boolean;
  addressbook?: NetSuiteAddressBook[];
  custentity_external_id?: string;
  custentity_b2b_org_id?: string;
  links?: NetSuiteLink[];
}

export interface NetSuiteAddressBook {
  id?: string;
  label?: string;
  defaultShipping?: boolean;
  defaultBilling?: boolean;
  addressBookAddress?: NetSuiteAddress;
}

export interface NetSuiteAddress {
  addr1?: string;
  addr2?: string;
  addr3?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: NetSuiteRef;
  attention?: string;
  addressee?: string;
  phone?: string;
}

/**
 * NetSuite Item/Product
 */
export interface NetSuiteItem {
  id?: string;
  itemId?: string;
  displayName?: string;
  description?: string;
  salesDescription?: string;
  purchaseDescription?: string;
  itemType?: string;
  upcCode?: string;
  vendorName?: string;
  cost?: number;
  basePrice?: number;
  averageCost?: number;
  lastPurchasePrice?: number;
  quantityOnHand?: number;
  quantityAvailable?: number;
  quantityOnOrder?: number;
  quantityCommitted?: number;
  quantityBackOrdered?: number;
  reorderPoint?: number;
  preferredStockLevel?: number;
  weight?: number;
  weightUnit?: string;
  subsidiary?: NetSuiteRef[];
  department?: NetSuiteRef;
  class?: NetSuiteRef;
  location?: NetSuiteRef;
  taxSchedule?: NetSuiteRef;
  isInactive?: boolean;
  isTaxable?: boolean;
  isOnline?: boolean;
  custitem_external_id?: string;
  custitem_b2b_product_id?: string;
  pricing?: NetSuiteItemPricing[];
  locations?: NetSuiteItemLocation[];
  links?: NetSuiteLink[];
}

export interface NetSuiteItemPricing {
  currency?: NetSuiteRef;
  priceLevel?: NetSuiteRef;
  price?: number;
  quantity?: number;
}

export interface NetSuiteItemLocation {
  location?: NetSuiteRef;
  quantityOnHand?: number;
  quantityAvailable?: number;
  quantityOnOrder?: number;
  quantityCommitted?: number;
  preferredStockLevel?: number;
  reorderPoint?: number;
}

/**
 * NetSuite Invoice
 */
export interface NetSuiteInvoice {
  id?: string;
  tranId?: string;
  tranDate?: string;
  dueDate?: string;
  status?: NetSuiteInvoiceStatus;
  entity?: NetSuiteRef;
  subsidiary?: NetSuiteRef;
  currency?: NetSuiteRef;
  exchangeRate?: number;
  terms?: NetSuiteRef;
  createdFrom?: NetSuiteRef;
  memo?: string;
  billingAddress?: NetSuiteAddress;
  shippingAddress?: NetSuiteAddress;
  item?: NetSuiteInvoiceItem[];
  subTotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  total?: number;
  amountPaid?: number;
  amountRemaining?: number;
  custbody_external_id?: string;
  links?: NetSuiteLink[];
}

export interface NetSuiteInvoiceStatus {
  id: string;
  refName: string;
}

export interface NetSuiteInvoiceItem {
  lineNumber?: number;
  item?: NetSuiteRef;
  description?: string;
  quantity?: number;
  units?: NetSuiteRef;
  rate?: number;
  amount?: number;
  taxCode?: NetSuiteRef;
}

/**
 * NetSuite Inventory Status
 */
export interface NetSuiteInventoryStatus {
  item: NetSuiteRef;
  location?: NetSuiteRef;
  quantityOnHand: number;
  quantityAvailable: number;
  quantityOnOrder: number;
  quantityCommitted: number;
  quantityBackOrdered: number;
  averageCost?: number;
}

/**
 * NetSuite Saved Search
 */
export interface NetSuiteSavedSearch {
  id: string;
  scriptId?: string;
  title: string;
  recordType: string;
  description?: string;
  isPublic?: boolean;
  isDefault?: boolean;
  columns?: NetSuiteSearchColumn[];
  filters?: NetSuiteSearchFilter[];
}

export interface NetSuiteSearchColumn {
  name: string;
  join?: string;
  summary?: string;
  formula?: string;
  label?: string;
  type?: string;
}

export interface NetSuiteSearchFilter {
  name: string;
  join?: string;
  operator: string;
  values: string[];
}

export interface NetSuiteSavedSearchResult {
  totalResults: number;
  pageIndex: number;
  pageSize: number;
  results: Record<string, unknown>[];
}

/**
 * NetSuite Reference (link to another record)
 */
export interface NetSuiteRef {
  id?: string;
  refName?: string;
  externalId?: string;
  links?: NetSuiteLink[];
}

/**
 * Create Sales Order Input
 */
export interface NetSuiteCreateSalesOrderInput {
  customerId: string;
  orderDate?: string;
  externalId?: string;
  memo?: string;
  terms?: string;
  shipMethod?: string;
  billingAddress?: {
    addr1?: string;
    addr2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  shippingAddress?: {
    addr1?: string;
    addr2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  items: Array<{
    itemId: string;
    quantity: number;
    rate?: number;
    description?: string;
    location?: string;
  }>;
  customFields?: Record<string, unknown>;
}

/**
 * Create Customer Input
 */
export interface NetSuiteCreateCustomerInput {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  isPerson?: boolean;
  email?: string;
  phone?: string;
  externalId?: string;
  subsidiary?: string;
  currency?: string;
  terms?: string;
  priceLevel?: string;
  creditLimit?: number;
  addresses?: Array<{
    label?: string;
    defaultShipping?: boolean;
    defaultBilling?: boolean;
    addr1?: string;
    addr2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  }>;
  customFields?: Record<string, unknown>;
}

/**
 * Inventory Check Request
 */
export interface NetSuiteInventoryCheckRequest {
  itemId: string;
  locationId?: string;
  subsidiaryId?: string;
}

/**
 * Search Parameters
 */
export interface NetSuiteSearchParams {
  searchId?: string;
  recordType?: string;
  filters?: Array<{
    field: string;
    operator: string;
    value: string | string[];
  }>;
  columns?: string[];
  pageSize?: number;
  pageIndex?: number;
}

/**
 * Pagination Options
 */
export interface NetSuitePaginationOptions {
  offset?: number;
  limit?: number;
}
