import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConnectorRegistryController } from './connector-registry.controller';
import { ConnectorRegistryService, CredentialVaultService } from './services';

@Module({
  imports: [ConfigModule],
  controllers: [ConnectorRegistryController],
  providers: [ConnectorRegistryService, CredentialVaultService],
  exports: [ConnectorRegistryService, CredentialVaultService],
})
export class ConnectorRegistryModule {}
