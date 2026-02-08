import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { DynamicsAuthService } from './dynamics-auth.service';
import {
  DynamicsConnectionConfig,
  DynamicsCredentials,
  DynamicsQueryOptions,
  DynamicsODataResponse,
  DynamicsConnectorResult,
  DynamicsErrorResponse,
  DynamicsBatchRequestItem,
  DynamicsBatchResponseItem,
} from '../interfaces';

/**
 * Dynamics 365 Web API Client Service
 * Implements OData V4 client for Dynamics 365
 */
@Injectable()
export class DynamicsWebApiClientService {
  private readonly logger = new Logger(DynamicsWebApiClientService.name);
  private readonly defaultApiVersion = 'v9.2';

  constructor(
    private readonly httpService: HttpService,
    private readonly authService: DynamicsAuthService,
  ) {}

  /**
   * Execute GET request for entity collection
   */
  async get<T>(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    entitySetName: string,
    options?: DynamicsQueryOptions,
  ): Promise<DynamicsConnectorResult<DynamicsODataResponse<T[]>>> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      const url = this.buildUrl(config, entitySetName, undefined, options);
      const headers = await this.buildHeaders(config, credentials, options);

      this.logger.debug(`[${requestId}] GET ${url}`);

      const response = await firstValueFrom(
        this.httpService
          .get<{ value: T[]; '@odata.count'?: number; '@odata.nextLink'?: string }>(url, {
            headers,
            timeout: config.timeout || 30000,
          })
          .pipe(
            timeout(config.timeout || 30000),
            catchError((error: AxiosError) => {
              throw error;
            }),
          ),
      );

      return {
        success: true,
        data: {
          value: response.data.value,
          metadata: {
            '@odata.count': response.data['@odata.count'],
            '@odata.nextLink': response.data['@odata.nextLink'],
          },
        },
        metadata: {
          requestId,
          durationMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, Date.now() - startTime);
    }
  }

  /**
   * Execute GET request for single entity by key
   */
  async getByKey<T>(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    entitySetName: string,
    entityId: string,
    options?: DynamicsQueryOptions,
  ): Promise<DynamicsConnectorResult<T>> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      const url = this.buildUrl(config, entitySetName, entityId, options);
      const headers = await this.buildHeaders(config, credentials, options);

      this.logger.debug(`[${requestId}] GET ${url}`);

      const response = await firstValueFrom(
        this.httpService
          .get<T>(url, {
            headers,
            timeout: config.timeout || 30000,
          })
          .pipe(timeout(config.timeout || 30000)),
      );

      return {
        success: true,
        data: response.data,
        metadata: {
          requestId,
          durationMs: Date.now() - startTime,
          etag: this.extractEtag(response),
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, Date.now() - startTime);
    }
  }

  /**
   * Execute POST request to create entity
   */
  async post<T>(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    entitySetName: string,
    data: Record<string, unknown>,
    options?: DynamicsQueryOptions,
  ): Promise<DynamicsConnectorResult<T>> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      const url = this.buildUrl(config, entitySetName);
      const headers = await this.buildHeaders(config, credentials, options);

      // Add Prefer header for return representation
      if (options?.prefer?.returnRepresentation !== false) {
        headers['Prefer'] = 'return=representation';
      }

      this.logger.debug(`[${requestId}] POST ${url}`);

      const response = await firstValueFrom(
        this.httpService
          .post<T>(url, data, {
            headers,
            timeout: config.timeout || 30000,
          })
          .pipe(timeout(config.timeout || 30000)),
      );

      return {
        success: true,
        data: response.data,
        metadata: {
          requestId,
          durationMs: Date.now() - startTime,
          etag: this.extractEtag(response),
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, Date.now() - startTime);
    }
  }

  /**
   * Execute PATCH request to update entity
   */
  async patch<T>(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    entitySetName: string,
    entityId: string,
    data: Record<string, unknown>,
    etag?: string,
    options?: DynamicsQueryOptions,
  ): Promise<DynamicsConnectorResult<T>> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      const url = this.buildUrl(config, entitySetName, entityId);
      const headers = await this.buildHeaders(config, credentials, options);

      // Add If-Match header for optimistic concurrency
      if (etag) {
        headers['If-Match'] = etag;
      }

      // Add Prefer header for return representation
      if (options?.prefer?.returnRepresentation !== false) {
        headers['Prefer'] = 'return=representation';
      }

      this.logger.debug(`[${requestId}] PATCH ${url}`);

      const response = await firstValueFrom(
        this.httpService
          .patch<T>(url, data, {
            headers,
            timeout: config.timeout || 30000,
          })
          .pipe(timeout(config.timeout || 30000)),
      );

      return {
        success: true,
        data: response.data,
        metadata: {
          requestId,
          durationMs: Date.now() - startTime,
          etag: this.extractEtag(response),
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, Date.now() - startTime);
    }
  }

  /**
   * Execute DELETE request to remove entity
   */
  async delete(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    entitySetName: string,
    entityId: string,
    etag?: string,
  ): Promise<DynamicsConnectorResult<void>> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      const url = this.buildUrl(config, entitySetName, entityId);
      const headers = await this.buildHeaders(config, credentials);

      // Add If-Match header for optimistic concurrency
      if (etag) {
        headers['If-Match'] = etag;
      }

      this.logger.debug(`[${requestId}] DELETE ${url}`);

      await firstValueFrom(
        this.httpService
          .delete(url, {
            headers,
            timeout: config.timeout || 30000,
          })
          .pipe(timeout(config.timeout || 30000)),
      );

      return {
        success: true,
        metadata: {
          requestId,
          durationMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, Date.now() - startTime);
    }
  }

  /**
   * Execute batch request
   */
  async batch(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    requests: DynamicsBatchRequestItem[],
  ): Promise<DynamicsConnectorResult<DynamicsBatchResponseItem[]>> {
    const startTime = Date.now();
    const requestId = uuidv4();
    const batchId = `batch_${uuidv4().replace(/-/g, '')}`;
    const changesetId = `changeset_${uuidv4().replace(/-/g, '')}`;

    try {
      const url = `${config.organizationUrl}/api/data/${config.apiVersion || this.defaultApiVersion}/$batch`;
      const headers = await this.buildHeaders(config, credentials);
      headers['Content-Type'] = `multipart/mixed; boundary=${batchId}`;

      // Build batch request body
      const body = this.buildBatchBody(config, requests, batchId, changesetId);

      this.logger.debug(`[${requestId}] $batch with ${requests.length} requests`);

      const response = await firstValueFrom(
        this.httpService
          .post(url, body, {
            headers,
            timeout: config.timeout || 60000,
          })
          .pipe(timeout(config.timeout || 60000)),
      );

      // Parse batch response
      const results = this.parseBatchResponse(response.data, batchId);

      return {
        success: true,
        data: results,
        metadata: {
          requestId,
          durationMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, Date.now() - startTime);
    }
  }

  /**
   * Execute function import
   */
  async executeFunction<T>(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    functionName: string,
    parameters?: Record<string, unknown>,
  ): Promise<DynamicsConnectorResult<T>> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      // Build function URL with parameters
      let url = `${config.organizationUrl}/api/data/${config.apiVersion || this.defaultApiVersion}/${functionName}`;

      if (parameters && Object.keys(parameters).length > 0) {
        const paramString = Object.entries(parameters)
          .map(([key, value]) => {
            if (typeof value === 'string') {
              return `${key}='${encodeURIComponent(value)}'`;
            }
            return `${key}=${encodeURIComponent(String(value))}`;
          })
          .join(',');
        url += `(${paramString})`;
      } else {
        url += '()';
      }

      const headers = await this.buildHeaders(config, credentials);

      this.logger.debug(`[${requestId}] GET (function) ${url}`);

      const response = await firstValueFrom(
        this.httpService
          .get<T>(url, {
            headers,
            timeout: config.timeout || 30000,
          })
          .pipe(timeout(config.timeout || 30000)),
      );

      return {
        success: true,
        data: response.data,
        metadata: {
          requestId,
          durationMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, Date.now() - startTime);
    }
  }

  /**
   * Execute action
   */
  async executeAction<T>(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    actionName: string,
    entitySetName?: string,
    entityId?: string,
    parameters?: Record<string, unknown>,
  ): Promise<DynamicsConnectorResult<T>> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      let url: string;

      if (entitySetName && entityId) {
        // Bound action
        url = `${config.organizationUrl}/api/data/${config.apiVersion || this.defaultApiVersion}/${entitySetName}(${entityId})/Microsoft.Dynamics.CRM.${actionName}`;
      } else {
        // Unbound action
        url = `${config.organizationUrl}/api/data/${config.apiVersion || this.defaultApiVersion}/${actionName}`;
      }

      const headers = await this.buildHeaders(config, credentials);

      this.logger.debug(`[${requestId}] POST (action) ${url}`);

      const response = await firstValueFrom(
        this.httpService
          .post<T>(url, parameters || {}, {
            headers,
            timeout: config.timeout || 30000,
          })
          .pipe(timeout(config.timeout || 30000)),
      );

      return {
        success: true,
        data: response.data,
        metadata: {
          requestId,
          durationMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.handleError(error, requestId, Date.now() - startTime);
    }
  }

  /**
   * Build Web API URL
   */
  private buildUrl(
    config: DynamicsConnectionConfig,
    entitySetName: string,
    entityId?: string,
    options?: DynamicsQueryOptions,
  ): string {
    const apiVersion = config.apiVersion || this.defaultApiVersion;
    let url = `${config.organizationUrl}/api/data/${apiVersion}/${entitySetName}`;

    if (entityId) {
      url += `(${entityId})`;
    }

    if (options) {
      const params = new URLSearchParams();

      if (options.$select?.length) {
        params.append('$select', options.$select.join(','));
      }

      if (options.$expand?.length) {
        params.append('$expand', options.$expand.join(','));
      }

      if (options.$filter) {
        params.append('$filter', options.$filter);
      }

      if (options.$orderby) {
        params.append('$orderby', options.$orderby);
      }

      if (options.$top !== undefined) {
        params.append('$top', String(options.$top));
      }

      if (options.$skip !== undefined) {
        params.append('$skip', String(options.$skip));
      }

      if (options.$count) {
        params.append('$count', 'true');
      }

      const queryString = params.toString();
      if (queryString) {
        url += '?' + queryString;
      }
    }

    return url;
  }

  /**
   * Build request headers
   */
  private async buildHeaders(
    config: DynamicsConnectionConfig,
    credentials: DynamicsCredentials,
    options?: DynamicsQueryOptions,
  ): Promise<Record<string, string>> {
    const authHeaders = await this.authService.getAuthorizationHeader(config, credentials);

    const headers: Record<string, string> = {
      ...authHeaders,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    };

    // Add Prefer header options
    const preferOptions: string[] = [];

    if (options?.prefer?.includeAnnotations) {
      preferOptions.push(`odata.include-annotations="${options.prefer.includeAnnotations}"`);
    }

    if (options?.prefer?.maxPageSize) {
      preferOptions.push(`odata.maxpagesize=${options.prefer.maxPageSize}`);
    }

    if (preferOptions.length > 0) {
      headers['Prefer'] = preferOptions.join(',');
    }

    // Add custom headers
    if (options?.customHeaders) {
      Object.assign(headers, options.customHeaders);
    }

    return headers;
  }

  /**
   * Build batch request body
   */
  private buildBatchBody(
    config: DynamicsConnectionConfig,
    requests: DynamicsBatchRequestItem[],
    batchId: string,
    changesetId: string,
  ): string {
    const apiVersion = config.apiVersion || this.defaultApiVersion;
    const lines: string[] = [];

    // Separate GET requests (retrieve operations) from change operations
    const getRequests = requests.filter((r) => r.method === 'GET');
    const changeRequests = requests.filter((r) => r.method !== 'GET');

    // Add GET requests outside changeset
    for (const request of getRequests) {
      lines.push(`--${batchId}`);
      lines.push('Content-Type: application/http');
      lines.push('Content-Transfer-Encoding: binary');
      lines.push('');
      lines.push(
        `${request.method} ${config.organizationUrl}/api/data/${apiVersion}/${request.url} HTTP/1.1`,
      );
      lines.push('Accept: application/json');
      lines.push('');
    }

    // Add change requests in changeset
    if (changeRequests.length > 0) {
      lines.push(`--${batchId}`);
      lines.push(`Content-Type: multipart/mixed; boundary=${changesetId}`);
      lines.push('');

      for (const request of changeRequests) {
        lines.push(`--${changesetId}`);
        lines.push('Content-Type: application/http');
        lines.push('Content-Transfer-Encoding: binary');
        lines.push(`Content-ID: ${request.id}`);
        lines.push('');
        lines.push(
          `${request.method} ${config.organizationUrl}/api/data/${apiVersion}/${request.url} HTTP/1.1`,
        );
        lines.push('Content-Type: application/json; charset=utf-8');
        lines.push('Accept: application/json');

        if (request.body) {
          lines.push('');
          lines.push(JSON.stringify(request.body));
        }

        lines.push('');
      }

      lines.push(`--${changesetId}--`);
    }

    lines.push(`--${batchId}--`);

    return lines.join('\r\n');
  }

  /**
   * Parse batch response
   */
  private parseBatchResponse(responseBody: string, batchId: string): DynamicsBatchResponseItem[] {
    const results: DynamicsBatchResponseItem[] = [];

    // Simple parsing - in production would need more robust parsing
    const parts = responseBody.split('--' + batchId);

    for (let i = 1; i < parts.length - 1; i++) {
      const part = parts[i];
      const lines = part.split('\r\n');

      // Find HTTP status line
      const statusLineIndex = lines.findIndex((line) => line.startsWith('HTTP/'));
      if (statusLineIndex === -1) continue;

      const statusLine = lines[statusLineIndex];
      const statusMatch = statusLine.match(/HTTP\/\d+\.\d+ (\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 500;

      // Find Content-ID
      const contentIdLine = lines.find((line) => line.startsWith('Content-ID:'));
      const contentId = contentIdLine ? contentIdLine.split(':')[1].trim() : String(i);

      // Find JSON body
      const jsonStartIndex = lines.findIndex((line) => line.startsWith('{'));
      let body: unknown;
      if (jsonStartIndex !== -1) {
        try {
          body = JSON.parse(lines.slice(jsonStartIndex).join('\r\n'));
        } catch {
          body = undefined;
        }
      }

      results.push({
        id: contentId,
        status,
        body,
      });
    }

    return results;
  }

  /**
   * Extract ETag from response headers
   */
  private extractEtag(response: AxiosResponse): string | undefined {
    return response.headers['etag'] || response.headers['ETag'];
  }

  /**
   * Handle error response
   */
  private handleError<T>(
    error: unknown,
    requestId: string,
    durationMs: number,
  ): DynamicsConnectorResult<T> {
    if (error instanceof AxiosError && error.response) {
      const status = error.response.status;
      const data = error.response.data as DynamicsErrorResponse | undefined;

      this.logger.error(
        `[${requestId}] Dynamics API error: ${status} - ${data?.error?.message || error.message}`,
      );

      return {
        success: false,
        error: {
          code: data?.error?.code || `HTTP_${status}`,
          message: data?.error?.message || error.message,
          details: data?.error?.innererror
            ? [
                {
                  code: data.error.code,
                  message: data.error.innererror.message || data.error.message,
                },
              ]
            : undefined,
          retryable: this.isRetryableStatus(status),
          requestId,
        },
        metadata: {
          requestId,
          durationMs,
        },
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`[${requestId}] Unexpected error: ${errorMessage}`);

    return {
      success: false,
      error: {
        code: 'DYNAMICS_ERROR',
        message: errorMessage,
        retryable: true,
        requestId,
      },
      metadata: {
        requestId,
        durationMs,
      },
    };
  }

  /**
   * Check if HTTP status code is retryable
   */
  private isRetryableStatus(status: number): boolean {
    return status === 408 || status === 429 || status >= 500;
  }
}
