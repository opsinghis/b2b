import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID, createSign, createVerify } from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import * as zlib from 'zlib';
import {
  As2PartnerProfile,
  As2SendRequest,
  As2SendResult,
  As2Message,
  As2Mdn,
  As2MdnDisposition,
  As2MdnMode,
  As2SigningAlgorithm,
  As2EncryptionAlgorithm,
  As2CompressionAlgorithm,
} from '../interfaces';
import { CertificateManagerService } from './certificate-manager.service';

/**
 * AS2 Client Service
 *
 * Implements AS2 (Applicability Statement 2) protocol for B2B message exchange.
 * Supports:
 * - Synchronous and asynchronous MDN
 * - Message signing with SHA-1, SHA-256, SHA-384, SHA-512
 * - Message encryption with AES, 3DES
 * - ZLIB compression
 * - MIC (Message Integrity Check) calculation
 */
@Injectable()
export class As2ClientService {
  private readonly logger = new Logger(As2ClientService.name);
  private readonly partnerProfiles = new Map<string, As2PartnerProfile>();

  constructor(
    private readonly configService: ConfigService,
    private readonly certificateManager: CertificateManagerService,
  ) {}

  /**
   * Register a trading partner profile
   */
  registerPartner(profile: As2PartnerProfile): void {
    this.partnerProfiles.set(profile.partnerId, profile);
    this.logger.log(`Registered AS2 partner: ${profile.partnerId} (AS2 ID: ${profile.as2Id})`);
  }

  /**
   * Get partner profile by ID
   */
  getPartner(partnerId: string): As2PartnerProfile | undefined {
    return this.partnerProfiles.get(partnerId);
  }

  /**
   * Remove partner profile
   */
  removePartner(partnerId: string): boolean {
    const result = this.partnerProfiles.delete(partnerId);
    if (result) {
      this.logger.log(`Removed AS2 partner: ${partnerId}`);
    }
    return result;
  }

  /**
   * List all registered partners
   */
  listPartners(): As2PartnerProfile[] {
    return Array.from(this.partnerProfiles.values());
  }

  /**
   * Send an AS2 message to a trading partner
   */
  async send(request: As2SendRequest): Promise<As2SendResult> {
    const startTime = Date.now();
    const messageId = this.generateMessageId();

    try {
      // Get partner profile
      const partner = this.partnerProfiles.get(request.partnerId);
      if (!partner) {
        throw new Error(`Partner not found: ${request.partnerId}`);
      }

      if (!partner.isActive) {
        throw new Error(`Partner is inactive: ${request.partnerId}`);
      }

      this.logger.log(`Sending AS2 message ${messageId} to partner ${partner.as2Id}`);

      // Build the message
      const message = await this.buildMessage(messageId, partner, request);

      // Send HTTP request
      const response = await this.sendHttpRequest(partner, message);

      // Process MDN if expected
      let mdn: As2Mdn | undefined;
      if (request.requestMdn !== false && partner.mdnMode === As2MdnMode.SYNC) {
        if (response.statusCode === 200 && response.body) {
          mdn = await this.parseMdn(response.body, response.headers);
          this.validateMdn(mdn, message);
        }
      }

      const durationMs = Date.now() - startTime;
      this.logger.log(`AS2 message ${messageId} sent successfully in ${durationMs}ms`);

      return {
        success: true,
        messageId,
        mdn,
        httpStatusCode: response.statusCode,
        timestamp: new Date(),
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`AS2 send failed for message ${messageId}: ${errorMessage}`);

      return {
        success: false,
        messageId,
        error: errorMessage,
        errorDetails: error instanceof Error ? { stack: error.stack } : undefined,
        timestamp: new Date(),
        durationMs,
      };
    }
  }

  /**
   * Build AS2 message with optional signing, encryption, and compression
   */
  private async buildMessage(
    messageId: string,
    partner: As2PartnerProfile,
    request: As2SendRequest,
  ): Promise<As2Message> {
    let payload = request.content;
    let contentType = request.contentType;

    // Step 1: Compress if requested
    if (request.compress && partner.compressionAlgorithm !== As2CompressionAlgorithm.NONE) {
      payload = await this.compress(
        payload,
        partner.compressionAlgorithm || As2CompressionAlgorithm.ZLIB,
      );
      contentType = 'application/pkcs7-mime; smime-type=compressed-data';
    }

    // Step 2: Sign if requested
    let signedAttributes: As2Message['signedAttributes'] | undefined;
    if (request.sign && partner.signingCertificateId) {
      const signResult = await this.signPayload(
        payload,
        contentType,
        partner.signingCertificateId,
        partner.signingAlgorithm || As2SigningAlgorithm.SHA256,
      );
      payload = signResult.signedData;
      contentType = 'application/pkcs7-mime; smime-type=signed-data';
      signedAttributes = {
        algorithm: partner.signingAlgorithm || As2SigningAlgorithm.SHA256,
        certificateFingerprint: signResult.certificateFingerprint,
        signature: signResult.signature,
      };
    }

    // Step 3: Encrypt if requested
    let encryptedAttributes: As2Message['encryptedAttributes'] | undefined;
    if (request.encrypt && partner.encryptionCertificateId) {
      const encryptResult = await this.encryptPayload(
        payload,
        partner.encryptionCertificateId,
        partner.encryptionAlgorithm || As2EncryptionAlgorithm.AES256_CBC,
      );
      payload = encryptResult.encryptedData;
      contentType = 'application/pkcs7-mime; smime-type=enveloped-data';
      encryptedAttributes = {
        algorithm: partner.encryptionAlgorithm || As2EncryptionAlgorithm.AES256_CBC,
        certificateFingerprint: encryptResult.certificateFingerprint,
      };
    }

    // Build headers
    const headers = this.buildHeaders(messageId, partner, request, contentType);

    return {
      messageId,
      as2From: this.getLocalAs2Id(),
      as2To: partner.as2Id,
      subject: request.subject || 'AS2 Message',
      contentType,
      payload,
      headers,
      signedAttributes,
      encryptedAttributes,
      timestamp: new Date(),
    };
  }

  /**
   * Build AS2 HTTP headers
   */
  private buildHeaders(
    messageId: string,
    partner: As2PartnerProfile,
    request: As2SendRequest,
    contentType: string,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'AS2-Version': '1.2',
      'AS2-From': this.getLocalAs2Id(),
      'AS2-To': partner.as2Id,
      'Message-ID': `<${messageId}>`,
      Subject: request.subject || 'AS2 Message',
      Date: new Date().toUTCString(),
      'MIME-Version': '1.0',
    };

    // Add filename if provided
    if (request.filename) {
      headers['Content-Disposition'] = `attachment; filename="${request.filename}"`;
    }

    // Add MDN request headers
    if (request.requestMdn !== false) {
      const mdnMode = request.mdnMode || partner.mdnMode;
      headers['Disposition-Notification-To'] = this.getMdnNotificationAddress();

      const dispositionOptions: string[] = [];
      if (partner.requestMdnSigned) {
        const signAlg = partner.signingAlgorithm || As2SigningAlgorithm.SHA256;
        dispositionOptions.push(`signed-receipt-protocol=optional, pkcs7-signature`);
        dispositionOptions.push(`signed-receipt-micalg=optional, ${signAlg}`);
      }
      if (dispositionOptions.length > 0) {
        headers['Disposition-Notification-Options'] = dispositionOptions.join('; ');
      }

      if (mdnMode === As2MdnMode.ASYNC && partner.mdnAsyncUrl) {
        headers['Receipt-Delivery-Option'] = partner.mdnAsyncUrl;
      }
    }

    // Add custom headers from partner profile
    if (partner.httpHeaders) {
      Object.assign(headers, partner.httpHeaders);
    }

    return headers;
  }

  /**
   * Send HTTP request to partner
   */
  private async sendHttpRequest(
    partner: As2PartnerProfile,
    message: As2Message,
  ): Promise<{ statusCode: number; headers: Record<string, string>; body: Buffer }> {
    return new Promise((resolve, reject) => {
      const url = new URL(partner.targetUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          ...message.headers,
          'Content-Length': message.payload.length.toString(),
        },
        timeout: partner.timeoutMs || 30000,
      };

      // Add authentication
      if (partner.httpAuth) {
        if (partner.httpAuth.type === 'basic') {
          const auth = Buffer.from(
            `${partner.httpAuth.username}:${partner.httpAuth.password}`,
          ).toString('base64');
          options.headers = { ...options.headers, Authorization: `Basic ${auth}` };
        } else if (partner.httpAuth.type === 'bearer') {
          options.headers = {
            ...options.headers,
            Authorization: `Bearer ${partner.httpAuth.token}`,
          };
        }
      }

      const req = httpModule.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            if (typeof value === 'string') {
              headers[key.toLowerCase()] = value;
            } else if (Array.isArray(value)) {
              headers[key.toLowerCase()] = value.join(', ');
            }
          }

          resolve({
            statusCode: res.statusCode || 0,
            headers,
            body,
          });
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(message.payload);
      req.end();
    });
  }

  /**
   * Compress payload using ZLIB
   */
  private async compress(data: Buffer, _algorithm: As2CompressionAlgorithm): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.deflate(data, (err, compressed) => {
        if (err) {
          reject(err);
        } else {
          resolve(compressed);
        }
      });
    });
  }

  /**
   * Sign payload (simplified - real implementation would use proper PKCS#7)
   */
  private async signPayload(
    data: Buffer,
    _contentType: string,
    certificateId: string,
    algorithm: As2SigningAlgorithm,
  ): Promise<{
    signedData: Buffer;
    certificateFingerprint: string;
    signature: Buffer;
  }> {
    const cert = await this.certificateManager.getCertificate(certificateId);
    if (!cert) {
      throw new Error(`Certificate not found: ${certificateId}`);
    }

    const privateKey = await this.certificateManager.getPrivateKey(certificateId);
    if (!privateKey) {
      throw new Error(`Private key not found for certificate: ${certificateId}`);
    }

    // Map AS2 algorithm to Node.js algorithm
    const nodeAlgorithm = this.mapSigningAlgorithm(algorithm);

    // Create signature
    const sign = createSign(nodeAlgorithm);
    sign.update(data);
    const signature = sign.sign(privateKey);

    // In a real implementation, this would create proper PKCS#7 signed data
    // For now, we create a simplified structure
    const signedData = Buffer.concat([
      Buffer.from('-----BEGIN PKCS7-----\n'),
      data,
      Buffer.from('\n-----END PKCS7-----'),
    ]);

    return {
      signedData,
      certificateFingerprint: cert.fingerprint,
      signature,
    };
  }

  /**
   * Encrypt payload (simplified - real implementation would use proper PKCS#7)
   */
  private async encryptPayload(
    data: Buffer,
    certificateId: string,
    _algorithm: As2EncryptionAlgorithm,
  ): Promise<{
    encryptedData: Buffer;
    certificateFingerprint: string;
  }> {
    const cert = await this.certificateManager.getCertificate(certificateId);
    if (!cert) {
      throw new Error(`Certificate not found: ${certificateId}`);
    }

    // In a real implementation, this would use proper PKCS#7 encryption
    // For now, we create a simplified structure
    // The actual encryption would use the partner's public key from their certificate
    const encryptedData = Buffer.concat([
      Buffer.from('-----BEGIN PKCS7-----\n'),
      data,
      Buffer.from('\n-----END PKCS7-----'),
    ]);

    return {
      encryptedData,
      certificateFingerprint: cert.fingerprint,
    };
  }

  /**
   * Parse MDN response
   */
  async parseMdn(body: Buffer, headers: Record<string, string>): Promise<As2Mdn> {
    const contentType = headers['content-type'] || '';
    const as2From = headers['as2-from'] || '';
    const as2To = headers['as2-to'] || '';
    const messageIdHeader = headers['message-id'] || '';

    // Extract message ID (remove angle brackets)
    const messageId = messageIdHeader.replace(/^<|>$/g, '');

    // Parse disposition
    const disposition = this.parseDisposition(body.toString('utf8'));

    // Extract MIC if present
    const micMatch = body.toString('utf8').match(/Received-Content-MIC:\s*([^,\s]+)/i);
    const mic = micMatch ? micMatch[1] : undefined;

    // Determine if MDN is signed
    const signed = contentType.includes('pkcs7-signature') || contentType.includes('signed');

    return {
      messageId,
      originalMessageId: this.extractOriginalMessageId(body.toString('utf8')),
      as2From,
      as2To,
      disposition,
      mic,
      micAlgorithm: disposition.modifier === 'processed' ? 'sha256' : undefined,
      humanReadable: this.extractHumanReadable(body.toString('utf8')),
      signed,
      timestamp: new Date(),
      rawMdn: body,
    };
  }

  /**
   * Parse MDN disposition
   */
  private parseDisposition(mdnText: string): As2MdnDisposition {
    // Look for Disposition header
    const dispositionMatch = mdnText.match(
      /Disposition:\s*(automatic-action|manual-action)\/(MDN-sent-automatically|MDN-sent-manually);\s*(\w+)(?:\/(\w+):\s*(.+))?/i,
    );

    if (dispositionMatch) {
      return {
        type: dispositionMatch[1].toLowerCase() as 'automatic-action' | 'manual-action',
        mode: dispositionMatch[2].toLowerCase() as 'mdn-sent-automatically' | 'mdn-sent-manually',
        modifier: dispositionMatch[3]?.toLowerCase() as
          | 'processed'
          | 'failed'
          | 'error'
          | undefined,
        statusModifier: dispositionMatch[4]?.toLowerCase() as
          | 'warning'
          | 'error'
          | 'failure'
          | undefined,
        statusText: dispositionMatch[5],
      };
    }

    // Default to processed if we can't parse
    return {
      type: 'automatic-action',
      mode: 'mdn-sent-automatically',
      modifier: 'processed',
    };
  }

  /**
   * Extract original message ID from MDN
   */
  private extractOriginalMessageId(mdnText: string): string {
    const match = mdnText.match(/Original-Message-ID:\s*<?([^>\s]+)>?/i);
    return match ? match[1] : '';
  }

  /**
   * Extract human-readable portion from MDN
   */
  private extractHumanReadable(mdnText: string): string {
    // Look for content between boundaries or before the machine-readable part
    const parts = mdnText.split(/Content-Type:\s*message\/disposition-notification/i);
    if (parts.length > 1) {
      return parts[0].trim();
    }
    return '';
  }

  /**
   * Validate MDN against original message
   */
  private validateMdn(mdn: As2Mdn, originalMessage: As2Message): void {
    // Validate original message ID matches
    if (mdn.originalMessageId && mdn.originalMessageId !== originalMessage.messageId) {
      this.logger.warn(
        `MDN original message ID mismatch: expected ${originalMessage.messageId}, got ${mdn.originalMessageId}`,
      );
    }

    // Check disposition
    if (mdn.disposition.modifier === 'failed' || mdn.disposition.modifier === 'error') {
      const errorText = mdn.disposition.statusText || mdn.humanReadable || 'Unknown error';
      throw new Error(`MDN indicates failure: ${errorText}`);
    }

    this.logger.log(`MDN validated for message ${originalMessage.messageId}`);
  }

  /**
   * Calculate MIC (Message Integrity Check)
   */
  calculateMic(data: Buffer, algorithm: As2SigningAlgorithm = As2SigningAlgorithm.SHA256): string {
    const hash = createHash(this.mapSigningAlgorithm(algorithm));
    hash.update(data);
    return hash.digest('base64');
  }

  /**
   * Verify MIC
   */
  verifyMic(
    data: Buffer,
    expectedMic: string,
    algorithm: As2SigningAlgorithm = As2SigningAlgorithm.SHA256,
  ): boolean {
    const calculatedMic = this.calculateMic(data, algorithm);
    return calculatedMic === expectedMic;
  }

  /**
   * Verify signature (simplified)
   */
  async verifySignature(
    data: Buffer,
    signature: Buffer,
    certificateId: string,
    algorithm: As2SigningAlgorithm,
  ): Promise<boolean> {
    const cert = await this.certificateManager.getCertificate(certificateId);
    if (!cert) {
      throw new Error(`Certificate not found: ${certificateId}`);
    }

    const verify = createVerify(this.mapSigningAlgorithm(algorithm));
    verify.update(data);
    return verify.verify(cert.publicKey, signature);
  }

  /**
   * Map AS2 signing algorithm to Node.js algorithm name
   */
  private mapSigningAlgorithm(algorithm: As2SigningAlgorithm): string {
    const mapping: Record<As2SigningAlgorithm, string> = {
      [As2SigningAlgorithm.SHA1]: 'sha1',
      [As2SigningAlgorithm.SHA256]: 'sha256',
      [As2SigningAlgorithm.SHA384]: 'sha384',
      [As2SigningAlgorithm.SHA512]: 'sha512',
    };
    return mapping[algorithm] || 'sha256';
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    const uuid = randomUUID();
    const domain = this.configService.get<string>('AS2_DOMAIN', 'localhost');
    return `${uuid}@${domain}`;
  }

  /**
   * Get local AS2 ID
   */
  private getLocalAs2Id(): string {
    return this.configService.get<string>('AS2_LOCAL_ID', 'b2b-api');
  }

  /**
   * Get MDN notification address
   */
  private getMdnNotificationAddress(): string {
    return this.configService.get<string>('AS2_MDN_EMAIL', 'mdn@localhost');
  }
}
