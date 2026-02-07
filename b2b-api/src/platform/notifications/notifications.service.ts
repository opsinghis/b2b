import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@infrastructure/database';
import { Notification, Prisma, NotificationType } from '@prisma/client';
import {
  CreateNotificationDto,
  BulkCreateNotificationDto,
  NotificationQueryDto,
  EmailJobData,
  SendEmailDto,
  BulkSendEmailDto,
} from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export const EMAIL_QUEUE_NAME = 'email';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly emailQueue: Queue,
  ) {}

  /**
   * Create a single in-app notification
   */
  async create(
    dto: CreateNotificationDto,
    tenantId: string,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: (dto.data || {}) as Prisma.InputJsonValue,
        tenantId,
        userId: dto.userId,
      },
    });

    this.logger.log(
      `Notification created: ${notification.id} for user ${dto.userId}`,
    );

    return notification;
  }

  /**
   * Create notifications for multiple users
   */
  async createBulk(
    dto: BulkCreateNotificationDto,
    tenantId: string,
  ): Promise<{ count: number }> {
    const result = await this.prisma.notification.createMany({
      data: dto.userIds.map((userId) => ({
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: (dto.data || {}) as Prisma.InputJsonValue,
        tenantId,
        userId,
      })),
    });

    this.logger.log(
      `Bulk notifications created: ${result.count} notifications for tenant ${tenantId}`,
    );

    return { count: result.count };
  }

  /**
   * Create a notification for a specific event (helper method)
   */
  async notifyUser(
    tenantId: string,
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<Notification> {
    return this.create(
      {
        type,
        title,
        message,
        data,
        userId,
      },
      tenantId,
    );
  }

  /**
   * Get notifications for the current user with pagination
   */
  async findAll(
    query: NotificationQueryDto,
    tenantId: string,
    userId: string,
  ): Promise<PaginatedResult<Notification>> {
    const { type, isRead, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      tenantId,
      userId,
      ...(type && { type }),
      ...(isRead !== undefined && { isRead }),
    };

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { tenantId, userId, isRead: false },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  /**
   * Get a single notification
   */
  async findOne(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, tenantId, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID '${id}' not found`);
    }

    return notification;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<Notification> {
    await this.findOne(id, tenantId, userId);

    const notification = await this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.logger.debug(`Notification ${id} marked as read`);

    return notification;
  }

  /**
   * Mark multiple notifications as read
   */
  async markManyAsRead(
    ids: string[],
    tenantId: string,
    userId: string,
  ): Promise<{ markedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: ids },
        tenantId,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.logger.debug(
      `${result.count} notifications marked as read for user ${userId}`,
    );

    return { markedCount: result.count };
  }

  /**
   * Mark all unread notifications as read for a user
   */
  async markAllAsRead(
    tenantId: string,
    userId: string,
  ): Promise<{ markedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        tenantId,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.logger.log(
      `All ${result.count} unread notifications marked as read for user ${userId}`,
    );

    return { markedCount: result.count };
  }

  /**
   * Delete a notification
   */
  async remove(id: string, tenantId: string, userId: string): Promise<void> {
    await this.findOne(id, tenantId, userId);

    await this.prisma.notification.delete({
      where: { id },
    });

    this.logger.debug(`Notification ${id} deleted`);
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        tenantId,
        userId,
        isRead: false,
      },
    });
  }

  // ==========================================
  // Email Queue Methods
  // ==========================================

  /**
   * Queue a single email for delivery
   */
  async queueEmail(
    dto: SendEmailDto,
    tenantId: string,
    userId?: string,
  ): Promise<{ jobId: string }> {
    const jobData: EmailJobData = {
      to: dto.to,
      subject: dto.subject,
      template: dto.template,
      text: dto.text,
      html: dto.html,
      variables: dto.variables,
      tenantId,
      userId,
    };

    const job = await this.emailQueue.add('send-email', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: 100,
    });

    this.logger.log(`Email queued: ${job.id} to ${dto.to}`);

    return { jobId: job.id as string };
  }

  /**
   * Queue bulk emails for delivery
   */
  async queueBulkEmails(
    dto: BulkSendEmailDto,
    tenantId: string,
    userId?: string,
  ): Promise<{ jobIds: string[] }> {
    const jobs = await Promise.all(
      dto.to.map((email) =>
        this.emailQueue.add(
          'send-email',
          {
            to: email,
            subject: dto.subject,
            template: dto.template,
            text: dto.text,
            html: dto.html,
            variables: dto.variables,
            tenantId,
            userId,
          } as EmailJobData,
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: true,
            removeOnFail: 100,
          },
        ),
      ),
    );

    const jobIds = jobs.map((job) => job.id as string);

    this.logger.log(
      `Bulk emails queued: ${jobIds.length} emails for tenant ${tenantId}`,
    );

    return { jobIds };
  }

  /**
   * Get email queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
      this.emailQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }
}
