import { Module } from '@nestjs/common';
import { TenantMiddleware } from './tenant.middleware';
import { TenantGuard } from './tenant.guard';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { AuthorizationModule } from '../authorization';

@Module({
  imports: [AuthorizationModule],
  controllers: [TenantsController],
  providers: [TenantMiddleware, TenantGuard, TenantsService],
  exports: [TenantMiddleware, TenantGuard, TenantsService],
})
export class TenantsModule {}
