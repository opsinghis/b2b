import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '@infrastructure/database';
import {
  OracleAuthService,
  OracleRestClientService,
  OracleSalesOrderService,
  OracleCustomerService,
  OracleItemService,
  OracleInvoiceService,
  OracleMapperService,
  OracleErrorHandlerService,
} from './services';
import { OracleERPConnector } from './oracle-erp.connector';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    DatabaseModule,
  ],
  providers: [
    OracleAuthService,
    OracleRestClientService,
    OracleSalesOrderService,
    OracleCustomerService,
    OracleItemService,
    OracleInvoiceService,
    OracleMapperService,
    OracleErrorHandlerService,
    OracleERPConnector,
  ],
  exports: [
    OracleAuthService,
    OracleRestClientService,
    OracleSalesOrderService,
    OracleCustomerService,
    OracleItemService,
    OracleInvoiceService,
    OracleMapperService,
    OracleErrorHandlerService,
    OracleERPConnector,
  ],
})
export class OracleConnectorModule {}
