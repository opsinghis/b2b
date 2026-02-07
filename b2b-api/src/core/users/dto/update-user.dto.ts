import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John', description: 'User first name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'User last name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({
    example: 'USER',
    enum: UserRole,
    description: 'User role',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    example: 'clx1234567890',
    description: 'Organization ID',
  })
  @IsOptional()
  @IsString()
  organizationId?: string | null;

  @ApiPropertyOptional({ example: true, description: 'Whether the user is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
