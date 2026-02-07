import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AuditLogEntry, AuditAction } from '../interfaces';

/**
 * Request context for audit logging
 */
export interface AuditRequestContext {
  userId?: string;
  userName?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  correlationId?: string;
}

/**
 * Service for recording and querying audit logs
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  // In-memory store (would be replaced with database in production)
  private readonly auditLogs: Map<string, AuditLogEntry> = new Map();

  /**
   * Record an audit log entry
   */
  record(
    tenantId: string,
    action: AuditAction,
    resource: { type: string; id: string; name?: string },
    result: { success: boolean; error?: string; duration?: number },
    options?: {
      actor?: {
        type: 'user' | 'system' | 'api' | 'scheduler';
        id?: string;
        name?: string;
        ip?: string;
      };
      changes?: {
        before?: Record<string, unknown>;
        after?: Record<string, unknown>;
      };
      request?: {
        method: string;
        path: string;
        userAgent?: string;
        correlationId?: string;
      };
      metadata?: Record<string, unknown>;
    },
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: uuidv4(),
      tenantId,
      action,
      timestamp: new Date(),
      actor: options?.actor || { type: 'system' },
      resource,
      changes: options?.changes,
      request: options?.request,
      result,
      metadata: options?.metadata,
    };

    this.auditLogs.set(entry.id, entry);

    // Log for debugging
    const logLevel = result.success ? 'debug' : 'warn';
    this.logger[logLevel](
      `Audit: ${action} on ${resource.type}/${resource.id} - ${result.success ? 'success' : 'failed'}`,
    );

    return entry;
  }

  /**
   * Record from request context
   */
  recordWithContext(
    tenantId: string,
    action: AuditAction,
    resource: { type: string; id: string; name?: string },
    result: { success: boolean; error?: string; duration?: number },
    context: AuditRequestContext,
    changes?: {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    },
    metadata?: Record<string, unknown>,
  ): AuditLogEntry {
    return this.record(tenantId, action, resource, result, {
      actor: {
        type: context.userId ? 'user' : 'api',
        id: context.userId,
        name: context.userName,
        ip: context.ip,
      },
      changes,
      request: {
        method: context.method || 'UNKNOWN',
        path: context.path || 'UNKNOWN',
        userAgent: context.userAgent,
        correlationId: context.correlationId,
      },
      metadata,
    });
  }

  /**
   * Get an audit log entry by ID
   */
  getEntry(tenantId: string, entryId: string): AuditLogEntry | null {
    const entry = this.auditLogs.get(entryId);
    if (!entry || entry.tenantId !== tenantId) {
      return null;
    }
    return entry;
  }

  /**
   * Query audit logs
   */
  query(
    tenantId: string,
    options?: {
      action?: AuditAction;
      resourceType?: string;
      resourceId?: string;
      actorId?: string;
      success?: boolean;
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    },
  ): { entries: AuditLogEntry[]; total: number } {
    let results: AuditLogEntry[] = [];

    for (const entry of this.auditLogs.values()) {
      if (entry.tenantId !== tenantId) continue;
      if (options?.action && entry.action !== options.action) continue;
      if (options?.resourceType && entry.resource.type !== options.resourceType)
        continue;
      if (options?.resourceId && entry.resource.id !== options.resourceId)
        continue;
      if (options?.actorId && entry.actor.id !== options.actorId) continue;
      if (
        options?.success !== undefined &&
        entry.result.success !== options.success
      )
        continue;
      if (options?.startTime && entry.timestamp < options.startTime) continue;
      if (options?.endTime && entry.timestamp > options.endTime) continue;

      results.push(entry);
    }

    // Sort by timestamp descending (most recent first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = results.length;

    // Apply pagination
    if (options?.offset) {
      results = results.slice(options.offset);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return { entries: results, total };
  }

  /**
   * Get audit logs for a specific resource
   */
  getResourceHistory(
    tenantId: string,
    resourceType: string,
    resourceId: string,
    limit?: number,
  ): AuditLogEntry[] {
    const { entries } = this.query(tenantId, {
      resourceType,
      resourceId,
      limit: limit || 100,
    });
    return entries;
  }

  /**
   * Get audit logs for a specific actor
   */
  getActorActivity(
    tenantId: string,
    actorId: string,
    options?: {
      startTime?: Date;
      endTime?: Date;
      limit?: number;
    },
  ): AuditLogEntry[] {
    const { entries } = this.query(tenantId, {
      actorId,
      startTime: options?.startTime,
      endTime: options?.endTime,
      limit: options?.limit || 100,
    });
    return entries;
  }

  /**
   * Get failed actions
   */
  getFailedActions(
    tenantId: string,
    options?: {
      startTime?: Date;
      endTime?: Date;
      limit?: number;
    },
  ): AuditLogEntry[] {
    const { entries } = this.query(tenantId, {
      success: false,
      startTime: options?.startTime,
      endTime: options?.endTime,
      limit: options?.limit || 100,
    });
    return entries;
  }

  /**
   * Get action counts by type
   */
  getActionCounts(
    tenantId: string,
    startTime?: Date,
    endTime?: Date,
  ): Record<AuditAction, number> {
    const counts: Record<string, number> = {};

    for (const entry of this.auditLogs.values()) {
      if (entry.tenantId !== tenantId) continue;
      if (startTime && entry.timestamp < startTime) continue;
      if (endTime && entry.timestamp > endTime) continue;

      counts[entry.action] = (counts[entry.action] || 0) + 1;
    }

    return counts as Record<AuditAction, number>;
  }

  /**
   * Export audit logs to array (for archival)
   */
  exportLogs(
    tenantId: string,
    startTime: Date,
    endTime: Date,
  ): AuditLogEntry[] {
    const { entries } = this.query(tenantId, {
      startTime,
      endTime,
      limit: 100000, // Large limit for export
    });
    return entries;
  }

  /**
   * Delete old audit logs
   */
  deleteOldLogs(tenantId: string, beforeDate: Date): number {
    let deleted = 0;

    for (const [id, entry] of this.auditLogs.entries()) {
      if (entry.tenantId === tenantId && entry.timestamp < beforeDate) {
        this.auditLogs.delete(id);
        deleted++;
      }
    }

    this.logger.log(`Deleted ${deleted} old audit logs for tenant ${tenantId}`);
    return deleted;
  }

  /**
   * Clean up old logs based on retention policy
   */
  cleanupOldLogs(
    retentionDays: number,
    byAction?: Record<string, number>,
  ): number {
    const defaultCutoff = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    );
    let deleted = 0;

    for (const [id, entry] of this.auditLogs.entries()) {
      const actionRetention = byAction?.[entry.action];
      const cutoff = actionRetention
        ? new Date(Date.now() - actionRetention * 24 * 60 * 60 * 1000)
        : defaultCutoff;

      if (entry.timestamp < cutoff) {
        this.auditLogs.delete(id);
        deleted++;
      }
    }

    this.logger.log(`Cleaned up ${deleted} old audit logs`);
    return deleted;
  }

  /**
   * Get statistics for audit logs
   */
  getStatistics(
    tenantId: string,
    startTime?: Date,
    endTime?: Date,
  ): {
    total: number;
    successful: number;
    failed: number;
    byAction: Record<string, number>;
    byResourceType: Record<string, number>;
    byActor: Record<string, number>;
  } {
    const stats = {
      total: 0,
      successful: 0,
      failed: 0,
      byAction: {} as Record<string, number>,
      byResourceType: {} as Record<string, number>,
      byActor: {} as Record<string, number>,
    };

    for (const entry of this.auditLogs.values()) {
      if (entry.tenantId !== tenantId) continue;
      if (startTime && entry.timestamp < startTime) continue;
      if (endTime && entry.timestamp > endTime) continue;

      stats.total++;
      if (entry.result.success) {
        stats.successful++;
      } else {
        stats.failed++;
      }

      stats.byAction[entry.action] = (stats.byAction[entry.action] || 0) + 1;
      stats.byResourceType[entry.resource.type] =
        (stats.byResourceType[entry.resource.type] || 0) + 1;

      if (entry.actor.id) {
        stats.byActor[entry.actor.id] =
          (stats.byActor[entry.actor.id] || 0) + 1;
      }
    }

    return stats;
  }
}
