import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventJobData, EventStatus, QUEUE_NAMES } from '../interfaces';
import { EventSubscriberService } from '../services/event-subscriber.service';
import { EventLogService } from '../services/event-log.service';

/**
 * Event Processor
 * Processes events from the BullMQ queue
 */
@Processor(QUEUE_NAMES.EVENTS)
export class EventProcessor extends WorkerHost {
  private readonly logger = new Logger(EventProcessor.name);

  constructor(
    private readonly eventSubscriber: EventSubscriberService,
    private readonly eventLog: EventLogService,
  ) {
    super();
  }

  /**
   * Process event job
   */
  async process(job: Job<EventJobData>): Promise<{ success: boolean; dispatched: number; failed: number }> {
    const { event } = job.data;

    this.logger.debug(`Processing event ${event.id} of type ${event.type}`);

    // Log event
    const logEntry = this.eventLog.logEvent(event);
    this.eventLog.updateStatus(logEntry.id, EventStatus.PROCESSING);

    try {
      // Dispatch to subscribers
      const result = await this.eventSubscriber.dispatch(event);

      // Update log status
      if (result.failureCount === 0) {
        this.eventLog.updateStatus(logEntry.id, EventStatus.DELIVERED);
      } else if (result.successCount === 0) {
        this.eventLog.updateStatus(logEntry.id, EventStatus.FAILED);
      } else {
        // Partial success - mark as delivered but log the failures
        this.eventLog.updateStatus(logEntry.id, EventStatus.DELIVERED);
        this.logger.warn(
          `Event ${event.id} partially delivered: ${result.successCount} success, ${result.failureCount} failed`,
        );
      }

      return {
        success: result.failureCount === 0,
        dispatched: result.successCount,
        failed: result.failureCount,
      };
    } catch (error) {
      this.eventLog.updateStatus(logEntry.id, EventStatus.FAILED);
      this.logger.error(`Failed to process event ${event.id}:`, error);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<EventJobData>) {
    this.logger.debug(`Event job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EventJobData>, error: Error) {
    this.logger.error(`Event job ${job.id} failed: ${error.message}`);

    // Update log entry if max retries reached
    if (job.attemptsMade >= (job.opts.attempts || 1)) {
      const logEntry = this.eventLog.getEntryByEventId(job.data.event.id);
      if (logEntry) {
        this.eventLog.updateStatus(logEntry.id, EventStatus.DEAD_LETTER);
      }
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job<EventJobData>) {
    this.logger.debug(`Event job ${job.id} is active (attempt ${job.attemptsMade + 1})`);
  }
}
