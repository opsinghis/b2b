import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/database';
import { AuthorizationModule } from '@core/authorization';
import { PaymentMethodsService } from './payment-methods.service';
import { DeliveryMethodsService } from './delivery-methods.service';
import { UserAddressesService } from './user-addresses.service';
import { PaymentsService } from './payments.service';
import {
  PaymentMethodsController,
  AdminPaymentMethodsController,
} from './payment-methods.controller';
import {
  DeliveryMethodsController,
  AdminDeliveryMethodsController,
} from './delivery-methods.controller';
import { UserAddressesController } from './user-addresses.controller';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [DatabaseModule, AuthorizationModule],
  controllers: [
    PaymentMethodsController,
    AdminPaymentMethodsController,
    DeliveryMethodsController,
    AdminDeliveryMethodsController,
    UserAddressesController,
    PaymentsController,
  ],
  providers: [
    PaymentMethodsService,
    DeliveryMethodsService,
    UserAddressesService,
    PaymentsService,
  ],
  exports: [
    PaymentMethodsService,
    DeliveryMethodsService,
    UserAddressesService,
    PaymentsService,
  ],
})
export class PaymentsModule {}
