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
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, TenantId } from '@core/authorization';
import { UserPayload } from '@core/authorization/interfaces';
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

/**
 * Controller for integration monitoring and logging
 */
@ApiTags('Integration Monitoring')
@ApiBearerAuth()
@Controller('api/v1/integrations/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Get dashboard KPIs' })
  @ApiResponse({ status: 200, type: DashboardKPIsResponseDto })
  getDashboardKPIs(
    @TenantId() tenantId: string,
    @Query() query: DashboardKPIsQueryDto,
  ): DashboardKPIsResponseDto {
    const period = (query.period as TimeWindow) || '24h';
    const kpis = this.metricsService.getDashboardKPIs(
      tenantId,
      period,
      query.connectorId,
    );

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
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Get message throughput metrics' })
  @ApiResponse({ status: 200, type: ThroughputMetricsResponseDto })
  getThroughputMetrics(
    @TenantId() tenantId: string,
    @Query() query: MetricsQueryDto,
  ): ThroughputMetricsResponseDto {
    const period = query.period as TimeWindow;
    return this.metricsService.getThroughputMetrics(
      tenantId,
      period,
      query.connectorId,
    );
  }

  // =====================
  // Latency Metrics
  // =====================

  @Get('metrics/latency')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Get latency percentiles' })
  @ApiResponse({ status: 200, type: LatencyMetricsResponseDto })
  getLatencyMetrics(
    @TenantId() tenantId: string,
    @Query() query: MetricsQueryDto,
  ): LatencyMetricsResponseDto {
    const period = query.period as TimeWindow;
    return this.metricsService.getLatencyMetrics(
      tenantId,
      period,
      query.connectorId,
    );
  }

  // =====================
  // Error Metrics
  // =====================

  @Get('metrics/errors')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Get error rate metrics' })
  @ApiResponse({ status: 200, type: ErrorMetricsResponseDto })
  getErrorMetrics(
    @TenantId() tenantId: string,
    @Query() query: MetricsQueryDto,
  ): ErrorMetricsResponseDto {
    const period = query.period as TimeWindow;
    return this.metricsService.getErrorMetrics(
      tenantId,
      period,
      query.connectorId,
    );
  }

  // =====================
  // Time Series
  // =====================

  @Get('metrics/timeseries')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Get time series data for a metric' })
  @ApiResponse({ status: 200, type: TimeSeriesResponseDto })
  getTimeSeries(
    @TenantId() tenantId: string,
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
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Get health status for all connectors' })
  @ApiResponse({ status: 200, type: [ConnectorHealthResponseDto] })
  getAllConnectorHealth(
    @TenantId() tenantId: string,
    @Query() query: ConnectorHealthQueryDto,
  ): ConnectorHealthResponseDto[] {
    return this.healthService.getAllConnectorHealth(tenantId, query.status);
  }

  @Get('health/:connectorId')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Get health status for a specific connector' })
  @ApiParam({ name: 'connectorId', description: 'Connector ID' })
  @ApiResponse({ status: 200, type: ConnectorHealthResponseDto })
  getConnectorHealth(
    @TenantId() tenantId: string,
    @Param('connectorId') connectorId: string,
  ): ConnectorHealthResponseDto | null {
    return this.healthService.getConnectorHealth(tenantId, connectorId);
  }

  // =====================
  // Alert Thresholds
  // =====================

  @Get('alerts/thresholds')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'List alert thresholds' })
  @ApiResponse({ status: 200 })
  listThresholds(@TenantId() tenantId: string) {
    return this.alertService.listThresholds(tenantId);
  }

  @Post('alerts/thresholds')
  @Roles('admin')
  @ApiOperation({ summary: 'Create alert threshold' })
  @ApiResponse({ status: 201 })
  createThreshold(
    @TenantId() tenantId: string,
    @CurrentUser() user: UserPayload,
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
  @Roles('admin')
  @ApiOperation({ summary: 'Update alert threshold' })
  @ApiParam({ name: 'id', description: 'Threshold ID' })
  @ApiResponse({ status: 200 })
  updateThreshold(
    @TenantId() tenantId: string,
    @Param('id') thresholdId: string,
    @Body() dto: UpdateAlertThresholdDto,
  ) {
    return this.alertService.updateThreshold(tenantId, thresholdId, dto);
  }

  @Delete('alerts/thresholds/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete alert threshold' })
  @ApiParam({ name: 'id', description: 'Threshold ID' })
  @ApiResponse({ status: 204 })
  deleteThreshold(
    @TenantId() tenantId: string,
    @Param('id') thresholdId: string,
  ): void {
    this.alertService.deleteThreshold(tenantId, thresholdId);
  }

  // =====================
  // Alerts
  // =====================

  @Get('alerts')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'List alerts' })
  @ApiResponse({ status: 200, type: [AlertResponseDto] })
  listAlerts(
    @TenantId() tenantId: string,
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
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Get alert details' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, type: AlertResponseDto })
  getAlert(
    @TenantId() tenantId: string,
    @Param('id') alertId: string,
  ): AlertResponseDto | null {
    return this.alertService.getAlert(tenantId, alertId);
  }

  @Post('alerts/:id/acknowledge')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, type: AlertResponseDto })
  acknowledgeAlert(
    @TenantId() tenantId: string,
    @CurrentUser() user: UserPayload,
    @Param('id') alertId: string,
    @Body() _dto: AcknowledgeAlertDto,
  ): AlertResponseDto {
    return this.alertService.acknowledgeAlert(tenantId, alertId, user.id);
  }

  @Post('alerts/:id/resolve')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, type: AlertResponseDto })
  resolveAlert(
    @TenantId() tenantId: string,
    @CurrentUser() user: UserPayload,
    @Param('id') alertId: string,
    @Body() _dto: ResolveAlertDto,
  ): AlertResponseDto {
    return this.alertService.resolveAlert(tenantId, alertId, user.id);
  }

  @Post('alerts/:id/silence')
  @Roles('admin')
  @ApiOperation({ summary: 'Silence an alert temporarily' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, type: AlertResponseDto })
  silenceAlert(
    @TenantId() tenantId: string,
    @Param('id') alertId: string,
    @Body() dto: SilenceAlertDto,
  ): AlertResponseDto {
    return this.alertService.silenceAlert(
      tenantId,
      alertId,
      dto.durationMinutes,
    );
  }

  // =====================
  // Audit Logs
  // =====================

  @Get('audit-logs')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Query audit logs' })
  @ApiResponse({ status: 200, type: [AuditLogResponseDto] })
  queryAuditLogs(
    @TenantId() tenantId: string,
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
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Get audit log entry' })
  @ApiParam({ name: 'id', description: 'Audit log entry ID' })
  @ApiResponse({ status: 200, type: AuditLogResponseDto })
  getAuditLogEntry(
    @TenantId() tenantId: string,
    @Param('id') entryId: string,
  ): AuditLogResponseDto | null {
    return this.auditService.getEntry(tenantId, entryId);
  }

  @Get('audit-logs/resource/:type/:id')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Get audit history for a resource' })
  @ApiParam({ name: 'type', description: 'Resource type' })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  @ApiResponse({ status: 200, type: [AuditLogResponseDto] })
  getResourceHistory(
    @TenantId() tenantId: string,
    @Param('type') resourceType: string,
    @Param('id') resourceId: string,
    @Query('limit') limit?: number,
  ): AuditLogResponseDto[] {
    return this.auditService.getResourceHistory(
      tenantId,
      resourceType,
      resourceId,
      limit,
    );
  }

  // =====================
  // Retention Policy
  // =====================

  @Get('retention')
  @Roles('admin')
  @ApiOperation({ summary: 'Get retention policy' })
  @ApiResponse({ status: 200, type: RetentionPolicyResponseDto })
  getRetentionPolicy(
    @TenantId() tenantId: string,
  ): RetentionPolicyResponseDto {
    return this.retentionService.getPolicy(tenantId);
  }

  @Put('retention')
  @Roles('admin')
  @ApiOperation({ summary: 'Update retention policy' })
  @ApiResponse({ status: 200, type: RetentionPolicyResponseDto })
  updateRetentionPolicy(
    @TenantId() tenantId: string,
    @Body() dto: UpdateRetentionPolicyDto,
  ): RetentionPolicyResponseDto {
    return this.retentionService.setPolicy(tenantId, dto);
  }

  @Post('retention/cleanup')
  @Roles('admin')
  @ApiOperation({ summary: 'Run retention cleanup manually' })
  @ApiResponse({ status: 200 })
  async runCleanup(
    @TenantId() tenantId: string,
  ): Promise<{
    metricsDeleted: number;
    healthHistoryDeleted: number;
    alertsDeleted: number;
    auditLogsDeleted: number;
  }> {
    return this.retentionService.runCleanup(tenantId);
  }

  @Get('retention/stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Get retention statistics' })
  @ApiResponse({ status: 200 })
  getRetentionStats(@TenantId() tenantId: string) {
    return this.retentionService.getRetentionStats(tenantId);
  }
}

/**
 * Admin controller for cross-tenant monitoring
 */
@ApiTags('Admin - Integration Monitoring')
@ApiBearerAuth()
@Controller('api/v1/admin/integrations/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class AdminIntegrationMonitoringController {
  constructor(
    private readonly retentionService: LogRetentionService,
  ) {}

  @Post('retention/cleanup-all')
  @ApiOperation({ summary: 'Run retention cleanup for all tenants' })
  @ApiResponse({ status: 200 })
  async runGlobalCleanup(): Promise<{ message: string }> {
    await this.retentionService.scheduledCleanup();
    return { message: 'Global cleanup completed' };
  }
}
