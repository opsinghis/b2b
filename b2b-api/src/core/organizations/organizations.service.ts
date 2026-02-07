import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { Organization, Prisma } from '@prisma/client';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationListQueryDto,
  OrganizationHierarchyNode,
} from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateOrganizationDto): Promise<Organization> {
    // Check if code already exists within tenant
    const existingOrg = await this.prisma.organization.findFirst({
      where: {
        tenantId,
        code: dto.code,
        deletedAt: null,
      },
    });

    if (existingOrg) {
      throw new ConflictException(`Organization with code '${dto.code}' already exists in this tenant`);
    }

    // Verify parent exists if provided
    if (dto.parentId) {
      const parent = await this.prisma.organization.findFirst({
        where: {
          id: dto.parentId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!parent) {
        throw new NotFoundException(`Parent organization with ID '${dto.parentId}' not found`);
      }
    }

    const organization = await this.prisma.organization.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        parentId: dto.parentId,
        tenantId,
      },
    });

    this.logger.log(`Organization created: ${organization.name} (${organization.code}) in tenant ${tenantId}`);

    return organization;
  }

  async findAll(
    tenantId: string,
    query: OrganizationListQueryDto,
  ): Promise<PaginatedResult<Organization>> {
    const { search, isActive, parentId, includeDeleted, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationWhereInput = {
      tenantId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(isActive !== undefined && { isActive }),
      ...(parentId !== undefined && { parentId }),
      ...(!includeDeleted && { deletedAt: null }),
    };

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: {
          parent: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: { children: true, users: true },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(tenantId: string, id: string): Promise<Organization> {
    const organization = await this.prisma.organization.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { children: true, users: true },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID '${id}' not found`);
    }

    return organization;
  }

  async findByCode(tenantId: string, code: string): Promise<Organization> {
    const organization = await this.prisma.organization.findFirst({
      where: {
        code,
        tenantId,
        deletedAt: null,
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with code '${code}' not found`);
    }

    return organization;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    // Verify organization exists
    await this.findOne(tenantId, id);

    // Check for code conflict if updating code
    if (dto.code) {
      const existingOrg = await this.prisma.organization.findFirst({
        where: {
          tenantId,
          code: dto.code,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (existingOrg) {
        throw new ConflictException(`Organization with code '${dto.code}' already exists in this tenant`);
      }
    }

    // Verify new parent exists if provided, and prevent circular references
    if (dto.parentId !== undefined && dto.parentId !== null) {
      // Cannot set self as parent
      if (dto.parentId === id) {
        throw new BadRequestException('An organization cannot be its own parent');
      }

      const parent = await this.prisma.organization.findFirst({
        where: {
          id: dto.parentId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!parent) {
        throw new NotFoundException(`Parent organization with ID '${dto.parentId}' not found`);
      }

      // Check for circular reference - ensure the new parent is not a descendant
      const isDescendant = await this.isDescendantOf(tenantId, dto.parentId, id);
      if (isDescendant) {
        throw new BadRequestException('Cannot set a descendant as the parent (circular reference)');
      }
    }

    const organization = await this.prisma.organization.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log(`Organization updated: ${organization.name} (${organization.id})`);

    return organization;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    // Verify organization exists
    const organization = await this.findOne(tenantId, id);

    // Check if organization has children
    const childCount = await this.prisma.organization.count({
      where: {
        parentId: id,
        deletedAt: null,
      },
    });

    if (childCount > 0) {
      throw new BadRequestException(
        'Cannot delete organization with child organizations. Delete children first or reassign them.',
      );
    }

    // Soft delete
    await this.prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Organization soft-deleted: ${organization.name} (${organization.id})`);
  }

  async restore(tenantId: string, id: string): Promise<Organization> {
    const organization = await this.prisma.organization.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID '${id}' not found`);
    }

    if (!organization.deletedAt) {
      throw new ConflictException(`Organization with ID '${id}' is not deleted`);
    }

    const restoredOrg = await this.prisma.organization.update({
      where: { id },
      data: { deletedAt: null },
    });

    this.logger.log(`Organization restored: ${restoredOrg.name} (${restoredOrg.id})`);

    return restoredOrg;
  }

  async getHierarchy(tenantId: string, rootId?: string): Promise<OrganizationHierarchyNode[]> {
    // Get all organizations for the tenant
    const organizations = await this.prisma.organization.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });

    // Build the hierarchy tree
    const orgMap = new Map<string, OrganizationHierarchyNode>();
    const roots: OrganizationHierarchyNode[] = [];

    // First pass: create nodes
    for (const org of organizations) {
      orgMap.set(org.id, {
        id: org.id,
        name: org.name,
        code: org.code,
        description: org.description,
        isActive: org.isActive,
        children: [],
      });
    }

    // Second pass: build tree
    for (const org of organizations) {
      const node = orgMap.get(org.id)!;

      if (org.parentId) {
        const parent = orgMap.get(org.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    // If rootId is provided, return only that subtree
    if (rootId) {
      const rootNode = orgMap.get(rootId);
      if (!rootNode) {
        throw new NotFoundException(`Organization with ID '${rootId}' not found`);
      }
      return [rootNode];
    }

    return roots;
  }

  private async isDescendantOf(
    tenantId: string,
    potentialDescendantId: string,
    ancestorId: string,
  ): Promise<boolean> {
    let currentId: string | null = potentialDescendantId;

    while (currentId) {
      if (currentId === ancestorId) {
        return true;
      }

      const orgResult: { parentId: string | null } | null =
        await this.prisma.organization.findFirst({
          where: {
            id: currentId,
            tenantId,
            deletedAt: null,
          },
          select: { parentId: true },
        });

      currentId = orgResult?.parentId ?? null;
    }

    return false;
  }
}
