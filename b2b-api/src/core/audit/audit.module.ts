import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuthorizationModule } from '../authorization';

@Module({
  imports: [AuthorizationModule],
  providers: [AuditService, AuditLogInterceptor],
  controllers: [AuditController],
  exports: [AuditService, AuditLogInterceptor],
})
export class AuditModule {}
