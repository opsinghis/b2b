import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosHeaders, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { RestConnectorService } from './rest-connector.service';
import { AuthProviderService } from './auth-provider.service';
import { JsonPathMapperService } from './json-path-mapper.service';
import { PaginationHandlerService } from './pagination-handler.service';
import { ErrorMapperService } from './error-mapper.service';
import { RequestLoggerService } from './request-logger.service';
import { RestConnectorConfig } from '../interfaces';

describe('RestConnectorService', () => {
  let service: RestConnectorService;
  let httpService: HttpService;
  let authProvider: AuthProviderService;

  const mockHttpService = {
    request: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    head: jest.fn(),
  };

  const mockAuthProvider = {
    applyAuth: jest.fn(),
    validateAuthConfig: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestConnectorService,
        JsonPathMapperService,
        PaginationHandlerService,
        ErrorMapperService,
        RequestLoggerService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: AuthProviderService,
          useValue: mockAuthProvider,
        },
      ],
    }).compile();

    service = module.get<RestConnectorService>(RestConnectorService);
    httpService = module.get<HttpService>(HttpService);
    authProvider = module.get<AuthProviderService>(AuthProviderService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    const baseConfig: RestConnectorConfig = {
      baseUrl: 'https://api.example.com',
      endpoints: {
        getUsers: {
          name: 'Get Users',
          method: 'GET',
          path: '/users',
        },
        createUser: {
          name: 'Create User',
          method: 'POST',
          path: '/users',
        },
      },
    };

    const context = {
      endpoint: 'getUsers',
      input: {},
      tenantId: 'tenant-1',
      configId: 'config-1',
    };

    it('should execute a successful GET request', async () => {
      const mockResponse: AxiosResponse = {
        data: [{ id: 1, name: 'John' }],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      mockAuthProvider.applyAuth.mockImplementation((config) => config);
      mockHttpService.request.mockReturnValue(of(mockResponse));

      const result = await service.execute(baseConfig, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, name: 'John' }]);
      expect(result.metadata?.statusCode).toBe(200);
    });

    it('should return error for unknown endpoint', async () => {
      const result = await service.execute(baseConfig, {
        ...context,
        endpoint: 'unknownEndpoint',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ENDPOINT_NOT_FOUND');
    });

    it('should handle network errors', async () => {
      mockAuthProvider.applyAuth.mockImplementation((config) => config);

      const networkError = new Error('Network Error');
      (networkError as any).code = 'ECONNREFUSED';
      mockHttpService.request.mockReturnValue(throwError(() => networkError));

      const result = await service.execute(baseConfig, context);

      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(true);
    });

    it('should handle 404 errors', async () => {
      mockAuthProvider.applyAuth.mockImplementation((config) => config);

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Resource not found' },
        },
        message: 'Request failed with status code 404',
      };
      mockHttpService.request.mockReturnValue(throwError(() => axiosError));

      const result = await service.execute(baseConfig, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND_ERROR');
      expect(result.error?.retryable).toBe(false);
    });

    it('should handle 500 errors', async () => {
      mockAuthProvider.applyAuth.mockImplementation((config) => config);

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { message: 'Server error' },
        },
        message: 'Request failed with status code 500',
      };
      mockHttpService.request.mockReturnValue(throwError(() => axiosError));

      const result = await service.execute(baseConfig, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SERVER_ERROR');
    });
  });

  describe('executeAll', () => {
    const paginatedConfig: RestConnectorConfig = {
      baseUrl: 'https://api.example.com',
      endpoints: {
        listItems: {
          name: 'List Items',
          method: 'GET',
          path: '/items',
          pagination: {
            type: 'cursor',
            cursorParam: 'cursor',
            limitParam: 'limit',
            nextCursorPath: '$.nextCursor',
            itemsPath: '$.data',
          },
        },
      },
    };

    it('should fetch all pages', async () => {
      mockAuthProvider.applyAuth.mockImplementation((config) => config);

      // First page
      mockHttpService.request.mockReturnValueOnce(
        of({
          data: {
            data: [{ id: 1 }, { id: 2 }],
            nextCursor: 'cursor2',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        }),
      );

      // Second page
      mockHttpService.request.mockReturnValueOnce(
        of({
          data: {
            data: [{ id: 3 }, { id: 4 }],
            nextCursor: null,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        }),
      );

      const result = await service.executeAll(paginatedConfig, {
        endpoint: 'listItems',
        input: {},
        tenantId: 'tenant-1',
        configId: 'config-1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);
    });
  });

  describe('validateConfig', () => {
    it('should validate a correct configuration', () => {
      const config: RestConnectorConfig = {
        baseUrl: 'https://api.example.com',
        endpoints: {
          test: {
            name: 'Test',
            method: 'GET',
            path: '/test',
          },
        },
      };

      mockAuthProvider.validateAuthConfig.mockReturnValue({ valid: true, errors: [] });

      const result = service.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject configuration without baseUrl', () => {
      const config: RestConnectorConfig = {
        baseUrl: '',
        endpoints: {
          test: {
            name: 'Test',
            method: 'GET',
            path: '/test',
          },
        },
      };

      const result = service.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('baseUrl is required');
    });

    it('should reject configuration with invalid URL', () => {
      const config: RestConnectorConfig = {
        baseUrl: 'not-a-valid-url',
        endpoints: {
          test: {
            name: 'Test',
            method: 'GET',
            path: '/test',
          },
        },
      };

      const result = service.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('baseUrl must be a valid URL');
    });

    it('should reject configuration without endpoints', () => {
      const config: RestConnectorConfig = {
        baseUrl: 'https://api.example.com',
        endpoints: {},
      };

      const result = service.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one endpoint is required');
    });
  });

  describe('getLogs', () => {
    it('should return recent logs', () => {
      const logs = service.getLogs();
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should filter logs by tenantId', () => {
      const logs = service.getLogs({ tenantId: 'tenant-1' });
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe('getLogStats', () => {
    it('should return log statistics', () => {
      const stats = service.getLogStats();

      expect(stats).toHaveProperty('totalLogs');
      expect(stats).toHaveProperty('errorCount');
      expect(stats).toHaveProperty('avgDurationMs');
      expect(stats).toHaveProperty('statusCodeCounts');
    });
  });
});
