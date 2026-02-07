import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AuthProviderService } from './auth-provider.service';
import { AxiosRequestConfig } from 'axios';

describe('AuthProviderService', () => {
  let service: AuthProviderService;
  let httpService: HttpService;

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthProviderService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<AuthProviderService>(AuthProviderService);
    httpService = module.get<HttpService>(HttpService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuth', () => {
    const baseConfig: AxiosRequestConfig = {
      method: 'GET',
      url: 'https://api.example.com/test',
      headers: {},
    };

    it('should pass through for none auth type', async () => {
      const result = await service.applyAuth(baseConfig, { type: 'none' });
      expect(result).toEqual(baseConfig);
    });

    describe('Basic Auth', () => {
      it('should add Basic auth header', async () => {
        const result = await service.applyAuth(baseConfig, {
          type: 'basic',
          username: 'user',
          password: 'pass',
        });

        const expectedAuth = Buffer.from('user:pass').toString('base64');
        expect(result.headers?.Authorization).toBe(`Basic ${expectedAuth}`);
      });
    });

    describe('Bearer Auth', () => {
      it('should add Bearer token header', async () => {
        const result = await service.applyAuth(baseConfig, {
          type: 'bearer',
          token: 'my-token',
        });

        expect(result.headers?.Authorization).toBe('Bearer my-token');
      });

      it('should use custom prefix', async () => {
        const result = await service.applyAuth(baseConfig, {
          type: 'bearer',
          token: 'my-token',
          prefix: 'Token',
        });

        expect(result.headers?.Authorization).toBe('Token my-token');
      });
    });

    describe('API Key Auth', () => {
      it('should add API key to header', async () => {
        const result = await service.applyAuth(baseConfig, {
          type: 'api_key',
          apiKey: 'secret-key',
          keyName: 'X-API-Key',
          placement: 'header',
        });

        expect(result.headers?.['X-API-Key']).toBe('secret-key');
      });

      it('should add API key to query params', async () => {
        const result = await service.applyAuth(baseConfig, {
          type: 'api_key',
          apiKey: 'secret-key',
          keyName: 'api_key',
          placement: 'query',
        });

        expect(result.params?.api_key).toBe('secret-key');
      });

      it('should add API key to cookie', async () => {
        const result = await service.applyAuth(baseConfig, {
          type: 'api_key',
          apiKey: 'secret-key',
          keyName: 'session',
          placement: 'cookie',
        });

        expect(result.headers?.Cookie).toBe('session=secret-key');
      });
    });

    describe('OAuth2 Auth', () => {
      it('should fetch and apply OAuth2 token', async () => {
        mockHttpService.post.mockReturnValue(
          of({
            data: {
              access_token: 'oauth-token',
              expires_in: 3600,
            },
          }),
        );

        const result = await service.applyAuth(baseConfig, {
          type: 'oauth2',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          tokenUrl: 'https://auth.example.com/token',
          grantType: 'client_credentials',
        });

        expect(result.headers?.Authorization).toBe('Bearer oauth-token');
      });

      it('should cache OAuth2 tokens', async () => {
        mockHttpService.post.mockReturnValue(
          of({
            data: {
              access_token: 'oauth-token',
              expires_in: 3600,
            },
          }),
        );

        const authConfig = {
          type: 'oauth2' as const,
          clientId: 'client-id',
          clientSecret: 'client-secret',
          tokenUrl: 'https://auth.example.com/token',
          grantType: 'client_credentials' as const,
        };

        await service.applyAuth(baseConfig, authConfig, 'cache-key');
        await service.applyAuth(baseConfig, authConfig, 'cache-key');

        // Token should be fetched only once
        expect(mockHttpService.post).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('validateAuthConfig', () => {
    it('should validate none auth', () => {
      const result = service.validateAuthConfig({ type: 'none' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate basic auth', () => {
      const result = service.validateAuthConfig({
        type: 'basic',
        username: 'user',
        password: 'pass',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject basic auth without username', () => {
      const result = service.validateAuthConfig({
        type: 'basic',
        username: '',
        password: 'pass',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Basic auth requires username');
    });

    it('should validate bearer auth', () => {
      const result = service.validateAuthConfig({
        type: 'bearer',
        token: 'my-token',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject bearer auth without token', () => {
      const result = service.validateAuthConfig({
        type: 'bearer',
        token: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Bearer auth requires token');
    });

    it('should validate API key auth', () => {
      const result = service.validateAuthConfig({
        type: 'api_key',
        apiKey: 'key',
        keyName: 'X-API-Key',
        placement: 'header',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject API key auth without required fields', () => {
      const result = service.validateAuthConfig({
        type: 'api_key',
        apiKey: '',
        keyName: '',
        placement: 'header',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('API key auth requires apiKey');
      expect(result.errors).toContain('API key auth requires keyName');
    });

    it('should validate OAuth2 auth', () => {
      const result = service.validateAuthConfig({
        type: 'oauth2',
        clientId: 'id',
        clientSecret: 'secret',
        tokenUrl: 'https://auth.example.com/token',
        grantType: 'client_credentials',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject OAuth2 auth without required fields', () => {
      const result = service.validateAuthConfig({
        type: 'oauth2',
        clientId: '',
        clientSecret: '',
        tokenUrl: '',
        grantType: 'client_credentials',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OAuth2 requires clientId');
      expect(result.errors).toContain('OAuth2 requires clientSecret');
      expect(result.errors).toContain('OAuth2 requires tokenUrl');
    });
  });

  describe('clearTokenCache', () => {
    it('should clear specific cache key', () => {
      // No error should be thrown
      expect(() => service.clearTokenCache('key')).not.toThrow();
    });

    it('should clear all cache', () => {
      expect(() => service.clearTokenCache()).not.toThrow();
    });
  });
});
