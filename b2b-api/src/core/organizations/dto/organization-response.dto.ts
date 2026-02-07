import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Organization } from '@prisma/client';

export class OrganizationResponseDto {
  @ApiProperty({ example: 'clx1234567890' })
  id!: string;

  @ApiProperty({ example: 'Engineering Department' })
  name!: string;

  @ApiProperty({ example: 'ENG' })
  code!: string;

  @ApiPropertyOptional({ example: 'Responsible for all engineering activities' })
  description?: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ example: 'clx0987654321' })
  parentId?: string | null;

  @ApiProperty({ example: 'clx-tenant-123' })
  tenantId!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({ example: null })
  deletedAt?: Date | null;

  static fromEntity(org: Organization): OrganizationResponseDto {
    const dto = new OrganizationResponseDto();
    dto.id = org.id;
    dto.name = org.name;
    dto.code = org.code;
    dto.description = org.description;
    dto.isActive = org.isActive;
    dto.parentId = org.parentId;
    dto.tenantId = org.tenantId;
    dto.createdAt = org.createdAt;
    dto.updatedAt = org.updatedAt;
    dto.deletedAt = org.deletedAt;
    return dto;
  }
}

export interface OrganizationHierarchyNode {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  children: OrganizationHierarchyNode[];
}

export class OrganizationHierarchyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: [OrganizationHierarchyResponseDto] })
  children!: OrganizationHierarchyResponseDto[];
}
