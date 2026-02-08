import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  WebhookDestination,
  WebhookJobData,
  EventDeliveryResult,
  EventPriority,
  QUEUE_NAMES,
} from '../interfaces';

/**
 * Webhook delivery configuration
 */
export interface WebhookDeliveryConfig {
  maxAttempts: number;
  timeout: number;
  retryDelays: number[];
}

/**
 * Webhook Delivery Service
 * Handles reliable webhook delivery with retries
 */
@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);
  private readonly deliveryResults = new Map<string, EventDeliveryResult[]>();
  private readonly maxResultsPerEvent = 100;

  private readonly defaultConfig: WebhookDeliveryConfig = {
    maxAttempts: 5,
    timeout: 30000,
    retryDelays: [1000, 5000, 30000, 120000, 300000], // 1s, 5s, 30s, 2m, 5m
  };

  constructor(
    @InjectQueue(QUEUE_NAMES.WEBHOOKS)
    private readonly webhooksQueue: Queue<WebhookJobData>,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Queue a webhook for delivery
   */
  async queueWebhook(
    eventId: string,
    subscriptionId: string,
    destination: WebhookDestination,
    payload: unknown,
    options?: { priority?: EventPriority; delay?: number },
  ): Promise<string> {
    const jobId = `${eventId}-${subscriptionId}`;

    const jobData: WebhookJobData = {
      eventId,
      subscriptionId,
      destination,
      payload,
      attempt: 1,
      maxAttempts: this.defaultConfig.maxAttempts,
    };

    await this.webhooksQueue.add('deliver', jobData, {
      jobId,
      priority: options?.priority || EventPriority.NORMAL,
      delay: options?.delay,
      attempts: this.defaultConfig.maxAttempts,
      backoff: {
        type: 'custom',
      },
      removeOnComplete: {
        age: 86400, // 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 604800, // 7 days
      },
    });

    this.logger.debug(`Queued webhook delivery for event ${eventId} to ${destination.url}`);

    return jobId;
  }

  /**
   * Deliver webhook immediately (synchronous)
   */
  async deliverWebhook(
    eventId: string,
    subscriptionId: string,
    destination: WebhookDestination,
    payload: unknown,
    attempt: number = 1,
  ): Promise<EventDeliveryResult> {
    const startTime = Date.now();
    const result: EventDeliveryResult = {
      eventId,
      subscriptionId,
      success: false,
      duration: 0,
      attempt,
      deliveredAt: new Date(),
    };

    try {
      // Build request headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Event-ID': eventId,
        'X-Delivery-Attempt': String(attempt),
        'X-Subscription-ID': subscriptionId,
        ...destination.headers,
      };

      // Apply authentication
      this.applyAuth(headers, destination);

      // Make request
      const response = await firstValueFrom(
        this.httpService.request({
          method: destination.method,
          url: destination.url,
          headers,
          data: payload,
          timeout: destination.timeout || this.defaultConfig.timeout,
          validateStatus: () => true, // Accept any status to handle it ourselves
          httpsAgent:
            destination.verifySsl === false
              ? new (require('https').Agent)({ rejectUnauthorized: false })
              : undefined,
        }),
      );

      result.statusCode = response.status;
      result.response = response.data;
      result.success = response.status >= 200 && response.status < 300;

      if (!result.success) {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
        this.logger.warn(`Webhook delivery failed for event ${eventId}: ${result.error}`);
      } else {
        this.logger.debug(`Webhook delivered successfully for event ${eventId}`);
      }
    } catch (error) {
      result.error = (error as Error).message;
      this.logger.error(`Webhook delivery error for event ${eventId}:`, error);
    }

    result.duration = Date.now() - startTime;

    // Store result
    this.storeDeliveryResult(eventId, result);

    return result;
  }

  /**
   * Apply authentication to headers
   */
  private applyAuth(headers: Record<string, string>, destination: WebhookDestination): void {
    if (!destination.auth || destination.auth.type === 'none') {
      return;
    }

    const credentials = destination.auth.credentials || {};

    switch (destination.auth.type) {
      case 'basic':
        const basicAuth = Buffer.from(`${credentials.username}:${credentials.password}`).toString(
          'base64',
        );
        headers['Authorization'] = `Basic ${basicAuth}`;
        break;

      case 'bearer':
        headers['Authorization'] = `Bearer ${credentials.token}`;
        break;

      case 'api_key':
        const keyName = credentials.keyName || 'X-API-Key';
        headers[keyName] = credentials.apiKey || '';
        break;

      case 'hmac':
        // HMAC signature will be computed by the processor with the actual payload
        break;
    }
  }

  /**
   * Compute HMAC signature for payload
   */
  computeHmacSignature(
    payload: string,
    secret: string,
    algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha256',
  ): string {
    return crypto.createHmac(algorithm, secret).update(payload, 'utf8').digest('hex');
  }

  /**
   * Store delivery result
   */
  private storeDeliveryResult(eventId: string, result: EventDeliveryResult): void {
    if (!this.deliveryResults.has(eventId)) {
      this.deliveryResults.set(eventId, []);
    }

    const results = this.deliveryResults.get(eventId)!;
    results.push(result);

    // Trim if needed
    while (results.length > this.maxResultsPerEvent) {
      results.shift();
    }
  }

  /**
   * Get delivery results for an event
   */
  getDeliveryResults(eventId: string): EventDeliveryResult[] {
    return this.deliveryResults.get(eventId) || [];
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(): Promise<{
    queued: number;
    active: number;
    completed: number;
    failed: number;
    successRate: number;
    avgDuration: number;
  }> {
    const [queued, active, completed, failed] = await Promise.all([
      this.webhooksQueue.getWaitingCount(),
      this.webhooksQueue.getActiveCount(),
      this.webhooksQueue.getCompletedCount(),
      this.webhooksQueue.getFailedCount(),
    ]);

    // Calculate stats from stored results
    let totalDuration = 0;
    let successCount = 0;
    let totalCount = 0;

    for (const results of this.deliveryResults.values()) {
      for (const result of results) {
        totalDuration += result.duration;
        if (result.success) successCount++;
        totalCount++;
      }
    }

    return {
      queued,
      active,
      completed,
      failed,
      successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0,
      avgDuration: totalCount > 0 ? Math.round(totalDuration / totalCount) : 0,
    };
  }

  /**
   * Retry failed delivery
   */
  async retryDelivery(eventId: string, subscriptionId: string): Promise<boolean> {
    const jobId = `${eventId}-${subscriptionId}`;
    const job = await this.webhooksQueue.getJob(jobId);

    if (!job) {
      this.logger.warn(`Job ${jobId} not found for retry`);
      return false;
    }

    await job.retry();
    this.logger.log(`Retried webhook delivery for job ${jobId}`);
    return true;
  }

  /**
   * Clear delivery results
   */
  clearResults(eventId?: string): void {
    if (eventId) {
      this.deliveryResults.delete(eventId);
    } else {
      this.deliveryResults.clear();
    }
  }
}
