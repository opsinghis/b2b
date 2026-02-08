import { Logger } from '@nestjs/common';

/**
 * NetSuite Error Code Categories
 */
export enum NetSuiteErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Structured NetSuite Error
 */
export interface NetSuiteStructuredError {
  code: string;
  category: NetSuiteErrorCategory;
  message: string;
  details?: string[];
  retryable: boolean;
  suggestedAction?: string;
  originalError?: Error;
}

/**
 * Common NetSuite Error Codes
 */
export const NETSUITE_ERROR_CODES: Record<
  string,
  { category: NetSuiteErrorCategory; retryable: boolean; message: string }
> = {
  // Authentication errors
  INVALID_LOGIN_CREDENTIALS: {
    category: NetSuiteErrorCategory.AUTHENTICATION,
    retryable: false,
    message: 'Invalid login credentials',
  },
  INVALID_CREDENTIALS: {
    category: NetSuiteErrorCategory.AUTHENTICATION,
    retryable: false,
    message: 'Invalid credentials provided',
  },
  SSO_TOKEN_INVALID: {
    category: NetSuiteErrorCategory.AUTHENTICATION,
    retryable: false,
    message: 'SSO token is invalid or expired',
  },
  SESSION_TIMED_OUT: {
    category: NetSuiteErrorCategory.AUTHENTICATION,
    retryable: true,
    message: 'Session has timed out',
  },

  // Authorization errors
  PERMISSION_VIOLATION: {
    category: NetSuiteErrorCategory.AUTHORIZATION,
    retryable: false,
    message: 'Permission denied for this operation',
  },
  INSUFFICIENT_PERMISSION: {
    category: NetSuiteErrorCategory.AUTHORIZATION,
    retryable: false,
    message: 'Insufficient permissions',
  },
  FEATURE_NOT_ENABLED: {
    category: NetSuiteErrorCategory.AUTHORIZATION,
    retryable: false,
    message: 'Required feature is not enabled',
  },

  // Validation errors
  INVALID_FLD_VALUE: {
    category: NetSuiteErrorCategory.VALIDATION,
    retryable: false,
    message: 'Invalid field value',
  },
  MISSING_REQD_FLD: {
    category: NetSuiteErrorCategory.VALIDATION,
    retryable: false,
    message: 'Missing required field',
  },
  INVALID_RCRD_TYPE: {
    category: NetSuiteErrorCategory.VALIDATION,
    retryable: false,
    message: 'Invalid record type',
  },
  INVALID_REF: {
    category: NetSuiteErrorCategory.VALIDATION,
    retryable: false,
    message: 'Invalid reference',
  },
  DUP_RCRD: {
    category: NetSuiteErrorCategory.VALIDATION,
    retryable: false,
    message: 'Duplicate record',
  },
  RCRD_DSNT_EXIST: {
    category: NetSuiteErrorCategory.NOT_FOUND,
    retryable: false,
    message: 'Record does not exist',
  },

  // Rate limiting
  EXCEEDED_MAX_RECORDS: {
    category: NetSuiteErrorCategory.RATE_LIMIT,
    retryable: true,
    message: 'Exceeded maximum records limit',
  },
  EXCEEDED_CONCURRENCY_LIMIT: {
    category: NetSuiteErrorCategory.RATE_LIMIT,
    retryable: true,
    message: 'Exceeded concurrency limit',
  },
  REQUEST_LIMIT_EXCEEDED: {
    category: NetSuiteErrorCategory.RATE_LIMIT,
    retryable: true,
    message: 'Request limit exceeded',
  },

  // Server errors
  UNEXPECTED_ERROR: {
    category: NetSuiteErrorCategory.SERVER_ERROR,
    retryable: true,
    message: 'Unexpected server error',
  },
  SERVER_BUSY: {
    category: NetSuiteErrorCategory.SERVER_ERROR,
    retryable: true,
    message: 'Server is busy',
  },
  SERVICE_UNAVAILABLE: {
    category: NetSuiteErrorCategory.SERVER_ERROR,
    retryable: true,
    message: 'Service is temporarily unavailable',
  },
};

/**
 * NetSuite Error Handler Service
 * Handles error parsing, categorization, and structured error creation
 */
export class NetSuiteErrorHandlerService {
  private readonly logger = new Logger(NetSuiteErrorHandlerService.name);

  /**
   * Parse and structure an error
   */
  parseError(error: unknown): NetSuiteStructuredError {
    // Handle known error types
    if (error instanceof Error) {
      return this.parseErrorInstance(error);
    }

    // Handle raw error objects
    if (typeof error === 'object' && error !== null) {
      return this.parseErrorObject(error as Record<string, unknown>);
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        code: 'UNKNOWN_ERROR',
        category: NetSuiteErrorCategory.UNKNOWN,
        message: error,
        retryable: false,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      category: NetSuiteErrorCategory.UNKNOWN,
      message: 'An unknown error occurred',
      retryable: false,
    };
  }

  /**
   * Parse Error instance
   */
  private parseErrorInstance(error: Error): NetSuiteStructuredError {
    const errorObj = error as Error & {
      statusCode?: number;
      errorCode?: string;
      response?: Record<string, unknown>;
    };

    // Extract error code if available
    const errorCode = errorObj.errorCode || this.extractErrorCodeFromMessage(error.message);

    // Check if it's a known error code
    const knownError = errorCode ? NETSUITE_ERROR_CODES[errorCode] : undefined;

    if (knownError && errorCode) {
      return {
        code: errorCode,
        category: knownError.category,
        message: knownError.message,
        details: [error.message],
        retryable: knownError.retryable,
        suggestedAction: this.getSuggestedAction(knownError.category),
        originalError: error,
      };
    }

    // Categorize by HTTP status code
    if (errorObj.statusCode) {
      return this.categorizeByStatusCode(errorObj.statusCode, error);
    }

    // Default to unknown
    return {
      code: errorCode || 'UNKNOWN_ERROR',
      category: NetSuiteErrorCategory.UNKNOWN,
      message: error.message,
      retryable: false,
      originalError: error,
    };
  }

  /**
   * Parse error object
   */
  private parseErrorObject(error: Record<string, unknown>): NetSuiteStructuredError {
    // Handle NetSuite REST API error format
    const errorCode =
      (error['o:errorCode'] as string) ||
      (error['errorCode'] as string) ||
      (error['code'] as string);

    const errorDetails = error['o:errorDetails'] as Array<{ detail: string }> | undefined;
    const details = errorDetails?.map((d) => d.detail) || [];

    if (error['status']) {
      const status = error['status'] as { statusDetail?: Array<{ code: string; message: string }> };
      if (status.statusDetail?.length) {
        const firstDetail = status.statusDetail[0];
        const knownError = NETSUITE_ERROR_CODES[firstDetail.code];

        return {
          code: firstDetail.code,
          category: knownError?.category || NetSuiteErrorCategory.UNKNOWN,
          message: firstDetail.message,
          details: status.statusDetail.map((d) => d.message),
          retryable: knownError?.retryable || false,
          suggestedAction: knownError ? this.getSuggestedAction(knownError.category) : undefined,
        };
      }
    }

    const knownError = errorCode ? NETSUITE_ERROR_CODES[errorCode] : undefined;

    return {
      code: errorCode || 'UNKNOWN_ERROR',
      category: knownError?.category || NetSuiteErrorCategory.UNKNOWN,
      message:
        (error['title'] as string) ||
        (error['message'] as string) ||
        (error['detail'] as string) ||
        knownError?.message ||
        'Unknown error',
      details,
      retryable: knownError?.retryable || false,
      suggestedAction: knownError ? this.getSuggestedAction(knownError.category) : undefined,
    };
  }

  /**
   * Categorize error by HTTP status code
   */
  private categorizeByStatusCode(statusCode: number, error: Error): NetSuiteStructuredError {
    if (statusCode === 401) {
      return {
        code: 'HTTP_401',
        category: NetSuiteErrorCategory.AUTHENTICATION,
        message: 'Authentication failed',
        details: [error.message],
        retryable: false,
        suggestedAction: 'Check your credentials and re-authenticate',
        originalError: error,
      };
    }

    if (statusCode === 403) {
      return {
        code: 'HTTP_403',
        category: NetSuiteErrorCategory.AUTHORIZATION,
        message: 'Access forbidden',
        details: [error.message],
        retryable: false,
        suggestedAction: 'Check permissions and access rights',
        originalError: error,
      };
    }

    if (statusCode === 404) {
      return {
        code: 'HTTP_404',
        category: NetSuiteErrorCategory.NOT_FOUND,
        message: 'Resource not found',
        details: [error.message],
        retryable: false,
        suggestedAction: 'Verify the resource ID or endpoint',
        originalError: error,
      };
    }

    if (statusCode === 429) {
      return {
        code: 'HTTP_429',
        category: NetSuiteErrorCategory.RATE_LIMIT,
        message: 'Rate limit exceeded',
        details: [error.message],
        retryable: true,
        suggestedAction: 'Wait and retry with exponential backoff',
        originalError: error,
      };
    }

    if (statusCode >= 500) {
      return {
        code: `HTTP_${statusCode}`,
        category: NetSuiteErrorCategory.SERVER_ERROR,
        message: 'Server error',
        details: [error.message],
        retryable: true,
        suggestedAction: 'Retry the request after a delay',
        originalError: error,
      };
    }

    return {
      code: `HTTP_${statusCode}`,
      category: NetSuiteErrorCategory.UNKNOWN,
      message: error.message,
      retryable: false,
      originalError: error,
    };
  }

  /**
   * Extract error code from message
   */
  private extractErrorCodeFromMessage(message: string): string | undefined {
    // Try to extract NetSuite error codes from the message
    const codeMatch = message.match(/\[([A-Z_]+)\]/);
    if (codeMatch) {
      return codeMatch[1];
    }

    // Try other patterns
    const errorCodeMatch = message.match(/Error Code:\s*([A-Z_]+)/i);
    if (errorCodeMatch) {
      return errorCodeMatch[1];
    }

    return undefined;
  }

  /**
   * Get suggested action for error category
   */
  private getSuggestedAction(category: NetSuiteErrorCategory): string {
    const actions: Record<NetSuiteErrorCategory, string> = {
      [NetSuiteErrorCategory.AUTHENTICATION]: 'Check credentials and re-authenticate',
      [NetSuiteErrorCategory.AUTHORIZATION]: 'Verify permissions and access rights',
      [NetSuiteErrorCategory.VALIDATION]: 'Review and correct the input data',
      [NetSuiteErrorCategory.NOT_FOUND]: 'Verify the resource exists and check the ID',
      [NetSuiteErrorCategory.RATE_LIMIT]: 'Wait and retry with exponential backoff',
      [NetSuiteErrorCategory.SERVER_ERROR]: 'Retry the request after a delay',
      [NetSuiteErrorCategory.NETWORK]: 'Check network connectivity and retry',
      [NetSuiteErrorCategory.UNKNOWN]: 'Review the error details and contact support if needed',
    };

    return actions[category];
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: unknown): boolean {
    const structured = this.parseError(error);
    return structured.retryable;
  }

  /**
   * Get retry delay for error
   */
  getRetryDelay(error: unknown, attempt: number): number {
    const structured = this.parseError(error);

    // Rate limit errors need longer delays
    if (structured.category === NetSuiteErrorCategory.RATE_LIMIT) {
      return Math.min(60000, 10000 * Math.pow(2, attempt - 1)); // Max 60s
    }

    // Server errors use standard exponential backoff
    if (structured.category === NetSuiteErrorCategory.SERVER_ERROR) {
      return Math.min(30000, 1000 * Math.pow(2, attempt - 1)); // Max 30s
    }

    // Default backoff
    return Math.min(10000, 1000 * Math.pow(2, attempt - 1)); // Max 10s
  }

  /**
   * Create a user-friendly error message
   */
  getUserFriendlyMessage(error: unknown): string {
    const structured = this.parseError(error);

    switch (structured.category) {
      case NetSuiteErrorCategory.AUTHENTICATION:
        return 'Unable to authenticate with NetSuite. Please check your credentials.';
      case NetSuiteErrorCategory.AUTHORIZATION:
        return 'You do not have permission to perform this operation in NetSuite.';
      case NetSuiteErrorCategory.VALIDATION:
        return `The request contains invalid data: ${structured.message}`;
      case NetSuiteErrorCategory.NOT_FOUND:
        return 'The requested resource was not found in NetSuite.';
      case NetSuiteErrorCategory.RATE_LIMIT:
        return 'NetSuite rate limit exceeded. Please wait a moment and try again.';
      case NetSuiteErrorCategory.SERVER_ERROR:
        return 'NetSuite is experiencing temporary issues. Please try again later.';
      default:
        return structured.message || 'An error occurred while communicating with NetSuite.';
    }
  }
}
