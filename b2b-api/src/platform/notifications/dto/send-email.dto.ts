import {
  IsString,
  IsEmail,
  IsOptional,
  IsObject,
  IsNotEmpty,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({ example: 'Welcome to B2B Platform' })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiPropertyOptional({
    description: 'Email template name',
    example: 'welcome',
  })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiPropertyOptional({
    description: 'Plain text body (used if no template)',
    example: 'Welcome to our platform!',
  })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({
    description: 'HTML body (used if no template)',
    example: '<h1>Welcome!</h1>',
  })
  @IsString()
  @IsOptional()
  html?: string;

  @ApiPropertyOptional({
    description: 'Template variables',
    example: { userName: 'John', companyName: 'Acme Inc' },
  })
  @IsObject()
  @IsOptional()
  variables?: Record<string, unknown>;
}

export class BulkSendEmailDto {
  @ApiProperty({
    description: 'Recipient email addresses',
    type: [String],
    example: ['user1@example.com', 'user2@example.com'],
  })
  @IsArray()
  @IsEmail({}, { each: true })
  @IsNotEmpty()
  to!: string[];

  @ApiProperty({ example: 'Important Update' })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiPropertyOptional({ example: 'announcement' })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiPropertyOptional({ example: 'Important update for all users.' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({ example: '<h1>Important Update</h1>' })
  @IsString()
  @IsOptional()
  html?: string;

  @ApiPropertyOptional({ example: { announcementTitle: 'New Feature Released' } })
  @IsObject()
  @IsOptional()
  variables?: Record<string, unknown>;
}

export interface EmailJobData {
  to: string;
  subject: string;
  template?: string;
  text?: string;
  html?: string;
  variables?: Record<string, unknown>;
  tenantId: string;
  userId?: string;
}
