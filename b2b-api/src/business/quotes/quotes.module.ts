import { Module, forwardRef } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { DatabaseModule } from '@infrastructure/database';
import { AuthorizationModule } from '@core/authorization';
import { AuditModule } from '@core/audit';
import { ContractsModule } from '@business/contracts';
import { TenantCatalogModule } from '@business/tenant-catalog';
import { NotificationsModule } from '@platform/notifications';

@Module({
  imports: [
    DatabaseModule,
    AuthorizationModule,
    AuditModule,
    forwardRef(() => ContractsModule),
    TenantCatalogModule,
    NotificationsModule,
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
