import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@infrastructure/database';

// Services
import {
  InventoryService,
  WarehouseService,
  InventorySyncService,
  InventoryAlertService,
} from './services';

// Controller
import { InventoryController } from './inventory.controller';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    WarehouseService,
    InventorySyncService,
    InventoryAlertService,
  ],
  exports: [
    InventoryService,
    WarehouseService,
    InventorySyncService,
    InventoryAlertService,
  ],
})
export class InventoryModule {}
