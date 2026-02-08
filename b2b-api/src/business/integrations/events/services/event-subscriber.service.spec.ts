import { Test, TestingModule } from '@nestjs/testing';
import { EventSubscriberService } from './event-subscriber.service';
import { BaseEvent, ORDER_EVENTS, INVOICE_EVENTS, EventType } from '../interfaces';

describe('EventSubscriberService', () => {
  let service: EventSubscriberService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventSubscriberService],
    }).compile();

    service = module.get<EventSubscriberService>(EventSubscriberService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('subscribe', () => {
    it('should create a subscription', () => {
      const handler = jest.fn();
      const subscriptionId = service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler);

      expect(subscriptionId).toBeDefined();
      expect(typeof subscriptionId).toBe('string');
    });

    it('should subscribe to multiple event types', () => {
      const handler = jest.fn();
      const subscriptionId = service.subscribe(
        'tenant-1',
        [ORDER_EVENTS.ORDER_CREATED, ORDER_EVENTS.ORDER_UPDATED],
        handler,
      );

      const subscription = service.getSubscription(subscriptionId);
      expect(subscription?.eventTypes).toHaveLength(2);
    });

    it('should create enabled subscription by default', () => {
      const handler = jest.fn();
      const subscriptionId = service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler);

      const subscription = service.getSubscription(subscriptionId);
      expect(subscription?.enabled).toBe(true);
    });

    it('should create disabled subscription when specified', () => {
      const handler = jest.fn();
      const subscriptionId = service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler, {
        enabled: false,
      });

      const subscription = service.getSubscription(subscriptionId);
      expect(subscription?.enabled).toBe(false);
    });
  });

  describe('subscribeAll', () => {
    it('should subscribe to all events', () => {
      const handler = jest.fn();
      const subscriptionId = service.subscribeAll('tenant-1', handler);

      const subscription = service.getSubscription(subscriptionId);
      expect(subscription?.eventTypes).toContain('*');
    });
  });

  describe('unsubscribe', () => {
    it('should remove a subscription', () => {
      const handler = jest.fn();
      const subscriptionId = service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler);

      const result = service.unsubscribe(subscriptionId);
      expect(result).toBe(true);

      const subscription = service.getSubscription(subscriptionId);
      expect(subscription).toBeUndefined();
    });

    it('should return false for unknown subscription', () => {
      const result = service.unsubscribe('unknown-id');
      expect(result).toBe(false);
    });
  });

  describe('setEnabled', () => {
    it('should enable/disable subscription', () => {
      const handler = jest.fn();
      const subscriptionId = service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler);

      service.setEnabled(subscriptionId, false);
      expect(service.getSubscription(subscriptionId)?.enabled).toBe(false);

      service.setEnabled(subscriptionId, true);
      expect(service.getSubscription(subscriptionId)?.enabled).toBe(true);
    });

    it('should return false for unknown subscription', () => {
      const result = service.setEnabled('unknown-id', true);
      expect(result).toBe(false);
    });
  });

  describe('dispatch', () => {
    it('should dispatch event to matching subscribers', async () => {
      const handler = jest.fn();
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler);

      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123' },
      };

      const result = await service.dispatch(event);

      expect(handler).toHaveBeenCalledWith(event);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
    });

    it('should not dispatch to other tenants', async () => {
      const handler = jest.fn();
      service.subscribe('tenant-2', ORDER_EVENTS.ORDER_CREATED, handler);

      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123' },
      };

      await service.dispatch(event);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should not dispatch to disabled subscriptions', async () => {
      const handler = jest.fn();
      const subscriptionId = service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler);
      service.setEnabled(subscriptionId, false);

      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123' },
      };

      await service.dispatch(event);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should dispatch to wildcard subscriptions', async () => {
      const handler = jest.fn();
      service.subscribeAll('tenant-1', handler);

      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123' },
      };

      await service.dispatch(event);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should handle handler errors', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler error'));
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler);

      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123' },
      };

      const result = await service.dispatch(event);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should dispatch to multiple subscribers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler1);
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler2);

      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123' },
      };

      const result = await service.dispatch(event);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(result.successCount).toBe(2);
    });
  });

  describe('filter matching', () => {
    it('should filter by source', async () => {
      const handler = jest.fn();
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler, {
        filter: { sources: ['allowed-source'] },
      });

      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'other-source',
        payload: { orderId: '123' },
      };

      await service.dispatch(event);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should filter by metadata', async () => {
      const handler = jest.fn();
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler, {
        filter: { metadata: { region: 'us-east' } },
      });

      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        metadata: { region: 'us-west' },
        payload: { orderId: '123' },
      };

      await service.dispatch(event);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should filter by conditions - equals', async () => {
      const handler = jest.fn();
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler, {
        filter: {
          conditions: [{ path: '$.payload.status', operator: 'eq', value: 'pending' }],
        },
      });

      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123', status: 'approved' },
      };

      await service.dispatch(event);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should filter by conditions - greater than', async () => {
      const handler = jest.fn();
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler, {
        filter: {
          conditions: [{ path: '$.payload.total', operator: 'gt', value: 100 }],
        },
      });

      const matchingEvent: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123', total: 150 },
      };

      await service.dispatch(matchingEvent);
      expect(handler).toHaveBeenCalled();
    });

    it('should filter by conditions - contains', async () => {
      const handler = jest.fn();
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler, {
        filter: {
          conditions: [{ path: '$.payload.tags', operator: 'contains', value: 'urgent' }],
        },
      });

      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123', tags: 'urgent,priority' },
      };

      await service.dispatch(event);
      expect(handler).toHaveBeenCalled();
    });

    it('should filter by conditions - in array', async () => {
      const handler = jest.fn();
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler, {
        filter: {
          conditions: [
            { path: '$.payload.status', operator: 'in', value: ['pending', 'approved'] },
          ],
        },
      });

      const event: BaseEvent = {
        id: 'event-1',
        type: ORDER_EVENTS.ORDER_CREATED,
        tenantId: 'tenant-1',
        timestamp: new Date(),
        version: '1.0',
        source: 'test',
        payload: { orderId: '123', status: 'approved' },
      };

      await service.dispatch(event);
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('getSubscriptionsByTenant', () => {
    it('should return all subscriptions for a tenant', () => {
      const handler = jest.fn();
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler);
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_UPDATED, handler);
      service.subscribe('tenant-2', INVOICE_EVENTS.INVOICE_CREATED, handler);

      const subscriptions = service.getSubscriptionsByTenant('tenant-1');
      expect(subscriptions).toHaveLength(2);
    });

    it('should return empty array for unknown tenant', () => {
      const subscriptions = service.getSubscriptionsByTenant('unknown');
      expect(subscriptions).toHaveLength(0);
    });
  });

  describe('getSubscriptionsByType', () => {
    it('should return subscriptions by event type', () => {
      const handler = jest.fn();
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler);
      service.subscribe('tenant-2', ORDER_EVENTS.ORDER_CREATED, handler);
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_UPDATED, handler);

      const subscriptions = service.getSubscriptionsByType(ORDER_EVENTS.ORDER_CREATED);
      expect(subscriptions).toHaveLength(2);
    });
  });

  describe('getSubscriptionCount', () => {
    it('should return total subscription count', () => {
      const handler = jest.fn();
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler);
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_UPDATED, handler);

      expect(service.getSubscriptionCount()).toBe(2);
    });
  });

  describe('clearTenantSubscriptions', () => {
    it('should remove all subscriptions for a tenant', () => {
      const handler = jest.fn();
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_CREATED, handler);
      service.subscribe('tenant-1', ORDER_EVENTS.ORDER_UPDATED, handler);
      service.subscribe('tenant-2', INVOICE_EVENTS.INVOICE_CREATED, handler);

      const count = service.clearTenantSubscriptions('tenant-1');

      expect(count).toBe(2);
      expect(service.getSubscriptionsByTenant('tenant-1')).toHaveLength(0);
      expect(service.getSubscriptionsByTenant('tenant-2')).toHaveLength(1);
    });

    it('should return 0 for unknown tenant', () => {
      const count = service.clearTenantSubscriptions('unknown');
      expect(count).toBe(0);
    });
  });
});
