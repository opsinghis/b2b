import { Test, TestingModule } from '@nestjs/testing';
import { ErrorMapperService, DEFAULT_ERROR_CODES } from './error-mapper.service';
import { JsonPathMapperService } from './json-path-mapper.service';

describe('ErrorMapperService', () => {
  let service: ErrorMapperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorMapperService, JsonPathMapperService],
    }).compile();

    service = module.get<ErrorMapperService>(ErrorMapperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapError', () => {
    describe('with Axios errors', () => {
      it('should map 400 Bad Request', () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 400,
            statusText: 'Bad Request',
            data: { message: 'Invalid input' },
          },
          message: 'Request failed',
        };

        const result = service.mapError(error as any, []);

        expect(result.code).toBe(DEFAULT_ERROR_CODES.VALIDATION_ERROR);
        expect(result.message).toBe('Invalid input');
        expect(result.statusCode).toBe(400);
        expect(result.retryable).toBe(false);
      });

      it('should map 401 Unauthorized', () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 401,
            statusText: 'Unauthorized',
            data: {},
          },
          message: 'Request failed',
        };

        const result = service.mapError(error as any, []);

        expect(result.code).toBe(DEFAULT_ERROR_CODES.AUTHENTICATION_ERROR);
        expect(result.retryable).toBe(false);
      });

      it('should map 403 Forbidden', () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 403,
            statusText: 'Forbidden',
            data: {},
          },
          message: 'Request failed',
        };

        const result = service.mapError(error as any, []);

        expect(result.code).toBe(DEFAULT_ERROR_CODES.AUTHORIZATION_ERROR);
        expect(result.retryable).toBe(false);
      });

      it('should map 404 Not Found', () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 404,
            statusText: 'Not Found',
            data: {},
          },
          message: 'Request failed',
        };

        const result = service.mapError(error as any, []);

        expect(result.code).toBe(DEFAULT_ERROR_CODES.NOT_FOUND_ERROR);
        expect(result.retryable).toBe(false);
      });

      it('should map 429 Rate Limit', () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 429,
            statusText: 'Too Many Requests',
            data: {},
          },
          message: 'Request failed',
        };

        const result = service.mapError(error as any, []);

        expect(result.code).toBe(DEFAULT_ERROR_CODES.RATE_LIMIT_ERROR);
        expect(result.retryable).toBe(true);
      });

      it('should map 500 Server Error', () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 500,
            statusText: 'Internal Server Error',
            data: {},
          },
          message: 'Request failed',
        };

        const result = service.mapError(error as any, []);

        expect(result.code).toBe(DEFAULT_ERROR_CODES.SERVER_ERROR);
        expect(result.statusCode).toBe(500);
      });

      it('should map 502 Bad Gateway as retryable', () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 502,
            statusText: 'Bad Gateway',
            data: {},
          },
          message: 'Request failed',
        };

        const result = service.mapError(error as any, []);

        expect(result.code).toBe(DEFAULT_ERROR_CODES.SERVER_ERROR);
        expect(result.retryable).toBe(true);
      });
    });

    describe('with custom error mapping rules', () => {
      it('should apply matching rule by status code', () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 422,
            statusText: 'Unprocessable Entity',
            data: { message: 'Validation failed' },
          },
          message: 'Request failed',
        };

        const rules = [
          {
            statusCode: 422,
            mappedCode: 'CUSTOM_VALIDATION_ERROR',
            messagePath: '$.message',
            retryable: false,
          },
        ];

        const result = service.mapError(error as any, rules);

        expect(result.code).toBe('CUSTOM_VALIDATION_ERROR');
        expect(result.message).toBe('Validation failed');
      });

      it('should apply matching rule by status range', () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 503,
            statusText: 'Service Unavailable',
            data: {},
          },
          message: 'Request failed',
        };

        const rules = [
          {
            statusRange: { min: 500, max: 599 },
            mappedCode: 'SERVICE_ERROR',
            defaultMessage: 'Service temporarily unavailable',
            retryable: true,
          },
        ];

        const result = service.mapError(error as any, rules);

        expect(result.code).toBe('SERVICE_ERROR');
        expect(result.message).toBe('Service temporarily unavailable');
        expect(result.retryable).toBe(true);
      });

      it('should apply matching rule by error code in response', () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 400,
            statusText: 'Bad Request',
            data: { error_code: 'INVALID_TOKEN', message: 'Token expired' },
          },
          message: 'Request failed',
        };

        const rules = [
          {
            statusCode: 400,
            errorCodePath: '$.error_code',
            errorCodeMatch: 'INVALID_TOKEN',
            mappedCode: 'TOKEN_EXPIRED',
            messagePath: '$.message',
            retryable: false,
          },
        ];

        const result = service.mapError(error as any, rules);

        expect(result.code).toBe('TOKEN_EXPIRED');
        expect(result.message).toBe('Token expired');
      });
    });

    describe('with network errors', () => {
      it('should map connection refused error', () => {
        const error = new Error('connect ECONNREFUSED');
        (error as any).code = 'ECONNREFUSED';

        const result = service.mapError(error, []);

        expect(result.code).toBe(DEFAULT_ERROR_CODES.CONNECTION_ERROR);
        expect(result.retryable).toBe(true);
      });

      it('should map timeout error', () => {
        const error = new Error('timeout of 5000ms exceeded');

        const result = service.mapError(error, []);

        expect(result.code).toBe(DEFAULT_ERROR_CODES.TIMEOUT_ERROR);
        expect(result.retryable).toBe(true);
      });
    });

    describe('with unknown errors', () => {
      it('should map unknown error', () => {
        const error = new Error('Something went wrong');

        const result = service.mapError(error, []);

        expect(result.code).toBe(DEFAULT_ERROR_CODES.UNKNOWN_ERROR);
        expect(result.message).toBe('Something went wrong');
        expect(result.retryable).toBe(false);
      });
    });
  });

  describe('isRetryableStatusCode', () => {
    it('should return true for 429', () => {
      expect(service.isRetryableStatusCode(429)).toBe(true);
    });

    it('should return true for 500', () => {
      expect(service.isRetryableStatusCode(500)).toBe(true);
    });

    it('should return true for 502', () => {
      expect(service.isRetryableStatusCode(502)).toBe(true);
    });

    it('should return true for 503', () => {
      expect(service.isRetryableStatusCode(503)).toBe(true);
    });

    it('should return false for 400', () => {
      expect(service.isRetryableStatusCode(400)).toBe(false);
    });

    it('should return false for 401', () => {
      expect(service.isRetryableStatusCode(401)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(service.isRetryableStatusCode(undefined)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should parse Retry-After header in seconds', () => {
      const headers = { 'retry-after': '30' };
      const delay = service.getRetryDelay(headers);
      expect(delay).toBe(30000);
    });

    it('should return undefined when header is missing', () => {
      const delay = service.getRetryDelay({});
      expect(delay).toBeUndefined();
    });
  });

  describe('validateErrorMappingRules', () => {
    it('should validate correct rules', () => {
      const rules = [
        { statusCode: 400, mappedCode: 'ERROR' },
        { statusRange: { min: 500, max: 599 }, mappedCode: 'SERVER_ERROR' },
      ];

      const result = service.validateErrorMappingRules(rules);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject rule without matching condition', () => {
      const rules = [{ mappedCode: 'ERROR' }];

      const result = service.validateErrorMappingRules(rules);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('matching condition'))).toBe(true);
    });

    it('should reject invalid status range', () => {
      const rules = [{ statusRange: { min: 500, max: 400 }, mappedCode: 'ERROR' }];

      const result = service.validateErrorMappingRules(rules);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('statusRange'))).toBe(true);
    });
  });
});
