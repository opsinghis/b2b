import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsBoolean,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'Acme Corporation', description: 'Tenant name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'acme-corp',
    description: 'Unique URL-friendly slug for the tenant',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: { theme: 'dark', features: ['quotes', 'contracts'] },
    description: 'Tenant-specific configuration',
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ example: true, description: 'Whether the tenant is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
