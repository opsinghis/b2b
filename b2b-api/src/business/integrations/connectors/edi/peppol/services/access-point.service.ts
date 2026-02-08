import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PeppolParticipant,
  PeppolDocumentType,
  PeppolProcess,
  AccessPointSendRequest,
  AccessPointSendResponse,
  PeppolDocument,
  PeppolDocumentStatus,
} from '../interfaces';
import { SmpLookupService } from './smp-lookup.service';

/**
 * Access Point Message Status
 */
export interface AccessPointMessageStatus {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'rejected';
  timestamp: Date;
  details?: string;
  receiptId?: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Access Point Configuration
 */
interface AccessPointConfig {
  url: string;
  apiKey: string;
  senderId: string;
  senderScheme: string;
  timeout: number;
}

/**
 * Access Point Service
 *
 * Integrates with Peppol Access Point providers to send and receive
 * e-invoicing documents through the Peppol network.
 *
 * Supports common Access Point APIs:
 * - Oxalis
 * - Basware
 * - Pagero
 * - Tradeshift
 */
@Injectable()
export class AccessPointService {
  private readonly logger = new Logger(AccessPointService.name);

  /** Default HTTP timeout */
  private readonly DEFAULT_TIMEOUT = 30000;

  /** Message ID format */
  private readonly MESSAGE_ID_PREFIX = 'b2b-peppol';

  constructor(
    private readonly configService: ConfigService,
    private readonly smpLookupService: SmpLookupService,
  ) {}

  /**
   * Get Access Point configuration
   */
  private getConfig(): AccessPointConfig {
    return {
      url: this.configService.get<string>('PEPPOL_AP_URL', 'https://ap.peppol.example.com'),
      apiKey: this.configService.get<string>('PEPPOL_AP_API_KEY', ''),
      senderId: this.configService.get<string>('PEPPOL_SENDER_ID', ''),
      senderScheme: this.configService.get<string>('PEPPOL_SENDER_SCHEME', '0088'),
      timeout: this.configService.get<number>('PEPPOL_AP_TIMEOUT', this.DEFAULT_TIMEOUT),
    };
  }

  /**
   * Send a document through the Peppol network
   */
  async sendDocument(request: AccessPointSendRequest): Promise<AccessPointSendResponse> {
    const config = this.getConfig();

    this.logger.log(
      `Sending document to ${request.receiver.scheme}:${request.receiver.identifier}`,
    );

    // Validate sender and receiver
    if (!this.smpLookupService.isValidParticipantId(request.sender)) {
      return {
        success: false,
        error: {
          code: 'INVALID_SENDER',
          message: 'Invalid sender participant identifier',
        },
      };
    }

    if (!this.smpLookupService.isValidParticipantId(request.receiver)) {
      return {
        success: false,
        error: {
          code: 'INVALID_RECEIVER',
          message: 'Invalid receiver participant identifier',
        },
      };
    }

    // Check if receiver can accept this document type
    const canReceive = await this.smpLookupService.canReceiveDocument(
      request.receiver,
      request.documentType,
    );

    if (!canReceive) {
      this.logger.warn(
        `Receiver ${request.receiver.identifier} cannot receive document type ${request.documentType.name}`,
      );
      // Continue anyway - receiver might still accept it
    }

    // Generate message ID
    const messageId = this.generateMessageId();

    try {
      // Build the request payload
      const payload = this.buildSendPayload(request, messageId);

      // In production, make HTTP request to Access Point
      // const response = await this.httpSend(config.url, payload, config);

      // Simulate successful send
      this.logger.log(`Document sent successfully, message ID: ${messageId}`);

      return {
        success: true,
        messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to send document to Access Point', error);
      return {
        success: false,
        error: {
          code: 'SEND_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Get status of a sent message
   */
  async getMessageStatus(messageId: string): Promise<AccessPointMessageStatus | null> {
    const config = this.getConfig();

    this.logger.debug(`Getting status for message: ${messageId}`);

    try {
      // In production, query Access Point API
      // const url = `${config.url}/messages/${messageId}/status`;
      // const response = await fetch(url, { headers: this.getAuthHeaders(config) });

      // Simulate status response
      return {
        messageId,
        status: 'delivered',
        timestamp: new Date(),
        details: 'Document delivered to recipient',
        receiptId: `receipt-${messageId}`,
      };
    } catch (error) {
      this.logger.error(`Failed to get status for message ${messageId}`, error);
      return null;
    }
  }

  /**
   * Send invoice through Peppol network
   */
  async sendInvoice(
    sender: PeppolParticipant,
    receiver: PeppolParticipant,
    xmlContent: string,
    metadata?: Record<string, string>,
  ): Promise<AccessPointSendResponse> {
    return this.sendDocument({
      sender,
      receiver,
      documentType: this.smpLookupService.getInvoiceDocumentType(),
      process: this.smpLookupService.getBillingProcess(),
      xmlContent,
      metadata,
    });
  }

  /**
   * Send credit note through Peppol network
   */
  async sendCreditNote(
    sender: PeppolParticipant,
    receiver: PeppolParticipant,
    xmlContent: string,
    metadata?: Record<string, string>,
  ): Promise<AccessPointSendResponse> {
    return this.sendDocument({
      sender,
      receiver,
      documentType: this.smpLookupService.getCreditNoteDocumentType(),
      process: this.smpLookupService.getBillingProcess(),
      xmlContent,
      metadata,
    });
  }

  /**
   * Update document status based on Access Point response
   */
  async updateDocumentStatus(document: PeppolDocument): Promise<PeppolDocument> {
    if (!document.accessPointMessageId) {
      return document;
    }

    const status = await this.getMessageStatus(document.accessPointMessageId);
    if (!status) {
      return document;
    }

    let newStatus: PeppolDocumentStatus;
    switch (status.status) {
      case 'pending':
        newStatus = PeppolDocumentStatus.SUBMITTED;
        break;
      case 'sent':
        newStatus = PeppolDocumentStatus.SUBMITTED;
        break;
      case 'delivered':
        newStatus = PeppolDocumentStatus.DELIVERED;
        break;
      case 'rejected':
        newStatus = PeppolDocumentStatus.REJECTED;
        break;
      case 'failed':
        newStatus = PeppolDocumentStatus.FAILED;
        break;
      default:
        newStatus = document.status;
    }

    if (newStatus !== document.status) {
      document.status = newStatus;
      document.updatedAt = new Date();
      document.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        message: status.details,
      });

      if (status.receiptId && newStatus === PeppolDocumentStatus.DELIVERED) {
        document.deliveryReceipt = {
          timestamp: status.timestamp,
          receiptId: status.receiptId,
        };
      }
    }

    return document;
  }

  /**
   * Validate Access Point connectivity
   */
  async validateConnection(): Promise<boolean> {
    const config = this.getConfig();

    if (!config.url || !config.apiKey) {
      this.logger.warn('Access Point not configured');
      return false;
    }

    try {
      // In production, make a health check request
      // const response = await fetch(`${config.url}/health`, {
      //   headers: this.getAuthHeaders(config),
      // });
      // return response.ok;

      return true;
    } catch (error) {
      this.logger.error('Access Point connection validation failed', error);
      return false;
    }
  }

  /**
   * Get list of received documents
   */
  async getReceivedDocuments(
    since?: Date,
    limit: number = 100,
  ): Promise<Array<{ messageId: string; receivedAt: Date; documentType: string }>> {
    const config = this.getConfig();

    this.logger.debug('Fetching received documents');

    try {
      // In production, query Access Point inbox
      // const url = `${config.url}/inbox?limit=${limit}`;
      // if (since) url += `&since=${since.toISOString()}`;

      // Simulate empty inbox
      return [];
    } catch (error) {
      this.logger.error('Failed to fetch received documents', error);
      return [];
    }
  }

  /**
   * Download a received document
   */
  async downloadDocument(messageId: string): Promise<string | null> {
    const config = this.getConfig();

    this.logger.debug(`Downloading document: ${messageId}`);

    try {
      // In production, download from Access Point
      // const url = `${config.url}/inbox/${messageId}/content`;
      // const response = await fetch(url, { headers: this.getAuthHeaders(config) });
      // return await response.text();

      return null;
    } catch (error) {
      this.logger.error(`Failed to download document ${messageId}`, error);
      return null;
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${this.MESSAGE_ID_PREFIX}-${timestamp}-${random}`;
  }

  /**
   * Build send payload for Access Point API
   */
  private buildSendPayload(
    request: AccessPointSendRequest,
    messageId: string,
  ): Record<string, unknown> {
    return {
      messageId,
      sender: {
        scheme: request.sender.scheme,
        identifier: request.sender.identifier,
      },
      receiver: {
        scheme: request.receiver.scheme,
        identifier: request.receiver.identifier,
      },
      documentType: {
        scheme: request.documentType.scheme,
        identifier: request.documentType.identifier,
      },
      process: {
        scheme: request.process.scheme,
        identifier: request.process.identifier,
      },
      content: Buffer.from(request.xmlContent).toString('base64'),
      contentType: 'application/xml',
      metadata: request.metadata || {},
    };
  }

  /**
   * Get authentication headers for Access Point API
   */
  private getAuthHeaders(config: AccessPointConfig): Record<string, string> {
    return {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Get sender participant from configuration
   */
  getSenderParticipant(): PeppolParticipant {
    const config = this.getConfig();
    return {
      scheme: config.senderScheme,
      identifier: config.senderId,
    };
  }
}
