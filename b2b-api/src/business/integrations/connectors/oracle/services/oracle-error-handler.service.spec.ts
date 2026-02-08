import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { OracleErrorHandlerService, OracleErrorCategory } from './oracle-error-handler.service';

describe('OracleErrorHandlerService', () => {
  let service: OracleErrorHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OracleErrorHandlerService],
    }).compile();

    service = module.get<OracleErrorHandlerService>(OracleErrorHandlerService);
  });

  const createAxiosError = (status: number, data?: unknown, code?: string): AxiosError => {
    const error = new Error('Request failed') as AxiosError;
    error.isAxiosError = true;
    error.response = {
      status,
      statusText: 'Error',
      headers: {},
      data,
      config: {
        headers: new AxiosHeaders(),
      } as InternalAxiosRequestConfig,
    };
    error.config = {
      method: 'get',
      url: '/test',
      headers: new AxiosHeaders(),
    } as InternalAxiosRequestConfig;
    if (code) {
      error.code = code;
    }
    return error;
  };

  describe('createErrorResult', () => {
    it('should create error result from Axios error', () => {
      const axiosError = createAxiosError(400, {
        'o:errorCode': 'VALIDATION_ERROR',
        detail: 'Invalid input',
      });

      const result = service.createErrorResult(axiosError, 'test-request', 100);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toBe('Invalid input');
      expect(result.error?.retryable).toBe(false);
      expect(result.metadata?.requestId).toBe('test-request');
      expect(result.metadata?.durationMs).toBe(100);
    });

    it('should create error result from native Error', () => {
      const error = new Error('Something went wrong');

      const result = service.createErrorResult(error, 'test-request', 50);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('Error');
      expect(result.error?.message).toBe('Something went wrong');
    });

    it('should create error result from unknown error', () => {
      const result = service.createErrorResult('string error', 'test-request', 25);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('parseError', () => {
    describe('HTTP status categorization', () => {
      it('should categorize 401 as authentication error', () => {
        const error = createAxiosError(401, { detail: 'Unauthorized' });
        const parsed = service.parseError(error);

        expect(parsed.category).toBe(OracleErrorCategory.AUTHENTICATION);
        expect(parsed.retryable).toBe(false);
      });

      it('should categorize 403 as authorization error', () => {
        const error = createAxiosError(403, { detail: 'Forbidden' });
        const parsed = service.parseError(error);

        expect(parsed.category).toBe(OracleErrorCategory.AUTHORIZATION);
        expect(parsed.retryable).toBe(false);
      });

      it('should categorize 404 as not found error', () => {
        const error = createAxiosError(404, { detail: 'Not found' });
        const parsed = service.parseError(error);

        expect(parsed.category).toBe(OracleErrorCategory.NOT_FOUND);
        expect(parsed.retryable).toBe(false);
      });

      it('should categorize 409 as conflict error', () => {
        const error = createAxiosError(409, { detail: 'Conflict' });
        const parsed = service.parseError(error);

        expect(parsed.category).toBe(OracleErrorCategory.CONFLICT);
        expect(parsed.retryable).toBe(false);
      });

      it('should categorize 429 as rate limit error', () => {
        const error = createAxiosError(429, { detail: 'Too many requests' });
        const parsed = service.parseError(error);

        expect(parsed.category).toBe(OracleErrorCategory.RATE_LIMIT);
        expect(parsed.retryable).toBe(true);
      });

      it('should categorize 4xx as validation error', () => {
        const error = createAxiosError(400, { detail: 'Bad request' });
        const parsed = service.parseError(error);

        expect(parsed.category).toBe(OracleErrorCategory.VALIDATION);
        expect(parsed.retryable).toBe(false);
      });

      it('should categorize 5xx as server error', () => {
        const error = createAxiosError(500, { detail: 'Internal error' });
        const parsed = service.parseError(error);

        expect(parsed.category).toBe(OracleErrorCategory.SERVER_ERROR);
        expect(parsed.retryable).toBe(true);
      });

      it('should mark 502 as retryable', () => {
        const error = createAxiosError(502, { detail: 'Bad gateway' });
        const parsed = service.parseError(error);

        expect(parsed.retryable).toBe(true);
      });

      it('should mark 503 as retryable', () => {
        const error = createAxiosError(503, { detail: 'Service unavailable' });
        const parsed = service.parseError(error);

        expect(parsed.retryable).toBe(true);
      });

      it('should mark 504 as retryable', () => {
        const error = createAxiosError(504, { detail: 'Gateway timeout' });
        const parsed = service.parseError(error);

        expect(parsed.retryable).toBe(true);
      });
    });

    describe('Oracle error response parsing', () => {
      it('should parse Oracle error code and message', () => {
        const error = createAxiosError(400, {
          'o:errorCode': 'ORA-12345',
          title: 'Oracle Error',
          detail: 'Detailed error message',
          'o:errorDetails': [{ code: 'FIELD_ERROR', message: 'Field is invalid' }],
        });

        const parsed = service.parseError(error);

        expect(parsed.code).toBe('ORA-12345');
        expect(parsed.message).toBe('Detailed error message');
        expect(parsed.details).toHaveLength(1);
        expect(parsed.details?.[0].code).toBe('FIELD_ERROR');
      });

      it('should handle standard HTTP error format', () => {
        const error = createAxiosError(400, {
          title: 'Bad Request',
          detail: 'Request validation failed',
          status: 400,
        });

        const parsed = service.parseError(error);

        expect(parsed.code).toBe('HTTP_400');
        expect(parsed.message).toBe('Request validation failed');
      });
    });

    describe('Network error parsing', () => {
      it('should parse ECONNREFUSED', () => {
        const error = createAxiosError(0, undefined, 'ECONNREFUSED');
        error.message = 'connect ECONNREFUSED';
        error.response = undefined;

        const parsed = service.parseError(error);

        expect(parsed.code).toBe('CONNECTION_REFUSED');
        expect(parsed.category).toBe(OracleErrorCategory.NETWORK);
        expect(parsed.retryable).toBe(true);
      });

      it('should parse ECONNRESET', () => {
        const error = createAxiosError(0, undefined, 'ECONNRESET');
        error.response = undefined;

        const parsed = service.parseError(error);

        expect(parsed.code).toBe('CONNECTION_RESET');
        expect(parsed.retryable).toBe(true);
      });

      it('should parse ETIMEDOUT', () => {
        const error = createAxiosError(0, undefined, 'ETIMEDOUT');
        error.response = undefined;

        const parsed = service.parseError(error);

        expect(parsed.code).toBe('TIMEOUT');
        expect(parsed.category).toBe(OracleErrorCategory.TIMEOUT);
        expect(parsed.retryable).toBe(true);
      });

      it('should parse ENOTFOUND', () => {
        const error = createAxiosError(0, undefined, 'ENOTFOUND');
        error.response = undefined;

        const parsed = service.parseError(error);

        expect(parsed.code).toBe('DNS_ERROR');
        expect(parsed.retryable).toBe(true);
      });
    });

    describe('Timeout detection', () => {
      it('should detect timeout from error message', () => {
        const error = createAxiosError(0);
        error.message = 'timeout of 30000ms exceeded';
        error.response = undefined;
        error.code = undefined;

        const parsed = service.parseError(error);

        expect(parsed.code).toBe('TIMEOUT');
        expect(parsed.category).toBe(OracleErrorCategory.TIMEOUT);
        expect(parsed.retryable).toBe(true);
      });
    });
  });

  describe('shouldRetry', () => {
    it('should return true for retryable error within attempt limit', () => {
      const error = createAxiosError(503, { detail: 'Service unavailable' });

      expect(service.shouldRetry(error, 1, 3)).toBe(true);
      expect(service.shouldRetry(error, 2, 3)).toBe(true);
    });

    it('should return false when max attempts reached', () => {
      const error = createAxiosError(503, { detail: 'Service unavailable' });

      expect(service.shouldRetry(error, 3, 3)).toBe(false);
    });

    it('should return false for non-retryable error', () => {
      const error = createAxiosError(400, { detail: 'Bad request' });

      expect(service.shouldRetry(error, 1, 3)).toBe(false);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should return exponential delay', () => {
      const delay1 = service.calculateRetryDelay(1, 1000);
      const delay2 = service.calculateRetryDelay(2, 1000);
      const delay3 = service.calculateRetryDelay(3, 1000);

      // First attempt: 2000ms base
      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay1).toBeLessThanOrEqual(2500); // With jitter

      // Second attempt: 4000ms base
      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay2).toBeLessThanOrEqual(5000);

      // Third attempt: 8000ms base
      expect(delay3).toBeGreaterThanOrEqual(8000);
      expect(delay3).toBeLessThanOrEqual(10000);
    });

    it('should cap at max delay', () => {
      const delay = service.calculateRetryDelay(10, 1000, 5000);

      expect(delay).toBeLessThanOrEqual(6250); // 5000 + 25% jitter
    });
  });

  describe('formatErrorForLogging', () => {
    it('should format Axios error', () => {
      const error = createAxiosError(400, { error: 'Bad request' });

      const formatted = service.formatErrorForLogging(error);

      expect(formatted).toContain('Status: 400');
      expect(formatted).toContain('Method: GET');
      expect(formatted).toContain('URL: /test');
    });

    it('should format native Error', () => {
      const error = new Error('Test error');

      const formatted = service.formatErrorForLogging(error);

      expect(formatted).toBe('Error: Test error');
    });

    it('should format unknown error', () => {
      const formatted = service.formatErrorForLogging('string error');

      expect(formatted).toBe('string error');
    });
  });

  describe('logError', () => {
    it('should log error without throwing', () => {
      const error = createAxiosError(500, { detail: 'Server error' });

      // Should not throw
      expect(() => {
        service.logError(error, 'test-operation', { customField: 'value' });
      }).not.toThrow();
    });
  });
});
