import { Test, TestingModule } from '@nestjs/testing';
import { EventLogService } from './event-log.service';
import { BaseEvent, ORDER_EVENTS, EventStatus } from '../interfaces';

describe('EventLogService', () => {
  let service: EventLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventLogService],
    }).compile();

    service = module.get<EventLogService>(EventLogService);
  });

  afterEach(() => {
    service.clearAll();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logEvent', () => {
    it('should log an event', () => {
      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123' },
      };

      const entry = service.logEvent(event);

      expect(entry.id).toBeDefined();
      expect(entry.eventId).toBe(event.id);
      expect(entry.type).toBe(event.type);
      expect(entry.tenantId).toBe(event.tenantId);
      expect(entry.status).toBe(EventStatus.PENDING);
    });

    it('should set expiration date', () => {
      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123' },
      };

      const entry = service.logEvent(event);

      expect(entry.expiresAt).toBeDefined();
      expect(entry.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('updateStatus', () => {
    it('should update event status', () => {
      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123' },
      };

      const entry = service.logEvent(event);
      const result = service.updateStatus(entry.id, EventStatus.DELIVERED);

      expect(result).toBe(true);
      expect(service.getEntry(entry.id)?.status).toBe(EventStatus.DELIVERED);
    });

    it('should return false for unknown entry', () => {
      const result = service.updateStatus('unknown-id', EventStatus.DELIVERED);
      expect(result).toBe(false);
    });
  });

  describe('getEntry', () => {
    it('should return entry by ID', () => {
      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123' },
      };

      const logged = service.logEvent(event);
      const retrieved = service.getEntry(logged.id);

      expect(retrieved).toEqual(logged);
    });

    it('should return undefined for unknown ID', () => {
      const result = service.getEntry('unknown-id');
      expect(result).toBeUndefined();
    });
  });

  describe('getEntryByEventId', () => {
    it('should return entry by event ID', () => {
      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123' },
      };

      const logged = service.logEvent(event);
      const retrieved = service.getEntryByEventId('event-1');

      expect(retrieved).toEqual(logged);
    });

    it('should return undefined for unknown event ID', () => {
      const result = service.getEntryByEventId('unknown-event');
      expect(result).toBeUndefined();
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // Create test events with slight delays to ensure ordering
      const event1: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(Date.now() - 2000),
        version: '1.0',
        source: 'source-a',
        correlationId: 'corr-1',
        payload: { orderId: '1' },
      };
      service.logEvent(event1);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const event2: BaseEvent = {
        id: 'event-2',
        type: ORDER_EVENTS.ORDER_UPDATED,
        tenantId: 'tenant-1',
        timestamp: new Date(Date.now() - 1000),
        version: '1.0',
        source: 'source-b',
        correlationId: 'corr-1',
        payload: { orderId: '1' },
      };
      service.logEvent(event2);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const event3: BaseEvent = {
        id: 'event-3',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-2',
        timestamp: new Date(),
        version: '1.0',
        source: 'source-a',
        payload: { orderId: '2' },
      };
      service.logEvent(event3);
    });

    it('should query all entries', () => {
      const result = service.query({});
      expect(result.total).toBe(3);
    });

    it('should filter by tenant', () => {
      const result = service.query({ tenantId: 'tenant-1' });
      expect(result.total).toBe(2);
    });

    it('should filter by event types', () => {
      const result = service.query({ types: [ORDER_EVENTS.ORDER_CREATED] });
      expect(result.total).toBe(2);
    });

    it('should filter by source', () => {
      const result = service.query({ source: 'source-a' });
      expect(result.total).toBe(2);
    });

    it('should filter by correlation ID', () => {
      const result = service.query({ correlationId: 'corr-1' });
      expect(result.total).toBe(2);
    });

    it('should filter by time range', () => {
      // Query tests filter based on createdAt from the log entry, not from event
      // All 3 entries were created recently during test setup
      // This test verifies time filtering works - we check that filtering by future time returns 0
      const futureTime = new Date(Date.now() + 86400000);
      const result = service.query({
        startTime: futureTime,
      });
      expect(result.total).toBe(0);
    });

    it('should apply pagination', () => {
      const result = service.query({ limit: 2, offset: 1 });
      expect(result.entries).toHaveLength(2);
    });

    it('should sort by created date descending', () => {
      const result = service.query({ tenantId: 'tenant-1' });
      expect(result.entries[0].eventId).toBe('event-2');
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      const event1: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: {},
      };
      const event2: BaseEvent = {
        id: 'event-2',
        type: ORDER_EVENTS.ORDER_UPDATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: {},
      };

      const entry1 = service.logEvent(event1);
      const entry2 = service.logEvent(event2);

      service.updateStatus(entry1.id, EventStatus.DELIVERED);
      service.updateStatus(entry2.id, EventStatus.FAILED);
    });

    it('should return event statistics', () => {
      const stats = service.getStats('tenant-1', 'day');

      expect(stats.tenantId).toBe('tenant-1');
      expect(stats.period).toBe('day');
      expect(stats.totalEvents).toBe(2);
      expect(stats.successfulDeliveries).toBe(1);
      expect(stats.failedDeliveries).toBe(1);
    });

    it('should count events by type', () => {
      const stats = service.getStats('tenant-1', 'day');
      expect(stats.eventCounts[ORDER_EVENTS.ORDER_CREATED]).toBe(1);
      expect(stats.eventCounts[ORDER_EVENTS.ORDER_UPDATED]).toBe(1);
    });
  });

  describe('retention policy', () => {
    it('should set retention policy', () => {
      service.setRetentionPolicy({
        defaultDays: 60,
        byStatus: {
          [EventStatus.FAILED]: 90,
        },
      });

      const policy = service.getRetentionPolicy();
      expect(policy.defaultDays).toBe(60);
      expect(policy.byStatus?.[EventStatus.FAILED]).toBe(90);
    });

    it('should apply status-specific retention', () => {
      service.setRetentionPolicy({
        defaultDays: 30,
        byStatus: {
          [EventStatus.FAILED]: 60,
        },
      });

      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: {},
      };

      const entry = service.logEvent(event);
      service.updateStatus(entry.id, EventStatus.FAILED);

      const updated = service.getEntry(entry.id);
      // Failed events should have longer retention
      const expectedMinExpiry = Date.now() + 59 * 24 * 60 * 60 * 1000;
      expect(updated?.expiresAt?.getTime()).toBeGreaterThan(expectedMinExpiry);
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('should remove expired entries', async () => {
      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: {},
      };

      const entry = service.logEvent(event);

      // Manually set expiration to past
      const storedEntry = service.getEntry(entry.id);
      if (storedEntry) {
        storedEntry.expiresAt = new Date(Date.now() - 1000);
      }

      const count = await service.cleanupExpiredEntries();
      expect(count).toBe(1);
      expect(service.getEntry(entry.id)).toBeUndefined();
    });
  });

  describe('getEntryCount', () => {
    it('should return total entry count', () => {
      const events: BaseEvent[] = [
        {
          id: 'event-1',
          type: ORDER_EVENTS.ORDER_CREATED,
          tenantId: 'tenant-1',
          timestamp: new Date(),
          version: '1.0',
          source: 'test',
          payload: {},
        },
        {
          id: 'event-2',
          type: ORDER_EVENTS.ORDER_CREATED,
          tenantId: 'tenant-1',
          timestamp: new Date(),
          version: '1.0',
          source: 'test',
          payload: {},
        },
      ];

      events.forEach((e) => service.logEvent(e));

      expect(service.getEntryCount()).toBe(2);
    });
  });

  describe('clearTenantEntries', () => {
    it('should clear entries for a specific tenant', () => {
      const event1: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: {},
      };
      const event2: BaseEvent = {
        id: 'event-2',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-2',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: {},
      };

      service.logEvent(event1);
      service.logEvent(event2);

      const count = service.clearTenantEntries('tenant-1');

      expect(count).toBe(1);
      expect(service.getEntryCount()).toBe(1);
    });
  });

  describe('clearAll', () => {
    it('should clear all entries', () => {
      const events: BaseEvent[] = [
        {
          id: 'event-1',
          type: ORDER_EVENTS.ORDER_CREATED,
          tenantId: 'tenant-1',
          timestamp: new Date(),
          version: '1.0',
          source: 'test',
          payload: {},
        },
        {
          id: 'event-2',
          type: ORDER_EVENTS.ORDER_CREATED,
          tenantId: 'tenant-2',
          timestamp: new Date(),
          version: '1.0',
          source: 'test',
          payload: {},
        },
      ];

      events.forEach((e) => service.logEvent(e));
      service.clearAll();

      expect(service.getEntryCount()).toBe(0);
    });
  });
});
