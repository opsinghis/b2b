import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { AuditService } from '@core/audit';
import { Contract, ContractVersion, Prisma, ContractStatus } from '@prisma/client';
import { CreateContractDto, UpdateContractDto, ContractListQueryDto } from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ContractWithVersions = Contract & { versions?: ContractVersion[] };

/**
 * Contract State Machine
 * Valid transitions:
 * DRAFT -> PENDING_APPROVAL (submit)
 * PENDING_APPROVAL -> APPROVED (approve) | DRAFT (reject)
 * APPROVED -> ACTIVE (activate) | DRAFT (reject)
 * ACTIVE -> EXPIRED | TERMINATED
 * Any -> CANCELLED (cancel, except ACTIVE without termination)
 */
const VALID_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  [ContractStatus.DRAFT]: [ContractStatus.PENDING_APPROVAL, ContractStatus.CANCELLED],
  [ContractStatus.PENDING_APPROVAL]: [
    ContractStatus.APPROVED,
    ContractStatus.DRAFT,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.APPROVED]: [
    ContractStatus.ACTIVE,
    ContractStatus.DRAFT,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.ACTIVE]: [ContractStatus.EXPIRED, ContractStatus.TERMINATED],
  [ContractStatus.EXPIRED]: [],
  [ContractStatus.TERMINATED]: [],
  [ContractStatus.CANCELLED]: [],
};

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate a unique contract number for the tenant
   */
  private async generateContractNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CNT-${year}`;

    // Find the latest contract number for this tenant and year
    const latestContract = await this.prisma.contract.findFirst({
      where: {
        tenantId,
        contractNumber: { startsWith: prefix },
      },
      orderBy: { contractNumber: 'desc' },
    });

    let sequence = 1;
    if (latestContract) {
      const parts = latestContract.contractNumber.split('-');
      const lastSequence = parseInt(parts[2], 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  async create(
    dto: CreateContractDto,
    tenantId: string,
    userId: string,
  ): Promise<ContractWithVersions> {
    const contractNumber = await this.generateContractNumber(tenantId);

    const contract = await this.prisma.contract.create({
      data: {
        contractNumber,
        title: dto.title,
        description: dto.description,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
        totalValue: dto.totalValue ? new Prisma.Decimal(dto.totalValue) : null,
        currency: dto.currency || 'USD',
        terms: (dto.terms || {}) as Prisma.InputJsonValue,
        metadata: (dto.metadata || {}) as Prisma.InputJsonValue,
        tenantId,
        organizationId: dto.organizationId || null,
        createdById: userId,
      },
      include: {
        versions: true,
      },
    });

    // Create initial version snapshot
    await this.createVersion(contract.id, 1, {}, this.createSnapshot(contract));

    this.logger.log(
      `Contract created: ${contract.contractNumber} (${contract.id}) by user ${userId}`,
    );

    return this.findOne(contract.id, tenantId);
  }

  async findAll(
    query: ContractListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResult<ContractWithVersions>> {
    const { search, status, organizationId, includeDeleted, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ContractWhereInput = {
      tenantId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { contractNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
      ...(organizationId && { organizationId }),
      ...(!includeDeleted && { deletedAt: null }),
    };

    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 5, // Include only recent versions in list
          },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, tenantId: string): Promise<ContractWithVersions> {
    const contract = await this.prisma.contract.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID '${id}' not found`);
    }

    return contract;
  }

  async update(
    id: string,
    dto: UpdateContractDto,
    tenantId: string,
    userId: string,
  ): Promise<ContractWithVersions> {
    // Get current contract
    const currentContract = await this.findOne(id, tenantId);

    // Only allow updates if contract is in DRAFT status
    if (currentContract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot update contract in '${currentContract.status}' status. Only DRAFT contracts can be updated.`,
      );
    }

    // Track changes for versioning
    const changes = this.detectChanges(currentContract, dto);

    // Update the contract
    const updateData: Prisma.ContractUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.effectiveDate !== undefined && {
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
      }),
      ...(dto.expirationDate !== undefined && {
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
      }),
      ...(dto.totalValue !== undefined && {
        totalValue: dto.totalValue ? new Prisma.Decimal(dto.totalValue) : null,
      }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.organizationId !== undefined && { organizationId: dto.organizationId }),
      ...(dto.terms !== undefined && { terms: dto.terms as Prisma.InputJsonValue }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata as Prisma.InputJsonValue }),
    };

    // Only create a new version if there are actual changes
    if (Object.keys(changes).length > 0) {
      const newVersion = currentContract.version + 1;
      updateData.version = newVersion;

      const updatedContract = await this.prisma.contract.update({
        where: { id },
        data: updateData,
      });

      // Create version history entry
      await this.createVersion(id, newVersion, changes, this.createSnapshot(updatedContract));

      this.logger.log(
        `Contract updated: ${updatedContract.contractNumber} to version ${newVersion} by user ${userId}`,
      );
    } else {
      await this.prisma.contract.update({
        where: { id },
        data: updateData,
      });
    }

    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string, userId: string): Promise<void> {
    const contract = await this.findOne(id, tenantId);

    // Only allow deletion if contract is in DRAFT or CANCELLED status
    if (contract.status !== ContractStatus.DRAFT && contract.status !== ContractStatus.CANCELLED) {
      throw new BadRequestException(
        `Cannot delete contract in '${contract.status}' status. Only DRAFT or CANCELLED contracts can be deleted.`,
      );
    }

    // Soft delete
    await this.prisma.contract.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(
      `Contract soft-deleted: ${contract.contractNumber} (${contract.id}) by user ${userId}`,
    );
  }

  async restore(id: string, tenantId: string, userId: string): Promise<ContractWithVersions> {
    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID '${id}' not found`);
    }

    if (!contract.deletedAt) {
      throw new BadRequestException(`Contract with ID '${id}' is not deleted`);
    }

    await this.prisma.contract.update({
      where: { id },
      data: { deletedAt: null },
    });

    this.logger.log(
      `Contract restored: ${contract.contractNumber} (${contract.id}) by user ${userId}`,
    );

    return this.findOne(id, tenantId);
  }

  async getVersionHistory(id: string, tenantId: string): Promise<ContractVersion[]> {
    // Verify contract exists and belongs to tenant
    await this.findOne(id, tenantId);

    return this.prisma.contractVersion.findMany({
      where: { contractId: id },
      orderBy: { version: 'desc' },
    });
  }

  async getVersion(id: string, version: number, tenantId: string): Promise<ContractVersion> {
    // Verify contract exists and belongs to tenant
    await this.findOne(id, tenantId);

    const contractVersion = await this.prisma.contractVersion.findUnique({
      where: {
        contractId_version: {
          contractId: id,
          version,
        },
      },
    });

    if (!contractVersion) {
      throw new NotFoundException(`Version ${version} not found for contract '${id}'`);
    }

    return contractVersion;
  }

  // ==========================================
  // Workflow Methods
  // ==========================================

  /**
   * Submit a contract for approval
   * Transition: DRAFT -> PENDING_APPROVAL
   */
  async submit(
    id: string,
    tenantId: string,
    userId: string,
    comments?: string,
  ): Promise<ContractWithVersions> {
    return this.transitionStatus(
      id,
      tenantId,
      userId,
      ContractStatus.DRAFT,
      ContractStatus.PENDING_APPROVAL,
      'SUBMIT',
      comments,
    );
  }

  /**
   * Approve a contract
   * Transition: PENDING_APPROVAL -> APPROVED
   */
  async approve(
    id: string,
    tenantId: string,
    userId: string,
    comments?: string,
  ): Promise<ContractWithVersions> {
    const contract = await this.transitionStatus(
      id,
      tenantId,
      userId,
      ContractStatus.PENDING_APPROVAL,
      ContractStatus.APPROVED,
      'APPROVE',
      comments,
    );

    // Set the approver
    await this.prisma.contract.update({
      where: { id },
      data: { approvedById: userId },
    });

    return this.findOne(id, tenantId);
  }

  /**
   * Reject a contract (send back to draft)
   * Transition: PENDING_APPROVAL|APPROVED -> DRAFT
   */
  async reject(
    id: string,
    tenantId: string,
    userId: string,
    comments?: string,
  ): Promise<ContractWithVersions> {
    const contract = await this.findOne(id, tenantId);

    // Can reject from PENDING_APPROVAL or APPROVED
    if (
      contract.status !== ContractStatus.PENDING_APPROVAL &&
      contract.status !== ContractStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Cannot reject contract in '${contract.status}' status. Only PENDING_APPROVAL or APPROVED contracts can be rejected.`,
      );
    }

    return this.transitionStatusDirect(
      id,
      tenantId,
      userId,
      contract.status,
      ContractStatus.DRAFT,
      'REJECT',
      comments,
    );
  }

  /**
   * Activate a contract
   * Transition: APPROVED -> ACTIVE
   */
  async activate(
    id: string,
    tenantId: string,
    userId: string,
    comments?: string,
  ): Promise<ContractWithVersions> {
    const contract = await this.findOne(id, tenantId);

    // Validate effective/expiration dates before activation
    if (!contract.effectiveDate) {
      throw new BadRequestException('Cannot activate contract without an effective date');
    }

    return this.transitionStatus(
      id,
      tenantId,
      userId,
      ContractStatus.APPROVED,
      ContractStatus.ACTIVE,
      'ACTIVATE',
      comments,
    );
  }

  /**
   * Terminate an active contract
   * Transition: ACTIVE -> TERMINATED
   */
  async terminate(
    id: string,
    tenantId: string,
    userId: string,
    comments?: string,
  ): Promise<ContractWithVersions> {
    return this.transitionStatus(
      id,
      tenantId,
      userId,
      ContractStatus.ACTIVE,
      ContractStatus.TERMINATED,
      'TERMINATE',
      comments,
    );
  }

  /**
   * Cancel a contract
   * Transition: DRAFT|PENDING_APPROVAL|APPROVED -> CANCELLED
   */
  async cancel(
    id: string,
    tenantId: string,
    userId: string,
    comments?: string,
  ): Promise<ContractWithVersions> {
    const contract = await this.findOne(id, tenantId);

    // Cannot cancel ACTIVE, EXPIRED, TERMINATED, or already CANCELLED contracts
    if (
      contract.status === ContractStatus.ACTIVE ||
      contract.status === ContractStatus.EXPIRED ||
      contract.status === ContractStatus.TERMINATED ||
      contract.status === ContractStatus.CANCELLED
    ) {
      throw new BadRequestException(`Cannot cancel contract in '${contract.status}' status.`);
    }

    return this.transitionStatusDirect(
      id,
      tenantId,
      userId,
      contract.status,
      ContractStatus.CANCELLED,
      'CANCEL',
      comments,
    );
  }

  /**
   * Check if a status transition is valid
   */
  isValidTransition(from: ContractStatus, to: ContractStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Internal method to transition contract status with validation
   */
  private async transitionStatus(
    id: string,
    tenantId: string,
    userId: string,
    expectedStatus: ContractStatus,
    newStatus: ContractStatus,
    action: string,
    comments?: string,
  ): Promise<ContractWithVersions> {
    const contract = await this.findOne(id, tenantId);

    if (contract.status !== expectedStatus) {
      throw new BadRequestException(
        `Cannot ${action.toLowerCase()} contract in '${contract.status}' status. Expected '${expectedStatus}'.`,
      );
    }

    if (!this.isValidTransition(contract.status, newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from '${contract.status}' to '${newStatus}'.`,
      );
    }

    return this.transitionStatusDirect(
      id,
      tenantId,
      userId,
      contract.status,
      newStatus,
      action,
      comments,
    );
  }

  /**
   * Internal method to perform status transition without expected status check
   */
  private async transitionStatusDirect(
    id: string,
    tenantId: string,
    userId: string,
    fromStatus: ContractStatus,
    toStatus: ContractStatus,
    action: string,
    comments?: string,
  ): Promise<ContractWithVersions> {
    // Update contract status
    await this.prisma.contract.update({
      where: { id },
      data: { status: toStatus },
    });

    // Create audit log
    await this.auditService.log(tenantId, userId, {
      action: `CONTRACT_${action}`,
      entityType: 'Contract',
      entityId: id,
      changes: {
        status: { from: fromStatus, to: toStatus },
      },
      metadata: {
        comments,
        action,
      },
    });

    this.logger.log(
      `Contract ${id} transitioned from ${fromStatus} to ${toStatus} (${action}) by user ${userId}`,
    );

    return this.findOne(id, tenantId);
  }

  /**
   * Create a version history entry
   */
  private async createVersion(
    contractId: string,
    version: number,
    changes: Record<string, { from: unknown; to: unknown }>,
    snapshot: Record<string, unknown>,
  ): Promise<ContractVersion> {
    return this.prisma.contractVersion.create({
      data: {
        contractId,
        version,
        changes: changes as Prisma.InputJsonValue,
        snapshot: snapshot as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Create a snapshot of the contract for version history
   */
  private createSnapshot(contract: Contract): Record<string, unknown> {
    return {
      title: contract.title,
      description: contract.description,
      effectiveDate: contract.effectiveDate?.toISOString() ?? null,
      expirationDate: contract.expirationDate?.toISOString() ?? null,
      totalValue: contract.totalValue?.toString() ?? null,
      currency: contract.currency,
      terms: contract.terms,
      metadata: contract.metadata,
      organizationId: contract.organizationId,
      status: contract.status,
    };
  }

  /**
   * Detect changes between current contract and update DTO
   */
  private detectChanges(
    current: Contract,
    dto: UpdateContractDto,
  ): Record<string, { from: unknown; to: unknown }> {
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (dto.title !== undefined && dto.title !== current.title) {
      changes.title = { from: current.title, to: dto.title };
    }

    if (dto.description !== undefined && dto.description !== current.description) {
      changes.description = { from: current.description, to: dto.description };
    }

    if (dto.effectiveDate !== undefined) {
      const currentDate = current.effectiveDate?.toISOString().split('T')[0] ?? null;
      if (dto.effectiveDate !== currentDate) {
        changes.effectiveDate = { from: currentDate, to: dto.effectiveDate };
      }
    }

    if (dto.expirationDate !== undefined) {
      const currentDate = current.expirationDate?.toISOString().split('T')[0] ?? null;
      if (dto.expirationDate !== currentDate) {
        changes.expirationDate = { from: currentDate, to: dto.expirationDate };
      }
    }

    if (dto.totalValue !== undefined) {
      const currentValue = current.totalValue?.toNumber() ?? null;
      if (dto.totalValue !== currentValue) {
        changes.totalValue = { from: currentValue, to: dto.totalValue };
      }
    }

    if (dto.currency !== undefined && dto.currency !== current.currency) {
      changes.currency = { from: current.currency, to: dto.currency };
    }

    if (dto.organizationId !== undefined && dto.organizationId !== current.organizationId) {
      changes.organizationId = { from: current.organizationId, to: dto.organizationId };
    }

    if (dto.terms !== undefined) {
      const currentTerms = JSON.stringify(current.terms);
      const newTerms = JSON.stringify(dto.terms);
      if (currentTerms !== newTerms) {
        changes.terms = { from: current.terms, to: dto.terms };
      }
    }

    if (dto.metadata !== undefined) {
      const currentMetadata = JSON.stringify(current.metadata);
      const newMetadata = JSON.stringify(dto.metadata);
      if (currentMetadata !== newMetadata) {
        changes.metadata = { from: current.metadata, to: dto.metadata };
      }
    }

    return changes;
  }
}
