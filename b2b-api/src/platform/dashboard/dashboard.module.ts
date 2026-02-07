import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { CacheService } from './cache.service';
import { DatabaseModule } from '@infrastructure/database';
import { AuthorizationModule } from '@core/authorization';

@Module({
  imports: [ConfigModule, DatabaseModule, AuthorizationModule],
  controllers: [DashboardController],
  providers: [DashboardService, CacheService],
  exports: [DashboardService, CacheService],
})
export class DashboardModule {}
