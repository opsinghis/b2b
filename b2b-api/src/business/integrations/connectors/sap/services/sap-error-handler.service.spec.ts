import { Test, TestingModule } from '@nestjs/testing';
import {
  SapErrorHandlerService,
  SapErrorCategory,
  NormalizedSapError,
} from './sap-error-handler.service';
import { SapErrorResponse } from '../interfaces';

describe('SapErrorHandlerService', () => {
  let service: SapErrorHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SapErrorHandlerService],
    }).compile();

    service = module.get<SapErrorHandlerService>(SapErrorHandlerService);
  });

  describe('normalize', () => {
    it('should normalize SAP error response', () => {
      const sapError: SapErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: {
            lang: 'en',
            value: 'Sales order not found',
          },
        },
      };

      const result = service.normalize(sapError, 404);

      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Sales order not found');
      expect(result.category).toBe(SapErrorCategory.NOT_FOUND);
      expect(result.httpStatus).toBe(404);
      expect(result.retryable).toBe(false);
    });

    it('should normalize SAP error with inner error details', () => {
      const sapError: SapErrorResponse = {
        error: {
          code: 'VA/120',
          message: {
            lang: 'en',
            value: 'Item data missing',
          },
          innererror: {
            transactionid: 'TX123',
            errordetails: [
              {
                code: 'FIELD_ERROR',
                message: 'Material is required',
                propertyref: 'Material',
                severity: 'error',
              },
            ],
            Error_Resolution: {
              SAP_Note: '12345',
              SAP_Transaction: 'VA01',
            },
          },
        },
      };

      const result = service.normalize(sapError, 400);

      expect(result.code).toBe('VA/120');
      expect(result.category).toBe(SapErrorCategory.BUSINESS_RULE);
      expect(result.sapTransactionId).toBe('TX123');
      expect(result.sapNote).toBe('12345');
      expect(result.sapTransaction).toBe('VA01');
      expect(result.details).toHaveLength(1);
      expect(result.details![0].propertyref).toBe('Material');
    });

    it('should normalize standard Error without httpStatus defaults to 500', () => {
      const error = new Error('Some unexpected error');

      const result = service.normalize(error);

      expect(result.message).toBe('Some unexpected error');
      // Without httpStatus, defaults to 500 which maps to SYSTEM
      expect(result.category).toBe(SapErrorCategory.SYSTEM);
      expect(result.httpStatus).toBe(500);
    });

    it('should normalize standard Error with custom httpStatus', () => {
      const error = new Error('Some unexpected error');

      const result = service.normalize(error, 418);

      expect(result.message).toBe('Some unexpected error');
      // 418 is not mapped, so should be UNKNOWN
      expect(result.category).toBe(SapErrorCategory.UNKNOWN);
      expect(result.httpStatus).toBe(418);
    });

    it('should detect network errors', () => {
      const error = new Error('ECONNREFUSED - Connection refused');

      const result = service.normalize(error);

      expect(result.category).toBe(SapErrorCategory.NETWORK);
      expect(result.retryable).toBe(true);
    });

    it('should detect timeout errors', () => {
      const error = new Error('Request timeout');

      const result = service.normalize(error);

      expect(result.category).toBe(SapErrorCategory.TIMEOUT);
      expect(result.retryable).toBe(true);
    });

    it('should normalize unknown error', () => {
      const result = service.normalize('Some string error');

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('Some string error');
      expect(result.category).toBe(SapErrorCategory.UNKNOWN);
    });

    it('should map 401 status to authentication error', () => {
      const sapError: SapErrorResponse = {
        error: {
          code: '401',
          message: { lang: 'en', value: 'Unauthorized' },
        },
      };

      const result = service.normalize(sapError, 401);

      expect(result.category).toBe(SapErrorCategory.AUTHENTICATION);
      expect(result.retryable).toBe(false);
    });

    it('should map 403 status to authorization error', () => {
      const sapError: SapErrorResponse = {
        error: {
          code: 'FORBIDDEN',
          message: { lang: 'en', value: 'Access denied' },
        },
      };

      const result = service.normalize(sapError, 403);

      expect(result.category).toBe(SapErrorCategory.AUTHORIZATION);
      expect(result.retryable).toBe(false);
    });

    it('should map 429 status to rate limit error', () => {
      const sapError: SapErrorResponse = {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: { lang: 'en', value: 'Too many requests' },
        },
      };

      const result = service.normalize(sapError, 429);

      expect(result.category).toBe(SapErrorCategory.RATE_LIMIT);
      expect(result.retryable).toBe(true);
    });

    it('should map 500 status to system error', () => {
      const sapError: SapErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: { lang: 'en', value: 'Internal server error' },
        },
      };

      const result = service.normalize(sapError, 500);

      expect(result.category).toBe(SapErrorCategory.SYSTEM);
      expect(result.retryable).toBe(true);
    });

    it('should map 409 status to conflict error', () => {
      const sapError: SapErrorResponse = {
        error: {
          code: 'OPTIMISTIC_LOCK',
          message: { lang: 'en', value: 'Resource was modified' },
        },
      };

      const result = service.normalize(sapError, 409);

      expect(result.category).toBe(SapErrorCategory.CONFLICT);
      expect(result.retryable).toBe(true);
    });
  });

  describe('isSapErrorResponse', () => {
    it('should return true for valid SAP error response', () => {
      const sapError: SapErrorResponse = {
        error: {
          code: 'ERROR',
          message: { lang: 'en', value: 'Error message' },
        },
      };

      expect(service.isSapErrorResponse(sapError)).toBe(true);
    });

    it('should return false for null', () => {
      expect(service.isSapErrorResponse(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(service.isSapErrorResponse(undefined)).toBe(false);
    });

    it('should return false for standard Error', () => {
      expect(service.isSapErrorResponse(new Error('test'))).toBe(false);
    });

    it('should return false for object without error property', () => {
      expect(service.isSapErrorResponse({ message: 'test' })).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should use retryAfter if present', () => {
      const error: NormalizedSapError = {
        code: 'RATE_LIMIT',
        message: 'Rate limited',
        category: SapErrorCategory.RATE_LIMIT,
        httpStatus: 429,
        retryable: true,
        retryAfter: 30,
      };

      const delay = service.getRetryDelay(error, 1);
      expect(delay).toBe(30000);
    });

    it('should use exponential backoff without retryAfter', () => {
      const error: NormalizedSapError = {
        code: 'SYSTEM_ERROR',
        message: 'Server error',
        category: SapErrorCategory.SYSTEM,
        httpStatus: 500,
        retryable: true,
      };

      const delay1 = service.getRetryDelay(error, 0);
      const delay2 = service.getRetryDelay(error, 1);
      const delay3 = service.getRetryDelay(error, 2);

      // Base delay is 1000, with exponential backoff and jitter
      expect(delay1).toBeGreaterThanOrEqual(800);
      expect(delay1).toBeLessThanOrEqual(1200);
      expect(delay2).toBeGreaterThanOrEqual(1600);
      expect(delay2).toBeLessThanOrEqual(2400);
      expect(delay3).toBeGreaterThanOrEqual(3200);
      expect(delay3).toBeLessThanOrEqual(4800);
    });

    it('should cap delay at max value', () => {
      const error: NormalizedSapError = {
        code: 'SYSTEM_ERROR',
        message: 'Server error',
        category: SapErrorCategory.SYSTEM,
        httpStatus: 500,
        retryable: true,
      };

      const delay = service.getRetryDelay(error, 10);
      expect(delay).toBeLessThanOrEqual(36000); // maxDelay + jitter
    });
  });

  describe('shouldRetry', () => {
    it('should return false if max attempts reached', () => {
      const error: NormalizedSapError = {
        code: 'SYSTEM_ERROR',
        message: 'Server error',
        category: SapErrorCategory.SYSTEM,
        httpStatus: 500,
        retryable: true,
      };

      expect(service.shouldRetry(error, 3, 3)).toBe(false);
    });

    it('should return false if error is not retryable', () => {
      const error: NormalizedSapError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        category: SapErrorCategory.VALIDATION,
        httpStatus: 400,
        retryable: false,
      };

      expect(service.shouldRetry(error, 0, 3)).toBe(false);
    });

    it('should return false for authentication errors', () => {
      const error: NormalizedSapError = {
        code: '401',
        message: 'Unauthorized',
        category: SapErrorCategory.AUTHENTICATION,
        httpStatus: 401,
        retryable: false,
      };

      expect(service.shouldRetry(error, 0, 3)).toBe(false);
    });

    it('should return false for authorization errors', () => {
      const error: NormalizedSapError = {
        code: '403',
        message: 'Forbidden',
        category: SapErrorCategory.AUTHORIZATION,
        httpStatus: 403,
        retryable: false,
      };

      expect(service.shouldRetry(error, 0, 3)).toBe(false);
    });

    it('should return false for validation errors', () => {
      const error: NormalizedSapError = {
        code: 'VALIDATION',
        message: 'Invalid data',
        category: SapErrorCategory.VALIDATION,
        httpStatus: 400,
        retryable: false,
      };

      expect(service.shouldRetry(error, 0, 3)).toBe(false);
    });

    it('should return true for retryable system errors', () => {
      const error: NormalizedSapError = {
        code: 'SYSTEM_ERROR',
        message: 'Server error',
        category: SapErrorCategory.SYSTEM,
        httpStatus: 500,
        retryable: true,
      };

      expect(service.shouldRetry(error, 0, 3)).toBe(true);
    });

    it('should return true for rate limit errors', () => {
      const error: NormalizedSapError = {
        code: 'RATE_LIMIT',
        message: 'Too many requests',
        category: SapErrorCategory.RATE_LIMIT,
        httpStatus: 429,
        retryable: true,
      };

      expect(service.shouldRetry(error, 0, 3)).toBe(true);
    });
  });

  describe('getUserMessage', () => {
    it('should return authentication message', () => {
      const error: NormalizedSapError = {
        code: '401',
        message: 'Unauthorized',
        category: SapErrorCategory.AUTHENTICATION,
        httpStatus: 401,
        retryable: false,
      };

      const message = service.getUserMessage(error);
      expect(message).toContain('Authentication failed');
    });

    it('should return authorization message', () => {
      const error: NormalizedSapError = {
        code: '403',
        message: 'Forbidden',
        category: SapErrorCategory.AUTHORIZATION,
        httpStatus: 403,
        retryable: false,
      };

      const message = service.getUserMessage(error);
      expect(message).toContain('do not have permission');
    });

    it('should return not found message', () => {
      const error: NormalizedSapError = {
        code: '404',
        message: 'Not found',
        category: SapErrorCategory.NOT_FOUND,
        httpStatus: 404,
        retryable: false,
      };

      const message = service.getUserMessage(error);
      expect(message).toContain('not found');
    });

    it('should return validation message with details', () => {
      const error: NormalizedSapError = {
        code: 'VALIDATION',
        message: 'Material is required',
        category: SapErrorCategory.VALIDATION,
        httpStatus: 400,
        retryable: false,
      };

      const message = service.getUserMessage(error);
      expect(message).toContain('Validation error');
      expect(message).toContain('Material is required');
    });

    it('should return conflict message', () => {
      const error: NormalizedSapError = {
        code: 'CONFLICT',
        message: 'Conflict',
        category: SapErrorCategory.CONFLICT,
        httpStatus: 409,
        retryable: true,
      };

      const message = service.getUserMessage(error);
      expect(message).toContain('modified by another user');
    });

    it('should return business rule message', () => {
      const error: NormalizedSapError = {
        code: 'VA/150',
        message: 'Customer blocked for sales',
        category: SapErrorCategory.BUSINESS_RULE,
        httpStatus: 400,
        retryable: false,
      };

      const message = service.getUserMessage(error);
      expect(message).toContain('Business rule violation');
      expect(message).toContain('Customer blocked for sales');
    });

    it('should return rate limit message', () => {
      const error: NormalizedSapError = {
        code: 'RATE_LIMIT',
        message: 'Too many requests',
        category: SapErrorCategory.RATE_LIMIT,
        httpStatus: 429,
        retryable: true,
      };

      const message = service.getUserMessage(error);
      expect(message).toContain('Too many requests');
    });

    it('should return timeout message', () => {
      const error: NormalizedSapError = {
        code: 'TIMEOUT',
        message: 'Request timed out',
        category: SapErrorCategory.TIMEOUT,
        httpStatus: 504,
        retryable: true,
      };

      const message = service.getUserMessage(error);
      expect(message).toContain('timed out');
    });

    it('should return network message', () => {
      const error: NormalizedSapError = {
        code: 'NETWORK',
        message: 'Connection refused',
        category: SapErrorCategory.NETWORK,
        httpStatus: 503,
        retryable: true,
      };

      const message = service.getUserMessage(error);
      expect(message).toContain('Network error');
    });

    it('should return system message', () => {
      const error: NormalizedSapError = {
        code: 'SYSTEM',
        message: 'Internal error',
        category: SapErrorCategory.SYSTEM,
        httpStatus: 500,
        retryable: true,
      };

      const message = service.getUserMessage(error);
      expect(message).toContain('system error');
    });
  });

  describe('getValidationErrors', () => {
    it('should extract field errors from details', () => {
      const error: NormalizedSapError = {
        code: 'VALIDATION',
        message: 'Validation failed',
        category: SapErrorCategory.VALIDATION,
        httpStatus: 400,
        retryable: false,
        details: [
          { code: 'E1', message: 'Material is required', propertyref: 'Material' },
          { code: 'E2', message: 'Quantity must be positive', propertyref: 'Quantity' },
          { code: 'E3', message: 'Another material error', propertyref: 'Material' },
        ],
      };

      const fieldErrors = service.getValidationErrors(error);

      expect(fieldErrors['Material']).toHaveLength(2);
      expect(fieldErrors['Material']).toContain('Material is required');
      expect(fieldErrors['Material']).toContain('Another material error');
      expect(fieldErrors['Quantity']).toHaveLength(1);
      expect(fieldErrors['Quantity']).toContain('Quantity must be positive');
    });

    it('should use _general for errors without field reference', () => {
      const error: NormalizedSapError = {
        code: 'VALIDATION',
        message: 'Validation failed',
        category: SapErrorCategory.VALIDATION,
        httpStatus: 400,
        retryable: false,
        details: [{ code: 'E1', message: 'General error' }],
      };

      const fieldErrors = service.getValidationErrors(error);

      expect(fieldErrors['_general']).toHaveLength(1);
      expect(fieldErrors['_general']).toContain('General error');
    });

    it('should return empty object when no details', () => {
      const error: NormalizedSapError = {
        code: 'VALIDATION',
        message: 'Validation failed',
        category: SapErrorCategory.VALIDATION,
        httpStatus: 400,
        retryable: false,
      };

      const fieldErrors = service.getValidationErrors(error);

      expect(fieldErrors).toEqual({});
    });
  });

  describe('logError', () => {
    it('should log error without throwing', () => {
      const error: NormalizedSapError = {
        code: 'SYSTEM_ERROR',
        message: 'Server error',
        category: SapErrorCategory.SYSTEM,
        httpStatus: 500,
        retryable: true,
        sapTransactionId: 'TX123',
      };

      // Should not throw
      expect(() => {
        service.logError(error, {
          operation: 'createSalesOrder',
          tenantId: 'tenant-1',
          requestId: 'req-123',
        });
      }).not.toThrow();
    });
  });
});
