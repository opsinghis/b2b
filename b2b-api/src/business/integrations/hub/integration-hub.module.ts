import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IntegrationHubService } from './integration-hub.service';
import {
  IntegrationHubController,
  AdminIntegrationHubController,
} from './integration-hub.controller';
import { DatabaseModule } from '@infrastructure/database';
import { AuthorizationModule } from '@core/authorization';

@Module({
  imports: [DatabaseModule, AuthorizationModule, ScheduleModule.forRoot()],
  controllers: [IntegrationHubController, AdminIntegrationHubController],
  providers: [IntegrationHubService],
  exports: [IntegrationHubService],
})
export class IntegrationHubModule {}
