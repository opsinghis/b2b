import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Contract, ContractStatus, ContractVersion } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class ContractVersionResponseDto {
  @ApiProperty({ example: 'version-id-123' })
  id!: string;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ example: { title: { from: 'Old Title', to: 'New Title' } } })
  changes!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;

  static fromEntity(
    version: ContractVersion,
  ): ContractVersionResponseDto {
    const dto = new ContractVersionResponseDto();
    dto.id = version.id;
    dto.version = version.version;
    dto.changes = version.changes as Record<string, unknown>;
    dto.createdAt = version.createdAt;
    return dto;
  }
}

export class ContractResponseDto {
  @ApiProperty({ example: 'contract-id-123' })
  id!: string;

  @ApiProperty({ example: 'CNT-2024-0001' })
  contractNumber!: string;

  @ApiProperty({ example: 'Annual Service Agreement' })
  title!: string;

  @ApiPropertyOptional({ example: 'Comprehensive service agreement for 2024' })
  description?: string | null;

  @ApiProperty({ enum: ContractStatus, example: 'DRAFT' })
  status!: ContractStatus;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  effectiveDate?: Date | null;

  @ApiPropertyOptional({ example: '2024-12-31T00:00:00.000Z' })
  expirationDate?: Date | null;

  @ApiPropertyOptional({ example: '100000.00' })
  totalValue?: string | null;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: { paymentTerms: 'Net 30' } })
  terms!: Record<string, unknown>;

  @ApiProperty({ example: { priority: 'high' } })
  metadata!: Record<string, unknown>;

  @ApiProperty({ example: 'tenant-id-123' })
  tenantId!: string;

  @ApiPropertyOptional({ example: 'org-id-123' })
  organizationId?: string | null;

  @ApiProperty({ example: 'user-id-123' })
  createdById!: string;

  @ApiPropertyOptional({ example: 'user-id-456' })
  approvedById?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  deletedAt?: Date | null;

  @ApiPropertyOptional({ type: [ContractVersionResponseDto] })
  versions?: ContractVersionResponseDto[];

  static fromEntity(
    contract: Contract & { versions?: ContractVersion[] },
  ): ContractResponseDto {
    const dto = new ContractResponseDto();
    dto.id = contract.id;
    dto.contractNumber = contract.contractNumber;
    dto.title = contract.title;
    dto.description = contract.description;
    dto.status = contract.status;
    dto.version = contract.version;
    dto.effectiveDate = contract.effectiveDate;
    dto.expirationDate = contract.expirationDate;
    dto.totalValue = contract.totalValue ? contract.totalValue.toString() : null;
    dto.currency = contract.currency;
    dto.terms = contract.terms as Record<string, unknown>;
    dto.metadata = contract.metadata as Record<string, unknown>;
    dto.tenantId = contract.tenantId;
    dto.organizationId = contract.organizationId;
    dto.createdById = contract.createdById;
    dto.approvedById = contract.approvedById;
    dto.createdAt = contract.createdAt;
    dto.updatedAt = contract.updatedAt;
    dto.deletedAt = contract.deletedAt;

    if (contract.versions) {
      dto.versions = contract.versions.map(ContractVersionResponseDto.fromEntity);
    }

    return dto;
  }
}
