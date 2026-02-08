import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { User } from '@prisma/client';
import { AuditService } from './audit.service';
import { AUDIT_LOG_KEY, AuditLogOptions } from './audit-log.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditOptions = this.reflector.getAllAndOverride<AuditLogOptions>(AUDIT_LOG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!auditOptions) {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: User; tenantId?: string }>();
    const user = request.user;
    const tenantId = request.tenantId;

    if (!user || !tenantId) {
      return next.handle();
    }

    const entityId = auditOptions.getEntityId
      ? auditOptions.getEntityId(request)
      : request.params.id || 'unknown';

    return next.handle().pipe(
      tap({
        next: (response) => {
          void this.auditService
            .log(tenantId, user.id, {
              action: auditOptions.action,
              entityType: auditOptions.entityType,
              entityId:
                typeof response === 'object' && response !== null && 'id' in response
                  ? (response as { id: string }).id
                  : entityId,
              changes: this.extractChanges(request, response),
              metadata: this.extractMetadata(request),
              ipAddress: request.ip,
              userAgent: request.get('user-agent'),
            })
            .catch((error) => {
              this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
            });
        },
        error: () => {
          // Don't log audit for failed requests
        },
      }),
    );
  }

  private extractChanges(request: Request, response: unknown): Record<string, unknown> {
    // For create/update operations, include the request body as changes
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      return {
        requestBody: this.sanitizeBody(request.body as Record<string, unknown>),
        ...(response && typeof response === 'object'
          ? { responseId: (response as { id?: string }).id }
          : {}),
      };
    }
    return {};
  }

  private extractMetadata(request: Request): Record<string, unknown> {
    return {
      method: request.method,
      path: request.path,
      query: request.query,
    };
  }

  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken', 'secret'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
