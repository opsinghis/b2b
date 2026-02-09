import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController, AdminOrdersController } from './orders.controller';
import { DatabaseModule } from '@infrastructure/database';
import { AuthorizationModule } from '@core/authorization';
import { CartModule } from '@business/cart';
import { PaymentsModule } from '@business/payments';

@Module({
  imports: [DatabaseModule, AuthorizationModule, CartModule, forwardRef(() => PaymentsModule)],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
