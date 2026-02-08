import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  DeliveryJob,
  DeliveryResult,
  TransportProtocol,
  TransportDirection,
  TransportStatus,
  As2SendRequest,
  SftpUploadRequest,
} from '../interfaces';
import { As2ClientService } from './as2-client.service';
import { SftpClientService } from './sftp-client.service';
import { TransportLogService } from './transport-log.service';

/**
 * Delivery queue options
 */
export interface QueueDeliveryOptions {
  tenantId: string;
  partnerId: string;
  protocol: TransportProtocol;
  content: Buffer;
  contentType: string;
  filename?: string;
  messageId?: string;
  correlationId?: string;
  priority?: number;
  maxRetries?: number;
  scheduledAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 5000,
  maxDelayMs: 300000, // 5 minutes
  backoffMultiplier: 2,
};

/**
 * Outbound Delivery Service
 *
 * Manages outbound file/message delivery to trading partners:
 * - Queue-based delivery management
 * - Priority scheduling
 * - Retry with exponential backoff
 * - Multi-protocol support (AS2, SFTP)
 */
@Injectable()
export class OutboundDeliveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboundDeliveryService.name);
  private readonly deliveryQueue = new Map<string, DeliveryJob>();
  private readonly processingInterval: number;
  private processingTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isShuttingDown = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly as2Client: As2ClientService,
    private readonly sftpClient: SftpClientService,
    private readonly transportLog: TransportLogService,
  ) {
    this.processingInterval = configService.get<number>('DELIVERY_PROCESSING_INTERVAL_MS', 5000);
  }

  async onModuleInit(): Promise<void> {
    // Start the delivery processing loop
    this.processingTimer = setInterval(() => this.processQueue(), this.processingInterval);
    this.logger.log('Outbound Delivery Service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;

    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    // Wait for current processing to complete
    while (this.isProcessing) {
      await this.sleep(100);
    }

    this.logger.log('Outbound Delivery Service stopped');
  }

  /**
   * Queue a delivery job
   */
  async queueDelivery(options: QueueDeliveryOptions): Promise<DeliveryJob> {
    const id = randomUUID();
    const now = new Date();

    const job: DeliveryJob = {
      id,
      tenantId: options.tenantId,
      partnerId: options.partnerId,
      protocol: options.protocol,
      messageId: options.messageId || id,
      correlationId: options.correlationId,
      content: options.content,
      contentType: options.contentType,
      filename: options.filename,
      priority: options.priority || 0,
      status: TransportStatus.PENDING,
      retryCount: 0,
      maxRetries: options.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries,
      scheduledAt: options.scheduledAt || now,
      metadata: options.metadata,
    };

    this.deliveryQueue.set(id, job);

    this.logger.log(
      `Queued delivery job: ${id} for partner ${options.partnerId} via ${options.protocol}`,
    );
    return job;
  }

  /**
   * Get delivery job by ID
   */
  getDeliveryJob(id: string): DeliveryJob | undefined {
    return this.deliveryQueue.get(id);
  }

  /**
   * List delivery jobs for a tenant
   */
  listDeliveryJobs(
    tenantId: string,
    options?: {
      partnerId?: string;
      status?: TransportStatus;
      protocol?: TransportProtocol;
      page?: number;
      limit?: number;
    },
  ): { jobs: DeliveryJob[]; total: number } {
    let jobs = Array.from(this.deliveryQueue.values()).filter((j) => j.tenantId === tenantId);

    // Apply filters
    if (options?.partnerId) {
      jobs = jobs.filter((j) => j.partnerId === options.partnerId);
    }
    if (options?.status) {
      jobs = jobs.filter((j) => j.status === options.status);
    }
    if (options?.protocol) {
      jobs = jobs.filter((j) => j.protocol === options.protocol);
    }

    // Sort by priority (higher first) then scheduledAt
    jobs.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.scheduledAt.getTime() - b.scheduledAt.getTime();
    });

    const total = jobs.length;

    // Apply pagination
    if (options?.page !== undefined && options?.limit !== undefined) {
      const offset = (options.page - 1) * options.limit;
      jobs = jobs.slice(offset, offset + options.limit);
    }

    return { jobs, total };
  }

  /**
   * Cancel a delivery job
   */
  async cancelDeliveryJob(id: string): Promise<boolean> {
    const job = this.deliveryQueue.get(id);
    if (!job) {
      return false;
    }

    if (job.status === TransportStatus.IN_PROGRESS) {
      return false; // Cannot cancel in-progress jobs
    }

    this.deliveryQueue.delete(id);
    this.logger.log(`Cancelled delivery job: ${id}`);
    return true;
  }

  /**
   * Retry a failed delivery job
   */
  async retryDeliveryJob(id: string): Promise<DeliveryJob | undefined> {
    const job = this.deliveryQueue.get(id);
    if (!job) {
      return undefined;
    }

    if (job.status !== TransportStatus.FAILED) {
      return undefined; // Can only retry failed jobs
    }

    job.status = TransportStatus.PENDING;
    job.retryCount = 0;
    job.error = undefined;
    job.scheduledAt = new Date();

    this.logger.log(`Reset delivery job for retry: ${id}`);
    return job;
  }

  /**
   * Immediately process a specific job
   */
  async processNow(id: string): Promise<DeliveryResult> {
    const job = this.deliveryQueue.get(id);
    if (!job) {
      return {
        jobId: id,
        partnerId: '',
        protocol: TransportProtocol.AS2,
        success: false,
        error: 'Job not found',
        timestamp: new Date(),
        durationMs: 0,
      };
    }

    return this.executeDelivery(job);
  }

  /**
   * Process the delivery queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.isShuttingDown) {
      return;
    }

    this.isProcessing = true;

    try {
      const now = new Date();

      // Get jobs ready for processing
      const readyJobs = Array.from(this.deliveryQueue.values())
        .filter(
          (job) =>
            (job.status === TransportStatus.PENDING || job.status === TransportStatus.RETRYING) &&
            job.scheduledAt <= now,
        )
        .sort((a, b) => {
          // Higher priority first
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }
          // Earlier scheduled first
          return a.scheduledAt.getTime() - b.scheduledAt.getTime();
        });

      // Process jobs (with concurrency limit)
      const concurrencyLimit = this.configService.get<number>('DELIVERY_CONCURRENCY', 5);
      const batch = readyJobs.slice(0, concurrencyLimit);

      await Promise.all(batch.map((job) => this.executeDelivery(job)));
    } catch (error) {
      this.logger.error(
        `Queue processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute delivery for a job
   */
  private async executeDelivery(job: DeliveryJob): Promise<DeliveryResult> {
    const startTime = Date.now();

    // Mark as in progress
    job.status = TransportStatus.IN_PROGRESS;

    // Start transport log
    const logId = await this.transportLog.startLog({
      tenantId: job.tenantId,
      partnerId: job.partnerId,
      protocol: job.protocol,
      direction: TransportDirection.OUTBOUND,
      messageId: job.messageId,
      correlationId: job.correlationId,
      filename: job.filename,
      contentType: job.contentType,
      contentSize: job.content.length,
      maxRetries: job.maxRetries,
      metadata: job.metadata,
    });

    try {
      let result: DeliveryResult;

      switch (job.protocol) {
        case TransportProtocol.AS2:
          result = await this.deliverViaAs2(job);
          break;
        case TransportProtocol.SFTP:
          result = await this.deliverViaSftp(job);
          break;
        default:
          throw new Error(`Unsupported protocol: ${job.protocol}`);
      }

      const durationMs = Date.now() - startTime;
      result.durationMs = durationMs;

      if (result.success) {
        // Mark job as completed
        job.status = TransportStatus.COMPLETED;
        await this.transportLog.completeLog(logId, { messageId: result.messageId });

        // Remove from queue after successful delivery
        this.deliveryQueue.delete(job.id);

        this.logger.log(`Delivery completed: ${job.id} in ${durationMs}ms`);
      } else {
        // Handle failure
        await this.handleDeliveryFailure(job, result.error || 'Unknown error', logId);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const durationMs = Date.now() - startTime;

      await this.handleDeliveryFailure(job, errorMessage, logId);

      return {
        jobId: job.id,
        partnerId: job.partnerId,
        protocol: job.protocol,
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        durationMs,
      };
    }
  }

  /**
   * Deliver via AS2
   */
  private async deliverViaAs2(job: DeliveryJob): Promise<DeliveryResult> {
    const request: As2SendRequest = {
      partnerId: job.partnerId,
      content: job.content,
      contentType: job.contentType,
      filename: job.filename,
      subject: `Message ${job.messageId}`,
      requestMdn: true,
      sign: true,
      encrypt: true,
      correlationId: job.correlationId,
      metadata: job.metadata,
    };

    const result = await this.as2Client.send(request);

    return {
      jobId: job.id,
      partnerId: job.partnerId,
      protocol: TransportProtocol.AS2,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      mdn: result.mdn,
      timestamp: result.timestamp,
      durationMs: result.durationMs,
    };
  }

  /**
   * Deliver via SFTP
   */
  private async deliverViaSftp(job: DeliveryJob): Promise<DeliveryResult> {
    const filename = job.filename || this.generateFilename(job);

    const request: SftpUploadRequest = {
      partnerId: job.partnerId,
      content: job.content,
      filename,
      correlationId: job.correlationId,
      metadata: job.metadata,
    };

    const result = await this.sftpClient.upload(request);

    return {
      jobId: job.id,
      partnerId: job.partnerId,
      protocol: TransportProtocol.SFTP,
      success: result.success,
      filename: result.filename,
      error: result.error,
      timestamp: result.timestamp,
      durationMs: result.durationMs,
    };
  }

  /**
   * Handle delivery failure
   */
  private async handleDeliveryFailure(
    job: DeliveryJob,
    error: string,
    logId: string,
  ): Promise<void> {
    job.error = error;
    job.retryCount++;

    if (job.retryCount <= job.maxRetries) {
      // Schedule retry with exponential backoff
      const delay = this.calculateRetryDelay(job.retryCount);
      job.scheduledAt = new Date(Date.now() + delay);
      job.status = TransportStatus.RETRYING;

      await this.transportLog.incrementRetry(logId);
      this.logger.warn(
        `Delivery failed, scheduling retry ${job.retryCount}/${job.maxRetries} in ${delay}ms: ${job.id}`,
      );
    } else {
      // Max retries exceeded
      job.status = TransportStatus.FAILED;
      await this.transportLog.failLog(logId, error);
      this.logger.error(`Delivery failed after ${job.maxRetries} retries: ${job.id} - ${error}`);
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const delay =
      DEFAULT_RETRY_CONFIG.baseDelayMs *
      Math.pow(DEFAULT_RETRY_CONFIG.backoffMultiplier, retryCount - 1);
    return Math.min(delay, DEFAULT_RETRY_CONFIG.maxDelayMs);
  }

  /**
   * Generate filename for delivery
   */
  private generateFilename(job: DeliveryJob): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = this.getExtensionForContentType(job.contentType);
    return `${job.messageId}_${timestamp}${extension}`;
  }

  /**
   * Get file extension for content type
   */
  private getExtensionForContentType(contentType: string): string {
    const extensions: Record<string, string> = {
      'application/xml': '.xml',
      'text/xml': '.xml',
      'application/json': '.json',
      'text/plain': '.txt',
      'application/x-edi': '.edi',
      'application/edifact': '.edi',
    };

    const baseType = contentType.split(';')[0].trim().toLowerCase();
    return extensions[baseType] || '.dat';
  }

  /**
   * Get delivery statistics
   */
  getStatistics(tenantId?: string): {
    totalJobs: number;
    pendingJobs: number;
    inProgressJobs: number;
    failedJobs: number;
    completedJobs: number;
    retryingJobs: number;
  } {
    let jobs = Array.from(this.deliveryQueue.values());

    if (tenantId) {
      jobs = jobs.filter((j) => j.tenantId === tenantId);
    }

    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter((j) => j.status === TransportStatus.PENDING).length,
      inProgressJobs: jobs.filter((j) => j.status === TransportStatus.IN_PROGRESS).length,
      failedJobs: jobs.filter((j) => j.status === TransportStatus.FAILED).length,
      completedJobs: jobs.filter((j) => j.status === TransportStatus.COMPLETED).length,
      retryingJobs: jobs.filter((j) => j.status === TransportStatus.RETRYING).length,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
