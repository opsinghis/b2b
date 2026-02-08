import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { Tenant, Prisma } from '@prisma/client';
import { CreateTenantDto, UpdateTenantDto, TenantListQueryDto } from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    // Check if slug already exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existingTenant) {
      throw new ConflictException(`Tenant with slug '${dto.slug}' already exists`);
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        config: (dto.config || {}) as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Tenant created: ${tenant.name} (${tenant.slug})`);

    return tenant;
  }

  async findAll(query: TenantListQueryDto): Promise<PaginatedResult<Tenant>> {
    const { search, isActive, includeDeleted, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TenantWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(isActive !== undefined && { isActive }),
      ...(!includeDeleted && { deletedAt: null }),
    };

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }

    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug '${slug}' not found`);
    }

    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    // Verify tenant exists
    await this.findOne(id);

    // Check for slug conflict if updating slug
    if (dto.slug) {
      const existingTenant = await this.prisma.tenant.findFirst({
        where: {
          slug: dto.slug,
          id: { not: id },
        },
      });

      if (existingTenant) {
        throw new ConflictException(`Tenant with slug '${dto.slug}' already exists`);
      }
    }

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.config !== undefined && { config: dto.config as Prisma.InputJsonValue }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log(`Tenant updated: ${tenant.name} (${tenant.id})`);

    return tenant;
  }

  async remove(id: string): Promise<void> {
    // Verify tenant exists
    const tenant = await this.findOne(id);

    // Soft delete
    await this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Tenant soft-deleted: ${tenant.name} (${tenant.id})`);
  }

  async restore(id: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }

    if (!tenant.deletedAt) {
      throw new ConflictException(`Tenant with ID '${id}' is not deleted`);
    }

    const restoredTenant = await this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: null },
    });

    this.logger.log(`Tenant restored: ${restoredTenant.name} (${restoredTenant.id})`);

    return restoredTenant;
  }
}
