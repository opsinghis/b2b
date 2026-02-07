/**
 * REST Connector Configuration Interfaces
 * Supports configurable REST API integration with various auth methods
 */

/**
 * Supported authentication types
 */
export type RestAuthType = 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth2';

/**
 * API Key placement options
 */
export type ApiKeyPlacement = 'header' | 'query' | 'cookie';

/**
 * OAuth2 grant types
 */
export type OAuth2GrantType = 'authorization_code' | 'client_credentials' | 'password' | 'refresh_token';

/**
 * Pagination strategies
 */
export type PaginationType = 'offset' | 'cursor' | 'link' | 'page' | 'none';

/**
 * HTTP methods supported
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Base authentication configuration
 */
export interface RestAuthConfigBase {
  type: RestAuthType;
}

/**
 * No authentication
 */
export interface NoAuthConfig extends RestAuthConfigBase {
  type: 'none';
}

/**
 * Basic authentication configuration
 */
export interface BasicAuthConfig extends RestAuthConfigBase {
  type: 'basic';
  username: string;
  password: string;
}

/**
 * Bearer token authentication configuration
 */
export interface BearerAuthConfig extends RestAuthConfigBase {
  type: 'bearer';
  token: string;
  prefix?: string; // Default: 'Bearer'
}

/**
 * API Key authentication configuration
 */
export interface ApiKeyAuthConfig extends RestAuthConfigBase {
  type: 'api_key';
  apiKey: string;
  keyName: string; // e.g., 'X-API-Key', 'api_key'
  placement: ApiKeyPlacement;
}

/**
 * OAuth2 authentication configuration
 */
export interface OAuth2AuthConfig extends RestAuthConfigBase {
  type: 'oauth2';
  grantType: OAuth2GrantType;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  authorizationUrl?: string;
  refreshUrl?: string;
  scopes?: string[];
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  extraParams?: Record<string, string>;
}

/**
 * Union type for all auth configurations
 */
export type RestAuthConfig =
  | NoAuthConfig
  | BasicAuthConfig
  | BearerAuthConfig
  | ApiKeyAuthConfig
  | OAuth2AuthConfig;

/**
 * JSONPath mapping for request/response transformation
 */
export interface JsonPathMapping {
  source: string; // JSONPath expression for source field
  target: string; // Target field name
  defaultValue?: unknown; // Default value if source not found
  transform?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
}

/**
 * Request mapping configuration
 */
export interface RequestMapping {
  bodyMappings?: JsonPathMapping[];
  queryMappings?: JsonPathMapping[];
  headerMappings?: JsonPathMapping[];
  pathMappings?: JsonPathMapping[];
}

/**
 * Response mapping configuration
 */
export interface ResponseMapping {
  dataMappings?: JsonPathMapping[];
  metaMappings?: JsonPathMapping[];
  errorMappings?: JsonPathMapping[];
}

/**
 * Pagination configuration for offset-based pagination
 */
export interface OffsetPaginationConfig {
  type: 'offset';
  offsetParam: string; // Query param name for offset
  limitParam: string; // Query param name for limit
  defaultLimit?: number;
  maxLimit?: number;
  totalPath?: string; // JSONPath to total count in response
  itemsPath?: string; // JSONPath to items array in response
}

/**
 * Pagination configuration for cursor-based pagination
 */
export interface CursorPaginationConfig {
  type: 'cursor';
  cursorParam: string; // Query/body param for cursor
  limitParam: string;
  defaultLimit?: number;
  maxLimit?: number;
  nextCursorPath?: string; // JSONPath to next cursor in response
  prevCursorPath?: string; // JSONPath to previous cursor in response
  itemsPath?: string;
  hasMorePath?: string; // JSONPath to hasMore indicator
}

/**
 * Pagination configuration for link-based pagination (HATEOAS)
 */
export interface LinkPaginationConfig {
  type: 'link';
  nextLinkPath?: string; // JSONPath to next link in response
  prevLinkPath?: string; // JSONPath to previous link in response
  itemsPath?: string;
  parseLinkHeader?: boolean; // Parse RFC 5988 Link header
}

/**
 * Page number based pagination
 */
export interface PagePaginationConfig {
  type: 'page';
  pageParam: string;
  pageSizeParam: string;
  defaultPageSize?: number;
  maxPageSize?: number;
  totalPagesPath?: string;
  totalItemsPath?: string;
  itemsPath?: string;
}

/**
 * No pagination
 */
export interface NoPaginationConfig {
  type: 'none';
  itemsPath?: string;
}

/**
 * Union type for pagination configurations
 */
export type PaginationConfig =
  | OffsetPaginationConfig
  | CursorPaginationConfig
  | LinkPaginationConfig
  | PagePaginationConfig
  | NoPaginationConfig;

/**
 * Error mapping rule
 */
export interface ErrorMappingRule {
  statusCode?: number | number[]; // Match specific status codes
  statusRange?: { min: number; max: number }; // Match status code range
  errorCodePath?: string; // JSONPath to error code in response
  errorCodeMatch?: string | string[]; // Error codes to match
  messagePath?: string; // JSONPath to error message
  retryable?: boolean;
  mappedCode?: string; // Our internal error code
  defaultMessage?: string;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number; // Base delay in ms
  retryBackoff?: 'linear' | 'exponential';
  retryOn?: number[]; // HTTP status codes to retry on
  retryCondition?: string; // JSONPath condition for retry
}

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  connectTimeout?: number;
  readTimeout?: number;
  writeTimeout?: number;
  requestTimeout?: number; // Overall request timeout
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  requestsPerSecond?: number;
  requestsPerMinute?: number;
  burstLimit?: number;
  retryAfterHeader?: string; // Header name for retry-after
}

/**
 * Request/Response logging configuration
 */
export interface LoggingConfig {
  logRequests?: boolean;
  logResponses?: boolean;
  logHeaders?: boolean;
  logBody?: boolean;
  maskFields?: string[]; // Fields to mask in logs
  maxBodySize?: number; // Max body size to log
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Endpoint configuration for a specific operation
 */
export interface EndpointConfig {
  name: string;
  description?: string;
  method: HttpMethod;
  path: string; // Path template with {param} placeholders
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  requestMapping?: RequestMapping;
  responseMapping?: ResponseMapping;
  pagination?: PaginationConfig;
  errorMappings?: ErrorMappingRule[];
  retry?: RetryConfig;
  timeout?: TimeoutConfig;
  rateLimit?: RateLimitConfig;
  logging?: LoggingConfig;
  validateResponse?: boolean;
  responseSchema?: Record<string, unknown>; // JSON Schema for response validation
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  enabled: boolean;
  path?: string; // Relative path for webhook endpoint
  secret?: string; // Shared secret for signature validation
  signatureHeader?: string; // Header containing signature
  signatureAlgorithm?: 'hmac-sha1' | 'hmac-sha256' | 'hmac-sha512';
  timestampHeader?: string; // Header containing timestamp
  timestampTolerance?: number; // Max age in seconds
  eventTypePath?: string; // JSONPath to event type in payload
  payloadPath?: string; // JSONPath to actual payload data
}

/**
 * Complete REST connector configuration
 */
export interface RestConnectorConfig {
  // Base URL for the API
  baseUrl: string;

  // Default authentication
  auth?: RestAuthConfig;

  // Default headers for all requests
  defaultHeaders?: Record<string, string>;

  // Default query parameters
  defaultQueryParams?: Record<string, string>;

  // Endpoints configuration
  endpoints: Record<string, EndpointConfig>;

  // Global pagination config (can be overridden per endpoint)
  pagination?: PaginationConfig;

  // Global error mapping rules
  errorMappings?: ErrorMappingRule[];

  // Global retry configuration
  retry?: RetryConfig;

  // Global timeout configuration
  timeout?: TimeoutConfig;

  // Global rate limiting
  rateLimit?: RateLimitConfig;

  // Global logging configuration
  logging?: LoggingConfig;

  // Webhook configuration
  webhook?: WebhookConfig;

  // SSL/TLS configuration
  ssl?: {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };

  // Proxy configuration
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
}

/**
 * REST request context
 */
export interface RestRequestContext {
  endpoint: string;
  input: Record<string, unknown>;
  correlationId?: string;
  userId?: string;
  tenantId: string;
  configId: string;
}

/**
 * REST request metadata (for logging)
 */
export interface RestRequestLog {
  id: string;
  timestamp: Date;
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  correlationId?: string;
}

/**
 * REST response metadata (for logging)
 */
export interface RestResponseLog {
  requestId: string;
  timestamp: Date;
  statusCode: number;
  statusText: string;
  headers?: Record<string, string>;
  body?: unknown;
  durationMs: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T = unknown> {
  items: T[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
}

/**
 * REST connector execution result
 */
export interface RestExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    retryable: boolean;
  };
  pagination?: PaginatedResponse['pagination'];
  metadata?: {
    requestId: string;
    durationMs: number;
    statusCode?: number;
    retryCount?: number;
  };
}
