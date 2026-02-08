import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import { SapConnectionConfig, SapCredentials, SapOAuth2Config } from '../interfaces';

interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
}

/**
 * SAP Authentication Service
 * Handles OAuth2, Basic Auth, and Certificate-based authentication for SAP S/4HANA
 */
@Injectable()
export class SapAuthService {
  private readonly logger = new Logger(SapAuthService.name);
  private readonly tokenCache = new Map<string, TokenCache>();

  constructor(private readonly httpService: HttpService) {}

  /**
   * Get authorization header based on auth type
   */
  async getAuthorizationHeader(
    config: SapConnectionConfig,
    credentials: SapCredentials,
  ): Promise<Record<string, string>> {
    switch (config.authType) {
      case 'basic':
        return this.getBasicAuthHeader(credentials);

      case 'oauth2':
        return await this.getOAuth2Header(config, credentials);

      case 'certificate':
        // Certificate auth is handled at the HTTPS agent level
        return {};

      default:
        return {};
    }
  }

  /**
   * Get Basic auth header
   */
  private getBasicAuthHeader(credentials: SapCredentials): Record<string, string> {
    if (!credentials.basic) {
      throw new Error('Basic auth credentials not provided');
    }

    const { username, password } = credentials.basic;
    const encoded = Buffer.from(`${username}:${password}`).toString('base64');

    return {
      Authorization: `Basic ${encoded}`,
    };
  }

  /**
   * Get OAuth2 auth header
   */
  private async getOAuth2Header(
    config: SapConnectionConfig,
    credentials: SapCredentials,
  ): Promise<Record<string, string>> {
    if (!credentials.oauth2) {
      throw new Error('OAuth2 credentials not provided');
    }

    const cacheKey = this.buildCacheKey(config, credentials.oauth2);
    const cachedToken = this.tokenCache.get(cacheKey);

    // Check if we have a valid cached token (with 5 minute buffer)
    if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
      return {
        Authorization: `Bearer ${cachedToken.accessToken}`,
      };
    }

    // Get new token
    const token = await this.fetchOAuth2Token(credentials.oauth2);

    // Cache the token
    this.tokenCache.set(cacheKey, {
      accessToken: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1000,
      refreshToken: token.refresh_token,
    });

    return {
      Authorization: `Bearer ${token.access_token}`,
    };
  }

  /**
   * Fetch OAuth2 token from SAP
   */
  private async fetchOAuth2Token(oauth2Config: SapOAuth2Config): Promise<OAuth2TokenResponse> {
    const { tokenUrl, clientId, clientSecret, grantType, scopes, samlAssertion } = oauth2Config;

    this.logger.debug(`Fetching OAuth2 token from ${tokenUrl}`);

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    switch (grantType) {
      case 'client_credentials':
        params.append('grant_type', 'client_credentials');
        break;

      case 'authorization_code':
        params.append('grant_type', 'authorization_code');
        // Code would be passed separately during the OAuth flow
        break;

      case 'password':
        params.append('grant_type', 'password');
        // Username/password would be passed during the OAuth flow
        break;
    }

    if (scopes?.length) {
      params.append('scope', scopes.join(' '));
    }

    // SAP-specific: SAML Bearer assertion flow
    if (samlAssertion) {
      params.set('grant_type', 'urn:ietf:params:oauth:grant-type:saml2-bearer');
      params.append('assertion', samlAssertion);
    }

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<OAuth2TokenResponse>(tokenUrl, params.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
          .pipe(timeout(30000)),
      );

      this.logger.debug('OAuth2 token obtained successfully');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to obtain OAuth2 token:', error);
      throw new Error(`OAuth2 authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Refresh an OAuth2 token
   */
  async refreshToken(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    refreshToken: string,
  ): Promise<OAuth2TokenResponse> {
    if (!credentials.oauth2) {
      throw new Error('OAuth2 credentials not provided');
    }

    const { tokenUrl, clientId, clientSecret } = credentials.oauth2;

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<OAuth2TokenResponse>(tokenUrl, params.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
          .pipe(timeout(30000)),
      );

      // Update cache
      const cacheKey = this.buildCacheKey(config, credentials.oauth2);
      this.tokenCache.set(cacheKey, {
        accessToken: response.data.access_token,
        expiresAt: Date.now() + response.data.expires_in * 1000,
        refreshToken: response.data.refresh_token || refreshToken,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to refresh OAuth2 token:', error);
      throw new Error(`OAuth2 token refresh failed: ${(error as Error).message}`);
    }
  }

  /**
   * Clear cached token
   */
  clearTokenCache(config: SapConnectionConfig, credentials: SapCredentials): void {
    if (credentials.oauth2) {
      const cacheKey = this.buildCacheKey(config, credentials.oauth2);
      this.tokenCache.delete(cacheKey);
    }
  }

  /**
   * Clear all cached tokens
   */
  clearAllTokenCache(): void {
    this.tokenCache.clear();
  }

  /**
   * Build cache key for token storage
   */
  private buildCacheKey(config: SapConnectionConfig, oauth2Config: SapOAuth2Config): string {
    return `${config.baseUrl}:${oauth2Config.clientId}`;
  }

  /**
   * Validate credentials configuration
   */
  validateCredentials(
    config: SapConnectionConfig,
    credentials: SapCredentials,
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    switch (config.authType) {
      case 'basic':
        if (!credentials.basic) {
          errors.push('Basic auth credentials are required');
        } else {
          if (!credentials.basic.username) {
            errors.push('Username is required for basic auth');
          }
          if (!credentials.basic.password) {
            errors.push('Password is required for basic auth');
          }
        }
        break;

      case 'oauth2':
        if (!credentials.oauth2) {
          errors.push('OAuth2 credentials are required');
        } else {
          if (!credentials.oauth2.tokenUrl) {
            errors.push('Token URL is required for OAuth2');
          }
          if (!credentials.oauth2.clientId) {
            errors.push('Client ID is required for OAuth2');
          }
          if (!credentials.oauth2.clientSecret) {
            errors.push('Client Secret is required for OAuth2');
          }
        }
        break;

      case 'certificate':
        if (!credentials.certificate) {
          errors.push('Certificate credentials are required');
        } else {
          if (!credentials.certificate.certificate) {
            errors.push('Certificate is required');
          }
          if (!credentials.certificate.privateKey) {
            errors.push('Private key is required');
          }
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
