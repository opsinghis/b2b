import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  RestAuthConfig,
  BasicAuthConfig,
  BearerAuthConfig,
  ApiKeyAuthConfig,
  OAuth2AuthConfig,
} from '../interfaces';

/**
 * Token cache entry
 */
interface TokenCacheEntry {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

/**
 * Authentication Provider Service
 * Handles various authentication methods for REST API calls
 */
@Injectable()
export class AuthProviderService {
  private readonly logger = new Logger(AuthProviderService.name);
  private readonly tokenCache = new Map<string, TokenCacheEntry>();

  constructor(private readonly httpService: HttpService) {}

  /**
   * Apply authentication to request config
   */
  async applyAuth(
    config: AxiosRequestConfig,
    authConfig: RestAuthConfig,
    cacheKey?: string,
  ): Promise<AxiosRequestConfig> {
    switch (authConfig.type) {
      case 'none':
        return config;
      case 'basic':
        return this.applyBasicAuth(config, authConfig);
      case 'bearer':
        return this.applyBearerAuth(config, authConfig);
      case 'api_key':
        return this.applyApiKeyAuth(config, authConfig);
      case 'oauth2':
        return this.applyOAuth2Auth(config, authConfig, cacheKey);
      default:
        this.logger.warn(`Unknown auth type, skipping authentication`);
        return config;
    }
  }

  /**
   * Apply Basic Authentication
   */
  private applyBasicAuth(config: AxiosRequestConfig, authConfig: BasicAuthConfig): AxiosRequestConfig {
    const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');

    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Basic ${credentials}`,
      },
    };
  }

  /**
   * Apply Bearer Token Authentication
   */
  private applyBearerAuth(config: AxiosRequestConfig, authConfig: BearerAuthConfig): AxiosRequestConfig {
    const prefix = authConfig.prefix ?? 'Bearer';

    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `${prefix} ${authConfig.token}`,
      },
    };
  }

  /**
   * Apply API Key Authentication
   */
  private applyApiKeyAuth(config: AxiosRequestConfig, authConfig: ApiKeyAuthConfig): AxiosRequestConfig {
    switch (authConfig.placement) {
      case 'header':
        return {
          ...config,
          headers: {
            ...config.headers,
            [authConfig.keyName]: authConfig.apiKey,
          },
        };

      case 'query':
        return {
          ...config,
          params: {
            ...config.params,
            [authConfig.keyName]: authConfig.apiKey,
          },
        };

      case 'cookie':
        const existingCookie = config.headers?.Cookie || '';
        const newCookie = existingCookie
          ? `${existingCookie}; ${authConfig.keyName}=${authConfig.apiKey}`
          : `${authConfig.keyName}=${authConfig.apiKey}`;

        return {
          ...config,
          headers: {
            ...config.headers,
            Cookie: newCookie,
          },
        };

      default:
        return config;
    }
  }

  /**
   * Apply OAuth2 Authentication
   */
  private async applyOAuth2Auth(
    config: AxiosRequestConfig,
    authConfig: OAuth2AuthConfig,
    cacheKey?: string,
  ): Promise<AxiosRequestConfig> {
    const token = await this.getOAuth2Token(authConfig, cacheKey);

    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      },
    };
  }

  /**
   * Get OAuth2 access token (with caching and refresh)
   */
  async getOAuth2Token(authConfig: OAuth2AuthConfig, cacheKey?: string): Promise<string> {
    const key = cacheKey || `${authConfig.clientId}:${authConfig.tokenUrl}`;

    // Check cache
    const cached = this.tokenCache.get(key);
    if (cached && cached.expiresAt > Date.now() + 60000) {
      // Valid for at least 1 minute
      return cached.accessToken;
    }

    // Try refresh token if available
    if (cached?.refreshToken && authConfig.refreshUrl) {
      try {
        const refreshed = await this.refreshOAuth2Token(authConfig, cached.refreshToken);
        this.tokenCache.set(key, refreshed);
        return refreshed.accessToken;
      } catch (error) {
        this.logger.warn('Token refresh failed, requesting new token');
      }
    }

    // Request new token
    const tokenResult = await this.requestOAuth2Token(authConfig);
    this.tokenCache.set(key, tokenResult);
    return tokenResult.accessToken;
  }

  /**
   * Request new OAuth2 token
   */
  private async requestOAuth2Token(authConfig: OAuth2AuthConfig): Promise<TokenCacheEntry> {
    const params = new URLSearchParams();

    switch (authConfig.grantType) {
      case 'client_credentials':
        params.append('grant_type', 'client_credentials');
        params.append('client_id', authConfig.clientId);
        params.append('client_secret', authConfig.clientSecret);
        break;

      case 'password':
        throw new Error('Password grant type requires username/password');

      case 'authorization_code':
        throw new Error('Authorization code grant requires interactive flow');

      case 'refresh_token':
        throw new Error('Refresh token grant requires existing refresh token');
    }

    if (authConfig.scopes?.length) {
      params.append('scope', authConfig.scopes.join(' '));
    }

    // Add extra params
    if (authConfig.extraParams) {
      for (const [key, value] of Object.entries(authConfig.extraParams)) {
        params.append(key, value);
      }
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(authConfig.tokenUrl, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      const data = response.data;
      const expiresIn = data.expires_in || 3600;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + expiresIn * 1000,
      };
    } catch (error) {
      this.logger.error('OAuth2 token request failed', error);
      throw new Error(`OAuth2 token request failed: ${(error as Error).message}`);
    }
  }

  /**
   * Refresh OAuth2 token
   */
  private async refreshOAuth2Token(
    authConfig: OAuth2AuthConfig,
    refreshToken: string,
  ): Promise<TokenCacheEntry> {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', authConfig.clientId);
    params.append('client_secret', authConfig.clientSecret);

    const url = authConfig.refreshUrl || authConfig.tokenUrl;

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      const data = response.data;
      const expiresIn = data.expires_in || 3600;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: Date.now() + expiresIn * 1000,
      };
    } catch (error) {
      this.logger.error('OAuth2 token refresh failed', error);
      throw error;
    }
  }

  /**
   * Clear token cache for a specific key or all
   */
  clearTokenCache(cacheKey?: string): void {
    if (cacheKey) {
      this.tokenCache.delete(cacheKey);
    } else {
      this.tokenCache.clear();
    }
  }

  /**
   * Validate auth configuration
   */
  validateAuthConfig(authConfig: RestAuthConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (authConfig.type) {
      case 'none':
        break;

      case 'basic':
        if (!authConfig.username) errors.push('Basic auth requires username');
        if (!authConfig.password) errors.push('Basic auth requires password');
        break;

      case 'bearer':
        if (!authConfig.token) errors.push('Bearer auth requires token');
        break;

      case 'api_key':
        if (!authConfig.apiKey) errors.push('API key auth requires apiKey');
        if (!authConfig.keyName) errors.push('API key auth requires keyName');
        if (!authConfig.placement) errors.push('API key auth requires placement');
        break;

      case 'oauth2':
        if (!authConfig.clientId) errors.push('OAuth2 requires clientId');
        if (!authConfig.clientSecret) errors.push('OAuth2 requires clientSecret');
        if (!authConfig.tokenUrl) errors.push('OAuth2 requires tokenUrl');
        if (!authConfig.grantType) errors.push('OAuth2 requires grantType');
        break;

      default:
        errors.push(`Unknown auth type`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
