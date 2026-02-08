import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiSecurity,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard, CurrentUser } from '@core/auth';
import { AuthorizationGuard } from '@core/authorization';
import { TenantContext } from '@core/tenants';
import {
  IntegrationMetricsService,
  ConnectorHealthService,
  AlertConfigService,
  AuditLogService,
  LogRetentionService,
} from './services';
import {
  DashboardKPIsQueryDto,
  DashboardKPIsResponseDto,
  MetricsQueryDto,
  ThroughputMetricsResponseDto,
  LatencyMetricsResponseDto,
  ErrorMetricsResponseDto,
  ConnectorHealthQueryDto,
  ConnectorHealthResponseDto,
  CreateAlertThresholdDto,
  UpdateAlertThresholdDto,
  AlertsQueryDto,
  AlertResponseDto,
  AcknowledgeAlertDto,
  ResolveAlertDto,
  SilenceAlertDto,
  AuditLogQueryDto,
  AuditLogResponseDto,
  UpdateRetentionPolicyDto,
  RetentionPolicyResponseDto,
  TimeSeriesQueryDto,
  TimeSeriesResponseDto,
} from './dto';
import { TimeWindow } from './interfaces';

interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
}

/**
 * Controller for integration monitoring and logging
 */
@ApiTags('Integration Monitoring')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('api/v1/integrations/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class IntegrationMonitoringController {
  constructor(
    private readonly metricsService: IntegrationMetricsService,
    private readonly healthService: ConnectorHealthService,
    private readonly alertService: AlertConfigService,
    private readonly auditService: AuditLogService,
    private readonly retentionService: LogRetentionService,
  ) {}

  // =====================
  // Dashboard KPIs
  // =====================

  @Get('dashboard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get dashboard KPIs' })
  @ApiResponse({ status: 200, type: DashboardKPIsResponseDto })
  getDashboardKPIs(
    @TenantContext() tenantId: string,
    @Query() query: DashboardKPIsQueryDto,
  ): DashboardKPIsResponseDto {
    const period = (query.period as TimeWindow) || '24h';
    const kpis = this.metricsService.getDashboardKPIs(tenantId, period, query.connectorId);

    // Add connector health and alert data
    const healthSummary = this.healthService.getHealthSummary(tenantId);
    const alertSummary = this.alertService.getAlertSummary(tenantId);

    return {
      ...kpis,
      connectorHealth: healthSummary,
      alerts: alertSummary,
    };
  }

  // =====================
  // Throughput Metrics
  // =====================

  @Get('metrics/throughput')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get message throughput metrics' })
  @ApiResponse({ status: 200, type: ThroughputMetricsResponseDto })
  getThroughputMetrics(
    @TenantContext() tenantId: string,
    @Query() query: MetricsQueryDto,
  ): ThroughputMetricsResponseDto {
    const period = query.period as TimeWindow;
    return this.metricsService.getThroughputMetrics(tenantId, period, query.connectorId);
  }

  // =====================
  // Latency Metrics
  // =====================

  @Get('metrics/latency')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get latency percentiles' })
  @ApiResponse({ status: 200, type: LatencyMetricsResponseDto })
  getLatencyMetrics(
    @TenantContext() tenantId: string,
    @Query() query: MetricsQueryDto,
  ): LatencyMetricsResponseDto {
    const period = query.period as TimeWindow;
    return this.metricsService.getLatencyMetrics(tenantId, period, query.connectorId);
  }

  // =====================
  // Error Metrics
  // =====================

  @Get('metrics/errors')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get error rate metrics' })
  @ApiResponse({ status: 200, type: ErrorMetricsResponseDto })
  getErrorMetrics(
    @TenantContext() tenantId: string,
    @Query() query: MetricsQueryDto,
  ): ErrorMetricsResponseDto {
    const period = query.period as TimeWindow;
    return this.metricsService.getErrorMetrics(tenantId, period, query.connectorId);
  }

  // =====================
  // Time Series
  // =====================

  @Get('metrics/timeseries')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get time series data for a metric' })
  @ApiResponse({ status: 200, type: TimeSeriesResponseDto })
  getTimeSeries(
    @TenantContext() tenantId: string,
    @Query() query: TimeSeriesQueryDto,
  ): TimeSeriesResponseDto {
    const period = query.period as TimeWindow;
    return this.metricsService.getTimeSeries(
      tenantId,
      query.metric,
      period,
      query.connectorId,
      query.aggregation as 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile',
      query.intervalSeconds,
    );
  }

  // =====================
  // Connector Health
  // =====================

  @Get('health')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get health status for all connectors' })
  @ApiResponse({ status: 200, type: [ConnectorHealthResponseDto] })
  getAllConnectorHealth(
    @TenantContext() tenantId: string,
    @Query() query: ConnectorHealthQueryDto,
  ): ConnectorHealthResponseDto[] {
    return this.healthService.getAllConnectorHealth(tenantId, query.status);
  }

  @Get('health/:connectorId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get health status for a specific connector' })
  @ApiParam({ name: 'connectorId', description: 'Connector ID' })
  @ApiResponse({ status: 200, type: ConnectorHealthResponseDto })
  getConnectorHealth(
    @TenantContext() tenantId: string,
    @Param('connectorId') connectorId: string,
  ): ConnectorHealthResponseDto | null {
    return this.healthService.getConnectorHealth(tenantId, connectorId);
  }

  // =====================
  // Alert Thresholds
  // =====================

  @Get('alerts/thresholds')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List alert thresholds' })
  @ApiResponse({ status: 200 })
  listThresholds(@TenantContext() tenantId: string) {
    return this.alertService.listThresholds(tenantId);
  }

  @Post('alerts/thresholds')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create alert threshold' })
  @ApiResponse({ status: 201 })
  createThreshold(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAlertThresholdDto,
  ) {
    return this.alertService.createThreshold(tenantId, user.id, {
      name: dto.name,
      description: dto.description,
      metric: dto.metric,
      operator: dto.operator,
      value: dto.value,
      duration: dto.duration,
      connectorId: dto.connectorId,
      eventType: dto.eventType,
      severity: dto.severity,
      cooldownMinutes: dto.cooldownMinutes,
      notificationChannels: dto.notificationChannels,
    });
  }

  @Put('alerts/thresholds/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update alert threshold' })
  @ApiParam({ name: 'id', description: 'Threshold ID' })
  @ApiResponse({ status: 200 })
  updateThreshold(
    @TenantContext() tenantId: string,
    @Param('id') thresholdId: string,
    @Body() dto: UpdateAlertThresholdDto,
  ) {
    return this.alertService.updateThreshold(tenantId, thresholdId, dto);
  }

  @Delete('alerts/thresholds/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete alert threshold' })
  @ApiParam({ name: 'id', description: 'Threshold ID' })
  @ApiResponse({ status: 204 })
  deleteThreshold(@TenantContext() tenantId: string, @Param('id') thresholdId: string): void {
    this.alertService.deleteThreshold(tenantId, thresholdId);
  }

  // =====================
  // Alerts
  // =====================

  @Get('alerts')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List alerts' })
  @ApiResponse({ status: 200, type: [AlertResponseDto] })
  listAlerts(
    @TenantContext() tenantId: string,
    @Query() query: AlertsQueryDto,
  ): { alerts: AlertResponseDto[]; total: number } {
    return this.alertService.listAlerts(tenantId, {
      status: query.status,
      severity: query.severity,
      connectorId: query.connectorId,
      thresholdId: query.thresholdId,
      startTime: query.startTime ? new Date(query.startTime) : undefined,
      endTime: query.endTime ? new Date(query.endTime) : undefined,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get('alerts/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get alert details' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, type: AlertResponseDto })
  getAlert(
    @TenantContext() tenantId: string,
    @Param('id') alertId: string,
  ): AlertResponseDto | null {
    return this.alertService.getAlert(tenantId, alertId);
  }

  @Post('alerts/:id/acknowledge')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, type: AlertResponseDto })
  acknowledgeAlert(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') alertId: string,
    @Body() _dto: AcknowledgeAlertDto,
  ): AlertResponseDto {
    return this.alertService.acknowledgeAlert(tenantId, alertId, user.id);
  }

  @Post('alerts/:id/resolve')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, type: AlertResponseDto })
  resolveAlert(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') alertId: string,
    @Body() _dto: ResolveAlertDto,
  ): AlertResponseDto {
    return this.alertService.resolveAlert(tenantId, alertId, user.id);
  }

  @Post('alerts/:id/silence')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Silence an alert temporarily' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, type: AlertResponseDto })
  silenceAlert(
    @TenantContext() tenantId: string,
    @Param('id') alertId: string,
    @Body() dto: SilenceAlertDto,
  ): AlertResponseDto {
    return this.alertService.silenceAlert(tenantId, alertId, dto.durationMinutes);
  }

  // =====================
  // Audit Logs
  // =====================

  @Get('audit-logs')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Query audit logs' })
  @ApiResponse({ status: 200, type: [AuditLogResponseDto] })
  queryAuditLogs(
    @TenantContext() tenantId: string,
    @Query() query: AuditLogQueryDto,
  ): { entries: AuditLogResponseDto[]; total: number } {
    return this.auditService.query(tenantId, {
      action: query.action,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      actorId: query.actorId,
      success: query.success,
      startTime: query.startTime ? new Date(query.startTime) : undefined,
      endTime: query.endTime ? new Date(query.endTime) : undefined,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get('audit-logs/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get audit log entry' })
  @ApiParam({ name: 'id', description: 'Audit log entry ID' })
  @ApiResponse({ status: 200, type: AuditLogResponseDto })
  getAuditLogEntry(
    @TenantContext() tenantId: string,
    @Param('id') entryId: string,
  ): AuditLogResponseDto | null {
    return this.auditService.getEntry(tenantId, entryId);
  }

  @Get('audit-logs/resource/:type/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get audit history for a resource' })
  @ApiParam({ name: 'type', description: 'Resource type' })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  @ApiResponse({ status: 200, type: [AuditLogResponseDto] })
  getResourceHistory(
    @TenantContext() tenantId: string,
    @Param('type') resourceType: string,
    @Param('id') resourceId: string,
    @Query('limit') limit?: number,
  ): AuditLogResponseDto[] {
    return this.auditService.getResourceHistory(tenantId, resourceType, resourceId, limit);
  }

  // =====================
  // Retention Policy
  // =====================

  @Get('retention')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get retention policy' })
  @ApiResponse({ status: 200, type: RetentionPolicyResponseDto })
  getRetentionPolicy(@TenantContext() tenantId: string): RetentionPolicyResponseDto {
    return this.retentionService.getPolicy(tenantId);
  }

  @Put('retention')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update retention policy' })
  @ApiResponse({ status: 200, type: RetentionPolicyResponseDto })
  updateRetentionPolicy(
    @TenantContext() tenantId: string,
    @Body() dto: UpdateRetentionPolicyDto,
  ): RetentionPolicyResponseDto {
    return this.retentionService.setPolicy(tenantId, dto);
  }

  @Post('retention/cleanup')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Run retention cleanup manually' })
  @ApiResponse({ status: 200 })
  async runCleanup(@TenantContext() tenantId: string): Promise<{
    metricsDeleted: number;
    healthHistoryDeleted: number;
    alertsDeleted: number;
    auditLogsDeleted: number;
  }> {
    return this.retentionService.runCleanup(tenantId);
  }

  @Get('retention/stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get retention statistics' })
  @ApiResponse({ status: 200 })
  getRetentionStats(@TenantContext() tenantId: string) {
    return this.retentionService.getRetentionStats(tenantId);
  }
}

/**
 * Admin controller for cross-tenant monitoring
 */
@ApiTags('Admin - Integration Monitoring')
@ApiBearerAuth()
@Controller('api/v1/admin/integrations/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
@Roles(UserRole.ADMIN)
export class AdminIntegrationMonitoringController {
  constructor(private readonly retentionService: LogRetentionService) {}

  @Post('retention/cleanup-all')
  @ApiOperation({ summary: 'Run retention cleanup for all tenants' })
  @ApiResponse({ status: 200 })
  async runGlobalCleanup(): Promise<{ message: string }> {
    await this.retentionService.scheduledCleanup();
    return { message: 'Global cleanup completed' };
  }
}
