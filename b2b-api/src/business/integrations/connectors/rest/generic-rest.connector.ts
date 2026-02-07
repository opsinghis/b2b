import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import {
  IConnector,
  ConnectorMetadata,
  CredentialRequirement,
  ConfigSchema,
  CapabilityDefinition,
  ConnectorContext,
  ConnectionTestResult,
  ConnectorOperationResult,
  WebhookPayload,
  WebhookValidationResult,
} from '../interfaces';
import {
  RestConnectorConfig,
  RestExecutionResult,
  RestAuthConfig,
  WebhookConfig,
} from './interfaces';
import {
  RestConnectorService,
  AuthProviderService,
  JsonPathMapperService,
  PaginationHandlerService,
  ErrorMapperService,
  RequestLoggerService,
  WebhookReceiverService,
} from './services';
import { CredentialType, CapabilityCategory, IntegrationConnectorType, IntegrationDirection } from '@prisma/client';

/**
 * Generic REST Connector
 * Implements IConnector interface for REST API integrations
 */
export class GenericRestConnector implements IConnector {
  private readonly logger = new Logger(GenericRestConnector.name);
  private restConnectorService!: RestConnectorService;
  private webhookReceiverService!: WebhookReceiverService;
  private config?: RestConnectorConfig;
  private httpService?: HttpService;

  /**
   * Initialize the connector services
   * This should be called after construction with DI'd services
   */
  initializeServices(httpService: HttpService): void {
    this.httpService = httpService;

    const jsonPathMapper = new JsonPathMapperService();
    const authProvider = new AuthProviderService(httpService);
    const paginationHandler = new PaginationHandlerService(jsonPathMapper);
    const errorMapper = new ErrorMapperService(jsonPathMapper);
    const requestLogger = new RequestLoggerService();

    this.restConnectorService = new RestConnectorService(
      httpService,
      authProvider,
      jsonPathMapper,
      paginationHandler,
      errorMapper,
      requestLogger,
    );

    this.webhookReceiverService = new WebhookReceiverService(jsonPathMapper);
  }

  /**
   * Get connector metadata
   */
  getMetadata(): ConnectorMetadata {
    return {
      code: 'generic-rest',
      name: 'Generic REST Connector',
      description: 'Configurable REST API connector supporting various authentication methods and data mappings',
      version: '1.0.0',
      author: 'B2B Platform',
      type: IntegrationConnectorType.API,
      direction: IntegrationDirection.BIDIRECTIONAL,
      documentationUrl: '/docs/connectors/generic-rest',
    };
  }

  /**
   * Get required credentials configuration
   */
  getCredentialRequirements(): CredentialRequirement[] {
    return [
      {
        type: CredentialType.API_KEY,
        required: false,
        fields: [
          {
            key: 'apiKey',
            label: 'API Key',
            type: 'password',
            required: true,
            description: 'The API key for authentication',
          },
          {
            key: 'keyName',
            label: 'Key Name',
            type: 'string',
            required: true,
            description: 'Header or query parameter name (e.g., X-API-Key)',
            placeholder: 'X-API-Key',
          },
          {
            key: 'placement',
            label: 'Placement',
            type: 'select',
            required: true,
            description: 'Where to send the API key',
            options: [
              { label: 'Header', value: 'header' },
              { label: 'Query Parameter', value: 'query' },
              { label: 'Cookie', value: 'cookie' },
            ],
          },
        ],
      },
      {
        type: CredentialType.BASIC_AUTH,
        required: false,
        fields: [
          {
            key: 'username',
            label: 'Username',
            type: 'string',
            required: true,
            description: 'Username for Basic authentication',
          },
          {
            key: 'password',
            label: 'Password',
            type: 'password',
            required: true,
            description: 'Password for Basic authentication',
          },
        ],
      },
      {
        type: CredentialType.BEARER_TOKEN,
        required: false,
        fields: [
          {
            key: 'token',
            label: 'Bearer Token',
            type: 'password',
            required: true,
            description: 'The bearer token for authentication',
          },
          {
            key: 'prefix',
            label: 'Token Prefix',
            type: 'string',
            required: false,
            description: 'Prefix before token (default: Bearer)',
            placeholder: 'Bearer',
          },
        ],
      },
      {
        type: CredentialType.OAUTH2,
        required: false,
        fields: [
          {
            key: 'clientId',
            label: 'Client ID',
            type: 'string',
            required: true,
            description: 'OAuth2 Client ID',
          },
          {
            key: 'clientSecret',
            label: 'Client Secret',
            type: 'password',
            required: true,
            description: 'OAuth2 Client Secret',
          },
          {
            key: 'tokenUrl',
            label: 'Token URL',
            type: 'string',
            required: true,
            description: 'OAuth2 token endpoint URL',
          },
          {
            key: 'grantType',
            label: 'Grant Type',
            type: 'select',
            required: true,
            description: 'OAuth2 grant type',
            options: [
              { label: 'Client Credentials', value: 'client_credentials' },
              { label: 'Authorization Code', value: 'authorization_code' },
            ],
          },
          {
            key: 'scopes',
            label: 'Scopes',
            type: 'string',
            required: false,
            description: 'Space-separated list of OAuth2 scopes',
          },
        ],
        oauth2Config: {
          authorizationUrl: '',
          tokenUrl: '',
          scopes: [],
          grantType: 'client_credentials',
        },
      },
    ];
  }

  /**
   * Get connector configuration schema
   */
  getConfigSchema(): ConfigSchema {
    return {
      type: 'object',
      properties: {
        baseUrl: {
          type: 'string',
          title: 'Base URL',
          description: 'The base URL for the REST API',
          format: 'uri',
        },
        authType: {
          type: 'string',
          title: 'Authentication Type',
          description: 'Type of authentication to use',
          enum: ['none', 'basic', 'bearer', 'api_key', 'oauth2'],
          default: 'none',
        },
        defaultHeaders: {
          type: 'object',
          title: 'Default Headers',
          description: 'Headers to include in all requests',
        },
        timeout: {
          type: 'number',
          title: 'Request Timeout',
          description: 'Request timeout in milliseconds',
          default: 30000,
          minimum: 1000,
          maximum: 300000,
        },
        retryEnabled: {
          type: 'boolean',
          title: 'Enable Retry',
          description: 'Enable automatic retry on failure',
          default: true,
        },
        maxRetries: {
          type: 'number',
          title: 'Max Retries',
          description: 'Maximum number of retry attempts',
          default: 3,
          minimum: 0,
          maximum: 10,
        },
        endpoints: {
          type: 'object',
          title: 'Endpoints',
          description: 'Configured API endpoints',
        },
        pagination: {
          type: 'object',
          title: 'Pagination',
          description: 'Default pagination configuration',
        },
        webhook: {
          type: 'object',
          title: 'Webhook',
          description: 'Webhook receiver configuration',
        },
      },
      required: ['baseUrl'],
    };
  }

  /**
   * Get declared capabilities
   */
  getCapabilities(): CapabilityDefinition[] {
    return [
      {
        code: 'http_get',
        name: 'HTTP GET',
        description: 'Execute an HTTP GET request',
        category: CapabilityCategory.SYNC,
        inputSchema: {
          type: 'object',
          properties: {
            endpoint: { type: 'string', description: 'Endpoint name or path' },
            params: { type: 'object', description: 'Query parameters' },
          },
          required: ['endpoint'],
        },
      },
      {
        code: 'http_post',
        name: 'HTTP POST',
        description: 'Execute an HTTP POST request',
        category: CapabilityCategory.SYNC,
        inputSchema: {
          type: 'object',
          properties: {
            endpoint: { type: 'string', description: 'Endpoint name or path' },
            body: { type: 'object', description: 'Request body' },
          },
          required: ['endpoint'],
        },
      },
      {
        code: 'http_put',
        name: 'HTTP PUT',
        description: 'Execute an HTTP PUT request',
        category: CapabilityCategory.SYNC,
        inputSchema: {
          type: 'object',
          properties: {
            endpoint: { type: 'string', description: 'Endpoint name or path' },
            body: { type: 'object', description: 'Request body' },
          },
          required: ['endpoint'],
        },
      },
      {
        code: 'http_patch',
        name: 'HTTP PATCH',
        description: 'Execute an HTTP PATCH request',
        category: CapabilityCategory.SYNC,
        inputSchema: {
          type: 'object',
          properties: {
            endpoint: { type: 'string', description: 'Endpoint name or path' },
            body: { type: 'object', description: 'Request body' },
          },
          required: ['endpoint'],
        },
      },
      {
        code: 'http_delete',
        name: 'HTTP DELETE',
        description: 'Execute an HTTP DELETE request',
        category: CapabilityCategory.SYNC,
        inputSchema: {
          type: 'object',
          properties: {
            endpoint: { type: 'string', description: 'Endpoint name or path' },
          },
          required: ['endpoint'],
        },
      },
      {
        code: 'fetch_all',
        name: 'Fetch All',
        description: 'Fetch all items using pagination',
        category: CapabilityCategory.BATCH,
        inputSchema: {
          type: 'object',
          properties: {
            endpoint: { type: 'string', description: 'Endpoint name or path' },
            maxPages: { type: 'number', description: 'Maximum pages to fetch' },
          },
          required: ['endpoint'],
        },
      },
      {
        code: 'receive_webhook',
        name: 'Receive Webhook',
        description: 'Receive and process incoming webhooks',
        category: CapabilityCategory.WEBHOOK,
        inputSchema: {
          type: 'object',
          properties: {
            eventType: { type: 'string', description: 'Webhook event type to listen for' },
          },
        },
      },
    ];
  }

  /**
   * Initialize the connector with configuration
   */
  async initialize(context: ConnectorContext): Promise<void> {
    this.logger.log(`Initializing Generic REST Connector for tenant ${context.tenantId}`);

    // Build REST connector configuration from context
    this.config = this.buildConfig(context.config, context.credentials);

    // Validate configuration
    const validation = this.restConnectorService.validateConfig(this.config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    this.logger.log('Generic REST Connector initialized successfully');
  }

  /**
   * Test the connection
   */
  async testConnection(context: ConnectorContext): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      // Build config if not already initialized
      const config = this.config || this.buildConfig(context.config, context.credentials);

      // Validate configuration
      const validation = this.restConnectorService.validateConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          message: `Configuration validation failed: ${validation.errors.join(', ')}`,
          errors: validation.errors,
        };
      }

      // Try a simple GET request to the base URL
      if (!this.httpService) {
        return {
          success: false,
          message: 'HTTP service not initialized',
          errors: ['HTTP service not available'],
        };
      }

      // Perform a HEAD or GET request to check connectivity
      try {
        const response = await firstValueFrom(
          this.httpService.head(config.baseUrl).pipe(timeout(10000)),
        );

        return {
          success: true,
          message: 'Connection successful',
          latencyMs: Date.now() - startTime,
          details: {
            statusCode: response.status,
            baseUrl: config.baseUrl,
          },
          capabilities: Object.keys(config.endpoints),
        };
      } catch (headError) {
        // HEAD might not be supported, try GET
        try {
          const response = await firstValueFrom(
            this.httpService.get(config.baseUrl).pipe(timeout(10000)),
          );

          return {
            success: true,
            message: 'Connection successful',
            latencyMs: Date.now() - startTime,
            details: {
              statusCode: response.status,
              baseUrl: config.baseUrl,
            },
            capabilities: Object.keys(config.endpoints),
          };
        } catch (getError) {
          // If we get a 4xx error, the server is reachable
          const axiosError = getError as { response?: { status: number } };
          if (axiosError.response?.status && axiosError.response.status < 500) {
            return {
              success: true,
              message: 'Server is reachable (authentication may be required)',
              latencyMs: Date.now() - startTime,
              details: {
                statusCode: axiosError.response.status,
                baseUrl: config.baseUrl,
              },
              capabilities: Object.keys(config.endpoints),
            };
          }

          throw getError;
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${(error as Error).message}`,
        latencyMs: Date.now() - startTime,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Execute a capability
   */
  async executeCapability(
    capability: string,
    input: Record<string, unknown>,
    context: ConnectorContext,
  ): Promise<ConnectorOperationResult> {
    const config = this.config || this.buildConfig(context.config, context.credentials);
    const endpoint = input.endpoint as string;

    if (!endpoint) {
      return {
        success: false,
        error: 'Endpoint is required',
        retryable: false,
      };
    }

    const requestContext = {
      endpoint,
      input,
      correlationId: context.correlationId,
      userId: context.userId,
      tenantId: context.tenantId,
      configId: context.configId,
    };

    let result: RestExecutionResult;

    switch (capability) {
      case 'http_get':
      case 'http_post':
      case 'http_put':
      case 'http_patch':
      case 'http_delete':
        result = await this.restConnectorService.execute(config, requestContext);
        break;

      case 'fetch_all':
        result = await this.restConnectorService.executeAll(config, requestContext, {
          maxPages: input.maxPages as number | undefined,
        });
        break;

      default:
        return {
          success: false,
          error: `Unknown capability: ${capability}`,
          retryable: false,
        };
    }

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: {
          pagination: result.pagination,
          ...result.metadata,
        },
      };
    } else {
      return {
        success: false,
        error: result.error?.message,
        errorCode: result.error?.code,
        retryable: result.error?.retryable ?? false,
        metadata: result.metadata,
      };
    }
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(
    payload: WebhookPayload,
    context: ConnectorContext,
  ): Promise<WebhookValidationResult> {
    const config = this.config || this.buildConfig(context.config, context.credentials);

    if (!config.webhook?.enabled) {
      return {
        valid: false,
        error: 'Webhooks are not enabled for this connector',
      };
    }

    const result = await this.webhookReceiverService.processWebhook(
      config.webhook,
      context.tenantId,
      context.configId,
      'generic-rest',
      JSON.stringify(payload.data),
      payload.headers || {},
    );

    if (!result.valid) {
      return {
        valid: false,
        error: result.error,
      };
    }

    return {
      valid: true,
      eventType: result.event?.eventType,
      data: result.event?.payload as Record<string, unknown>,
    };
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.logger.log('Destroying Generic REST Connector');
    this.config = undefined;
  }

  /**
   * Build REST connector config from context
   */
  private buildConfig(
    config: Record<string, unknown>,
    credentials: Record<string, unknown>,
  ): RestConnectorConfig {
    const authConfig = this.buildAuthConfig(
      config.authType as string,
      credentials,
    );

    return {
      baseUrl: config.baseUrl as string,
      auth: authConfig,
      defaultHeaders: config.defaultHeaders as Record<string, string> | undefined,
      defaultQueryParams: config.defaultQueryParams as Record<string, string> | undefined,
      endpoints: config.endpoints as Record<string, any> || {},
      pagination: config.pagination as any,
      errorMappings: config.errorMappings as any[],
      retry: config.retryEnabled
        ? {
            maxRetries: (config.maxRetries as number) || 3,
            retryDelay: 1000,
            retryBackoff: 'exponential',
          }
        : undefined,
      timeout: {
        requestTimeout: (config.timeout as number) || 30000,
      },
      logging: config.logging as any,
      webhook: config.webhook as WebhookConfig | undefined,
    };
  }

  /**
   * Build authentication config
   */
  private buildAuthConfig(
    authType: string | undefined,
    credentials: Record<string, unknown>,
  ): RestAuthConfig {
    switch (authType) {
      case 'basic':
        return {
          type: 'basic',
          username: credentials.username as string,
          password: credentials.password as string,
        };

      case 'bearer':
        return {
          type: 'bearer',
          token: credentials.token as string,
          prefix: credentials.prefix as string | undefined,
        };

      case 'api_key':
        return {
          type: 'api_key',
          apiKey: credentials.apiKey as string,
          keyName: credentials.keyName as string,
          placement: credentials.placement as 'header' | 'query' | 'cookie',
        };

      case 'oauth2':
        return {
          type: 'oauth2',
          clientId: credentials.clientId as string,
          clientSecret: credentials.clientSecret as string,
          tokenUrl: credentials.tokenUrl as string,
          grantType: (credentials.grantType as any) || 'client_credentials',
          scopes: credentials.scopes
            ? (credentials.scopes as string).split(' ')
            : undefined,
        };

      default:
        return { type: 'none' };
    }
  }
}

/**
 * Factory for creating Generic REST Connector instances
 */
export class GenericRestConnectorFactory {
  constructor(private readonly httpService: HttpService) {}

  create(): GenericRestConnector {
    const connector = new GenericRestConnector();
    connector.initializeServices(this.httpService);
    return connector;
  }
}
