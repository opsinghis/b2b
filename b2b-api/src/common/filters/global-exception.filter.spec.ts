import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockGetResponse: jest.Mock;
  let mockGetRequest: jest.Mock;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
    mockGetRequest = jest.fn().mockReturnValue({
      url: '/test-url',
      headers: {},
    });

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: mockGetResponse,
        getRequest: mockGetRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle HttpException', () => {
    const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Test error',
        path: '/test-url',
      }),
    );
  });

  it('should handle generic Error', () => {
    const exception = new Error('Generic error');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Generic error',
        error: 'Error',
      }),
    );
  });

  it('should include correlation ID when present', () => {
    mockGetRequest.mockReturnValue({
      url: '/test-url',
      headers: { 'x-correlation-id': 'test-correlation-id' },
    });

    const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'test-correlation-id',
      }),
    );
  });

  it('should handle HttpException with object response', () => {
    const exception = new HttpException(
      { message: 'Validation failed', error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        error: 'Bad Request',
      }),
    );
  });
});
