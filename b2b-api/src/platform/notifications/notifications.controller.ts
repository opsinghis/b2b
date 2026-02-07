import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Notification } from '@prisma/client';
import { NotificationsService, PaginatedResult } from './notifications.service';
import {
  CreateNotificationDto,
  BulkCreateNotificationDto,
  NotificationQueryDto,
  SendEmailDto,
  BulkSendEmailDto,
} from './dto';
import { CurrentUser } from '@core/auth';
import { TenantContext } from '@core/tenants';
import { CheckAbility, CanCreate, CanRead } from '@core/authorization';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ==========================================
  // In-App Notifications
  // ==========================================

  @Get()
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiResponse({
    status: 200,
    description: 'List of notifications with pagination',
  })
  async findAll(
    @Query() query: NotificationQueryDto,
    @TenantContext() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<PaginatedResult<Notification>> {
    return this.notificationsService.findAll(query, tenantId, userId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Unread notification count',
  })
  async getUnreadCount(
    @TenantContext() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(tenantId, userId);
    return { count };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification found' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<Notification> {
    return this.notificationsService.findOne(id, tenantId, userId);
  }

  @Post()
  @CanCreate('Notification')
  @ApiOperation({ summary: 'Create a notification (admin)' })
  @ApiResponse({ status: 201, description: 'Notification created' })
  async create(
    @Body() dto: CreateNotificationDto,
    @TenantContext() tenantId: string,
  ): Promise<Notification> {
    return this.notificationsService.create(dto, tenantId);
  }

  @Post('bulk')
  @CanCreate('Notification')
  @ApiOperation({ summary: 'Create notifications for multiple users (admin)' })
  @ApiResponse({ status: 201, description: 'Notifications created' })
  async createBulk(
    @Body() dto: BulkCreateNotificationDto,
    @TenantContext() tenantId: string,
  ): Promise<{ count: number }> {
    return this.notificationsService.createBulk(dto, tenantId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<Notification> {
    return this.notificationsService.markAsRead(id, tenantId, userId);
  }

  @Patch('read/all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(
    @TenantContext() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ markedCount: number }> {
    return this.notificationsService.markAllAsRead(tenantId, userId);
  }

  @Post('read/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark multiple notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  async markManyAsRead(
    @Body() body: { ids: string[] },
    @TenantContext() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ markedCount: number }> {
    return this.notificationsService.markManyAsRead(body.ids, tenantId, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 204, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async remove(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.notificationsService.remove(id, tenantId, userId);
  }

  // ==========================================
  // Email Queue Endpoints
  // ==========================================

  @Post('email')
  @CanCreate('Notification')
  @ApiOperation({ summary: 'Queue an email for delivery (admin)' })
  @ApiResponse({ status: 201, description: 'Email queued' })
  async queueEmail(
    @Body() dto: SendEmailDto,
    @TenantContext() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ jobId: string }> {
    return this.notificationsService.queueEmail(dto, tenantId, userId);
  }

  @Post('email/bulk')
  @CanCreate('Notification')
  @ApiOperation({ summary: 'Queue bulk emails for delivery (admin)' })
  @ApiResponse({ status: 201, description: 'Emails queued' })
  async queueBulkEmails(
    @Body() dto: BulkSendEmailDto,
    @TenantContext() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ jobIds: string[] }> {
    return this.notificationsService.queueBulkEmails(dto, tenantId, userId);
  }

  @Get('email/stats')
  @CanRead('Notification')
  @ApiOperation({ summary: 'Get email queue statistics (admin)' })
  @ApiResponse({ status: 200, description: 'Queue statistics' })
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    return this.notificationsService.getQueueStats();
  }
}
