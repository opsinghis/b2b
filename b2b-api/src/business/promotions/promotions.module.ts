import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/database';
import { AuthorizationModule } from '@core/authorization';
import { PromotionsService } from './promotions.service';
import { PromotionsController, AdminPromotionsController } from './promotions.controller';

@Module({
  imports: [DatabaseModule, AuthorizationModule],
  controllers: [PromotionsController, AdminPromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
