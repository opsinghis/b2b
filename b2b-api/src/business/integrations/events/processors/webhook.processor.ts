import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WebhookJobData, QUEUE_NAMES } from '../interfaces';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';

/**
 * Webhook Processor
 * Processes webhook delivery jobs from the BullMQ queue
 */
@Processor(QUEUE_NAMES.WEBHOOKS)
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly webhookDelivery: WebhookDeliveryService) {
    super();
  }

  /**
   * Process webhook delivery job
   */
  async process(job: Job<WebhookJobData>): Promise<{ success: boolean; statusCode?: number }> {
    const { eventId, subscriptionId, destination, payload, attempt, maxAttempts } = job.data;

    this.logger.debug(
      `Delivering webhook for event ${eventId} to ${destination.url} (attempt ${attempt}/${maxAttempts})`,
    );

    const result = await this.webhookDelivery.deliverWebhook(
      eventId,
      subscriptionId,
      destination,
      payload,
      attempt,
    );

    if (!result.success) {
      // Check if we should retry
      if (attempt < maxAttempts && this.isRetryable(result.statusCode)) {
        throw new Error(`Webhook delivery failed: ${result.error}`);
      }

      // Max retries reached or non-retryable error
      this.logger.warn(
        `Webhook delivery for event ${eventId} failed permanently: ${result.error}`,
      );
    }

    return {
      success: result.success,
      statusCode: result.statusCode,
    };
  }

  /**
   * Check if error is retryable based on status code
   */
  private isRetryable(statusCode?: number): boolean {
    if (!statusCode) {
      // Network errors are retryable
      return true;
    }

    // Retry on server errors and rate limiting
    if (statusCode >= 500 || statusCode === 429) {
      return true;
    }

    // Don't retry on client errors (except rate limiting)
    if (statusCode >= 400 && statusCode < 500) {
      return false;
    }

    return true;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<WebhookJobData>) {
    this.logger.debug(`Webhook job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<WebhookJobData>, error: Error) {
    const { eventId, destination, attempt, maxAttempts } = job.data;

    if (attempt >= maxAttempts) {
      this.logger.error(
        `Webhook delivery for event ${eventId} to ${destination.url} failed after ${maxAttempts} attempts: ${error.message}`,
      );
    } else {
      this.logger.warn(
        `Webhook delivery for event ${eventId} failed (attempt ${attempt}/${maxAttempts}): ${error.message}`,
      );
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job<WebhookJobData>) {
    this.logger.debug(`Webhook job ${job.id} is active`);
  }
}
