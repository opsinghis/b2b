import {
  IntegrationConnectorType,
  IntegrationDirection,
  CredentialType,
  CapabilityCategory,
} from '@prisma/client';

/**
 * Connector metadata declaration
 */
export interface ConnectorMetadata {
  code: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  type: IntegrationConnectorType;
  direction: IntegrationDirection;
  iconUrl?: string;
  documentationUrl?: string;
}

/**
 * Credential requirements for a connector
 */
export interface CredentialRequirement {
  type: CredentialType;
  required: boolean;
  fields: CredentialField[];
  scopes?: string[];
  oauth2Config?: OAuth2Config;
}

export interface CredentialField {
  key: string;
  label: string;
  type: 'string' | 'password' | 'number' | 'boolean' | 'select';
  required: boolean;
  description?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface OAuth2Config {
  authorizationUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  scopes: string[];
  grantType: 'authorization_code' | 'client_credentials' | 'password';
  pkce?: boolean;
}

/**
 * Capability definition
 */
export interface CapabilityDefinition {
  code: string;
  name: string;
  description?: string;
  category: CapabilityCategory;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  configSchema?: Record<string, unknown>;
  requiredScopes?: string[];
  requiredPermissions?: string[];
  isOptional?: boolean;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
  capabilities?: string[];
  errors?: string[];
}

/**
 * Connector configuration schema
 */
export interface ConfigSchema {
  type: 'object';
  properties: Record<string, ConfigProperty>;
  required?: string[];
}

export interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  items?: ConfigProperty;
  properties?: Record<string, ConfigProperty>;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/**
 * Connector operation context
 */
export interface ConnectorContext {
  tenantId: string;
  configId: string;
  config: Record<string, unknown>;
  credentials: Record<string, unknown>;
  correlationId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Connector operation result
 */
export interface ConnectorOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Webhook event payload
 */
export interface WebhookPayload {
  eventType: string;
  data: Record<string, unknown>;
  timestamp: Date;
  signature?: string;
  headers?: Record<string, string>;
}

/**
 * Webhook validation result
 */
export interface WebhookValidationResult {
  valid: boolean;
  error?: string;
  eventType?: string;
  data?: Record<string, unknown>;
}

/**
 * Main connector interface
 * All connectors must implement this interface
 */
export interface IConnector {
  /**
   * Get connector metadata
   */
  getMetadata(): ConnectorMetadata;

  /**
   * Get required credentials configuration
   */
  getCredentialRequirements(): CredentialRequirement[];

  /**
   * Get connector configuration schema
   */
  getConfigSchema(): ConfigSchema;

  /**
   * Get declared capabilities
   */
  getCapabilities(): CapabilityDefinition[];

  /**
   * Initialize the connector with configuration
   */
  initialize(context: ConnectorContext): Promise<void>;

  /**
   * Test the connection
   */
  testConnection(context: ConnectorContext): Promise<ConnectionTestResult>;

  /**
   * Execute a capability
   */
  executeCapability(
    capability: string,
    input: Record<string, unknown>,
    context: ConnectorContext,
  ): Promise<ConnectorOperationResult>;

  /**
   * Handle incoming webhook (optional)
   */
  handleWebhook?(payload: WebhookPayload, context: ConnectorContext): Promise<WebhookValidationResult>;

  /**
   * Cleanup resources (optional)
   */
  destroy?(): Promise<void>;
}

/**
 * Connector factory interface for dynamic loading
 */
export interface IConnectorFactory {
  create(): IConnector;
}

/**
 * Connector lifecycle state
 */
export type ConnectorState = 'registered' | 'configured' | 'enabled' | 'disabled' | 'error';

/**
 * Connector registration info
 */
export interface ConnectorRegistration {
  connector: IConnector;
  metadata: ConnectorMetadata;
  state: ConnectorState;
  loadedAt: Date;
  lastError?: string;
}
