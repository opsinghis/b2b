import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController, AdminOrdersController } from './orders.controller';
import { DatabaseModule } from '@infrastructure/database';
import { AuthorizationModule } from '@core/authorization';
import { CartModule } from '@business/cart';

@Module({
  imports: [DatabaseModule, AuthorizationModule, CartModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
