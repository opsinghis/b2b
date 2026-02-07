import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { EventProcessor } from './event.processor';
import { EventSubscriberService } from '../services/event-subscriber.service';
import { EventLogService } from '../services/event-log.service';
import { EventJobData, ORDER_EVENTS, EventStatus, BaseEvent } from '../interfaces';

describe('EventProcessor', () => {
  let processor: EventProcessor;
  let eventSubscriber: EventSubscriberService;
  let eventLog: EventLogService;

  const mockEventSubscriber = {
    dispatch: jest.fn(),
  };

  const mockEventLog = {
    logEvent: jest.fn(),
    updateStatus: jest.fn(),
    getEntryByEventId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventProcessor,
        {
          provide: EventSubscriberService,
          useValue: mockEventSubscriber,
        },
        {
          provide: EventLogService,
          useValue: mockEventLog,
        },
      ],
    }).compile();

    processor = module.get<EventProcessor>(EventProcessor);
    eventSubscriber = module.get<EventSubscriberService>(EventSubscriberService);
    eventLog = module.get<EventLogService>(EventLogService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should process an event successfully', async () => {
      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123' },
      };

      const jobData: EventJobData = { event };

      const job = {
        data: jobData,
        id: 'job-1',
      } as Job<EventJobData>;

      mockEventLog.logEvent.mockReturnValue({ id: 'entry-1' });
      mockEventSubscriber.dispatch.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        errors: [],
      });

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(result.dispatched).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockEventLog.logEvent).toHaveBeenCalledWith(event);
      expect(mockEventLog.updateStatus).toHaveBeenCalledWith('entry-1', EventStatus.PROCESSING);
      expect(mockEventLog.updateStatus).toHaveBeenCalledWith('entry-1', EventStatus.DELIVERED);
    });

    it('should mark event as failed when all dispatches fail', async () => {
      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123' },
      };

      const jobData: EventJobData = { event };

      const job = {
        data: jobData,
        id: 'job-1',
      } as Job<EventJobData>;

      mockEventLog.logEvent.mockReturnValue({ id: 'entry-1' });
      mockEventSubscriber.dispatch.mockResolvedValue({
        successCount: 0,
        failureCount: 2,
        errors: [new Error('Error 1'), new Error('Error 2')],
      });

      const result = await processor.process(job);

      expect(result.success).toBe(false);
      expect(result.dispatched).toBe(0);
      expect(result.failed).toBe(2);
      expect(mockEventLog.updateStatus).toHaveBeenCalledWith('entry-1', EventStatus.FAILED);
    });

    it('should handle partial dispatch failure', async () => {
      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123' },
      };

      const jobData: EventJobData = { event };

      const job = {
        data: jobData,
        id: 'job-1',
      } as Job<EventJobData>;

      mockEventLog.logEvent.mockReturnValue({ id: 'entry-1' });
      mockEventSubscriber.dispatch.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        errors: [new Error('Error 1')],
      });

      const result = await processor.process(job);

      expect(result.success).toBe(false);
      expect(result.dispatched).toBe(1);
      expect(result.failed).toBe(1);
      // Partial success still marks as delivered
      expect(mockEventLog.updateStatus).toHaveBeenCalledWith('entry-1', EventStatus.DELIVERED);
    });

    it('should handle dispatch error', async () => {
      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123' },
      };

      const jobData: EventJobData = { event };

      const job = {
        data: jobData,
        id: 'job-1',
      } as Job<EventJobData>;

      mockEventLog.logEvent.mockReturnValue({ id: 'entry-1' });
      mockEventSubscriber.dispatch.mockRejectedValue(new Error('Dispatch failed'));

      await expect(processor.process(job)).rejects.toThrow('Dispatch failed');
      expect(mockEventLog.updateStatus).toHaveBeenCalledWith('entry-1', EventStatus.FAILED);
    });
  });

  describe('event handlers', () => {
    it('should handle onCompleted', () => {
      const job = {
        data: { event: { id: 'event-1' } },
        id: 'job-1',
      } as Job<EventJobData>;

      // Should not throw
      expect(() => processor.onCompleted(job)).not.toThrow();
    });

    it('should handle onFailed', () => {
      const job = {
        data: { event: { id: 'event-1' } },
        id: 'job-1',
        attemptsMade: 5,
        opts: { attempts: 5 },
      } as unknown as Job<EventJobData>;

      mockEventLog.getEntryByEventId.mockReturnValue({ id: 'entry-1' });

      // Should not throw
      expect(() => processor.onFailed(job, new Error('Job failed'))).not.toThrow();
      expect(mockEventLog.updateStatus).toHaveBeenCalledWith('entry-1', EventStatus.DEAD_LETTER);
    });

    it('should handle onActive', () => {
      const job = {
        data: { event: { id: 'event-1' } },
        id: 'job-1',
        attemptsMade: 0,
      } as Job<EventJobData>;

      // Should not throw
      expect(() => processor.onActive(job)).not.toThrow();
    });
  });
});
