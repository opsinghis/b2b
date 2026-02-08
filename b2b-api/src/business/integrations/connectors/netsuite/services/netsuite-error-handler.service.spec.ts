import {
  NetSuiteErrorHandlerService,
  NetSuiteErrorCategory,
  NETSUITE_ERROR_CODES,
} from './netsuite-error-handler.service';

describe('NetSuiteErrorHandlerService', () => {
  let service: NetSuiteErrorHandlerService;

  beforeEach(() => {
    service = new NetSuiteErrorHandlerService();
  });

  describe('parseError', () => {
    it('should parse Error instance with known error code', () => {
      const error = new Error('NetSuite Error [INVALID_LOGIN_CREDENTIALS]: Invalid credentials');
      (error as unknown as { errorCode: string }).errorCode = 'INVALID_LOGIN_CREDENTIALS';

      const result = service.parseError(error);

      expect(result.code).toBe('INVALID_LOGIN_CREDENTIALS');
      expect(result.category).toBe(NetSuiteErrorCategory.AUTHENTICATION);
      expect(result.retryable).toBe(false);
    });

    it('should parse error with HTTP status code', () => {
      const error = new Error('Unauthorized');
      (error as unknown as { statusCode: number }).statusCode = 401;

      const result = service.parseError(error);

      expect(result.code).toBe('HTTP_401');
      expect(result.category).toBe(NetSuiteErrorCategory.AUTHENTICATION);
      expect(result.retryable).toBe(false);
    });

    it('should parse rate limit error (429)', () => {
      const error = new Error('Too Many Requests');
      (error as unknown as { statusCode: number }).statusCode = 429;

      const result = service.parseError(error);

      expect(result.code).toBe('HTTP_429');
      expect(result.category).toBe(NetSuiteErrorCategory.RATE_LIMIT);
      expect(result.retryable).toBe(true);
    });

    it('should parse server error (500)', () => {
      const error = new Error('Internal Server Error');
      (error as unknown as { statusCode: number }).statusCode = 500;

      const result = service.parseError(error);

      expect(result.code).toBe('HTTP_500');
      expect(result.category).toBe(NetSuiteErrorCategory.SERVER_ERROR);
      expect(result.retryable).toBe(true);
    });

    it('should parse NetSuite REST API error format', () => {
      const errorObj = {
        'o:errorCode': 'INVALID_FLD_VALUE',
        'o:errorDetails': [{ detail: 'Invalid value for field X', errorCode: 'INVALID_FLD_VALUE' }],
      };

      const result = service.parseError(errorObj);

      expect(result.code).toBe('INVALID_FLD_VALUE');
      expect(result.category).toBe(NetSuiteErrorCategory.VALIDATION);
      expect(result.details).toContain('Invalid value for field X');
    });

    it('should parse SuiteTalk error format', () => {
      const errorObj = {
        status: {
          isSuccess: false,
          statusDetail: [
            { code: 'RCRD_DSNT_EXIST', message: 'Record does not exist', type: 'ERROR' },
          ],
        },
      };

      const result = service.parseError(errorObj);

      expect(result.code).toBe('RCRD_DSNT_EXIST');
      expect(result.category).toBe(NetSuiteErrorCategory.NOT_FOUND);
      expect(result.message).toBe('Record does not exist');
    });

    it('should parse string error', () => {
      const result = service.parseError('Something went wrong');

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('Something went wrong');
    });

    it('should handle null/undefined', () => {
      const result = service.parseError(null);

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.category).toBe(NetSuiteErrorCategory.UNKNOWN);
    });
  });

  describe('isRetryable', () => {
    it('should return true for rate limit errors', () => {
      const error = new Error('Rate limit');
      (error as unknown as { statusCode: number }).statusCode = 429;

      expect(service.isRetryable(error)).toBe(true);
    });

    it('should return true for server errors', () => {
      const error = new Error('Server error');
      (error as unknown as { statusCode: number }).statusCode = 500;

      expect(service.isRetryable(error)).toBe(true);
    });

    it('should return false for validation errors', () => {
      const error = new Error('Validation error');
      (error as unknown as { errorCode: string }).errorCode = 'INVALID_FLD_VALUE';

      expect(service.isRetryable(error)).toBe(false);
    });

    it('should return false for auth errors', () => {
      const error = new Error('Auth error');
      (error as unknown as { statusCode: number }).statusCode = 401;

      expect(service.isRetryable(error)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should return longer delay for rate limit errors', () => {
      const error = new Error('Rate limit');
      (error as unknown as { statusCode: number }).statusCode = 429;

      const delay1 = service.getRetryDelay(error, 1);
      const delay2 = service.getRetryDelay(error, 2);

      expect(delay1).toBeGreaterThanOrEqual(10000);
      expect(delay2).toBeGreaterThan(delay1);
    });

    it('should use exponential backoff for server errors', () => {
      const error = new Error('Server error');
      (error as unknown as { statusCode: number }).statusCode = 500;

      const delay1 = service.getRetryDelay(error, 1);
      const delay2 = service.getRetryDelay(error, 2);
      const delay3 = service.getRetryDelay(error, 3);

      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should cap delay at maximum', () => {
      const error = new Error('Rate limit');
      (error as unknown as { statusCode: number }).statusCode = 429;

      const delay = service.getRetryDelay(error, 10);

      expect(delay).toBeLessThanOrEqual(60000);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return friendly message for auth errors', () => {
      const error = new Error('Auth failed');
      (error as unknown as { statusCode: number }).statusCode = 401;

      const message = service.getUserFriendlyMessage(error);

      expect(message).toContain('authenticate');
      expect(message).toContain('credentials');
    });

    it('should return friendly message for permission errors', () => {
      const error = new Error('Permission denied');
      (error as unknown as { statusCode: number }).statusCode = 403;

      const message = service.getUserFriendlyMessage(error);

      expect(message).toContain('permission');
    });

    it('should return friendly message for not found errors', () => {
      const error = new Error('Not found');
      (error as unknown as { statusCode: number }).statusCode = 404;

      const message = service.getUserFriendlyMessage(error);

      expect(message).toContain('not found');
    });

    it('should return friendly message for rate limit errors', () => {
      const error = new Error('Rate limited');
      (error as unknown as { statusCode: number }).statusCode = 429;

      const message = service.getUserFriendlyMessage(error);

      expect(message).toContain('rate limit');
    });

    it('should return friendly message for server errors', () => {
      const error = new Error('Server error');
      (error as unknown as { statusCode: number }).statusCode = 500;

      const message = service.getUserFriendlyMessage(error);

      expect(message).toContain('temporary');
    });

    it('should include validation error details', () => {
      const error = new Error('Invalid field value');
      (error as unknown as { errorCode: string }).errorCode = 'INVALID_FLD_VALUE';

      const message = service.getUserFriendlyMessage(error);

      expect(message).toContain('invalid data');
    });
  });

  describe('known error codes', () => {
    it('should have correct categories for all known error codes', () => {
      // Authentication errors
      expect(NETSUITE_ERROR_CODES.INVALID_LOGIN_CREDENTIALS.category).toBe(
        NetSuiteErrorCategory.AUTHENTICATION,
      );
      expect(NETSUITE_ERROR_CODES.SESSION_TIMED_OUT.category).toBe(
        NetSuiteErrorCategory.AUTHENTICATION,
      );

      // Authorization errors
      expect(NETSUITE_ERROR_CODES.PERMISSION_VIOLATION.category).toBe(
        NetSuiteErrorCategory.AUTHORIZATION,
      );
      expect(NETSUITE_ERROR_CODES.INSUFFICIENT_PERMISSION.category).toBe(
        NetSuiteErrorCategory.AUTHORIZATION,
      );

      // Validation errors
      expect(NETSUITE_ERROR_CODES.INVALID_FLD_VALUE.category).toBe(
        NetSuiteErrorCategory.VALIDATION,
      );
      expect(NETSUITE_ERROR_CODES.MISSING_REQD_FLD.category).toBe(NetSuiteErrorCategory.VALIDATION);
      expect(NETSUITE_ERROR_CODES.DUP_RCRD.category).toBe(NetSuiteErrorCategory.VALIDATION);

      // Not found errors
      expect(NETSUITE_ERROR_CODES.RCRD_DSNT_EXIST.category).toBe(NetSuiteErrorCategory.NOT_FOUND);

      // Rate limit errors
      expect(NETSUITE_ERROR_CODES.REQUEST_LIMIT_EXCEEDED.category).toBe(
        NetSuiteErrorCategory.RATE_LIMIT,
      );
      expect(NETSUITE_ERROR_CODES.EXCEEDED_CONCURRENCY_LIMIT.category).toBe(
        NetSuiteErrorCategory.RATE_LIMIT,
      );

      // Server errors
      expect(NETSUITE_ERROR_CODES.UNEXPECTED_ERROR.category).toBe(
        NetSuiteErrorCategory.SERVER_ERROR,
      );
      expect(NETSUITE_ERROR_CODES.SERVER_BUSY.category).toBe(NetSuiteErrorCategory.SERVER_ERROR);
    });

    it('should have correct retryable flag for error codes', () => {
      // Auth/validation should not be retryable
      expect(NETSUITE_ERROR_CODES.INVALID_LOGIN_CREDENTIALS.retryable).toBe(false);
      expect(NETSUITE_ERROR_CODES.INVALID_FLD_VALUE.retryable).toBe(false);
      expect(NETSUITE_ERROR_CODES.PERMISSION_VIOLATION.retryable).toBe(false);

      // Rate limit and server errors should be retryable
      expect(NETSUITE_ERROR_CODES.REQUEST_LIMIT_EXCEEDED.retryable).toBe(true);
      expect(NETSUITE_ERROR_CODES.SERVER_BUSY.retryable).toBe(true);
      expect(NETSUITE_ERROR_CODES.SESSION_TIMED_OUT.retryable).toBe(true);
    });
  });
});
