import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, url, ip } = request;
    const correlationId = request.headers['x-correlation-id'] as string;
    const userAgent = request.get('user-agent') || '';

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = ctx.getResponse();
          const { statusCode } = response;
          const contentLength = response.get('content-length');
          const duration = Date.now() - now;

          this.logger.log({
            method,
            url,
            statusCode,
            contentLength,
            duration: `${duration}ms`,
            correlationId,
            ip,
            userAgent,
          });
        },
        error: (error) => {
          const duration = Date.now() - now;

          this.logger.error({
            method,
            url,
            error: error.message,
            duration: `${duration}ms`,
            correlationId,
            ip,
            userAgent,
          });
        },
      }),
    );
  }
}
