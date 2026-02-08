import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  QuickBooksConnectionConfig,
  QuickBooksCredentials,
  QuickBooksOAuth2Config,
  QuickBooksApiPaths,
  QuickBooksTokenRefreshResult,
} from '../interfaces';

/**
 * Token cache entry
 */
interface TokenCacheEntry {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: number;
}

/**
 * Validation result
 */
export interface CredentialValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * QuickBooks Online Authentication Service
 * Handles OAuth2 authentication and token management
 */
@Injectable()
export class QuickBooksAuthService {
  private readonly logger = new Logger(QuickBooksAuthService.name);
  private readonly tokenCache = new Map<string, TokenCacheEntry>();

  // Token refresh buffer (5 minutes before expiry)
  private readonly TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

  constructor(private readonly httpService: HttpService) {}

  /**
   * Get authorization header for API requests
   */
  async getAuthorizationHeader(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
  ): Promise<string> {
    const token = await this.getAccessToken(config, credentials);
    return `Bearer ${token}`;
  }

  /**
   * Get OAuth2 access token (cached with automatic refresh)
   */
  async getAccessToken(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
  ): Promise<string> {
    const cacheKey = this.buildCacheKey(config.realmId, credentials.oauth2.clientId);
    const cachedToken = this.tokenCache.get(cacheKey);

    // Return cached token if valid
    if (cachedToken && this.isTokenValid(cachedToken)) {
      this.logger.debug('Using cached OAuth2 token');
      return cachedToken.accessToken;
    }

    // Check if provided access token is still valid (not expired)
    const providedExpiresAt = credentials.oauth2.expiresAt || Date.now() + 3600 * 1000;
    const isProvidedTokenValid = providedExpiresAt > Date.now() + this.TOKEN_REFRESH_BUFFER_MS;

    if (credentials.oauth2.accessToken && isProvidedTokenValid) {
      this.logger.debug('Caching provided OAuth2 token');
      this.tokenCache.set(cacheKey, {
        accessToken: credentials.oauth2.accessToken,
        refreshToken: credentials.oauth2.refreshToken,
        tokenType: 'Bearer',
        expiresAt: providedExpiresAt,
      });
      return credentials.oauth2.accessToken;
    }

    // Token is expired or about to expire, try to refresh
    const refreshToken = cachedToken?.refreshToken || credentials.oauth2.refreshToken;
    if (refreshToken) {
      this.logger.debug('Refreshing OAuth2 token');
      try {
        const refreshedToken = await this.refreshAccessToken(credentials.oauth2, refreshToken);

        const newEntry: TokenCacheEntry = {
          accessToken: refreshedToken.accessToken,
          refreshToken: refreshedToken.refreshToken,
          tokenType: refreshedToken.tokenType,
          expiresAt: refreshedToken.expiresAt,
        };

        this.tokenCache.set(cacheKey, newEntry);
        return newEntry.accessToken;
      } catch (error) {
        this.logger.error('Failed to refresh token', error);
        throw new Error('Token refresh failed. Re-authorization may be required.');
      }
    }

    throw new Error('No valid access token available');
  }

  /**
   * Refresh OAuth2 access token
   */
  async refreshAccessToken(
    oauth2Config: QuickBooksOAuth2Config,
    refreshToken: string,
  ): Promise<QuickBooksTokenRefreshResult> {
    const { clientId, clientSecret } = oauth2Config;

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const response = await firstValueFrom(
        this.httpService.post<{
          access_token: string;
          refresh_token: string;
          token_type: string;
          expires_in: number;
          x_refresh_token_expires_in: number;
        }>(QuickBooksApiPaths.TOKEN_ENDPOINT_PRODUCTION, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${authHeader}`,
            Accept: 'application/json',
          },
        }),
      );

      const { access_token, refresh_token, token_type, expires_in } = response.data;

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenType: token_type,
        expiresAt: Date.now() + expires_in * 1000,
      };
    } catch (error) {
      this.logger.error('Failed to refresh OAuth2 token', error);
      throw new Error('OAuth2 token refresh failed');
    }
  }

  /**
   * Revoke OAuth2 token
   */
  async revokeToken(oauth2Config: QuickBooksOAuth2Config, token: string): Promise<boolean> {
    const { clientId, clientSecret } = oauth2Config;

    const params = new URLSearchParams();
    params.append('token', token);

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      await firstValueFrom(
        this.httpService.post(QuickBooksApiPaths.REVOKE_ENDPOINT, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${authHeader}`,
            Accept: 'application/json',
          },
        }),
      );

      return true;
    } catch (error) {
      this.logger.error('Failed to revoke token', error);
      return false;
    }
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
  private buildCacheKey(realmId: string, clientId: string): string {
    return `${realmId}:${clientId}`;
  }

  /**
   * Invalidate cached token
   */
  invalidateToken(realmId: string, clientId: string): void {
    const cacheKey = this.buildCacheKey(realmId, clientId);
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
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
  ): CredentialValidationResult {
    const errors: string[] = [];

    // Validate realm ID
    if (!config.realmId) {
      errors.push('Realm ID (Company ID) is required');
    }

    // Validate environment
    if (!config.environment || !['sandbox', 'production'].includes(config.environment)) {
      errors.push('Environment must be sandbox or production');
    }

    // Validate OAuth2 credentials
    if (!credentials.oauth2) {
      errors.push('OAuth2 credentials are required');
    } else {
      if (!credentials.oauth2.clientId) {
        errors.push('OAuth2 client ID is required');
      }
      if (!credentials.oauth2.clientSecret) {
        errors.push('OAuth2 client secret is required');
      }
      if (!credentials.oauth2.accessToken && !credentials.oauth2.refreshToken) {
        errors.push('Either access token or refresh token is required');
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
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get authorization header (will validate/refresh token)
      const authHeader = await this.getAuthorizationHeader(config, credentials);

      // Make a test request to company info endpoint
      const baseUrl =
        config.environment === 'production'
          ? QuickBooksApiPaths.BASE_URL_PRODUCTION
          : QuickBooksApiPaths.BASE_URL_SANDBOX;

      const testUrl = `${baseUrl}/v3/company/${config.realmId}/companyinfo/${config.realmId}?minorversion=${config.minorVersion || 65}`;

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
    realmId: string,
    clientId: string,
  ): {
    cached: boolean;
    expiresAt?: Date;
    remainingMs?: number;
  } | null {
    const cacheKey = this.buildCacheKey(realmId, clientId);
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

  /**
   * Update token in cache (for external token updates)
   */
  updateTokenCache(
    realmId: string,
    oauth2Config: QuickBooksOAuth2Config,
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ): void {
    const cacheKey = this.buildCacheKey(realmId, oauth2Config.clientId);
    this.tokenCache.set(cacheKey, {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresAt,
    });
    this.logger.debug(`Updated token cache for ${cacheKey}`);
  }
}
