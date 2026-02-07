import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corporation', description: 'Tenant name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'acme-corp',
    description: 'Unique URL-friendly slug for the tenant',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  slug!: string;

  @ApiPropertyOptional({
    example: { theme: 'dark', features: ['quotes', 'contracts'] },
    description: 'Tenant-specific configuration',
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
