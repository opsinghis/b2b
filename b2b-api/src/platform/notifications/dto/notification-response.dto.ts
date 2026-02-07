import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class NotificationResponseDto {
  @ApiProperty({ example: 'clz123abc' })
  id!: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.INFO })
  type!: NotificationType;

  @ApiProperty({ example: 'New Quote Submitted' })
  title!: string;

  @ApiProperty({ example: 'Quote QT-2026-0001 has been submitted for approval.' })
  message!: string;

  @ApiProperty({ example: { quoteId: 'abc123', action: 'review' } })
  data!: Record<string, unknown>;

  @ApiProperty({ example: false })
  isRead!: boolean;

  @ApiPropertyOptional({ example: '2026-02-07T10:30:00.000Z' })
  readAt!: Date | null;

  @ApiProperty({ example: '2026-02-07T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: 'tenant-uuid' })
  tenantId!: string;

  @ApiProperty({ example: 'user-uuid' })
  userId!: string;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data!: NotificationResponseDto[];

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;

  @ApiProperty({ example: 5 })
  unreadCount!: number;
}

export class MarkReadResponseDto {
  @ApiProperty({ example: 5 })
  markedCount!: number;
}
