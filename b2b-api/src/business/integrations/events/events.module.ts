import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { QUEUE_NAMES } from './interfaces';
import {
  EventPublisherService,
  EventSubscriberService,
  EventLogService,
  EventReplayService,
  WebhookDeliveryService,
} from './services';
import { EventProcessor, WebhookProcessor } from './processors';

/**
 * Events Module
 * Message queue integration for B2B platform
 */
@Module({
  imports: [
    // HTTP client for webhook delivery
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    // BullMQ queues
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.EVENTS,
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            age: 86400,
            count: 1000,
          },
          removeOnFail: {
            age: 604800,
          },
        },
      },
      {
        name: QUEUE_NAMES.WEBHOOKS,
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            age: 86400,
            count: 1000,
          },
          removeOnFail: {
            age: 604800,
          },
        },
      },
      {
        name: QUEUE_NAMES.NOTIFICATIONS,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      },
      {
        name: QUEUE_NAMES.SYNC,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
        },
      },
      {
        name: QUEUE_NAMES.DEAD_LETTER,
      },
    ),
    // Schedule module for cron jobs (retention cleanup)
    ScheduleModule.forRoot(),
  ],
  providers: [
    // Services
    EventPublisherService,
    EventSubscriberService,
    EventLogService,
    EventReplayService,
    WebhookDeliveryService,
    // Processors
    EventProcessor,
    WebhookProcessor,
  ],
  exports: [
    EventPublisherService,
    EventSubscriberService,
    EventLogService,
    EventReplayService,
    WebhookDeliveryService,
  ],
})
export class EventsModule {}
