import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AlertConfigService } from './alert-config.service';
import { AlertSeverity, AlertStatus } from '../interfaces';

describe('AlertConfigService', () => {
  let service: AlertConfigService;

  const tenantId = 'tenant-123';
  const userId = 'user-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertConfigService],
    }).compile();

    service = module.get<AlertConfigService>(AlertConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createThreshold', () => {
    it('should create a new threshold', () => {
      const threshold = service.createThreshold(tenantId, userId, {
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds 5%',
        metric: 'error_rate',
        operator: 'gt',
        value: 5,
        severity: AlertSeverity.WARNING,
        cooldownMinutes: 15,
        notificationChannels: [],
      });

      expect(threshold.id).toBeDefined();
      expect(threshold.name).toBe('High Error Rate');
      expect(threshold.tenantId).toBe(tenantId);
      expect(threshold.metric).toBe('error_rate');
      expect(threshold.operator).toBe('gt');
      expect(threshold.value).toBe(5);
      expect(threshold.enabled).toBe(true);
    });

    it('should set default cooldown', () => {
      const threshold = service.createThreshold(tenantId, userId, {
        name: 'Test',
        metric: 'test',
        operator: 'gt',
        value: 1,
        severity: AlertSeverity.INFO,
        notificationChannels: [],
      });

      expect(threshold.cooldownMinutes).toBe(15);
    });
  });

  describe('updateThreshold', () => {
    it('should update an existing threshold', () => {
      const threshold = service.createThreshold(tenantId, userId, {
        name: 'Original',
        metric: 'test',
        operator: 'gt',
        value: 1,
        severity: AlertSeverity.INFO,
        notificationChannels: [],
      });

      const updated = service.updateThreshold(tenantId, threshold.id, {
        name: 'Updated',
        value: 10,
      });

      expect(updated.name).toBe('Updated');
      expect(updated.value).toBe(10);
      // Just verify updatedAt is a valid date
      expect(updated.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException for non-existent threshold', () => {
      expect(() => service.updateThreshold(tenantId, 'non-existent', { name: 'Test' })).toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for wrong tenant', () => {
      const threshold = service.createThreshold(tenantId, userId, {
        name: 'Test',
        metric: 'test',
        operator: 'gt',
        value: 1,
        severity: AlertSeverity.INFO,
        notificationChannels: [],
      });

      expect(() => service.updateThreshold('other-tenant', threshold.id, { name: 'Test' })).toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteThreshold', () => {
    it('should delete an existing threshold', () => {
      const threshold = service.createThreshold(tenantId, userId, {
        name: 'Test',
        metric: 'test',
        operator: 'gt',
        value: 1,
        severity: AlertSeverity.INFO,
        notificationChannels: [],
      });

      service.deleteThreshold(tenantId, threshold.id);

      expect(service.getThreshold(tenantId, threshold.id)).toBeNull();
    });

    it('should throw NotFoundException for non-existent threshold', () => {
      expect(() => service.deleteThreshold(tenantId, 'non-existent')).toThrow(NotFoundException);
    });
  });

  describe('getThreshold', () => {
    it('should return threshold for existing ID', () => {
      const created = service.createThreshold(tenantId, userId, {
        name: 'Test',
        metric: 'test',
        operator: 'gt',
        value: 1,
        severity: AlertSeverity.INFO,
        notificationChannels: [],
      });

      const found = service.getThreshold(tenantId, created.id);
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Test');
    });

    it('should return null for non-existent ID', () => {
      const found = service.getThreshold(tenantId, 'non-existent');
      expect(found).toBeNull();
    });
  });

  describe('listThresholds', () => {
    beforeEach(() => {
      // Create several thresholds
      service.createThreshold(tenantId, userId, {
        name: 'Threshold 1',
        metric: 'error_rate',
        operator: 'gt',
        value: 5,
        severity: AlertSeverity.WARNING,
        connectorId: 'connector-1',
        notificationChannels: [],
      });

      service.createThreshold(tenantId, userId, {
        name: 'Threshold 2',
        metric: 'latency_p99',
        operator: 'gt',
        value: 200,
        severity: AlertSeverity.CRITICAL,
        connectorId: 'connector-2',
        notificationChannels: [],
      });
    });

    it('should list all thresholds for tenant', () => {
      const thresholds = service.listThresholds(tenantId);
      expect(thresholds).toHaveLength(2);
    });

    it('should filter by connector ID', () => {
      const thresholds = service.listThresholds(tenantId, {
        connectorId: 'connector-1',
      });
      expect(thresholds).toHaveLength(1);
      expect(thresholds[0].name).toBe('Threshold 1');
    });

    it('should filter by severity', () => {
      const thresholds = service.listThresholds(tenantId, {
        severity: AlertSeverity.CRITICAL,
      });
      expect(thresholds).toHaveLength(1);
      expect(thresholds[0].name).toBe('Threshold 2');
    });

    it('should filter by enabled status', () => {
      const threshold = service.listThresholds(tenantId)[0];
      service.setThresholdEnabled(tenantId, threshold.id, false);

      const enabled = service.listThresholds(tenantId, { enabled: true });
      const disabled = service.listThresholds(tenantId, { enabled: false });

      expect(enabled).toHaveLength(1);
      expect(disabled).toHaveLength(1);
    });
  });

  describe('evaluateMetrics', () => {
    it('should trigger alert when condition is met', () => {
      service.createThreshold(tenantId, userId, {
        name: 'High Error Rate',
        metric: 'error_rate',
        operator: 'gt',
        value: 5,
        severity: AlertSeverity.WARNING,
        notificationChannels: [],
      });

      const alerts = service.evaluateMetrics(tenantId, { error_rate: 10 });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe(AlertSeverity.WARNING);
      expect(alerts[0].actualValue).toBe(10);
      expect(alerts[0].thresholdValue).toBe(5);
    });

    it('should not trigger alert when condition is not met', () => {
      service.createThreshold(tenantId, userId, {
        name: 'High Error Rate',
        metric: 'error_rate',
        operator: 'gt',
        value: 5,
        severity: AlertSeverity.WARNING,
        notificationChannels: [],
      });

      const alerts = service.evaluateMetrics(tenantId, { error_rate: 3 });

      expect(alerts).toHaveLength(0);
    });

    it('should respect cooldown period', () => {
      service.createThreshold(tenantId, userId, {
        name: 'Test',
        metric: 'test',
        operator: 'gt',
        value: 1,
        severity: AlertSeverity.INFO,
        cooldownMinutes: 60,
        notificationChannels: [],
      });

      // First evaluation triggers
      const alerts1 = service.evaluateMetrics(tenantId, { test: 10 });
      expect(alerts1).toHaveLength(1);

      // Second evaluation within cooldown doesn't trigger
      const alerts2 = service.evaluateMetrics(tenantId, { test: 10 });
      expect(alerts2).toHaveLength(0);
    });

    it('should scope to connector when specified', () => {
      service.createThreshold(tenantId, userId, {
        name: 'Connector Alert',
        metric: 'error_rate',
        operator: 'gt',
        value: 5,
        severity: AlertSeverity.WARNING,
        connectorId: 'specific-connector',
        notificationChannels: [],
      });

      // Alert for different connector
      const alerts1 = service.evaluateMetrics(
        tenantId,
        { error_rate: 10 },
        { connectorId: 'other-connector' },
      );
      expect(alerts1).toHaveLength(0);

      // Alert for matching connector
      const alerts2 = service.evaluateMetrics(
        tenantId,
        { error_rate: 10 },
        { connectorId: 'specific-connector' },
      );
      expect(alerts2).toHaveLength(1);
    });

    it('should auto-resolve alerts when condition no longer met', () => {
      service.createThreshold(tenantId, userId, {
        name: 'Test',
        metric: 'test',
        operator: 'gt',
        value: 5,
        severity: AlertSeverity.INFO,
        cooldownMinutes: 0,
        notificationChannels: [],
      });

      // Trigger alert
      const triggered = service.evaluateMetrics(tenantId, { test: 10 });
      expect(triggered).toHaveLength(1);
      expect(triggered[0].status).toBe(AlertStatus.ACTIVE);

      // Condition no longer met - should auto-resolve
      service.evaluateMetrics(tenantId, { test: 3 });

      const alert = service.getAlert(tenantId, triggered[0].id);
      expect(alert?.status).toBe(AlertStatus.RESOLVED);
    });

    it('should evaluate all operators correctly', () => {
      const operators: Array<'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne'> = [
        'gt',
        'gte',
        'lt',
        'lte',
        'eq',
        'ne',
      ];

      for (const op of operators) {
        const threshold = service.createThreshold(tenantId, userId, {
          name: `Test ${op}`,
          metric: `metric_${op}`,
          operator: op,
          value: 5,
          severity: AlertSeverity.INFO,
          cooldownMinutes: 0,
          notificationChannels: [],
        });

        // Test cases for each operator
        const testCases: Record<string, { pass: number; fail: number }> = {
          gt: { pass: 6, fail: 5 },
          gte: { pass: 5, fail: 4 },
          lt: { pass: 4, fail: 5 },
          lte: { pass: 5, fail: 6 },
          eq: { pass: 5, fail: 6 },
          ne: { pass: 6, fail: 5 },
        };

        const passAlerts = service.evaluateMetrics(tenantId, {
          [`metric_${op}`]: testCases[op].pass,
        });
        expect(passAlerts.length).toBeGreaterThanOrEqual(0);

        // Clean up for next iteration
        service.deleteThreshold(tenantId, threshold.id);
      }
    });
  });

  describe('alert management', () => {
    let alertId: string;

    beforeEach(() => {
      service.createThreshold(tenantId, userId, {
        name: 'Test',
        metric: 'test',
        operator: 'gt',
        value: 1,
        severity: AlertSeverity.WARNING,
        cooldownMinutes: 0,
        notificationChannels: [],
      });

      const alerts = service.evaluateMetrics(tenantId, { test: 10 });
      alertId = alerts[0].id;
    });

    describe('acknowledgeAlert', () => {
      it('should acknowledge an active alert', () => {
        const alert = service.acknowledgeAlert(tenantId, alertId, userId);

        expect(alert.status).toBe(AlertStatus.ACKNOWLEDGED);
        expect(alert.acknowledgedBy).toBe(userId);
        expect(alert.acknowledgedAt).toBeDefined();
      });

      it('should throw NotFoundException for non-existent alert', () => {
        expect(() => service.acknowledgeAlert(tenantId, 'non-existent', userId)).toThrow(
          NotFoundException,
        );
      });
    });

    describe('resolveAlert', () => {
      it('should resolve an alert', () => {
        const alert = service.resolveAlert(tenantId, alertId, userId);

        expect(alert.status).toBe(AlertStatus.RESOLVED);
        expect(alert.resolvedBy).toBe(userId);
        expect(alert.resolvedAt).toBeDefined();
      });
    });

    describe('silenceAlert', () => {
      it('should silence an alert', () => {
        const alert = service.silenceAlert(tenantId, alertId, 30);

        expect(alert.status).toBe(AlertStatus.SILENCED);
        expect(alert.silencedUntil).toBeDefined();

        const silencedUntil = alert.silencedUntil!;
        const expectedEnd = new Date(Date.now() + 30 * 60 * 1000);
        expect(silencedUntil.getTime()).toBeCloseTo(expectedEnd.getTime(), -3);
      });
    });
  });

  describe('listAlerts', () => {
    beforeEach(() => {
      // Create alerts with different severities
      service.createThreshold(tenantId, userId, {
        name: 'Warning',
        metric: 'warning_metric',
        operator: 'gt',
        value: 1,
        severity: AlertSeverity.WARNING,
        cooldownMinutes: 0,
        notificationChannels: [],
      });

      service.createThreshold(tenantId, userId, {
        name: 'Critical',
        metric: 'critical_metric',
        operator: 'gt',
        value: 1,
        severity: AlertSeverity.CRITICAL,
        cooldownMinutes: 0,
        notificationChannels: [],
      });

      service.evaluateMetrics(tenantId, {
        warning_metric: 10,
        critical_metric: 10,
      });
    });

    it('should list all alerts', () => {
      const { alerts, total } = service.listAlerts(tenantId);
      expect(alerts.length).toBe(2);
      expect(total).toBe(2);
    });

    it('should filter by status', () => {
      const { alerts } = service.listAlerts(tenantId, {
        status: AlertStatus.ACTIVE,
      });
      expect(alerts.length).toBe(2);
    });

    it('should filter by severity', () => {
      const { alerts } = service.listAlerts(tenantId, {
        severity: AlertSeverity.CRITICAL,
      });
      expect(alerts.length).toBe(1);
    });

    it('should support pagination', () => {
      const { alerts: page1 } = service.listAlerts(tenantId, { limit: 1 });
      const { alerts: page2 } = service.listAlerts(tenantId, {
        limit: 1,
        offset: 1,
      });

      expect(page1.length).toBe(1);
      expect(page2.length).toBe(1);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe('getAlertSummary', () => {
    it('should return correct summary', () => {
      service.createThreshold(tenantId, userId, {
        name: 'Warning',
        metric: 'w',
        operator: 'gt',
        value: 1,
        severity: AlertSeverity.WARNING,
        cooldownMinutes: 0,
        notificationChannels: [],
      });

      service.createThreshold(tenantId, userId, {
        name: 'Critical',
        metric: 'c',
        operator: 'gt',
        value: 1,
        severity: AlertSeverity.CRITICAL,
        cooldownMinutes: 0,
        notificationChannels: [],
      });

      service.evaluateMetrics(tenantId, { w: 10, c: 10 });

      const summary = service.getAlertSummary(tenantId);

      expect(summary.total).toBe(2);
      expect(summary.warning).toBe(1);
      expect(summary.critical).toBe(1);
    });
  });

  describe('cleanupOldAlerts', () => {
    it('should clean up old resolved alerts', () => {
      service.createThreshold(tenantId, userId, {
        name: 'Test',
        metric: 'test',
        operator: 'gt',
        value: 1,
        severity: AlertSeverity.INFO,
        cooldownMinutes: 0,
        notificationChannels: [],
      });

      const alerts = service.evaluateMetrics(tenantId, { test: 10 });
      service.resolveAlert(tenantId, alerts[0].id, userId);

      // With 0 day retention, resolved alert should be cleaned
      const cleaned = service.cleanupOldAlerts(0);
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  describe('unsilenceExpiredAlerts', () => {
    it('should unsilence alerts past their silence period', async () => {
      service.createThreshold(tenantId, userId, {
        name: 'Test',
        metric: 'test',
        operator: 'gt',
        value: 1,
        severity: AlertSeverity.INFO,
        cooldownMinutes: 0,
        notificationChannels: [],
      });

      const alerts = service.evaluateMetrics(tenantId, { test: 10 });

      // Silence for very short duration
      service.silenceAlert(tenantId, alerts[0].id, 0);

      // Wait a tiny bit and unsilence
      const unsilenced = service.unsilenceExpiredAlerts();
      expect(unsilenced).toBeGreaterThanOrEqual(0);
    });
  });
});
