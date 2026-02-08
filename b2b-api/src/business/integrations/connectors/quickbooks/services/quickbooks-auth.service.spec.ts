import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import { QuickBooksAuthService } from './quickbooks-auth.service';
import { QuickBooksConnectionConfig, QuickBooksCredentials } from '../interfaces';

describe('QuickBooksAuthService', () => {
  let service: QuickBooksAuthService;
  let httpService: jest.Mocked<HttpService>;

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
      expiresAt: Date.now() + 3600000, // 1 hour from now
    },
  };

  const mockAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {
      headers: new AxiosHeaders(),
    } as InternalAxiosRequestConfig,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuickBooksAuthService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuickBooksAuthService>(QuickBooksAuthService);
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;
  });

  afterEach(() => {
    service.clearAllTokens();
    jest.clearAllMocks();
  });

  describe('validateCredentials', () => {
    it('should return valid for correct credentials', () => {
      const result = service.validateCredentials(mockConfig, mockCredentials);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for missing realmId', () => {
      const config = { ...mockConfig, realmId: '' };
      const result = service.validateCredentials(config, mockCredentials);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Realm ID (Company ID) is required');
    });

    it('should return invalid for invalid environment', () => {
      const config = { ...mockConfig, environment: 'invalid' as 'sandbox' | 'production' };
      const result = service.validateCredentials(config, mockCredentials);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Environment must be sandbox or production');
    });

    it('should return invalid for missing OAuth2 credentials', () => {
      const credentials = { oauth2: undefined } as unknown as QuickBooksCredentials;
      const result = service.validateCredentials(mockConfig, credentials);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OAuth2 credentials are required');
    });

    it('should return invalid for missing clientId', () => {
      const credentials: QuickBooksCredentials = {
        oauth2: {
          ...mockCredentials.oauth2,
          clientId: '',
        },
      };
      const result = service.validateCredentials(mockConfig, credentials);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OAuth2 client ID is required');
    });

    it('should return invalid for missing clientSecret', () => {
      const credentials: QuickBooksCredentials = {
        oauth2: {
          ...mockCredentials.oauth2,
          clientSecret: '',
        },
      };
      const result = service.validateCredentials(mockConfig, credentials);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OAuth2 client secret is required');
    });

    it('should return invalid for missing tokens', () => {
      const credentials: QuickBooksCredentials = {
        oauth2: {
          ...mockCredentials.oauth2,
          accessToken: '',
          refreshToken: '',
        },
      };
      const result = service.validateCredentials(mockConfig, credentials);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Either access token or refresh token is required');
    });
  });

  describe('getAccessToken', () => {
    it('should return access token from credentials', async () => {
      const token = await service.getAccessToken(mockConfig, mockCredentials);

      expect(token).toBe('test-access-token');
    });

    it('should cache the token', async () => {
      await service.getAccessToken(mockConfig, mockCredentials);
      const tokenInfo = service.getTokenInfo(mockConfig.realmId, mockCredentials.oauth2.clientId);

      expect(tokenInfo?.cached).toBe(true);
    });

    it('should return cached token on subsequent calls', async () => {
      await service.getAccessToken(mockConfig, mockCredentials);
      const token = await service.getAccessToken(mockConfig, mockCredentials);

      expect(token).toBe('test-access-token');
    });

    it('should refresh expired token', async () => {
      const expiredCredentials: QuickBooksCredentials = {
        oauth2: {
          ...mockCredentials.oauth2,
          expiresAt: Date.now() - 1000, // Expired
        },
      };

      httpService.post.mockReturnValue(
        of(
          mockAxiosResponse({
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            token_type: 'Bearer',
            expires_in: 3600,
            x_refresh_token_expires_in: 8726400,
          }),
        ),
      );

      const token = await service.getAccessToken(mockConfig, expiredCredentials);

      expect(token).toBe('new-access-token');
      expect(httpService.post).toHaveBeenCalled();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      httpService.post.mockReturnValue(
        of(
          mockAxiosResponse({
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            token_type: 'Bearer',
            expires_in: 3600,
            x_refresh_token_expires_in: 8726400,
          }),
        ),
      );

      const result = await service.refreshAccessToken(
        mockCredentials.oauth2,
        mockCredentials.oauth2.refreshToken,
      );

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should throw error on refresh failure', async () => {
      const axiosError = new AxiosError('Token refresh failed');
      httpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(
        service.refreshAccessToken(mockCredentials.oauth2, mockCredentials.oauth2.refreshToken),
      ).rejects.toThrow('OAuth2 token refresh failed');
    });
  });

  describe('getAuthorizationHeader', () => {
    it('should return Bearer token header', async () => {
      const header = await service.getAuthorizationHeader(mockConfig, mockCredentials);

      expect(header).toBe('Bearer test-access-token');
    });
  });

  describe('testAuthentication', () => {
    it('should return success on valid authentication', async () => {
      httpService.get.mockReturnValue(of(mockAxiosResponse({ CompanyInfo: {} })));

      const result = await service.testAuthentication(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
    });

    it('should return error on authentication failure', async () => {
      const axiosError = new AxiosError('Unauthorized');
      httpService.get.mockReturnValue(throwError(() => axiosError));

      const result = await service.testAuthentication(mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('invalidateToken', () => {
    it('should invalidate cached token', async () => {
      await service.getAccessToken(mockConfig, mockCredentials);

      service.invalidateToken(mockConfig.realmId, mockCredentials.oauth2.clientId);

      const tokenInfo = service.getTokenInfo(mockConfig.realmId, mockCredentials.oauth2.clientId);
      expect(tokenInfo?.cached).toBe(false);
    });
  });

  describe('clearAllTokens', () => {
    it('should clear all cached tokens', async () => {
      await service.getAccessToken(mockConfig, mockCredentials);

      service.clearAllTokens();

      const tokenInfo = service.getTokenInfo(mockConfig.realmId, mockCredentials.oauth2.clientId);
      expect(tokenInfo?.cached).toBe(false);
    });
  });

  describe('getTokenInfo', () => {
    it('should return token info for cached token', async () => {
      await service.getAccessToken(mockConfig, mockCredentials);

      const tokenInfo = service.getTokenInfo(mockConfig.realmId, mockCredentials.oauth2.clientId);

      expect(tokenInfo?.cached).toBe(true);
      expect(tokenInfo?.expiresAt).toBeDefined();
      expect(tokenInfo?.remainingMs).toBeGreaterThan(0);
    });

    it('should return not cached for missing token', () => {
      const tokenInfo = service.getTokenInfo('non-existent', 'non-existent');

      expect(tokenInfo?.cached).toBe(false);
    });
  });

  describe('updateTokenCache', () => {
    it('should update token in cache', () => {
      service.updateTokenCache(
        mockConfig.realmId,
        mockCredentials.oauth2,
        'updated-access-token',
        'updated-refresh-token',
        Date.now() + 7200000,
      );

      const tokenInfo = service.getTokenInfo(mockConfig.realmId, mockCredentials.oauth2.clientId);

      expect(tokenInfo?.cached).toBe(true);
    });
  });
});
