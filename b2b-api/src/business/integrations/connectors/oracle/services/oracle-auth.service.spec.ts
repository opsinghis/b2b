import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { OracleAuthService } from './oracle-auth.service';
import { OracleConnectionConfig, OracleCredentials } from '../interfaces';

describe('OracleAuthService', () => {
  let service: OracleAuthService;
  let httpService: jest.Mocked<HttpService>;

  const mockOAuth2Config: OracleConnectionConfig = {
    instanceUrl: 'https://fa-test.fa.ocs.oraclecloud.com',
    authType: 'oauth2',
  };

  const mockBasicConfig: OracleConnectionConfig = {
    instanceUrl: 'https://fa-test.fa.ocs.oraclecloud.com',
    authType: 'basic_auth',
  };

  const mockOAuth2Credentials: OracleCredentials = {
    oauth2: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tokenEndpoint: 'https://idcs-test.identity.oraclecloud.com/oauth2/v1/token',
      scopes: ['urn:opc:resource:consumer::all'],
    },
  };

  const mockBasicCredentials: OracleCredentials = {
    basicAuth: {
      username: 'test-user',
      password: 'test-password',
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
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OracleAuthService, { provide: HttpService, useValue: mockHttpService }],
    }).compile();

    service = module.get<OracleAuthService>(OracleAuthService);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    service.clearAllTokens();
  });

  describe('getAuthorizationHeader', () => {
    it('should fetch and return OAuth2 authorization header', async () => {
      const mockTokenResponse = {
        access_token: 'test-oauth2-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      httpService.post.mockReturnValue(of(createAxiosResponse(mockTokenResponse)));

      const result = await service.getAuthorizationHeader(mockOAuth2Config, mockOAuth2Credentials);

      expect(result).toBe('Bearer test-oauth2-token');
      expect(httpService.post).toHaveBeenCalledWith(
        mockOAuth2Credentials.oauth2!.tokenEndpoint,
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        }),
      );
    });

    it('should return basic auth header', async () => {
      const result = await service.getAuthorizationHeader(mockBasicConfig, mockBasicCredentials);

      const expectedHeader = `Basic ${Buffer.from('test-user:test-password').toString('base64')}`;
      expect(result).toBe(expectedHeader);
    });

    it('should use cached OAuth2 token on subsequent calls', async () => {
      const mockTokenResponse = {
        access_token: 'cached-oauth2-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      httpService.post.mockReturnValue(of(createAxiosResponse(mockTokenResponse)));

      // First call
      await service.getAuthorizationHeader(mockOAuth2Config, mockOAuth2Credentials);
      // Second call should use cache
      const result = await service.getAuthorizationHeader(mockOAuth2Config, mockOAuth2Credentials);

      expect(result).toBe('Bearer cached-oauth2-token');
      expect(httpService.post).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid configuration', async () => {
      await expect(service.getAuthorizationHeader(mockOAuth2Config, {})).rejects.toThrow(
        'Invalid authentication configuration',
      );
    });

    it('should handle token fetch failure', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('Network error')));

      await expect(
        service.getAuthorizationHeader(mockOAuth2Config, mockOAuth2Credentials),
      ).rejects.toThrow('OAuth2 token request failed');
    });
  });

  describe('validateCredentials', () => {
    it('should return valid for correct OAuth2 credentials', () => {
      const result = service.validateCredentials(mockOAuth2Config, mockOAuth2Credentials);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for correct basic auth credentials', () => {
      const result = service.validateCredentials(mockBasicConfig, mockBasicCredentials);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing instance URL', () => {
      const result = service.validateCredentials(
        { ...mockOAuth2Config, instanceUrl: '' },
        mockOAuth2Credentials,
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Instance URL is required');
    });

    it('should return errors for invalid instance URL', () => {
      const result = service.validateCredentials(
        { ...mockOAuth2Config, instanceUrl: 'not-a-url' },
        mockOAuth2Credentials,
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Instance URL is not a valid URL');
    });

    it('should return errors for missing OAuth2 credentials', () => {
      const result = service.validateCredentials(mockOAuth2Config, {});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OAuth2 credentials are required for oauth2 auth type');
    });

    it('should return errors for missing OAuth2 client ID', () => {
      const result = service.validateCredentials(mockOAuth2Config, {
        oauth2: {
          clientId: '',
          clientSecret: 'secret',
          tokenEndpoint: 'https://example.com/token',
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OAuth2 client ID is required');
    });

    it('should return errors for missing OAuth2 client secret', () => {
      const result = service.validateCredentials(mockOAuth2Config, {
        oauth2: {
          clientId: 'id',
          clientSecret: '',
          tokenEndpoint: 'https://example.com/token',
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OAuth2 client secret is required');
    });

    it('should return errors for missing OAuth2 token endpoint', () => {
      const result = service.validateCredentials(mockOAuth2Config, {
        oauth2: {
          clientId: 'id',
          clientSecret: 'secret',
          tokenEndpoint: '',
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OAuth2 token endpoint is required');
    });

    it('should return errors for invalid OAuth2 token endpoint URL', () => {
      const result = service.validateCredentials(mockOAuth2Config, {
        oauth2: {
          clientId: 'id',
          clientSecret: 'secret',
          tokenEndpoint: 'not-a-url',
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OAuth2 token endpoint is not a valid URL');
    });

    it('should return errors for missing basic auth credentials', () => {
      const result = service.validateCredentials(mockBasicConfig, {});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Basic auth credentials are required for basic_auth auth type',
      );
    });

    it('should return errors for missing basic auth username', () => {
      const result = service.validateCredentials(mockBasicConfig, {
        basicAuth: {
          username: '',
          password: 'password',
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Username is required for basic auth');
    });

    it('should return errors for missing basic auth password', () => {
      const result = service.validateCredentials(mockBasicConfig, {
        basicAuth: {
          username: 'user',
          password: '',
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required for basic auth');
    });
  });

  describe('invalidateToken', () => {
    it('should invalidate cached token', async () => {
      const mockTokenResponse = {
        access_token: 'token-to-invalidate',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      httpService.post.mockReturnValue(of(createAxiosResponse(mockTokenResponse)));

      // Populate cache
      await service.getAuthorizationHeader(mockOAuth2Config, mockOAuth2Credentials);

      // Invalidate
      service.invalidateToken(mockOAuth2Config.instanceUrl, mockOAuth2Credentials.oauth2!.clientId);

      // Should fetch new token
      await service.getAuthorizationHeader(mockOAuth2Config, mockOAuth2Credentials);

      expect(httpService.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTokenInfo', () => {
    it('should return cached token info', async () => {
      const mockTokenResponse = {
        access_token: 'info-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      httpService.post.mockReturnValue(of(createAxiosResponse(mockTokenResponse)));

      await service.getAuthorizationHeader(mockOAuth2Config, mockOAuth2Credentials);

      const info = service.getTokenInfo(
        mockOAuth2Config.instanceUrl,
        mockOAuth2Credentials.oauth2!.clientId,
      );

      expect(info).toBeDefined();
      expect(info?.cached).toBe(true);
      expect(info?.expiresAt).toBeInstanceOf(Date);
      expect(info?.remainingMs).toBeGreaterThan(0);
    });

    it('should return not cached for unknown token', () => {
      const info = service.getTokenInfo('https://unknown.com', 'unknown-client');

      expect(info?.cached).toBe(false);
    });
  });

  describe('testAuthentication', () => {
    it('should return success for valid authentication', async () => {
      const mockTokenResponse = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      httpService.post.mockReturnValue(of(createAxiosResponse(mockTokenResponse)));
      httpService.get.mockReturnValue(of(createAxiosResponse({ items: [] })));

      const result = await service.testAuthentication(mockOAuth2Config, mockOAuth2Credentials);

      expect(result.success).toBe(true);
    });

    it('should return failure for authentication error', async () => {
      const mockTokenResponse = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      httpService.post.mockReturnValue(of(createAxiosResponse(mockTokenResponse)));
      httpService.get.mockReturnValue(throwError(() => new Error('Unauthorized')));

      const result = await service.testAuthentication(mockOAuth2Config, mockOAuth2Credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
