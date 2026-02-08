import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { SapODataClientService } from './sap-odata-client.service';
import { SapAuthService } from './sap-auth.service';
import { SapConnectionConfig, SapCredentials, SapODataQueryOptions } from '../interfaces';

describe('SapODataClientService', () => {
  let service: SapODataClientService;
  let httpService: jest.Mocked<HttpService>;
  let authService: jest.Mocked<SapAuthService>;

  const mockConfig: SapConnectionConfig = {
    baseUrl: 'https://my-sap.s4hana.ondemand.com',
    client: '100',
    authType: 'oauth2',
    timeout: 30000,
  };

  const mockCredentials: SapCredentials = {
    oauth2: {
      tokenUrl: 'https://auth.sap.com/oauth/token',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      grantType: 'client_credentials',
    },
  };

  const createAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: { etag: 'W/"abc123"' },
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
      getAuthorizationHeader: jest.fn().mockResolvedValue({ Authorization: 'Bearer token' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SapODataClientService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: SapAuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<SapODataClientService>(SapODataClientService);
    httpService = module.get(HttpService);
    authService = module.get(SapAuthService);
  });

  describe('get', () => {
    it('should execute GET request successfully', async () => {
      const mockData = {
        value: [{ SalesOrder: '1234567890' }],
        '@odata.count': 1,
      };

      httpService.get.mockReturnValue(of(createAxiosResponse(mockData)));

      const result = await service.get(
        mockConfig,
        mockCredentials,
        '/sap/opu/odata/sap/API_SALES_ORDER_SRV',
        'A_SalesOrder',
      );

      expect(result.success).toBe(true);
      expect(result.data?.value).toEqual([{ SalesOrder: '1234567890' }]);
      expect(result.metadata?.sapEtag).toBe('W/"abc123"');
    });

    it('should apply query options', async () => {
      const mockData = { value: [], '@odata.count': 0 };
      httpService.get.mockReturnValue(of(createAxiosResponse(mockData)));

      const queryOptions: SapODataQueryOptions = {
        $filter: "SoldToParty eq 'CUST001'",
        $select: ['SalesOrder', 'SoldToParty'],
        $expand: ['to_Item'],
        $top: 10,
        $skip: 5,
        $orderby: 'CreationDate desc',
        $count: true,
      };

      await service.get(
        mockConfig,
        mockCredentials,
        '/sap/opu/odata/sap/API_SALES_ORDER_SRV',
        'A_SalesOrder',
        queryOptions,
      );

      // Check that filter was included (URL encoding: $ -> %24, ' -> %27, space -> +)
      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringMatching(/%24filter=.*SoldToParty.*CUST001/),
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
              code: 'NOT_FOUND',
              message: { value: 'Entity not found' },
            },
          },
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
      };

      httpService.get.mockReturnValue(throwError(() => axiosError));

      const result = await service.get(
        mockConfig,
        mockCredentials,
        '/sap/opu/odata/sap/API_SALES_ORDER_SRV',
        'A_SalesOrder',
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      httpService.get.mockReturnValue(throwError(() => networkError));

      const result = await service.get(
        mockConfig,
        mockCredentials,
        '/sap/opu/odata/sap/API_SALES_ORDER_SRV',
        'A_SalesOrder',
      );

      expect(result.success).toBe(false);
      // Error handling returns a generic SAP_ERROR code
      expect(result.error).toBeDefined();
    });
  });

  describe('getByKey', () => {
    it('should execute GET by key successfully', async () => {
      const mockData = { SalesOrder: '1234567890', SoldToParty: 'CUST001' };
      httpService.get.mockReturnValue(of(createAxiosResponse(mockData)));

      const result = await service.getByKey(
        mockConfig,
        mockCredentials,
        '/sap/opu/odata/sap/API_SALES_ORDER_SRV',
        'A_SalesOrder',
        '1234567890',
      );

      expect(result.success).toBe(true);
      expect((result.data as { SalesOrder: string })?.SalesOrder).toBe('1234567890');
    });

    it('should handle compound keys', async () => {
      const mockData = { Product: 'MAT001', Plant: '1000' };
      httpService.get.mockReturnValue(of(createAxiosResponse(mockData)));

      await service.getByKey(
        mockConfig,
        mockCredentials,
        '/sap/opu/odata/sap/API_PRODUCT_SRV',
        'A_ProductPlant',
        { Product: 'MAT001', Plant: '1000' },
      );

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining("Product='MAT001',Plant='1000'"),
        expect.any(Object),
      );
    });

    it('should apply $select and $expand', async () => {
      const mockData = { SalesOrder: '1234567890' };
      httpService.get.mockReturnValue(of(createAxiosResponse(mockData)));

      await service.getByKey(
        mockConfig,
        mockCredentials,
        '/sap/opu/odata/sap/API_SALES_ORDER_SRV',
        'A_SalesOrder',
        '1234567890',
        { $select: ['SalesOrder'], $expand: ['to_Item'] },
      );

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringMatching(/%24select=.*SalesOrder/),
        expect.any(Object),
      );
    });
  });

  // Note: POST, PATCH, DELETE, and BATCH operations require CSRF token fetching
  // which involves complex internal HTTP interactions that are better tested
  // via integration tests or through the higher-level service tests.

  describe('header building', () => {
    it('should include SAP client header', async () => {
      const mockData = { value: [] };
      httpService.get.mockReturnValue(of(createAxiosResponse(mockData)));

      await service.get(
        mockConfig,
        mockCredentials,
        '/sap/opu/odata/sap/API_SALES_ORDER_SRV',
        'A_SalesOrder',
      );

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'sap-client': '100',
          }),
        }),
      );
    });

    it('should include language header when configured', async () => {
      const configWithLanguage = { ...mockConfig, language: 'DE' };
      const mockData = { value: [] };
      httpService.get.mockReturnValue(of(createAxiosResponse(mockData)));

      await service.get(
        configWithLanguage,
        mockCredentials,
        '/sap/opu/odata/sap/API_SALES_ORDER_SRV',
        'A_SalesOrder',
      );

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'sap-language': 'DE',
          }),
        }),
      );
    });
  });
});
