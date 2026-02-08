import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { Prisma, AuditLog } from '@prisma/client';

export interface AuditLogData {
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  tenantId: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(tenantId: string, userId: string, data: AuditLogData): Promise<AuditLog> {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        changes: (data.changes || {}) as Prisma.InputJsonValue,
        metadata: (data.metadata || {}) as Prisma.InputJsonValue,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    this.logger.debug(
      `Audit log created: ${data.action} on ${data.entityType}:${data.entityId} by user ${userId}`,
    );

    return auditLog;
  }

  async findAll(
    filters: AuditLogFilters,
    pagination: PaginationOptions = {},
  ): Promise<PaginatedResult<AuditLog>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      tenantId: filters.tenantId,
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.entityType && { entityType: filters.entityType }),
      ...(filters.entityId && { entityId: filters.entityId }),
      ...(filters.action && { action: filters.action }),
      ...(filters.startDate || filters.endDate
        ? {
            createdAt: {
              ...(filters.startDate && { gte: filters.startDate }),
              ...(filters.endDate && { lte: filters.endDate }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByEntity(tenantId: string, entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}
