import { Injectable, Logger } from '@nestjs/common';
import { SapErrorResponse, SapErrorDetail } from '../interfaces';

/**
 * SAP Error categories
 */
export enum SapErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  BUSINESS_RULE = 'BUSINESS_RULE',
  SYSTEM = 'SYSTEM',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Normalized SAP error
 */
export interface NormalizedSapError {
  code: string;
  message: string;
  category: SapErrorCategory;
  httpStatus: number;
  retryable: boolean;
  retryAfter?: number;
  details?: SapErrorDetail[];
  sapTransactionId?: string;
  sapNote?: string;
  sapTransaction?: string;
  originalError?: SapErrorResponse;
}

/**
 * SAP-specific error codes and their mappings
 */
const SAP_ERROR_MAPPINGS: Record<
  string,
  {
    category: SapErrorCategory;
    httpStatus: number;
    retryable: boolean;
    message?: string;
  }
> = {
  // Authentication errors
  '401': { category: SapErrorCategory.AUTHENTICATION, httpStatus: 401, retryable: false },
  UNAUTHENTICATED: { category: SapErrorCategory.AUTHENTICATION, httpStatus: 401, retryable: false },
  INVALID_TOKEN: { category: SapErrorCategory.AUTHENTICATION, httpStatus: 401, retryable: false },
  TOKEN_EXPIRED: { category: SapErrorCategory.AUTHENTICATION, httpStatus: 401, retryable: true },

  // Authorization errors
  '403': { category: SapErrorCategory.AUTHORIZATION, httpStatus: 403, retryable: false },
  FORBIDDEN: { category: SapErrorCategory.AUTHORIZATION, httpStatus: 403, retryable: false },
  NO_AUTHORIZATION: { category: SapErrorCategory.AUTHORIZATION, httpStatus: 403, retryable: false },

  // Not found errors
  '404': { category: SapErrorCategory.NOT_FOUND, httpStatus: 404, retryable: false },
  NOT_FOUND: { category: SapErrorCategory.NOT_FOUND, httpStatus: 404, retryable: false },

  // Validation errors
  '400': { category: SapErrorCategory.VALIDATION, httpStatus: 400, retryable: false },
  INVALID_INPUT: { category: SapErrorCategory.VALIDATION, httpStatus: 400, retryable: false },
  VALIDATION_ERROR: { category: SapErrorCategory.VALIDATION, httpStatus: 400, retryable: false },

  // Conflict errors
  '409': { category: SapErrorCategory.CONFLICT, httpStatus: 409, retryable: false },
  CONFLICT: { category: SapErrorCategory.CONFLICT, httpStatus: 409, retryable: false },
  OPTIMISTIC_LOCK: { category: SapErrorCategory.CONFLICT, httpStatus: 409, retryable: true },

  // Rate limiting
  '429': { category: SapErrorCategory.RATE_LIMIT, httpStatus: 429, retryable: true },
  RATE_LIMIT_EXCEEDED: { category: SapErrorCategory.RATE_LIMIT, httpStatus: 429, retryable: true },

  // System errors
  '500': { category: SapErrorCategory.SYSTEM, httpStatus: 500, retryable: true },
  '502': { category: SapErrorCategory.SYSTEM, httpStatus: 502, retryable: true },
  '503': { category: SapErrorCategory.SYSTEM, httpStatus: 503, retryable: true },
  '504': { category: SapErrorCategory.TIMEOUT, httpStatus: 504, retryable: true },
  SYSTEM_ERROR: { category: SapErrorCategory.SYSTEM, httpStatus: 500, retryable: true },
  INTERNAL_ERROR: { category: SapErrorCategory.SYSTEM, httpStatus: 500, retryable: true },

  // SAP-specific business errors
  'VA/120': {
    category: SapErrorCategory.BUSINESS_RULE,
    httpStatus: 400,
    retryable: false,
    message: 'Sales order item missing required data',
  },
  'VA/150': {
    category: SapErrorCategory.BUSINESS_RULE,
    httpStatus: 400,
    retryable: false,
    message: 'Customer blocked for sales',
  },
  'VA/160': {
    category: SapErrorCategory.BUSINESS_RULE,
    httpStatus: 400,
    retryable: false,
    message: 'Material not valid for sales organization',
  },
  'V1/525': {
    category: SapErrorCategory.BUSINESS_RULE,
    httpStatus: 400,
    retryable: false,
    message: 'Credit limit exceeded',
  },
  'V4/012': {
    category: SapErrorCategory.BUSINESS_RULE,
    httpStatus: 400,
    retryable: false,
    message: 'Requested delivery date in the past',
  },
  'M7/140': {
    category: SapErrorCategory.BUSINESS_RULE,
    httpStatus: 400,
    retryable: false,
    message: 'Material blocked',
  },
  'M7/141': {
    category: SapErrorCategory.BUSINESS_RULE,
    httpStatus: 400,
    retryable: false,
    message: 'Material marked for deletion',
  },
  'BP/001': {
    category: SapErrorCategory.VALIDATION,
    httpStatus: 400,
    retryable: false,
    message: 'Business partner number already exists',
  },
  'BP/002': {
    category: SapErrorCategory.VALIDATION,
    httpStatus: 400,
    retryable: false,
    message: 'Invalid business partner category',
  },
};

/**
 * SAP Error Handler Service
 * Normalizes and categorizes SAP errors for consistent handling
 */
@Injectable()
export class SapErrorHandlerService {
  private readonly logger = new Logger(SapErrorHandlerService.name);

  /**
   * Normalize a SAP error response
   */
  normalize(error: SapErrorResponse | Error | unknown, httpStatus?: number): NormalizedSapError {
    if (this.isSapErrorResponse(error)) {
      return this.normalizeSapError(error, httpStatus);
    }

    if (error instanceof Error) {
      return this.normalizeStandardError(error, httpStatus);
    }

    return this.normalizeUnknownError(error);
  }

  /**
   * Check if error is a SAP error response
   */
  isSapErrorResponse(error: unknown): error is SapErrorResponse {
    return (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as SapErrorResponse).error === 'object'
    );
  }

  /**
   * Get recommended retry delay based on error
   */
  getRetryDelay(error: NormalizedSapError, attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000;
    const maxDelay = 30000;

    if (error.retryAfter) {
      return error.retryAfter * 1000;
    }

    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

    // Add jitter (±20%)
    const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
    return Math.round(exponentialDelay + jitter);
  }

  /**
   * Check if error should trigger a retry
   */
  shouldRetry(error: NormalizedSapError, attempt: number, maxAttempts: number): boolean {
    if (attempt >= maxAttempts) {
      return false;
    }

    if (!error.retryable) {
      return false;
    }

    // Don't retry certain categories
    if (
      [
        SapErrorCategory.AUTHENTICATION,
        SapErrorCategory.AUTHORIZATION,
        SapErrorCategory.VALIDATION,
        SapErrorCategory.NOT_FOUND,
      ].includes(error.category)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Map error to user-friendly message
   */
  getUserMessage(error: NormalizedSapError): string {
    switch (error.category) {
      case SapErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please check your SAP credentials.';

      case SapErrorCategory.AUTHORIZATION:
        return 'You do not have permission to perform this operation in SAP.';

      case SapErrorCategory.NOT_FOUND:
        return 'The requested resource was not found in SAP.';

      case SapErrorCategory.VALIDATION:
        return `Validation error: ${error.message}`;

      case SapErrorCategory.CONFLICT:
        return 'The resource was modified by another user. Please refresh and try again.';

      case SapErrorCategory.BUSINESS_RULE:
        return `Business rule violation: ${error.message}`;

      case SapErrorCategory.RATE_LIMIT:
        return 'Too many requests. Please wait and try again.';

      case SapErrorCategory.TIMEOUT:
        return 'The request timed out. Please try again.';

      case SapErrorCategory.NETWORK:
        return 'Network error connecting to SAP. Please check connectivity.';

      case SapErrorCategory.SYSTEM:
        return 'A system error occurred in SAP. Please try again later.';

      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  /**
   * Extract validation field errors
   */
  getValidationErrors(error: NormalizedSapError): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {};

    if (!error.details) {
      return fieldErrors;
    }

    for (const detail of error.details) {
      const field = detail.propertyref || detail.target || '_general';
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(detail.message);
    }

    return fieldErrors;
  }

  /**
   * Normalize SAP error response
   */
  private normalizeSapError(sapError: SapErrorResponse, httpStatus?: number): NormalizedSapError {
    const errorCode = sapError.error.code;
    const errorMessage = sapError.error.message?.value || 'Unknown SAP error';
    const innererror = sapError.error.innererror;

    const mapping = SAP_ERROR_MAPPINGS[errorCode] ||
      SAP_ERROR_MAPPINGS[httpStatus?.toString() || ''] || {
        category: SapErrorCategory.UNKNOWN,
        httpStatus: 500,
        retryable: false,
      };

    return {
      code: errorCode,
      message: mapping.message || errorMessage,
      category: mapping.category,
      httpStatus: httpStatus || mapping.httpStatus,
      retryable: mapping.retryable,
      details: innererror?.errordetails,
      sapTransactionId: innererror?.transactionid,
      sapNote: innererror?.Error_Resolution?.SAP_Note,
      sapTransaction: innererror?.Error_Resolution?.SAP_Transaction,
      originalError: sapError,
    };
  }

  /**
   * Normalize standard JavaScript error
   */
  private normalizeStandardError(error: Error, httpStatus?: number): NormalizedSapError {
    const errorWithCode = error as Error & { code?: string; status?: number };
    const code = errorWithCode.code || 'ERROR';
    const status = httpStatus || errorWithCode.status || 500;

    // Check for network errors
    if (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ETIMEDOUT')
    ) {
      return {
        code: 'NETWORK_ERROR',
        message: error.message,
        category: SapErrorCategory.NETWORK,
        httpStatus: 503,
        retryable: true,
      };
    }

    // Check for timeout
    if (error.message.includes('timeout') || code === 'ETIMEDOUT') {
      return {
        code: 'TIMEOUT',
        message: error.message,
        category: SapErrorCategory.TIMEOUT,
        httpStatus: 504,
        retryable: true,
      };
    }

    const mapping = SAP_ERROR_MAPPINGS[code] ||
      SAP_ERROR_MAPPINGS[status.toString()] || {
        category: SapErrorCategory.UNKNOWN,
        httpStatus: status,
        retryable: false,
      };

    return {
      code,
      message: error.message,
      category: mapping.category,
      httpStatus: mapping.httpStatus,
      retryable: mapping.retryable,
    };
  }

  /**
   * Normalize unknown error
   */
  private normalizeUnknownError(error: unknown): NormalizedSapError {
    const message = typeof error === 'string' ? error : 'Unknown error';

    return {
      code: 'UNKNOWN_ERROR',
      message,
      category: SapErrorCategory.UNKNOWN,
      httpStatus: 500,
      retryable: false,
    };
  }

  /**
   * Log error with context
   */
  logError(
    error: NormalizedSapError,
    context?: {
      operation?: string;
      tenantId?: string;
      entityId?: string;
      requestId?: string;
    },
  ): void {
    const logContext = {
      code: error.code,
      category: error.category,
      httpStatus: error.httpStatus,
      retryable: error.retryable,
      sapTransactionId: error.sapTransactionId,
      ...context,
    };

    if (error.category === SapErrorCategory.SYSTEM || error.httpStatus >= 500) {
      this.logger.error(`SAP Error: ${error.message}`, logContext);
    } else if (error.category === SapErrorCategory.BUSINESS_RULE) {
      this.logger.warn(`SAP Business Rule: ${error.message}`, logContext);
    } else {
      this.logger.debug(`SAP Error: ${error.message}`, logContext);
    }
  }
}
