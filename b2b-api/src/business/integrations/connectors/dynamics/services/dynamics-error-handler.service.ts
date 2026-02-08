import { Injectable, Logger } from '@nestjs/common';
import { DynamicsErrorResponse, DynamicsErrorDetail, DynamicsConnectorResult } from '../interfaces';

/**
 * Known Dynamics 365 error codes
 */
export const DynamicsErrorCodes = {
  // Authentication errors
  INVALID_TOKEN: 'InvalidAuthenticationToken',
  TOKEN_EXPIRED: 'ExpiredToken',
  UNAUTHORIZED: 'Unauthorized',

  // Permission errors
  PRIVILEGE_DENIED: 'PrivilegeDenied',
  ACCESS_DENIED: 'AccessDenied',
  INSUFFICIENT_PERMISSIONS: 'InsufficientPermissions',

  // Resource errors
  OBJECT_NOT_FOUND: 'ObjectNotFound',
  OBJECT_DOES_NOT_EXIST: 'ObjectDoesNotExist',
  RECORD_NOT_FOUND: '0x80040217',
  ENTITY_NOT_FOUND: 'EntityNotFound',

  // Validation errors
  INVALID_ARGUMENT: 'InvalidArgument',
  VALIDATION_ERROR: 'ValidationError',
  REQUIRED_FIELD_MISSING: 'RequiredFieldMissing',
  INVALID_OBJECT_ID: 'InvalidObjectId',
  DUPLICATE_RECORD: 'DuplicateRecord',

  // Concurrency errors
  OPTIMISTIC_CONCURRENCY: 'OptimisticConcurrencyViolation',
  RECORD_UPDATED_EXTERNALLY: '0x80040237',

  // Rate limiting
  THROTTLED: 'Throttled',
  RATE_LIMIT: 'RateLimitExceeded',
  SERVICE_UNAVAILABLE: 'ServiceUnavailable',

  // Business logic errors
  BUSINESS_PROCESS_ERROR: 'BusinessProcessError',
  WORKFLOW_ERROR: 'WorkflowError',
  PLUGIN_ERROR: 'PluginError',
} as const;

export interface ParsedDynamicsError {
  code: string;
  message: string;
  isRetryable: boolean;
  category:
    | 'auth'
    | 'permission'
    | 'notfound'
    | 'validation'
    | 'concurrency'
    | 'ratelimit'
    | 'business'
    | 'unknown';
  details?: DynamicsErrorDetail[];
  suggestion?: string;
}

/**
 * Dynamics 365 Error Handler Service
 * Handles error parsing, categorization, and retry logic
 */
@Injectable()
export class DynamicsErrorHandlerService {
  private readonly logger = new Logger(DynamicsErrorHandlerService.name);

  /**
   * Parse Dynamics error response into structured error
   */
  parseError(errorResponse: DynamicsErrorResponse | unknown): ParsedDynamicsError {
    // Handle string error
    if (typeof errorResponse === 'string') {
      return {
        code: 'UNKNOWN_ERROR',
        message: errorResponse,
        isRetryable: false,
        category: 'unknown',
      };
    }

    // Handle Dynamics error response format
    const dynamicsError = errorResponse as DynamicsErrorResponse;
    if (dynamicsError?.error) {
      const error = dynamicsError.error;
      const code = error.code || 'UNKNOWN_ERROR';
      const message = error.message || 'An unknown error occurred';

      const category = this.categorizeError(code);
      const isRetryable = this.isRetryableError(code, category);

      return {
        code,
        message,
        isRetryable,
        category,
        details: this.extractErrorDetails(error),
        suggestion: this.getSuggestion(code, category),
      };
    }

    // Handle generic error
    const genericError = errorResponse as Error;
    return {
      code: 'UNKNOWN_ERROR',
      message: genericError?.message || 'An unknown error occurred',
      isRetryable: false,
      category: 'unknown',
    };
  }

  /**
   * Categorize error by code
   */
  private categorizeError(
    code: string,
  ):
    | 'auth'
    | 'permission'
    | 'notfound'
    | 'validation'
    | 'concurrency'
    | 'ratelimit'
    | 'business'
    | 'unknown' {
    const upperCode = code.toUpperCase();

    // Authentication errors
    if (
      upperCode.includes('TOKEN') ||
      upperCode.includes('AUTH') ||
      code === DynamicsErrorCodes.INVALID_TOKEN ||
      code === DynamicsErrorCodes.TOKEN_EXPIRED
    ) {
      return 'auth';
    }

    // Permission errors
    if (
      upperCode.includes('PRIVILEGE') ||
      upperCode.includes('PERMISSION') ||
      upperCode.includes('DENIED') ||
      code === DynamicsErrorCodes.PRIVILEGE_DENIED ||
      code === DynamicsErrorCodes.ACCESS_DENIED
    ) {
      return 'permission';
    }

    // Not found errors
    if (
      upperCode.includes('NOTFOUND') ||
      upperCode.includes('DOES_NOT_EXIST') ||
      code === DynamicsErrorCodes.OBJECT_NOT_FOUND ||
      code === DynamicsErrorCodes.OBJECT_DOES_NOT_EXIST ||
      code === DynamicsErrorCodes.RECORD_NOT_FOUND
    ) {
      return 'notfound';
    }

    // Validation errors
    if (
      upperCode.includes('VALIDATION') ||
      upperCode.includes('INVALID') ||
      upperCode.includes('REQUIRED') ||
      upperCode.includes('DUPLICATE') ||
      code === DynamicsErrorCodes.INVALID_ARGUMENT ||
      code === DynamicsErrorCodes.DUPLICATE_RECORD
    ) {
      return 'validation';
    }

    // Concurrency errors
    if (
      upperCode.includes('CONCURRENCY') ||
      code === DynamicsErrorCodes.OPTIMISTIC_CONCURRENCY ||
      code === DynamicsErrorCodes.RECORD_UPDATED_EXTERNALLY
    ) {
      return 'concurrency';
    }

    // Rate limit errors
    if (
      upperCode.includes('THROTTL') ||
      upperCode.includes('RATE') ||
      upperCode.includes('UNAVAILABLE') ||
      code === DynamicsErrorCodes.THROTTLED ||
      code === DynamicsErrorCodes.RATE_LIMIT
    ) {
      return 'ratelimit';
    }

    // Business logic errors
    if (
      upperCode.includes('BUSINESS') ||
      upperCode.includes('WORKFLOW') ||
      upperCode.includes('PLUGIN') ||
      code === DynamicsErrorCodes.BUSINESS_PROCESS_ERROR ||
      code === DynamicsErrorCodes.WORKFLOW_ERROR
    ) {
      return 'business';
    }

    return 'unknown';
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(
    code: string,
    category:
      | 'auth'
      | 'permission'
      | 'notfound'
      | 'validation'
      | 'concurrency'
      | 'ratelimit'
      | 'business'
      | 'unknown',
  ): boolean {
    // Rate limit and service unavailable are retryable
    if (category === 'ratelimit') {
      return true;
    }

    // Auth errors may be retryable (token refresh)
    if (code === DynamicsErrorCodes.TOKEN_EXPIRED || code === DynamicsErrorCodes.INVALID_TOKEN) {
      return true;
    }

    // Concurrency errors may be retryable (refetch and retry)
    if (category === 'concurrency') {
      return true;
    }

    // Not retryable: validation, permission, not found, business errors
    return false;
  }

  /**
   * Extract error details from Dynamics error
   */
  private extractErrorDetails(
    error: DynamicsErrorResponse['error'],
  ): DynamicsErrorDetail[] | undefined {
    if (!error.innererror) return undefined;

    const details: DynamicsErrorDetail[] = [];

    if (error.innererror.message) {
      details.push({
        code: error.code,
        message: error.innererror.message,
      });
    }

    if (error.innererror.internalexception?.message) {
      details.push({
        code: 'INTERNAL_EXCEPTION',
        message: error.innererror.internalexception.message,
      });
    }

    return details.length > 0 ? details : undefined;
  }

  /**
   * Get suggestion for error resolution
   */
  private getSuggestion(
    code: string,
    category:
      | 'auth'
      | 'permission'
      | 'notfound'
      | 'validation'
      | 'concurrency'
      | 'ratelimit'
      | 'business'
      | 'unknown',
  ): string | undefined {
    switch (category) {
      case 'auth':
        return 'Check Azure AD credentials and ensure the token is valid. Token may need to be refreshed.';

      case 'permission':
        return 'Verify the application has the required security roles and privileges in Dynamics 365.';

      case 'notfound':
        return 'The requested record does not exist or has been deleted. Verify the entity ID.';

      case 'validation':
        if (code === DynamicsErrorCodes.DUPLICATE_RECORD) {
          return 'A record with the same unique identifier already exists.';
        }
        return 'Check the request payload for missing required fields or invalid values.';

      case 'concurrency':
        return 'The record was modified by another user. Refresh the data and try again.';

      case 'ratelimit':
        return 'API rate limit exceeded. Wait and retry with exponential backoff.';

      case 'business':
        return 'A business rule or workflow prevented the operation. Check Dynamics 365 customizations.';

      default:
        return undefined;
    }
  }

  /**
   * Create a standardized connector result from an error
   */
  createErrorResult<T>(
    error: unknown,
    requestId: string,
    durationMs: number,
  ): DynamicsConnectorResult<T> {
    const parsed = this.parseError(error);

    return {
      success: false,
      error: {
        code: parsed.code,
        message: parsed.message,
        details: parsed.details,
        retryable: parsed.isRetryable,
        requestId,
      },
      metadata: {
        requestId,
        durationMs,
      },
    };
  }

  /**
   * Check if we should retry based on error
   */
  shouldRetry(error: DynamicsConnectorResult<unknown>): boolean {
    return error.error?.retryable === true;
  }

  /**
   * Get recommended retry delay in milliseconds
   */
  getRetryDelay(attemptNumber: number, category: string): number {
    const baseDelay = category === 'ratelimit' ? 30000 : 1000;
    const maxDelay = category === 'ratelimit' ? 300000 : 30000;

    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 1000;

    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Log error with appropriate level
   */
  logError(error: ParsedDynamicsError, context?: string): void {
    const logMessage = context
      ? `[${context}] ${error.code}: ${error.message}`
      : `${error.code}: ${error.message}`;

    switch (error.category) {
      case 'auth':
      case 'permission':
        this.logger.warn(logMessage);
        break;

      case 'notfound':
        this.logger.debug(logMessage);
        break;

      case 'validation':
        this.logger.warn(logMessage);
        break;

      case 'ratelimit':
        this.logger.warn(logMessage);
        break;

      default:
        this.logger.error(logMessage);
    }
  }
}
