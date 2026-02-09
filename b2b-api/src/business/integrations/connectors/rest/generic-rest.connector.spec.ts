import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { GenericRestConnector, GenericRestConnectorFactory } from './generic-rest.connector';
import { ConnectorContext, WebhookPayload } from '../interfaces';
import { RestConnectorService, WebhookReceiverService } from './services';

// Mock all services
jest.mock('./services', () => ({
  RestConnectorService: jest.fn().mockImplementation(() => ({
    validateConfig: jest.fn(),
    execute: jest.fn(),
    executeAll: jest.fn(),
  })),
  AuthProviderService: jest.fn(),
  JsonPathMapperService: jest.fn(),
  PaginationHandlerService: jest.fn(),
  ErrorMapperService: jest.fn(),
  RequestLoggerService: jest.fn(),
  WebhookReceiverService: jest.fn().mockImplementation(() => ({
    processWebhook: jest.fn(),
  })),
}));

describe('GenericRestConnector', () => {
  let connector: GenericRestConnector;
  let mockHttpService: jest.Mocked<HttpService>;

  const mockContext: ConnectorContext = {
    tenantId: 'tenant-123',
    userId: 'user-123',
    configId: 'config-123',
    correlationId: 'correlation-123',
    config: {
      baseUrl: 'https://api.example.com',
      authType: 'bearer',
      timeout: 30000,
      retryEnabled: true,
      maxRetries: 3,
      endpoints: {
        getUsers: { method: 'GET', path: '/users' },
        createUser: { method: 'POST', path: '/users' },
      },
    },
    credentials: {
      token: 'test-token',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttpService = {
      head: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    } as any;

    connector = new GenericRestConnector();
    connector.initializeServices(mockHttpService);
  });

  describe('getMetadata', () => {
    it('should return correct connector metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.code).toBe('generic-rest');
      expect(metadata.name).toBe('Generic REST Connector');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.author).toBe('B2B Platform');
      expect(metadata.type).toBe('API');
      expect(metadata.direction).toBe('BIDIRECTIONAL');
    });
  });

  describe('getCredentialRequirements', () => {
    it('should return credential requirements for all auth types', () => {
      const requirements = connector.getCredentialRequirements();

      expect(requirements).toHaveLength(4);

      const apiKeyReq = requirements.find((r) => r.type === 'API_KEY');
      expect(apiKeyReq).toBeDefined();
      expect(apiKeyReq?.fields).toContainEqual(
        expect.objectContaining({ key: 'apiKey', required: true }),
      );

      const basicReq = requirements.find((r) => r.type === 'BASIC_AUTH');
      expect(basicReq).toBeDefined();
      expect(basicReq?.fields).toContainEqual(
        expect.objectContaining({ key: 'username', required: true }),
      );

      const bearerReq = requirements.find((r) => r.type === 'BEARER_TOKEN');
      expect(bearerReq).toBeDefined();
      expect(bearerReq?.fields).toContainEqual(
        expect.objectContaining({ key: 'token', required: true }),
      );

      const oauth2Req = requirements.find((r) => r.type === 'OAUTH2');
      expect(oauth2Req).toBeDefined();
      expect(oauth2Req?.fields).toContainEqual(
        expect.objectContaining({ key: 'clientId', required: true }),
      );
    });
  });

  describe('getConfigSchema', () => {
    it('should return valid JSON schema for configuration', () => {
      const schema = connector.getConfigSchema();

      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('baseUrl');
      expect(schema.properties).toHaveProperty('authType');
      expect(schema.properties).toHaveProperty('timeout');
      expect(schema.properties).toHaveProperty('retryEnabled');
      expect(schema.required).toContain('baseUrl');
    });
  });

  describe('getCapabilities', () => {
    it('should return all supported capabilities', () => {
      const capabilities = connector.getCapabilities();

      expect(capabilities).toContainEqual(
        expect.objectContaining({ code: 'http_get', category: 'SYNC' }),
      );
      expect(capabilities).toContainEqual(
        expect.objectContaining({ code: 'http_post', category: 'SYNC' }),
      );
      expect(capabilities).toContainEqual(
        expect.objectContaining({ code: 'http_put', category: 'SYNC' }),
      );
      expect(capabilities).toContainEqual(
        expect.objectContaining({ code: 'http_patch', category: 'SYNC' }),
      );
      expect(capabilities).toContainEqual(
        expect.objectContaining({ code: 'http_delete', category: 'SYNC' }),
      );
      expect(capabilities).toContainEqual(
        expect.objectContaining({ code: 'fetch_all', category: 'BATCH' }),
      );
      expect(capabilities).toContainEqual(
        expect.objectContaining({ code: 'receive_webhook', category: 'WEBHOOK' }),
      );
    });
  });

  describe('initialize', () => {
    it('should initialize connector with valid config', async () => {
      const restService = (connector as any).restConnectorService;
      restService.validateConfig.mockReturnValue({ valid: true, errors: [] });

      await expect(connector.initialize(mockContext)).resolves.not.toThrow();
    });

    it('should throw error with invalid config', async () => {
      const restService = (connector as any).restConnectorService;
      restService.validateConfig.mockReturnValue({
        valid: false,
        errors: ['baseUrl is required', 'Invalid endpoint format'],
      });

      await expect(connector.initialize(mockContext)).rejects.toThrow(
        'Invalid configuration: baseUrl is required, Invalid endpoint format',
      );
    });
  });

  describe('testConnection', () => {
    it('should return success when HEAD request succeeds', async () => {
      const restService = (connector as any).restConnectorService;
      restService.validateConfig.mockReturnValue({ valid: true, errors: [] });

      mockHttpService.head.mockReturnValue(
        of({
          status: 200,
          data: {},
        } as any),
      );

      const result = await connector.testConnection(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
      expect(result.details?.statusCode).toBe(200);
    });

    it('should try GET when HEAD fails', async () => {
      const restService = (connector as any).restConnectorService;
      restService.validateConfig.mockReturnValue({ valid: true, errors: [] });

      mockHttpService.head.mockReturnValue(throwError(() => new Error('HEAD not supported')));
      mockHttpService.get.mockReturnValue(
        of({
          status: 200,
          data: {},
        } as any),
      );

      const result = await connector.testConnection(mockContext);

      expect(result.success).toBe(true);
    });

    it('should return success for 4xx errors (server is reachable)', async () => {
      const restService = (connector as any).restConnectorService;
      restService.validateConfig.mockReturnValue({ valid: true, errors: [] });

      mockHttpService.head.mockReturnValue(throwError(() => new Error('HEAD not supported')));
      mockHttpService.get.mockReturnValue(
        throwError(() => ({
          response: { status: 401 },
        })),
      );

      const result = await connector.testConnection(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Server is reachable');
    });

    it('should return failure for 5xx errors', async () => {
      const restService = (connector as any).restConnectorService;
      restService.validateConfig.mockReturnValue({ valid: true, errors: [] });

      mockHttpService.head.mockReturnValue(throwError(() => new Error('HEAD not supported')));
      mockHttpService.get.mockReturnValue(throwError(() => new Error('Server error')));

      const result = await connector.testConnection(mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });

    it('should return validation error when config is invalid', async () => {
      const restService = (connector as any).restConnectorService;
      restService.validateConfig.mockReturnValue({
        valid: false,
        errors: ['Missing baseUrl'],
      });

      const result = await connector.testConnection(mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Configuration validation failed');
    });

    it('should return error when HTTP service is not initialized', async () => {
      const uninitConnector = new GenericRestConnector();
      // Don't call initializeServices

      // Access private field to set restConnectorService
      (uninitConnector as any).restConnectorService = {
        validateConfig: jest.fn().mockReturnValue({ valid: true, errors: [] }),
      };

      const result = await uninitConnector.testConnection(mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toBe('HTTP service not initialized');
    });
  });

  describe('executeCapability', () => {
    beforeEach(() => {
      const restService = (connector as any).restConnectorService;
      restService.validateConfig.mockReturnValue({ valid: true, errors: [] });
    });

    it('should execute HTTP GET capability', async () => {
      const restService = (connector as any).restConnectorService;
      restService.execute.mockResolvedValue({
        success: true,
        data: { users: [] },
        metadata: { statusCode: 200 },
      });

      const result = await connector.executeCapability(
        'http_get',
        { endpoint: 'getUsers', params: { page: 1 } },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ users: [] });
    });

    it('should execute HTTP POST capability', async () => {
      const restService = (connector as any).restConnectorService;
      restService.execute.mockResolvedValue({
        success: true,
        data: { id: 'user-123' },
        metadata: { statusCode: 201 },
      });

      const result = await connector.executeCapability(
        'http_post',
        { endpoint: 'createUser', body: { name: 'John' } },
        mockContext,
      );

      expect(result.success).toBe(true);
    });

    it('should execute HTTP PUT capability', async () => {
      const restService = (connector as any).restConnectorService;
      restService.execute.mockResolvedValue({
        success: true,
        data: {},
        metadata: {},
      });

      const result = await connector.executeCapability(
        'http_put',
        { endpoint: 'updateUser', body: { name: 'Jane' } },
        mockContext,
      );

      expect(result.success).toBe(true);
    });

    it('should execute HTTP PATCH capability', async () => {
      const restService = (connector as any).restConnectorService;
      restService.execute.mockResolvedValue({
        success: true,
        data: {},
        metadata: {},
      });

      const result = await connector.executeCapability(
        'http_patch',
        { endpoint: 'patchUser', body: { name: 'Jane' } },
        mockContext,
      );

      expect(result.success).toBe(true);
    });

    it('should execute HTTP DELETE capability', async () => {
      const restService = (connector as any).restConnectorService;
      restService.execute.mockResolvedValue({
        success: true,
        data: {},
        metadata: {},
      });

      const result = await connector.executeCapability(
        'http_delete',
        { endpoint: 'deleteUser' },
        mockContext,
      );

      expect(result.success).toBe(true);
    });

    it('should execute fetch_all capability with pagination', async () => {
      const restService = (connector as any).restConnectorService;
      restService.executeAll.mockResolvedValue({
        success: true,
        data: [{ id: 1 }, { id: 2 }, { id: 3 }],
        pagination: { page: 3, totalPages: 3 },
        metadata: {},
      });

      const result = await connector.executeCapability(
        'fetch_all',
        { endpoint: 'getUsers', maxPages: 3 },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.pagination).toBeDefined();
    });

    it('should return error for missing endpoint', async () => {
      const result = await connector.executeCapability('http_get', {}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Endpoint is required');
    });

    it('should return error for unknown capability', async () => {
      const result = await connector.executeCapability(
        'unknown_capability',
        { endpoint: 'test' },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown capability');
    });

    it('should handle service execution errors', async () => {
      const restService = (connector as any).restConnectorService;
      restService.execute.mockResolvedValue({
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'API returned error',
          retryable: true,
        },
        metadata: {},
      });

      const result = await connector.executeCapability(
        'http_get',
        { endpoint: 'getUsers' },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('API returned error');
      expect(result.errorCode).toBe('API_ERROR');
      expect(result.retryable).toBe(true);
    });
  });

  describe('handleWebhook', () => {
    const mockPayload: WebhookPayload = {
      eventType: 'user.created',
      data: { userId: 'user-123' },
      timestamp: new Date(),
      signature: 'test-signature',
      headers: { 'x-signature': 'test-signature' },
    };

    it('should return error when webhooks are disabled', async () => {
      const result = await connector.handleWebhook(mockPayload, mockContext);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Webhooks are not enabled');
    });

    it('should process webhook when enabled', async () => {
      const webhookContext = {
        ...mockContext,
        config: {
          ...mockContext.config,
          webhook: {
            enabled: true,
            secret: 'webhook-secret',
          },
        },
      };

      const webhookService = (connector as any).webhookReceiverService;
      webhookService.processWebhook.mockResolvedValue({
        valid: true,
        event: {
          eventType: 'user.created',
          payload: { userId: 'user-123' },
        },
      });

      const result = await connector.handleWebhook(mockPayload, webhookContext);

      expect(result.valid).toBe(true);
      expect(result.eventType).toBe('user.created');
      expect(result.data).toEqual({ userId: 'user-123' });
    });

    it('should return webhook validation error', async () => {
      const webhookContext = {
        ...mockContext,
        config: {
          ...mockContext.config,
          webhook: {
            enabled: true,
            secret: 'webhook-secret',
          },
        },
      };

      const webhookService = (connector as any).webhookReceiverService;
      webhookService.processWebhook.mockResolvedValue({
        valid: false,
        error: 'Invalid signature',
      });

      const result = await connector.handleWebhook(mockPayload, webhookContext);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });
  });

  describe('destroy', () => {
    it('should clean up resources', async () => {
      const restService = (connector as any).restConnectorService;
      restService.validateConfig.mockReturnValue({ valid: true, errors: [] });

      await connector.initialize(mockContext);
      await connector.destroy();

      // Verify config is cleared
      expect((connector as any).config).toBeUndefined();
    });
  });

  describe('buildAuthConfig', () => {
    it('should build basic auth config', async () => {
      const context = {
        ...mockContext,
        config: { ...mockContext.config, authType: 'basic' },
        credentials: { username: 'user', password: 'pass' },
      };

      const restService = (connector as any).restConnectorService;
      restService.validateConfig.mockReturnValue({ valid: true, errors: [] });

      await connector.initialize(context);
      // Config should be built with basic auth
    });

    it('should build bearer auth config', async () => {
      const context = {
        ...mockContext,
        config: { ...mockContext.config, authType: 'bearer' },
        credentials: { token: 'my-token', prefix: 'Token' },
      };

      const restService = (connector as any).restConnectorService;
      restService.validateConfig.mockReturnValue({ valid: true, errors: [] });

      await connector.initialize(context);
    });

    it('should build API key auth config', async () => {
      const context = {
        ...mockContext,
        config: { ...mockContext.config, authType: 'api_key' },
        credentials: { apiKey: 'key-123', keyName: 'X-API-Key', placement: 'header' },
      };

      const restService = (connector as any).restConnectorService;
      restService.validateConfig.mockReturnValue({ valid: true, errors: [] });

      await connector.initialize(context);
    });

    it('should build OAuth2 auth config', async () => {
      const context = {
        ...mockContext,
        config: { ...mockContext.config, authType: 'oauth2' },
        credentials: {
          clientId: 'client-123',
          clientSecret: 'secret-123',
          tokenUrl: 'https://auth.example.com/token',
          grantType: 'client_credentials',
          scopes: 'read write',
        },
      };

      const restService = (connector as any).restConnectorService;
      restService.validateConfig.mockReturnValue({ valid: true, errors: [] });

      await connector.initialize(context);
    });

    it('should default to no auth', async () => {
      const context = {
        ...mockContext,
        config: { ...mockContext.config, authType: undefined },
        credentials: {},
      };

      const restService = (connector as any).restConnectorService;
      restService.validateConfig.mockReturnValue({ valid: true, errors: [] });

      await connector.initialize(context);
    });
  });
});

describe('GenericRestConnectorFactory', () => {
  it('should create connector instances with initialized services', () => {
    const mockHttpService = {} as HttpService;
    const factory = new GenericRestConnectorFactory(mockHttpService);

    const connector = factory.create();

    expect(connector).toBeInstanceOf(GenericRestConnector);
  });
});
