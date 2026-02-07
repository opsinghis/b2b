import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RestConnectorController } from './rest-connector.controller';
import { DatabaseModule } from '@infrastructure/database';
import {
  AuthProviderService,
  JsonPathMapperService,
  PaginationHandlerService,
  ErrorMapperService,
  RequestLoggerService,
  RestConnectorService,
  WebhookReceiverService,
} from './services';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    DatabaseModule,
  ],
  controllers: [RestConnectorController],
  providers: [
    AuthProviderService,
    JsonPathMapperService,
    PaginationHandlerService,
    ErrorMapperService,
    RequestLoggerService,
    RestConnectorService,
    WebhookReceiverService,
  ],
  exports: [
    RestConnectorService,
    AuthProviderService,
    JsonPathMapperService,
    PaginationHandlerService,
    ErrorMapperService,
    RequestLoggerService,
    WebhookReceiverService,
  ],
})
export class RestConnectorModule {}
