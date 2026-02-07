import { Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { ErrorMappingRule } from '../interfaces';
import { JsonPathMapperService } from './json-path-mapper.service';

/**
 * Mapped error result
 */
export interface MappedError {
  code: string;
  message: string;
  originalCode?: string;
  originalMessage?: string;
  statusCode?: number;
  retryable: boolean;
  details?: unknown;
}

/**
 * Default error codes
 */
export const DEFAULT_ERROR_CODES = {
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Error Mapper Service
 * Handles error mapping and transformation for REST responses
 */
@Injectable()
export class ErrorMapperService {
  private readonly logger = new Logger(ErrorMapperService.name);

  constructor(private readonly jsonPathMapper: JsonPathMapperService) {}

  /**
   * Map an error response using configured rules
   */
  mapError(
    error: AxiosError | Error,
    rules: ErrorMappingRule[],
    responseData?: unknown,
  ): MappedError {
    // Handle Axios errors
    if (this.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const responseBody = error.response?.data || responseData;

      // Try to match a rule
      for (const rule of rules) {
        if (this.matchesRule(rule, statusCode, responseBody)) {
          return this.applyRule(rule, statusCode, responseBody);
        }
      }

      // Use default mapping based on status code
      return this.mapByStatusCode(statusCode, responseBody);
    }

    // Handle network/connection errors
    if (this.isNetworkError(error)) {
      return {
        code: DEFAULT_ERROR_CODES.CONNECTION_ERROR,
        message: 'Failed to connect to the server',
        originalMessage: error.message,
        retryable: true,
      };
    }

    // Handle timeout errors
    if (this.isTimeoutError(error)) {
      return {
        code: DEFAULT_ERROR_CODES.TIMEOUT_ERROR,
        message: 'Request timed out',
        originalMessage: error.message,
        retryable: true,
      };
    }

    // Unknown error
    return {
      code: DEFAULT_ERROR_CODES.UNKNOWN_ERROR,
      message: error.message || 'An unknown error occurred',
      originalMessage: error.message,
      retryable: false,
    };
  }

  /**
   * Check if error matches a rule
   */
  private matchesRule(
    rule: ErrorMappingRule,
    statusCode?: number,
    responseData?: unknown,
  ): boolean {
    // Match by status code
    if (rule.statusCode !== undefined && statusCode !== undefined) {
      const codes = Array.isArray(rule.statusCode) ? rule.statusCode : [rule.statusCode];
      if (!codes.includes(statusCode)) {
        return false;
      }
    }

    // Match by status range
    if (rule.statusRange && statusCode !== undefined) {
      if (statusCode < rule.statusRange.min || statusCode > rule.statusRange.max) {
        return false;
      }
    }

    // Match by error code in response
    if (rule.errorCodePath && rule.errorCodeMatch && responseData) {
      const errorCode = this.jsonPathMapper.extractValue(responseData, rule.errorCodePath);
      if (errorCode) {
        const codes = Array.isArray(rule.errorCodeMatch) ? rule.errorCodeMatch : [rule.errorCodeMatch];
        if (!codes.includes(String(errorCode))) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Apply a matching rule to create the mapped error
   */
  private applyRule(
    rule: ErrorMappingRule,
    statusCode?: number,
    responseData?: unknown,
  ): MappedError {
    let message = rule.defaultMessage || 'An error occurred';
    let originalCode: string | undefined;

    // Extract message from response
    if (rule.messagePath && responseData) {
      const extractedMessage = this.jsonPathMapper.extractValue(responseData, rule.messagePath);
      if (extractedMessage) {
        message = String(extractedMessage);
      }
    }

    // Extract original error code
    if (rule.errorCodePath && responseData) {
      const code = this.jsonPathMapper.extractValue(responseData, rule.errorCodePath);
      if (code) {
        originalCode = String(code);
      }
    }

    return {
      code: rule.mappedCode || DEFAULT_ERROR_CODES.UNKNOWN_ERROR,
      message,
      originalCode,
      originalMessage: message,
      statusCode,
      retryable: rule.retryable ?? this.isRetryableStatusCode(statusCode),
      details: responseData,
    };
  }

  /**
   * Map error by HTTP status code (default behavior)
   */
  private mapByStatusCode(statusCode?: number, responseData?: unknown): MappedError {
    const message = this.extractErrorMessage(responseData);

    if (!statusCode) {
      return {
        code: DEFAULT_ERROR_CODES.UNKNOWN_ERROR,
        message: message || 'An unknown error occurred',
        retryable: false,
        details: responseData,
      };
    }

    // 4xx Client Errors
    if (statusCode === 400) {
      return {
        code: DEFAULT_ERROR_CODES.VALIDATION_ERROR,
        message: message || 'Bad request',
        statusCode,
        retryable: false,
        details: responseData,
      };
    }

    if (statusCode === 401) {
      return {
        code: DEFAULT_ERROR_CODES.AUTHENTICATION_ERROR,
        message: message || 'Authentication required',
        statusCode,
        retryable: false,
        details: responseData,
      };
    }

    if (statusCode === 403) {
      return {
        code: DEFAULT_ERROR_CODES.AUTHORIZATION_ERROR,
        message: message || 'Access denied',
        statusCode,
        retryable: false,
        details: responseData,
      };
    }

    if (statusCode === 404) {
      return {
        code: DEFAULT_ERROR_CODES.NOT_FOUND_ERROR,
        message: message || 'Resource not found',
        statusCode,
        retryable: false,
        details: responseData,
      };
    }

    if (statusCode === 429) {
      return {
        code: DEFAULT_ERROR_CODES.RATE_LIMIT_ERROR,
        message: message || 'Rate limit exceeded',
        statusCode,
        retryable: true,
        details: responseData,
      };
    }

    if (statusCode >= 400 && statusCode < 500) {
      return {
        code: DEFAULT_ERROR_CODES.VALIDATION_ERROR,
        message: message || `Client error (${statusCode})`,
        statusCode,
        retryable: false,
        details: responseData,
      };
    }

    // 5xx Server Errors
    if (statusCode >= 500) {
      return {
        code: DEFAULT_ERROR_CODES.SERVER_ERROR,
        message: message || `Server error (${statusCode})`,
        statusCode,
        retryable: this.isRetryableStatusCode(statusCode),
        details: responseData,
      };
    }

    return {
      code: DEFAULT_ERROR_CODES.UNKNOWN_ERROR,
      message: message || `Unexpected status code: ${statusCode}`,
      statusCode,
      retryable: false,
      details: responseData,
    };
  }

  /**
   * Extract error message from response data
   */
  private extractErrorMessage(data: unknown): string | undefined {
    if (!data) return undefined;

    // Try common error message paths
    const paths = [
      '$.message',
      '$.error.message',
      '$.error',
      '$.errors[0].message',
      '$.errors[0]',
      '$.detail',
      '$.details',
      '$.msg',
      '$.reason',
    ];

    for (const path of paths) {
      const value = this.jsonPathMapper.extractValue(data, path);
      if (value && typeof value === 'string') {
        return value;
      }
    }

    // If data is a string, use it directly
    if (typeof data === 'string') {
      return data;
    }

    return undefined;
  }

  /**
   * Check if error is an Axios error
   */
  private isAxiosError(error: unknown): error is AxiosError {
    return (error as AxiosError).isAxiosError === true;
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('econnreset') ||
      message.includes('socket')
    );
  }

  /**
   * Check if error is a timeout error
   */
  private isTimeoutError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('timeout') || message.includes('etimedout');
  }

  /**
   * Determine if status code is retryable
   */
  isRetryableStatusCode(statusCode?: number): boolean {
    if (!statusCode) return false;

    // Retryable server errors
    const retryableCodes = [408, 429, 500, 502, 503, 504];
    return retryableCodes.includes(statusCode);
  }

  /**
   * Get retry delay from response headers
   */
  getRetryDelay(headers: Record<string, string>): number | undefined {
    // Check Retry-After header
    const retryAfter = headers['retry-after'] || headers['Retry-After'];
    if (retryAfter) {
      // Can be seconds or HTTP date
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }

      // Try parsing as date
      const date = new Date(retryAfter);
      if (!isNaN(date.getTime())) {
        return Math.max(0, date.getTime() - Date.now());
      }
    }

    // Check X-RateLimit-Reset header
    const resetHeader = headers['x-ratelimit-reset'] || headers['X-RateLimit-Reset'];
    if (resetHeader) {
      const resetTime = parseInt(resetHeader, 10);
      if (!isNaN(resetTime)) {
        // Could be Unix timestamp or seconds
        if (resetTime > 1e10) {
          // Unix timestamp in milliseconds
          return Math.max(0, resetTime - Date.now());
        } else if (resetTime > 1e9) {
          // Unix timestamp in seconds
          return Math.max(0, resetTime * 1000 - Date.now());
        } else {
          // Seconds from now
          return resetTime * 1000;
        }
      }
    }

    return undefined;
  }

  /**
   * Validate error mapping rules
   */
  validateErrorMappingRules(rules: ErrorMappingRule[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];

      // Must have at least one matching condition
      if (
        rule.statusCode === undefined &&
        rule.statusRange === undefined &&
        rule.errorCodePath === undefined
      ) {
        errors.push(
          `Rule ${i}: Must have at least one matching condition (statusCode, statusRange, or errorCodePath)`,
        );
      }

      // Validate status range
      if (rule.statusRange) {
        if (rule.statusRange.min > rule.statusRange.max) {
          errors.push(`Rule ${i}: statusRange.min cannot be greater than statusRange.max`);
        }
      }

      // Validate JSONPath if specified
      if (rule.errorCodePath) {
        const validation = this.jsonPathMapper.validateJsonPath(rule.errorCodePath);
        if (!validation.valid) {
          errors.push(`Rule ${i}: Invalid errorCodePath - ${validation.error}`);
        }
      }

      if (rule.messagePath) {
        const validation = this.jsonPathMapper.validateJsonPath(rule.messagePath);
        if (!validation.valid) {
          errors.push(`Rule ${i}: Invalid messagePath - ${validation.error}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
