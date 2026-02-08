import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '@infrastructure/database';
import {
  QuickBooksAuthService,
  QuickBooksRestClientService,
  QuickBooksCustomerService,
  QuickBooksItemService,
  QuickBooksInvoiceService,
  QuickBooksSalesReceiptService,
  QuickBooksPaymentService,
  QuickBooksMapperService,
  QuickBooksErrorHandlerService,
} from './services';
import { QuickBooksConnector } from './quickbooks.connector';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    DatabaseModule,
  ],
  providers: [
    QuickBooksAuthService,
    QuickBooksRestClientService,
    QuickBooksCustomerService,
    QuickBooksItemService,
    QuickBooksInvoiceService,
    QuickBooksSalesReceiptService,
    QuickBooksPaymentService,
    QuickBooksMapperService,
    QuickBooksErrorHandlerService,
    QuickBooksConnector,
  ],
  exports: [
    QuickBooksAuthService,
    QuickBooksRestClientService,
    QuickBooksCustomerService,
    QuickBooksItemService,
    QuickBooksInvoiceService,
    QuickBooksSalesReceiptService,
    QuickBooksPaymentService,
    QuickBooksMapperService,
    QuickBooksErrorHandlerService,
    QuickBooksConnector,
  ],
})
export class QuickBooksConnectorModule {}
