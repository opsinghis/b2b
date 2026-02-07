import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { Request, Response } from 'express';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      setHeader: jest.fn(),
    };

    mockNext = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should generate correlation ID if not present', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.headers!['x-correlation-id']).toBeDefined();
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      mockRequest.headers!['x-correlation-id'],
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should use existing correlation ID if present', () => {
    const existingId = 'existing-correlation-id';
    mockRequest.headers = { 'x-correlation-id': existingId };

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.headers['x-correlation-id']).toBe(existingId);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('x-correlation-id', existingId);
    expect(mockNext).toHaveBeenCalled();
  });
});
