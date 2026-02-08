import { Injectable, Logger } from '@nestjs/common';
import {
  QuickBooksConnectorResult,
  QuickBooksErrorDetail,
  QuickBooksErrorResponse,
} from '../interfaces';
import { AxiosError } from 'axios';

/**
 * QuickBooks error code mappings
 */
export const QuickBooksErrorCodes = {
  // Validation errors (400)
  VALIDATION_ERROR: '2000',
  DUPLICATE_NAME: '6240',
  DUPLICATE_DOC_NUMBER: '6140',
  INVALID_REFERENCE: '2500',
  REQUIRED_FIELD_MISSING: '2010',
  INVALID_FIELD_VALUE: '2050',

  // Authentication errors (401)
  INVALID_TOKEN: '100',
  TOKEN_EXPIRED: '102',
  INVALID_GRANT: '103',

  // Authorization errors (403)
  FORBIDDEN: '403',
  NO_ACCESS: '610',

  // Not found errors (404)
  NOT_FOUND: '404',
  OBJECT_NOT_FOUND: '610',

  // Concurrency errors (409)
  STALE_OBJECT: '3',
  BUSINESS_VALIDATION: '6000',

  // Rate limiting (429)
  THROTTLE: '5',
  RATE_LIMIT_EXCEEDED: '429',

  // Server errors (500, 502, 503, 504)
  INTERNAL_ERROR: '500',
  BAD_GATEWAY: '502',
  SERVICE_UNAVAILABLE: '503',
  GATEWAY_TIMEOUT: '504',
  TEMPORARY_ERROR: '6160',
} as const;

/**
 * Error category for handling strategies
 */
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONCURRENCY = 'CONCURRENCY',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER = 'SERVER',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN',
}

/**
 * QuickBooks Error Handler Service
 * Provides error parsing, categorization, and handling
 */
@Injectable()
export class QuickBooksErrorHandlerService {
  private readonly logger = new Logger(QuickBooksErrorHandlerService.name);

  /**
   * Create error result from exception
   */
  createErrorResult<T>(
    error: unknown,
    requestId: string,
    durationMs: number,
  ): QuickBooksConnectorResult<T> {
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
   * Parse error into standardized format
   */
  parseError(error: unknown): {
    code: string;
    message: string;
    details?: QuickBooksErrorDetail[];
    category: ErrorCategory;
    retryable: boolean;
  } {
    // Handle Axios errors
    if (this.isAxiosError(error)) {
      return this.parseAxiosError(error);
    }

    // Handle QuickBooks error response
    if (this.isQuickBooksErrorResponse(error)) {
      return this.parseQuickBooksError(error);
    }

    // Handle standard Error
    if (error instanceof Error) {
      return {
        code: 'CONNECTOR_ERROR',
        message: error.message,
        category: ErrorCategory.UNKNOWN,
        retryable: false,
      };
    }

    // Unknown error
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      category: ErrorCategory.UNKNOWN,
      retryable: false,
    };
  }

  /**
   * Parse Axios error
   */
  private parseAxiosError(error: AxiosError<QuickBooksErrorResponse>): {
    code: string;
    message: string;
    details?: QuickBooksErrorDetail[];
    category: ErrorCategory;
    retryable: boolean;
  } {
    const status = error.response?.status;
    const errorResponse = error.response?.data;
    const fault = errorResponse?.Fault;
    const errors = fault?.Error || [];

    const errorCode = errors[0]?.code || String(status) || 'UNKNOWN';
    const message = errors[0]?.Message || errors[0]?.Detail || error.message;
    const category = this.categorizeError(errorCode, status);
    const retryable = this.isRetryable(category, errorCode);

    return {
      code: errorCode,
      message,
      details: errors,
      category,
      retryable,
    };
  }

  /**
   * Parse QuickBooks error response
   */
  private parseQuickBooksError(error: QuickBooksErrorResponse): {
    code: string;
    message: string;
    details?: QuickBooksErrorDetail[];
    category: ErrorCategory;
    retryable: boolean;
  } {
    const errors = error.Fault?.Error || [];
    const errorCode = errors[0]?.code || 'UNKNOWN';
    const message = errors[0]?.Message || errors[0]?.Detail || 'QuickBooks error';
    const category = this.categorizeError(errorCode);
    const retryable = this.isRetryable(category, errorCode);

    return {
      code: errorCode,
      message,
      details: errors,
      category,
      retryable,
    };
  }

  /**
   * Categorize error based on code and status
   */
  categorizeError(errorCode: string, status?: number): ErrorCategory {
    // Status-based categorization
    if (status) {
      if (status === 400) return ErrorCategory.VALIDATION;
      if (status === 401) return ErrorCategory.AUTHENTICATION;
      if (status === 403) return ErrorCategory.AUTHORIZATION;
      if (status === 404) return ErrorCategory.NOT_FOUND;
      if (status === 409) return ErrorCategory.CONCURRENCY;
      if (status === 429) return ErrorCategory.RATE_LIMIT;
      if (status >= 500) return ErrorCategory.SERVER;
    }

    // Error code based categorization
    switch (errorCode) {
      case QuickBooksErrorCodes.VALIDATION_ERROR:
      case QuickBooksErrorCodes.DUPLICATE_NAME:
      case QuickBooksErrorCodes.DUPLICATE_DOC_NUMBER:
      case QuickBooksErrorCodes.INVALID_REFERENCE:
      case QuickBooksErrorCodes.REQUIRED_FIELD_MISSING:
      case QuickBooksErrorCodes.INVALID_FIELD_VALUE:
        return ErrorCategory.VALIDATION;

      case QuickBooksErrorCodes.INVALID_TOKEN:
      case QuickBooksErrorCodes.TOKEN_EXPIRED:
      case QuickBooksErrorCodes.INVALID_GRANT:
        return ErrorCategory.AUTHENTICATION;

      case QuickBooksErrorCodes.FORBIDDEN:
      case QuickBooksErrorCodes.NO_ACCESS:
        return ErrorCategory.AUTHORIZATION;

      case QuickBooksErrorCodes.NOT_FOUND:
      case QuickBooksErrorCodes.OBJECT_NOT_FOUND:
        return ErrorCategory.NOT_FOUND;

      case QuickBooksErrorCodes.STALE_OBJECT:
      case QuickBooksErrorCodes.BUSINESS_VALIDATION:
        return ErrorCategory.CONCURRENCY;

      case QuickBooksErrorCodes.THROTTLE:
      case QuickBooksErrorCodes.RATE_LIMIT_EXCEEDED:
        return ErrorCategory.RATE_LIMIT;

      case QuickBooksErrorCodes.INTERNAL_ERROR:
      case QuickBooksErrorCodes.BAD_GATEWAY:
      case QuickBooksErrorCodes.SERVICE_UNAVAILABLE:
      case QuickBooksErrorCodes.GATEWAY_TIMEOUT:
      case QuickBooksErrorCodes.TEMPORARY_ERROR:
        return ErrorCategory.SERVER;

      default:
        return ErrorCategory.UNKNOWN;
    }
  }

  /**
   * Determine if error is retryable
   */
  isRetryable(category: ErrorCategory, errorCode?: string): boolean {
    // Categories that are always retryable
    if (
      [ErrorCategory.RATE_LIMIT, ErrorCategory.SERVER, ErrorCategory.NETWORK].includes(category)
    ) {
      return true;
    }

    // Stale object errors are retryable after refresh
    if (errorCode === QuickBooksErrorCodes.STALE_OBJECT) {
      return true;
    }

    // Authentication errors might be retryable after token refresh
    if (
      category === ErrorCategory.AUTHENTICATION &&
      errorCode === QuickBooksErrorCodes.TOKEN_EXPIRED
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get retry delay based on error category
   */
  getRetryDelay(category: ErrorCategory, attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 60 seconds

    // Rate limit: longer backoff
    if (category === ErrorCategory.RATE_LIMIT) {
      // QuickBooks recommends waiting at least 1 minute
      return Math.min(60000 * Math.pow(2, attempt - 1), 300000);
    }

    // Server errors: exponential backoff
    if (category === ErrorCategory.SERVER) {
      return Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    }

    // Default: exponential backoff
    return Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  }

  /**
   * Format error for logging
   */
  formatErrorForLogging(error: unknown): string {
    const parsed = this.parseError(error);
    return `[${parsed.category}] ${parsed.code}: ${parsed.message}`;
  }

  /**
   * Check if error is Axios error
   */
  private isAxiosError(error: unknown): error is AxiosError<QuickBooksErrorResponse> {
    return (error as AxiosError).isAxiosError === true;
  }

  /**
   * Check if error is QuickBooks error response
   */
  private isQuickBooksErrorResponse(error: unknown): error is QuickBooksErrorResponse {
    return typeof error === 'object' && error !== null && 'Fault' in error;
  }

  /**
   * Create user-friendly error message
   */
  createUserFriendlyMessage(error: unknown): string {
    const parsed = this.parseError(error);

    switch (parsed.category) {
      case ErrorCategory.VALIDATION:
        return `Validation error: ${parsed.message}. Please check your input and try again.`;

      case ErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please reconnect your QuickBooks account.';

      case ErrorCategory.AUTHORIZATION:
        return 'You do not have permission to perform this action in QuickBooks.';

      case ErrorCategory.NOT_FOUND:
        return 'The requested item was not found in QuickBooks.';

      case ErrorCategory.CONCURRENCY:
        return 'The data was modified by another user. Please refresh and try again.';

      case ErrorCategory.RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.';

      case ErrorCategory.SERVER:
        return 'QuickBooks is temporarily unavailable. Please try again later.';

      case ErrorCategory.NETWORK:
        return 'Network error. Please check your connection and try again.';

      default:
        return `An error occurred: ${parsed.message}`;
    }
  }
}
