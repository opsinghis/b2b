import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig, AxiosError } from 'axios';
import { firstValueFrom, timeout, retry } from 'rxjs';
import {
  RestConnectorConfig,
  EndpointConfig,
  RestExecutionResult,
  RestRequestContext,
  HttpMethod,
  RestAuthConfig,
  PaginationConfig,
  RetryConfig,
} from '../interfaces';
import { AuthProviderService } from './auth-provider.service';
import { JsonPathMapperService } from './json-path-mapper.service';
import { PaginationHandlerService, PaginationRequest } from './pagination-handler.service';
import { ErrorMapperService, MappedError } from './error-mapper.service';
import { RequestLoggerService, RestLogEntry } from './request-logger.service';

/**
 * REST Connector Service
 * Main service for executing REST API calls with configurable options
 */
@Injectable()
export class RestConnectorService {
  private readonly logger = new Logger(RestConnectorService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly authProvider: AuthProviderService,
    private readonly jsonPathMapper: JsonPathMapperService,
    private readonly paginationHandler: PaginationHandlerService,
    private readonly errorMapper: ErrorMapperService,
    private readonly requestLogger: RequestLoggerService,
  ) {}

  /**
   * Execute a REST API call
   */
  async execute<T = unknown>(
    config: RestConnectorConfig,
    context: RestRequestContext,
    paginationRequest?: PaginationRequest,
  ): Promise<RestExecutionResult<T>> {
    const endpoint = config.endpoints[context.endpoint];
    if (!endpoint) {
      return {
        success: false,
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: `Endpoint '${context.endpoint}' not found in configuration`,
          retryable: false,
        },
      };
    }

    const startTime = Date.now();
    const correlationId = context.correlationId || `rest-${Date.now()}`;

    try {
      // Build request
      const requestConfig = await this.buildRequest(config, endpoint, context, paginationRequest);

      // Start logging
      const requestLog = this.requestLogger.startRequest(
        endpoint.method,
        requestConfig.url || '',
        endpoint.logging || config.logging,
        {
          headers: requestConfig.headers as Record<string, string>,
          body: requestConfig.data,
          correlationId,
          tenantId: context.tenantId,
          configId: context.configId,
          endpoint: context.endpoint,
        },
      );

      // Execute request with retry logic
      const response = await this.executeWithRetry(
        requestConfig,
        endpoint.retry || config.retry,
      );

      // Log response
      this.requestLogger.logResponse(
        requestLog,
        response.status,
        response.statusText,
        endpoint.logging || config.logging,
        {
          headers: response.headers as Record<string, string>,
          body: response.data,
          tenantId: context.tenantId,
          configId: context.configId,
          endpoint: context.endpoint,
        },
      );

      // Transform response
      const result = this.transformResponse<T>(
        response.data,
        response.headers as Record<string, string>,
        endpoint,
        config,
        paginationRequest,
      );

      return {
        ...result,
        metadata: {
          requestId: requestLog.id,
          durationMs: Date.now() - startTime,
          statusCode: response.status,
        },
      };
    } catch (error) {
      return this.handleError<T>(error as Error, endpoint, config, startTime);
    }
  }

  /**
   * Execute a paginated request and collect all results
   */
  async executeAll<T = unknown>(
    config: RestConnectorConfig,
    context: RestRequestContext,
    options?: {
      maxPages?: number;
      delayBetweenPages?: number;
    },
  ): Promise<RestExecutionResult<T[]>> {
    const allItems: T[] = [];
    let paginationRequest: PaginationRequest = { limit: 100 };
    let pageCount = 0;
    const maxPages = options?.maxPages || 100;
    const startTime = Date.now();

    while (pageCount < maxPages) {
      const result = await this.execute<T[]>(config, context, paginationRequest);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          data: allItems.length > 0 ? allItems : undefined,
          metadata: {
            requestId: `batch-${Date.now()}`,
            durationMs: Date.now() - startTime,
          },
        };
      }

      if (result.data) {
        allItems.push(...result.data);
      }

      pageCount++;

      // Check if there are more pages
      if (!result.pagination?.hasMore) {
        break;
      }

      // Update pagination request for next page
      if (result.pagination.nextCursor) {
        paginationRequest = { cursor: result.pagination.nextCursor };
      } else if (result.pagination.page !== undefined) {
        paginationRequest = { page: result.pagination.page + 1 };
      } else {
        paginationRequest = { offset: allItems.length };
      }

      // Delay between pages if configured
      if (options?.delayBetweenPages) {
        await new Promise((resolve) => setTimeout(resolve, options.delayBetweenPages));
      }
    }

    return {
      success: true,
      data: allItems,
      pagination: {
        hasMore: pageCount >= maxPages,
        total: allItems.length,
      },
      metadata: {
        requestId: `batch-${Date.now()}`,
        durationMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Build request configuration
   */
  private async buildRequest(
    config: RestConnectorConfig,
    endpoint: EndpointConfig,
    context: RestRequestContext,
    paginationRequest?: PaginationRequest,
  ): Promise<AxiosRequestConfig> {
    // Build URL
    let url = this.buildUrl(config.baseUrl, endpoint.path);

    // Apply request mapping
    let body: Record<string, unknown> | undefined;
    let queryParams: Record<string, string> = { ...config.defaultQueryParams };
    let headers: Record<string, string> = { ...config.defaultHeaders, ...endpoint.headers };
    let pathParams: Record<string, string> = {};

    if (endpoint.requestMapping) {
      const mapped = this.jsonPathMapper.transformRequest(context.input, endpoint.requestMapping);

      if (mapped.body) {
        body = mapped.body;
      }

      if (mapped.query) {
        queryParams = { ...queryParams, ...mapped.query };
      }

      if (mapped.headers) {
        headers = { ...headers, ...mapped.headers };
      }

      if (mapped.pathParams) {
        pathParams = mapped.pathParams;
      }
    } else {
      // Use input directly as body for non-GET requests
      if (endpoint.method !== 'GET' && Object.keys(context.input).length > 0) {
        body = context.input;
      }
    }

    // Replace path parameters
    url = this.jsonPathMapper.replacePathParams(url, pathParams);

    // Add static query params from endpoint config
    if (endpoint.queryParams) {
      queryParams = { ...queryParams, ...endpoint.queryParams };
    }

    // Add pagination parameters
    const paginationConfig = endpoint.pagination || config.pagination;
    if (paginationConfig && paginationRequest) {
      const paginationParams = this.paginationHandler.buildPaginationParams(
        paginationConfig,
        paginationRequest,
      );
      queryParams = { ...queryParams, ...this.stringifyParams(paginationParams) };
    }

    // Build Axios config
    let axiosConfig: AxiosRequestConfig = {
      method: endpoint.method,
      url,
      headers,
      params: queryParams,
      data: body,
    };

    // Apply timeout
    const timeoutConfig = endpoint.timeout || config.timeout;
    if (timeoutConfig?.requestTimeout) {
      axiosConfig.timeout = timeoutConfig.requestTimeout;
    }

    // Apply authentication
    const authConfig = config.auth;
    if (authConfig && authConfig.type !== 'none') {
      const authCacheKey = `${context.tenantId}:${context.configId}`;
      axiosConfig = await this.authProvider.applyAuth(axiosConfig, authConfig, authCacheKey);
    }

    // Apply SSL configuration
    if (config.ssl) {
      axiosConfig.httpsAgent = this.createHttpsAgent(config.ssl);
    }

    // Apply proxy configuration
    if (config.proxy) {
      axiosConfig.proxy = {
        host: config.proxy.host,
        port: config.proxy.port,
        auth: config.proxy.auth,
      };
    }

    return axiosConfig;
  }

  /**
   * Build full URL
   */
  private buildUrl(baseUrl: string, path: string): string {
    // Ensure base URL doesn't end with slash
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    // Ensure path starts with slash
    const pathPart = path.startsWith('/') ? path : `/${path}`;
    return `${base}${pathPart}`;
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry(
    config: AxiosRequestConfig,
    retryConfig?: RetryConfig,
  ): Promise<{ status: number; statusText: string; data: unknown; headers: unknown }> {
    const maxRetries = retryConfig?.maxRetries ?? 3;
    const retryDelay = retryConfig?.retryDelay ?? 1000;
    const retryBackoff = retryConfig?.retryBackoff ?? 'exponential';
    const retryOn = retryConfig?.retryOn ?? [408, 429, 500, 502, 503, 504];

    let lastError: Error | undefined;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        const response = await firstValueFrom(
          this.httpService.request(config).pipe(timeout(config.timeout || 30000)),
        );

        return {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          headers: response.headers,
        };
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;

        // Check if should retry
        const statusCode = axiosError.response?.status;
        const shouldRetry =
          retryCount < maxRetries &&
          (statusCode === undefined || retryOn.includes(statusCode) || this.isRetryableError(axiosError));

        if (!shouldRetry) {
          throw error;
        }

        // Calculate delay
        let delay = retryDelay;
        if (retryBackoff === 'exponential') {
          delay = retryDelay * Math.pow(2, retryCount);
        } else {
          delay = retryDelay * (retryCount + 1);
        }

        // Check for Retry-After header
        if (axiosError.response?.headers) {
          const retryAfterDelay = this.errorMapper.getRetryDelay(
            axiosError.response.headers as Record<string, string>,
          );
          if (retryAfterDelay) {
            delay = retryAfterDelay;
          }
        }

        this.logger.warn(
          `Request failed (attempt ${retryCount + 1}/${maxRetries + 1}), retrying in ${delay}ms`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        retryCount++;
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: AxiosError): boolean {
    if (!error.response) {
      // Network errors are retryable
      return (
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.message.includes('timeout')
      );
    }
    return false;
  }

  /**
   * Transform response using configured mappings
   */
  private transformResponse<T>(
    data: unknown,
    headers: Record<string, string>,
    endpoint: EndpointConfig,
    config: RestConnectorConfig,
    paginationRequest?: PaginationRequest,
  ): RestExecutionResult<T> {
    // Parse pagination
    const paginationConfig = endpoint.pagination || config.pagination;
    let paginationResult;
    let items: unknown;

    if (paginationConfig) {
      paginationResult = this.paginationHandler.parsePaginationResponse(
        paginationConfig,
        data,
        headers,
      );
      items = paginationResult.items;
    } else {
      items = data;
    }

    // Apply response mapping
    let transformedData: T;
    if (endpoint.responseMapping?.dataMappings) {
      const mapped = this.jsonPathMapper.transformResponse(items, endpoint.responseMapping);
      transformedData = (mapped.data || items) as T;
    } else {
      transformedData = items as T;
    }

    return {
      success: true,
      data: transformedData,
      pagination: paginationResult
        ? {
            hasMore: paginationResult.hasMore,
            nextCursor: paginationResult.nextCursor,
            prevCursor: paginationResult.prevCursor,
            total: paginationResult.total,
            page: paginationResult.page,
            pageSize: paginationResult.pageSize,
            totalPages: paginationResult.totalPages,
          }
        : undefined,
    };
  }

  /**
   * Handle error response
   */
  private handleError<T>(
    error: Error,
    endpoint: EndpointConfig,
    config: RestConnectorConfig,
    startTime: number,
  ): RestExecutionResult<T> {
    const errorMappings = [...(endpoint.errorMappings || []), ...(config.errorMappings || [])];

    const mappedError = this.errorMapper.mapError(
      error,
      errorMappings,
      (error as AxiosError).response?.data,
    );

    return {
      success: false,
      error: {
        code: mappedError.code,
        message: mappedError.message,
        details: mappedError.details,
        retryable: mappedError.retryable,
      },
      metadata: {
        requestId: `error-${Date.now()}`,
        durationMs: Date.now() - startTime,
        statusCode: mappedError.statusCode,
      },
    };
  }

  /**
   * Stringify params for query string
   */
  private stringifyParams(params: Record<string, string | number>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      result[key] = String(value);
    }
    return result;
  }

  /**
   * Create HTTPS agent with SSL config
   */
  private createHttpsAgent(ssl: RestConnectorConfig['ssl']): unknown {
    // In a real implementation, this would create an https.Agent
    // with the provided SSL configuration
    return undefined;
  }

  /**
   * Validate connector configuration
   */
  validateConfig(config: RestConnectorConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate base URL
    if (!config.baseUrl) {
      errors.push('baseUrl is required');
    } else {
      try {
        new URL(config.baseUrl);
      } catch {
        errors.push('baseUrl must be a valid URL');
      }
    }

    // Validate endpoints
    if (!config.endpoints || Object.keys(config.endpoints).length === 0) {
      errors.push('At least one endpoint is required');
    }

    for (const [name, endpoint] of Object.entries(config.endpoints || {})) {
      if (!endpoint.method) {
        errors.push(`Endpoint '${name}': method is required`);
      }
      if (!endpoint.path) {
        errors.push(`Endpoint '${name}': path is required`);
      }

      // Validate pagination config
      if (endpoint.pagination) {
        const paginationValidation = this.paginationHandler.validatePaginationConfig(
          endpoint.pagination,
        );
        errors.push(...paginationValidation.errors.map((e) => `Endpoint '${name}': ${e}`));
      }

      // Validate error mappings
      if (endpoint.errorMappings) {
        const errorValidation = this.errorMapper.validateErrorMappingRules(endpoint.errorMappings);
        errors.push(...errorValidation.errors.map((e) => `Endpoint '${name}': ${e}`));
      }
    }

    // Validate authentication
    if (config.auth) {
      const authValidation = this.authProvider.validateAuthConfig(config.auth);
      errors.push(...authValidation.errors);
    }

    // Validate global pagination
    if (config.pagination) {
      const paginationValidation = this.paginationHandler.validatePaginationConfig(config.pagination);
      errors.push(...paginationValidation.errors);
    }

    // Validate global error mappings
    if (config.errorMappings) {
      const errorValidation = this.errorMapper.validateErrorMappingRules(config.errorMappings);
      errors.push(...errorValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get request logs
   */
  getLogs(options?: {
    limit?: number;
    correlationId?: string;
    tenantId?: string;
    configId?: string;
  }): RestLogEntry[] {
    return this.requestLogger.getRecentLogs(options);
  }

  /**
   * Get log statistics
   */
  getLogStats(): ReturnType<RequestLoggerService['getLogStats']> {
    return this.requestLogger.getLogStats();
  }
}
