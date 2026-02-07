import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrchestratorService } from './orchestrator.service';
import { OrchestratorController } from './orchestrator.controller';
import { RateLimiterService } from './rate-limiter.service';
import { ToolsModule } from '../tools';
import { AuthorizationModule } from '@core/authorization';

@Module({
  imports: [ConfigModule, ToolsModule, AuthorizationModule],
  controllers: [OrchestratorController],
  providers: [OrchestratorService, RateLimiterService],
  exports: [OrchestratorService, RateLimiterService],
})
export class OrchestratorModule {}
