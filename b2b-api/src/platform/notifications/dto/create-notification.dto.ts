import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType, example: NotificationType.INFO })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type!: NotificationType;

  @ApiProperty({ example: 'New Quote Submitted' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Quote QT-2026-0001 has been submitted for approval.' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ example: { quoteId: 'abc123', action: 'review' } })
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;

  @ApiProperty({ description: 'Target user ID', example: 'user-uuid' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;
}

export class BulkCreateNotificationDto {
  @ApiProperty({ enum: NotificationType, example: NotificationType.INFO })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type!: NotificationType;

  @ApiProperty({ example: 'System Maintenance' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Scheduled maintenance tonight from 10PM to 2AM.' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ example: { maintenanceId: '123' } })
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;

  @ApiProperty({ description: 'Target user IDs', type: [String] })
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  userIds!: string[];
}
