import { Test, TestingModule } from '@nestjs/testing';
import { ConnectorHealthService } from './connector-health.service';
import { ConnectorHealthStatus } from '../interfaces';

describe('ConnectorHealthService', () => {
  let service: ConnectorHealthService;

  const tenantId = 'tenant-123';
  const connectorId = 'connector-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConnectorHealthService],
    }).compile();

    service = module.get<ConnectorHealthService>(ConnectorHealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordHealthCheck', () => {
    it('should record a successful health check', () => {
      const result = service.recordHealthCheck(tenantId, connectorId, {
        success: true,
        responseTime: 50,
      });

      expect(result.connectorId).toBe(connectorId);
      expect(result.tenantId).toBe(tenantId);
      expect(result.connectivity.reachable).toBe(true);
      expect(result.responseTime).toBe(50);
    });

    it('should record a failed health check', () => {
      const result = service.recordHealthCheck(tenantId, connectorId, {
        success: false,
        error: 'Connection refused',
      });

      expect(result.connectivity.reachable).toBe(false);
      expect(result.recentErrors).toHaveLength(1);
      expect(result.recentErrors[0].error).toBe('Connection refused');
    });

    it('should mark connector as unhealthy after consecutive failures', () => {
      // Default unhealthy threshold is 3
      service.recordHealthCheck(tenantId, connectorId, {
        success: false,
        error: 'Error 1',
      });
      service.recordHealthCheck(tenantId, connectorId, {
        success: false,
        error: 'Error 2',
      });
      const result = service.recordHealthCheck(tenantId, connectorId, {
        success: false,
        error: 'Error 3',
      });

      expect(result.status).toBe(ConnectorHealthStatus.UNHEALTHY);
    });

    it('should mark connector as degraded after some failures', () => {
      service.recordHealthCheck(tenantId, connectorId, {
        success: false,
        error: 'Error 1',
      });
      const result = service.recordHealthCheck(tenantId, connectorId, {
        success: false,
        error: 'Error 2',
      });

      expect(result.status).toBe(ConnectorHealthStatus.DEGRADED);
    });

    it('should recover to healthy after consecutive successes', () => {
      // First, make it unhealthy
      for (let i = 0; i < 3; i++) {
        service.recordHealthCheck(tenantId, connectorId, {
          success: false,
          error: `Error ${i}`,
        });
      }

      // Then recover
      service.recordHealthCheck(tenantId, connectorId, { success: true });
      const result = service.recordHealthCheck(tenantId, connectorId, {
        success: true,
      });

      expect(result.status).toBe(ConnectorHealthStatus.HEALTHY);
    });

    it('should track rate limits', () => {
      const rateLimits = {
        remaining: 100,
        limit: 1000,
        resetsAt: new Date(Date.now() + 3600000),
      };

      const result = service.recordHealthCheck(tenantId, connectorId, {
        success: true,
        rateLimits,
      });

      expect(result.rateLimits).toEqual(rateLimits);
    });

    it('should track authentication status', () => {
      const expiresAt = new Date(Date.now() + 3600000);

      const result = service.recordHealthCheck(tenantId, connectorId, {
        success: true,
        authValid: true,
        authExpiresAt: expiresAt,
      });

      expect(result.authentication.valid).toBe(true);
      expect(result.authentication.expiresAt).toEqual(expiresAt);
    });

    it('should aggregate error counts', () => {
      const errorMessage = 'Connection timeout';

      service.recordHealthCheck(tenantId, connectorId, {
        success: false,
        error: errorMessage,
      });
      service.recordHealthCheck(tenantId, connectorId, {
        success: false,
        error: errorMessage,
      });

      const result = service.recordHealthCheck(tenantId, connectorId, {
        success: false,
        error: errorMessage,
      });

      const errorEntry = result.recentErrors.find((e) => e.error === errorMessage);
      expect(errorEntry?.count).toBe(3);
    });

    it('should keep only last 10 unique errors', () => {
      for (let i = 0; i < 15; i++) {
        service.recordHealthCheck(tenantId, connectorId, {
          success: false,
          error: `Error ${i}`,
        });
      }

      const result = service.getConnectorHealth(tenantId, connectorId);
      expect(result?.recentErrors.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getConnectorHealth', () => {
    it('should return health for existing connector', () => {
      service.recordHealthCheck(tenantId, connectorId, { success: true });

      const health = service.getConnectorHealth(tenantId, connectorId);
      expect(health).not.toBeNull();
      expect(health?.connectorId).toBe(connectorId);
    });

    it('should return null for non-existent connector', () => {
      const health = service.getConnectorHealth(tenantId, 'non-existent');
      expect(health).toBeNull();
    });

    it('should return null for wrong tenant', () => {
      service.recordHealthCheck(tenantId, connectorId, { success: true });

      const health = service.getConnectorHealth('other-tenant', connectorId);
      expect(health).toBeNull();
    });
  });

  describe('getAllConnectorHealth', () => {
    it('should return all connectors for tenant', () => {
      service.recordHealthCheck(tenantId, 'connector-1', { success: true });
      service.recordHealthCheck(tenantId, 'connector-2', { success: true });
      service.recordHealthCheck('other-tenant', 'connector-3', {
        success: true,
      });

      const health = service.getAllConnectorHealth(tenantId);
      expect(health).toHaveLength(2);
    });

    it('should filter by status', () => {
      service.recordHealthCheck(tenantId, 'healthy-connector', {
        success: true,
      });
      service.recordHealthCheck(tenantId, 'healthy-connector', {
        success: true,
      });

      for (let i = 0; i < 3; i++) {
        service.recordHealthCheck(tenantId, 'unhealthy-connector', {
          success: false,
          error: 'Error',
        });
      }

      const healthyOnly = service.getAllConnectorHealth(tenantId, ConnectorHealthStatus.HEALTHY);
      const unhealthyOnly = service.getAllConnectorHealth(
        tenantId,
        ConnectorHealthStatus.UNHEALTHY,
      );

      expect(healthyOnly).toHaveLength(1);
      expect(unhealthyOnly).toHaveLength(1);
    });
  });

  describe('getHealthSummary', () => {
    it('should return correct summary counts', () => {
      // Create healthy connectors
      for (let i = 0; i < 3; i++) {
        const cId = `healthy-${i}`;
        service.recordHealthCheck(tenantId, cId, { success: true });
        service.recordHealthCheck(tenantId, cId, { success: true });
      }

      // Create unhealthy connectors
      for (let i = 0; i < 3; i++) {
        service.recordHealthCheck(tenantId, `unhealthy-${i}`, {
          success: false,
          error: 'Error',
        });
      }

      const summary = service.getHealthSummary(tenantId);

      expect(summary.total).toBe(6);
      expect(summary.healthy).toBe(3);
    });

    it('should return zeros for empty tenant', () => {
      const summary = service.getHealthSummary('empty-tenant');

      expect(summary.total).toBe(0);
      expect(summary.healthy).toBe(0);
      expect(summary.degraded).toBe(0);
      expect(summary.unhealthy).toBe(0);
      expect(summary.unknown).toBe(0);
    });
  });

  describe('setHealthCheckConfig', () => {
    it('should set custom thresholds', () => {
      const config = service.setHealthCheckConfig(tenantId, connectorId, {
        unhealthyThreshold: 5,
        healthyThreshold: 3,
        intervalSeconds: 120,
        timeoutSeconds: 30,
      });

      expect(config.unhealthyThreshold).toBe(5);
      expect(config.healthyThreshold).toBe(3);
      expect(config.intervalSeconds).toBe(120);
      expect(config.timeoutSeconds).toBe(30);
    });

    it('should use custom thresholds for health determination', () => {
      service.setHealthCheckConfig(tenantId, connectorId, {
        unhealthyThreshold: 5,
      });

      // 3 failures should still be degraded with threshold of 5
      for (let i = 0; i < 3; i++) {
        service.recordHealthCheck(tenantId, connectorId, {
          success: false,
          error: 'Error',
        });
      }

      const health = service.getConnectorHealth(tenantId, connectorId);
      expect(health?.status).toBe(ConnectorHealthStatus.DEGRADED);
    });
  });

  describe('getHealthCheckConfig', () => {
    it('should return config for existing connector', () => {
      service.setHealthCheckConfig(tenantId, connectorId, { enabled: true });

      const config = service.getHealthCheckConfig(tenantId, connectorId);
      expect(config).not.toBeNull();
      expect(config?.enabled).toBe(true);
    });

    it('should return null for non-existent config', () => {
      const config = service.getHealthCheckConfig(tenantId, 'non-existent');
      expect(config).toBeNull();
    });
  });

  describe('markUnhealthy', () => {
    it('should mark connector as degraded/unhealthy', () => {
      const result = service.markUnhealthy(tenantId, connectorId, 'Manual override');

      expect(result.connectivity.reachable).toBe(false);
      expect(result.recentErrors.some((e) => e.error === 'Manual override')).toBe(true);
    });
  });

  describe('markHealthy', () => {
    it('should mark connector as healthy', () => {
      // First make it unhealthy
      for (let i = 0; i < 5; i++) {
        service.recordHealthCheck(tenantId, connectorId, {
          success: false,
          error: 'Error',
        });
      }

      // Then mark healthy
      const result = service.markHealthy(tenantId, connectorId);

      expect(result.status).toBe(ConnectorHealthStatus.HEALTHY);
      expect(result.connectivity.reachable).toBe(true);
    });
  });

  describe('removeConnector', () => {
    it('should remove all data for connector', () => {
      service.recordHealthCheck(tenantId, connectorId, { success: true });
      service.setHealthCheckConfig(tenantId, connectorId, { enabled: true });

      service.removeConnector(tenantId, connectorId);

      expect(service.getConnectorHealth(tenantId, connectorId)).toBeNull();
      expect(service.getHealthCheckConfig(tenantId, connectorId)).toBeNull();
    });
  });

  describe('uptime calculation', () => {
    it('should calculate uptime percentage', () => {
      // Record some successful checks
      for (let i = 0; i < 10; i++) {
        service.recordHealthCheck(tenantId, connectorId, { success: true });
      }

      const health = service.getConnectorHealth(tenantId, connectorId);
      expect(health?.uptime.percentage).toBeGreaterThanOrEqual(0);
      expect(health?.uptime.percentage).toBeLessThanOrEqual(100);
    });

    it('should track downtime minutes', () => {
      // Record some failures
      for (let i = 0; i < 5; i++) {
        service.recordHealthCheck(tenantId, connectorId, {
          success: false,
          error: 'Error',
        });
      }

      const health = service.getConnectorHealth(tenantId, connectorId);
      expect(health?.uptime.downtimeMinutes).toBeGreaterThan(0);
    });
  });

  describe('cleanupOldHistory', () => {
    it('should clean up old uptime history', () => {
      // Record some checks
      for (let i = 0; i < 10; i++) {
        service.recordHealthCheck(tenantId, connectorId, { success: true });
      }

      const cleaned = service.cleanupOldHistory(30);
      // With 30 day retention, recent data should remain
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });
});
