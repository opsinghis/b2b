import { Test, TestingModule } from '@nestjs/testing';
import { LogRetentionService } from './log-retention.service';
import { IntegrationMetricsService } from './integration-metrics.service';
import { ConnectorHealthService } from './connector-health.service';
import { AlertConfigService } from './alert-config.service';
import { AuditLogService } from './audit-log.service';
import { AuditAction } from '../interfaces';

describe('LogRetentionService', () => {
  let service: LogRetentionService;
  let metricsService: IntegrationMetricsService;
  let healthService: ConnectorHealthService;
  let alertService: AlertConfigService;
  let auditService: AuditLogService;

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogRetentionService,
        IntegrationMetricsService,
        ConnectorHealthService,
        AlertConfigService,
        AuditLogService,
      ],
    }).compile();

    service = module.get<LogRetentionService>(LogRetentionService);
    metricsService = module.get<IntegrationMetricsService>(IntegrationMetricsService);
    healthService = module.get<ConnectorHealthService>(ConnectorHealthService);
    alertService = module.get<AlertConfigService>(AlertConfigService);
    auditService = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setPolicy', () => {
    it('should set retention policy for tenant', () => {
      const policy = service.setPolicy(tenantId, {
        metrics: {
          rawDataDays: 14,
          aggregatedDataDays: 60,
          summaryDataDays: 730,
        },
      });

      expect(policy.tenantId).toBe(tenantId);
      expect(policy.metrics.rawDataDays).toBe(14);
      expect(policy.metrics.aggregatedDataDays).toBe(60);
      expect(policy.metrics.summaryDataDays).toBe(730);
    });

    it('should merge with existing policy', () => {
      service.setPolicy(tenantId, {
        metrics: { rawDataDays: 14, aggregatedDataDays: 60, summaryDataDays: 730 },
      });

      const updated = service.setPolicy(tenantId, {
        auditLogs: { defaultDays: 180 },
      });

      expect(updated.metrics.rawDataDays).toBe(14);
      expect(updated.auditLogs.defaultDays).toBe(180);
    });

    it('should merge nested byAction settings', () => {
      service.setPolicy(tenantId, {
        auditLogs: {
          defaultDays: 90,
          byAction: { [AuditAction.CREDENTIAL_CREATED]: 365 },
        },
      });

      const updated = service.setPolicy(tenantId, {
        auditLogs: {
          defaultDays: 90,
          byAction: { [AuditAction.CONNECTOR_REGISTERED]: 180 },
        },
      });

      expect(updated.auditLogs.byAction?.[AuditAction.CREDENTIAL_CREATED]).toBe(365);
      expect(updated.auditLogs.byAction?.[AuditAction.CONNECTOR_REGISTERED]).toBe(180);
    });

    it('should enable archiving', () => {
      const policy = service.setPolicy(tenantId, {
        archive: {
          enabled: true,
          destination: 's3://bucket/archives',
          format: 'parquet',
        },
      });

      expect(policy.archive.enabled).toBe(true);
      expect(policy.archive.destination).toBe('s3://bucket/archives');
      expect(policy.archive.format).toBe('parquet');
    });
  });

  describe('getPolicy', () => {
    it('should return policy for tenant', () => {
      service.setPolicy(tenantId, {
        metrics: { rawDataDays: 30, aggregatedDataDays: 90, summaryDataDays: 365 },
      });

      const policy = service.getPolicy(tenantId);

      expect(policy.tenantId).toBe(tenantId);
      expect(policy.metrics.rawDataDays).toBe(30);
    });

    it('should return default policy for unknown tenant', () => {
      const policy = service.getPolicy('unknown-tenant');

      expect(policy.tenantId).toBe('unknown-tenant');
      expect(policy.metrics.rawDataDays).toBe(7); // default
      expect(policy.auditLogs.defaultDays).toBe(90); // default
    });
  });

  describe('deletePolicy', () => {
    it('should delete policy and revert to default', () => {
      service.setPolicy(tenantId, {
        metrics: { rawDataDays: 30, aggregatedDataDays: 90, summaryDataDays: 365 },
      });

      service.deletePolicy(tenantId);

      const policy = service.getPolicy(tenantId);
      expect(policy.metrics.rawDataDays).toBe(7); // default
    });
  });

  describe('runCleanup', () => {
    it('should run cleanup for tenant', async () => {
      // Add some data
      metricsService.recordMessageReceived(tenantId);
      healthService.recordHealthCheck(tenantId, 'conn-1', { success: true });
      auditService.record(
        tenantId,
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-1' },
        { success: true },
      );

      const result = await service.runCleanup(tenantId);

      expect(result).toHaveProperty('metricsDeleted');
      expect(result).toHaveProperty('healthHistoryDeleted');
      expect(result).toHaveProperty('alertsDeleted');
      expect(result).toHaveProperty('auditLogsDeleted');
    });

    it('should use tenant policy for retention', async () => {
      service.setPolicy(tenantId, {
        metrics: { rawDataDays: 1, aggregatedDataDays: 1, summaryDataDays: 1 },
        auditLogs: { defaultDays: 1 },
        alerts: { activeDays: 1, resolvedDays: 1 },
      });

      const result = await service.runCleanup(tenantId);

      // Result should have counts (may be 0 if no old data)
      expect(typeof result.metricsDeleted).toBe('number');
      expect(typeof result.auditLogsDeleted).toBe('number');
    });
  });

  describe('archiveData', () => {
    it('should not archive when disabled', async () => {
      service.setPolicy(tenantId, {
        archive: { enabled: false },
      });

      const result = await service.archiveData(
        tenantId,
        new Date(Date.now() - 86400000),
        new Date(),
      );

      expect(result.auditLogsArchived).toBe(0);
    });

    it('should archive when enabled', async () => {
      service.setPolicy(tenantId, {
        archive: {
          enabled: true,
          destination: 's3://test-bucket',
          format: 'json',
        },
      });

      // Add some audit logs
      auditService.record(
        tenantId,
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-1' },
        { success: true },
      );

      const result = await service.archiveData(
        tenantId,
        new Date(Date.now() - 86400000),
        new Date(Date.now() + 86400000),
      );

      expect(result.auditLogsArchived).toBeGreaterThan(0);
      expect(result.archiveLocation).toBe('s3://test-bucket');
    });
  });

  describe('getRetentionStats', () => {
    it('should return retention statistics', () => {
      // Set a policy
      service.setPolicy(tenantId, {
        metrics: { rawDataDays: 7, aggregatedDataDays: 30, summaryDataDays: 365 },
      });

      // Add some audit logs
      for (let i = 0; i < 5; i++) {
        auditService.record(
          tenantId,
          AuditAction.CONNECTOR_REGISTERED,
          { type: 'connector', id: `conn-${i}` },
          { success: true },
        );
      }

      const stats = service.getRetentionStats(tenantId);

      expect(stats.policy.tenantId).toBe(tenantId);
      expect(stats.currentDataCounts.auditLogs).toBe(5);
      expect(typeof stats.estimatedDeletionCounts.auditLogs).toBe('number');
    });
  });

  describe('validatePolicy', () => {
    it('should return no errors for valid policy', () => {
      const errors = service.validatePolicy({
        metrics: {
          rawDataDays: 7,
          aggregatedDataDays: 30,
          summaryDataDays: 365,
        },
        auditLogs: {
          defaultDays: 90,
        },
        alerts: {
          activeDays: 30,
          resolvedDays: 7,
        },
      });

      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid rawDataDays', () => {
      const errors = service.validatePolicy({
        metrics: {
          rawDataDays: 400,
          aggregatedDataDays: 30,
          summaryDataDays: 365,
        },
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('rawDataDays');
    });

    it('should return errors for invalid aggregatedDataDays', () => {
      const errors = service.validatePolicy({
        metrics: {
          rawDataDays: 7,
          aggregatedDataDays: 800,
          summaryDataDays: 365,
        },
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('aggregatedDataDays');
    });

    it('should return errors for invalid summaryDataDays', () => {
      const errors = service.validatePolicy({
        metrics: {
          rawDataDays: 7,
          aggregatedDataDays: 30,
          summaryDataDays: 2000,
        },
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('summaryDataDays');
    });

    it('should return errors for invalid auditLogs defaultDays', () => {
      const errors = service.validatePolicy({
        auditLogs: {
          defaultDays: 1000,
        },
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('auditLogs.defaultDays');
    });

    it('should return errors for invalid alerts settings', () => {
      const errors = service.validatePolicy({
        alerts: {
          activeDays: 500,
          resolvedDays: 100,
        },
      });

      expect(errors.length).toBe(2);
    });

    it('should return errors for values below minimum', () => {
      const errors = service.validatePolicy({
        metrics: {
          rawDataDays: 0,
          aggregatedDataDays: 0,
          summaryDataDays: 0,
        },
      });

      expect(errors.length).toBe(3);
    });
  });

  describe('scheduledCleanup', () => {
    it('should run cleanup for all tenants with policies', async () => {
      // Set policies for multiple tenants
      service.setPolicy('tenant-1', {
        metrics: { rawDataDays: 7, aggregatedDataDays: 30, summaryDataDays: 365 },
      });
      service.setPolicy('tenant-2', {
        metrics: { rawDataDays: 14, aggregatedDataDays: 60, summaryDataDays: 730 },
      });

      // Should not throw
      await expect(service.scheduledCleanup()).resolves.not.toThrow();
    });

    it('should handle errors gracefully', async () => {
      service.setPolicy(tenantId, {
        metrics: { rawDataDays: 7, aggregatedDataDays: 30, summaryDataDays: 365 },
      });

      // Mock a service to throw
      jest.spyOn(metricsService, 'cleanupOldData').mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      // Should not throw even if cleanup fails
      await expect(service.scheduledCleanup()).resolves.not.toThrow();
    });

    it('should unsilence expired alerts', async () => {
      const unsilenceSpy = jest.spyOn(alertService, 'unsilenceExpiredAlerts');

      await service.scheduledCleanup();

      expect(unsilenceSpy).toHaveBeenCalled();
    });
  });

  describe('default policy values', () => {
    it('should have sensible defaults', () => {
      const policy = service.getPolicy('new-tenant');

      // Metrics defaults
      expect(policy.metrics.rawDataDays).toBe(7);
      expect(policy.metrics.aggregatedDataDays).toBe(30);
      expect(policy.metrics.summaryDataDays).toBe(365);

      // Audit logs defaults
      expect(policy.auditLogs.defaultDays).toBe(90);
      expect(policy.auditLogs.byAction?.[AuditAction.CREDENTIAL_CREATED]).toBe(365);

      // Alerts defaults
      expect(policy.alerts.activeDays).toBe(30);
      expect(policy.alerts.resolvedDays).toBe(7);

      // Archive defaults
      expect(policy.archive.enabled).toBe(false);
    });
  });
});
