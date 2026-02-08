import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import {
  As2ClientService,
  As2ServerService,
  CertificateManagerService,
  SftpClientService,
  TradingPartnerService,
  FilePollingService,
  TransportLogService,
  OutboundDeliveryService,
} from './services';

/**
 * EDI Transport Module
 *
 * Provides transport layer services for EDI communication:
 * - AS2 (Applicability Statement 2) for secure B2B messaging
 * - SFTP for file-based exchange
 * - Certificate management for signing and encryption
 * - Trading partner profile management
 * - Inbound file polling
 * - Outbound delivery queue
 * - Transport logging and audit
 */
@Module({
  imports: [ConfigModule, ScheduleModule.forRoot()],
  providers: [
    // Certificate Management (no dependencies)
    CertificateManagerService,

    // Transport Logging (no dependencies)
    TransportLogService,

    // AS2 Services
    As2ClientService,
    As2ServerService,

    // SFTP Services
    SftpClientService,

    // Trading Partner Management
    TradingPartnerService,

    // Polling and Delivery
    FilePollingService,
    OutboundDeliveryService,
  ],
  exports: [
    // Core Services
    As2ClientService,
    As2ServerService,
    CertificateManagerService,
    SftpClientService,

    // Management Services
    TradingPartnerService,
    FilePollingService,
    TransportLogService,
    OutboundDeliveryService,
  ],
})
export class TransportModule {}
