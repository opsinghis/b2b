export * from './rest-connector.module';
export * from './rest-connector.controller';
export * from './generic-rest.connector';
export * from './services';
export * from './interfaces';
// DTOs export specific items to avoid conflicts with interfaces
export {
  AuthType,
  BasicAuthCredentialsDto,
  BearerAuthCredentialsDto,
  ApiKeyCredentialsDto,
  OAuth2CredentialsDto,
  JsonPathMappingDto,
  RequestMappingDto,
  ResponseMappingDto,
  PaginationConfigDto,
  ErrorMappingRuleDto,
  EndpointConfigDto,
  WebhookConfigDto,
  CreateRestConnectorConfigDto,
  ExecuteEndpointDto,
  IncomingWebhookDto,
} from './dto';
