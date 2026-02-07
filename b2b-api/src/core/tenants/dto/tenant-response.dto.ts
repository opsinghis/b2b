import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Tenant } from '@prisma/client';

export class TenantResponseDto {
  @ApiProperty({ example: 'clx1234567890' })
  id!: string;

  @ApiProperty({ example: 'Acme Corporation' })
  name!: string;

  @ApiProperty({ example: 'acme-corp' })
  slug!: string;

  @ApiProperty({ example: { theme: 'dark', features: ['quotes', 'contracts'] } })
  config!: Record<string, unknown>;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({ example: null })
  deletedAt?: Date | null;

  static fromEntity(tenant: Tenant): TenantResponseDto {
    const dto = new TenantResponseDto();
    dto.id = tenant.id;
    dto.name = tenant.name;
    dto.slug = tenant.slug;
    dto.config = tenant.config as Record<string, unknown>;
    dto.isActive = tenant.isActive;
    dto.createdAt = tenant.createdAt;
    dto.updatedAt = tenant.updatedAt;
    dto.deletedAt = tenant.deletedAt;
    return dto;
  }
}
