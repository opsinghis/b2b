import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { NetSuiteAuthService } from './netsuite-auth.service';
import {
  NetSuiteConnectionConfig,
  NetSuiteApiResponse,
  NetSuiteErrorResponse,
  NetSuitePaginationOptions,
} from '../interfaces';

/**
 * NetSuite REST API Client Service
 * Handles HTTP communication with NetSuite REST APIs
 */
export class NetSuiteRestClientService {
  private readonly logger = new Logger(NetSuiteRestClientService.name);

  private config?: NetSuiteConnectionConfig;
  private baseUrl?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly authService: NetSuiteAuthService,
  ) {}

  /**
   * Configure the REST client
   */
  configure(config: NetSuiteConnectionConfig): void {
    this.config = config;
    this.baseUrl =
      config.baseUrl ||
      `https://${config.accountId.toLowerCase().replace('_', '-')}.suitetalk.api.netsuite.com`;
    this.logger.debug(`NetSuite REST client configured for account: ${config.accountId}`);
  }

  /**
   * Get configuration
   */
  getConfig(): NetSuiteConnectionConfig | undefined {
    return this.config;
  }

  /**
   * Build full URL for REST API endpoint
   */
  private buildUrl(endpoint: string): string {
    const version = this.config?.apiVersion || 'v1';
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseUrl}/services/rest/record/${version}/${cleanEndpoint}`;
  }

  /**
   * Build SuiteQL URL for query execution
   */
  private buildSuiteQLUrl(): string {
    return `${this.baseUrl}/services/rest/query/v1/suiteql`;
  }

  /**
   * Perform GET request
   */
  async get<T = unknown>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<T>> {
    const url = new URL(this.buildUrl(endpoint));

    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    // Add pagination parameters
    if (pagination) {
      if (pagination.offset !== undefined) {
        url.searchParams.append('offset', String(pagination.offset));
      }
      if (pagination.limit !== undefined) {
        url.searchParams.append('limit', String(pagination.limit));
      }
    }

    const config = this.buildRequestConfig('GET', url.toString());
    return this.executeRequest<T>('GET', url.toString(), config);
  }

  /**
   * Perform POST request
   */
  async post<T = unknown>(
    endpoint: string,
    data: Record<string, unknown>,
  ): Promise<NetSuiteApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const body = JSON.stringify(data);
    const config = this.buildRequestConfig('POST', url, body);
    config.data = data;
    return this.executeRequest<T>('POST', url, config);
  }

  /**
   * Perform PATCH request
   */
  async patch<T = unknown>(
    endpoint: string,
    data: Record<string, unknown>,
  ): Promise<NetSuiteApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const body = JSON.stringify(data);
    const config = this.buildRequestConfig('PATCH', url, body);
    config.data = data;
    return this.executeRequest<T>('PATCH', url, config);
  }

  /**
   * Perform DELETE request
   */
  async delete(endpoint: string): Promise<void> {
    const url = this.buildUrl(endpoint);
    const config = this.buildRequestConfig('DELETE', url);
    await this.executeRequest('DELETE', url, config);
  }

  /**
   * Execute SuiteQL query
   */
  async executeSuiteQL<T = unknown>(
    query: string,
    pagination?: NetSuitePaginationOptions,
  ): Promise<NetSuiteApiResponse<T>> {
    const url = new URL(this.buildSuiteQLUrl());

    // Add pagination parameters
    if (pagination) {
      if (pagination.offset !== undefined) {
        url.searchParams.append('offset', String(pagination.offset));
      }
      if (pagination.limit !== undefined) {
        url.searchParams.append('limit', String(pagination.limit));
      }
    }

    const body = JSON.stringify({ q: query });
    const config = this.buildRequestConfig('POST', url.toString(), body);
    config.data = { q: query };
    config.headers = {
      ...config.headers,
      Prefer: 'transient',
    };

    return this.executeRequest<T>('POST', url.toString(), config);
  }

  /**
   * Build request configuration with OAuth headers
   */
  private buildRequestConfig(method: string, url: string, body?: string): AxiosRequestConfig {
    const authHeader = this.authService.generateAuthorizationHeader(method, url, body);

    return {
      method,
      url,
      timeout: this.config?.timeout || 30000,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async executeRequest<T>(
    method: string,
    url: string,
    config: AxiosRequestConfig,
    attempt = 1,
  ): Promise<NetSuiteApiResponse<T>> {
    const maxAttempts = this.config?.retryAttempts ?? 3;

    try {
      this.logger.debug(`NetSuite ${method} ${url}`, { attempt });

      const response: AxiosResponse = await firstValueFrom(this.httpService.request(config));

      this.logger.debug(`NetSuite response`, {
        status: response.status,
        hasData: !!response.data,
      });

      return response.data as NetSuiteApiResponse<T>;
    } catch (error) {
      const axiosError = error as AxiosError<NetSuiteErrorResponse>;
      const shouldRetry = this.shouldRetry(axiosError, attempt, maxAttempts);

      if (shouldRetry) {
        const delay = this.calculateBackoff(attempt);
        this.logger.warn(`NetSuite request failed, retrying in ${delay}ms`, {
          attempt,
          status: axiosError.response?.status,
        });

        await this.sleep(delay);
        return this.executeRequest<T>(method, url, config, attempt + 1);
      }

      // Log and rethrow
      this.logger.error(`NetSuite request failed`, {
        method,
        url,
        status: axiosError.response?.status,
        errorCode: axiosError.response?.data?.['o:errorCode'],
        message: axiosError.message,
      });

      throw this.transformError(axiosError);
    }
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: AxiosError, attempt: number, maxAttempts: number): boolean {
    if (attempt >= maxAttempts) {
      return false;
    }

    const status = error.response?.status;

    // Retry on rate limiting (429) and server errors (5xx)
    if (status === 429 || (status && status >= 500)) {
      return true;
    }

    // Retry on network errors
    if (!status && error.code === 'ECONNABORTED') {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const baseDelay = 1000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    // Add jitter
    return delay + Math.random() * 1000;
  }

  /**
   * Transform Axios error to a more informative error
   */
  private transformError(error: AxiosError<NetSuiteErrorResponse>): Error {
    const response = error.response;
    const data = response?.data;

    let message = 'NetSuite API request failed';

    if (data?.['o:errorCode']) {
      message = `NetSuite Error [${data['o:errorCode']}]: `;
      if (data['o:errorDetails']?.length) {
        message += data['o:errorDetails'].map((d) => d.detail).join('; ');
      }
    } else if (data?.status?.statusDetail?.length) {
      const details = data.status.statusDetail;
      message = `NetSuite Error [${details[0].code}]: ${details[0].message}`;
    } else if (data?.title) {
      message = `NetSuite Error: ${data.title}${data.detail ? ` - ${data.detail}` : ''}`;
    } else if (error.message) {
      message = `NetSuite Error: ${error.message}`;
    }

    const err = new Error(message);
    (err as unknown as Record<string, unknown>).statusCode = response?.status;
    (err as unknown as Record<string, unknown>).errorCode =
      data?.['o:errorCode'] || data?.status?.statusDetail?.[0]?.code;
    (err as unknown as Record<string, unknown>).originalError = error;

    return err;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Test connection to NetSuite
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    latencyMs: number;
  }> {
    const startTime = Date.now();

    try {
      // Try to get account info or perform a simple query
      await this.executeSuiteQL('SELECT 1 AS test', { limit: 1 });
      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        message: 'Successfully connected to NetSuite',
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Connection failed';

      return {
        success: false,
        message,
        latencyMs,
      };
    }
  }
}
