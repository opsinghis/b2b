import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import {
  QuickBooksErrorHandlerService,
  QuickBooksErrorCodes,
  ErrorCategory,
} from './quickbooks-error-handler.service';
import { QuickBooksErrorResponse } from '../interfaces';

describe('QuickBooksErrorHandlerService', () => {
  let service: QuickBooksErrorHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuickBooksErrorHandlerService],
    }).compile();

    service = module.get<QuickBooksErrorHandlerService>(QuickBooksErrorHandlerService);
  });

  describe('createErrorResult', () => {
    it('should create error result from Error', () => {
      const error = new Error('Test error');

      const result = service.createErrorResult(error, 'test-request', 100);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONNECTOR_ERROR');
      expect(result.error?.message).toBe('Test error');
      expect(result.error?.retryable).toBe(false);
      expect(result.metadata?.requestId).toBe('test-request');
      expect(result.metadata?.durationMs).toBe(100);
    });

    it('should create error result from Axios error', () => {
      const errorResponse: QuickBooksErrorResponse = {
        Fault: {
          Error: [
            {
              Message: 'Validation error',
              Detail: 'Field is required',
              code: '2010',
            },
          ],
          type: 'ValidationFault',
        },
      };

      const axiosError = new AxiosError('Request failed');
      axiosError.response = {
        data: errorResponse,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {
          headers: new AxiosHeaders(),
        } as InternalAxiosRequestConfig,
      };

      const result = service.createErrorResult(axiosError, 'test-request', 100);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('2010');
      expect(result.error?.message).toBe('Validation error');
      expect(result.error?.retryable).toBe(false);
    });

    it('should create error result from unknown error', () => {
      const result = service.createErrorResult('string error', 'test-request', 100);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('parseError', () => {
    it('should parse standard Error', () => {
      const error = new Error('Test error message');

      const result = service.parseError(error);

      expect(result.code).toBe('CONNECTOR_ERROR');
      expect(result.message).toBe('Test error message');
      expect(result.category).toBe(ErrorCategory.UNKNOWN);
    });

    it('should parse QuickBooks error response', () => {
      const errorResponse: QuickBooksErrorResponse = {
        Fault: {
          Error: [
            {
              Message: 'Duplicate Name',
              code: '6240',
            },
          ],
        },
      };

      const result = service.parseError(errorResponse);

      expect(result.code).toBe('6240');
      expect(result.message).toBe('Duplicate Name');
      expect(result.category).toBe(ErrorCategory.VALIDATION);
    });
  });

  describe('categorizeError', () => {
    it('should categorize validation errors', () => {
      expect(service.categorizeError(QuickBooksErrorCodes.VALIDATION_ERROR)).toBe(
        ErrorCategory.VALIDATION,
      );
      expect(service.categorizeError(QuickBooksErrorCodes.DUPLICATE_NAME)).toBe(
        ErrorCategory.VALIDATION,
      );
      expect(service.categorizeError(QuickBooksErrorCodes.REQUIRED_FIELD_MISSING)).toBe(
        ErrorCategory.VALIDATION,
      );
    });

    it('should categorize authentication errors', () => {
      expect(service.categorizeError(QuickBooksErrorCodes.INVALID_TOKEN)).toBe(
        ErrorCategory.AUTHENTICATION,
      );
      expect(service.categorizeError(QuickBooksErrorCodes.TOKEN_EXPIRED)).toBe(
        ErrorCategory.AUTHENTICATION,
      );
    });

    it('should categorize authorization errors', () => {
      expect(service.categorizeError(QuickBooksErrorCodes.FORBIDDEN)).toBe(
        ErrorCategory.AUTHORIZATION,
      );
    });

    it('should categorize rate limit errors', () => {
      expect(service.categorizeError(QuickBooksErrorCodes.THROTTLE)).toBe(ErrorCategory.RATE_LIMIT);
      expect(service.categorizeError(QuickBooksErrorCodes.RATE_LIMIT_EXCEEDED)).toBe(
        ErrorCategory.RATE_LIMIT,
      );
    });

    it('should categorize server errors', () => {
      expect(service.categorizeError(QuickBooksErrorCodes.INTERNAL_ERROR)).toBe(
        ErrorCategory.SERVER,
      );
      expect(service.categorizeError(QuickBooksErrorCodes.SERVICE_UNAVAILABLE)).toBe(
        ErrorCategory.SERVER,
      );
    });

    it('should categorize based on HTTP status', () => {
      expect(service.categorizeError('unknown', 400)).toBe(ErrorCategory.VALIDATION);
      expect(service.categorizeError('unknown', 401)).toBe(ErrorCategory.AUTHENTICATION);
      expect(service.categorizeError('unknown', 403)).toBe(ErrorCategory.AUTHORIZATION);
      expect(service.categorizeError('unknown', 404)).toBe(ErrorCategory.NOT_FOUND);
      expect(service.categorizeError('unknown', 429)).toBe(ErrorCategory.RATE_LIMIT);
      expect(service.categorizeError('unknown', 500)).toBe(ErrorCategory.SERVER);
      expect(service.categorizeError('unknown', 503)).toBe(ErrorCategory.SERVER);
    });
  });

  describe('isRetryable', () => {
    it('should mark rate limit errors as retryable', () => {
      expect(service.isRetryable(ErrorCategory.RATE_LIMIT)).toBe(true);
    });

    it('should mark server errors as retryable', () => {
      expect(service.isRetryable(ErrorCategory.SERVER)).toBe(true);
    });

    it('should mark network errors as retryable', () => {
      expect(service.isRetryable(ErrorCategory.NETWORK)).toBe(true);
    });

    it('should mark stale object errors as retryable', () => {
      expect(
        service.isRetryable(ErrorCategory.CONCURRENCY, QuickBooksErrorCodes.STALE_OBJECT),
      ).toBe(true);
    });

    it('should mark token expired as retryable', () => {
      expect(
        service.isRetryable(ErrorCategory.AUTHENTICATION, QuickBooksErrorCodes.TOKEN_EXPIRED),
      ).toBe(true);
    });

    it('should not mark validation errors as retryable', () => {
      expect(service.isRetryable(ErrorCategory.VALIDATION)).toBe(false);
    });

    it('should not mark authorization errors as retryable', () => {
      expect(service.isRetryable(ErrorCategory.AUTHORIZATION)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should return long delay for rate limit errors', () => {
      const delay = service.getRetryDelay(ErrorCategory.RATE_LIMIT, 1);

      expect(delay).toBeGreaterThanOrEqual(60000); // At least 1 minute
    });

    it('should use exponential backoff for server errors', () => {
      const delay1 = service.getRetryDelay(ErrorCategory.SERVER, 1);
      const delay2 = service.getRetryDelay(ErrorCategory.SERVER, 2);
      const delay3 = service.getRetryDelay(ErrorCategory.SERVER, 3);

      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should cap delay at maximum', () => {
      const delay = service.getRetryDelay(ErrorCategory.SERVER, 10);

      expect(delay).toBeLessThanOrEqual(60000);
    });
  });

  describe('formatErrorForLogging', () => {
    it('should format error for logging', () => {
      const error = new Error('Test error');

      const result = service.formatErrorForLogging(error);

      expect(result).toContain('UNKNOWN');
      expect(result).toContain('Test error');
    });
  });

  describe('createUserFriendlyMessage', () => {
    it('should create user-friendly message for validation errors', () => {
      const errorResponse: QuickBooksErrorResponse = {
        Fault: {
          Error: [{ Message: 'Invalid field', code: '2010' }],
        },
      };

      const message = service.createUserFriendlyMessage(errorResponse);

      expect(message).toContain('Validation error');
      expect(message).toContain('check your input');
    });

    it('should create user-friendly message for authentication errors', () => {
      const errorResponse: QuickBooksErrorResponse = {
        Fault: {
          Error: [{ Message: 'Token expired', code: '102' }],
        },
      };

      const message = service.createUserFriendlyMessage(errorResponse);

      expect(message).toContain('Authentication failed');
      expect(message).toContain('reconnect');
    });

    it('should create user-friendly message for rate limit errors', () => {
      const errorResponse: QuickBooksErrorResponse = {
        Fault: {
          Error: [{ Message: 'Throttled', code: '5' }],
        },
      };

      const message = service.createUserFriendlyMessage(errorResponse);

      expect(message).toContain('Too many requests');
      expect(message).toContain('wait');
    });

    it('should create user-friendly message for server errors', () => {
      const errorResponse: QuickBooksErrorResponse = {
        Fault: {
          Error: [{ Message: 'Internal error', code: '500' }],
        },
      };

      const message = service.createUserFriendlyMessage(errorResponse);

      expect(message).toContain('temporarily unavailable');
    });
  });
});
