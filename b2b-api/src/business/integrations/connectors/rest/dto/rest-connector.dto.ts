import {
  IsString,
  IsOptional,
  IsObject,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsUrl,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Authentication types
 */
export enum AuthType {
  NONE = 'none',
  BASIC = 'basic',
  BEARER = 'bearer',
  API_KEY = 'api_key',
  OAUTH2 = 'oauth2',
}

/**
 * API Key placement
 */
export enum ApiKeyPlacement {
  HEADER = 'header',
  QUERY = 'query',
  COOKIE = 'cookie',
}

/**
 * Pagination types
 */
export enum PaginationType {
  OFFSET = 'offset',
  CURSOR = 'cursor',
  LINK = 'link',
  PAGE = 'page',
  NONE = 'none',
}

/**
 * HTTP methods
 */
export enum HttpMethodType {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

/**
 * Basic auth credentials DTO
 */
export class BasicAuthCredentialsDto {
  @ApiProperty({ description: 'Username for Basic authentication' })
  @IsString()
  username!: string;

  @ApiProperty({ description: 'Password for Basic authentication' })
  @IsString()
  password!: string;
}

/**
 * Bearer token credentials DTO
 */
export class BearerAuthCredentialsDto {
  @ApiProperty({ description: 'Bearer token' })
  @IsString()
  token!: string;

  @ApiPropertyOptional({ description: 'Token prefix (default: Bearer)' })
  @IsString()
  @IsOptional()
  prefix?: string;
}

/**
 * API Key credentials DTO
 */
export class ApiKeyCredentialsDto {
  @ApiProperty({ description: 'API key value' })
  @IsString()
  apiKey!: string;

  @ApiProperty({ description: 'Key name (header/query param name)' })
  @IsString()
  keyName!: string;

  @ApiProperty({ enum: ApiKeyPlacement, description: 'Where to place the API key' })
  @IsEnum(ApiKeyPlacement)
  placement!: ApiKeyPlacement;
}

/**
 * OAuth2 credentials DTO
 */
export class OAuth2CredentialsDto {
  @ApiProperty({ description: 'OAuth2 Client ID' })
  @IsString()
  clientId!: string;

  @ApiProperty({ description: 'OAuth2 Client Secret' })
  @IsString()
  clientSecret!: string;

  @ApiProperty({ description: 'Token endpoint URL' })
  @IsUrl()
  tokenUrl!: string;

  @ApiPropertyOptional({ description: 'Authorization endpoint URL' })
  @IsUrl()
  @IsOptional()
  authorizationUrl?: string;

  @ApiPropertyOptional({ description: 'Grant type' })
  @IsString()
  @IsOptional()
  grantType?: string;

  @ApiPropertyOptional({ description: 'OAuth2 scopes', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];
}

/**
 * JSONPath mapping DTO
 */
export class JsonPathMappingDto {
  @ApiProperty({ description: 'JSONPath expression for source field' })
  @IsString()
  source!: string;

  @ApiProperty({ description: 'Target field name' })
  @IsString()
  target!: string;

  @ApiPropertyOptional({ description: 'Default value if source not found' })
  @IsOptional()
  defaultValue?: unknown;

  @ApiPropertyOptional({
    description: 'Transform type',
    enum: ['string', 'number', 'boolean', 'date', 'array', 'object'],
  })
  @IsString()
  @IsOptional()
  transform?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
}

/**
 * Request mapping DTO
 */
export class RequestMappingDto {
  @ApiPropertyOptional({ description: 'Body field mappings', type: [JsonPathMappingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonPathMappingDto)
  @IsOptional()
  bodyMappings?: JsonPathMappingDto[];

  @ApiPropertyOptional({ description: 'Query param mappings', type: [JsonPathMappingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonPathMappingDto)
  @IsOptional()
  queryMappings?: JsonPathMappingDto[];

  @ApiPropertyOptional({ description: 'Header mappings', type: [JsonPathMappingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonPathMappingDto)
  @IsOptional()
  headerMappings?: JsonPathMappingDto[];

  @ApiPropertyOptional({ description: 'Path param mappings', type: [JsonPathMappingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonPathMappingDto)
  @IsOptional()
  pathMappings?: JsonPathMappingDto[];
}

/**
 * Response mapping DTO
 */
export class ResponseMappingDto {
  @ApiPropertyOptional({ description: 'Data field mappings', type: [JsonPathMappingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonPathMappingDto)
  @IsOptional()
  dataMappings?: JsonPathMappingDto[];

  @ApiPropertyOptional({ description: 'Metadata mappings', type: [JsonPathMappingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonPathMappingDto)
  @IsOptional()
  metaMappings?: JsonPathMappingDto[];

  @ApiPropertyOptional({ description: 'Error mappings', type: [JsonPathMappingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonPathMappingDto)
  @IsOptional()
  errorMappings?: JsonPathMappingDto[];
}

/**
 * Pagination config DTO
 */
export class PaginationConfigDto {
  @ApiProperty({ enum: PaginationType, description: 'Pagination type' })
  @IsEnum(PaginationType)
  type!: PaginationType;

  @ApiPropertyOptional({ description: 'Offset parameter name' })
  @IsString()
  @IsOptional()
  offsetParam?: string;

  @ApiPropertyOptional({ description: 'Limit parameter name' })
  @IsString()
  @IsOptional()
  limitParam?: string;

  @ApiPropertyOptional({ description: 'Cursor parameter name' })
  @IsString()
  @IsOptional()
  cursorParam?: string;

  @ApiPropertyOptional({ description: 'Page parameter name' })
  @IsString()
  @IsOptional()
  pageParam?: string;

  @ApiPropertyOptional({ description: 'Page size parameter name' })
  @IsString()
  @IsOptional()
  pageSizeParam?: string;

  @ApiPropertyOptional({ description: 'Default limit' })
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  defaultLimit?: number;

  @ApiPropertyOptional({ description: 'Max limit' })
  @IsNumber()
  @Min(1)
  @Max(10000)
  @IsOptional()
  maxLimit?: number;

  @ApiPropertyOptional({ description: 'JSONPath to items array' })
  @IsString()
  @IsOptional()
  itemsPath?: string;

  @ApiPropertyOptional({ description: 'JSONPath to total count' })
  @IsString()
  @IsOptional()
  totalPath?: string;

  @ApiPropertyOptional({ description: 'JSONPath to next cursor' })
  @IsString()
  @IsOptional()
  nextCursorPath?: string;

  @ApiPropertyOptional({ description: 'JSONPath to has more indicator' })
  @IsString()
  @IsOptional()
  hasMorePath?: string;

  @ApiPropertyOptional({ description: 'Parse Link header (RFC 5988)' })
  @IsBoolean()
  @IsOptional()
  parseLinkHeader?: boolean;
}

/**
 * Error mapping rule DTO
 */
export class ErrorMappingRuleDto {
  @ApiPropertyOptional({ description: 'HTTP status code(s) to match', type: [Number] })
  @IsOptional()
  statusCode?: number | number[];

  @ApiPropertyOptional({ description: 'Status code range' })
  @IsObject()
  @IsOptional()
  statusRange?: { min: number; max: number };

  @ApiPropertyOptional({ description: 'JSONPath to error code in response' })
  @IsString()
  @IsOptional()
  errorCodePath?: string;

  @ApiPropertyOptional({ description: 'Error code(s) to match' })
  @IsOptional()
  errorCodeMatch?: string | string[];

  @ApiPropertyOptional({ description: 'JSONPath to error message' })
  @IsString()
  @IsOptional()
  messagePath?: string;

  @ApiPropertyOptional({ description: 'Whether the error is retryable' })
  @IsBoolean()
  @IsOptional()
  retryable?: boolean;

  @ApiPropertyOptional({ description: 'Mapped error code' })
  @IsString()
  @IsOptional()
  mappedCode?: string;

  @ApiPropertyOptional({ description: 'Default error message' })
  @IsString()
  @IsOptional()
  defaultMessage?: string;
}

/**
 * Endpoint config DTO
 */
export class EndpointConfigDto {
  @ApiProperty({ description: 'Endpoint name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Endpoint description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: HttpMethodType, description: 'HTTP method' })
  @IsEnum(HttpMethodType)
  method!: HttpMethodType;

  @ApiProperty({ description: 'URL path (can include {param} placeholders)' })
  @IsString()
  path!: string;

  @ApiPropertyOptional({ description: 'Additional headers' })
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Query parameters' })
  @IsObject()
  @IsOptional()
  queryParams?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Request mapping', type: RequestMappingDto })
  @ValidateNested()
  @Type(() => RequestMappingDto)
  @IsOptional()
  requestMapping?: RequestMappingDto;

  @ApiPropertyOptional({ description: 'Response mapping', type: ResponseMappingDto })
  @ValidateNested()
  @Type(() => ResponseMappingDto)
  @IsOptional()
  responseMapping?: ResponseMappingDto;

  @ApiPropertyOptional({ description: 'Pagination config', type: PaginationConfigDto })
  @ValidateNested()
  @Type(() => PaginationConfigDto)
  @IsOptional()
  pagination?: PaginationConfigDto;

  @ApiPropertyOptional({ description: 'Error mapping rules', type: [ErrorMappingRuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ErrorMappingRuleDto)
  @IsOptional()
  errorMappings?: ErrorMappingRuleDto[];

  @ApiPropertyOptional({ description: 'Request timeout in ms' })
  @IsNumber()
  @Min(1000)
  @Max(300000)
  @IsOptional()
  timeout?: number;
}

/**
 * Webhook config DTO
 */
export class WebhookConfigDto {
  @ApiProperty({ description: 'Enable webhook receiver' })
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({ description: 'Webhook path' })
  @IsString()
  @IsOptional()
  path?: string;

  @ApiPropertyOptional({ description: 'Shared secret for signature validation' })
  @IsString()
  @IsOptional()
  secret?: string;

  @ApiPropertyOptional({ description: 'Header containing signature' })
  @IsString()
  @IsOptional()
  signatureHeader?: string;

  @ApiPropertyOptional({ description: 'Signature algorithm', enum: ['hmac-sha1', 'hmac-sha256', 'hmac-sha512'] })
  @IsString()
  @IsOptional()
  signatureAlgorithm?: 'hmac-sha1' | 'hmac-sha256' | 'hmac-sha512';

  @ApiPropertyOptional({ description: 'Header containing timestamp' })
  @IsString()
  @IsOptional()
  timestampHeader?: string;

  @ApiPropertyOptional({ description: 'Max timestamp age in seconds' })
  @IsNumber()
  @Min(1)
  @Max(3600)
  @IsOptional()
  timestampTolerance?: number;

  @ApiPropertyOptional({ description: 'JSONPath to event type in payload' })
  @IsString()
  @IsOptional()
  eventTypePath?: string;

  @ApiPropertyOptional({ description: 'JSONPath to payload data' })
  @IsString()
  @IsOptional()
  payloadPath?: string;
}

/**
 * Create REST connector config DTO
 */
export class CreateRestConnectorConfigDto {
  @ApiProperty({ description: 'Base URL for the REST API' })
  @IsUrl()
  baseUrl!: string;

  @ApiPropertyOptional({ enum: AuthType, description: 'Authentication type' })
  @IsEnum(AuthType)
  @IsOptional()
  authType?: AuthType;

  @ApiPropertyOptional({ description: 'Default headers' })
  @IsObject()
  @IsOptional()
  defaultHeaders?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Default query parameters' })
  @IsObject()
  @IsOptional()
  defaultQueryParams?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Endpoint configurations' })
  @IsObject()
  @IsOptional()
  endpoints?: Record<string, EndpointConfigDto>;

  @ApiPropertyOptional({ description: 'Default pagination config', type: PaginationConfigDto })
  @ValidateNested()
  @Type(() => PaginationConfigDto)
  @IsOptional()
  pagination?: PaginationConfigDto;

  @ApiPropertyOptional({ description: 'Global error mapping rules', type: [ErrorMappingRuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ErrorMappingRuleDto)
  @IsOptional()
  errorMappings?: ErrorMappingRuleDto[];

  @ApiPropertyOptional({ description: 'Enable retry' })
  @IsBoolean()
  @IsOptional()
  retryEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Max retries' })
  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  maxRetries?: number;

  @ApiPropertyOptional({ description: 'Request timeout in ms' })
  @IsNumber()
  @Min(1000)
  @Max(300000)
  @IsOptional()
  timeout?: number;

  @ApiPropertyOptional({ description: 'Webhook config', type: WebhookConfigDto })
  @ValidateNested()
  @Type(() => WebhookConfigDto)
  @IsOptional()
  webhook?: WebhookConfigDto;
}

/**
 * Execute endpoint request DTO
 */
export class ExecuteEndpointDto {
  @ApiProperty({ description: 'Endpoint name to execute' })
  @IsString()
  endpoint!: string;

  @ApiPropertyOptional({ description: 'Input data for the request' })
  @IsObject()
  @IsOptional()
  input?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Pagination cursor' })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Pagination offset' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  offset?: number;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size/limit' })
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit?: number;
}

/**
 * Webhook incoming request DTO
 */
export class IncomingWebhookDto {
  @ApiProperty({ description: 'Webhook payload' })
  @IsObject()
  payload!: Record<string, unknown>;
}
