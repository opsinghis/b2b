import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/database';
import { AuthorizationModule } from '@core/authorization';
import { DiscountsService } from './discounts.service';
import {
  UserDiscountTierController,
  AdminDiscountTierController,
} from './discounts.controller';

@Module({
  imports: [DatabaseModule, AuthorizationModule],
  controllers: [UserDiscountTierController, AdminDiscountTierController],
  providers: [DiscountsService],
  exports: [DiscountsService],
})
export class DiscountsModule {}
