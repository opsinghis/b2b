import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '@infrastructure/database';
import {
  DynamicsAuthService,
  DynamicsWebApiClientService,
  DynamicsSalesOrderService,
  DynamicsAccountService,
  DynamicsProductService,
  DynamicsInvoiceService,
  DynamicsMapperService,
  DynamicsErrorHandlerService,
} from './services';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    DatabaseModule,
  ],
  providers: [
    DynamicsAuthService,
    DynamicsWebApiClientService,
    DynamicsSalesOrderService,
    DynamicsAccountService,
    DynamicsProductService,
    DynamicsInvoiceService,
    DynamicsMapperService,
    DynamicsErrorHandlerService,
  ],
  exports: [
    DynamicsAuthService,
    DynamicsWebApiClientService,
    DynamicsSalesOrderService,
    DynamicsAccountService,
    DynamicsProductService,
    DynamicsInvoiceService,
    DynamicsMapperService,
    DynamicsErrorHandlerService,
  ],
})
export class DynamicsConnectorModule {}
