import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { DynamicsWebApiClientService } from './dynamics-webapi-client.service';
import { DynamicsAuthService } from './dynamics-auth.service';
import { DynamicsConnectionConfig, DynamicsCredentials } from '../interfaces';

describe('DynamicsWebApiClientService', () => {
  let service: DynamicsWebApiClientService;
  let httpService: jest.Mocked<HttpService>;
  let authService: jest.Mocked<DynamicsAuthService>;

  const mockConfig: DynamicsConnectionConfig = {
    organizationUrl: 'https://org.crm.dynamics.com',
    tenantId: 'tenant-123',
    authType: 'client_credentials',
    apiVersion: 'v9.2',
  };

  const mockCredentials: DynamicsCredentials = {
    clientCredentials: {
      clientId: 'client-id',
      clientSecret: 'client-secret',
    },
  };

  const createAxiosResponse = <T>(data: T, headers?: Record<string, string>): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: headers || {},
    config: { headers: {} } as InternalAxiosRequestConfig,
  });

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };

    const mockAuthService = {
      getAuthorizationHeader: jest.fn().mockResolvedValue({ Authorization: 'Bearer test-token' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamicsWebApiClientService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: DynamicsAuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<DynamicsWebApiClientService>(DynamicsWebApiClientService);
    httpService = module.get(HttpService);
    authService = module.get(DynamicsAuthService);
  });

  describe('get', () => {
    it('should execute GET request for entity collection', async () => {
      const mockData = {
        value: [{ accountid: 'acc-1', name: 'Test Account' }],
        '@odata.count': 1,
      };

      httpService.get.mockReturnValue(of(createAxiosResponse(mockData)));

      const result = await service.get(mockConfig, mockCredentials, 'accounts');

      expect(result.success).toBe(true);
      expect(result.data?.value).toHaveLength(1);
      expect(result.data?.metadata?.['@odata.count']).toBe(1);
    });

    it('should apply query options', async () => {
      const mockData = { value: [], '@odata.count': 0 };
      httpService.get.mockReturnValue(of(createAxiosResponse(mockData)));

      await service.get(mockConfig, mockCredentials, 'accounts', {
        $filter: "name eq 'Test'",
        $select: ['accountid', 'name'],
        $top: 10,
        $skip: 5,
        $orderby: 'name asc',
        $count: true,
      });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('%24filter='),
        expect.any(Object),
      );
      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('%24select='),
        expect.any(Object),
      );
    });

    it('should handle error responses', async () => {
      const axiosError: AxiosError = {
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Request failed',
        config: {} as InternalAxiosRequestConfig,
        toJSON: () => ({}),
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {
            error: {
              code: 'ObjectNotFound',
              message: 'Entity not found',
            },
          },
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
      };

      httpService.get.mockReturnValue(throwError(() => axiosError));

      const result = await service.get(mockConfig, mockCredentials, 'accounts');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getByKey', () => {
    it('should execute GET by key successfully', async () => {
      const mockData = { accountid: 'acc-123', name: 'Test Account' };
      httpService.get.mockReturnValue(of(createAxiosResponse(mockData, { etag: 'W/"12345"' })));

      const result = await service.getByKey(mockConfig, mockCredentials, 'accounts', 'acc-123');

      expect(result.success).toBe(true);
      expect((result.data as { accountid: string })?.accountid).toBe('acc-123');
      expect(result.metadata?.etag).toBe('W/"12345"');
    });

    it('should apply $select and $expand options', async () => {
      const mockData = { accountid: 'acc-123' };
      httpService.get.mockReturnValue(of(createAxiosResponse(mockData)));

      await service.getByKey(mockConfig, mockCredentials, 'accounts', 'acc-123', {
        $select: ['accountid', 'name'],
        $expand: ['primarycontactid'],
      });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('%24select='),
        expect.any(Object),
      );
    });
  });

  describe('post', () => {
    it('should execute POST request to create entity', async () => {
      const mockData = { accountid: 'new-acc', name: 'New Account' };
      httpService.post.mockReturnValue(of(createAxiosResponse(mockData)));

      const result = await service.post(mockConfig, mockCredentials, 'accounts', {
        name: 'New Account',
      });

      expect(result.success).toBe(true);
      expect((result.data as { name: string })?.name).toBe('New Account');
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/accounts'),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Prefer: 'return=representation',
          }),
        }),
      );
    });
  });

  describe('patch', () => {
    it('should execute PATCH request to update entity', async () => {
      const mockData = { accountid: 'acc-123', name: 'Updated Account' };
      httpService.patch.mockReturnValue(of(createAxiosResponse(mockData)));

      const result = await service.patch(mockConfig, mockCredentials, 'accounts', 'acc-123', {
        name: 'Updated Account',
      });

      expect(result.success).toBe(true);
      expect((result.data as { name: string })?.name).toBe('Updated Account');
    });

    it('should include If-Match header for optimistic concurrency', async () => {
      httpService.patch.mockReturnValue(of(createAxiosResponse({})));

      await service.patch(
        mockConfig,
        mockCredentials,
        'accounts',
        'acc-123',
        { name: 'Test' },
        'W/"etag123"',
      );

      expect(httpService.patch).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'If-Match': 'W/"etag123"',
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should execute DELETE request', async () => {
      httpService.delete.mockReturnValue(of(createAxiosResponse(null)));

      const result = await service.delete(mockConfig, mockCredentials, 'accounts', 'acc-123');

      expect(result.success).toBe(true);
      expect(httpService.delete).toHaveBeenCalledWith(
        expect.stringContaining('/accounts(acc-123)'),
        expect.any(Object),
      );
    });
  });

  describe('executeFunction', () => {
    it('should execute unbound function', async () => {
      const mockData = { UserId: 'user-123', BusinessUnitId: 'bu-123' };
      httpService.get.mockReturnValue(of(createAxiosResponse(mockData)));

      const result = await service.executeFunction(mockConfig, mockCredentials, 'WhoAmI');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/WhoAmI()'),
        expect.any(Object),
      );
    });

    it('should execute function with parameters', async () => {
      const mockData = { result: 'success' };
      httpService.get.mockReturnValue(of(createAxiosResponse(mockData)));

      await service.executeFunction(mockConfig, mockCredentials, 'TestFunction', {
        param1: 'value1',
        param2: 123,
      });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining("param1='value1'"),
        expect.any(Object),
      );
    });
  });

  describe('header building', () => {
    it('should include OData version headers', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse({ value: [] })));

      await service.get(mockConfig, mockCredentials, 'accounts');

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
          }),
        }),
      );
    });

    it('should include authorization header from auth service', async () => {
      httpService.get.mockReturnValue(of(createAxiosResponse({ value: [] })));

      await service.get(mockConfig, mockCredentials, 'accounts');

      expect(authService.getAuthorizationHeader).toHaveBeenCalled();
      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });
  });
});
