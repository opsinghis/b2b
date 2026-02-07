import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '@infrastructure/database';
import { Tenant } from '@prisma/client';

export interface TenantRequest extends Request {
  tenant?: Tenant;
  tenantId?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    // Extract tenant ID from header or subdomain
    const tenantId =
      (req.headers['x-tenant-id'] as string) || this.extractTenantFromSubdomain(req);

    if (!tenantId) {
      // Some routes don't require tenant context (e.g., health check)
      return next();
    }

    try {
      const tenant = await this.prisma.tenant.findFirst({
        where: {
          OR: [{ id: tenantId }, { slug: tenantId }],
          isActive: true,
          deletedAt: null,
        },
      });

      if (!tenant) {
        throw new UnauthorizedException('Invalid or inactive tenant');
      }

      req.tenant = tenant;
      req.tenantId = tenant.id;

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to resolve tenant');
    }
  }

  private extractTenantFromSubdomain(req: Request): string | null {
    const host = req.headers.host;
    if (!host) return null;

    // Extract subdomain from host (e.g., "tenant-slug.example.com")
    const parts = host.split('.');
    if (parts.length >= 3) {
      return parts[0];
    }

    return null;
  }
}
