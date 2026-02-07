import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationsService, EMAIL_QUEUE_NAME } from './notifications.service';
import { PrismaService } from '@infrastructure/database';
import { NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: PrismaService;
  let emailQueue: any;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  const mockNotification = {
    id: 'notification-789',
    type: NotificationType.INFO,
    title: 'Test Notification',
    message: 'This is a test notification.',
    data: { testKey: 'testValue' },
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-02-07T10:00:00Z'),
    tenantId: mockTenantId,
    userId: mockUserId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: {
            notification: {
              create: jest.fn(),
              createMany: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: getQueueToken(EMAIL_QUEUE_NAME),
          useValue: {
            add: jest.fn(),
            getWaitingCount: jest.fn(),
            getActiveCount: jest.fn(),
            getCompletedCount: jest.fn(),
            getFailedCount: jest.fn(),
            getDelayedCount: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = module.get(PrismaService);
    emailQueue = module.get(getQueueToken(EMAIL_QUEUE_NAME));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a notification', async () => {
      (prismaService.notification.create as jest.Mock).mockResolvedValue(mockNotification);

      const dto = {
        type: NotificationType.INFO,
        title: 'Test Notification',
        message: 'This is a test notification.',
        data: { testKey: 'testValue' },
        userId: mockUserId,
      };

      const result = await service.create(dto, mockTenantId);

      expect(result).toEqual(mockNotification);
      expect(prismaService.notification.create).toHaveBeenCalledWith({
        data: {
          type: dto.type,
          title: dto.title,
          message: dto.message,
          data: dto.data,
          tenantId: mockTenantId,
          userId: dto.userId,
        },
      });
    });

    it('should create a notification with empty data', async () => {
      const notificationWithEmptyData = { ...mockNotification, data: {} };
      (prismaService.notification.create as jest.Mock).mockResolvedValue(notificationWithEmptyData);

      const dto = {
        type: NotificationType.INFO,
        title: 'Test Notification',
        message: 'This is a test notification.',
        userId: mockUserId,
      };

      const result = await service.create(dto, mockTenantId);

      expect(result.data).toEqual({});
    });
  });

  describe('createBulk', () => {
    it('should create notifications for multiple users', async () => {
      (prismaService.notification.createMany as jest.Mock).mockResolvedValue({ count: 3 });

      const dto = {
        type: NotificationType.INFO,
        title: 'Bulk Notification',
        message: 'This is a bulk notification.',
        userIds: ['user-1', 'user-2', 'user-3'],
      };

      const result = await service.createBulk(dto, mockTenantId);

      expect(result).toEqual({ count: 3 });
      expect(prismaService.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            type: dto.type,
            title: dto.title,
            message: dto.message,
            tenantId: mockTenantId,
            userId: 'user-1',
          }),
          expect.objectContaining({
            userId: 'user-2',
          }),
          expect.objectContaining({
            userId: 'user-3',
          }),
        ]),
      });
    });
  });

  describe('notifyUser', () => {
    it('should create a notification using helper method', async () => {
      (prismaService.notification.create as jest.Mock).mockResolvedValue(mockNotification);

      const result = await service.notifyUser(
        mockTenantId,
        mockUserId,
        NotificationType.SUCCESS,
        'Success!',
        'Operation completed successfully.',
        { action: 'complete' },
      );

      expect(result).toEqual(mockNotification);
      expect(prismaService.notification.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated notifications', async () => {
      const notifications = [mockNotification];
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue(notifications);
      (prismaService.notification.count as jest.Mock)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);

      const query = { page: 1, limit: 20 };
      const result = await service.findAll(query, mockTenantId, mockUserId);

      expect(result).toEqual({
        data: notifications,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        unreadCount: 0,
      });
      expect(prismaService.notification.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, userId: mockUserId },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by type', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.notification.count as jest.Mock).mockResolvedValue(0);

      const query = { type: NotificationType.ERROR, page: 1, limit: 20 };
      await service.findAll(query, mockTenantId, mockUserId);

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: NotificationType.ERROR,
          }),
        }),
      );
    });

    it('should filter by read status', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.notification.count as jest.Mock).mockResolvedValue(0);

      const query = { isRead: false, page: 1, limit: 20 };
      await service.findAll(query, mockTenantId, mockUserId);

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isRead: false,
          }),
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.notification.count as jest.Mock)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(10);

      const query = { page: 3, limit: 10 };
      const result = await service.findAll(query, mockTenantId, mockUserId);

      expect(result.totalPages).toBe(5);
      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a notification by ID', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(mockNotification);

      const result = await service.findOne(mockNotification.id, mockTenantId, mockUserId);

      expect(result).toEqual(mockNotification);
      expect(prismaService.notification.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockNotification.id,
          tenantId: mockTenantId,
          userId: mockUserId,
        },
      });
    });

    it('should throw NotFoundException if notification not found', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const readNotification = {
        ...mockNotification,
        isRead: true,
        readAt: new Date(),
      };
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(mockNotification);
      (prismaService.notification.update as jest.Mock).mockResolvedValue(readNotification);

      const result = await service.markAsRead(
        mockNotification.id,
        mockTenantId,
        mockUserId,
      );

      expect(result.isRead).toBe(true);
      expect(result.readAt).not.toBeNull();
      expect(prismaService.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotification.id },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if notification not found', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.markAsRead('non-existent', mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markManyAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      (prismaService.notification.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      const ids = ['id-1', 'id-2', 'id-3'];
      const result = await service.markManyAsRead(ids, mockTenantId, mockUserId);

      expect(result).toEqual({ markedCount: 3 });
      expect(prismaService.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ids },
          tenantId: mockTenantId,
          userId: mockUserId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      (prismaService.notification.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead(mockTenantId, mockUserId);

      expect(result).toEqual({ markedCount: 5 });
      expect(prismaService.notification.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          userId: mockUserId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('remove', () => {
    it('should delete a notification', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(mockNotification);
      (prismaService.notification.delete as jest.Mock).mockResolvedValue(mockNotification);

      await service.remove(mockNotification.id, mockTenantId, mockUserId);

      expect(prismaService.notification.delete).toHaveBeenCalledWith({
        where: { id: mockNotification.id },
      });
    });

    it('should throw NotFoundException if notification not found', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.remove('non-existent', mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      (prismaService.notification.count as jest.Mock).mockResolvedValue(5);

      const result = await service.getUnreadCount(mockTenantId, mockUserId);

      expect(result).toBe(5);
      expect(prismaService.notification.count).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          userId: mockUserId,
          isRead: false,
        },
      });
    });
  });

  describe('queueEmail', () => {
    it('should queue an email job', async () => {
      (emailQueue.add as jest.Mock).mockResolvedValue({ id: 'job-123' });

      const dto = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'Hello, world!',
      };

      const result = await service.queueEmail(dto, mockTenantId, mockUserId);

      expect(result).toEqual({ jobId: 'job-123' });
      expect(emailQueue.add).toHaveBeenCalledWith(
        'send-email',
        expect.objectContaining({
          to: dto.to,
          subject: dto.subject,
          text: dto.text,
          tenantId: mockTenantId,
          userId: mockUserId,
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        }),
      );
    });

    it('should queue an email with template', async () => {
      (emailQueue.add as jest.Mock).mockResolvedValue({ id: 'job-456' });

      const dto = {
        to: 'test@example.com',
        subject: 'Welcome!',
        template: 'welcome',
        variables: { userName: 'John' },
      };

      const result = await service.queueEmail(dto, mockTenantId);

      expect(result).toEqual({ jobId: 'job-456' });
      expect(emailQueue.add).toHaveBeenCalledWith(
        'send-email',
        expect.objectContaining({
          template: 'welcome',
          variables: { userName: 'John' },
        }),
        expect.any(Object),
      );
    });
  });

  describe('queueBulkEmails', () => {
    it('should queue multiple email jobs', async () => {
      (emailQueue.add as jest.Mock)
        .mockResolvedValueOnce({ id: 'job-1' })
        .mockResolvedValueOnce({ id: 'job-2' })
        .mockResolvedValueOnce({ id: 'job-3' });

      const dto = {
        to: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
        subject: 'Announcement',
        text: 'Important announcement!',
      };

      const result = await service.queueBulkEmails(dto, mockTenantId, mockUserId);

      expect(result).toEqual({ jobIds: ['job-1', 'job-2', 'job-3'] });
      expect(emailQueue.add).toHaveBeenCalledTimes(3);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      (emailQueue.getWaitingCount as jest.Mock).mockResolvedValue(5);
      (emailQueue.getActiveCount as jest.Mock).mockResolvedValue(2);
      (emailQueue.getCompletedCount as jest.Mock).mockResolvedValue(100);
      (emailQueue.getFailedCount as jest.Mock).mockResolvedValue(3);
      (emailQueue.getDelayedCount as jest.Mock).mockResolvedValue(1);

      const result = await service.getQueueStats();

      expect(result).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });
    });
  });
});
