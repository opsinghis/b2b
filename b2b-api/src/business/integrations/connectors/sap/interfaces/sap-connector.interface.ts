/**
 * SAP S/4HANA Connector Interfaces
 * Implements OData V4 client for SAP integration
 */

/**
 * SAP OData V4 authentication types
 */
export type SapAuthType = 'basic' | 'oauth2' | 'saml' | 'certificate';

/**
 * SAP system connection configuration
 */
export interface SapConnectionConfig {
  /** SAP S/4HANA base URL (e.g., https://my-sap-system.s4hana.ondemand.com) */
  baseUrl: string;

  /** SAP client number (typically 100, 200, etc.) */
  client?: string;

  /** SAP language code (e.g., EN, DE) */
  language?: string;

  /** Authentication type */
  authType: SapAuthType;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Enable request/response logging */
  logging?: boolean;

  /** SAP API version */
  apiVersion?: string;
}

/**
 * SAP OAuth2 configuration
 */
export interface SapOAuth2Config {
  /** OAuth2 token URL */
  tokenUrl: string;

  /** Client ID */
  clientId: string;

  /** Client Secret */
  clientSecret: string;

  /** OAuth2 scopes */
  scopes?: string[];

  /** Grant type (client_credentials, authorization_code) */
  grantType: 'client_credentials' | 'authorization_code' | 'password';

  /** SAML assertion (for SAML bearer grant) */
  samlAssertion?: string;
}

/**
 * SAP Basic authentication configuration
 */
export interface SapBasicAuthConfig {
  username: string;
  password: string;
}

/**
 * SAP certificate authentication configuration
 */
export interface SapCertificateAuthConfig {
  certificate: string;
  privateKey: string;
  passphrase?: string;
}

/**
 * Combined SAP credentials
 */
export interface SapCredentials {
  basic?: SapBasicAuthConfig;
  oauth2?: SapOAuth2Config;
  certificate?: SapCertificateAuthConfig;
}

/**
 * SAP OData V4 query options
 */
export interface SapODataQueryOptions {
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

  /** $search - full-text search */
  $search?: string;

  /** Custom query parameters */
  custom?: Record<string, string>;
}

/**
 * SAP OData V4 response metadata
 */
export interface SapODataMetadata {
  /** OData context URL */
  '@odata.context'?: string;

  /** Total count (if requested) */
  '@odata.count'?: number;

  /** Next page link */
  '@odata.nextLink'?: string;

  /** Delta link for change tracking */
  '@odata.deltaLink'?: string;

  /** ETag for concurrency control */
  '@odata.etag'?: string;
}

/**
 * SAP OData V4 response wrapper
 * When T is an array type (e.g., SapSalesOrder[]), value will be T (the array).
 * When T is a single entity type, value will be T (the entity).
 */
export interface SapODataResponse<T = unknown> {
  /** Response data - array for list queries, single entity for get-by-key */
  value: T;

  /** OData metadata */
  metadata: SapODataMetadata;
}

/**
 * SAP Sales Order (A_SalesOrder)
 */
export interface SapSalesOrder {
  SalesOrder?: string;
  SalesOrderType?: string;
  SalesOrganization?: string;
  DistributionChannel?: string;
  OrganizationDivision?: string;
  SoldToParty?: string;
  PurchaseOrderByCustomer?: string;
  RequestedDeliveryDate?: string;
  TotalNetAmount?: string;
  TransactionCurrency?: string;
  OverallSDProcessStatus?: string;
  OverallDeliveryStatus?: string;
  OverallBillingStatus?: string;
  CreationDate?: string;
  LastChangeDate?: string;
  to_Item?: SapSalesOrderItem[];
}

/**
 * SAP Sales Order Item (A_SalesOrderItem)
 */
export interface SapSalesOrderItem {
  SalesOrder?: string;
  SalesOrderItem?: string;
  Material?: string;
  MaterialByCustomer?: string;
  RequestedQuantity?: string;
  RequestedQuantityUnit?: string;
  NetAmount?: string;
  TransactionCurrency?: string;
  PlantForDelivery?: string;
  DeliveryStatus?: string;
  BillingStatus?: string;
}

/**
 * SAP Business Partner (A_BusinessPartner)
 */
export interface SapBusinessPartner {
  BusinessPartner?: string;
  Customer?: string;
  Supplier?: string;
  BusinessPartnerCategory?: string;
  BusinessPartnerFullName?: string;
  FirstName?: string;
  LastName?: string;
  OrganizationBPName1?: string;
  OrganizationBPName2?: string;
  Language?: string;
  IsNaturalPerson?: string;
  TaxNumber1?: string;
  TaxNumber2?: string;
  VATRegistration?: string;
  to_BusinessPartnerAddress?: SapBusinessPartnerAddress[];
  to_Customer?: SapCustomer;
}

/**
 * SAP Business Partner Address
 */
export interface SapBusinessPartnerAddress {
  BusinessPartner?: string;
  AddressID?: string;
  StreetName?: string;
  HouseNumber?: string;
  PostalCode?: string;
  CityName?: string;
  Region?: string;
  Country?: string;
  PhoneNumber?: string;
  FaxNumber?: string;
  EmailAddress?: string;
}

/**
 * SAP Customer (A_Customer)
 */
export interface SapCustomer {
  Customer?: string;
  CustomerAccountGroup?: string;
  CustomerFullName?: string;
  CustomerName?: string;
  PaymentTerms?: string;
  Currency?: string;
  CreditLimit?: string;
  Language?: string;
  to_CustomerSalesArea?: SapCustomerSalesArea[];
}

/**
 * SAP Customer Sales Area
 */
export interface SapCustomerSalesArea {
  Customer?: string;
  SalesOrganization?: string;
  DistributionChannel?: string;
  Division?: string;
  IncotermsClassification?: string;
  IncotermsLocation1?: string;
  PaymentTerms?: string;
  Currency?: string;
  CustomerPriceGroup?: string;
}

/**
 * SAP Product/Material (A_Product)
 */
export interface SapProduct {
  Product?: string;
  ProductType?: string;
  CrossPlantStatus?: string;
  ProductGroup?: string;
  BaseUnit?: string;
  WeightUnit?: string;
  GrossWeight?: string;
  NetWeight?: string;
  ProductHierarchy?: string;
  Division?: string;
  to_Description?: SapProductDescription[];
  to_Plant?: SapProductPlant[];
  to_SalesDelivery?: SapProductSalesDelivery[];
  to_Valuation?: SapProductValuation[];
}

/**
 * SAP Product Description
 */
export interface SapProductDescription {
  Product?: string;
  Language?: string;
  ProductDescription?: string;
}

/**
 * SAP Product Plant Data
 */
export interface SapProductPlant {
  Product?: string;
  Plant?: string;
  PurchasingGroup?: string;
  AvailabilityCheckType?: string;
  MRPType?: string;
  ProductionInvtryManagedLoc?: string;
}

/**
 * SAP Product Sales/Delivery Data
 */
export interface SapProductSalesDelivery {
  Product?: string;
  ProductSalesOrg?: string;
  ProductDistributionChnl?: string;
  SalesMeasureUnit?: string;
  DeliveryQuantityUnit?: string;
  IsMarkedForDeletion?: boolean;
}

/**
 * SAP Product Valuation
 */
export interface SapProductValuation {
  Product?: string;
  ValuationArea?: string;
  ValuationType?: string;
  StandardPrice?: string;
  PriceUnitQty?: string;
  Currency?: string;
}

/**
 * SAP Billing Document (A_BillingDocument)
 */
export interface SapBillingDocument {
  BillingDocument?: string;
  BillingDocumentType?: string;
  SoldToParty?: string;
  BillingDocumentDate?: string;
  TotalNetAmount?: string;
  TransactionCurrency?: string;
  PaymentTerms?: string;
  AccountingDocExternalReference?: string;
  to_Item?: SapBillingDocumentItem[];
}

/**
 * SAP Billing Document Item
 */
export interface SapBillingDocumentItem {
  BillingDocument?: string;
  BillingDocumentItem?: string;
  Material?: string;
  BillingQuantity?: string;
  BillingQuantityUnit?: string;
  NetAmount?: string;
  TransactionCurrency?: string;
  ReferenceSDDocument?: string;
  ReferenceSDDocumentItem?: string;
}

/**
 * SAP ATP (Available-to-Promise) Check Request
 */
export interface SapAtpCheckRequest {
  Material: string;
  Plant: string;
  RequestedQuantity: number;
  RequestedQuantityUnit: string;
  RequestedDeliveryDate: string;
  Customer?: string;
  SalesOrganization?: string;
  DistributionChannel?: string;
}

/**
 * SAP ATP Check Response
 */
export interface SapAtpCheckResponse {
  Material: string;
  Plant: string;
  AvailableQuantity: number;
  QuantityUnit: string;
  AvailabilityDate: string;
  IsAvailable: boolean;
  ConfirmedQuantity: number;
  ScheduleLines?: SapAtpScheduleLine[];
}

/**
 * SAP ATP Schedule Line
 */
export interface SapAtpScheduleLine {
  ScheduleLine: string;
  DeliveryDate: string;
  ConfirmedQuantity: number;
  QuantityUnit: string;
}

/**
 * SAP Error Response
 */
export interface SapErrorResponse {
  error: {
    code: string;
    message: {
      lang: string;
      value: string;
    };
    innererror?: {
      application?: {
        component_id?: string;
        service_namespace?: string;
        service_id?: string;
        service_version?: string;
      };
      transactionid?: string;
      timestamp?: string;
      Error_Resolution?: {
        SAP_Transaction?: string;
        SAP_Note?: string;
      };
      errordetails?: SapErrorDetail[];
    };
  };
}

/**
 * SAP Error Detail
 */
export interface SapErrorDetail {
  code: string;
  message: string;
  propertyref?: string;
  severity?: 'error' | 'warning' | 'info';
  target?: string;
}

/**
 * SAP Connector Entity types
 */
export type SapEntityType =
  | 'A_SalesOrder'
  | 'A_SalesOrderItem'
  | 'A_BusinessPartner'
  | 'A_Customer'
  | 'A_Product'
  | 'A_BillingDocument'
  | 'A_BillingDocumentItem';

/**
 * SAP OData service paths
 */
export const SapODataServicePaths = {
  SALES_ORDER: '/sap/opu/odata/sap/API_SALES_ORDER_SRV',
  BUSINESS_PARTNER: '/sap/opu/odata/sap/API_BUSINESS_PARTNER',
  PRODUCT: '/sap/opu/odata/sap/API_PRODUCT_SRV',
  BILLING_DOCUMENT: '/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV',
  ATP_CHECK: '/sap/opu/odata/sap/API_ATP_CHECK_SRV',
  CUSTOMER: '/sap/opu/odata/sap/API_CUSTOMER_SRV',
} as const;

/**
 * SAP connector operation types
 */
export type SapOperationType =
  | 'createSalesOrder'
  | 'getSalesOrder'
  | 'getSalesOrderStatus'
  | 'listSalesOrders'
  | 'updateSalesOrder'
  | 'getBusinessPartner'
  | 'createBusinessPartner'
  | 'listBusinessPartners'
  | 'getCustomer'
  | 'createCustomer'
  | 'listCustomers'
  | 'getProduct'
  | 'listProducts'
  | 'getBillingDocument'
  | 'listBillingDocuments'
  | 'checkAtp';

/**
 * SAP Create Sales Order Input
 */
export interface SapCreateSalesOrderInput {
  salesOrderType: string;
  salesOrganization: string;
  distributionChannel: string;
  division: string;
  soldToParty: string;
  purchaseOrderByCustomer?: string;
  requestedDeliveryDate?: string;
  items: SapCreateSalesOrderItemInput[];
}

/**
 * SAP Create Sales Order Item Input
 */
export interface SapCreateSalesOrderItemInput {
  material: string;
  requestedQuantity: number;
  requestedQuantityUnit: string;
  plant?: string;
  customerMaterial?: string;
}

/**
 * SAP Create Business Partner Input
 */
export interface SapCreateBusinessPartnerInput {
  businessPartnerCategory: string;
  firstName?: string;
  lastName?: string;
  organizationName1?: string;
  organizationName2?: string;
  language?: string;
  taxNumber1?: string;
  vatRegistration?: string;
  addresses?: SapCreateAddressInput[];
}

/**
 * SAP Create Address Input
 */
export interface SapCreateAddressInput {
  streetName: string;
  houseNumber?: string;
  postalCode: string;
  cityName: string;
  region?: string;
  country: string;
  phoneNumber?: string;
  emailAddress?: string;
}

/**
 * SAP Connector Result
 */
export interface SapConnectorResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: SapErrorDetail[];
    retryable: boolean;
    sapTransactionId?: string;
  };
  metadata?: {
    requestId: string;
    durationMs: number;
    sapEtag?: string;
    sapTransactionId?: string;
  };
}

/**
 * Batch request item
 */
export interface SapBatchRequestItem {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Batch response item
 */
export interface SapBatchResponseItem {
  id: string;
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
}
