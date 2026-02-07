import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: 'clx1234567890' })
  id!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email!: string;

  @ApiProperty({ example: 'John' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @ApiProperty({ example: 'USER', enum: UserRole })
  role!: UserRole;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  lastLoginAt?: Date | null;

  @ApiProperty({ example: 'clx-tenant-123' })
  tenantId!: string;

  @ApiPropertyOptional({ example: 'clx-org-123' })
  organizationId?: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({ example: null })
  deletedAt?: Date | null;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.role = user.role;
    dto.isActive = user.isActive;
    dto.lastLoginAt = user.lastLoginAt;
    dto.tenantId = user.tenantId;
    dto.organizationId = user.organizationId;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    dto.deletedAt = user.deletedAt;
    return dto;
  }
}
