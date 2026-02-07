import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { DatabaseModule } from '@infrastructure/database';
import { AuthorizationModule } from '@core/authorization';
import { TenantCatalogModule } from '@business/tenant-catalog';

@Module({
  imports: [
    DatabaseModule,
    AuthorizationModule,
    TenantCatalogModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
