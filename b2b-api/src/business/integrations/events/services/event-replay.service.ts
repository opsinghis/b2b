import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  EventType,
  EventReplayRequest,
  EventReplayResult,
  EventLogEntry,
} from '../interfaces';
import { EventPublisherService } from './event-publisher.service';
import { EventLogService } from './event-log.service';

/**
 * Event Replay Service
 * Handles replaying historical events
 */
@Injectable()
export class EventReplayService {
  private readonly logger = new Logger(EventReplayService.name);
  private readonly activeReplays = new Map<string, EventReplayResult>();
  private readonly maxConcurrentReplays = 5;

  constructor(
    private readonly eventPublisher: EventPublisherService,
    private readonly eventLog: EventLogService,
  ) {}

  /**
   * Start an event replay
   */
  async startReplay(request: EventReplayRequest): Promise<EventReplayResult> {
    // Check concurrent replay limit
    const activeCount = Array.from(this.activeReplays.values()).filter(
      (r) => r.status === 'in_progress',
    ).length;

    if (activeCount >= this.maxConcurrentReplays) {
      throw new Error(`Maximum concurrent replays (${this.maxConcurrentReplays}) reached`);
    }

    const requestId = uuidv4();

    // Get events to replay
    const entries = this.eventLog.getEventsForReplay(
      request.tenantId,
      request.startTime,
      request.endTime,
      request.eventTypes,
    );

    // Apply filter if provided
    let filteredEntries = entries;
    if (request.filter) {
      filteredEntries = this.applyFilter(entries, request.filter);
    }

    const result: EventReplayResult = {
      requestId,
      tenantId: request.tenantId,
      status: 'pending',
      totalEvents: filteredEntries.length,
      processedEvents: 0,
      failedEvents: 0,
      startedAt: new Date(),
    };

    this.activeReplays.set(requestId, result);

    // Start replay in background
    this.executeReplay(requestId, filteredEntries, request);

    return result;
  }

  /**
   * Execute replay in background
   */
  private async executeReplay(
    requestId: string,
    entries: EventLogEntry[],
    request: EventReplayRequest,
  ): Promise<void> {
    const result = this.activeReplays.get(requestId);
    if (!result) {
      return;
    }

    result.status = 'in_progress';
    const batchSize = request.batchSize || 100;
    const delayBetweenBatches = request.delayBetweenBatches || 1000;
    let wasCancelled = false;

    try {
      for (let i = 0; i < entries.length; i += batchSize) {
        // Check if replay was cancelled (status may have been changed externally)
        if (this.activeReplays.get(requestId)?.status === 'cancelled') {
          wasCancelled = true;
          this.logger.log(`Replay ${requestId} was cancelled`);
          break;
        }

        const batch = entries.slice(i, i + batchSize);

        for (const entry of batch) {
          try {
            await this.eventPublisher.publish(
              entry.tenantId,
              entry.type,
              entry.payload,
              {
                correlationId: `replay:${requestId}`,
                causationId: entry.eventId,
                metadata: {
                  ...entry.metadata,
                  replayedFrom: entry.eventId,
                  replayRequestId: requestId,
                },
              },
            );
            result.processedEvents++;
          } catch (error) {
            result.failedEvents++;
            this.logger.error(`Failed to replay event ${entry.eventId}:`, error);
          }
        }

        // Delay between batches
        if (i + batchSize < entries.length && delayBetweenBatches > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
        }
      }

      result.status = wasCancelled ? 'cancelled' : 'completed';
      result.completedAt = new Date();

      this.logger.log(
        `Replay ${requestId} ${result.status}: ${result.processedEvents} processed, ${result.failedEvents} failed`,
      );
    } catch (error) {
      result.status = 'failed';
      result.error = (error as Error).message;
      result.completedAt = new Date();
      this.logger.error(`Replay ${requestId} failed:`, error);
    }
  }

  /**
   * Apply filter to entries
   */
  private applyFilter(entries: EventLogEntry[], filter: EventReplayRequest['filter']): EventLogEntry[] {
    if (!filter) {
      return entries;
    }

    return entries.filter((entry) => {
      // Check sources
      if (filter.sources && filter.sources.length > 0) {
        if (!filter.sources.includes(entry.source)) {
          return false;
        }
      }

      // Check metadata
      if (filter.metadata) {
        for (const [key, value] of Object.entries(filter.metadata)) {
          if (entry.metadata?.[key] !== value) {
            return false;
          }
        }
      }

      // Check conditions would require evaluating against payload
      // This is simplified for now

      return true;
    });
  }

  /**
   * Get replay status
   */
  getReplayStatus(requestId: string): EventReplayResult | undefined {
    return this.activeReplays.get(requestId);
  }

  /**
   * Cancel a replay
   */
  cancelReplay(requestId: string): boolean {
    const result = this.activeReplays.get(requestId);
    if (!result || result.status !== 'in_progress') {
      return false;
    }

    result.status = 'cancelled';
    return true;
  }

  /**
   * Get all replays for a tenant
   */
  getTenantReplays(tenantId: string): EventReplayResult[] {
    return Array.from(this.activeReplays.values()).filter((r) => r.tenantId === tenantId);
  }

  /**
   * Get all active replays
   */
  getActiveReplays(): EventReplayResult[] {
    return Array.from(this.activeReplays.values()).filter((r) => r.status === 'in_progress');
  }

  /**
   * Clean up old replay records
   */
  cleanupOldReplays(maxAge: number = 86400000): number {
    const cutoff = Date.now() - maxAge;
    let count = 0;

    for (const [id, result] of this.activeReplays.entries()) {
      if (
        result.completedAt &&
        result.completedAt.getTime() < cutoff &&
        result.status !== 'in_progress'
      ) {
        this.activeReplays.delete(id);
        count++;
      }
    }

    return count;
  }
}
