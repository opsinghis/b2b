import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsObject,
  IsDateString,
  IsUUID,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Partner,
  PartnerTeamMember,
  PartnerCommission,
  PartnerResource,
  PartnerCommissionStatus,
} from '@prisma/client';
import { Prisma } from '@prisma/client';

// ============================================
// Request DTOs
// ============================================

export class CreatePartnerDto {
  @ApiProperty({ description: 'Partner code (unique)' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Partner name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'User ID to link as partner' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ description: 'Organization ID to link' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Commission rate (0-100)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Prisma.InputJsonValue;
}

export class UpdatePartnerDto {
  @ApiPropertyOptional({ description: 'Partner name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Commission rate (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Prisma.InputJsonValue;
}

export class AddTeamMemberDto {
  @ApiProperty({ description: 'User ID to add as team member' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ description: 'Role within the team' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Prisma.InputJsonValue;
}

export class CreateResourceDto {
  @ApiProperty({ description: 'Resource title' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Resource type (e.g., document, video, link)' })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ description: 'External URL' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'File key if uploaded' })
  @IsOptional()
  @IsString()
  fileKey?: string;

  @ApiPropertyOptional({ description: 'Is publicly accessible', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Prisma.InputJsonValue;
}

export class QueryPartnersDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by organization ID' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class QueryCommissionsDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  status?: PartnerCommissionStatus;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class CreateOrderOnBehalfDto {
  @ApiProperty({ description: 'Team member user ID' })
  @IsUUID()
  teamMemberUserId!: string;

  @ApiProperty({ description: 'Order items' })
  @IsArray()
  items!: OrderOnBehalfItemDto[];

  @ApiPropertyOptional({ description: 'Shipping address ID' })
  @IsOptional()
  @IsUUID()
  shippingAddressId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class OrderOnBehalfItemDto {
  @ApiProperty({ description: 'Master product ID' })
  @IsUUID()
  masterProductId!: string;

  @ApiProperty({ description: 'Quantity' })
  @IsInt()
  @Min(1)
  quantity!: number;
}

// ============================================
// Response DTOs
// ============================================

export class PartnerResponseDto {
  @ApiProperty({ description: 'Partner ID' })
  id!: string;

  @ApiProperty({ description: 'Partner code' })
  code!: string;

  @ApiProperty({ description: 'Partner name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Description' })
  description!: string | null;

  @ApiProperty({ description: 'Commission rate' })
  commissionRate!: number;

  @ApiProperty({ description: 'Is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  organizationId!: string | null;

  @ApiProperty({ description: 'Onboarded timestamp' })
  onboardedAt!: Date;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;

  static fromEntity(entity: Partner): PartnerResponseDto {
    const dto = new PartnerResponseDto();
    dto.id = entity.id;
    dto.code = entity.code;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.commissionRate = Number(entity.commissionRate);
    dto.isActive = entity.isActive;
    dto.userId = entity.userId;
    dto.organizationId = entity.organizationId;
    dto.onboardedAt = entity.onboardedAt;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

export class TeamMemberResponseDto {
  @ApiProperty({ description: 'Team member ID' })
  id!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiPropertyOptional({ description: 'User name' })
  userName?: string;

  @ApiPropertyOptional({ description: 'User email' })
  userEmail?: string;

  @ApiPropertyOptional({ description: 'Role' })
  role!: string | null;

  @ApiProperty({ description: 'Is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Joined timestamp' })
  joinedAt!: Date;

  @ApiPropertyOptional({ description: 'Left timestamp' })
  leftAt!: Date | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  static fromEntity(
    entity: PartnerTeamMember & { user?: { firstName: string; lastName: string; email: string } },
  ): TeamMemberResponseDto {
    const dto = new TeamMemberResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.userName = entity.user ? `${entity.user.firstName} ${entity.user.lastName}` : undefined;
    dto.userEmail = entity.user?.email;
    dto.role = entity.role;
    dto.isActive = entity.isActive;
    dto.joinedAt = entity.joinedAt;
    dto.leftAt = entity.leftAt;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}

export class CommissionResponseDto {
  @ApiProperty({ description: 'Commission ID' })
  id!: string;

  @ApiProperty({ description: 'Commission amount' })
  amount!: number;

  @ApiProperty({ description: 'Commission rate (%)' })
  rate!: number;

  @ApiProperty({ description: 'Order total' })
  orderTotal!: number;

  @ApiProperty({ description: 'Status' })
  status!: PartnerCommissionStatus;

  @ApiProperty({ description: 'Order ID' })
  orderId!: string;

  @ApiProperty({ description: 'Team member ID' })
  teamMemberId!: string;

  @ApiPropertyOptional({ description: 'Paid timestamp' })
  paidAt!: Date | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  static fromEntity(entity: PartnerCommission): CommissionResponseDto {
    const dto = new CommissionResponseDto();
    dto.id = entity.id;
    dto.amount = Number(entity.amount);
    dto.rate = Number(entity.rate);
    dto.orderTotal = Number(entity.orderTotal);
    dto.status = entity.status;
    dto.orderId = entity.orderId;
    dto.teamMemberId = entity.teamMemberId;
    dto.paidAt = entity.paidAt;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}

export class ResourceResponseDto {
  @ApiProperty({ description: 'Resource ID' })
  id!: string;

  @ApiProperty({ description: 'Title' })
  title!: string;

  @ApiPropertyOptional({ description: 'Description' })
  description!: string | null;

  @ApiProperty({ description: 'Type' })
  type!: string;

  @ApiPropertyOptional({ description: 'URL' })
  url!: string | null;

  @ApiPropertyOptional({ description: 'File key' })
  fileKey!: string | null;

  @ApiProperty({ description: 'Is public' })
  isPublic!: boolean;

  @ApiProperty({ description: 'Sort order' })
  sortOrder!: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  static fromEntity(entity: PartnerResource): ResourceResponseDto {
    const dto = new ResourceResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.type = entity.type;
    dto.url = entity.url;
    dto.fileKey = entity.fileKey;
    dto.isPublic = entity.isPublic;
    dto.sortOrder = entity.sortOrder;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}

export class CommissionSummaryResponseDto {
  @ApiProperty({ description: 'Total commission earned' })
  totalEarned!: number;

  @ApiProperty({ description: 'Total pending commission' })
  totalPending!: number;

  @ApiProperty({ description: 'Total paid commission' })
  totalPaid!: number;

  @ApiProperty({ description: 'Current month commission' })
  currentMonthCommission!: number;

  @ApiProperty({ description: 'Current commission rate (%)' })
  commissionRate!: number;

  @ApiProperty({ description: 'Number of team orders' })
  teamOrderCount!: number;
}

export class PartnersListResponseDto {
  @ApiProperty({ description: 'Partners list', type: [PartnerResponseDto] })
  partners!: PartnerResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;
}

export class CommissionsListResponseDto {
  @ApiProperty({ description: 'Commissions list', type: [CommissionResponseDto] })
  commissions!: CommissionResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;
}
