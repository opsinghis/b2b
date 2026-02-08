import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError, AxiosHeaders } from 'axios';
import { NetSuiteRestClientService } from './netsuite-rest-client.service';
import { NetSuiteAuthService } from './netsuite-auth.service';
import { NetSuiteConnectionConfig } from '../interfaces';

describe('NetSuiteRestClientService', () => {
  let service: NetSuiteRestClientService;
  let httpService: jest.Mocked<HttpService>;
  let authService: jest.Mocked<NetSuiteAuthService>;

  const mockConfig: NetSuiteConnectionConfig = {
    accountId: '1234567',
    apiVersion: 'v1',
    timeout: 30000,
    retryAttempts: 3,
  };

  beforeEach(() => {
    httpService = {
      request: jest.fn(),
    } as unknown as jest.Mocked<HttpService>;

    authService = {
      generateAuthorizationHeader: jest.fn().mockReturnValue('OAuth mock-header'),
    } as unknown as jest.Mocked<NetSuiteAuthService>;

    service = new NetSuiteRestClientService(httpService, authService);
    service.configure(mockConfig);
  });

  describe('configure', () => {
    it('should configure the service with provided config', () => {
      service.configure(mockConfig);
      expect(service.getConfig()).toEqual(mockConfig);
    });

    it('should build base URL from account ID', () => {
      service.configure({ accountId: '1234567' });
      expect(service.getConfig()?.accountId).toBe('1234567');
    });

    it('should use custom base URL if provided', () => {
      const customConfig = {
        ...mockConfig,
        baseUrl: 'https://custom.netsuite.com',
      };
      service.configure(customConfig);
      expect(service.getConfig()?.baseUrl).toBe('https://custom.netsuite.com');
    });
  });

  describe('get', () => {
    it('should make GET request with auth header', async () => {
      const mockResponse: AxiosResponse = {
        data: { id: '123', tranId: 'SO001' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const result = await service.get('salesOrder/123');

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'OAuth mock-header',
          }),
        }),
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should add query parameters to URL', async () => {
      const mockResponse: AxiosResponse = {
        data: { items: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      httpService.request.mockReturnValue(of(mockResponse));

      await service.get('salesOrder', { status: 'open' });

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('status=open'),
        }),
      );
    });

    it('should add pagination parameters', async () => {
      const mockResponse: AxiosResponse = {
        data: { items: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      httpService.request.mockReturnValue(of(mockResponse));

      await service.get('salesOrder', undefined, { offset: 10, limit: 100 });

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(/offset=10.*limit=100|limit=100.*offset=10/),
        }),
      );
    });
  });

  describe('post', () => {
    it('should make POST request with data', async () => {
      const mockResponse: AxiosResponse = {
        data: { id: '123' },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const data = { entity: { id: '456' }, items: [] };
      const result = await service.post('salesOrder', data);

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data,
        }),
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('patch', () => {
    it('should make PATCH request with data', async () => {
      const mockResponse: AxiosResponse = {
        data: { id: '123' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const data = { memo: 'Updated' };
      const result = await service.patch('salesOrder/123', data);

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          data,
        }),
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('delete', () => {
    it('should make DELETE request', async () => {
      const mockResponse: AxiosResponse = {
        data: null,
        status: 204,
        statusText: 'No Content',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      httpService.request.mockReturnValue(of(mockResponse));

      await service.delete('salesOrder/123');

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });
  });

  describe('executeSuiteQL', () => {
    it('should execute SuiteQL query', async () => {
      const mockResponse: AxiosResponse = {
        data: { items: [{ id: '123' }], totalResults: 1 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const result = await service.executeSuiteQL('SELECT id FROM transaction');

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: { q: 'SELECT id FROM transaction' },
          headers: expect.objectContaining({
            Prefer: 'transient',
          }),
        }),
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should add pagination to SuiteQL query', async () => {
      const mockResponse: AxiosResponse = {
        data: { items: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      httpService.request.mockReturnValue(of(mockResponse));

      await service.executeSuiteQL('SELECT id FROM transaction', { offset: 0, limit: 50 });

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(/offset=0.*limit=50|limit=50.*offset=0/),
        }),
      );
    });
  });

  describe('error handling and retry', () => {
    it('should retry on 429 rate limit error', async () => {
      const rateLimitError = {
        response: { status: 429 },
        message: 'Rate limit exceeded',
        code: 'ERR_BAD_REQUEST',
      } as AxiosError;

      const mockResponse: AxiosResponse = {
        data: { id: '123' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      httpService.request
        .mockReturnValueOnce(throwError(() => rateLimitError))
        .mockReturnValueOnce(of(mockResponse));

      const result = await service.get('salesOrder/123');

      expect(httpService.request).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResponse.data);
    });

    it('should retry on 500 server error', async () => {
      const serverError = {
        response: { status: 500 },
        message: 'Server error',
      } as AxiosError;

      const mockResponse: AxiosResponse = {
        data: { id: '123' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      httpService.request
        .mockReturnValueOnce(throwError(() => serverError))
        .mockReturnValueOnce(of(mockResponse));

      const result = await service.get('salesOrder/123');

      expect(httpService.request).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResponse.data);
    });

    it('should not retry on 400 client error', async () => {
      const clientError = {
        response: {
          status: 400,
          data: { 'o:errorCode': 'INVALID_FLD_VALUE', title: 'Invalid field' },
        },
        message: 'Invalid field',
      } as AxiosError;

      httpService.request.mockReturnValue(throwError(() => clientError));

      await expect(service.get('salesOrder/123')).rejects.toThrow();
      expect(httpService.request).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retry attempts', async () => {
      const serverError = {
        response: { status: 500 },
        message: 'Server error',
      } as AxiosError;

      httpService.request.mockReturnValue(throwError(() => serverError));

      await expect(service.get('salesOrder/123')).rejects.toThrow();
      expect(httpService.request).toHaveBeenCalledTimes(3); // Original + 2 retries
    });
  });

  describe('testConnection', () => {
    it('should return success on valid connection', async () => {
      const mockResponse: AxiosResponse = {
        data: { items: [{ test: 1 }] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return failure on connection error', async () => {
      const error = {
        response: { status: 401 },
        message: 'Unauthorized',
      } as AxiosError;

      httpService.request.mockReturnValue(throwError(() => error));

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });
});
