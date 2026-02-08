import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { OracleRestClientService } from './oracle-rest-client.service';
import { OracleAuthService } from './oracle-auth.service';
import { OracleErrorHandlerService } from './oracle-error-handler.service';
import { OracleConnectionConfig, OracleCredentials } from '../interfaces';

describe('OracleRestClientService', () => {
  let service: OracleRestClientService;
  let httpService: jest.Mocked<HttpService>;
  let authService: jest.Mocked<OracleAuthService>;
  let errorHandler: OracleErrorHandlerService;

  const mockConfig: OracleConnectionConfig = {
    instanceUrl: 'https://fa-test.fa.ocs.oraclecloud.com',
    authType: 'oauth2',
    timeout: 30000,
  };

  const mockCredentials: OracleCredentials = {
    oauth2: {
      clientId: 'test-client',
      clientSecret: 'test-secret',
      tokenEndpoint: 'https://idcs.oraclecloud.com/oauth2/v1/token',
    },
  };

  const createAxiosResponse = <T>(data: T, status = 200): AxiosResponse<T> => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() } as InternalAxiosRequestConfig,
  });

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };

    const mockAuthService = {
      getAuthorizationHeader: jest.fn().mockResolvedValue('Bearer test-token'),
      invalidateToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OracleRestClientService,
        OracleErrorHandlerService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: OracleAuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<OracleRestClientService>(OracleRestClientService);
    httpService = module.get(HttpService);
    authService = module.get(OracleAuthService);
    errorHandler = module.get<OracleErrorHandlerService>(OracleErrorHandlerService);
  });

  describe('get', () => {
    it('should execute GET request and return list response', async () => {
      const mockResponse = {
        items: [{ id: 1 }, { id: 2 }],
        count: 2,
        hasMore: false,
        totalResults: 2,
      };

      httpService.get.mockReturnValue(of(createAxiosResponse(mockResponse)));

      const result = await service.get(mockConfig, mockCredentials, '/test/path');

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(2);
      expect(result.data?.metadata.count).toBe(2);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://fa-test.fa.ocs.oraclecloud.com/test/path',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('should include query params in request', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse({ items: [] })));

      await service.get(mockConfig, mockCredentials, '/test', {
        params: {
          q: "Name='Test'",
          limit: 10,
        },
      });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            q: "Name='Test'",
            limit: 10,
          }),
        }),
      );
    });

    it('should handle errors and return error result', async () => {
      const error = new Error('Network error');
      (error as any).isAxiosError = true;
      (error as any).response = { status: 500 };
      httpService.get.mockReturnValue(throwError(() => error));

      const result = await service.get(mockConfig, mockCredentials, '/test');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getById', () => {
    it('should execute GET by ID request', async () => {
      const mockEntity = { OrderId: 123, OrderNumber: 'ORD-001' };
      httpService.get.mockReturnValue(of(createAxiosResponse(mockEntity)));

      const result = await service.getById(mockConfig, mockCredentials, '/salesOrders', 123);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEntity);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://fa-test.fa.ocs.oraclecloud.com/salesOrders/123',
        expect.any(Object),
      );
    });
  });

  describe('post', () => {
    it('should execute POST request', async () => {
      const mockResponse = { OrderId: 456, OrderNumber: 'ORD-002' };
      const payload = { SourceTransactionNumber: 'SRC-001' };

      httpService.post.mockReturnValue(of(createAxiosResponse(mockResponse)));

      const result = await service.post(mockConfig, mockCredentials, '/salesOrders', payload);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://fa-test.fa.ocs.oraclecloud.com/salesOrders',
        payload,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });
  });

  describe('patch', () => {
    it('should execute PATCH request', async () => {
      const mockResponse = { OrderId: 123, StatusCode: 'BOOKED' };
      const payload = { StatusCode: 'BOOKED' };

      httpService.patch.mockReturnValue(of(createAxiosResponse(mockResponse)));

      const result = await service.patch(mockConfig, mockCredentials, '/salesOrders', 123, payload);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(httpService.patch).toHaveBeenCalledWith(
        'https://fa-test.fa.ocs.oraclecloud.com/salesOrders/123',
        payload,
        expect.any(Object),
      );
    });
  });

  describe('delete', () => {
    it('should execute DELETE request', async () => {
      httpService.delete.mockReturnValue(of(createAxiosResponse(null, 204)));

      const result = await service.delete(mockConfig, mockCredentials, '/salesOrders', 123);

      expect(result.success).toBe(true);
      expect(httpService.delete).toHaveBeenCalledWith(
        'https://fa-test.fa.ocs.oraclecloud.com/salesOrders/123',
        expect.any(Object),
      );
    });
  });

  describe('finder', () => {
    it('should execute finder query', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse({ items: [] })));

      await service.finder(mockConfig, mockCredentials, '/salesOrders', {
        finder: 'OrderNumberFinder',
        finderParams: {
          pOrderNumber: 'ORD-001',
        },
      });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            finder: 'OrderNumberFinder;pOrderNumber=ORD-001',
          }),
        }),
      );
    });

    it('should handle finder without params', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse({ items: [] })));

      await service.finder(mockConfig, mockCredentials, '/salesOrders', {
        finder: 'AllOrdersFinder',
      });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            finder: 'AllOrdersFinder',
          }),
        }),
      );
    });
  });

  describe('query', () => {
    it('should build query from options', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse({ items: [] })));

      await service.query(mockConfig, mockCredentials, '/salesOrders', {
        fields: ['OrderId', 'OrderNumber'],
        q: "StatusCode='OPEN'",
        limit: 50,
        offset: 100,
        orderBy: 'CreationDate:desc',
        expand: ['lines'],
        totalResults: true,
      });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            fields: 'OrderId,OrderNumber',
            q: "StatusCode='OPEN'",
            limit: 50,
            offset: 100,
            orderBy: 'CreationDate:desc',
            expand: 'lines',
            totalResults: true,
          }),
        }),
      );
    });
  });

  describe('getChild', () => {
    it('should fetch child resources', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse({ items: [] })));

      await service.getChild(mockConfig, mockCredentials, '/salesOrders', 123, 'lines');

      expect(httpService.get).toHaveBeenCalledWith(
        'https://fa-test.fa.ocs.oraclecloud.com/salesOrders/123/child/lines',
        expect.any(Object),
      );
    });
  });

  describe('postChild', () => {
    it('should create child resources', async () => {
      const lineData = { ProductNumber: 'ITEM-001', OrderedQuantity: 5 };
      httpService.post.mockReturnValue(of(createAxiosResponse({ OrderLineId: 456 })));

      await service.postChild(mockConfig, mockCredentials, '/salesOrders', 123, 'lines', lineData);

      expect(httpService.post).toHaveBeenCalledWith(
        'https://fa-test.fa.ocs.oraclecloud.com/salesOrders/123/child/lines',
        lineData,
        expect.any(Object),
      );
    });
  });

  describe('retry logic', () => {
    it('should retry on 503 error', async () => {
      const error = new Error('Service unavailable');
      (error as any).isAxiosError = true;
      (error as any).response = { status: 503 };

      httpService.get
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(of(createAxiosResponse({ items: [] })));

      const result = await service.get(mockConfig, mockCredentials, '/test');

      expect(result.success).toBe(true);
      expect(httpService.get).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 400 error', async () => {
      const error = new Error('Bad request');
      (error as any).isAxiosError = true;
      (error as any).response = { status: 400 };

      httpService.get.mockReturnValue(throwError(() => error));

      const result = await service.get(mockConfig, mockCredentials, '/test');

      expect(result.success).toBe(false);
      expect(httpService.get).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 error (auth errors are not retryable)', async () => {
      const error = new Error('Unauthorized');
      (error as any).isAxiosError = true;
      (error as any).response = { status: 401 };

      httpService.get.mockReturnValue(throwError(() => error));

      const result = await service.get(mockConfig, mockCredentials, '/test');

      // 401 errors are not retryable, so only one attempt
      expect(result.success).toBe(false);
      expect(httpService.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('URL building', () => {
    it('should handle trailing slash in instance URL', async () => {
      const configWithSlash = {
        ...mockConfig,
        instanceUrl: 'https://fa-test.fa.ocs.oraclecloud.com/',
      };

      httpService.get.mockReturnValue(of(createAxiosResponse({ items: [] })));

      await service.get(configWithSlash, mockCredentials, '/test/path');

      expect(httpService.get).toHaveBeenCalledWith(
        'https://fa-test.fa.ocs.oraclecloud.com/test/path',
        expect.any(Object),
      );
    });

    it('should handle path without leading slash', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse({ items: [] })));

      await service.get(mockConfig, mockCredentials, 'test/path');

      expect(httpService.get).toHaveBeenCalledWith(
        'https://fa-test.fa.ocs.oraclecloud.com/test/path',
        expect.any(Object),
      );
    });
  });

  describe('headers', () => {
    it('should include REST-Framework-Version header', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse({ items: [] })));

      await service.get(mockConfig, mockCredentials, '/test');

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'REST-Framework-Version': '6',
          }),
        }),
      );
    });

    it('should include custom headers from options', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse({ items: [] })));

      await service.get(mockConfig, mockCredentials, '/test', {
        headers: { 'X-Custom-Header': 'custom-value' },
      });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        }),
      );
    });
  });
});
