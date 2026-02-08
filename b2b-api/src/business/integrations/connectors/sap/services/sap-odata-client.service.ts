import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError, throwError } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  SapConnectionConfig,
  SapCredentials,
  SapODataQueryOptions,
  SapODataResponse,
  SapODataMetadata,
  SapErrorResponse,
  SapConnectorResult,
  SapBatchRequestItem,
  SapBatchResponseItem,
} from '../interfaces';
import { SapAuthService } from './sap-auth.service';

/**
 * SAP OData V4 Client Service
 * Handles HTTP communication with SAP S/4HANA OData APIs
 */
@Injectable()
export class SapODataClientService {
  private readonly logger = new Logger(SapODataClientService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly authService: SapAuthService,
  ) {}

  /**
   * Execute OData GET request
   */
  async get<T>(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    servicePath: string,
    entitySet: string,
    queryOptions?: SapODataQueryOptions,
  ): Promise<SapConnectorResult<SapODataResponse<T>>> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      const url = this.buildUrl(config.baseUrl, servicePath, entitySet, queryOptions);
      const headers = await this.buildHeaders(config, credentials, 'GET');

      this.logger.debug(`SAP OData GET [${requestId}]: ${url}`);

      const response = await firstValueFrom(
        this.httpService
          .get<SapODataResponse<T>>(url, {
            headers,
            timeout: config.timeout || 30000,
          })
          .pipe(
            timeout(config.timeout || 30000),
            catchError((error: AxiosError) => this.handleAxiosError(error)),
          ),
      );

      const result: SapODataResponse<T> = {
        value: response.data.value ?? (response.data as unknown as T),
        metadata: this.extractMetadata(response.data),
      };

      return {
        success: true,
        data: result,
        metadata: {
          requestId,
          durationMs: Date.now() - startTime,
          sapEtag: response.headers['etag'],
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, startTime);
    }
  }

  /**
   * Execute OData GET by key
   */
  async getByKey<T>(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    servicePath: string,
    entitySet: string,
    key: string | Record<string, string>,
    queryOptions?: Pick<SapODataQueryOptions, '$select' | '$expand'>,
  ): Promise<SapConnectorResult<T>> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      const keyString = this.buildKeyString(key);
      const url = this.buildUrl(
        config.baseUrl,
        servicePath,
        `${entitySet}(${keyString})`,
        queryOptions,
      );
      const headers = await this.buildHeaders(config, credentials, 'GET');

      this.logger.debug(`SAP OData GET by key [${requestId}]: ${url}`);

      const response = await firstValueFrom(
        this.httpService
          .get<T>(url, {
            headers,
            timeout: config.timeout || 30000,
          })
          .pipe(
            timeout(config.timeout || 30000),
            catchError((error: AxiosError) => this.handleAxiosError(error)),
          ),
      );

      return {
        success: true,
        data: response.data,
        metadata: {
          requestId,
          durationMs: Date.now() - startTime,
          sapEtag: response.headers['etag'],
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, startTime);
    }
  }

  /**
   * Execute OData POST (create)
   */
  async post<T>(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    servicePath: string,
    entitySet: string,
    data: Record<string, unknown>,
  ): Promise<SapConnectorResult<T>> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      const url = this.buildUrl(config.baseUrl, servicePath, entitySet);
      const headers = await this.buildHeaders(config, credentials, 'POST');

      this.logger.debug(`SAP OData POST [${requestId}]: ${url}`);
      this.logger.debug(`SAP OData POST body [${requestId}]: ${JSON.stringify(data)}`);

      const response = await firstValueFrom(
        this.httpService
          .post<T>(url, data, {
            headers,
            timeout: config.timeout || 30000,
          })
          .pipe(
            timeout(config.timeout || 30000),
            catchError((error: AxiosError) => this.handleAxiosError(error)),
          ),
      );

      return {
        success: true,
        data: response.data,
        metadata: {
          requestId,
          durationMs: Date.now() - startTime,
          sapEtag: response.headers['etag'],
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, startTime);
    }
  }

  /**
   * Execute OData PATCH (update)
   */
  async patch<T>(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    servicePath: string,
    entitySet: string,
    key: string | Record<string, string>,
    data: Record<string, unknown>,
    etag?: string,
  ): Promise<SapConnectorResult<T>> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      const keyString = this.buildKeyString(key);
      const url = this.buildUrl(config.baseUrl, servicePath, `${entitySet}(${keyString})`);
      const headers = await this.buildHeaders(config, credentials, 'PATCH', etag);

      this.logger.debug(`SAP OData PATCH [${requestId}]: ${url}`);

      const response = await firstValueFrom(
        this.httpService
          .patch<T>(url, data, {
            headers,
            timeout: config.timeout || 30000,
          })
          .pipe(
            timeout(config.timeout || 30000),
            catchError((error: AxiosError) => this.handleAxiosError(error)),
          ),
      );

      return {
        success: true,
        data: response.data,
        metadata: {
          requestId,
          durationMs: Date.now() - startTime,
          sapEtag: response.headers['etag'],
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, startTime);
    }
  }

  /**
   * Execute OData DELETE
   */
  async delete(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    servicePath: string,
    entitySet: string,
    key: string | Record<string, string>,
    etag?: string,
  ): Promise<SapConnectorResult<void>> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      const keyString = this.buildKeyString(key);
      const url = this.buildUrl(config.baseUrl, servicePath, `${entitySet}(${keyString})`);
      const headers = await this.buildHeaders(config, credentials, 'DELETE', etag);

      this.logger.debug(`SAP OData DELETE [${requestId}]: ${url}`);

      await firstValueFrom(
        this.httpService
          .delete(url, {
            headers,
            timeout: config.timeout || 30000,
          })
          .pipe(
            timeout(config.timeout || 30000),
            catchError((error: AxiosError) => this.handleAxiosError(error)),
          ),
      );

      return {
        success: true,
        metadata: {
          requestId,
          durationMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, startTime);
    }
  }

  /**
   * Execute OData batch request
   */
  async batch(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    servicePath: string,
    requests: SapBatchRequestItem[],
  ): Promise<SapConnectorResult<SapBatchResponseItem[]>> {
    const requestId = uuidv4();
    const startTime = Date.now();
    const batchBoundary = `batch_${uuidv4()}`;
    const changesetBoundary = `changeset_${uuidv4()}`;

    try {
      const url = `${config.baseUrl}${servicePath}/$batch`;
      const headers = await this.buildHeaders(config, credentials, 'POST');
      headers['Content-Type'] = `multipart/mixed; boundary=${batchBoundary}`;

      const body = this.buildBatchBody(requests, batchBoundary, changesetBoundary, servicePath);

      this.logger.debug(`SAP OData BATCH [${requestId}]: ${url}`);

      const response = await firstValueFrom(
        this.httpService
          .post(url, body, {
            headers,
            timeout: config.timeout || 60000,
            responseType: 'text',
          })
          .pipe(
            timeout(config.timeout || 60000),
            catchError((error: AxiosError) => this.handleAxiosError(error)),
          ),
      );

      const results = this.parseBatchResponse(response.data as string, batchBoundary);

      return {
        success: true,
        data: results,
        metadata: {
          requestId,
          durationMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, startTime);
    }
  }

  /**
   * Fetch CSRF token for modifying operations
   */
  async fetchCsrfToken(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    servicePath: string,
  ): Promise<string | undefined> {
    try {
      const url = `${config.baseUrl}${servicePath}`;
      const authHeader = await this.authService.getAuthorizationHeader(config, credentials);

      const response = await firstValueFrom(
        this.httpService.head(url, {
          headers: {
            ...authHeader,
            'x-csrf-token': 'Fetch',
          },
          timeout: 10000,
        }),
      );

      return response.headers['x-csrf-token'];
    } catch (error) {
      this.logger.warn('Failed to fetch CSRF token:', error);
      return undefined;
    }
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(
    baseUrl: string,
    servicePath: string,
    entitySet: string,
    queryOptions?: SapODataQueryOptions,
  ): string {
    let url = `${baseUrl}${servicePath}/${entitySet}`;

    if (queryOptions) {
      const params = new URLSearchParams();

      if (queryOptions.$select?.length) {
        params.append('$select', queryOptions.$select.join(','));
      }
      if (queryOptions.$expand?.length) {
        params.append('$expand', queryOptions.$expand.join(','));
      }
      if (queryOptions.$filter) {
        params.append('$filter', queryOptions.$filter);
      }
      if (queryOptions.$orderby) {
        params.append('$orderby', queryOptions.$orderby);
      }
      if (queryOptions.$top !== undefined) {
        params.append('$top', queryOptions.$top.toString());
      }
      if (queryOptions.$skip !== undefined) {
        params.append('$skip', queryOptions.$skip.toString());
      }
      if (queryOptions.$count) {
        params.append('$count', 'true');
      }
      if (queryOptions.$search) {
        params.append('$search', queryOptions.$search);
      }
      if (queryOptions.custom) {
        for (const [key, value] of Object.entries(queryOptions.custom)) {
          params.append(key, value);
        }
      }

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  /**
   * Build key string for entity access
   */
  private buildKeyString(key: string | Record<string, string>): string {
    if (typeof key === 'string') {
      return `'${key}'`;
    }

    const keyParts = Object.entries(key).map(([k, v]) => `${k}='${v}'`);
    return keyParts.join(',');
  }

  /**
   * Build request headers
   */
  private async buildHeaders(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    method: string,
    etag?: string,
  ): Promise<Record<string, string>> {
    const authHeader = await this.authService.getAuthorizationHeader(config, credentials);

    const headers: Record<string, string> = {
      ...authHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (config.client) {
      headers['sap-client'] = config.client;
    }

    if (config.language) {
      headers['sap-language'] = config.language;
    }

    // For modifying operations, we may need CSRF token
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      // CSRF token handling would be added here if needed
    }

    // Optimistic locking with ETag
    if (etag && ['PATCH', 'PUT', 'DELETE'].includes(method)) {
      headers['If-Match'] = etag;
    }

    return headers;
  }

  /**
   * Extract OData metadata from response
   */
  private extractMetadata(data: any): SapODataMetadata {
    return {
      '@odata.context': data['@odata.context'],
      '@odata.count': data['@odata.count'],
      '@odata.nextLink': data['@odata.nextLink'],
      '@odata.deltaLink': data['@odata.deltaLink'],
      '@odata.etag': data['@odata.etag'],
    };
  }

  /**
   * Build batch request body
   */
  private buildBatchBody(
    requests: SapBatchRequestItem[],
    batchBoundary: string,
    changesetBoundary: string,
    servicePath: string,
  ): string {
    const lines: string[] = [];
    let hasChangeset = false;

    for (const request of requests) {
      if (request.method === 'GET') {
        // GET requests go directly in batch
        lines.push(`--${batchBoundary}`);
        lines.push('Content-Type: application/http');
        lines.push('Content-Transfer-Encoding: binary');
        lines.push('');
        lines.push(`${request.method} ${servicePath}/${request.url} HTTP/1.1`);
        lines.push('Accept: application/json');
        if (request.headers) {
          for (const [key, value] of Object.entries(request.headers)) {
            lines.push(`${key}: ${value}`);
          }
        }
        lines.push('');
      } else {
        // Modifying requests go in changeset
        if (!hasChangeset) {
          lines.push(`--${batchBoundary}`);
          lines.push(`Content-Type: multipart/mixed; boundary=${changesetBoundary}`);
          lines.push('');
          hasChangeset = true;
        }

        lines.push(`--${changesetBoundary}`);
        lines.push('Content-Type: application/http');
        lines.push('Content-Transfer-Encoding: binary');
        lines.push(`Content-ID: ${request.id}`);
        lines.push('');
        lines.push(`${request.method} ${servicePath}/${request.url} HTTP/1.1`);
        lines.push('Content-Type: application/json');
        lines.push('Accept: application/json');
        if (request.headers) {
          for (const [key, value] of Object.entries(request.headers)) {
            lines.push(`${key}: ${value}`);
          }
        }
        lines.push('');
        if (request.body) {
          lines.push(JSON.stringify(request.body));
        }
      }
    }

    if (hasChangeset) {
      lines.push(`--${changesetBoundary}--`);
    }
    lines.push(`--${batchBoundary}--`);

    return lines.join('\r\n');
  }

  /**
   * Parse batch response
   */
  private parseBatchResponse(responseText: string, _batchBoundary: string): SapBatchResponseItem[] {
    const results: SapBatchResponseItem[] = [];

    // Simple parsing - in production, use a proper multipart parser
    const parts = responseText.split(/--batch_[a-f0-9-]+/);

    for (const part of parts) {
      if (part.includes('HTTP/1.1')) {
        const statusMatch = part.match(/HTTP\/1\.1\s+(\d+)/);
        const contentIdMatch = part.match(/Content-ID:\s*(\S+)/i);
        const bodyMatch = part.match(/\r\n\r\n({[\s\S]*})/);

        if (statusMatch) {
          results.push({
            id: contentIdMatch?.[1] || '',
            status: parseInt(statusMatch[1], 10),
            body: bodyMatch ? JSON.parse(bodyMatch[1]) : undefined,
          });
        }
      }
    }

    return results;
  }

  /**
   * Handle Axios errors
   */
  private handleAxiosError(error: AxiosError): never {
    if (error.response) {
      const sapError = error.response.data as SapErrorResponse;
      const errorMessage = sapError?.error?.message?.value || error.message;
      const errorCode = sapError?.error?.code || `HTTP_${error.response.status}`;

      const enhancedError = new Error(errorMessage) as Error & {
        code: string;
        status: number;
        sapError?: SapErrorResponse;
        retryable: boolean;
      };
      enhancedError.code = errorCode;
      enhancedError.status = error.response.status;
      enhancedError.sapError = sapError;
      enhancedError.retryable = this.isRetryableStatus(error.response.status);

      throw enhancedError;
    }

    throw error;
  }

  /**
   * Check if status code is retryable
   */
  private isRetryableStatus(status: number): boolean {
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  /**
   * Handle general errors
   */
  private handleError<T>(
    error: unknown,
    requestId: string,
    startTime: number,
  ): SapConnectorResult<T> {
    const err = error as Error & {
      code?: string;
      status?: number;
      sapError?: SapErrorResponse;
      retryable?: boolean;
    };

    this.logger.error(`SAP OData error [${requestId}]:`, err.message);

    return {
      success: false,
      error: {
        code: err.code || 'SAP_ERROR',
        message: err.message,
        details: err.sapError?.error?.innererror?.errordetails,
        retryable: err.retryable ?? false,
        sapTransactionId: err.sapError?.error?.innererror?.transactionid,
      },
      metadata: {
        requestId,
        durationMs: Date.now() - startTime,
        sapTransactionId: err.sapError?.error?.innererror?.transactionid,
      },
    };
  }
}
