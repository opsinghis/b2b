import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { DynamicsAuthService } from './dynamics-auth.service';
import { DynamicsConnectionConfig, DynamicsCredentials } from '../interfaces';

describe('DynamicsAuthService', () => {
  let service: DynamicsAuthService;
  let httpService: jest.Mocked<HttpService>;

  const mockConfig: DynamicsConnectionConfig = {
    organizationUrl: 'https://org.crm.dynamics.com',
    tenantId: 'tenant-123',
    authType: 'client_credentials',
  };

  const mockCredentials: DynamicsCredentials = {
    clientCredentials: {
      clientId: 'client-id',
      clientSecret: 'client-secret',
    },
  };

  const createAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} } as InternalAxiosRequestConfig,
  });

  beforeEach(async () => {
    const mockHttpService = {
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DynamicsAuthService, { provide: HttpService, useValue: mockHttpService }],
    }).compile();

    service = module.get<DynamicsAuthService>(DynamicsAuthService);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    service.clearAllTokenCache();
  });

  describe('getAuthorizationHeader', () => {
    it('should fetch and return authorization header with client credentials', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      httpService.post.mockReturnValue(of(createAxiosResponse(mockTokenResponse)));

      const result = await service.getAuthorizationHeader(mockConfig, mockCredentials);

      expect(result).toEqual({
        Authorization: 'Bearer test-access-token',
      });
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('login.microsoftonline.com'),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should use cached token on subsequent calls', async () => {
      const mockTokenResponse = {
        access_token: 'cached-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      httpService.post.mockReturnValue(of(createAxiosResponse(mockTokenResponse)));

      // First call
      await service.getAuthorizationHeader(mockConfig, mockCredentials);
      // Second call should use cache
      const result = await service.getAuthorizationHeader(mockConfig, mockCredentials);

      expect(result).toEqual({
        Authorization: 'Bearer cached-token',
      });
      // Should only call HTTP once due to caching
      expect(httpService.post).toHaveBeenCalledTimes(1);
    });

    it('should throw error when credentials are missing', async () => {
      await expect(service.getAuthorizationHeader(mockConfig, {})).rejects.toThrow(
        'Client credentials not provided',
      );
    });

    it('should handle token fetch failure', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('Network error')));

      await expect(service.getAuthorizationHeader(mockConfig, mockCredentials)).rejects.toThrow(
        'Azure AD authentication failed',
      );
    });
  });

  describe('validateCredentials', () => {
    it('should return valid for correct client credentials', () => {
      const result = service.validateCredentials(mockConfig, mockCredentials);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing organization URL', () => {
      const result = service.validateCredentials(
        { ...mockConfig, organizationUrl: '' },
        mockCredentials,
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Organization URL is required');
    });

    it('should return errors for missing tenant ID', () => {
      const result = service.validateCredentials({ ...mockConfig, tenantId: '' }, mockCredentials);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Azure AD tenant ID is required');
    });

    it('should return errors for missing client credentials', () => {
      const result = service.validateCredentials(mockConfig, {});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Client credentials are required');
    });

    it('should return errors for missing client ID', () => {
      const result = service.validateCredentials(mockConfig, {
        clientCredentials: {
          clientId: '',
          clientSecret: 'secret',
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Client ID is required');
    });

    it('should return errors for missing client secret', () => {
      const result = service.validateCredentials(mockConfig, {
        clientCredentials: {
          clientId: 'id',
          clientSecret: '',
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Client Secret is required');
    });

    it('should validate on-behalf-of credentials', () => {
      const oboConfig: DynamicsConnectionConfig = {
        ...mockConfig,
        authType: 'on_behalf_of',
      };

      const result = service.validateCredentials(oboConfig, {
        onBehalfOf: {
          clientId: 'id',
          clientSecret: 'secret',
          userAssertion: '',
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('User assertion token is required');
    });
  });

  describe('clearTokenCache', () => {
    it('should clear cached token for specific config', async () => {
      const mockTokenResponse = {
        access_token: 'token-to-clear',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      httpService.post.mockReturnValue(of(createAxiosResponse(mockTokenResponse)));

      // Populate cache
      await service.getAuthorizationHeader(mockConfig, mockCredentials);

      // Clear cache
      service.clearTokenCache(mockConfig, mockCredentials);

      // Should fetch new token
      await service.getAuthorizationHeader(mockConfig, mockCredentials);

      expect(httpService.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTokenUrl', () => {
    it('should return correct token URL for tenant', () => {
      const url = service.getTokenUrl('my-tenant-id');

      expect(url).toBe('https://login.microsoftonline.com/my-tenant-id/oauth2/v2.0/token');
    });
  });
});
