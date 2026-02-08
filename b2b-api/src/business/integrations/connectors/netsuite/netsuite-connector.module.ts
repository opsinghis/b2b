import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NetSuiteConnector } from './netsuite.connector';

@Module({
  imports: [HttpModule],
  providers: [
    {
      provide: NetSuiteConnector,
      useFactory: () => new NetSuiteConnector(),
    },
  ],
  exports: [NetSuiteConnector],
})
export class NetSuiteConnectorModule {}
