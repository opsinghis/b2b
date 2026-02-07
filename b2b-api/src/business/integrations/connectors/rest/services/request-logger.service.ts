import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  LoggingConfig,
  RestRequestLog,
  RestResponseLog,
  HttpMethod,
} from '../interfaces';

/**
 * Log entry for storage
 */
export interface RestLogEntry {
  id: string;
  correlationId?: string;
  tenantId?: string;
  configId?: string;
  endpoint?: string;
  timestamp: Date;
  request: {
    method: HttpMethod;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  response?: {
    statusCode: number;
    statusText: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  durationMs?: number;
  error?: string;
}

/**
 * Request Logger Service
 * Handles request/response logging with masking support
 */
@Injectable()
export class RequestLoggerService {
  private readonly logger = new Logger(RequestLoggerService.name);
  private readonly logBuffer: RestLogEntry[] = [];
  private readonly maxBufferSize = 1000;

  // Default sensitive fields to mask
  private readonly defaultMaskFields = [
    'password',
    'token',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'apiKey',
    'api_key',
    'secret',
    'authorization',
    'Authorization',
    'x-api-key',
    'X-API-Key',
    'cookie',
    'Cookie',
    'set-cookie',
    'Set-Cookie',
    'clientSecret',
    'client_secret',
  ];

  /**
   * Start logging a request
   */
  startRequest(
    method: HttpMethod,
    url: string,
    config?: LoggingConfig,
    options?: {
      headers?: Record<string, string>;
      body?: unknown;
      correlationId?: string;
      tenantId?: string;
      configId?: string;
      endpoint?: string;
    },
  ): RestRequestLog {
    const requestLog: RestRequestLog = {
      id: uuidv4(),
      timestamp: new Date(),
      method,
      url,
      correlationId: options?.correlationId,
    };

    if (config?.logHeaders && options?.headers) {
      requestLog.headers = this.maskHeaders(options.headers, config.maskFields);
    }

    if (config?.logBody && options?.body) {
      requestLog.body = this.maskBody(options.body, config.maskFields, config.maxBodySize);
    }

    if (config?.logRequests) {
      this.logRequest(requestLog, config.logLevel || 'debug');
    }

    return requestLog;
  }

  /**
   * Log response
   */
  logResponse(
    requestLog: RestRequestLog,
    statusCode: number,
    statusText: string,
    config?: LoggingConfig,
    options?: {
      headers?: Record<string, string>;
      body?: unknown;
      tenantId?: string;
      configId?: string;
      endpoint?: string;
    },
  ): RestResponseLog {
    const durationMs = Date.now() - requestLog.timestamp.getTime();

    const responseLog: RestResponseLog = {
      requestId: requestLog.id,
      timestamp: new Date(),
      statusCode,
      statusText,
      durationMs,
    };

    if (config?.logHeaders && options?.headers) {
      responseLog.headers = this.maskHeaders(options.headers, config.maskFields);
    }

    if (config?.logBody && options?.body) {
      responseLog.body = this.maskBody(options.body, config.maskFields, config.maxBodySize);
    }

    if (config?.logResponses) {
      this.logResponseInternal(responseLog, config.logLevel || 'debug');
    }

    // Store log entry
    this.storeLogEntry({
      id: requestLog.id,
      correlationId: requestLog.correlationId,
      tenantId: options?.tenantId,
      configId: options?.configId,
      endpoint: options?.endpoint,
      timestamp: requestLog.timestamp,
      request: {
        method: requestLog.method,
        url: requestLog.url,
        headers: requestLog.headers,
        body: requestLog.body,
      },
      response: {
        statusCode,
        statusText,
        headers: responseLog.headers,
        body: responseLog.body,
      },
      durationMs,
    });

    return responseLog;
  }

  /**
   * Log error
   */
  logError(
    requestLog: RestRequestLog,
    error: Error,
    config?: LoggingConfig,
    options?: {
      tenantId?: string;
      configId?: string;
      endpoint?: string;
    },
  ): void {
    const durationMs = Date.now() - requestLog.timestamp.getTime();

    this.logger.error(
      `Request failed: ${requestLog.method} ${requestLog.url} - ${error.message}`,
      error.stack,
    );

    // Store log entry with error
    this.storeLogEntry({
      id: requestLog.id,
      correlationId: requestLog.correlationId,
      tenantId: options?.tenantId,
      configId: options?.configId,
      endpoint: options?.endpoint,
      timestamp: requestLog.timestamp,
      request: {
        method: requestLog.method,
        url: requestLog.url,
        headers: requestLog.headers,
        body: requestLog.body,
      },
      durationMs,
      error: error.message,
    });
  }

  /**
   * Mask sensitive headers
   */
  private maskHeaders(
    headers: Record<string, string>,
    additionalMaskFields?: string[],
  ): Record<string, string> {
    const maskFields = [...this.defaultMaskFields, ...(additionalMaskFields || [])];
    const masked: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (maskFields.some((f) => lowerKey.includes(f.toLowerCase()))) {
        masked[key] = this.maskValue(value);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  /**
   * Mask sensitive fields in body
   */
  private maskBody(
    body: unknown,
    additionalMaskFields?: string[],
    maxSize?: number,
  ): unknown {
    if (!body) return body;

    const maskFields = [...this.defaultMaskFields, ...(additionalMaskFields || [])];

    // Handle string body
    if (typeof body === 'string') {
      const truncated = maxSize && body.length > maxSize ? body.substring(0, maxSize) + '...[truncated]' : body;
      return truncated;
    }

    // Handle object body
    if (typeof body === 'object') {
      const masked = this.maskObject(body as Record<string, unknown>, maskFields);

      // Truncate if needed
      if (maxSize) {
        const serialized = JSON.stringify(masked);
        if (serialized.length > maxSize) {
          return { _truncated: true, _size: serialized.length };
        }
      }

      return masked;
    }

    return body;
  }

  /**
   * Recursively mask object fields
   */
  private maskObject(
    obj: Record<string, unknown>,
    maskFields: string[],
  ): Record<string, unknown> {
    if (Array.isArray(obj)) {
      return obj.map((item) =>
        typeof item === 'object' && item !== null
          ? this.maskObject(item as Record<string, unknown>, maskFields)
          : item,
      ) as unknown as Record<string, unknown>;
    }

    const masked: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (maskFields.some((f) => lowerKey.includes(f.toLowerCase()))) {
        masked[key] = typeof value === 'string' ? this.maskValue(value) : '***MASKED***';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskObject(value as Record<string, unknown>, maskFields);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  /**
   * Mask a string value
   */
  private maskValue(value: string): string {
    if (value.length <= 4) {
      return '****';
    }
    return value.substring(0, 2) + '****' + value.substring(value.length - 2);
  }

  /**
   * Log request to console
   */
  private logRequest(log: RestRequestLog, level: 'debug' | 'info' | 'warn' | 'error'): void {
    const message = `REST Request: ${log.method} ${log.url}`;
    const details = {
      id: log.id,
      correlationId: log.correlationId,
      headers: log.headers,
      body: log.body,
    };

    switch (level) {
      case 'debug':
        this.logger.debug(message, details);
        break;
      case 'info':
        this.logger.log(message, details);
        break;
      case 'warn':
        this.logger.warn(message, details);
        break;
      case 'error':
        this.logger.error(message, details);
        break;
    }
  }

  /**
   * Log response to console
   */
  private logResponseInternal(log: RestResponseLog, level: 'debug' | 'info' | 'warn' | 'error'): void {
    const message = `REST Response: ${log.statusCode} ${log.statusText} (${log.durationMs}ms)`;
    const details = {
      requestId: log.requestId,
      headers: log.headers,
      body: log.body,
    };

    // Automatically escalate log level for errors
    const effectiveLevel = log.statusCode >= 500 ? 'error' : log.statusCode >= 400 ? 'warn' : level;

    switch (effectiveLevel) {
      case 'debug':
        this.logger.debug(message, details);
        break;
      case 'info':
        this.logger.log(message, details);
        break;
      case 'warn':
        this.logger.warn(message, details);
        break;
      case 'error':
        this.logger.error(message, details);
        break;
    }
  }

  /**
   * Store log entry in buffer
   */
  private storeLogEntry(entry: RestLogEntry): void {
    this.logBuffer.push(entry);

    // Trim buffer if needed
    while (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(options?: {
    limit?: number;
    correlationId?: string;
    tenantId?: string;
    configId?: string;
    since?: Date;
  }): RestLogEntry[] {
    let logs = [...this.logBuffer];

    // Filter by correlation ID
    if (options?.correlationId) {
      logs = logs.filter((l) => l.correlationId === options.correlationId);
    }

    // Filter by tenant ID
    if (options?.tenantId) {
      logs = logs.filter((l) => l.tenantId === options.tenantId);
    }

    // Filter by config ID
    if (options?.configId) {
      logs = logs.filter((l) => l.configId === options.configId);
    }

    // Filter by timestamp
    if (options?.since) {
      const since = options.since;
      logs = logs.filter((l) => l.timestamp >= since);
    }

    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    const limit = options?.limit || 100;
    return logs.slice(0, limit);
  }

  /**
   * Get log by ID
   */
  getLogById(id: string): RestLogEntry | undefined {
    return this.logBuffer.find((l) => l.id === id);
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logBuffer.length = 0;
  }

  /**
   * Get log statistics
   */
  getLogStats(): {
    totalLogs: number;
    errorCount: number;
    avgDurationMs: number;
    statusCodeCounts: Record<number, number>;
  } {
    const stats = {
      totalLogs: this.logBuffer.length,
      errorCount: 0,
      avgDurationMs: 0,
      statusCodeCounts: {} as Record<number, number>,
    };

    let totalDuration = 0;
    let durationCount = 0;

    for (const log of this.logBuffer) {
      if (log.error) {
        stats.errorCount++;
      }

      if (log.durationMs !== undefined) {
        totalDuration += log.durationMs;
        durationCount++;
      }

      if (log.response?.statusCode) {
        const code = log.response.statusCode;
        stats.statusCodeCounts[code] = (stats.statusCodeCounts[code] || 0) + 1;
      }
    }

    stats.avgDurationMs = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

    return stats;
  }
}
