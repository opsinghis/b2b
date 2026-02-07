import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import {
  BaseEvent,
  EventType,
  EventStatus,
  EventLogEntry,
  EventStats,
} from '../interfaces';

/**
 * Event log query options
 */
export interface EventLogQuery {
  tenantId?: string;
  types?: EventType[];
  status?: EventStatus;
  source?: string;
  startTime?: Date;
  endTime?: Date;
  correlationId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  defaultDays: number;
  byType?: Partial<Record<EventType, number>>;
  byStatus?: Partial<Record<EventStatus, number>>;
}

/**
 * Event Log Service
 * Handles event persistence with retention policies
 */
@Injectable()
export class EventLogService {
  private readonly logger = new Logger(EventLogService.name);
  private readonly eventLog = new Map<string, EventLogEntry>();
  private readonly tenantIndex = new Map<string, Set<string>>();
  private readonly typeIndex = new Map<EventType, Set<string>>();
  private readonly correlationIndex = new Map<string, Set<string>>();

  private retentionPolicy: RetentionPolicy = {
    defaultDays: 30,
    byType: {},
    byStatus: {
      [EventStatus.DEAD_LETTER]: 90,
      [EventStatus.FAILED]: 60,
    },
  };

  /**
   * Log an event
   */
  logEvent(event: BaseEvent): EventLogEntry {
    const entry: EventLogEntry = {
      id: uuidv4(),
      eventId: event.id,
      type: event.type,
      tenantId: event.tenantId,
      payload: event.payload,
      metadata: event.metadata,
      source: event.source,
      correlationId: event.correlationId,
      causationId: event.causationId,
      status: EventStatus.PENDING,
      createdAt: new Date(),
      expiresAt: this.calculateExpiration(event.type, EventStatus.PENDING),
    };

    // Store entry
    this.eventLog.set(entry.id, entry);

    // Index by tenant
    if (!this.tenantIndex.has(event.tenantId)) {
      this.tenantIndex.set(event.tenantId, new Set());
    }
    this.tenantIndex.get(event.tenantId)!.add(entry.id);

    // Index by type
    if (!this.typeIndex.has(event.type)) {
      this.typeIndex.set(event.type, new Set());
    }
    this.typeIndex.get(event.type)!.add(entry.id);

    // Index by correlation ID
    if (event.correlationId) {
      if (!this.correlationIndex.has(event.correlationId)) {
        this.correlationIndex.set(event.correlationId, new Set());
      }
      this.correlationIndex.get(event.correlationId)!.add(entry.id);
    }

    this.logger.debug(`Logged event ${event.id} as entry ${entry.id}`);

    return entry;
  }

  /**
   * Update event status
   */
  updateStatus(entryId: string, status: EventStatus): boolean {
    const entry = this.eventLog.get(entryId);
    if (!entry) {
      return false;
    }

    entry.status = status;
    entry.expiresAt = this.calculateExpiration(entry.type, status);

    return true;
  }

  /**
   * Get event log entry by ID
   */
  getEntry(entryId: string): EventLogEntry | undefined {
    return this.eventLog.get(entryId);
  }

  /**
   * Get entry by event ID
   */
  getEntryByEventId(eventId: string): EventLogEntry | undefined {
    for (const entry of this.eventLog.values()) {
      if (entry.eventId === eventId) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * Query event log
   */
  query(options: EventLogQuery): { entries: EventLogEntry[]; total: number } {
    let entries = Array.from(this.eventLog.values());

    // Filter by tenant
    if (options.tenantId) {
      const tenantEntryIds = this.tenantIndex.get(options.tenantId);
      if (tenantEntryIds) {
        entries = entries.filter((e) => tenantEntryIds.has(e.id));
      } else {
        entries = [];
      }
    }

    // Filter by types
    if (options.types && options.types.length > 0) {
      entries = entries.filter((e) => options.types!.includes(e.type));
    }

    // Filter by status
    if (options.status) {
      entries = entries.filter((e) => e.status === options.status);
    }

    // Filter by source
    if (options.source) {
      entries = entries.filter((e) => e.source === options.source);
    }

    // Filter by time range
    if (options.startTime) {
      const startTime = options.startTime;
      entries = entries.filter((e) => e.createdAt >= startTime);
    }

    if (options.endTime) {
      const endTime = options.endTime;
      entries = entries.filter((e) => e.createdAt <= endTime);
    }

    // Filter by correlation ID
    if (options.correlationId) {
      const correlatedIds = this.correlationIndex.get(options.correlationId);
      if (correlatedIds) {
        entries = entries.filter((e) => correlatedIds.has(e.id));
      } else {
        entries = [];
      }
    }

    // Sort by created date descending
    entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = entries.length;

    // Apply pagination
    if (options.offset) {
      entries = entries.slice(options.offset);
    }

    if (options.limit) {
      entries = entries.slice(0, options.limit);
    }

    return { entries, total };
  }

  /**
   * Get events for replay
   */
  getEventsForReplay(
    tenantId: string,
    startTime: Date,
    endTime: Date,
    types?: EventType[],
  ): EventLogEntry[] {
    const { entries } = this.query({
      tenantId,
      types,
      startTime,
      endTime,
      status: EventStatus.DELIVERED,
    });

    return entries;
  }

  /**
   * Get event statistics
   */
  getStats(tenantId: string, period: 'hour' | 'day' | 'week' | 'month'): EventStats {
    const now = new Date();
    let startTime: Date;

    switch (period) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const { entries } = this.query({
      tenantId,
      startTime,
      endTime: now,
    });

    const eventCounts: Record<string, number> = {};
    let successfulDeliveries = 0;
    let failedDeliveries = 0;
    let retryCount = 0;

    for (const entry of entries) {
      eventCounts[entry.type] = (eventCounts[entry.type] || 0) + 1;

      if (entry.status === EventStatus.DELIVERED) {
        successfulDeliveries++;
      } else if (entry.status === EventStatus.FAILED || entry.status === EventStatus.DEAD_LETTER) {
        failedDeliveries++;
      } else if (entry.status === EventStatus.RETRYING) {
        retryCount++;
      }
    }

    return {
      tenantId,
      period,
      eventCounts: eventCounts as Record<EventType, number>,
      totalEvents: entries.length,
      successfulDeliveries,
      failedDeliveries,
      avgDeliveryTime: 0, // Would need timing data
      retryCount,
    };
  }

  /**
   * Set retention policy
   */
  setRetentionPolicy(policy: Partial<RetentionPolicy>): void {
    this.retentionPolicy = {
      ...this.retentionPolicy,
      ...policy,
    };
    this.logger.log(`Retention policy updated: ${JSON.stringify(this.retentionPolicy)}`);
  }

  /**
   * Get retention policy
   */
  getRetentionPolicy(): RetentionPolicy {
    return { ...this.retentionPolicy };
  }

  /**
   * Calculate expiration date based on type and status
   */
  private calculateExpiration(type: EventType, status: EventStatus): Date {
    let days = this.retentionPolicy.defaultDays;

    // Check type-specific retention
    if (this.retentionPolicy.byType?.[type]) {
      days = this.retentionPolicy.byType[type]!;
    }

    // Check status-specific retention (overrides type)
    if (this.retentionPolicy.byStatus?.[status]) {
      days = this.retentionPolicy.byStatus[status]!;
    }

    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Clean up expired entries (runs daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredEntries(): Promise<number> {
    const now = new Date();
    let deletedCount = 0;

    for (const [id, entry] of this.eventLog.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.deleteEntry(id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} expired event log entries`);
    }

    return deletedCount;
  }

  /**
   * Delete entry and remove from indexes
   */
  private deleteEntry(entryId: string): void {
    const entry = this.eventLog.get(entryId);
    if (!entry) {
      return;
    }

    // Remove from tenant index
    const tenantEntries = this.tenantIndex.get(entry.tenantId);
    if (tenantEntries) {
      tenantEntries.delete(entryId);
      if (tenantEntries.size === 0) {
        this.tenantIndex.delete(entry.tenantId);
      }
    }

    // Remove from type index
    const typeEntries = this.typeIndex.get(entry.type);
    if (typeEntries) {
      typeEntries.delete(entryId);
      if (typeEntries.size === 0) {
        this.typeIndex.delete(entry.type);
      }
    }

    // Remove from correlation index
    if (entry.correlationId) {
      const correlationEntries = this.correlationIndex.get(entry.correlationId);
      if (correlationEntries) {
        correlationEntries.delete(entryId);
        if (correlationEntries.size === 0) {
          this.correlationIndex.delete(entry.correlationId);
        }
      }
    }

    // Remove entry
    this.eventLog.delete(entryId);
  }

  /**
   * Get total entry count
   */
  getEntryCount(): number {
    return this.eventLog.size;
  }

  /**
   * Clear all entries for a tenant
   */
  clearTenantEntries(tenantId: string): number {
    const tenantEntries = this.tenantIndex.get(tenantId);
    if (!tenantEntries) {
      return 0;
    }

    let count = 0;
    for (const id of Array.from(tenantEntries)) {
      this.deleteEntry(id);
      count++;
    }

    return count;
  }

  /**
   * Clear all entries
   */
  clearAll(): void {
    this.eventLog.clear();
    this.tenantIndex.clear();
    this.typeIndex.clear();
    this.correlationIndex.clear();
  }
}
