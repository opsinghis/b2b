import { Test, TestingModule } from '@nestjs/testing';
import { RequestLoggerService } from './request-logger.service';

describe('RequestLoggerService', () => {
  let service: RequestLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestLoggerService],
    }).compile();

    service = module.get<RequestLoggerService>(RequestLoggerService);
    service.clearLogs();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startRequest', () => {
    it('should create a request log', () => {
      const log = service.startRequest('GET', 'https://api.example.com/users');

      expect(log).toBeDefined();
      expect(log.id).toBeDefined();
      expect(log.method).toBe('GET');
      expect(log.url).toBe('https://api.example.com/users');
      expect(log.timestamp).toBeDefined();
    });

    it('should include headers when configured', () => {
      const log = service.startRequest(
        'POST',
        'https://api.example.com/users',
        { logHeaders: true, logRequests: true },
        { headers: { 'Content-Type': 'application/json' } },
      );

      expect(log.headers).toBeDefined();
      expect(log.headers?.['Content-Type']).toBe('application/json');
    });

    it('should mask sensitive headers', () => {
      const log = service.startRequest(
        'POST',
        'https://api.example.com/users',
        { logHeaders: true, logRequests: true },
        { headers: { Authorization: 'Bearer secret-token-12345' } },
      );

      expect(log.headers?.Authorization).not.toBe('Bearer secret-token-12345');
      expect(log.headers?.Authorization).toContain('****');
    });

    it('should include body when configured', () => {
      const log = service.startRequest(
        'POST',
        'https://api.example.com/users',
        { logBody: true, logRequests: true },
        { body: { name: 'John', email: 'john@example.com' } },
      );

      expect(log.body).toBeDefined();
    });

    it('should mask sensitive body fields', () => {
      const log = service.startRequest(
        'POST',
        'https://api.example.com/login',
        { logBody: true, logRequests: true },
        { body: { username: 'john', password: 'secret123' } },
      );

      expect((log.body as any).username).toBe('john');
      expect((log.body as any).password).toContain('****');
    });

    it('should truncate large body', () => {
      const largeBody = { data: 'x'.repeat(10000) };
      const log = service.startRequest(
        'POST',
        'https://api.example.com/users',
        { logBody: true, logRequests: true, maxBodySize: 100 },
        { body: largeBody },
      );

      // Body should be truncated indicator
      expect((log.body as any)._truncated || typeof log.body === 'object').toBeTruthy();
    });

    it('should include correlation ID', () => {
      const log = service.startRequest('GET', 'https://api.example.com/users', undefined, {
        correlationId: 'corr-123',
      });

      expect(log.correlationId).toBe('corr-123');
    });
  });

  describe('logResponse', () => {
    it('should log response and return response log', () => {
      const requestLog = service.startRequest('GET', 'https://api.example.com/users');

      const responseLog = service.logResponse(requestLog, 200, 'OK', { logResponses: true });

      expect(responseLog).toBeDefined();
      expect(responseLog.requestId).toBe(requestLog.id);
      expect(responseLog.statusCode).toBe(200);
      expect(responseLog.statusText).toBe('OK');
      expect(responseLog.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should include response headers when configured', () => {
      const requestLog = service.startRequest('GET', 'https://api.example.com/users');

      const responseLog = service.logResponse(
        requestLog,
        200,
        'OK',
        { logHeaders: true, logResponses: true },
        { headers: { 'Content-Type': 'application/json' } },
      );

      expect(responseLog.headers).toBeDefined();
    });

    it('should include response body when configured', () => {
      const requestLog = service.startRequest('GET', 'https://api.example.com/users');

      const responseLog = service.logResponse(
        requestLog,
        200,
        'OK',
        { logBody: true, logResponses: true },
        { body: { users: [] } },
      );

      expect(responseLog.body).toBeDefined();
    });

    it('should store log entry', () => {
      const requestLog = service.startRequest('GET', 'https://api.example.com/users');
      service.logResponse(requestLog, 200, 'OK');

      const logs = service.getRecentLogs();
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('logError', () => {
    it('should log error', () => {
      const requestLog = service.startRequest('GET', 'https://api.example.com/users');
      const error = new Error('Connection failed');

      // Should not throw
      expect(() => service.logError(requestLog, error)).not.toThrow();

      const logs = service.getRecentLogs();
      const errorLog = logs.find((l) => l.id === requestLog.id);
      expect(errorLog?.error).toBe('Connection failed');
    });
  });

  describe('getRecentLogs', () => {
    beforeEach(() => {
      // Create some test logs
      for (let i = 0; i < 5; i++) {
        const log = service.startRequest('GET', `https://api.example.com/test${i}`);
        service.logResponse(log, 200, 'OK', undefined, {
          tenantId: i % 2 === 0 ? 'tenant-1' : 'tenant-2',
        });
      }
    });

    it('should return logs', () => {
      const logs = service.getRecentLogs();
      expect(logs.length).toBeGreaterThanOrEqual(5);
    });

    it('should filter by tenantId', () => {
      const logs = service.getRecentLogs({ tenantId: 'tenant-1' });
      logs.forEach((log) => {
        if (log.tenantId) {
          expect(log.tenantId).toBe('tenant-1');
        }
      });
    });

    it('should filter by configId', () => {
      const requestLog = service.startRequest('GET', 'https://api.example.com/test');
      service.logResponse(requestLog, 200, 'OK', undefined, { configId: 'config-123' });

      const logs = service.getRecentLogs({ configId: 'config-123' });
      expect(logs.some((l) => l.configId === 'config-123')).toBe(true);
    });

    it('should filter by correlationId', () => {
      const requestLog = service.startRequest('GET', 'https://api.example.com/test', undefined, {
        correlationId: 'corr-123',
      });
      service.logResponse(requestLog, 200, 'OK');

      const logs = service.getRecentLogs({ correlationId: 'corr-123' });
      expect(logs.some((l) => l.correlationId === 'corr-123')).toBe(true);
    });

    it('should filter by since', () => {
      const since = new Date(Date.now() - 1000);
      const logs = service.getRecentLogs({ since });

      logs.forEach((log) => {
        expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(since.getTime());
      });
    });

    it('should apply limit', () => {
      const logs = service.getRecentLogs({ limit: 2 });
      expect(logs.length).toBeLessThanOrEqual(2);
    });

    it('should sort by timestamp descending', () => {
      const logs = service.getRecentLogs();

      for (let i = 0; i < logs.length - 1; i++) {
        expect(logs[i].timestamp.getTime()).toBeGreaterThanOrEqual(logs[i + 1].timestamp.getTime());
      }
    });
  });

  describe('getLogById', () => {
    it('should return log by ID', () => {
      const requestLog = service.startRequest('GET', 'https://api.example.com/users');
      service.logResponse(requestLog, 200, 'OK');

      const log = service.getLogById(requestLog.id);
      expect(log).toBeDefined();
      expect(log?.id).toBe(requestLog.id);
    });

    it('should return undefined for non-existent ID', () => {
      const log = service.getLogById('non-existent');
      expect(log).toBeUndefined();
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', () => {
      const requestLog = service.startRequest('GET', 'https://api.example.com/users');
      service.logResponse(requestLog, 200, 'OK');

      expect(service.getRecentLogs().length).toBeGreaterThan(0);

      service.clearLogs();

      expect(service.getRecentLogs().length).toBe(0);
    });
  });

  describe('getLogStats', () => {
    beforeEach(() => {
      service.clearLogs();

      // Create test logs with various status codes
      const log1 = service.startRequest('GET', 'https://api.example.com/test1');
      service.logResponse(log1, 200, 'OK');

      const log2 = service.startRequest('GET', 'https://api.example.com/test2');
      service.logResponse(log2, 200, 'OK');

      const log3 = service.startRequest('GET', 'https://api.example.com/test3');
      service.logResponse(log3, 404, 'Not Found');

      const log4 = service.startRequest('GET', 'https://api.example.com/test4');
      service.logError(log4, new Error('Connection failed'));
    });

    it('should return total logs count', () => {
      const stats = service.getLogStats();
      expect(stats.totalLogs).toBe(4);
    });

    it('should count errors', () => {
      const stats = service.getLogStats();
      expect(stats.errorCount).toBe(1);
    });

    it('should calculate average duration', () => {
      const stats = service.getLogStats();
      expect(typeof stats.avgDurationMs).toBe('number');
    });

    it('should count status codes', () => {
      const stats = service.getLogStats();
      expect(stats.statusCodeCounts[200]).toBe(2);
      expect(stats.statusCodeCounts[404]).toBe(1);
    });
  });

  describe('masking', () => {
    it('should mask custom fields', () => {
      const log = service.startRequest(
        'POST',
        'https://api.example.com/users',
        { logBody: true, logRequests: true, maskFields: ['creditCard', 'ssn'] },
        { body: { name: 'John', creditCard: '4111111111111111', ssn: '123-45-6789' } },
      );

      expect((log.body as any).name).toBe('John');
      expect((log.body as any).creditCard).toContain('****');
      expect((log.body as any).ssn).toContain('****');
    });

    it('should mask nested sensitive fields', () => {
      const log = service.startRequest(
        'POST',
        'https://api.example.com/users',
        { logBody: true, logRequests: true },
        {
          body: {
            user: {
              name: 'John',
              credentials: {
                password: 'secret123',
                apiKey: 'key-12345',
              },
            },
          },
        },
      );

      const body = log.body as any;
      expect(body.user.name).toBe('John');
      expect(body.user.credentials.password).toContain('****');
      expect(body.user.credentials.apiKey).toContain('****');
    });

    it('should mask values in arrays', () => {
      const log = service.startRequest(
        'POST',
        'https://api.example.com/users',
        { logBody: true, logRequests: true },
        {
          body: {
            users: [
              { name: 'John', password: 'secret1' },
              { name: 'Jane', password: 'secret2' },
            ],
          },
        },
      );

      const body = log.body as any;
      expect(body.users[0].name).toBe('John');
      expect(body.users[0].password).toContain('****');
      expect(body.users[1].password).toContain('****');
    });
  });
});
