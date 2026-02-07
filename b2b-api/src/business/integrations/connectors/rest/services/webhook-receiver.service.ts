import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { WebhookConfig } from '../interfaces';
import { JsonPathMapperService } from './json-path-mapper.service';

/**
 * Webhook event data
 */
export interface WebhookEvent {
  id: string;
  timestamp: Date;
  tenantId: string;
  configId: string;
  eventType: string;
  payload: unknown;
  headers: Record<string, string>;
  rawBody: string;
  verified: boolean;
  source: string;
}

/**
 * Webhook validation result
 */
export interface WebhookValidationResult {
  valid: boolean;
  error?: string;
  event?: WebhookEvent;
}

/**
 * Webhook Receiver Service
 * Handles incoming webhooks with signature validation
 */
@Injectable()
export class WebhookReceiverService {
  private readonly logger = new Logger(WebhookReceiverService.name);
  private readonly eventBuffer: WebhookEvent[] = [];
  private readonly maxBufferSize = 1000;
  private readonly eventHandlers = new Map<string, ((event: WebhookEvent) => Promise<void>)[]>();

  constructor(private readonly jsonPathMapper: JsonPathMapperService) {}

  /**
   * Process incoming webhook
   */
  async processWebhook(
    config: WebhookConfig,
    tenantId: string,
    configId: string,
    source: string,
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<WebhookValidationResult> {
    const eventId = this.generateEventId();
    const timestamp = new Date();

    // Validate signature
    const signatureValid = this.validateSignature(config, rawBody, headers);
    if (!signatureValid.valid) {
      this.logger.warn(`Webhook signature validation failed: ${signatureValid.error}`);
      return signatureValid;
    }

    // Validate timestamp
    const timestampValid = this.validateTimestamp(config, headers);
    if (!timestampValid.valid) {
      this.logger.warn(`Webhook timestamp validation failed: ${timestampValid.error}`);
      return timestampValid;
    }

    // Parse payload
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid JSON payload',
      };
    }

    // Extract event type
    const eventType = this.extractEventType(config, payload, headers);
    if (!eventType) {
      return {
        valid: false,
        error: 'Could not determine event type',
      };
    }

    // Extract actual payload data
    let eventPayload = payload;
    if (config.payloadPath) {
      const extracted = this.jsonPathMapper.extractValue(payload, config.payloadPath);
      if (extracted !== undefined) {
        eventPayload = extracted;
      }
    }

    // Create event
    const event: WebhookEvent = {
      id: eventId,
      timestamp,
      tenantId,
      configId,
      eventType,
      payload: eventPayload,
      headers,
      rawBody,
      verified: true,
      source,
    };

    // Store event
    this.storeEvent(event);

    // Dispatch to handlers
    await this.dispatchEvent(event);

    return {
      valid: true,
      event,
    };
  }

  /**
   * Validate webhook signature
   */
  private validateSignature(
    config: WebhookConfig,
    rawBody: string,
    headers: Record<string, string>,
  ): WebhookValidationResult {
    if (!config.secret || !config.signatureHeader) {
      // No signature validation configured
      return { valid: true };
    }

    const signature = this.getHeader(headers, config.signatureHeader);
    if (!signature) {
      return {
        valid: false,
        error: `Missing signature header: ${config.signatureHeader}`,
      };
    }

    const algorithm = config.signatureAlgorithm || 'hmac-sha256';
    const expectedSignature = this.computeSignature(rawBody, config.secret, algorithm);

    // Handle different signature formats
    const normalizedSignature = this.normalizeSignature(signature, algorithm);
    const normalizedExpected = this.normalizeSignature(expectedSignature, algorithm);

    // Use timing-safe comparison
    if (!this.timingSafeEqual(normalizedSignature, normalizedExpected)) {
      return {
        valid: false,
        error: 'Invalid signature',
      };
    }

    return { valid: true };
  }

  /**
   * Validate webhook timestamp
   */
  private validateTimestamp(
    config: WebhookConfig,
    headers: Record<string, string>,
  ): WebhookValidationResult {
    if (!config.timestampHeader || !config.timestampTolerance) {
      // No timestamp validation configured
      return { valid: true };
    }

    const timestampHeader = this.getHeader(headers, config.timestampHeader);
    if (!timestampHeader) {
      return {
        valid: false,
        error: `Missing timestamp header: ${config.timestampHeader}`,
      };
    }

    // Parse timestamp (try multiple formats)
    let timestamp: number;
    const parsed = parseInt(timestampHeader, 10);
    if (!isNaN(parsed)) {
      // Unix timestamp (seconds or milliseconds)
      timestamp = parsed > 1e12 ? parsed : parsed * 1000;
    } else {
      // ISO date string
      timestamp = new Date(timestampHeader).getTime();
    }

    if (isNaN(timestamp)) {
      return {
        valid: false,
        error: 'Invalid timestamp format',
      };
    }

    const now = Date.now();
    const age = Math.abs(now - timestamp) / 1000;

    if (age > config.timestampTolerance) {
      return {
        valid: false,
        error: `Timestamp too old: ${age}s (max: ${config.timestampTolerance}s)`,
      };
    }

    return { valid: true };
  }

  /**
   * Extract event type from payload or headers
   */
  private extractEventType(
    config: WebhookConfig,
    payload: unknown,
    headers: Record<string, string>,
  ): string | undefined {
    // Try to extract from payload using JSONPath
    if (config.eventTypePath) {
      const eventType = this.jsonPathMapper.extractValue(payload, config.eventTypePath);
      if (eventType) {
        return String(eventType);
      }
    }

    // Try common header names
    const headerNames = [
      'x-event-type',
      'x-webhook-event',
      'x-github-event',
      'x-stripe-event',
      'x-gitlab-event',
    ];

    for (const name of headerNames) {
      const value = this.getHeader(headers, name);
      if (value) {
        return value;
      }
    }

    // Try common payload paths
    const payloadPaths = ['$.event', '$.type', '$.eventType', '$.event_type', '$.action'];

    for (const path of payloadPaths) {
      const value = this.jsonPathMapper.extractValue(payload, path);
      if (value) {
        return String(value);
      }
    }

    return undefined;
  }

  /**
   * Compute HMAC signature
   */
  private computeSignature(
    payload: string,
    secret: string,
    algorithm: 'hmac-sha1' | 'hmac-sha256' | 'hmac-sha512',
  ): string {
    const hashAlgorithm = algorithm.replace('hmac-', '');
    return crypto.createHmac(hashAlgorithm, secret).update(payload, 'utf8').digest('hex');
  }

  /**
   * Normalize signature (remove prefix like "sha256=")
   */
  private normalizeSignature(
    signature: string,
    algorithm: 'hmac-sha1' | 'hmac-sha256' | 'hmac-sha512',
  ): string {
    const prefixes = {
      'hmac-sha1': ['sha1=', 'SHA1='],
      'hmac-sha256': ['sha256=', 'SHA256='],
      'hmac-sha512': ['sha512=', 'SHA512='],
    };

    let normalized = signature;
    for (const prefix of prefixes[algorithm]) {
      if (normalized.startsWith(prefix)) {
        normalized = normalized.slice(prefix.length);
        break;
      }
    }

    return normalized.toLowerCase();
  }

  /**
   * Timing-safe string comparison
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Get header value (case-insensitive)
   */
  private getHeader(headers: Record<string, string>, name: string): string | undefined {
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === lowerName) {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `wh_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Store event in buffer
   */
  private storeEvent(event: WebhookEvent): void {
    this.eventBuffer.push(event);

    // Trim buffer
    while (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer.shift();
    }
  }

  /**
   * Dispatch event to registered handlers
   */
  private async dispatchEvent(event: WebhookEvent): Promise<void> {
    // Get handlers for this event type
    const handlers = this.eventHandlers.get(event.eventType) || [];
    const wildcardHandlers = this.eventHandlers.get('*') || [];
    const allHandlers = [...handlers, ...wildcardHandlers];

    for (const handler of allHandlers) {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(`Error handling webhook event ${event.id}:`, error);
      }
    }
  }

  /**
   * Register event handler
   */
  onEvent(eventType: string, handler: (event: WebhookEvent) => Promise<void>): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  /**
   * Unregister event handler
   */
  offEvent(eventType: string, handler: (event: WebhookEvent) => Promise<void>): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Get recent events
   */
  getEvents(options?: {
    limit?: number;
    tenantId?: string;
    configId?: string;
    eventType?: string;
    since?: Date;
  }): WebhookEvent[] {
    let events = [...this.eventBuffer];

    if (options?.tenantId) {
      events = events.filter((e) => e.tenantId === options.tenantId);
    }

    if (options?.configId) {
      events = events.filter((e) => e.configId === options.configId);
    }

    if (options?.eventType) {
      events = events.filter((e) => e.eventType === options.eventType);
    }

    if (options?.since) {
      const since = options.since;
      events = events.filter((e) => e.timestamp >= since);
    }

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    const limit = options?.limit || 100;
    return events.slice(0, limit);
  }

  /**
   * Get event by ID
   */
  getEventById(id: string): WebhookEvent | undefined {
    return this.eventBuffer.find((e) => e.id === id);
  }

  /**
   * Validate webhook configuration
   */
  validateWebhookConfig(config: WebhookConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.enabled) {
      if (config.secret && !config.signatureHeader) {
        errors.push('signatureHeader is required when secret is provided');
      }

      if (
        config.signatureAlgorithm &&
        !['hmac-sha1', 'hmac-sha256', 'hmac-sha512'].includes(config.signatureAlgorithm)
      ) {
        errors.push('Invalid signatureAlgorithm');
      }

      if (config.timestampTolerance && !config.timestampHeader) {
        errors.push('timestampHeader is required when timestampTolerance is provided');
      }

      if (config.eventTypePath) {
        const validation = this.jsonPathMapper.validateJsonPath(config.eventTypePath);
        if (!validation.valid) {
          errors.push(`Invalid eventTypePath: ${validation.error}`);
        }
      }

      if (config.payloadPath) {
        const validation = this.jsonPathMapper.validateJsonPath(config.payloadPath);
        if (!validation.valid) {
          errors.push(`Invalid payloadPath: ${validation.error}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
