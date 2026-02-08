import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import {
  OracleConnectionConfig,
  OracleCredentials,
  OracleQueryOptions,
  OracleFinderQuery,
  OracleApiResponse,
  OracleConnectorResult,
  OracleResponseMetadata,
} from '../interfaces';
import { OracleAuthService } from './oracle-auth.service';
import { OracleErrorHandlerService } from './oracle-error-handler.service';

/**
 * Request options for API calls
 */
export interface OracleRequestOptions {
  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined>;

  /** Additional headers */
  headers?: Record<string, string>;

  /** Request timeout override */
  timeout?: number;

  /** Include total results count */
  totalResults?: boolean;
}

/**
 * Oracle ERP Cloud REST API Client Service
 * Handles all HTTP communication with Oracle REST APIs
 */
@Injectable()
export class OracleRestClientService {
  private readonly logger = new Logger(OracleRestClientService.name);

  // Default values
  private readonly DEFAULT_TIMEOUT = 30000;
  private readonly DEFAULT_LIMIT = 25;
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(
    private readonly httpService: HttpService,
    private readonly authService: OracleAuthService,
    private readonly errorHandler: OracleErrorHandlerService,
  ) {}

  /**
   * Execute GET request
   */
  async get<T>(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    path: string,
    options?: OracleRequestOptions,
  ): Promise<OracleConnectorResult<OracleApiResponse<T>>> {
    return this.executeWithRetry<OracleApiResponse<T>>(
      config,
      credentials,
      () => this.executeGet<T>(config, credentials, path, options),
      'GET',
      path,
    );
  }

  /**
   * Execute GET request by ID
   */
  async getById<T>(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    path: string,
    id: string | number,
    options?: OracleRequestOptions,
  ): Promise<OracleConnectorResult<T>> {
    const fullPath = `${path}/${id}`;
    return this.executeWithRetry<T>(
      config,
      credentials,
      () => this.executeSingleGet<T>(config, credentials, fullPath, options),
      'GET',
      fullPath,
    );
  }

  /**
   * Execute POST request
   */
  async post<T>(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    path: string,
    body: unknown,
    options?: OracleRequestOptions,
  ): Promise<OracleConnectorResult<T>> {
    return this.executeWithRetry<T>(
      config,
      credentials,
      () => this.executePost<T>(config, credentials, path, body, options),
      'POST',
      path,
    );
  }

  /**
   * Execute PATCH request
   */
  async patch<T>(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    path: string,
    id: string | number,
    body: unknown,
    options?: OracleRequestOptions,
  ): Promise<OracleConnectorResult<T>> {
    const fullPath = `${path}/${id}`;
    return this.executeWithRetry<T>(
      config,
      credentials,
      () => this.executePatch<T>(config, credentials, fullPath, body, options),
      'PATCH',
      fullPath,
    );
  }

  /**
   * Execute DELETE request
   */
  async delete(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    path: string,
    id: string | number,
    options?: OracleRequestOptions,
  ): Promise<OracleConnectorResult<void>> {
    const fullPath = `${path}/${id}`;
    return this.executeWithRetry<void>(
      config,
      credentials,
      () => this.executeDelete(config, credentials, fullPath, options),
      'DELETE',
      fullPath,
    );
  }

  /**
   * Execute finder query
   */
  async finder<T>(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    path: string,
    finder: OracleFinderQuery,
    options?: OracleRequestOptions,
  ): Promise<OracleConnectorResult<OracleApiResponse<T>>> {
    // Build finder query parameter
    const finderParams = finder.finderParams
      ? Object.entries(finder.finderParams)
          .map(([key, value]) => `${key}=${value}`)
          .join(';')
      : '';

    const finderString = finderParams ? `${finder.finder};${finderParams}` : finder.finder;

    const mergedOptions: OracleRequestOptions = {
      ...options,
      params: {
        ...options?.params,
        finder: finderString,
      },
    };

    return this.get<T>(config, credentials, path, mergedOptions);
  }

  /**
   * Execute with query options
   */
  async query<T>(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    path: string,
    queryOptions: OracleQueryOptions,
  ): Promise<OracleConnectorResult<OracleApiResponse<T>>> {
    const params = this.buildQueryParams(queryOptions);
    return this.get<T>(config, credentials, path, {
      params,
      totalResults: queryOptions.totalResults,
    });
  }

  /**
   * Execute child resource GET
   */
  async getChild<T>(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    parentPath: string,
    parentId: string | number,
    childPath: string,
    options?: OracleRequestOptions,
  ): Promise<OracleConnectorResult<OracleApiResponse<T>>> {
    const fullPath = `${parentPath}/${parentId}/child/${childPath}`;
    return this.get<T>(config, credentials, fullPath, options);
  }

  /**
   * Execute child resource POST
   */
  async postChild<T>(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    parentPath: string,
    parentId: string | number,
    childPath: string,
    body: unknown,
    options?: OracleRequestOptions,
  ): Promise<OracleConnectorResult<T>> {
    const fullPath = `${parentPath}/${parentId}/child/${childPath}`;
    return this.post<T>(config, credentials, fullPath, body, options);
  }

  // ==================== Private Methods ====================

  /**
   * Execute GET returning list response
   */
  private async executeGet<T>(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    path: string,
    options?: OracleRequestOptions,
  ): Promise<OracleApiResponse<T>> {
    const requestId = uuidv4();
    const url = this.buildUrl(config, path);
    const headers = await this.buildHeaders(config, credentials, requestId, options);
    const params = this.sanitizeParams(options?.params);

    if (config.logging) {
      this.logger.debug(`GET ${url}`, { requestId, params });
    }

    const response = await firstValueFrom(
      this.httpService.get<{
        items?: T[];
        count?: number;
        hasMore?: boolean;
        totalResults?: number;
        links?: unknown[];
      }>(url, {
        headers,
        params,
        timeout: options?.timeout || config.timeout || this.DEFAULT_TIMEOUT,
      }),
    );

    return this.parseListResponse<T>(response.data);
  }

  /**
   * Execute GET returning single item
   */
  private async executeSingleGet<T>(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    path: string,
    options?: OracleRequestOptions,
  ): Promise<T> {
    const requestId = uuidv4();
    const url = this.buildUrl(config, path);
    const headers = await this.buildHeaders(config, credentials, requestId, options);
    const params = this.sanitizeParams(options?.params);

    if (config.logging) {
      this.logger.debug(`GET ${url}`, { requestId });
    }

    const response = await firstValueFrom(
      this.httpService.get<T>(url, {
        headers,
        params,
        timeout: options?.timeout || config.timeout || this.DEFAULT_TIMEOUT,
      }),
    );

    return response.data;
  }

  /**
   * Execute POST request
   */
  private async executePost<T>(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    path: string,
    body: unknown,
    options?: OracleRequestOptions,
  ): Promise<T> {
    const requestId = uuidv4();
    const url = this.buildUrl(config, path);
    const headers = await this.buildHeaders(config, credentials, requestId, options);

    if (config.logging) {
      this.logger.debug(`POST ${url}`, { requestId, body });
    }

    const response = await firstValueFrom(
      this.httpService.post<T>(url, body, {
        headers,
        timeout: options?.timeout || config.timeout || this.DEFAULT_TIMEOUT,
      }),
    );

    return response.data;
  }

  /**
   * Execute PATCH request
   */
  private async executePatch<T>(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    path: string,
    body: unknown,
    options?: OracleRequestOptions,
  ): Promise<T> {
    const requestId = uuidv4();
    const url = this.buildUrl(config, path);
    const headers = await this.buildHeaders(config, credentials, requestId, options);

    if (config.logging) {
      this.logger.debug(`PATCH ${url}`, { requestId, body });
    }

    const response = await firstValueFrom(
      this.httpService.patch<T>(url, body, {
        headers,
        timeout: options?.timeout || config.timeout || this.DEFAULT_TIMEOUT,
      }),
    );

    return response.data;
  }

  /**
   * Execute DELETE request
   */
  private async executeDelete(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    path: string,
    options?: OracleRequestOptions,
  ): Promise<void> {
    const requestId = uuidv4();
    const url = this.buildUrl(config, path);
    const headers = await this.buildHeaders(config, credentials, requestId, options);

    if (config.logging) {
      this.logger.debug(`DELETE ${url}`, { requestId });
    }

    await firstValueFrom(
      this.httpService.delete(url, {
        headers,
        timeout: options?.timeout || config.timeout || this.DEFAULT_TIMEOUT,
      }),
    );
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    operation: () => Promise<T>,
    method: string,
    path: string,
  ): Promise<OracleConnectorResult<T>> {
    const requestId = uuidv4();
    const startTime = Date.now();

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const data = await operation();
        const durationMs = Date.now() - startTime;

        return {
          success: true,
          data,
          metadata: {
            requestId,
            durationMs,
          },
        };
      } catch (error) {
        const durationMs = Date.now() - startTime;

        // Check if we should retry
        if (this.errorHandler.shouldRetry(error, attempt, this.MAX_RETRY_ATTEMPTS)) {
          const delay = this.errorHandler.calculateRetryDelay(attempt);
          this.logger.warn(
            `Retry ${attempt}/${this.MAX_RETRY_ATTEMPTS} for ${method} ${path} after ${delay}ms`,
          );

          // Invalidate token on auth errors
          if (config.authType === 'oauth2' && credentials.oauth2 && this.isAuthError(error)) {
            this.authService.invalidateToken(config.instanceUrl, credentials.oauth2.clientId);
          }

          await this.delay(delay);
          continue;
        }

        // Log error and return failure
        this.errorHandler.logError(error, `${method} ${path}`, {
          attempt,
          requestId,
        });

        return this.errorHandler.createErrorResult<T>(error, requestId, durationMs);
      }
    }

    // Should not reach here, but just in case
    return this.errorHandler.createErrorResult<T>(
      new Error('Max retry attempts exceeded'),
      requestId,
      Date.now() - startTime,
    );
  }

  /**
   * Build full URL
   */
  private buildUrl(config: OracleConnectionConfig, path: string): string {
    const baseUrl = config.instanceUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  /**
   * Build request headers
   */
  private async buildHeaders(
    config: OracleConnectionConfig,
    credentials: OracleCredentials,
    requestId: string,
    options?: OracleRequestOptions,
  ): Promise<Record<string, string>> {
    const authHeader = await this.authService.getAuthorizationHeader(config, credentials);

    const headers: Record<string, string> = {
      Authorization: authHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
      ...options?.headers,
    };

    // Add REST-Framework-Version header for Oracle REST APIs
    headers['REST-Framework-Version'] = '6';

    return headers;
  }

  /**
   * Build query parameters from OracleQueryOptions
   */
  private buildQueryParams(options: OracleQueryOptions): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {};

    if (options.fields && options.fields.length > 0) {
      params.fields = options.fields.join(',');
    }

    if (options.q) {
      params.q = options.q;
    }

    if (options.limit) {
      params.limit = options.limit;
    }

    if (options.offset) {
      params.offset = options.offset;
    }

    if (options.orderBy) {
      params.orderBy = options.orderBy;
    }

    if (options.expand && options.expand.length > 0) {
      params.expand = options.expand.join(',');
    }

    if (options.totalResults) {
      params.totalResults = true;
    }

    // Add custom params
    if (options.customParams) {
      Object.assign(params, options.customParams);
    }

    return params;
  }

  /**
   * Sanitize params (remove undefined values)
   */
  private sanitizeParams(
    params?: Record<string, string | number | boolean | undefined>,
  ): Record<string, string | number | boolean> | undefined {
    if (!params) return undefined;

    return Object.entries(params).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, string | number | boolean>,
    );
  }

  /**
   * Parse list response into OracleApiResponse
   */
  private parseListResponse<T>(data: {
    items?: T[];
    count?: number;
    hasMore?: boolean;
    totalResults?: number;
    links?: unknown[];
  }): OracleApiResponse<T> {
    const metadata: OracleResponseMetadata = {
      count: data.count || data.items?.length || 0,
      hasMore: data.hasMore,
      totalResults: data.totalResults,
    };

    return {
      items: data.items || [],
      metadata,
      links: data.links as OracleApiResponse<T>['links'],
    };
  }

  /**
   * Check if error is an authentication error
   */
  private isAuthError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const axiosError = error as { response?: { status?: number } };
      return axiosError.response?.status === 401;
    }
    return false;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
