import { Module } from '@nestjs/common';
import { TenantCatalogController, AdminCategoriesController } from './tenant-catalog.controller';
import { TenantCatalogService } from './tenant-catalog.service';
import { CategoriesService } from './categories.service';

@Module({
  controllers: [TenantCatalogController, AdminCategoriesController],
  providers: [TenantCatalogService, CategoriesService],
  exports: [TenantCatalogService, CategoriesService],
})
export class TenantCatalogModule {}
