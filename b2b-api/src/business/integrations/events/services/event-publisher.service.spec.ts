import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { EventPublisherService } from './event-publisher.service';
import { EventPriority, EventStatus, QUEUE_NAMES, ORDER_EVENTS } from '../interfaces';

describe('EventPublisherService', () => {
  let service: EventPublisherService;

  const mockQueue = {
    add: jest.fn(),
    getWaitingCount: jest.fn(),
    getActiveCount: jest.fn(),
    getCompletedCount: jest.fn(),
    getFailedCount: jest.fn(),
    getDelayedCount: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    drain: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventPublisherService,
        {
          provide: getQueueToken(QUEUE_NAMES.EVENTS),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<EventPublisherService>(EventPublisherService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publish', () => {
    it('should publish an event to the queue', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const result = await service.publish(
        'tenant-1',
        ORDER_EVENTS.ORDER_CREATED,
        { orderId: '123', total: 100 },
      );

      expect(result.tenantId).toBe('tenant-1');
      expect(result.type).toBe(ORDER_EVENTS.ORDER_CREATED);
      expect(result.payload).toEqual({ orderId: '123', total: 100 });
      expect(result.status).toBe(EventStatus.PROCESSING);
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });

    it('should include correlation ID', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const result = await service.publish(
        'tenant-1',
        ORDER_EVENTS.ORDER_CREATED,
        { orderId: '123' },
        { correlationId: 'corr-123' },
      );

      expect(result.correlationId).toBe('corr-123');
    });

    it('should include metadata', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const result = await service.publish(
        'tenant-1',
        ORDER_EVENTS.ORDER_CREATED,
        { orderId: '123' },
        { metadata: { userId: 'user-1' } },
      );

      expect(result.metadata).toEqual({ userId: 'user-1' });
    });

    it('should set event priority', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.publish(
        'tenant-1',
        ORDER_EVENTS.ORDER_CREATED,
        { orderId: '123' },
        { priority: EventPriority.HIGH },
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        ORDER_EVENTS.ORDER_CREATED,
        expect.any(Object),
        expect.objectContaining({ priority: EventPriority.HIGH }),
      );
    });

    it('should set delay when provided', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.publish(
        'tenant-1',
        ORDER_EVENTS.ORDER_CREATED,
        { orderId: '123' },
        { delay: 5000 },
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        ORDER_EVENTS.ORDER_CREATED,
        expect.any(Object),
        expect.objectContaining({ delay: 5000 }),
      );
    });

    it('should handle queue errors', async () => {
      mockQueue.add.mockRejectedValue(new Error('Queue error'));

      await expect(
        service.publish('tenant-1', ORDER_EVENTS.ORDER_CREATED, { orderId: '123' }),
      ).rejects.toThrow('Queue error');
    });
  });

  describe('publishBatch', () => {
    it('should publish multiple events', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const results = await service.publishBatch('tenant-1', [
        { type: ORDER_EVENTS.ORDER_CREATED, payload: { orderId: '1' } },
        { type: ORDER_EVENTS.ORDER_UPDATED, payload: { orderId: '2' } },
      ]);

      expect(results).toHaveLength(2);
      expect(mockQueue.add).toHaveBeenCalledTimes(2);
    });

    it('should link events with same correlation ID', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const results = await service.publishBatch('tenant-1', [
        { type: ORDER_EVENTS.ORDER_CREATED, payload: { orderId: '1' } },
        { type: ORDER_EVENTS.ORDER_UPDATED, payload: { orderId: '2' } },
      ]);

      // All events should have same correlation ID
      const correlationIds = results.map((r) => r.correlationId);
      expect(new Set(correlationIds).size).toBe(1);
    });
  });

  describe('publishChain', () => {
    it('should publish events with causation chain', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const results = await service.publishChain('tenant-1', [
        { type: ORDER_EVENTS.ORDER_CREATED, payload: { orderId: '1' } },
        { type: ORDER_EVENTS.ORDER_APPROVED, payload: { orderId: '1' } },
        { type: ORDER_EVENTS.ORDER_SHIPPED, payload: { orderId: '1' } },
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].causationId).toBeUndefined();
      expect(results[1].causationId).toBe(results[0].id);
      expect(results[2].causationId).toBe(results[1].id);
    });
  });

  describe('getEvent', () => {
    it('should return published event by ID', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const published = await service.publish(
        'tenant-1',
        ORDER_EVENTS.ORDER_CREATED,
        { orderId: '123' },
      );

      const retrieved = service.getEvent(published.id);
      expect(retrieved).toEqual(published);
    });

    it('should return undefined for unknown ID', () => {
      const result = service.getEvent('unknown-id');
      expect(result).toBeUndefined();
    });
  });

  describe('getEventsByTenant', () => {
    it('should return events for a tenant', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.publish('tenant-1', ORDER_EVENTS.ORDER_CREATED, { orderId: '1' });
      await service.publish('tenant-1', ORDER_EVENTS.ORDER_CREATED, { orderId: '2' });
      await service.publish('tenant-2', ORDER_EVENTS.ORDER_CREATED, { orderId: '3' });

      const tenant1Events = service.getEventsByTenant('tenant-1');
      expect(tenant1Events).toHaveLength(2);
    });

    it('should filter by event type', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.publish('tenant-1', ORDER_EVENTS.ORDER_CREATED, { orderId: '1' });
      await service.publish('tenant-1', ORDER_EVENTS.ORDER_UPDATED, { orderId: '1' });

      const createdEvents = service.getEventsByTenant('tenant-1', {
        type: ORDER_EVENTS.ORDER_CREATED,
      });
      expect(createdEvents).toHaveLength(1);
    });

    it('should limit results', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      for (let i = 0; i < 10; i++) {
        await service.publish('tenant-1', ORDER_EVENTS.ORDER_CREATED, { orderId: String(i) });
      }

      const limitedEvents = service.getEventsByTenant('tenant-1', { limit: 5 });
      expect(limitedEvents).toHaveLength(5);
    });
  });

  describe('updateEventStatus', () => {
    it('should update event status', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const published = await service.publish(
        'tenant-1',
        ORDER_EVENTS.ORDER_CREATED,
        { orderId: '123' },
      );

      service.updateEventStatus(published.id, EventStatus.DELIVERED, {
        deliveredAt: new Date(),
      });

      const updated = service.getEvent(published.id);
      expect(updated?.status).toBe(EventStatus.DELIVERED);
      expect(updated?.deliveredAt).toBeDefined();
    });

    it('should handle error message', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const published = await service.publish(
        'tenant-1',
        ORDER_EVENTS.ORDER_CREATED,
        { orderId: '123' },
      );

      service.updateEventStatus(published.id, EventStatus.FAILED, {
        error: 'Delivery failed',
      });

      const updated = service.getEvent(published.id);
      expect(updated?.status).toBe(EventStatus.FAILED);
      expect(updated?.lastError).toBe('Delivery failed');
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(10);
      mockQueue.getActiveCount.mockResolvedValue(5);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(2);
      mockQueue.getDelayedCount.mockResolvedValue(3);

      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        waiting: 10,
        active: 5,
        completed: 100,
        failed: 2,
        delayed: 3,
      });
    });
  });

  describe('queue control', () => {
    it('should pause the queue', async () => {
      await service.pause();
      expect(mockQueue.pause).toHaveBeenCalled();
    });

    it('should resume the queue', async () => {
      await service.resume();
      expect(mockQueue.resume).toHaveBeenCalled();
    });

    it('should drain the queue', async () => {
      await service.drain();
      expect(mockQueue.drain).toHaveBeenCalled();
    });
  });

  describe('clearBuffer', () => {
    it('should clear all events from buffer', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.publish('tenant-1', ORDER_EVENTS.ORDER_CREATED, { orderId: '1' });
      await service.publish('tenant-1', ORDER_EVENTS.ORDER_CREATED, { orderId: '2' });

      service.clearBuffer();

      const events = service.getEventsByTenant('tenant-1');
      expect(events).toHaveLength(0);
    });
  });
});
