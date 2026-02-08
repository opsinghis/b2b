import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '@infrastructure/database';
import {
  SapAuthService,
  SapODataClientService,
  SapSalesOrderService,
  SapBusinessPartnerService,
  SapProductService,
  SapBillingDocumentService,
  SapAtpService,
  SapErrorHandlerService,
  SapMapperService,
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
    SapAuthService,
    SapODataClientService,
    SapSalesOrderService,
    SapBusinessPartnerService,
    SapProductService,
    SapBillingDocumentService,
    SapAtpService,
    SapErrorHandlerService,
    SapMapperService,
  ],
  exports: [
    SapAuthService,
    SapODataClientService,
    SapSalesOrderService,
    SapBusinessPartnerService,
    SapProductService,
    SapBillingDocumentService,
    SapAtpService,
    SapErrorHandlerService,
    SapMapperService,
  ],
})
export class SapConnectorModule {}
