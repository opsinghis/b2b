import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/database';
import { AuthorizationModule } from '@core/authorization';
import { PartnersService } from './partners.service';
import { PartnersController, AdminPartnersController } from './partners.controller';

@Module({
  imports: [DatabaseModule, AuthorizationModule],
  controllers: [PartnersController, AdminPartnersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
