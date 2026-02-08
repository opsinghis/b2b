import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  OracleConnectionConfig,
  OracleCredentials,
  OracleOAuth2Config,
  OracleBasicAuthConfig,
} from '../interfaces';

/**
 * Token cache entry
 */
interface TokenCacheEntry {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  scopes?: string[];
}

/**
 * Validation result
 */
export interface CredentialValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Oracle ERP Cloud Authentication Service
 * Handles OAuth2 and Basic authentication
 */
@Injectable()
export class OracleAuthService {
  private readonly logger = new Logger(OracleAuthService.name);
  private readonly tokenCache = new Map<string, TokenCacheEntry>();

  // Token refresh buffer (5 minutes before expiry)
  private readonly TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

  constructor(private readonly httpService: HttpService) {}

  /**
   * Get authorization header for API requests
   */
  async getAuthorizationHeader(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
  ): Promise<string> {
    if (config.authType === 'oauth2' && credentials.oauth2) {
      const token = await this.getAccessToken(config, credentials.oauth2);
      return `Bearer ${token}`;
    }

    if (config.authType === 'basic_auth' && credentials.basicAuth) {
      return this.getBasicAuthHeader(credentials.basicAuth);
    }

    throw new Error('Invalid authentication configuration');
  }

  /**
   * Get OAuth2 access token (cached)
   */
  async getAccessToken(
    config: OracleConnectionConfig,
    oauth2Config: OracleOAuth2Config,
  ): Promise<string> {
    const cacheKey = this.buildCacheKey(config.instanceUrl, oauth2Config.clientId);
    const cachedToken = this.tokenCache.get(cacheKey);

    // Return cached token if valid
    if (cachedToken && this.isTokenValid(cachedToken)) {
      this.logger.debug('Using cached OAuth2 token');
      return cachedToken.accessToken;
    }

    // Fetch new token
    this.logger.debug('Fetching new OAuth2 token');
    const newToken = await this.fetchAccessToken(oauth2Config);

    // Cache the token
    this.tokenCache.set(cacheKey, newToken);

    return newToken.accessToken;
  }

  /**
   * Fetch new OAuth2 access token
   */
  private async fetchAccessToken(oauth2Config: OracleOAuth2Config): Promise<TokenCacheEntry> {
    const { clientId, clientSecret, tokenEndpoint, scopes } = oauth2Config;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    if (scopes && scopes.length > 0) {
      params.append('scope', scopes.join(' '));
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<{
          access_token: string;
          token_type: string;
          expires_in: number;
          scope?: string;
        }>(tokenEndpoint, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      const { access_token, token_type, expires_in, scope } = response.data;

      return {
        accessToken: access_token,
        tokenType: token_type,
        expiresAt: Date.now() + expires_in * 1000,
        scopes: scope ? scope.split(' ') : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to fetch OAuth2 token', error);
      throw new Error('OAuth2 token request failed');
    }
  }

  /**
   * Get basic auth header
   */
  private getBasicAuthHeader(basicAuth: OracleBasicAuthConfig): string {
    const credentials = Buffer.from(`${basicAuth.username}:${basicAuth.password}`).toString(
      'base64',
    );
    return `Basic ${credentials}`;
  }

  /**
   * Check if cached token is still valid
   */
  private isTokenValid(token: TokenCacheEntry): boolean {
    return token.expiresAt > Date.now() + this.TOKEN_REFRESH_BUFFER_MS;
  }

  /**
   * Build cache key for token
   */
  private buildCacheKey(instanceUrl: string, clientId: string): string {
    return `${instanceUrl}:${clientId}`;
  }

  /**
   * Invalidate cached token
   */
  invalidateToken(instanceUrl: string, clientId: string): void {
    const cacheKey = this.buildCacheKey(instanceUrl, clientId);
    this.tokenCache.delete(cacheKey);
    this.logger.debug(`Invalidated token cache for ${cacheKey}`);
  }

  /**
   * Clear all cached tokens
   */
  clearAllTokens(): void {
    this.tokenCache.clear();
    this.logger.debug('Cleared all cached tokens');
  }

  /**
   * Validate credentials configuration
   */
  validateCredentials(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
  ): CredentialValidationResult {
    const errors: string[] = [];

    // Validate instance URL
    if (!config.instanceUrl) {
      errors.push('Instance URL is required');
    } else {
      try {
        new URL(config.instanceUrl);
      } catch {
        errors.push('Instance URL is not a valid URL');
      }
    }

    // Validate OAuth2 credentials
    if (config.authType === 'oauth2') {
      if (!credentials.oauth2) {
        errors.push('OAuth2 credentials are required for oauth2 auth type');
      } else {
        if (!credentials.oauth2.clientId) {
          errors.push('OAuth2 client ID is required');
        }
        if (!credentials.oauth2.clientSecret) {
          errors.push('OAuth2 client secret is required');
        }
        if (!credentials.oauth2.tokenEndpoint) {
          errors.push('OAuth2 token endpoint is required');
        } else {
          try {
            new URL(credentials.oauth2.tokenEndpoint);
          } catch {
            errors.push('OAuth2 token endpoint is not a valid URL');
          }
        }
      }
    }

    // Validate basic auth credentials
    if (config.authType === 'basic_auth') {
      if (!credentials.basicAuth) {
        errors.push('Basic auth credentials are required for basic_auth auth type');
      } else {
        if (!credentials.basicAuth.username) {
          errors.push('Username is required for basic auth');
        }
        if (!credentials.basicAuth.password) {
          errors.push('Password is required for basic auth');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Test authentication by making a test request
   */
  async testAuthentication(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get authorization header (will fetch token for OAuth2)
      const authHeader = await this.getAuthorizationHeader(config, credentials);

      // Make a test request to a simple endpoint
      const testUrl = `${config.instanceUrl}/fscmRestApi/resources/11.13.18.05/businessUnits?limit=1`;

      const response = await firstValueFrom(
        this.httpService.get(testUrl, {
          headers: {
            Authorization: authHeader,
            Accept: 'application/json',
          },
          timeout: config.timeout || 30000,
        }),
      );

      if (response.status === 200) {
        return { success: true };
      }

      return {
        success: false,
        error: `Unexpected response status: ${response.status}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication test failed';
      return { success: false, error: message };
    }
  }

  /**
   * Get token info for debugging
   */
  getTokenInfo(
    instanceUrl: string,
    clientId: string,
  ): {
    cached: boolean;
    expiresAt?: Date;
    remainingMs?: number;
  } | null {
    const cacheKey = this.buildCacheKey(instanceUrl, clientId);
    const cachedToken = this.tokenCache.get(cacheKey);

    if (!cachedToken) {
      return { cached: false };
    }

    return {
      cached: true,
      expiresAt: new Date(cachedToken.expiresAt),
      remainingMs: Math.max(0, cachedToken.expiresAt - Date.now()),
    };
  }
}
