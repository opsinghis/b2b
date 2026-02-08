import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import {
  PollJob,
  PollResult,
  PollResultFile,
  SftpInboundConfig,
  TransportProtocol,
  TransportDirection,
  TransportStatus,
} from '../interfaces';
import { SftpClientService } from './sftp-client.service';
import { TransportLogService } from './transport-log.service';
import { TradingPartnerService } from './trading-partner.service';

/**
 * File handler interface
 */
export interface FileHandler {
  onFileReceived(
    partnerId: string,
    filename: string,
    content: Buffer,
    metadata: Record<string, unknown>,
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

/**
 * Poll job internal state
 */
interface PollJobState {
  job: PollJob;
  timer: NodeJS.Timeout | null;
  isRunning: boolean;
}

/**
 * File Polling Service
 *
 * Handles automatic file polling from trading partner SFTP servers:
 * - Scheduled polling at configurable intervals
 * - File pattern matching
 * - Post-processing (move/delete)
 * - Error handling and retry
 */
@Injectable()
export class FilePollingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FilePollingService.name);
  private readonly pollJobs = new Map<string, PollJobState>();
  private readonly fileHandlers: FileHandler[] = [];
  private isShuttingDown = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly sftpClient: SftpClientService,
    private readonly transportLog: TransportLogService,
    private readonly tradingPartner: TradingPartnerService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('File Polling Service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;

    // Stop all poll jobs
    for (const [jobId] of this.pollJobs) {
      await this.stopPollJob(jobId);
    }

    this.logger.log('File Polling Service stopped');
  }

  /**
   * Register a file handler
   */
  registerFileHandler(handler: FileHandler): void {
    this.fileHandlers.push(handler);
    this.logger.log('Registered file handler');
  }

  /**
   * Create a new poll job
   */
  async createPollJob(
    tenantId: string,
    partnerId: string,
    config: SftpInboundConfig,
  ): Promise<PollJob> {
    const id = randomUUID();
    const now = new Date();
    const intervalMs = config.pollIntervalMs || 60000;

    const job: PollJob = {
      id,
      tenantId,
      partnerId,
      protocol: TransportProtocol.SFTP,
      config,
      lastPollAt: undefined,
      nextPollAt: new Date(now.getTime() + intervalMs),
      isActive: true,
      failureCount: 0,
    };

    // Create job state
    const state: PollJobState = {
      job,
      timer: null,
      isRunning: false,
    };

    this.pollJobs.set(id, state);

    // Start the poll timer
    this.schedulePoll(state);

    this.logger.log(`Created poll job: ${id} for partner ${partnerId}`);
    return job;
  }

  /**
   * Get poll job by ID
   */
  getPollJob(id: string): PollJob | undefined {
    return this.pollJobs.get(id)?.job;
  }

  /**
   * List poll jobs for a tenant
   */
  listPollJobs(tenantId: string): PollJob[] {
    const jobs: PollJob[] = [];
    for (const state of this.pollJobs.values()) {
      if (state.job.tenantId === tenantId) {
        jobs.push(state.job);
      }
    }
    return jobs;
  }

  /**
   * Update poll job configuration
   */
  async updatePollJob(
    id: string,
    updates: Partial<{
      config: Partial<SftpInboundConfig>;
      isActive: boolean;
    }>,
  ): Promise<PollJob | undefined> {
    const state = this.pollJobs.get(id);
    if (!state) {
      return undefined;
    }

    // Update config
    if (updates.config) {
      Object.assign(state.job.config, updates.config);
    }

    // Update active status
    if (updates.isActive !== undefined) {
      state.job.isActive = updates.isActive;

      if (state.job.isActive && !state.timer) {
        this.schedulePoll(state);
      } else if (!state.job.isActive && state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
      }
    }

    this.logger.log(`Updated poll job: ${id}`);
    return state.job;
  }

  /**
   * Stop and remove a poll job
   */
  async stopPollJob(id: string): Promise<boolean> {
    const state = this.pollJobs.get(id);
    if (!state) {
      return false;
    }

    state.job.isActive = false;

    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }

    // Wait for running poll to complete
    while (state.isRunning) {
      await this.sleep(100);
    }

    this.pollJobs.delete(id);
    this.logger.log(`Stopped poll job: ${id}`);
    return true;
  }

  /**
   * Manually trigger a poll
   */
  async triggerPoll(id: string): Promise<PollResult> {
    const state = this.pollJobs.get(id);
    if (!state) {
      return {
        jobId: id,
        partnerId: '',
        filesFound: 0,
        filesProcessed: 0,
        filesFailed: 0,
        files: [],
        error: 'Poll job not found',
        timestamp: new Date(),
        durationMs: 0,
      };
    }

    return this.executePoll(state);
  }

  /**
   * Schedule the next poll
   */
  private schedulePoll(state: PollJobState): void {
    if (!state.job.isActive || this.isShuttingDown) {
      return;
    }

    const intervalMs = state.job.config.pollIntervalMs || 60000;

    state.timer = setTimeout(async () => {
      state.timer = null;

      if (!state.job.isActive || this.isShuttingDown) {
        return;
      }

      await this.executePoll(state);

      // Schedule next poll
      if (state.job.isActive && !this.isShuttingDown) {
        this.schedulePoll(state);
      }
    }, intervalMs);
  }

  /**
   * Execute a poll operation
   */
  private async executePoll(state: PollJobState): Promise<PollResult> {
    const startTime = Date.now();
    const { job } = state;

    if (state.isRunning) {
      return {
        jobId: job.id,
        partnerId: job.partnerId,
        filesFound: 0,
        filesProcessed: 0,
        filesFailed: 0,
        files: [],
        error: 'Poll already in progress',
        timestamp: new Date(),
        durationMs: 0,
      };
    }

    state.isRunning = true;
    const resultFiles: PollResultFile[] = [];

    try {
      this.logger.debug(`Starting poll for job ${job.id}`);

      // List files from partner
      const listResult = await this.sftpClient.list({
        partnerId: job.partnerId,
        directory: job.config.directory,
        pattern: job.config.filenamePattern,
      });

      if (!listResult.success) {
        throw new Error(listResult.error || 'Failed to list files');
      }

      // Filter to only files (not directories)
      const files = listResult.files.filter((f) => !f.isDirectory);

      // Limit files per poll
      const maxFiles = job.config.maxFilesPerPoll || 100;
      const filesToProcess = files.slice(0, maxFiles);

      this.logger.debug(`Found ${files.length} files, processing ${filesToProcess.length}`);

      // Process each file
      for (const file of filesToProcess) {
        const fileResult = await this.processFile(job, file.filename, file.path);
        resultFiles.push(fileResult);
      }

      // Update job status
      job.lastPollAt = new Date();
      job.nextPollAt = new Date(Date.now() + (job.config.pollIntervalMs || 60000));
      job.failureCount = 0;
      job.lastError = undefined;

      const durationMs = Date.now() - startTime;
      const filesProcessed = resultFiles.filter((f) => f.status === 'processed').length;
      const filesFailed = resultFiles.filter((f) => f.status === 'failed').length;

      this.logger.log(
        `Poll completed for job ${job.id}: ${filesProcessed} processed, ${filesFailed} failed in ${durationMs}ms`,
      );

      return {
        jobId: job.id,
        partnerId: job.partnerId,
        filesFound: files.length,
        filesProcessed,
        filesFailed,
        files: resultFiles,
        timestamp: new Date(),
        durationMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const durationMs = Date.now() - startTime;

      job.failureCount++;
      job.lastError = errorMessage;

      this.logger.error(`Poll failed for job ${job.id}: ${errorMessage}`);

      return {
        jobId: job.id,
        partnerId: job.partnerId,
        filesFound: 0,
        filesProcessed: 0,
        filesFailed: 0,
        files: resultFiles,
        error: errorMessage,
        timestamp: new Date(),
        durationMs,
      };
    } finally {
      state.isRunning = false;
    }
  }

  /**
   * Process a single file
   */
  private async processFile(
    job: PollJob,
    filename: string,
    remotePath: string,
  ): Promise<PollResultFile> {
    const logId = await this.transportLog.startLog({
      tenantId: job.tenantId,
      partnerId: job.partnerId,
      protocol: TransportProtocol.SFTP,
      direction: TransportDirection.INBOUND,
      filename,
      correlationId: randomUUID(),
    });

    try {
      // Download file
      const downloadResult = await this.sftpClient.download({
        partnerId: job.partnerId,
        remotePath,
      });

      if (!downloadResult.success) {
        throw new Error(downloadResult.error || 'Failed to download file');
      }

      await this.transportLog.updateLog(logId, {
        contentSize: downloadResult.size,
      });

      // Pass to handlers
      let messageId: string | undefined;
      let handlerError: string | undefined;

      for (const handler of this.fileHandlers) {
        try {
          const result = await handler.onFileReceived(
            job.partnerId,
            filename,
            downloadResult.content,
            { remotePath, job: job.id },
          );

          if (result.success) {
            messageId = result.messageId;
          } else {
            handlerError = result.error;
          }
        } catch (error) {
          handlerError = error instanceof Error ? error.message : 'Handler error';
        }
      }

      if (handlerError) {
        throw new Error(handlerError);
      }

      // Post-processing: move or delete
      if (job.config.deleteAfterProcessing) {
        await this.sftpClient.delete({
          partnerId: job.partnerId,
          remotePath,
        });
      } else if (job.config.moveAfterProcessing && job.config.processedDirectory) {
        const destPath = `${job.config.processedDirectory}/${filename}`;
        await this.sftpClient.move({
          partnerId: job.partnerId,
          sourcePath: remotePath,
          destinationPath: destPath,
          overwrite: true,
        });
      }

      await this.transportLog.completeLog(logId, { messageId });

      return {
        filename,
        remotePath,
        size: downloadResult.size,
        status: 'processed',
        messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.transportLog.failLog(logId, errorMessage);

      // Move to error directory if configured
      if (job.config.errorDirectory) {
        try {
          const destPath = `${job.config.errorDirectory}/${filename}`;
          await this.sftpClient.move({
            partnerId: job.partnerId,
            sourcePath: remotePath,
            destinationPath: destPath,
            overwrite: true,
          });
        } catch {
          // Ignore move errors
        }
      }

      return {
        filename,
        remotePath,
        size: 0,
        status: 'failed',
        error: errorMessage,
      };
    }
  }

  /**
   * Cron job to check for inactive jobs
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkInactiveJobs(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    const now = Date.now();

    for (const [jobId, state] of this.pollJobs) {
      const { job } = state;

      if (!job.isActive || state.isRunning || state.timer) {
        continue;
      }

      // Check if poll is overdue
      if (job.nextPollAt && job.nextPollAt.getTime() < now) {
        this.logger.warn(`Poll job ${jobId} is overdue, restarting timer`);
        this.schedulePoll(state);
      }
    }
  }

  /**
   * Get poll statistics
   */
  getStatistics(tenantId?: string): {
    totalJobs: number;
    activeJobs: number;
    runningJobs: number;
    failedJobs: number;
  } {
    let jobs = Array.from(this.pollJobs.values());

    if (tenantId) {
      jobs = jobs.filter((s) => s.job.tenantId === tenantId);
    }

    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((s) => s.job.isActive).length,
      runningJobs: jobs.filter((s) => s.isRunning).length,
      failedJobs: jobs.filter((s) => s.job.failureCount > 0).length,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
