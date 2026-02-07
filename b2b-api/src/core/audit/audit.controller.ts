import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService, AuditLogFilters, PaginationOptions } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../authorization/authorization.guard';
import { CheckAbility } from '../authorization/check-ability.decorator';
import { CurrentTenantId } from '../tenants';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @CheckAbility({ action: 'read', subject: 'AuditLog' })
  @ApiOperation({ summary: 'Get audit logs with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'entityId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved' })
  async findAll(
    @CurrentTenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: AuditLogFilters = {
      tenantId,
      userId,
      entityType,
      entityId,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const pagination: PaginationOptions = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    };

    return this.auditService.findAll(filters, pagination);
  }

  @Get('entity/:entityType/:entityId')
  @CheckAbility({ action: 'read', subject: 'AuditLog' })
  @ApiOperation({ summary: 'Get audit logs for a specific entity' })
  @ApiResponse({ status: 200, description: 'Entity audit logs retrieved' })
  async findByEntity(
    @CurrentTenantId() tenantId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.auditService.findByEntity(tenantId, entityType, entityId);
  }
}
