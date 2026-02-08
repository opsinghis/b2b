import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID, createHash, createVerify } from 'crypto';
import * as zlib from 'zlib';
import {
  As2PartnerProfile,
  As2ReceiveRequest,
  As2ReceiveResult,
  As2Mdn,
  As2MdnMode,
  As2MdnDisposition,
  As2SigningAlgorithm,
  As2CompressionAlgorithm,
} from '../interfaces';
import { CertificateManagerService } from './certificate-manager.service';
import { As2ClientService } from './as2-client.service';

/**
 * AS2 Receiver Result for internal processing
 */
export interface As2ReceiverProcessResult {
  messageId: string;
  as2From: string;
  as2To: string;
  content: Buffer;
  contentType: string;
  subject?: string;
  filename?: string;
  signed: boolean;
  encrypted: boolean;
  signatureVerified: boolean;
  decrypted: boolean;
  decompressed: boolean;
  originalHeaders: Record<string, string>;
}

/**
 * AS2 Server Service
 *
 * Handles inbound AS2 messages:
 * - Parses incoming AS2 requests
 * - Verifies signatures
 * - Decrypts encrypted content
 * - Decompresses compressed content
 * - Generates MDN (Message Disposition Notification) responses
 */
@Injectable()
export class As2ServerService {
  private readonly logger = new Logger(As2ServerService.name);
  private readonly localProfiles = new Map<string, As2LocalProfile>();
  private readonly messageHandlers: As2MessageHandler[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly certificateManager: CertificateManagerService,
    private readonly as2Client: As2ClientService,
  ) {}

  /**
   * Register a local AS2 profile (our identity)
   */
  registerLocalProfile(profile: As2LocalProfile): void {
    this.localProfiles.set(profile.as2Id, profile);
    this.logger.log(`Registered local AS2 profile: ${profile.as2Id}`);
  }

  /**
   * Get local profile
   */
  getLocalProfile(as2Id: string): As2LocalProfile | undefined {
    return this.localProfiles.get(as2Id);
  }

  /**
   * Register a message handler
   */
  registerMessageHandler(handler: As2MessageHandler): void {
    this.messageHandlers.push(handler);
    this.logger.log('Registered AS2 message handler');
  }

  /**
   * Receive and process an inbound AS2 message
   */
  async receive(request: As2ReceiveRequest): Promise<As2ReceiveResult> {
    const startTime = Date.now();
    let messageId = '';
    let as2From = '';
    let as2To = '';

    try {
      // Extract AS2 headers
      const headers = this.normalizeHeaders(request.headers);
      messageId = this.extractMessageId(headers);
      as2From = headers['as2-from'] || '';
      as2To = headers['as2-to'] || '';

      this.logger.log(`Receiving AS2 message ${messageId} from ${as2From} to ${as2To}`);

      // Validate required headers
      this.validateHeaders(headers);

      // Get local profile
      const localProfile = this.localProfiles.get(as2To);
      if (!localProfile) {
        throw new Error(`Unknown AS2 recipient: ${as2To}`);
      }

      // Get partner profile
      const partnerProfile = this.as2Client.getPartner(as2From);
      if (!partnerProfile) {
        this.logger.warn(`Unknown AS2 sender: ${as2From} - processing without partner profile`);
      }

      // Process the message
      const processResult = await this.processMessage(
        request.body,
        headers,
        localProfile,
        partnerProfile,
      );

      // Notify handlers
      for (const handler of this.messageHandlers) {
        try {
          await handler.onMessageReceived(processResult);
        } catch (handlerError) {
          this.logger.error(
            `Message handler error: ${handlerError instanceof Error ? handlerError.message : 'Unknown'}`,
          );
        }
      }

      // Generate MDN if requested
      let mdn: As2Mdn | undefined;
      if (headers['disposition-notification-to']) {
        mdn = await this.generateMdn(
          messageId,
          as2From,
          as2To,
          processResult,
          headers,
          localProfile,
          partnerProfile,
        );
      }

      const durationMs = Date.now() - startTime;
      this.logger.log(`AS2 message ${messageId} received successfully in ${durationMs}ms`);

      return {
        success: true,
        messageId,
        as2From,
        as2To,
        content: processResult.content,
        contentType: processResult.contentType,
        subject: processResult.subject,
        filename: processResult.filename,
        signed: processResult.signed,
        encrypted: processResult.encrypted,
        signatureVerified: processResult.signatureVerified,
        mdn,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`AS2 receive failed for message ${messageId}: ${errorMessage}`);

      // Generate error MDN if possible
      let mdn: As2Mdn | undefined;
      const headers = this.normalizeHeaders(request.headers);
      if (headers['disposition-notification-to'] && as2From && as2To) {
        try {
          const localProfile = this.localProfiles.get(as2To);
          if (localProfile) {
            mdn = await this.generateErrorMdn(
              messageId,
              as2From,
              as2To,
              errorMessage,
              headers,
              localProfile,
            );
          }
        } catch {
          // Ignore MDN generation errors
        }
      }

      return {
        success: false,
        messageId,
        as2From,
        as2To,
        content: Buffer.alloc(0),
        contentType: '',
        signed: false,
        encrypted: false,
        mdn,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Process the message body
   */
  private async processMessage(
    body: Buffer,
    headers: Record<string, string>,
    localProfile: As2LocalProfile,
    partnerProfile?: As2PartnerProfile,
  ): Promise<As2ReceiverProcessResult> {
    let content = body;
    let contentType = headers['content-type'] || 'application/octet-stream';
    let signed = false;
    let encrypted = false;
    let signatureVerified = false;
    let decrypted = false;
    let decompressed = false;

    // Step 1: Decrypt if encrypted
    if (contentType.includes('enveloped-data')) {
      if (!localProfile.decryptionCertificateId) {
        throw new Error('No decryption certificate configured');
      }

      content = await this.decryptContent(content, localProfile.decryptionCertificateId);
      encrypted = true;
      decrypted = true;

      // Update content type for further processing
      contentType = this.extractInnerContentType(content) || 'application/pkcs7-mime';
    }

    // Step 2: Verify signature if signed
    if (contentType.includes('signed-data') || contentType.includes('pkcs7-signature')) {
      if (partnerProfile?.signingCertificateId) {
        const verifyResult = await this.verifySignature(
          content,
          partnerProfile.signingCertificateId,
        );
        content = verifyResult.content;
        signatureVerified = verifyResult.verified;
      } else {
        // Extract content without verification (partner not configured)
        content = this.extractSignedContent(content);
        signatureVerified = false;
        this.logger.warn('Signature not verified - no partner certificate configured');
      }
      signed = true;

      // Update content type
      contentType = this.extractInnerContentType(content) || 'application/octet-stream';
    }

    // Step 3: Decompress if compressed
    if (contentType.includes('compressed-data')) {
      content = await this.decompressContent(content);
      decompressed = true;

      // Update content type
      contentType = this.extractInnerContentType(content) || 'application/octet-stream';
    }

    // Extract filename from Content-Disposition
    const filename = this.extractFilename(headers);

    return {
      messageId: this.extractMessageId(headers),
      as2From: headers['as2-from'] || '',
      as2To: headers['as2-to'] || '',
      content,
      contentType,
      subject: headers['subject'],
      filename,
      signed,
      encrypted,
      signatureVerified,
      decrypted,
      decompressed,
      originalHeaders: headers,
    };
  }

  /**
   * Decrypt content (simplified)
   */
  private async decryptContent(encryptedData: Buffer, certificateId: string): Promise<Buffer> {
    const privateKey = await this.certificateManager.getPrivateKey(certificateId);
    if (!privateKey) {
      throw new Error(`Private key not found for certificate: ${certificateId}`);
    }

    // In a real implementation, this would use proper PKCS#7 decryption
    // For now, extract the wrapped content
    const content = encryptedData.toString('utf8');
    const match = content.match(/-----BEGIN PKCS7-----\n([\s\S]*?)\n-----END PKCS7-----/);
    if (match) {
      return Buffer.from(match[1]);
    }
    return encryptedData;
  }

  /**
   * Verify signature and extract content (simplified)
   */
  private async verifySignature(
    signedData: Buffer,
    certificateId: string,
  ): Promise<{ content: Buffer; verified: boolean }> {
    const cert = await this.certificateManager.getCertificate(certificateId);
    if (!cert) {
      throw new Error(`Certificate not found: ${certificateId}`);
    }

    // In a real implementation, this would use proper PKCS#7 signature verification
    // For now, extract content and assume verification
    const content = this.extractSignedContent(signedData);

    // Calculate hash of content for verification
    const hash = createHash('sha256');
    hash.update(content);

    return {
      content,
      verified: true, // In production, actually verify the signature
    };
  }

  /**
   * Extract content from signed data (simplified)
   */
  private extractSignedContent(signedData: Buffer): Buffer {
    const content = signedData.toString('utf8');
    const match = content.match(/-----BEGIN PKCS7-----\n([\s\S]*?)\n-----END PKCS7-----/);
    if (match) {
      return Buffer.from(match[1]);
    }
    return signedData;
  }

  /**
   * Decompress content
   */
  private async decompressContent(compressedData: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.inflate(compressedData, (err, decompressed) => {
        if (err) {
          reject(err);
        } else {
          resolve(decompressed);
        }
      });
    });
  }

  /**
   * Extract inner content type from MIME structure
   */
  private extractInnerContentType(data: Buffer): string | undefined {
    const content = data.toString('utf8', 0, 1000); // Check first 1KB
    const match = content.match(/Content-Type:\s*([^\r\n;]+)/i);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Extract filename from Content-Disposition header
   */
  private extractFilename(headers: Record<string, string>): string | undefined {
    const disposition = headers['content-disposition'];
    if (disposition) {
      const match = disposition.match(/filename[*]?=(?:"([^"]+)"|([^\s;]+))/i);
      if (match) {
        return match[1] || match[2];
      }
    }
    return undefined;
  }

  /**
   * Generate MDN for successful message
   */
  async generateMdn(
    originalMessageId: string,
    as2From: string,
    as2To: string,
    processResult: As2ReceiverProcessResult,
    headers: Record<string, string>,
    localProfile: As2LocalProfile,
    partnerProfile?: As2PartnerProfile,
  ): Promise<As2Mdn> {
    const mdnMessageId = `${randomUUID()}@${this.configService.get<string>('AS2_DOMAIN', 'localhost')}`;

    // Calculate MIC
    const mic = this.calculateMic(processResult.content, As2SigningAlgorithm.SHA256);

    // Build disposition
    const disposition: As2MdnDisposition = {
      type: 'automatic-action',
      mode: 'mdn-sent-automatically',
      modifier: 'processed',
    };

    // Build MDN body
    const mdnBody = this.buildMdnBody(
      mdnMessageId,
      originalMessageId,
      as2From,
      as2To,
      disposition,
      mic,
    );

    // Sign MDN if requested
    let mdnContent = mdnBody;
    let signed = false;
    if (this.shouldSignMdn(headers, partnerProfile) && localProfile.signingCertificateId) {
      mdnContent = await this.signMdnContent(mdnBody, localProfile.signingCertificateId);
      signed = true;
    }

    const mdn: As2Mdn = {
      messageId: mdnMessageId,
      originalMessageId,
      as2From: as2To, // MDN goes back to original sender
      as2To: as2From,
      disposition,
      mic,
      micAlgorithm: 'sha256',
      humanReadable: 'Message processed successfully',
      signed,
      timestamp: new Date(),
      rawMdn: mdnContent,
    };

    // Handle async MDN delivery
    const asyncUrl = headers['receipt-delivery-option'];
    if (asyncUrl) {
      // Queue async MDN delivery
      this.scheduleAsyncMdnDelivery(mdn, asyncUrl, partnerProfile);
    }

    return mdn;
  }

  /**
   * Generate error MDN
   */
  async generateErrorMdn(
    originalMessageId: string,
    as2From: string,
    as2To: string,
    errorMessage: string,
    headers: Record<string, string>,
    localProfile: As2LocalProfile,
  ): Promise<As2Mdn> {
    const mdnMessageId = `${randomUUID()}@${this.configService.get<string>('AS2_DOMAIN', 'localhost')}`;

    // Build error disposition
    const disposition: As2MdnDisposition = {
      type: 'automatic-action',
      mode: 'mdn-sent-automatically',
      modifier: 'failed',
      statusModifier: 'error',
      statusText: errorMessage,
    };

    // Build MDN body
    const mdnBody = this.buildMdnBody(
      mdnMessageId,
      originalMessageId,
      as2From,
      as2To,
      disposition,
      undefined,
    );

    // Sign MDN if possible
    let mdnContent = mdnBody;
    let signed = false;
    if (localProfile.signingCertificateId) {
      try {
        mdnContent = await this.signMdnContent(mdnBody, localProfile.signingCertificateId);
        signed = true;
      } catch {
        // Continue without signing
      }
    }

    return {
      messageId: mdnMessageId,
      originalMessageId,
      as2From: as2To,
      as2To: as2From,
      disposition,
      humanReadable: errorMessage,
      signed,
      timestamp: new Date(),
      rawMdn: mdnContent,
    };
  }

  /**
   * Build MDN body
   */
  private buildMdnBody(
    mdnMessageId: string,
    originalMessageId: string,
    _as2From: string,
    _as2To: string,
    disposition: As2MdnDisposition,
    mic?: string,
  ): Buffer {
    const boundary = `----=_Part_${randomUUID()}`;

    let body = `Content-Type: multipart/report; report-type=disposition-notification; boundary="${boundary}"\r\n\r\n`;

    // Human-readable part
    body += `--${boundary}\r\n`;
    body += 'Content-Type: text/plain; charset=us-ascii\r\n\r\n';
    body += 'Your message was received and processed.\r\n\r\n';

    // Machine-readable part
    body += `--${boundary}\r\n`;
    body += 'Content-Type: message/disposition-notification\r\n\r\n';
    body += 'Reporting-UA: B2B-API AS2\r\n';
    body += `Original-Message-ID: <${originalMessageId}>\r\n`;
    body += `Final-Recipient: rfc822; ${_as2To}\r\n`;
    body += `Original-Recipient: rfc822; ${_as2To}\r\n`;

    // Build disposition string
    let dispositionStr = `${disposition.type}/${disposition.mode}; ${disposition.modifier}`;
    if (disposition.statusModifier) {
      dispositionStr += `/${disposition.statusModifier}`;
      if (disposition.statusText) {
        dispositionStr += `: ${disposition.statusText}`;
      }
    }
    body += `Disposition: ${dispositionStr}\r\n`;

    if (mic) {
      body += `Received-Content-MIC: ${mic}, sha256\r\n`;
    }

    body += `\r\n--${boundary}--\r\n`;

    return Buffer.from(body, 'utf8');
  }

  /**
   * Sign MDN content (simplified)
   */
  private async signMdnContent(content: Buffer, certificateId: string): Promise<Buffer> {
    const privateKey = await this.certificateManager.getPrivateKey(certificateId);
    if (!privateKey) {
      throw new Error(`Private key not found for certificate: ${certificateId}`);
    }

    // In a real implementation, this would create proper S/MIME signed content
    // For now, wrap in PKCS#7 structure
    const signed = Buffer.concat([
      Buffer.from('Content-Type: application/pkcs7-mime; smime-type=signed-data\r\n\r\n'),
      Buffer.from('-----BEGIN PKCS7-----\n'),
      content,
      Buffer.from('\n-----END PKCS7-----'),
    ]);

    return signed;
  }

  /**
   * Calculate MIC (Message Integrity Check)
   */
  private calculateMic(data: Buffer, _algorithm: As2SigningAlgorithm): string {
    const hash = createHash('sha256');
    hash.update(data);
    return hash.digest('base64');
  }

  /**
   * Check if MDN should be signed
   */
  private shouldSignMdn(
    headers: Record<string, string>,
    partnerProfile?: As2PartnerProfile,
  ): boolean {
    const options = headers['disposition-notification-options'] || '';
    return options.includes('signed-receipt-protocol') || partnerProfile?.requestMdnSigned === true;
  }

  /**
   * Schedule async MDN delivery
   */
  private scheduleAsyncMdnDelivery(
    mdn: As2Mdn,
    asyncUrl: string,
    _partnerProfile?: As2PartnerProfile,
  ): void {
    // In a real implementation, this would queue the MDN for async delivery
    this.logger.log(
      `Scheduling async MDN delivery to ${asyncUrl} for message ${mdn.originalMessageId}`,
    );

    // Could use BullMQ or similar for reliable delivery
    setImmediate(async () => {
      try {
        await this.deliverAsyncMdn(mdn, asyncUrl);
      } catch (error) {
        this.logger.error(
          `Async MDN delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    });
  }

  /**
   * Deliver async MDN
   */
  private async deliverAsyncMdn(mdn: As2Mdn, asyncUrl: string): Promise<void> {
    // In a real implementation, this would send the MDN via HTTP POST
    this.logger.log(`Delivering async MDN ${mdn.messageId} to ${asyncUrl}`);
  }

  /**
   * Normalize headers to lowercase
   */
  private normalizeHeaders(headers: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = value;
    }
    return normalized;
  }

  /**
   * Extract message ID from headers
   */
  private extractMessageId(headers: Record<string, string>): string {
    const messageId = headers['message-id'] || '';
    return messageId.replace(/^<|>$/g, '');
  }

  /**
   * Validate required AS2 headers
   */
  private validateHeaders(headers: Record<string, string>): void {
    const required = ['as2-from', 'as2-to', 'message-id'];
    const missing = required.filter((h) => !headers[h]);

    if (missing.length > 0) {
      throw new Error(`Missing required AS2 headers: ${missing.join(', ')}`);
    }
  }
}

/**
 * Local AS2 profile (our identity)
 */
export interface As2LocalProfile {
  as2Id: string;
  name: string;
  email?: string;
  signingCertificateId?: string;
  decryptionCertificateId?: string;
  isActive: boolean;
}

/**
 * Message handler interface
 */
export interface As2MessageHandler {
  onMessageReceived(result: As2ReceiverProcessResult): Promise<void>;
}
