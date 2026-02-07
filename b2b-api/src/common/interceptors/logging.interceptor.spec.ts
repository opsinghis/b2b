import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: 'GET',
          url: '/test-url',
          ip: '127.0.0.1',
          headers: { 'x-correlation-id': 'test-id' },
          get: jest.fn().mockReturnValue('test-user-agent'),
        }),
        getResponse: jest.fn().mockReturnValue({
          statusCode: 200,
          get: jest.fn().mockReturnValue('100'),
        }),
      }),
    } as unknown as ExecutionContext;
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log successful request', (done) => {
    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ success: true })),
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (value) => {
        expect(value).toEqual({ success: true });
      },
      complete: () => {
        done();
      },
    });
  });

  it('should log error request', (done) => {
    const error = new Error('Test error');
    mockCallHandler = {
      handle: jest.fn().mockReturnValue(throwError(() => error)),
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      error: (err) => {
        expect(err).toBe(error);
        done();
      },
    });
  });
});
