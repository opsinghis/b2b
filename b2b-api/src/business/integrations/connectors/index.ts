export * from './connector-registry.module';
export * from './connector-registry.controller';
export { ConnectorRegistryService, CredentialVaultService } from './services';
export * from './interfaces';
export * from './dto';

// REST Connector - use explicit exports to avoid conflicts
export { RestConnectorModule, RestConnectorController, GenericRestConnector } from './rest';
export {
  RestConnectorService,
  AuthProviderService,
  JsonPathMapperService,
  PaginationHandlerService,
  ErrorMapperService,
  WebhookReceiverService,
  RequestLoggerService,
} from './rest/services';

// SAP S/4HANA Connector
export * from './sap';

// Dynamics 365 Connector
export { DynamicsConnectorModule, Dynamics365Connector } from './dynamics';

// NetSuite Connector
export { NetSuiteConnectorModule, NetSuiteConnector } from './netsuite';

// EDI X12 Module
export {
  X12Module,
  X12Service,
  X12MapperService,
  X12LexerService,
  X12ParserService,
  X12GeneratorService,
  X12ValidatorService,
  X12_850_ParserService,
  X12_850_GeneratorService,
  X12_855_ParserService,
  X12_856_ParserService,
  X12_810_ParserService,
  X12_997_ParserService,
  X12_997_GeneratorService,
} from './edi/x12';

// EDIFACT Module
export * from './edi/edifact';

// EDI Transport (AS2/SFTP)
export * from './edi/transport';

// Peppol E-Invoicing Module
export {
  PeppolModule,
  PeppolService,
  UblInvoiceGeneratorService,
  UblCreditNoteGeneratorService,
  PeppolValidatorService,
  SmpLookupService,
  AccessPointService,
  DocumentStatusService,
  XRechnungService,
  PdfA3GeneratorService,
} from './edi/peppol';

// Oracle ERP Cloud Connector - explicit exports to avoid conflicts with canonical models
export { OracleConnectorModule, OracleERPConnector } from './oracle';
export {
  OracleAuthService,
  OracleRestClientService,
  OracleSalesOrderService,
  OracleCustomerService,
  OracleItemService,
  OracleInvoiceService,
  OracleMapperService,
  OracleErrorHandlerService,
} from './oracle/services';
export * from './oracle/dto';

// QuickBooks Online Connector - explicit exports to avoid conflicts
export { QuickBooksConnectorModule, QuickBooksConnector } from './quickbooks';
export {
  QuickBooksAuthService,
  QuickBooksRestClientService,
  QuickBooksCustomerService,
  QuickBooksItemService,
  QuickBooksInvoiceService,
  QuickBooksSalesReceiptService,
  QuickBooksPaymentService,
  QuickBooksMapperService,
  QuickBooksErrorHandlerService,
} from './quickbooks/services';
