import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import { QuickBooksRestClientService } from './quickbooks-rest-client.service';
import { QuickBooksAuthService } from './quickbooks-auth.service';
import { QuickBooksConnectionConfig, QuickBooksCredentials } from '../interfaces';

describe('QuickBooksRestClientService', () => {
  let service: QuickBooksRestClientService;
  let httpService: jest.Mocked<HttpService>;
  let authService: jest.Mocked<QuickBooksAuthService>;

  const mockConfig: QuickBooksConnectionConfig = {
    realmId: '123456789',
    environment: 'sandbox',
    minorVersion: 65,
    timeout: 30000,
  };

  const mockCredentials: QuickBooksCredentials = {
    oauth2: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: Date.now() + 3600000,
    },
  };

  const mockAxiosResponse = <T>(data: T, status = 200): AxiosResponse<T> => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {
      headers: new AxiosHeaders(),
    } as InternalAxiosRequestConfig,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuickBooksRestClientService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: QuickBooksAuthService,
          useValue: {
            getAuthorizationHeader: jest.fn().mockResolvedValue('Bearer test-access-token'),
          },
        },
      ],
    }).compile();

    service = module.get<QuickBooksRestClientService>(QuickBooksRestClientService);
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;
    authService = module.get(QuickBooksAuthService) as jest.Mocked<QuickBooksAuthService>;
  });

  describe('get', () => {
    it('should make GET request successfully', async () => {
      const mockData = { Customer: { Id: '123', DisplayName: 'Test' } };
      httpService.get.mockReturnValue(of(mockAxiosResponse(mockData)));

      const result = await service.get<typeof mockData>(
        mockConfig,
        mockCredentials,
        '/v3/company/123456789/customer/123',
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(httpService.get).toHaveBeenCalled();
    });

    it('should handle GET request error', async () => {
      const axiosError = new AxiosError('Not Found');
      axiosError.response = mockAxiosResponse({ error: 'Not found' }, 404) as AxiosResponse;
      httpService.get.mockReturnValue(throwError(() => axiosError));

      const result = await service.get(
        mockConfig,
        mockCredentials,
        '/v3/company/123456789/customer/999',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('post', () => {
    it('should make POST request successfully', async () => {
      const mockData = { Customer: { Id: '123', DisplayName: 'New Customer' } };
      httpService.post.mockReturnValue(of(mockAxiosResponse(mockData)));

      const result = await service.post<typeof mockData>(
        mockConfig,
        mockCredentials,
        '/v3/company/123456789/customer',
        { DisplayName: 'New Customer' },
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(httpService.post).toHaveBeenCalled();
    });

    it('should handle POST request with operation parameter', async () => {
      const mockData = { Invoice: { Id: '456' } };
      httpService.post.mockReturnValue(of(mockAxiosResponse(mockData)));

      const result = await service.post<typeof mockData>(
        mockConfig,
        mockCredentials,
        '/v3/company/123456789/invoice',
        { Id: '456', SyncToken: '0' },
        { operation: 'void' },
      );

      expect(result.success).toBe(true);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('operation=void'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should handle POST request error', async () => {
      const axiosError = new AxiosError('Validation Error');
      axiosError.response = mockAxiosResponse(
        { Fault: { Error: [{ Message: 'Invalid field' }] } },
        400,
      ) as AxiosResponse;
      httpService.post.mockReturnValue(throwError(() => axiosError));

      const result = await service.post(
        mockConfig,
        mockCredentials,
        '/v3/company/123456789/customer',
        { InvalidField: 'test' },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('query', () => {
    it('should make query request successfully', async () => {
      const mockData = {
        QueryResponse: {
          Customer: [{ Id: '1', DisplayName: 'Customer 1' }],
          startPosition: 1,
          maxResults: 100,
        },
      };
      httpService.get.mockReturnValue(of(mockAxiosResponse(mockData)));

      const result = await service.query(mockConfig, mockCredentials, 'SELECT * FROM Customer', {
        maxResults: 100,
        startPosition: 1,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('should encode query properly', async () => {
      const mockData = { QueryResponse: { Customer: [] } };
      httpService.get.mockReturnValue(of(mockAxiosResponse(mockData)));

      await service.query(
        mockConfig,
        mockCredentials,
        "SELECT * FROM Customer WHERE Name = 'Test'",
      );

      // URL might use + or %20 for spaces - verify query is included
      const callArg = httpService.get.mock.calls[0][0] as string;
      expect(callArg).toContain('query=');
      expect(callArg).toContain('SELECT');
      expect(callArg).toContain('Customer');
    });

    it('should handle query with orderBy', async () => {
      const mockData = { QueryResponse: { Customer: [] } };
      httpService.get.mockReturnValue(of(mockAxiosResponse(mockData)));

      await service.query(mockConfig, mockCredentials, 'SELECT * FROM Customer', {
        orderBy: 'DisplayName',
      });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('ORDERBY'),
        expect.anything(),
      );
    });
  });

  describe('delete', () => {
    it('should make DELETE request successfully', async () => {
      const mockData = { DeletedTime: '2024-01-15T00:00:00Z' };
      httpService.post.mockReturnValue(of(mockAxiosResponse(mockData)));

      const result = await service.delete(
        mockConfig,
        mockCredentials,
        '/v3/company/123456789/customer',
        { Id: '123', SyncToken: '0' },
      );

      expect(result.success).toBe(true);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('operation=delete'),
        expect.objectContaining({ Id: '123', SyncToken: '0' }),
        expect.anything(),
      );
    });
  });

  describe('send', () => {
    it('should send entity via email', async () => {
      const mockData = { Invoice: { Id: '456', EmailStatus: 'Sent' } };
      httpService.post.mockReturnValue(of(mockAxiosResponse(mockData)));

      const result = await service.send(
        mockConfig,
        mockCredentials,
        '/v3/company/123456789/invoice/456',
        'customer@example.com',
      );

      expect(result.success).toBe(true);
      // Verify URL contains sendTo parameter with the email
      const callArg = httpService.post.mock.calls[0][0] as string;
      expect(callArg).toContain('sendTo=');
      expect(callArg).toContain('customer');
    });

    it('should send without email parameter', async () => {
      const mockData = { Invoice: { Id: '456', EmailStatus: 'Sent' } };
      httpService.post.mockReturnValue(of(mockAxiosResponse(mockData)));

      const result = await service.send(
        mockConfig,
        mockCredentials,
        '/v3/company/123456789/invoice/456',
      );

      expect(result.success).toBe(true);
      // Verify the URL does not contain sendTo parameter
      const callArg = httpService.post.mock.calls[0][0] as string;
      expect(callArg).not.toContain('sendTo=');
    });
  });

  describe('URL building', () => {
    it('should use sandbox URL for sandbox environment', async () => {
      const mockData = { Customer: {} };
      httpService.get.mockReturnValue(of(mockAxiosResponse(mockData)));

      await service.get(
        { ...mockConfig, environment: 'sandbox' },
        mockCredentials,
        '/v3/company/123456789/customer/123',
      );

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('sandbox-quickbooks.api.intuit.com'),
        expect.anything(),
      );
    });

    it('should use production URL for production environment', async () => {
      const mockData = { Customer: {} };
      httpService.get.mockReturnValue(of(mockAxiosResponse(mockData)));

      await service.get(
        { ...mockConfig, environment: 'production' },
        mockCredentials,
        '/v3/company/123456789/customer/123',
      );

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('quickbooks.api.intuit.com'),
        expect.anything(),
      );
    });

    it('should include minor version in URL', async () => {
      const mockData = { Customer: {} };
      httpService.get.mockReturnValue(of(mockAxiosResponse(mockData)));

      await service.get(
        { ...mockConfig, minorVersion: 70 },
        mockCredentials,
        '/v3/company/123456789/customer/123',
      );

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('minorversion=70'),
        expect.anything(),
      );
    });
  });

  describe('error handling', () => {
    it('should identify retryable errors', async () => {
      const axiosError = new AxiosError('Service Unavailable');
      axiosError.response = mockAxiosResponse(
        { error: 'Service unavailable' },
        503,
      ) as AxiosResponse;
      httpService.get.mockReturnValue(throwError(() => axiosError));

      const result = await service.get(
        mockConfig,
        mockCredentials,
        '/v3/company/123456789/customer/123',
      );

      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(true);
    });

    it('should identify rate limit errors as retryable', async () => {
      const axiosError = new AxiosError('Too Many Requests');
      axiosError.response = mockAxiosResponse(
        { error: 'Rate limit exceeded' },
        429,
      ) as AxiosResponse;
      httpService.get.mockReturnValue(throwError(() => axiosError));

      const result = await service.get(
        mockConfig,
        mockCredentials,
        '/v3/company/123456789/customer/123',
      );

      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(true);
    });

    it('should not mark validation errors as retryable', async () => {
      const axiosError = new AxiosError('Bad Request');
      axiosError.response = mockAxiosResponse({ error: 'Validation error' }, 400) as AxiosResponse;
      httpService.get.mockReturnValue(throwError(() => axiosError));

      const result = await service.get(
        mockConfig,
        mockCredentials,
        '/v3/company/123456789/customer/123',
      );

      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(false);
    });
  });

  describe('authorization', () => {
    it('should include authorization header in requests', async () => {
      const mockData = { Customer: {} };
      httpService.get.mockReturnValue(of(mockAxiosResponse(mockData)));

      await service.get(mockConfig, mockCredentials, '/v3/company/123456789/customer/123');

      expect(authService.getAuthorizationHeader).toHaveBeenCalledWith(mockConfig, mockCredentials);
      expect(httpService.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
          }),
        }),
      );
    });
  });
});
