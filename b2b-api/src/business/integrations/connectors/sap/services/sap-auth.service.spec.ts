import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { SapAuthService } from './sap-auth.service';
import { SapConnectionConfig, SapCredentials } from '../interfaces';

describe('SapAuthService', () => {
  let service: SapAuthService;
  let httpService: jest.Mocked<HttpService>;

  const mockBasicConfig: SapConnectionConfig = {
    baseUrl: 'https://my-sap.s4hana.ondemand.com',
    client: '100',
    authType: 'basic',
  };

  const mockOAuth2Config: SapConnectionConfig = {
    baseUrl: 'https://my-sap.s4hana.ondemand.com',
    client: '100',
    authType: 'oauth2',
  };

  const mockBasicCredentials: SapCredentials = {
    basic: {
      username: 'testuser',
      password: 'testpass',
    },
  };

  const mockOAuth2Credentials: SapCredentials = {
    oauth2: {
      tokenUrl: 'https://auth.sap.com/oauth/token',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      grantType: 'client_credentials',
      scopes: ['API_SALES_ORDER_SRV'],
    },
  };

  beforeEach(async () => {
    const mockHttpService = {
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SapAuthService, { provide: HttpService, useValue: mockHttpService }],
    }).compile();

    service = module.get<SapAuthService>(SapAuthService);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    service.clearAllTokenCache();
  });

  describe('getAuthorizationHeader', () => {
    it('should return basic auth header for basic auth type', async () => {
      const result = await service.getAuthorizationHeader(mockBasicConfig, mockBasicCredentials);

      const expectedAuth = Buffer.from('testuser:testpass').toString('base64');
      expect(result).toEqual({
        Authorization: `Basic ${expectedAuth}`,
      });
    });

    it('should return bearer auth header for oauth2 auth type', async () => {
      const mockTokenResponse: AxiosResponse = {
        data: {
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockTokenResponse));

      const result = await service.getAuthorizationHeader(mockOAuth2Config, mockOAuth2Credentials);

      expect(result).toEqual({
        Authorization: 'Bearer mock-access-token',
      });
    });

    it('should use cached token for subsequent requests', async () => {
      const mockTokenResponse: AxiosResponse = {
        data: {
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockTokenResponse));

      // First call
      await service.getAuthorizationHeader(mockOAuth2Config, mockOAuth2Credentials);
      // Second call
      await service.getAuthorizationHeader(mockOAuth2Config, mockOAuth2Credentials);

      // Should only make one HTTP call
      expect(httpService.post).toHaveBeenCalledTimes(1);
    });

    it('should throw error when basic credentials missing', async () => {
      await expect(service.getAuthorizationHeader(mockBasicConfig, {})).rejects.toThrow(
        'Basic auth credentials not provided',
      );
    });

    it('should throw error when oauth2 credentials missing', async () => {
      await expect(service.getAuthorizationHeader(mockOAuth2Config, {})).rejects.toThrow(
        'OAuth2 credentials not provided',
      );
    });

    it('should return empty header for unsupported auth type', async () => {
      const config: SapConnectionConfig = {
        baseUrl: 'https://my-sap.s4hana.ondemand.com',
        authType: 'certificate',
      };

      const result = await service.getAuthorizationHeader(config, {});
      expect(result).toEqual({});
    });
  });

  describe('refreshToken', () => {
    it('should refresh token and update cache', async () => {
      const mockRefreshResponse: AxiosResponse = {
        data: {
          access_token: 'new-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'new-refresh-token',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockRefreshResponse));

      const result = await service.refreshToken(
        mockOAuth2Config,
        mockOAuth2Credentials,
        'old-refresh-token',
      );

      expect(result.access_token).toBe('new-access-token');
      expect(result.refresh_token).toBe('new-refresh-token');
    });

    it('should throw error on refresh failure', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('Refresh failed')));

      await expect(
        service.refreshToken(mockOAuth2Config, mockOAuth2Credentials, 'old-refresh-token'),
      ).rejects.toThrow('OAuth2 token refresh failed');
    });
  });

  describe('clearTokenCache', () => {
    it('should clear cached token', async () => {
      const mockTokenResponse: AxiosResponse = {
        data: {
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockTokenResponse));

      // First call - fetch token
      await service.getAuthorizationHeader(mockOAuth2Config, mockOAuth2Credentials);

      // Clear cache
      service.clearTokenCache(mockOAuth2Config, mockOAuth2Credentials);

      // Second call - should fetch again
      await service.getAuthorizationHeader(mockOAuth2Config, mockOAuth2Credentials);

      expect(httpService.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateCredentials', () => {
    it('should validate basic auth credentials', () => {
      const result = service.validateCredentials(mockBasicConfig, mockBasicCredentials);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing basic username', () => {
      const result = service.validateCredentials(mockBasicConfig, {
        basic: { username: '', password: 'pass' },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Username is required for basic auth');
    });

    it('should fail validation for missing basic password', () => {
      const result = service.validateCredentials(mockBasicConfig, {
        basic: { username: 'user', password: '' },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required for basic auth');
    });

    it('should validate oauth2 credentials', () => {
      const result = service.validateCredentials(mockOAuth2Config, mockOAuth2Credentials);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing oauth2 tokenUrl', () => {
      const result = service.validateCredentials(mockOAuth2Config, {
        oauth2: {
          tokenUrl: '',
          clientId: 'id',
          clientSecret: 'secret',
          grantType: 'client_credentials',
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Token URL is required for OAuth2');
    });

    it('should fail validation for missing oauth2 clientId', () => {
      const result = service.validateCredentials(mockOAuth2Config, {
        oauth2: {
          tokenUrl: 'https://auth.sap.com/token',
          clientId: '',
          clientSecret: 'secret',
          grantType: 'client_credentials',
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Client ID is required for OAuth2');
    });

    it('should fail validation for missing basic credentials entirely', () => {
      const result = service.validateCredentials(mockBasicConfig, {});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Basic auth credentials are required');
    });

    it('should fail validation for missing oauth2 credentials entirely', () => {
      const result = service.validateCredentials(mockOAuth2Config, {});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OAuth2 credentials are required');
    });

    it('should validate certificate auth credentials', () => {
      const certConfig: SapConnectionConfig = {
        baseUrl: 'https://my-sap.s4hana.ondemand.com',
        authType: 'certificate',
      };

      const result = service.validateCredentials(certConfig, {
        certificate: {
          certificate: 'cert-data',
          privateKey: 'key-data',
        },
      });
      expect(result.valid).toBe(true);
    });

    it('should fail validation for missing certificate', () => {
      const certConfig: SapConnectionConfig = {
        baseUrl: 'https://my-sap.s4hana.ondemand.com',
        authType: 'certificate',
      };

      const result = service.validateCredentials(certConfig, {
        certificate: {
          certificate: '',
          privateKey: 'key-data',
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Certificate is required');
    });
  });
});
