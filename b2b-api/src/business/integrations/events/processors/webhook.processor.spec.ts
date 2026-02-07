import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { WebhookProcessor } from './webhook.processor';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';
import { WebhookJobData, WebhookDestination } from '../interfaces';

describe('WebhookProcessor', () => {
  let processor: WebhookProcessor;
  let webhookDelivery: WebhookDeliveryService;

  const mockWebhookDelivery = {
    deliverWebhook: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookProcessor,
        {
          provide: WebhookDeliveryService,
          useValue: mockWebhookDelivery,
        },
      ],
    }).compile();

    processor = module.get<WebhookProcessor>(WebhookProcessor);
    webhookDelivery = module.get<WebhookDeliveryService>(WebhookDeliveryService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    const destination: WebhookDestination = {
      url: 'https://example.com/webhook',
      method: 'POST',
    };

    it('should process a webhook delivery successfully', async () => {
      const jobData: WebhookJobData = {
        eventId: 'event-1',
        subscriptionId: 'sub-1',
        destination,
        payload: { data: 'test' },
        attempt: 1,
        maxAttempts: 5,
      };

      const job = {
        data: jobData,
        id: 'job-1',
      } as Job<WebhookJobData>;

      mockWebhookDelivery.deliverWebhook.mockResolvedValue({
        success: true,
        statusCode: 200,
      });

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(mockWebhookDelivery.deliverWebhook).toHaveBeenCalledWith(
        'event-1',
        'sub-1',
        destination,
        { data: 'test' },
        1,
      );
    });

    it('should throw error for retryable failure', async () => {
      const jobData: WebhookJobData = {
        eventId: 'event-1',
        subscriptionId: 'sub-1',
        destination,
        payload: { data: 'test' },
        attempt: 1,
        maxAttempts: 5,
      };

      const job = {
        data: jobData,
        id: 'job-1',
      } as Job<WebhookJobData>;

      mockWebhookDelivery.deliverWebhook.mockResolvedValue({
        success: false,
        statusCode: 500,
        error: 'Server error',
      });

      await expect(processor.process(job)).rejects.toThrow('Webhook delivery failed');
    });

    it('should not retry for non-retryable status codes', async () => {
      const jobData: WebhookJobData = {
        eventId: 'event-1',
        subscriptionId: 'sub-1',
        destination,
        payload: { data: 'test' },
        attempt: 1,
        maxAttempts: 5,
      };

      const job = {
        data: jobData,
        id: 'job-1',
      } as Job<WebhookJobData>;

      mockWebhookDelivery.deliverWebhook.mockResolvedValue({
        success: false,
        statusCode: 400, // Bad Request - not retryable
        error: 'Bad request',
      });

      const result = await processor.process(job);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
    });

    it('should retry for 429 rate limiting', async () => {
      const jobData: WebhookJobData = {
        eventId: 'event-1',
        subscriptionId: 'sub-1',
        destination,
        payload: { data: 'test' },
        attempt: 1,
        maxAttempts: 5,
      };

      const job = {
        data: jobData,
        id: 'job-1',
      } as Job<WebhookJobData>;

      mockWebhookDelivery.deliverWebhook.mockResolvedValue({
        success: false,
        statusCode: 429,
        error: 'Rate limited',
      });

      await expect(processor.process(job)).rejects.toThrow('Webhook delivery failed');
    });

    it('should retry for network errors (no status code)', async () => {
      const jobData: WebhookJobData = {
        eventId: 'event-1',
        subscriptionId: 'sub-1',
        destination,
        payload: { data: 'test' },
        attempt: 1,
        maxAttempts: 5,
      };

      const job = {
        data: jobData,
        id: 'job-1',
      } as Job<WebhookJobData>;

      mockWebhookDelivery.deliverWebhook.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      await expect(processor.process(job)).rejects.toThrow('Webhook delivery failed');
    });

    it('should not retry when max attempts reached', async () => {
      const jobData: WebhookJobData = {
        eventId: 'event-1',
        subscriptionId: 'sub-1',
        destination,
        payload: { data: 'test' },
        attempt: 5,
        maxAttempts: 5,
      };

      const job = {
        data: jobData,
        id: 'job-1',
      } as Job<WebhookJobData>;

      mockWebhookDelivery.deliverWebhook.mockResolvedValue({
        success: false,
        statusCode: 500,
        error: 'Server error',
      });

      const result = await processor.process(job);

      expect(result.success).toBe(false);
    });
  });

  describe('event handlers', () => {
    it('should handle onCompleted', () => {
      const job = {
        data: { eventId: 'event-1' },
        id: 'job-1',
      } as Job<WebhookJobData>;

      // Should not throw
      expect(() => processor.onCompleted(job)).not.toThrow();
    });

    it('should handle onFailed with max attempts', () => {
      const job = {
        data: {
          eventId: 'event-1',
          destination: { url: 'https://example.com' },
          attempt: 5,
          maxAttempts: 5,
        },
        id: 'job-1',
      } as unknown as Job<WebhookJobData>;

      // Should not throw
      expect(() => processor.onFailed(job, new Error('Failed'))).not.toThrow();
    });

    it('should handle onFailed with retries remaining', () => {
      const job = {
        data: {
          eventId: 'event-1',
          destination: { url: 'https://example.com' },
          attempt: 2,
          maxAttempts: 5,
        },
        id: 'job-1',
      } as unknown as Job<WebhookJobData>;

      // Should not throw
      expect(() => processor.onFailed(job, new Error('Failed'))).not.toThrow();
    });

    it('should handle onActive', () => {
      const job = {
        data: { eventId: 'event-1' },
        id: 'job-1',
      } as Job<WebhookJobData>;

      // Should not throw
      expect(() => processor.onActive(job)).not.toThrow();
    });
  });
});
