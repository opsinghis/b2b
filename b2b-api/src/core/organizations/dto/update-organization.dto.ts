import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: 'Engineering Department', description: 'Organization name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'ENG',
    description: 'Unique code within the tenant',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Code must be uppercase alphanumeric with underscores or hyphens',
  })
  code?: string;

  @ApiPropertyOptional({
    example: 'Responsible for all engineering activities',
    description: 'Organization description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: 'clx1234567890',
    description: 'Parent organization ID for hierarchy',
  })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({ example: true, description: 'Whether the organization is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
