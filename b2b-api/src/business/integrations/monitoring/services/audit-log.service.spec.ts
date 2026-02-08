import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService, AuditRequestContext } from './audit-log.service';
import { AuditAction } from '../interfaces';

describe('AuditLogService', () => {
  let service: AuditLogService;

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogService],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('record', () => {
    it('should record a basic audit log entry', () => {
      const entry = service.record(
        tenantId,
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-1', name: 'Test Connector' },
        { success: true },
      );

      expect(entry.id).toBeDefined();
      expect(entry.tenantId).toBe(tenantId);
      expect(entry.action).toBe(AuditAction.CONNECTOR_REGISTERED);
      expect(entry.resource.type).toBe('connector');
      expect(entry.resource.id).toBe('conn-1');
      expect(entry.result.success).toBe(true);
    });

    it('should record with actor information', () => {
      const entry = service.record(
        tenantId,
        AuditAction.CONFIG_CREATED,
        { type: 'config', id: 'cfg-1' },
        { success: true },
        {
          actor: {
            type: 'user',
            id: 'user-123',
            name: 'John Doe',
            ip: '192.168.1.1',
          },
        },
      );

      expect(entry.actor.type).toBe('user');
      expect(entry.actor.id).toBe('user-123');
      expect(entry.actor.name).toBe('John Doe');
      expect(entry.actor.ip).toBe('192.168.1.1');
    });

    it('should record with changes', () => {
      const entry = service.record(
        tenantId,
        AuditAction.CONFIG_UPDATED,
        { type: 'config', id: 'cfg-1' },
        { success: true },
        {
          changes: {
            before: { enabled: false },
            after: { enabled: true },
          },
        },
      );

      expect(entry.changes?.before).toEqual({ enabled: false });
      expect(entry.changes?.after).toEqual({ enabled: true });
    });

    it('should record failed actions', () => {
      const entry = service.record(
        tenantId,
        AuditAction.CONNECTOR_TESTED,
        { type: 'connector', id: 'conn-1' },
        { success: false, error: 'Connection refused', duration: 5000 },
      );

      expect(entry.result.success).toBe(false);
      expect(entry.result.error).toBe('Connection refused');
      expect(entry.result.duration).toBe(5000);
    });

    it('should record with request context', () => {
      const entry = service.record(
        tenantId,
        AuditAction.REST_REQUEST_SENT,
        { type: 'rest_endpoint', id: 'endpoint-1' },
        { success: true },
        {
          request: {
            method: 'POST',
            path: '/api/v1/connectors',
            userAgent: 'Mozilla/5.0',
            correlationId: 'corr-123',
          },
        },
      );

      expect(entry.request?.method).toBe('POST');
      expect(entry.request?.path).toBe('/api/v1/connectors');
      expect(entry.request?.correlationId).toBe('corr-123');
    });

    it('should default actor to system when not provided', () => {
      const entry = service.record(
        tenantId,
        AuditAction.EVENT_PUBLISHED,
        { type: 'event', id: 'evt-1' },
        { success: true },
      );

      expect(entry.actor.type).toBe('system');
    });
  });

  describe('recordWithContext', () => {
    it('should record using request context', () => {
      const context: AuditRequestContext = {
        userId: 'user-456',
        userName: 'Jane Doe',
        ip: '10.0.0.1',
        userAgent: 'Chrome',
        method: 'PUT',
        path: '/api/v1/config/123',
        correlationId: 'trace-789',
      };

      const entry = service.recordWithContext(
        tenantId,
        AuditAction.CONFIG_UPDATED,
        { type: 'config', id: 'cfg-123' },
        { success: true },
        context,
      );

      expect(entry.actor.type).toBe('user');
      expect(entry.actor.id).toBe('user-456');
      expect(entry.request?.method).toBe('PUT');
      expect(entry.request?.path).toBe('/api/v1/config/123');
    });

    it('should use api actor type when no userId', () => {
      const context: AuditRequestContext = {
        method: 'POST',
        path: '/api/v1/webhooks',
      };

      const entry = service.recordWithContext(
        tenantId,
        AuditAction.WEBHOOK_DELIVERED,
        { type: 'webhook', id: 'wh-1' },
        { success: true },
        context,
      );

      expect(entry.actor.type).toBe('api');
    });
  });

  describe('getEntry', () => {
    it('should return entry by ID', () => {
      const created = service.record(
        tenantId,
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-1' },
        { success: true },
      );

      const found = service.getEntry(tenantId, created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for wrong tenant', () => {
      const created = service.record(
        tenantId,
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-1' },
        { success: true },
      );

      const found = service.getEntry('other-tenant', created.id);

      expect(found).toBeNull();
    });

    it('should return null for non-existent ID', () => {
      const found = service.getEntry(tenantId, 'non-existent');
      expect(found).toBeNull();
    });
  });

  describe('query', () => {
    beforeEach(() => {
      // Create various audit log entries
      service.record(
        tenantId,
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-1' },
        { success: true },
        { actor: { type: 'user', id: 'user-1' } },
      );

      service.record(
        tenantId,
        AuditAction.CONNECTOR_UPDATED,
        { type: 'connector', id: 'conn-1' },
        { success: true },
        { actor: { type: 'user', id: 'user-1' } },
      );

      service.record(
        tenantId,
        AuditAction.CONFIG_CREATED,
        { type: 'config', id: 'cfg-1' },
        { success: false, error: 'Validation error' },
        { actor: { type: 'user', id: 'user-2' } },
      );

      service.record(
        'other-tenant',
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-2' },
        { success: true },
      );
    });

    it('should query all entries for tenant', () => {
      const { entries, total } = service.query(tenantId);

      expect(entries).toHaveLength(3);
      expect(total).toBe(3);
    });

    it('should filter by action', () => {
      const { entries } = service.query(tenantId, {
        action: AuditAction.CONNECTOR_REGISTERED,
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].action).toBe(AuditAction.CONNECTOR_REGISTERED);
    });

    it('should filter by resource type', () => {
      const { entries } = service.query(tenantId, {
        resourceType: 'connector',
      });

      expect(entries).toHaveLength(2);
    });

    it('should filter by resource ID', () => {
      const { entries } = service.query(tenantId, {
        resourceId: 'conn-1',
      });

      expect(entries).toHaveLength(2);
    });

    it('should filter by actor ID', () => {
      const { entries } = service.query(tenantId, {
        actorId: 'user-2',
      });

      expect(entries).toHaveLength(1);
    });

    it('should filter by success', () => {
      const { entries: successful } = service.query(tenantId, { success: true });
      const { entries: failed } = service.query(tenantId, { success: false });

      expect(successful).toHaveLength(2);
      expect(failed).toHaveLength(1);
    });

    it('should filter by time range', () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 3600000);
      const hourFromNow = new Date(now.getTime() + 3600000);

      const { entries } = service.query(tenantId, {
        startTime: hourAgo,
        endTime: hourFromNow,
      });

      expect(entries).toHaveLength(3);
    });

    it('should support pagination', () => {
      const { entries: page1 } = service.query(tenantId, { limit: 2 });
      const { entries: page2 } = service.query(tenantId, {
        limit: 2,
        offset: 2,
      });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
    });

    it('should sort by timestamp descending', () => {
      const { entries } = service.query(tenantId);

      for (let i = 1; i < entries.length; i++) {
        expect(entries[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
          entries[i].timestamp.getTime(),
        );
      }
    });
  });

  describe('getResourceHistory', () => {
    it('should return history for a resource', () => {
      service.record(
        tenantId,
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-1' },
        { success: true },
      );

      service.record(
        tenantId,
        AuditAction.CONNECTOR_UPDATED,
        { type: 'connector', id: 'conn-1' },
        { success: true },
      );

      service.record(
        tenantId,
        AuditAction.CONNECTOR_ENABLED,
        { type: 'connector', id: 'conn-1' },
        { success: true },
      );

      const history = service.getResourceHistory(tenantId, 'connector', 'conn-1');

      expect(history).toHaveLength(3);
    });

    it('should respect limit', () => {
      for (let i = 0; i < 10; i++) {
        service.record(
          tenantId,
          AuditAction.CONFIG_UPDATED,
          { type: 'config', id: 'cfg-1' },
          { success: true },
        );
      }

      const history = service.getResourceHistory(tenantId, 'config', 'cfg-1', 5);

      expect(history).toHaveLength(5);
    });
  });

  describe('getActorActivity', () => {
    it('should return activity for an actor', () => {
      service.record(
        tenantId,
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-1' },
        { success: true },
        { actor: { type: 'user', id: 'user-1' } },
      );

      service.record(
        tenantId,
        AuditAction.CONFIG_CREATED,
        { type: 'config', id: 'cfg-1' },
        { success: true },
        { actor: { type: 'user', id: 'user-1' } },
      );

      const activity = service.getActorActivity(tenantId, 'user-1');

      expect(activity).toHaveLength(2);
    });
  });

  describe('getFailedActions', () => {
    it('should return only failed actions', () => {
      service.record(
        tenantId,
        AuditAction.CONNECTOR_TESTED,
        { type: 'connector', id: 'conn-1' },
        { success: false, error: 'Connection refused' },
      );

      service.record(
        tenantId,
        AuditAction.WEBHOOK_FAILED,
        { type: 'webhook', id: 'wh-1' },
        { success: false, error: 'Timeout' },
      );

      service.record(
        tenantId,
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-2' },
        { success: true },
      );

      const failed = service.getFailedActions(tenantId);

      expect(failed).toHaveLength(2);
      expect(failed.every((e) => !e.result.success)).toBe(true);
    });
  });

  describe('getActionCounts', () => {
    it('should return counts by action type', () => {
      service.record(
        tenantId,
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-1' },
        { success: true },
      );

      service.record(
        tenantId,
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-2' },
        { success: true },
      );

      service.record(
        tenantId,
        AuditAction.CONFIG_CREATED,
        { type: 'config', id: 'cfg-1' },
        { success: true },
      );

      const counts = service.getActionCounts(tenantId);

      expect(counts[AuditAction.CONNECTOR_REGISTERED]).toBe(2);
      expect(counts[AuditAction.CONFIG_CREATED]).toBe(1);
    });
  });

  describe('exportLogs', () => {
    it('should export logs within time range', () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 3600000);
      const hourFromNow = new Date(now.getTime() + 3600000);

      service.record(
        tenantId,
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-1' },
        { success: true },
      );

      const exported = service.exportLogs(tenantId, hourAgo, hourFromNow);

      expect(exported.length).toBeGreaterThan(0);
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete logs before date', () => {
      service.record(
        tenantId,
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-1' },
        { success: true },
      );

      // Delete logs from future (none should be deleted)
      const deleted = service.deleteOldLogs(tenantId, new Date(Date.now() - 3600000));

      expect(deleted).toBe(0);

      // Entry should still exist
      const { total } = service.query(tenantId);
      expect(total).toBe(1);
    });
  });

  describe('cleanupOldLogs', () => {
    it('should clean up logs based on retention days', () => {
      service.record(
        tenantId,
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-1' },
        { success: true },
      );

      // With 365 day retention, recently created logs should remain
      const cleaned = service.cleanupOldLogs(365);

      expect(cleaned).toBe(0);
    });

    it('should support per-action retention', () => {
      service.record(
        tenantId,
        AuditAction.CREDENTIAL_CREATED,
        { type: 'credential', id: 'cred-1' },
        { success: true },
      );

      // Credential actions have longer retention
      const cleaned = service.cleanupOldLogs(7, {
        [AuditAction.CREDENTIAL_CREATED]: 365,
      });

      expect(cleaned).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return comprehensive statistics', () => {
      service.record(
        tenantId,
        AuditAction.CONNECTOR_REGISTERED,
        { type: 'connector', id: 'conn-1' },
        { success: true },
        { actor: { type: 'user', id: 'user-1' } },
      );

      service.record(
        tenantId,
        AuditAction.CONNECTOR_TESTED,
        { type: 'connector', id: 'conn-1' },
        { success: false, error: 'Error' },
        { actor: { type: 'user', id: 'user-1' } },
      );

      service.record(
        tenantId,
        AuditAction.CONFIG_CREATED,
        { type: 'config', id: 'cfg-1' },
        { success: true },
        { actor: { type: 'user', id: 'user-2' } },
      );

      const stats = service.getStatistics(tenantId);

      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.byAction[AuditAction.CONNECTOR_REGISTERED]).toBe(1);
      expect(stats.byResourceType['connector']).toBe(2);
      expect(stats.byActor['user-1']).toBe(2);
    });
  });
});
