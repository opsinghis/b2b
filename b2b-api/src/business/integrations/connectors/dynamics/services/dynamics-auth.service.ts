import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import {
  DynamicsConnectionConfig,
  DynamicsCredentials,
  DynamicsClientCredentialsConfig,
  DynamicsOnBehalfOfConfig,
} from '../interfaces';

interface AzureADTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  ext_expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
}

/**
 * Dynamics 365 Authentication Service
 * Handles Azure AD OAuth2 authentication for Dynamics 365
 */
@Injectable()
export class DynamicsAuthService {
  private readonly logger = new Logger(DynamicsAuthService.name);
  private readonly tokenCache = new Map<string, TokenCache>();

  /** Azure AD token endpoint template */
  private readonly azureAdTokenUrl =
    'https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Get authorization header based on auth type
   */
  async getAuthorizationHeader(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
  ): Promise<Record<string, string>> {
    switch (config.authType) {
      case 'client_credentials':
      case 'azure_ad':
        return await this.getClientCredentialsHeader(config, credentials);

      case 'on_behalf_of':
        return await this.getOnBehalfOfHeader(config, credentials);

      default:
        return {};
    }
  }

  /**
   * Get OAuth2 token using client credentials flow
   */
  private async getClientCredentialsHeader(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
  ): Promise<Record<string, string>> {
    if (!credentials.clientCredentials) {
      throw new Error('Client credentials not provided');
    }

    const cacheKey = this.buildCacheKey(config, credentials.clientCredentials.clientId);
    const cachedToken = this.tokenCache.get(cacheKey);

    // Check if we have a valid cached token (with 5 minute buffer)
    if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
      return {
        Authorization: `Bearer ${cachedToken.accessToken}`,
      };
    }

    // Get new token
    const token = await this.fetchClientCredentialsToken(config, credentials.clientCredentials);

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
   * Get OAuth2 token using on-behalf-of flow
   */
  private async getOnBehalfOfHeader(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
  ): Promise<Record<string, string>> {
    if (!credentials.onBehalfOf) {
      throw new Error('On-behalf-of credentials not provided');
    }

    // On-behalf-of tokens are typically short-lived and user-specific
    // We can cache them but with a shorter duration
    const cacheKey = `obo:${this.buildCacheKey(config, credentials.onBehalfOf.clientId)}`;
    const cachedToken = this.tokenCache.get(cacheKey);

    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
      return {
        Authorization: `Bearer ${cachedToken.accessToken}`,
      };
    }

    const token = await this.fetchOnBehalfOfToken(config, credentials.onBehalfOf);

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
   * Fetch OAuth2 token using client credentials grant
   */
  private async fetchClientCredentialsToken(
    config: DynamicsConnectionConfig,
    clientCredentials: DynamicsClientCredentialsConfig,
  ): Promise<AzureADTokenResponse> {
    const tokenUrl = this.azureAdTokenUrl.replace('{tenantId}', config.tenantId);

    this.logger.debug(
      `Fetching client credentials token from Azure AD for tenant ${config.tenantId}`,
    );

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientCredentials.clientId);
    params.append('client_secret', clientCredentials.clientSecret);

    // Scope for Dynamics 365 - typically org URL with /.default
    const scopes = clientCredentials.scopes?.length
      ? clientCredentials.scopes.join(' ')
      : `${config.organizationUrl}/.default`;
    params.append('scope', scopes);

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<AzureADTokenResponse>(tokenUrl, params.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
          .pipe(timeout(30000)),
      );

      this.logger.debug('Azure AD token obtained successfully');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to obtain Azure AD token:', error);
      throw new Error(`Azure AD authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Fetch OAuth2 token using on-behalf-of grant
   */
  private async fetchOnBehalfOfToken(
    config: DynamicsConnectionConfig,
    oboConfig: DynamicsOnBehalfOfConfig,
  ): Promise<AzureADTokenResponse> {
    const tokenUrl = this.azureAdTokenUrl.replace('{tenantId}', config.tenantId);

    this.logger.debug(`Fetching on-behalf-of token from Azure AD`);

    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    params.append('client_id', oboConfig.clientId);
    params.append('client_secret', oboConfig.clientSecret);
    params.append('assertion', oboConfig.userAssertion);
    params.append('requested_token_use', 'on_behalf_of');

    const scopes = oboConfig.scopes?.length
      ? oboConfig.scopes.join(' ')
      : `${config.organizationUrl}/.default`;
    params.append('scope', scopes);

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<AzureADTokenResponse>(tokenUrl, params.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
          .pipe(timeout(30000)),
      );

      this.logger.debug('On-behalf-of token obtained successfully');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to obtain on-behalf-of token:', error);
      throw new Error(`On-behalf-of authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Refresh an OAuth2 token
   */
  async refreshToken(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    refreshToken: string,
  ): Promise<AzureADTokenResponse> {
    const clientId = credentials.clientCredentials?.clientId || credentials.onBehalfOf?.clientId;
    const clientSecret =
      credentials.clientCredentials?.clientSecret || credentials.onBehalfOf?.clientSecret;

    if (!clientId || !clientSecret) {
      throw new Error('Client credentials not provided for token refresh');
    }

    const tokenUrl = this.azureAdTokenUrl.replace('{tenantId}', config.tenantId);

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', `${config.organizationUrl}/.default`);

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<AzureADTokenResponse>(tokenUrl, params.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
          .pipe(timeout(30000)),
      );

      // Update cache
      const cacheKey = this.buildCacheKey(config, clientId);
      this.tokenCache.set(cacheKey, {
        accessToken: response.data.access_token,
        expiresAt: Date.now() + response.data.expires_in * 1000,
        refreshToken: response.data.refresh_token || refreshToken,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to refresh Azure AD token:', error);
      throw new Error(`Token refresh failed: ${(error as Error).message}`);
    }
  }

  /**
   * Clear cached token
   */
  clearTokenCache(config: DynamicsConnectionConfig, credentials: DynamicsCredentials): void {
    const clientId = credentials.clientCredentials?.clientId || credentials.onBehalfOf?.clientId;
    if (clientId) {
      const cacheKey = this.buildCacheKey(config, clientId);
      this.tokenCache.delete(cacheKey);
      this.tokenCache.delete(`obo:${cacheKey}`);
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
  private buildCacheKey(config: DynamicsConnectionConfig, clientId: string): string {
    return `${config.organizationUrl}:${config.tenantId}:${clientId}`;
  }

  /**
   * Validate credentials configuration
   */
  validateCredentials(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.organizationUrl) {
      errors.push('Organization URL is required');
    }

    if (!config.tenantId) {
      errors.push('Azure AD tenant ID is required');
    }

    switch (config.authType) {
      case 'client_credentials':
      case 'azure_ad':
        if (!credentials.clientCredentials) {
          errors.push('Client credentials are required');
        } else {
          if (!credentials.clientCredentials.clientId) {
            errors.push('Client ID is required');
          }
          if (!credentials.clientCredentials.clientSecret) {
            errors.push('Client Secret is required');
          }
        }
        break;

      case 'on_behalf_of':
        if (!credentials.onBehalfOf) {
          errors.push('On-behalf-of credentials are required');
        } else {
          if (!credentials.onBehalfOf.clientId) {
            errors.push('Client ID is required');
          }
          if (!credentials.onBehalfOf.clientSecret) {
            errors.push('Client Secret is required');
          }
          if (!credentials.onBehalfOf.userAssertion) {
            errors.push('User assertion token is required');
          }
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get the Azure AD token URL for a tenant
   */
  getTokenUrl(tenantId: string): string {
    return this.azureAdTokenUrl.replace('{tenantId}', tenantId);
  }
}
