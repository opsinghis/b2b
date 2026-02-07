import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import {
  BaseEvent,
  EventType,
  EventPriority,
  EventMetadata,
  PublishedEvent,
  EventStatus,
  EventJobData,
  QUEUE_NAMES,
} from '../interfaces';

/**
 * Options for publishing events
 */
export interface PublishOptions {
  priority?: EventPriority;
  delay?: number;
  correlationId?: string;
  causationId?: string;
  metadata?: EventMetadata;
  deduplicationId?: string;
}

/**
 * Event Publisher Service
 * Handles publishing events to the message queue
 */
@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);
  private readonly publishedEvents = new Map<string, PublishedEvent>();
  private readonly maxEventBuffer = 10000;

  constructor(
    @InjectQueue(QUEUE_NAMES.EVENTS)
    private readonly eventsQueue: Queue<EventJobData>,
  ) {}

  /**
   * Publish a single event
   */
  async publish<T>(
    tenantId: string,
    type: EventType,
    payload: T,
    options: PublishOptions = {},
  ): Promise<PublishedEvent<T>> {
    const eventId = uuidv4();
    const timestamp = new Date();

    const event: BaseEvent<T> = {
      id: eventId,
      type,
      tenantId,
      timestamp,
      version: '1.0',
      source: 'b2b-api',
      correlationId: options.correlationId,
      causationId: options.causationId,
      metadata: options.metadata,
      payload,
    };

    const publishedEvent: PublishedEvent<T> = {
      ...event,
      status: EventStatus.PENDING,
      publishedAt: timestamp,
      attempts: 0,
      maxAttempts: 5,
    };

    // Store in buffer for replay/debugging
    this.storeEvent(publishedEvent);

    // Add to queue
    const jobData: EventJobData = {
      event,
    };

    const jobOptions = {
      jobId: options.deduplicationId || eventId,
      priority: options.priority || EventPriority.NORMAL,
      delay: options.delay,
      attempts: 5,
      backoff: {
        type: 'exponential' as const,
        delay: 1000,
      },
      removeOnComplete: {
        age: 86400, // 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 604800, // 7 days
      },
    };

    try {
      await this.eventsQueue.add(type, jobData, jobOptions);
      publishedEvent.status = EventStatus.PROCESSING;
      this.logger.debug(`Published event ${eventId} of type ${type} for tenant ${tenantId}`);
    } catch (error) {
      publishedEvent.status = EventStatus.FAILED;
      publishedEvent.lastError = (error as Error).message;
      this.logger.error(`Failed to publish event ${eventId}:`, error);
      throw error;
    }

    return publishedEvent;
  }

  /**
   * Publish multiple events in a batch
   */
  async publishBatch<T>(
    tenantId: string,
    events: Array<{ type: EventType; payload: T; options?: PublishOptions }>,
  ): Promise<PublishedEvent<T>[]> {
    const results: PublishedEvent<T>[] = [];
    const batchId = uuidv4();

    for (const { type, payload, options = {} } of events) {
      // Link events in batch via correlationId if not provided
      const eventOptions = {
        ...options,
        correlationId: options.correlationId || batchId,
      };

      const result = await this.publish(tenantId, type, payload, eventOptions);
      results.push(result);
    }

    return results;
  }

  /**
   * Publish an event chain (sequential processing)
   */
  async publishChain<T>(
    tenantId: string,
    events: Array<{ type: EventType; payload: T; options?: PublishOptions }>,
  ): Promise<PublishedEvent<T>[]> {
    const results: PublishedEvent<T>[] = [];
    const chainId = uuidv4();
    let previousEventId: string | undefined;

    for (const { type, payload, options = {} } of events) {
      const eventOptions = {
        ...options,
        correlationId: options.correlationId || chainId,
        causationId: previousEventId,
      };

      const result = await this.publish(tenantId, type, payload, eventOptions);
      results.push(result);
      previousEventId = result.id;
    }

    return results;
  }

  /**
   * Store event in buffer
   */
  private storeEvent(event: PublishedEvent): void {
    this.publishedEvents.set(event.id, event);

    // Trim buffer if needed
    if (this.publishedEvents.size > this.maxEventBuffer) {
      const oldestKey = this.publishedEvents.keys().next().value;
      if (oldestKey) {
        this.publishedEvents.delete(oldestKey);
      }
    }
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: string): PublishedEvent | undefined {
    return this.publishedEvents.get(eventId);
  }

  /**
   * Get events by tenant
   */
  getEventsByTenant(tenantId: string, options?: { limit?: number; type?: EventType }): PublishedEvent[] {
    let events = Array.from(this.publishedEvents.values()).filter((e) => e.tenantId === tenantId);

    if (options?.type) {
      events = events.filter((e) => e.type === options.type);
    }

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return options?.limit ? events.slice(0, options.limit) : events;
  }

  /**
   * Update event status
   */
  updateEventStatus(
    eventId: string,
    status: EventStatus,
    options?: { error?: string; deliveredAt?: Date },
  ): void {
    const event = this.publishedEvents.get(eventId);
    if (event) {
      event.status = status;
      if (options?.error) {
        event.lastError = options.error;
      }
      if (options?.deliveredAt) {
        event.deliveredAt = options.deliveredAt;
      }
      event.attempts++;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.eventsQueue.getWaitingCount(),
      this.eventsQueue.getActiveCount(),
      this.eventsQueue.getCompletedCount(),
      this.eventsQueue.getFailedCount(),
      this.eventsQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Pause event processing
   */
  async pause(): Promise<void> {
    await this.eventsQueue.pause();
    this.logger.warn('Event queue paused');
  }

  /**
   * Resume event processing
   */
  async resume(): Promise<void> {
    await this.eventsQueue.resume();
    this.logger.log('Event queue resumed');
  }

  /**
   * Drain queue (wait for all jobs to complete)
   */
  async drain(): Promise<void> {
    await this.eventsQueue.drain();
    this.logger.log('Event queue drained');
  }

  /**
   * Clear all events from buffer
   */
  clearBuffer(): void {
    this.publishedEvents.clear();
  }
}
