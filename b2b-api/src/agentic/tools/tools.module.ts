import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ToolsRegistryService } from './tools-registry.service';
import { ToolsController } from './tools.controller';
import { AuthorizationModule } from '@core/authorization';

@Module({
  imports: [DiscoveryModule, AuthorizationModule],
  controllers: [ToolsController],
  providers: [ToolsRegistryService],
  exports: [ToolsRegistryService],
})
export class ToolsModule {}
