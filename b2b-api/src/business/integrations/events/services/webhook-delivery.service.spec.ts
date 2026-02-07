import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { getQueueToken } from '@nestjs/bullmq';
import { of, throwError } from 'rxjs';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { QUEUE_NAMES, WebhookDestination, EventPriority } from '../interfaces';

describe('WebhookDeliveryService', () => {
  let service: WebhookDeliveryService;
  let httpService: HttpService;

  const mockQueue = {
    add: jest.fn(),
    getWaitingCount: jest.fn(),
    getActiveCount: jest.fn(),
    getCompletedCount: jest.fn(),
    getFailedCount: jest.fn(),
    getJob: jest.fn(),
  };

  const mockHttpService = {
    request: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookDeliveryService,
        {
          provide: getQueueToken(QUEUE_NAMES.WEBHOOKS),
          useValue: mockQueue,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<WebhookDeliveryService>(WebhookDeliveryService);
    httpService = module.get<HttpService>(HttpService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('queueWebhook', () => {
    it('should queue a webhook for delivery', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const destination: WebhookDestination = {
        url: 'https://example.com/webhook',
        method: 'POST',
      };

      const jobId = await service.queueWebhook(
        'event-1',
        'sub-1',
        destination,
        { data: 'test' },
      );

      expect(jobId).toBe('event-1-sub-1');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'deliver',
        expect.objectContaining({
          eventId: 'event-1',
          subscriptionId: 'sub-1',
          destination,
          payload: { data: 'test' },
        }),
        expect.any(Object),
      );
    });

    it('should accept priority option', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const destination: WebhookDestination = {
        url: 'https://example.com/webhook',
        method: 'POST',
      };

      await service.queueWebhook('event-1', 'sub-1', destination, {}, {
        priority: EventPriority.HIGH,
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'deliver',
        expect.any(Object),
        expect.objectContaining({ priority: EventPriority.HIGH }),
      );
    });

    it('should accept delay option', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const destination: WebhookDestination = {
        url: 'https://example.com/webhook',
        method: 'POST',
      };

      await service.queueWebhook('event-1', 'sub-1', destination, {}, {
        delay: 5000,
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'deliver',
        expect.any(Object),
        expect.objectContaining({ delay: 5000 }),
      );
    });
  });

  describe('deliverWebhook', () => {
    const destination: WebhookDestination = {
      url: 'https://example.com/webhook',
      method: 'POST',
    };

    it('should deliver webhook successfully', async () => {
      mockHttpService.request.mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          data: { received: true },
        }),
      );

      const result = await service.deliverWebhook(
        'event-1',
        'sub-1',
        destination,
        { data: 'test' },
      );

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.eventId).toBe('event-1');
      expect(result.subscriptionId).toBe('sub-1');
    });

    it('should handle failed delivery (non-2xx)', async () => {
      mockHttpService.request.mockReturnValue(
        of({
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Server error' },
        }),
      );

      const result = await service.deliverWebhook(
        'event-1',
        'sub-1',
        destination,
        { data: 'test' },
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toContain('500');
    });

    it('should handle network errors', async () => {
      mockHttpService.request.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      const result = await service.deliverWebhook(
        'event-1',
        'sub-1',
        destination,
        { data: 'test' },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should track attempt number', async () => {
      mockHttpService.request.mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          data: {},
        }),
      );

      const result = await service.deliverWebhook(
        'event-1',
        'sub-1',
        destination,
        { data: 'test' },
        3,
      );

      expect(result.attempt).toBe(3);
    });

    it('should include custom headers', async () => {
      mockHttpService.request.mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          data: {},
        }),
      );

      const destWithHeaders: WebhookDestination = {
        url: 'https://example.com/webhook',
        method: 'POST',
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      };

      await service.deliverWebhook('event-1', 'sub-1', destWithHeaders, {});

      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        }),
      );
    });

    it('should apply basic auth', async () => {
      mockHttpService.request.mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          data: {},
        }),
      );

      const destWithAuth: WebhookDestination = {
        url: 'https://example.com/webhook',
        method: 'POST',
        auth: {
          type: 'basic',
          credentials: {
            username: 'user',
            password: 'pass',
          },
        },
      };

      await service.deliverWebhook('event-1', 'sub-1', destWithAuth, {});

      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
          }),
        }),
      );
    });

    it('should apply bearer token auth', async () => {
      mockHttpService.request.mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          data: {},
        }),
      );

      const destWithAuth: WebhookDestination = {
        url: 'https://example.com/webhook',
        method: 'POST',
        auth: {
          type: 'bearer',
          credentials: {
            token: 'my-token',
          },
        },
      };

      await service.deliverWebhook('event-1', 'sub-1', destWithAuth, {});

      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-token',
          }),
        }),
      );
    });

    it('should apply API key auth', async () => {
      mockHttpService.request.mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          data: {},
        }),
      );

      const destWithAuth: WebhookDestination = {
        url: 'https://example.com/webhook',
        method: 'POST',
        auth: {
          type: 'api_key',
          credentials: {
            keyName: 'X-API-Key',
            apiKey: 'secret-key',
          },
        },
      };

      await service.deliverWebhook('event-1', 'sub-1', destWithAuth, {});

      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'secret-key',
          }),
        }),
      );
    });
  });

  describe('computeHmacSignature', () => {
    it('should compute SHA256 HMAC', () => {
      const signature = service.computeHmacSignature(
        '{"data":"test"}',
        'secret',
        'sha256',
      );

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64); // SHA256 hex is 64 chars
    });

    it('should compute SHA1 HMAC', () => {
      const signature = service.computeHmacSignature(
        '{"data":"test"}',
        'secret',
        'sha1',
      );

      expect(signature.length).toBe(40); // SHA1 hex is 40 chars
    });

    it('should compute SHA512 HMAC', () => {
      const signature = service.computeHmacSignature(
        '{"data":"test"}',
        'secret',
        'sha512',
      );

      expect(signature.length).toBe(128); // SHA512 hex is 128 chars
    });
  });

  describe('getDeliveryResults', () => {
    it('should return delivery results for an event', async () => {
      mockHttpService.request.mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          data: {},
        }),
      );

      const destination: WebhookDestination = {
        url: 'https://example.com/webhook',
        method: 'POST',
      };

      await service.deliverWebhook('event-1', 'sub-1', destination, {});
      await service.deliverWebhook('event-1', 'sub-2', destination, {});

      const results = service.getDeliveryResults('event-1');
      expect(results).toHaveLength(2);
    });

    it('should return empty array for unknown event', () => {
      const results = service.getDeliveryResults('unknown');
      expect(results).toHaveLength(0);
    });
  });

  describe('getDeliveryStats', () => {
    it('should return delivery statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(10);
      mockQueue.getActiveCount.mockResolvedValue(5);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(2);

      const stats = await service.getDeliveryStats();

      expect(stats.queued).toBe(10);
      expect(stats.active).toBe(5);
      expect(stats.completed).toBe(100);
      expect(stats.failed).toBe(2);
    });

    it('should calculate success rate', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(0);
      mockQueue.getActiveCount.mockResolvedValue(0);
      mockQueue.getCompletedCount.mockResolvedValue(0);
      mockQueue.getFailedCount.mockResolvedValue(0);

      mockHttpService.request.mockReturnValue(
        of({ status: 200, statusText: 'OK', data: {} }),
      );

      const destination: WebhookDestination = {
        url: 'https://example.com/webhook',
        method: 'POST',
      };

      await service.deliverWebhook('event-1', 'sub-1', destination, {});
      await service.deliverWebhook('event-2', 'sub-1', destination, {});

      const stats = await service.getDeliveryStats();
      expect(stats.successRate).toBe(100);
    });
  });

  describe('retryDelivery', () => {
    it('should retry a failed delivery', async () => {
      const mockJob = { retry: jest.fn() };
      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.retryDelivery('event-1', 'sub-1');

      expect(result).toBe(true);
      expect(mockJob.retry).toHaveBeenCalled();
    });

    it('should return false if job not found', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      const result = await service.retryDelivery('event-1', 'sub-1');

      expect(result).toBe(false);
    });
  });

  describe('clearResults', () => {
    it('should clear results for specific event', async () => {
      mockHttpService.request.mockReturnValue(
        of({ status: 200, statusText: 'OK', data: {} }),
      );

      const destination: WebhookDestination = {
        url: 'https://example.com/webhook',
        method: 'POST',
      };

      await service.deliverWebhook('event-1', 'sub-1', destination, {});
      await service.deliverWebhook('event-2', 'sub-1', destination, {});

      service.clearResults('event-1');

      expect(service.getDeliveryResults('event-1')).toHaveLength(0);
      expect(service.getDeliveryResults('event-2')).toHaveLength(1);
    });

    it('should clear all results', async () => {
      mockHttpService.request.mockReturnValue(
        of({ status: 200, statusText: 'OK', data: {} }),
      );

      const destination: WebhookDestination = {
        url: 'https://example.com/webhook',
        method: 'POST',
      };

      await service.deliverWebhook('event-1', 'sub-1', destination, {});
      await service.deliverWebhook('event-2', 'sub-1', destination, {});

      service.clearResults();

      expect(service.getDeliveryResults('event-1')).toHaveLength(0);
      expect(service.getDeliveryResults('event-2')).toHaveLength(0);
    });
  });
});
