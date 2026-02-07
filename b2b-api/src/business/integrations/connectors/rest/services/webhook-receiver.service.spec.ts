import { Test, TestingModule } from '@nestjs/testing';
import { WebhookReceiverService } from './webhook-receiver.service';
import { JsonPathMapperService } from './json-path-mapper.service';
import * as crypto from 'crypto';

describe('WebhookReceiverService', () => {
  let service: WebhookReceiverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhookReceiverService, JsonPathMapperService],
    }).compile();

    service = module.get<WebhookReceiverService>(WebhookReceiverService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processWebhook', () => {
    const webhookConfig = {
      enabled: true,
      secret: 'test-secret',
      signatureHeader: 'x-signature',
      signatureAlgorithm: 'hmac-sha256' as const,
      eventTypePath: '$.event',
    };

    const computeSignature = (payload: string, secret: string) => {
      return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
    };

    it('should process valid webhook', async () => {
      const payload = JSON.stringify({ event: 'user.created', data: { id: 1 } });
      const signature = computeSignature(payload, 'test-secret');

      const result = await service.processWebhook(
        webhookConfig,
        'tenant-1',
        'config-1',
        'test-connector',
        payload,
        { 'x-signature': signature },
      );

      expect(result.valid).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event?.eventType).toBe('user.created');
    });

    it('should reject invalid signature', async () => {
      const payload = JSON.stringify({ event: 'user.created', data: { id: 1 } });

      const result = await service.processWebhook(
        webhookConfig,
        'tenant-1',
        'config-1',
        'test-connector',
        payload,
        { 'x-signature': 'invalid-signature' },
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('should reject missing signature header', async () => {
      const payload = JSON.stringify({ event: 'user.created', data: { id: 1 } });

      const result = await service.processWebhook(
        webhookConfig,
        'tenant-1',
        'config-1',
        'test-connector',
        payload,
        {},
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing signature header');
    });

    it('should process webhook without signature validation', async () => {
      const configNoSecret = {
        enabled: true,
        eventTypePath: '$.event',
      };
      const payload = JSON.stringify({ event: 'user.created', data: { id: 1 } });

      const result = await service.processWebhook(
        configNoSecret,
        'tenant-1',
        'config-1',
        'test-connector',
        payload,
        {},
      );

      expect(result.valid).toBe(true);
      expect(result.event?.eventType).toBe('user.created');
    });

    it('should handle signature with sha256= prefix', async () => {
      const payload = JSON.stringify({ event: 'user.created', data: { id: 1 } });
      const signature = 'sha256=' + computeSignature(payload, 'test-secret');

      const result = await service.processWebhook(
        webhookConfig,
        'tenant-1',
        'config-1',
        'test-connector',
        payload,
        { 'x-signature': signature },
      );

      expect(result.valid).toBe(true);
    });

    it('should validate timestamp when configured', async () => {
      const configWithTimestamp = {
        ...webhookConfig,
        timestampHeader: 'x-timestamp',
        timestampTolerance: 300, // 5 minutes
      };

      const payload = JSON.stringify({ event: 'user.created', data: { id: 1 } });
      const signature = computeSignature(payload, 'test-secret');
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const result = await service.processWebhook(
        configWithTimestamp,
        'tenant-1',
        'config-1',
        'test-connector',
        payload,
        { 'x-signature': signature, 'x-timestamp': timestamp },
      );

      expect(result.valid).toBe(true);
    });

    it('should reject old timestamp', async () => {
      const configWithTimestamp = {
        ...webhookConfig,
        timestampHeader: 'x-timestamp',
        timestampTolerance: 60, // 1 minute
      };

      const payload = JSON.stringify({ event: 'user.created', data: { id: 1 } });
      const signature = computeSignature(payload, 'test-secret');
      const oldTimestamp = Math.floor((Date.now() - 120000) / 1000).toString(); // 2 minutes ago

      const result = await service.processWebhook(
        configWithTimestamp,
        'tenant-1',
        'config-1',
        'test-connector',
        payload,
        { 'x-signature': signature, 'x-timestamp': oldTimestamp },
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Timestamp too old');
    });

    it('should reject invalid JSON payload', async () => {
      const result = await service.processWebhook(
        { enabled: true },
        'tenant-1',
        'config-1',
        'test-connector',
        'not valid json',
        {},
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid JSON payload');
    });

    it('should extract event type from common header', async () => {
      const configNoEventPath = { enabled: true };
      const payload = JSON.stringify({ data: { id: 1 } });

      const result = await service.processWebhook(
        configNoEventPath,
        'tenant-1',
        'config-1',
        'test-connector',
        payload,
        { 'x-event-type': 'user.created' },
      );

      expect(result.valid).toBe(true);
      expect(result.event?.eventType).toBe('user.created');
    });

    it('should extract payload using payloadPath', async () => {
      const configWithPayloadPath = {
        enabled: true,
        eventTypePath: '$.event',
        payloadPath: '$.data',
      };
      const payload = JSON.stringify({ event: 'user.created', data: { user: { id: 1 } } });

      const result = await service.processWebhook(
        configWithPayloadPath,
        'tenant-1',
        'config-1',
        'test-connector',
        payload,
        {},
      );

      expect(result.valid).toBe(true);
      expect(result.event?.payload).toEqual({ user: { id: 1 } });
    });
  });

  describe('onEvent / offEvent', () => {
    it('should register and trigger event handler', async () => {
      const handler = jest.fn();
      service.onEvent('test.event', handler);

      const payload = JSON.stringify({ event: 'test.event', data: { id: 1 } });

      await service.processWebhook(
        { enabled: true, eventTypePath: '$.event' },
        'tenant-1',
        'config-1',
        'test-connector',
        payload,
        {},
      );

      expect(handler).toHaveBeenCalled();
    });

    it('should trigger wildcard handler', async () => {
      const handler = jest.fn();
      service.onEvent('*', handler);

      const payload = JSON.stringify({ event: 'any.event', data: { id: 1 } });

      await service.processWebhook(
        { enabled: true, eventTypePath: '$.event' },
        'tenant-1',
        'config-1',
        'test-connector',
        payload,
        {},
      );

      expect(handler).toHaveBeenCalled();
    });

    it('should unregister event handler', async () => {
      const handler = jest.fn();
      service.onEvent('test.event', handler);
      service.offEvent('test.event', handler);

      const payload = JSON.stringify({ event: 'test.event', data: { id: 1 } });

      await service.processWebhook(
        { enabled: true, eventTypePath: '$.event' },
        'tenant-1',
        'config-1',
        'test-connector',
        payload,
        {},
      );

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('getEvents', () => {
    beforeEach(async () => {
      // Process some test webhooks
      const payload = JSON.stringify({ event: 'test.event', data: { id: 1 } });
      await service.processWebhook(
        { enabled: true, eventTypePath: '$.event' },
        'tenant-1',
        'config-1',
        'test-connector',
        payload,
        {},
      );
      await service.processWebhook(
        { enabled: true, eventTypePath: '$.event' },
        'tenant-2',
        'config-2',
        'test-connector',
        payload,
        {},
      );
    });

    it('should return all events', () => {
      const events = service.getEvents();
      expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by tenantId', () => {
      const events = service.getEvents({ tenantId: 'tenant-1' });
      events.forEach(e => expect(e.tenantId).toBe('tenant-1'));
    });

    it('should filter by eventType', () => {
      const events = service.getEvents({ eventType: 'test.event' });
      events.forEach(e => expect(e.eventType).toBe('test.event'));
    });

    it('should apply limit', () => {
      const events = service.getEvents({ limit: 1 });
      expect(events.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getEventById', () => {
    it('should return event by ID', async () => {
      const payload = JSON.stringify({ event: 'test.event', data: { id: 1 } });
      const result = await service.processWebhook(
        { enabled: true, eventTypePath: '$.event' },
        'tenant-1',
        'config-1',
        'test-connector',
        payload,
        {},
      );

      const event = service.getEventById(result.event!.id);
      expect(event).toBeDefined();
      expect(event?.id).toBe(result.event!.id);
    });

    it('should return undefined for non-existent ID', () => {
      const event = service.getEventById('non-existent');
      expect(event).toBeUndefined();
    });
  });

  describe('validateWebhookConfig', () => {
    it('should validate correct config', () => {
      const result = service.validateWebhookConfig({
        enabled: true,
        secret: 'test-secret',
        signatureHeader: 'x-signature',
        signatureAlgorithm: 'hmac-sha256',
      });

      expect(result.valid).toBe(true);
    });

    it('should reject secret without signatureHeader', () => {
      const result = service.validateWebhookConfig({
        enabled: true,
        secret: 'test-secret',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('signatureHeader is required when secret is provided');
    });

    it('should reject invalid signature algorithm', () => {
      const result = service.validateWebhookConfig({
        enabled: true,
        signatureAlgorithm: 'invalid' as any,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid signatureAlgorithm');
    });

    it('should reject timestampTolerance without timestampHeader', () => {
      const result = service.validateWebhookConfig({
        enabled: true,
        timestampTolerance: 300,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('timestampHeader is required when timestampTolerance is provided');
    });
  });
});
