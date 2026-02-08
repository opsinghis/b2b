import { Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { OracleConnectorResult, OracleErrorResponse, OracleErrorDetail } from '../interfaces';

/**
 * Oracle ERP Cloud Error Categories
 */
export enum OracleErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Retryable error codes
 */
const RETRYABLE_ERROR_CODES = [
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ENOTFOUND',
  'ENETUNREACH',
  'EAI_AGAIN',
];

const RETRYABLE_HTTP_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Oracle ERP Cloud Error Handler Service
 * Handles error parsing, categorization, and result creation
 */
@Injectable()
export class OracleErrorHandlerService {
  private readonly logger = new Logger(OracleErrorHandlerService.name);

  /**
   * Create error result from any error
   */
  createErrorResult<T>(
    error: unknown,
    requestId: string,
    durationMs: number,
  ): OracleConnectorResult<T> {
    const parsedError = this.parseError(error);

    return {
      success: false,
      error: {
        code: parsedError.code,
        message: parsedError.message,
        details: parsedError.details,
        retryable: parsedError.retryable,
        requestId,
      },
      metadata: {
        requestId,
        durationMs,
      },
    };
  }

  /**
   * Parse error into structured format
   */
  parseError(error: unknown): {
    code: string;
    message: string;
    details?: OracleErrorDetail[];
    category: OracleErrorCategory;
    retryable: boolean;
    statusCode?: number;
  } {
    // Handle Axios errors
    if (this.isAxiosError(error)) {
      return this.parseAxiosError(error);
    }

    // Handle native errors
    if (error instanceof Error) {
      return this.parseNativeError(error);
    }

    // Handle unknown errors
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      category: OracleErrorCategory.UNKNOWN,
      retryable: false,
    };
  }

  /**
   * Check if error is an Axios error
   */
  private isAxiosError(error: unknown): error is AxiosError<OracleErrorResponse> {
    return (
      typeof error === 'object' &&
      error !== null &&
      'isAxiosError' in error &&
      (error as AxiosError).isAxiosError === true
    );
  }

  /**
   * Parse Axios error
   */
  private parseAxiosError(error: AxiosError<OracleErrorResponse>): {
    code: string;
    message: string;
    details?: OracleErrorDetail[];
    category: OracleErrorCategory;
    retryable: boolean;
    statusCode?: number;
  } {
    const statusCode = error.response?.status;
    const responseData = error.response?.data;

    // Parse Oracle error response
    if (responseData) {
      const oracleError = this.parseOracleErrorResponse(responseData);
      const category = this.categorizeHttpError(statusCode);
      const retryable = this.isRetryableHttpError(statusCode, error.code);

      return {
        code: oracleError.code,
        message: oracleError.message,
        details: oracleError.details,
        category,
        retryable,
        statusCode,
      };
    }

    // Handle network errors
    if (error.code) {
      return this.parseNetworkError(error.code, error.message);
    }

    // Handle timeout
    if (error.message?.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: 'Request timed out',
        category: OracleErrorCategory.TIMEOUT,
        retryable: true,
        statusCode,
      };
    }

    return {
      code: 'HTTP_ERROR',
      message: error.message || 'HTTP request failed',
      category: this.categorizeHttpError(statusCode),
      retryable: this.isRetryableHttpError(statusCode, error.code),
      statusCode,
    };
  }

  /**
   * Parse Oracle error response format
   */
  private parseOracleErrorResponse(response: OracleErrorResponse): {
    code: string;
    message: string;
    details?: OracleErrorDetail[];
  } {
    // Oracle REST API error format
    if (response['o:errorCode']) {
      return {
        code: response['o:errorCode'],
        message: response.detail || response.title || 'Oracle API error',
        details: response['o:errorDetails'],
      };
    }

    // Standard HTTP error format
    if (response.title || response.detail) {
      return {
        code: `HTTP_${response.status || 'ERROR'}`,
        message: response.detail || response.title || 'Request failed',
        details: response['o:errorDetails'],
      };
    }

    // Fallback for unknown format
    return {
      code: 'ORACLE_ERROR',
      message: JSON.stringify(response).slice(0, 500),
    };
  }

  /**
   * Parse native JavaScript error
   */
  private parseNativeError(error: Error): {
    code: string;
    message: string;
    category: OracleErrorCategory;
    retryable: boolean;
  } {
    // Check for network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: error.message,
        category: OracleErrorCategory.NETWORK,
        retryable: true,
      };
    }

    return {
      code: error.name || 'ERROR',
      message: error.message,
      category: OracleErrorCategory.UNKNOWN,
      retryable: false,
    };
  }

  /**
   * Parse network error code
   */
  private parseNetworkError(
    code: string,
    message: string,
  ): {
    code: string;
    message: string;
    category: OracleErrorCategory;
    retryable: boolean;
  } {
    const retryable = RETRYABLE_ERROR_CODES.includes(code);

    switch (code) {
      case 'ECONNREFUSED':
        return {
          code: 'CONNECTION_REFUSED',
          message: 'Connection refused by server',
          category: OracleErrorCategory.NETWORK,
          retryable: true,
        };

      case 'ECONNRESET':
        return {
          code: 'CONNECTION_RESET',
          message: 'Connection was reset',
          category: OracleErrorCategory.NETWORK,
          retryable: true,
        };

      case 'ETIMEDOUT':
        return {
          code: 'TIMEOUT',
          message: 'Connection timed out',
          category: OracleErrorCategory.TIMEOUT,
          retryable: true,
        };

      case 'ENOTFOUND':
        return {
          code: 'DNS_ERROR',
          message: 'DNS lookup failed',
          category: OracleErrorCategory.NETWORK,
          retryable: true,
        };

      default:
        return {
          code: `NETWORK_${code}`,
          message: message || `Network error: ${code}`,
          category: OracleErrorCategory.NETWORK,
          retryable,
        };
    }
  }

  /**
   * Categorize HTTP error by status code
   */
  private categorizeHttpError(statusCode?: number): OracleErrorCategory {
    if (!statusCode) {
      return OracleErrorCategory.UNKNOWN;
    }

    switch (true) {
      case statusCode === 401:
        return OracleErrorCategory.AUTHENTICATION;
      case statusCode === 403:
        return OracleErrorCategory.AUTHORIZATION;
      case statusCode === 404:
        return OracleErrorCategory.NOT_FOUND;
      case statusCode === 409:
        return OracleErrorCategory.CONFLICT;
      case statusCode === 429:
        return OracleErrorCategory.RATE_LIMIT;
      case statusCode >= 400 && statusCode < 500:
        return OracleErrorCategory.VALIDATION;
      case statusCode >= 500:
        return OracleErrorCategory.SERVER_ERROR;
      default:
        return OracleErrorCategory.UNKNOWN;
    }
  }

  /**
   * Check if HTTP error is retryable
   */
  private isRetryableHttpError(statusCode?: number, errorCode?: string): boolean {
    if (errorCode && RETRYABLE_ERROR_CODES.includes(errorCode)) {
      return true;
    }

    if (statusCode && RETRYABLE_HTTP_CODES.includes(statusCode)) {
      return true;
    }

    return false;
  }

  /**
   * Format error for logging
   */
  formatErrorForLogging(error: unknown): string {
    if (this.isAxiosError(error)) {
      const parts = [
        `Status: ${error.response?.status || 'N/A'}`,
        `Method: ${error.config?.method?.toUpperCase() || 'N/A'}`,
        `URL: ${error.config?.url || 'N/A'}`,
        `Message: ${error.message}`,
      ];

      if (error.response?.data) {
        parts.push(`Response: ${JSON.stringify(error.response.data).slice(0, 500)}`);
      }

      return parts.join(' | ');
    }

    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }

    return String(error);
  }

  /**
   * Log error with context
   */
  logError(error: unknown, operation: string, context?: Record<string, unknown>): void {
    const formatted = this.formatErrorForLogging(error);
    const parsed = this.parseError(error);

    this.logger.error(`Oracle API error in ${operation}: ${formatted}`, {
      operation,
      category: parsed.category,
      code: parsed.code,
      retryable: parsed.retryable,
      ...context,
    });
  }

  /**
   * Should retry request based on error
   */
  shouldRetry(error: unknown, attemptNumber: number, maxAttempts: number): boolean {
    if (attemptNumber >= maxAttempts) {
      return false;
    }

    const parsed = this.parseError(error);
    return parsed.retryable;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(
    attemptNumber: number,
    baseDelayMs: number = 1000,
    maxDelayMs: number = 30000,
  ): number {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attemptNumber), maxDelayMs);

    // Add jitter (0-25% of delay)
    const jitter = Math.random() * 0.25 * exponentialDelay;

    return Math.floor(exponentialDelay + jitter);
  }
}
