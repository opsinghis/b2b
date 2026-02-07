import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  BaseEvent,
  EventType,
  EventSubscription,
  EventFilter,
  EventDestination,
  RetryPolicy,
  FilterCondition,
} from '../interfaces';

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (event: BaseEvent<T>) => Promise<void>;

/**
 * Internal subscription entry
 */
interface InternalSubscription {
  id: string;
  tenantId: string;
  eventTypes: EventType[];
  handler: EventHandler;
  filter?: EventFilter;
  enabled: boolean;
}

/**
 * Subscription creation options
 */
export interface SubscribeOptions {
  name?: string;
  filter?: EventFilter;
  enabled?: boolean;
}

/**
 * Event Subscriber Service
 * Handles event subscriptions and routing
 */
@Injectable()
export class EventSubscriberService implements OnModuleDestroy {
  private readonly logger = new Logger(EventSubscriberService.name);
  private readonly subscriptions = new Map<string, InternalSubscription>();
  private readonly typeIndex = new Map<EventType, Set<string>>();
  private readonly tenantIndex = new Map<string, Set<string>>();

  onModuleDestroy() {
    this.subscriptions.clear();
    this.typeIndex.clear();
    this.tenantIndex.clear();
  }

  /**
   * Subscribe to event types
   */
  subscribe<T = unknown>(
    tenantId: string,
    eventTypes: EventType | EventType[],
    handler: EventHandler<T>,
    options: SubscribeOptions = {},
  ): string {
    const subscriptionId = uuidv4();
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];

    const subscription: InternalSubscription = {
      id: subscriptionId,
      tenantId,
      eventTypes: types,
      handler: handler as EventHandler,
      filter: options.filter,
      enabled: options.enabled !== false,
    };

    // Store subscription
    this.subscriptions.set(subscriptionId, subscription);

    // Index by event type
    for (const type of types) {
      if (!this.typeIndex.has(type)) {
        this.typeIndex.set(type, new Set());
      }
      this.typeIndex.get(type)!.add(subscriptionId);
    }

    // Index by tenant
    if (!this.tenantIndex.has(tenantId)) {
      this.tenantIndex.set(tenantId, new Set());
    }
    this.tenantIndex.get(tenantId)!.add(subscriptionId);

    this.logger.debug(`Created subscription ${subscriptionId} for tenant ${tenantId} on events: ${types.join(', ')}`);

    return subscriptionId;
  }

  /**
   * Subscribe to all events for a tenant
   */
  subscribeAll<T = unknown>(
    tenantId: string,
    handler: EventHandler<T>,
    options: SubscribeOptions = {},
  ): string {
    // Use wildcard event type
    return this.subscribe(tenantId, '*' as EventType, handler, options);
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    // Remove from type index
    for (const type of subscription.eventTypes) {
      const typeSubscriptions = this.typeIndex.get(type);
      if (typeSubscriptions) {
        typeSubscriptions.delete(subscriptionId);
        if (typeSubscriptions.size === 0) {
          this.typeIndex.delete(type);
        }
      }
    }

    // Remove from tenant index
    const tenantSubscriptions = this.tenantIndex.get(subscription.tenantId);
    if (tenantSubscriptions) {
      tenantSubscriptions.delete(subscriptionId);
      if (tenantSubscriptions.size === 0) {
        this.tenantIndex.delete(subscription.tenantId);
      }
    }

    // Remove subscription
    this.subscriptions.delete(subscriptionId);

    this.logger.debug(`Removed subscription ${subscriptionId}`);

    return true;
  }

  /**
   * Enable/disable subscription
   */
  setEnabled(subscriptionId: string, enabled: boolean): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }
    subscription.enabled = enabled;
    return true;
  }

  /**
   * Get subscriptions for an event
   */
  getSubscriptionsForEvent(event: BaseEvent): InternalSubscription[] {
    const subscriptionIds = new Set<string>();

    // Get subscriptions by event type
    const typeSubscriptions = this.typeIndex.get(event.type);
    if (typeSubscriptions) {
      for (const id of typeSubscriptions) {
        subscriptionIds.add(id);
      }
    }

    // Get wildcard subscriptions
    const wildcardSubscriptions = this.typeIndex.get('*' as EventType);
    if (wildcardSubscriptions) {
      for (const id of wildcardSubscriptions) {
        subscriptionIds.add(id);
      }
    }

    // Filter by tenant and enabled status
    const result: InternalSubscription[] = [];
    for (const id of subscriptionIds) {
      const subscription = this.subscriptions.get(id);
      if (subscription && subscription.enabled && subscription.tenantId === event.tenantId) {
        // Apply filter if present
        if (this.matchesFilter(event, subscription.filter)) {
          result.push(subscription);
        }
      }
    }

    return result;
  }

  /**
   * Dispatch event to subscribers
   */
  async dispatch(event: BaseEvent): Promise<{ successCount: number; failureCount: number; errors: Error[] }> {
    const subscriptions = this.getSubscriptionsForEvent(event);
    const errors: Error[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const subscription of subscriptions) {
      try {
        await subscription.handler(event);
        successCount++;
        this.logger.debug(`Dispatched event ${event.id} to subscription ${subscription.id}`);
      } catch (error) {
        failureCount++;
        errors.push(error as Error);
        this.logger.error(`Failed to dispatch event ${event.id} to subscription ${subscription.id}:`, error);
      }
    }

    return { successCount, failureCount, errors };
  }

  /**
   * Check if event matches filter
   */
  private matchesFilter(event: BaseEvent, filter?: EventFilter): boolean {
    if (!filter) {
      return true;
    }

    // Check sources
    if (filter.sources && filter.sources.length > 0) {
      if (!filter.sources.includes(event.source)) {
        return false;
      }
    }

    // Check metadata
    if (filter.metadata) {
      for (const [key, value] of Object.entries(filter.metadata)) {
        if (event.metadata?.[key] !== value) {
          return false;
        }
      }
    }

    // Check conditions
    if (filter.conditions && filter.conditions.length > 0) {
      for (const condition of filter.conditions) {
        if (!this.evaluateCondition(event, condition)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Evaluate a single filter condition
   */
  private evaluateCondition(event: BaseEvent, condition: FilterCondition): boolean {
    const value = this.extractValue(event, condition.path);

    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'ne':
        return value !== condition.value;
      case 'gt':
        return typeof value === 'number' && value > (condition.value as number);
      case 'gte':
        return typeof value === 'number' && value >= (condition.value as number);
      case 'lt':
        return typeof value === 'number' && value < (condition.value as number);
      case 'lte':
        return typeof value === 'number' && value <= (condition.value as number);
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value as string);
      case 'startsWith':
        return typeof value === 'string' && value.startsWith(condition.value as string);
      case 'endsWith':
        return typeof value === 'string' && value.endsWith(condition.value as string);
      case 'regex':
        return typeof value === 'string' && new RegExp(condition.value as string).test(value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      default:
        return false;
    }
  }

  /**
   * Extract value from event using path
   */
  private extractValue(event: BaseEvent, path: string): unknown {
    const parts = path.replace(/^\$\./, '').split('.');
    let current: unknown = event;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Get subscription by ID
   */
  getSubscription(subscriptionId: string): InternalSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * Get all subscriptions for a tenant
   */
  getSubscriptionsByTenant(tenantId: string): InternalSubscription[] {
    const subscriptionIds = this.tenantIndex.get(tenantId);
    if (!subscriptionIds) {
      return [];
    }

    return Array.from(subscriptionIds)
      .map((id) => this.subscriptions.get(id))
      .filter((s): s is InternalSubscription => s !== undefined);
  }

  /**
   * Get all subscriptions for an event type
   */
  getSubscriptionsByType(eventType: EventType): InternalSubscription[] {
    const subscriptionIds = this.typeIndex.get(eventType);
    if (!subscriptionIds) {
      return [];
    }

    return Array.from(subscriptionIds)
      .map((id) => this.subscriptions.get(id))
      .filter((s): s is InternalSubscription => s !== undefined);
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Clear all subscriptions for a tenant
   */
  clearTenantSubscriptions(tenantId: string): number {
    const subscriptionIds = this.tenantIndex.get(tenantId);
    if (!subscriptionIds) {
      return 0;
    }

    let count = 0;
    for (const id of Array.from(subscriptionIds)) {
      if (this.unsubscribe(id)) {
        count++;
      }
    }

    return count;
  }
}
