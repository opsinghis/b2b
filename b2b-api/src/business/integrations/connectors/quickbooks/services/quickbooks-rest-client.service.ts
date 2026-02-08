import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';
import {
  QuickBooksConnectionConfig,
  QuickBooksCredentials,
  QuickBooksApiPaths,
  QuickBooksApiResponse,
  QuickBooksQueryOptions,
  QuickBooksConnectorResult,
  QuickBooksErrorResponse,
} from '../interfaces';
import { QuickBooksAuthService } from './quickbooks-auth.service';

/**
 * QuickBooks Online REST Client Service
 * Handles HTTP requests to QuickBooks API
 */
@Injectable()
export class QuickBooksRestClientService {
  private readonly logger = new Logger(QuickBooksRestClientService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly authService: QuickBooksAuthService,
  ) {}

  /**
   * Get base URL for API requests
   */
  getBaseUrl(config: QuickBooksConnectionConfig): string {
    return config.environment === 'production'
      ? QuickBooksApiPaths.BASE_URL_PRODUCTION
      : QuickBooksApiPaths.BASE_URL_SANDBOX;
  }

  /**
   * Build URL with path parameters
   */
  buildUrl(
    config: QuickBooksConnectionConfig,
    path: string,
    queryParams?: Record<string, string | number | undefined>,
  ): string {
    const baseUrl = this.getBaseUrl(config);
    const url = `${baseUrl}${path}`.replace('{realmId}', config.realmId);

    // Add minor version
    const params = new URLSearchParams();
    params.append('minorversion', String(config.minorVersion || 65));

    // Add additional query params
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }

    return `${url}?${params.toString()}`;
  }

  /**
   * Make a GET request
   */
  async get<T>(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    path: string,
    queryParams?: Record<string, string | number | undefined>,
  ): Promise<QuickBooksConnectorResult<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const url = this.buildUrl(config, path, queryParams);
      const authHeader = await this.authService.getAuthorizationHeader(config, credentials);

      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
          'Request-Id': requestId,
        },
        timeout: config.timeout || 30000,
      };

      if (config.logging) {
        this.logger.debug(`GET ${url}`, { requestId });
      }

      const response = await firstValueFrom(
        this.httpService.get<QuickBooksApiResponse<T>>(url, requestConfig).pipe(
          catchError((error: AxiosError<QuickBooksErrorResponse>) => {
            return throwError(() => error);
          }),
        ),
      );

      const durationMs = Date.now() - startTime;

      if (config.logging) {
        this.logger.debug(`GET ${url} completed in ${durationMs}ms`, { requestId });
      }

      return {
        success: true,
        data: response.data as T,
        metadata: {
          requestId,
          durationMs,
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, Date.now() - startTime);
    }
  }

  /**
   * Make a POST request
   */
  async post<T>(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    path: string,
    body: unknown,
    queryParams?: Record<string, string | number | undefined>,
  ): Promise<QuickBooksConnectorResult<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const url = this.buildUrl(config, path, queryParams);
      const authHeader = await this.authService.getAuthorizationHeader(config, credentials);

      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Request-Id': requestId,
        },
        timeout: config.timeout || 30000,
      };

      if (config.logging) {
        this.logger.debug(`POST ${url}`, { requestId, body });
      }

      const response = await firstValueFrom(
        this.httpService.post<QuickBooksApiResponse<T>>(url, body, requestConfig).pipe(
          catchError((error: AxiosError<QuickBooksErrorResponse>) => {
            return throwError(() => error);
          }),
        ),
      );

      const durationMs = Date.now() - startTime;

      if (config.logging) {
        this.logger.debug(`POST ${url} completed in ${durationMs}ms`, { requestId });
      }

      return {
        success: true,
        data: response.data as T,
        metadata: {
          requestId,
          durationMs,
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, Date.now() - startTime);
    }
  }

  /**
   * Execute a query (SELECT statement)
   */
  async query<T>(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    queryString: string,
    options?: QuickBooksQueryOptions,
  ): Promise<QuickBooksConnectorResult<QuickBooksApiResponse<T>>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      let fullQuery = queryString;

      // Add ordering
      if (options?.orderBy) {
        fullQuery += ` ORDERBY ${options.orderBy}`;
      }

      // Add pagination
      if (options?.startPosition) {
        fullQuery += ` STARTPOSITION ${options.startPosition}`;
      }

      if (options?.maxResults) {
        fullQuery += ` MAXRESULTS ${options.maxResults}`;
      }

      const url = this.buildUrl(config, '/v3/company/{realmId}/query', {
        query: fullQuery,
      });

      const authHeader = await this.authService.getAuthorizationHeader(config, credentials);

      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
          'Request-Id': requestId,
        },
        timeout: config.timeout || 30000,
      };

      if (config.logging) {
        this.logger.debug(`QUERY: ${fullQuery}`, { requestId });
      }

      const response = await firstValueFrom(
        this.httpService.get<QuickBooksApiResponse<T>>(url, requestConfig).pipe(
          catchError((error: AxiosError<QuickBooksErrorResponse>) => {
            return throwError(() => error);
          }),
        ),
      );

      const durationMs = Date.now() - startTime;

      if (config.logging) {
        this.logger.debug(`QUERY completed in ${durationMs}ms`, { requestId });
      }

      // Extract metadata from QueryResponse
      const queryResponse = response.data.QueryResponse;
      const totalCount = queryResponse?.totalCount as number | undefined;
      const startPosition = queryResponse?.startPosition as number | undefined;
      const maxResults = queryResponse?.maxResults as number | undefined;

      return {
        success: true,
        data: response.data,
        metadata: {
          requestId,
          durationMs,
          totalResults: totalCount,
          hasMore:
            startPosition && maxResults
              ? startPosition + maxResults - 1 < (totalCount || 0)
              : false,
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, Date.now() - startTime);
    }
  }

  /**
   * Make a DELETE request (void/delete entity)
   */
  async delete<T>(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    path: string,
    body?: unknown,
  ): Promise<QuickBooksConnectorResult<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const url = this.buildUrl(config, path, { operation: 'delete' });
      const authHeader = await this.authService.getAuthorizationHeader(config, credentials);

      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Request-Id': requestId,
        },
        timeout: config.timeout || 30000,
        data: body,
      };

      if (config.logging) {
        this.logger.debug(`DELETE ${url}`, { requestId });
      }

      const response = await firstValueFrom(
        this.httpService.post<QuickBooksApiResponse<T>>(url, body, requestConfig).pipe(
          catchError((error: AxiosError<QuickBooksErrorResponse>) => {
            return throwError(() => error);
          }),
        ),
      );

      const durationMs = Date.now() - startTime;

      return {
        success: true,
        data: response.data as T,
        metadata: {
          requestId,
          durationMs,
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, Date.now() - startTime);
    }
  }

  /**
   * Send an entity (email)
   */
  async send<T>(
    config: QuickBooksConnectionConfig,
    credentials: QuickBooksCredentials,
    path: string,
    email?: string,
  ): Promise<QuickBooksConnectorResult<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const queryParams: Record<string, string | number | undefined> = {
        sendTo: email,
      };

      const url = this.buildUrl(config, `${path}/send`, queryParams);
      const authHeader = await this.authService.getAuthorizationHeader(config, credentials);

      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
          'Content-Type': 'application/octet-stream',
          'Request-Id': requestId,
        },
        timeout: config.timeout || 30000,
      };

      if (config.logging) {
        this.logger.debug(`SEND ${url}`, { requestId });
      }

      const response = await firstValueFrom(
        this.httpService.post<QuickBooksApiResponse<T>>(url, null, requestConfig).pipe(
          catchError((error: AxiosError<QuickBooksErrorResponse>) => {
            return throwError(() => error);
          }),
        ),
      );

      const durationMs = Date.now() - startTime;

      return {
        success: true,
        data: response.data as T,
        metadata: {
          requestId,
          durationMs,
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, Date.now() - startTime);
    }
  }

  /**
   * Handle error response
   */
  private handleError<T>(
    error: unknown,
    requestId: string,
    durationMs: number,
  ): QuickBooksConnectorResult<T> {
    if (error instanceof AxiosError) {
      const errorResponse = error.response?.data as QuickBooksErrorResponse | undefined;
      const fault = errorResponse?.Fault;
      const errors = fault?.Error || [];

      // Map QuickBooks error codes to determine if retryable
      const errorCode = errors[0]?.code || 'UNKNOWN_ERROR';
      const retryable = this.isRetryableError(errorCode, error.response?.status);

      this.logger.error(`QuickBooks API error: ${errors[0]?.Message || error.message}`, {
        requestId,
        status: error.response?.status,
        errorCode,
        errors,
      });

      return {
        success: false,
        error: {
          code: errorCode,
          message: errors[0]?.Message || error.message || 'QuickBooks API error',
          details: errors,
          retryable,
          requestId,
        },
        metadata: {
          requestId,
          durationMs,
        },
      };
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`QuickBooks connector error: ${message}`, { requestId });

    return {
      success: false,
      error: {
        code: 'CONNECTOR_ERROR',
        message,
        retryable: false,
        requestId,
      },
      metadata: {
        requestId,
        durationMs,
      },
    };
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(errorCode: string, status?: number): boolean {
    // HTTP status based
    if (status === 429 || status === 503 || status === 502 || status === 504) {
      return true;
    }

    // QuickBooks specific retryable errors
    const retryableCodes = [
      '3', // Stale object - re-fetch and retry
      '5', // Throttle - wait and retry
      '610', // Object needs to be refreshed
      '6000', // Temporary internal error
      '6010', // Temporary internal error
      '6160', // Temporary connectivity issue
    ];

    return retryableCodes.includes(errorCode);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `qb-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
