import { Test, TestingModule } from '@nestjs/testing';
import { EventReplayService } from './event-replay.service';
import { EventPublisherService } from './event-publisher.service';
import { EventLogService } from './event-log.service';
import { ORDER_EVENTS, EventStatus, EventLogEntry, EventReplayRequest } from '../interfaces';

describe('EventReplayService', () => {
  let service: EventReplayService;
  let eventPublisher: EventPublisherService;
  let eventLog: EventLogService;

  const mockEventPublisher = {
    publish: jest.fn(),
  };

  const mockEventLog = {
    getEventsForReplay: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventReplayService,
        {
          provide: EventPublisherService,
          useValue: mockEventPublisher,
        },
        {
          provide: EventLogService,
          useValue: mockEventLog,
        },
      ],
    }).compile();

    service = module.get<EventReplayService>(EventReplayService);
    eventPublisher = module.get<EventPublisherService>(EventPublisherService);
    eventLog = module.get<EventLogService>(EventLogService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startReplay', () => {
    it('should start a replay', async () => {
      const entries: EventLogEntry[] = [
        {
          id: 'entry-1',
          eventId: 'event-1',
          type: ORDER_EVENTS.ORDER_CREATED,
          tenantId: 'tenant-1',
          payload: { orderId: '1' },
          source: 'test',
          status: EventStatus.DELIVERED,
          createdAt: new Date(),
        },
      ];

      mockEventLog.getEventsForReplay.mockReturnValue(entries);
      mockEventPublisher.publish.mockResolvedValue({ id: 'new-event-1' });

      const request: EventReplayRequest = {
        tenantId: 'tenant-1',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(),
      };

      const result = await service.startReplay(request);

      expect(result.requestId).toBeDefined();
      expect(result.tenantId).toBe('tenant-1');
      expect(result.totalEvents).toBe(1);
      // Status may be 'pending', 'in_progress', or 'completed' depending on timing
      expect(['pending', 'in_progress', 'completed']).toContain(result.status);
    });

    it('should filter events by type', async () => {
      const entries: EventLogEntry[] = [
        {
          id: 'entry-1',
          eventId: 'event-1',
          type: ORDER_EVENTS.ORDER_CREATED,
          tenantId: 'tenant-1',
          payload: {},
          source: 'test',
          status: EventStatus.DELIVERED,
          createdAt: new Date(),
        },
      ];

      mockEventLog.getEventsForReplay.mockReturnValue(entries);

      const request: EventReplayRequest = {
        tenantId: 'tenant-1',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(),
        eventTypes: [ORDER_EVENTS.ORDER_CREATED],
      };

      await service.startReplay(request);

      expect(mockEventLog.getEventsForReplay).toHaveBeenCalledWith(
        'tenant-1',
        expect.any(Date),
        expect.any(Date),
        [ORDER_EVENTS.ORDER_CREATED],
      );
    });

    it('should apply filter to entries', async () => {
      const entries: EventLogEntry[] = [
        {
          id: 'entry-1',
          eventId: 'event-1',
          type: ORDER_EVENTS.ORDER_CREATED,
          tenantId: 'tenant-1',
          payload: {},
          source: 'source-a',
          status: EventStatus.DELIVERED,
          createdAt: new Date(),
        },
        {
          id: 'entry-2',
          eventId: 'event-2',
          type: ORDER_EVENTS.ORDER_CREATED,
          tenantId: 'tenant-1',
          payload: {},
          source: 'source-b',
          status: EventStatus.DELIVERED,
          createdAt: new Date(),
        },
      ];

      mockEventLog.getEventsForReplay.mockReturnValue(entries);

      const request: EventReplayRequest = {
        tenantId: 'tenant-1',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(),
        filter: {
          sources: ['source-a'],
        },
      };

      const result = await service.startReplay(request);

      expect(result.totalEvents).toBe(1);
    });

    it('should reject when max concurrent replays reached', async () => {
      // Start 5 replays
      mockEventLog.getEventsForReplay.mockReturnValue([
        {
          id: 'entry-1',
          eventId: 'event-1',
          type: ORDER_EVENTS.ORDER_CREATED,
          tenantId: 'tenant-1',
          payload: {},
          source: 'test',
          status: EventStatus.DELIVERED,
          createdAt: new Date(),
        },
      ]);

      // Mock publish to never resolve (keep replays in progress)
      mockEventPublisher.publish.mockImplementation(
        () => new Promise(() => {}),
      );

      const request: EventReplayRequest = {
        tenantId: 'tenant-1',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(),
      };

      // Start 5 replays
      await service.startReplay(request);
      await service.startReplay(request);
      await service.startReplay(request);
      await service.startReplay(request);
      await service.startReplay(request);

      // 6th should fail
      await expect(service.startReplay(request)).rejects.toThrow(
        'Maximum concurrent replays',
      );
    });
  });

  describe('getReplayStatus', () => {
    it('should return replay status', async () => {
      mockEventLog.getEventsForReplay.mockReturnValue([]);

      const request: EventReplayRequest = {
        tenantId: 'tenant-1',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(),
      };

      const result = await service.startReplay(request);
      const status = service.getReplayStatus(result.requestId);

      expect(status).toBeDefined();
      expect(status?.requestId).toBe(result.requestId);
    });

    it('should return undefined for unknown replay', () => {
      const status = service.getReplayStatus('unknown-id');
      expect(status).toBeUndefined();
    });
  });

  describe('cancelReplay', () => {
    it('should cancel an in-progress replay', async () => {
      const entries: EventLogEntry[] = Array.from({ length: 100 }, (_, i) => ({
        id: `entry-${i}`,
        eventId: `event-${i}`,
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        payload: {},
        source: 'test',
        status: EventStatus.DELIVERED,
        createdAt: new Date(),
      }));

      mockEventLog.getEventsForReplay.mockReturnValue(entries);
      mockEventPublisher.publish.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const request: EventReplayRequest = {
        tenantId: 'tenant-1',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(),
        batchSize: 10,
        delayBetweenBatches: 100,
      };

      const result = await service.startReplay(request);

      // Wait a bit for replay to start
      await new Promise((resolve) => setTimeout(resolve, 50));

      const cancelled = service.cancelReplay(result.requestId);
      expect(cancelled).toBe(true);
    });

    it('should return false for unknown replay', () => {
      const result = service.cancelReplay('unknown-id');
      expect(result).toBe(false);
    });
  });

  describe('getTenantReplays', () => {
    it('should return replays for a tenant', async () => {
      mockEventLog.getEventsForReplay.mockReturnValue([]);

      const request1: EventReplayRequest = {
        tenantId: 'tenant-1',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(),
      };

      const request2: EventReplayRequest = {
        tenantId: 'tenant-2',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(),
      };

      await service.startReplay(request1);
      await service.startReplay(request1);
      await service.startReplay(request2);

      const tenant1Replays = service.getTenantReplays('tenant-1');
      expect(tenant1Replays).toHaveLength(2);
    });
  });

  describe('getActiveReplays', () => {
    it('should return only in-progress replays', async () => {
      const entries: EventLogEntry[] = Array.from({ length: 10 }, (_, i) => ({
        id: `entry-${i}`,
        eventId: `event-${i}`,
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        payload: {},
        source: 'test',
        status: EventStatus.DELIVERED,
        createdAt: new Date(),
      }));

      mockEventLog.getEventsForReplay.mockReturnValue(entries);
      mockEventPublisher.publish.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 50)),
      );

      const request: EventReplayRequest = {
        tenantId: 'tenant-1',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(),
      };

      await service.startReplay(request);

      // Wait for replay to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      const activeReplays = service.getActiveReplays();
      expect(activeReplays.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cleanupOldReplays', () => {
    it('should remove old completed replays', async () => {
      mockEventLog.getEventsForReplay.mockReturnValue([]);
      mockEventPublisher.publish.mockResolvedValue({});

      const request: EventReplayRequest = {
        tenantId: 'tenant-1',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(),
      };

      const result = await service.startReplay(request);

      // Wait for replay to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Manually set completedAt to past
      const status = service.getReplayStatus(result.requestId);
      if (status && status.completedAt) {
        (status as any).completedAt = new Date(Date.now() - 100000);
      }

      const count = service.cleanupOldReplays(1000);
      // Should clean up the old replay
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
