import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '@core/auth';
import { AuthorizationModule } from '@core/authorization';
import {
  IntegrationMetricsService,
  ConnectorHealthService,
  AlertConfigService,
  AuditLogService,
  LogRetentionService,
} from './services';
import {
  IntegrationMonitoringController,
  AdminIntegrationMonitoringController,
} from './monitoring.controller';

@Module({
  imports: [AuthModule, AuthorizationModule, ScheduleModule.forRoot()],
  controllers: [IntegrationMonitoringController, AdminIntegrationMonitoringController],
  providers: [
    IntegrationMetricsService,
    ConnectorHealthService,
    AlertConfigService,
    AuditLogService,
    LogRetentionService,
  ],
  exports: [
    IntegrationMetricsService,
    ConnectorHealthService,
    AlertConfigService,
    AuditLogService,
    LogRetentionService,
  ],
})
export class IntegrationMonitoringModule {}
