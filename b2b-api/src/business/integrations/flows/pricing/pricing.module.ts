import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@infrastructure/database';

// Services
import {
  PricingService,
  CurrencyService,
  PricingSyncService,
  PriceOverrideService,
} from './services';

// Controller
import { PricingController } from './pricing.controller';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [PricingController],
  providers: [
    PricingService,
    CurrencyService,
    PricingSyncService,
    PriceOverrideService,
  ],
  exports: [
    PricingService,
    CurrencyService,
    PricingSyncService,
    PriceOverrideService,
  ],
})
export class PricingModule {}
