import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import {
  ApprovalEntity,
  ApprovalRequestStatus,
  ApprovalStatus,
  ApproverType,
  Prisma,
  UserRole,
} from '@prisma/client';
import {
  CreateApprovalChainDto,
  UpdateApprovalChainDto,
  ApprovalChainQueryDto,
  SubmitApprovalDto,
  ApprovalChainResponseDto,
  ApprovalChainListResponseDto,
  ApprovalRequestResponseDto,
  PendingApprovalResponseDto,
} from './dto';

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Approval Chain Management
  // ==========================================

  async createChain(
    dto: CreateApprovalChainDto,
    tenantId: string,
  ): Promise<ApprovalChainResponseDto> {
    // Validate levels are sequential
    const sortedLevels = [...dto.levels].sort((a, b) => a.level - b.level);
    for (let i = 0; i < sortedLevels.length; i++) {
      if (sortedLevels[i].level !== i + 1) {
        throw new BadRequestException('Levels must be sequential starting from 1');
      }
    }

    // If setting as default, unset any existing default for this entity type
    if (dto.isDefault) {
      await this.prisma.approvalChain.updateMany({
        where: {
          tenantId,
          entityType: dto.entityType,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const chain = await this.prisma.approvalChain.create({
      data: {
        name: dto.name,
        description: dto.description,
        entityType: dto.entityType,
        isDefault: dto.isDefault ?? false,
        conditions: (dto.conditions ?? {}) as Prisma.InputJsonValue,
        tenantId,
        levels: {
          create: dto.levels.map((level) => ({
            level: level.level,
            name: level.name,
            approverType: level.approverType,
            approverUserId: level.approverUserId,
            approverRoleId: level.approverRoleId,
            minApprovers: level.minApprovers ?? 1,
            allowDelegation: level.allowDelegation ?? false,
            thresholdMin: level.thresholdMin
              ? new Prisma.Decimal(level.thresholdMin)
              : null,
            thresholdMax: level.thresholdMax
              ? new Prisma.Decimal(level.thresholdMax)
              : null,
            timeoutHours: level.timeoutHours,
            escalationLevel: level.escalationLevel,
          })),
        },
      },
      include: { levels: { orderBy: { level: 'asc' } } },
    });

    return this.mapChainToResponse(chain);
  }

  async findAllChains(
    query: ApprovalChainQueryDto,
    tenantId: string,
  ): Promise<ApprovalChainListResponseDto> {
    const { entityType, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ApprovalChainWhereInput = {
      tenantId,
      ...(entityType && { entityType }),
      ...(isActive !== undefined && { isActive }),
    };

    const [chains, total] = await Promise.all([
      this.prisma.approvalChain.findMany({
        where,
        include: { levels: { orderBy: { level: 'asc' } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.approvalChain.count({ where }),
    ]);

    return {
      data: chains.map((chain) => this.mapChainToResponse(chain)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findChainById(id: string, tenantId: string): Promise<ApprovalChainResponseDto> {
    const chain = await this.prisma.approvalChain.findFirst({
      where: { id, tenantId },
      include: { levels: { orderBy: { level: 'asc' } } },
    });

    if (!chain) {
      throw new NotFoundException(`Approval chain with ID '${id}' not found`);
    }

    return this.mapChainToResponse(chain);
  }

  async updateChain(
    id: string,
    dto: UpdateApprovalChainDto,
    tenantId: string,
  ): Promise<ApprovalChainResponseDto> {
    const existingChain = await this.prisma.approvalChain.findFirst({
      where: { id, tenantId },
      include: { levels: true },
    });

    if (!existingChain) {
      throw new NotFoundException(`Approval chain with ID '${id}' not found`);
    }

    // If setting as default, unset any existing default for this entity type
    if (dto.isDefault && !existingChain.isDefault) {
      await this.prisma.approvalChain.updateMany({
        where: {
          tenantId,
          entityType: existingChain.entityType,
          isDefault: true,
          NOT: { id },
        },
        data: { isDefault: false },
      });
    }

    // Update chain and levels in a transaction
    const chain = await this.prisma.$transaction(async (tx) => {
      // Delete existing levels if new levels are provided
      if (dto.levels) {
        await tx.approvalChainLevel.deleteMany({
          where: { chainId: id },
        });
      }

      return tx.approvalChain.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
          ...(dto.conditions !== undefined && { conditions: dto.conditions as Prisma.InputJsonValue }),
          ...(dto.levels && {
            levels: {
              create: dto.levels.map((level) => ({
                level: level.level,
                name: level.name,
                approverType: level.approverType,
                approverUserId: level.approverUserId,
                approverRoleId: level.approverRoleId,
                minApprovers: level.minApprovers ?? 1,
                allowDelegation: level.allowDelegation ?? false,
                thresholdMin: level.thresholdMin
                  ? new Prisma.Decimal(level.thresholdMin)
                  : null,
                thresholdMax: level.thresholdMax
                  ? new Prisma.Decimal(level.thresholdMax)
                  : null,
                timeoutHours: level.timeoutHours,
                escalationLevel: level.escalationLevel,
              })),
            },
          }),
        },
        include: { levels: { orderBy: { level: 'asc' } } },
      });
    });

    return this.mapChainToResponse(chain);
  }

  async deleteChain(id: string, tenantId: string): Promise<void> {
    const chain = await this.prisma.approvalChain.findFirst({
      where: { id, tenantId },
    });

    if (!chain) {
      throw new NotFoundException(`Approval chain with ID '${id}' not found`);
    }

    // Check if chain is in use
    const activeRequests = await this.prisma.approvalRequest.count({
      where: {
        chainId: id,
        status: { in: [ApprovalRequestStatus.PENDING, ApprovalRequestStatus.IN_PROGRESS] },
      },
    });

    if (activeRequests > 0) {
      throw new BadRequestException(
        'Cannot delete chain with active approval requests',
      );
    }

    await this.prisma.approvalChain.delete({ where: { id } });
  }

  async setDefaultChain(
    id: string,
    tenantId: string,
  ): Promise<ApprovalChainResponseDto> {
    const chain = await this.prisma.approvalChain.findFirst({
      where: { id, tenantId },
    });

    if (!chain) {
      throw new NotFoundException(`Approval chain with ID '${id}' not found`);
    }

    // Unset existing default
    await this.prisma.approvalChain.updateMany({
      where: {
        tenantId,
        entityType: chain.entityType,
        isDefault: true,
        NOT: { id },
      },
      data: { isDefault: false },
    });

    // Set new default
    const updated = await this.prisma.approvalChain.update({
      where: { id },
      data: { isDefault: true },
      include: { levels: { orderBy: { level: 'asc' } } },
    });

    return this.mapChainToResponse(updated);
  }

  // ==========================================
  // Approval Request Management
  // ==========================================

  async submitForApproval(
    dto: SubmitApprovalDto,
    tenantId: string,
    requesterId: string,
  ): Promise<ApprovalRequestResponseDto> {
    // Find the appropriate chain
    let chain;
    if (dto.chainId) {
      chain = await this.prisma.approvalChain.findFirst({
        where: { id: dto.chainId, tenantId, isActive: true },
        include: { levels: { orderBy: { level: 'asc' } } },
      });
      if (!chain) {
        throw new NotFoundException(`Approval chain with ID '${dto.chainId}' not found`);
      }
    } else {
      // Find default chain for entity type
      chain = await this.prisma.approvalChain.findFirst({
        where: { tenantId, entityType: dto.entityType, isActive: true, isDefault: true },
        include: { levels: { orderBy: { level: 'asc' } } },
      });
      if (!chain) {
        throw new BadRequestException(
          `No default approval chain found for ${dto.entityType}`,
        );
      }
    }

    if (chain.levels.length === 0) {
      throw new BadRequestException('Approval chain has no levels defined');
    }

    // Check for existing pending request
    const existingRequest = await this.prisma.approvalRequest.findFirst({
      where: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        tenantId,
        status: { in: [ApprovalRequestStatus.PENDING, ApprovalRequestStatus.IN_PROGRESS] },
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'An approval request is already pending for this entity',
      );
    }

    // Get approvers for first level
    const firstLevel = chain.levels[0];
    const approvers = await this.getApproversForLevel(firstLevel, tenantId);

    if (approvers.length === 0) {
      throw new BadRequestException('No approvers found for the first level');
    }

    // Create approval request with first level steps
    const request = await this.prisma.approvalRequest.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        status: ApprovalRequestStatus.IN_PROGRESS,
        currentLevel: 1,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        chainId: chain.id,
        tenantId,
        requesterId,
        steps: {
          create: approvers.map((approverId) => ({
            level: 1,
            action: 'SUBMIT',
            status: ApprovalStatus.PENDING,
            approverId,
          })),
        },
      },
      include: { steps: true },
    });

    return this.mapRequestToResponse(request);
  }

  async approve(
    requestId: string,
    stepId: string,
    tenantId: string,
    approverId: string,
    comments?: string,
  ): Promise<ApprovalRequestResponseDto> {
    const step = await this.prisma.approvalStep.findFirst({
      where: { id: stepId, requestId, approverId },
      include: { request: { include: { steps: true } } },
    });

    if (!step) {
      throw new NotFoundException('Approval step not found');
    }

    if (step.request.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    if (step.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('This step has already been processed');
    }

    // Update the step
    await this.prisma.approvalStep.update({
      where: { id: stepId },
      data: {
        status: ApprovalStatus.APPROVED,
        action: 'APPROVE',
        comments,
        respondedAt: new Date(),
      },
    });

    // Check if level is complete (all required approvals received)
    const chain = await this.prisma.approvalChain.findUnique({
      where: { id: step.request.chainId },
      include: { levels: { orderBy: { level: 'asc' } } },
    });

    if (!chain) {
      throw new NotFoundException('Approval chain not found');
    }

    const currentLevelConfig = chain.levels.find((l) => l.level === step.level);
    const levelSteps = step.request.steps.filter((s) => s.level === step.level);
    const approvedSteps = levelSteps.filter(
      (s) => s.status === ApprovalStatus.APPROVED || s.id === stepId,
    );

    const minApprovers = currentLevelConfig?.minApprovers ?? 1;

    if (approvedSteps.length >= minApprovers) {
      // Level complete - check if there are more levels
      const nextLevel = chain.levels.find((l) => l.level === step.level + 1);

      if (nextLevel) {
        // Create steps for next level
        const nextApprovers = await this.getApproversForLevel(nextLevel, tenantId);

        await this.prisma.$transaction([
          // Cancel remaining pending steps at current level
          this.prisma.approvalStep.updateMany({
            where: {
              requestId,
              level: step.level,
              status: ApprovalStatus.PENDING,
            },
            data: { status: ApprovalStatus.CANCELLED },
          }),
          // Create next level steps
          this.prisma.approvalStep.createMany({
            data: nextApprovers.map((approverId) => ({
              requestId,
              level: nextLevel.level,
              action: 'SUBMIT',
              status: ApprovalStatus.PENDING,
              approverId,
            })),
          }),
          // Update request current level
          this.prisma.approvalRequest.update({
            where: { id: requestId },
            data: { currentLevel: nextLevel.level },
          }),
        ]);
      } else {
        // All levels complete - approve the request
        await this.prisma.$transaction([
          // Cancel remaining pending steps
          this.prisma.approvalStep.updateMany({
            where: { requestId, status: ApprovalStatus.PENDING },
            data: { status: ApprovalStatus.CANCELLED },
          }),
          // Complete the request
          this.prisma.approvalRequest.update({
            where: { id: requestId },
            data: {
              status: ApprovalRequestStatus.APPROVED,
              completedAt: new Date(),
            },
          }),
        ]);
      }
    }

    // Return updated request
    const updatedRequest = await this.prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: { steps: { orderBy: { level: 'asc' } } },
    });

    return this.mapRequestToResponse(updatedRequest!);
  }

  async reject(
    requestId: string,
    stepId: string,
    tenantId: string,
    approverId: string,
    comments?: string,
  ): Promise<ApprovalRequestResponseDto> {
    const step = await this.prisma.approvalStep.findFirst({
      where: { id: stepId, requestId, approverId },
      include: { request: true },
    });

    if (!step) {
      throw new NotFoundException('Approval step not found');
    }

    if (step.request.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    if (step.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('This step has already been processed');
    }

    // Reject the entire request
    await this.prisma.$transaction([
      this.prisma.approvalStep.update({
        where: { id: stepId },
        data: {
          status: ApprovalStatus.REJECTED,
          action: 'REJECT',
          comments,
          respondedAt: new Date(),
        },
      }),
      this.prisma.approvalStep.updateMany({
        where: { requestId, status: ApprovalStatus.PENDING, NOT: { id: stepId } },
        data: { status: ApprovalStatus.CANCELLED },
      }),
      this.prisma.approvalRequest.update({
        where: { id: requestId },
        data: {
          status: ApprovalRequestStatus.REJECTED,
          completedAt: new Date(),
        },
      }),
    ]);

    const updatedRequest = await this.prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: { steps: { orderBy: { level: 'asc' } } },
    });

    return this.mapRequestToResponse(updatedRequest!);
  }

  async delegate(
    requestId: string,
    stepId: string,
    tenantId: string,
    approverId: string,
    delegateToUserId: string,
    reason?: string,
  ): Promise<ApprovalRequestResponseDto> {
    const step = await this.prisma.approvalStep.findFirst({
      where: { id: stepId, requestId, approverId },
      include: { request: true },
    });

    if (!step) {
      throw new NotFoundException('Approval step not found');
    }

    if (step.request.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    if (step.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('This step has already been processed');
    }

    // Get chain level to check if delegation is allowed
    const chain = await this.prisma.approvalChain.findUnique({
      where: { id: step.request.chainId },
      include: { levels: true },
    });

    const levelConfig = chain?.levels.find((l) => l.level === step.level);
    if (!levelConfig?.allowDelegation) {
      throw new ForbiddenException('Delegation is not allowed at this level');
    }

    // Check delegate user exists in same tenant
    const delegateUser = await this.prisma.user.findFirst({
      where: { id: delegateToUserId, tenantId, isActive: true },
    });

    if (!delegateUser) {
      throw new NotFoundException('Delegate user not found');
    }

    // Create new step for delegate, mark original as cancelled
    await this.prisma.$transaction([
      this.prisma.approvalStep.update({
        where: { id: stepId },
        data: {
          status: ApprovalStatus.CANCELLED,
          comments: reason ? `Delegated: ${reason}` : 'Delegated',
          respondedAt: new Date(),
        },
      }),
      this.prisma.approvalStep.create({
        data: {
          requestId,
          level: step.level,
          action: 'SUBMIT',
          status: ApprovalStatus.PENDING,
          approverId: delegateToUserId,
          delegatedFrom: approverId,
        },
      }),
    ]);

    const updatedRequest = await this.prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: { steps: { orderBy: { level: 'asc' } } },
    });

    return this.mapRequestToResponse(updatedRequest!);
  }

  async getPendingApprovals(
    tenantId: string,
    userId: string,
  ): Promise<PendingApprovalResponseDto[]> {
    const steps = await this.prisma.approvalStep.findMany({
      where: {
        approverId: userId,
        status: ApprovalStatus.PENDING,
        request: { tenantId },
      },
      include: {
        request: {
          include: {
            steps: true,
          },
        },
      },
      orderBy: { requestedAt: 'asc' },
    });

    const results: PendingApprovalResponseDto[] = [];

    for (const step of steps) {
      const chain = await this.prisma.approvalChain.findUnique({
        where: { id: step.request.chainId },
        include: { levels: true },
      });

      const levelConfig = chain?.levels.find((l) => l.level === step.level);

      results.push({
        id: step.request.id,
        stepId: step.id,
        entityType: step.request.entityType,
        entityId: step.request.entityId,
        level: step.level,
        levelName: levelConfig?.name ?? `Level ${step.level}`,
        allowDelegation: levelConfig?.allowDelegation ?? false,
        delegatedFrom: step.delegatedFrom,
        requestedAt: step.requestedAt,
        expiresAt: step.request.expiresAt,
      });
    }

    return results;
  }

  async getRequestById(
    id: string,
    tenantId: string,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id, tenantId },
      include: { steps: { orderBy: { level: 'asc' } } },
    });

    if (!request) {
      throw new NotFoundException(`Approval request with ID '${id}' not found`);
    }

    return this.mapRequestToResponse(request);
  }

  async getRequestByEntity(
    entityType: ApprovalEntity,
    entityId: string,
    tenantId: string,
  ): Promise<ApprovalRequestResponseDto | null> {
    const request = await this.prisma.approvalRequest.findFirst({
      where: {
        entityType,
        entityId,
        tenantId,
        status: { in: [ApprovalRequestStatus.PENDING, ApprovalRequestStatus.IN_PROGRESS] },
      },
      include: { steps: { orderBy: { level: 'asc' } } },
    });

    return request ? this.mapRequestToResponse(request) : null;
  }

  async cancelRequest(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id, tenantId },
      include: { steps: true },
    });

    if (!request) {
      throw new NotFoundException(`Approval request with ID '${id}' not found`);
    }

    if (request.requesterId !== userId) {
      throw new ForbiddenException('Only the requester can cancel the request');
    }

    const cancellableStatuses: ApprovalRequestStatus[] = [ApprovalRequestStatus.PENDING, ApprovalRequestStatus.IN_PROGRESS];
    if (!cancellableStatuses.includes(request.status)) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    await this.prisma.$transaction([
      this.prisma.approvalStep.updateMany({
        where: { requestId: id, status: ApprovalStatus.PENDING },
        data: { status: ApprovalStatus.CANCELLED },
      }),
      this.prisma.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalRequestStatus.CANCELLED,
          completedAt: new Date(),
        },
      }),
    ]);

    const updatedRequest = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: { steps: { orderBy: { level: 'asc' } } },
    });

    return this.mapRequestToResponse(updatedRequest!);
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private async getApproversForLevel(
    level: {
      approverType: ApproverType;
      approverUserId: string | null;
      approverRoleId: string | null;
    },
    tenantId: string,
  ): Promise<string[]> {
    switch (level.approverType) {
      case ApproverType.USER:
        if (!level.approverUserId) {
          throw new BadRequestException('User ID required for USER approver type');
        }
        return [level.approverUserId];

      case ApproverType.ROLE:
        if (!level.approverRoleId) {
          throw new BadRequestException('Role ID required for ROLE approver type');
        }
        const usersWithRole = await this.prisma.user.findMany({
          where: {
            tenantId,
            role: level.approverRoleId as UserRole,
            isActive: true,
          },
          select: { id: true },
        });
        return usersWithRole.map((u) => u.id);

      case ApproverType.MANAGER:
        // For MANAGER type, we would typically look up the reporting hierarchy
        // For now, return all MANAGERs in the tenant
        const managers = await this.prisma.user.findMany({
          where: {
            tenantId,
            role: { in: [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
            isActive: true,
          },
          select: { id: true },
        });
        return managers.map((u) => u.id);

      case ApproverType.ORGANIZATION_HEAD:
        // For ORGANIZATION_HEAD, we would look up the org hierarchy
        // For now, return all ADMINs in the tenant
        const heads = await this.prisma.user.findMany({
          where: {
            tenantId,
            role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
            isActive: true,
          },
          select: { id: true },
        });
        return heads.map((u) => u.id);

      default:
        return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapChainToResponse(chain: any): ApprovalChainResponseDto {
    return {
      id: chain.id,
      name: chain.name,
      description: chain.description,
      entityType: chain.entityType,
      isActive: chain.isActive,
      isDefault: chain.isDefault,
      conditions: chain.conditions as Record<string, unknown>,
      levels: (chain.levels || []).map((level: any) => ({
        id: level.id,
        level: level.level,
        name: level.name,
        approverType: level.approverType,
        approverUserId: level.approverUserId,
        approverRoleId: level.approverRoleId,
        minApprovers: level.minApprovers,
        allowDelegation: level.allowDelegation,
        thresholdMin: level.thresholdMin?.toString() ?? null,
        thresholdMax: level.thresholdMax?.toString() ?? null,
        timeoutHours: level.timeoutHours,
        escalationLevel: level.escalationLevel,
      })),
      createdAt: chain.createdAt,
      updatedAt: chain.updatedAt,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRequestToResponse(request: any): ApprovalRequestResponseDto {
    return {
      id: request.id,
      entityType: request.entityType,
      entityId: request.entityId,
      status: request.status,
      currentLevel: request.currentLevel,
      metadata: request.metadata as Record<string, unknown>,
      chainId: request.chainId,
      requesterId: request.requesterId,
      steps: (request.steps || []).map((step: any) => ({
        id: step.id,
        level: step.level,
        status: step.status,
        comments: step.comments,
        delegatedFrom: step.delegatedFrom,
        approverId: step.approverId,
        requestedAt: step.requestedAt,
        respondedAt: step.respondedAt,
      })),
      requestedAt: request.requestedAt,
      completedAt: request.completedAt,
      expiresAt: request.expiresAt,
    };
  }
}
