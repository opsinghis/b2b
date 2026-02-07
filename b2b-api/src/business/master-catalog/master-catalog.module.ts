import { Module } from '@nestjs/common';
import { MasterCatalogController } from './master-catalog.controller';
import { MasterCatalogAdminController } from './master-catalog-admin.controller';
import { MasterCatalogService } from './master-catalog.service';

@Module({
  controllers: [MasterCatalogController, MasterCatalogAdminController],
  providers: [MasterCatalogService],
  exports: [MasterCatalogService],
})
export class MasterCatalogModule {}
