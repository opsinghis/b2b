import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { CfdiCsdCertificate, CfdiComprobante } from '../interfaces';
import { CfdiXmlGeneratorService } from './cfdi-xml-generator.service';

/**
 * Certificate Parsing Result
 */
export interface CertificateInfo {
  /** Certificate serial number (hex) */
  serialNumber: string;
  /** Certificate number (SAT format - 20 digits) */
  noCertificado: string;
  /** Subject RFC */
  rfc: string;
  /** Subject name */
  nombre: string;
  /** Valid from date */
  validFrom: Date;
  /** Valid to date */
  validTo: Date;
  /** Is currently valid */
  isValid: boolean;
  /** Certificate in base64 (for XML) */
  certificadoBase64: string;
}

/**
 * Seal (Sello) Result
 */
export interface SealResult {
  /** Success indicator */
  success: boolean;
  /** Digital seal (base64) */
  sello?: string;
  /** Original string used */
  cadenaOriginal?: string;
  /** Error message */
  error?: string;
}

/**
 * CFDI Digital Signature Service
 *
 * Handles CSD (Certificado de Sello Digital) certificate management
 * and XML document signing for CFDI 4.0 compliance.
 *
 * Uses RSA-SHA256 for digital signatures as required by SAT.
 */
@Injectable()
export class CfdiSignatureService {
  private readonly logger = new Logger(CfdiSignatureService.name);

  constructor(private readonly xmlGenerator: CfdiXmlGeneratorService) {}

  /**
   * Parse a CSD certificate (.cer file)
   */
  parseCertificate(certificateBuffer: Buffer): CertificateInfo {
    this.logger.debug('Parsing CSD certificate');

    try {
      // Convert DER to PEM if needed
      const pem = this.derToPem(certificateBuffer);

      // Parse using crypto
      const cert = new crypto.X509Certificate(pem);

      // Extract serial number (SAT certificate number is serial in decimal, padded to 20 digits)
      const serialHex = cert.serialNumber;
      const serialDecimal = BigInt('0x' + serialHex).toString();
      const noCertificado = serialDecimal.padStart(20, '0');

      // Extract subject info
      const subject = cert.subject;
      const rfcMatch = subject.match(/2\.5\.4\.45=([A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3})/);
      const rfc = rfcMatch ? rfcMatch[1] : this.extractRfcFromSubject(subject);
      const nombreMatch = subject.match(/CN=([^,]+)/);
      const nombre = nombreMatch ? nombreMatch[1] : '';

      // Validity dates
      const validFrom = new Date(cert.validFrom);
      const validTo = new Date(cert.validTo);
      const now = new Date();
      const isValid = now >= validFrom && now <= validTo;

      // Base64 encode certificate for XML
      const certificadoBase64 = certificateBuffer.toString('base64');

      return {
        serialNumber: serialHex,
        noCertificado,
        rfc,
        nombre,
        validFrom,
        validTo,
        isValid,
        certificadoBase64,
      };
    } catch (error) {
      this.logger.error('Failed to parse certificate', error);
      throw new Error(
        `Failed to parse CSD certificate: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Parse a private key (.key file)
   */
  parsePrivateKey(keyBuffer: Buffer, password: string): crypto.KeyObject {
    this.logger.debug('Parsing private key');

    try {
      // SAT .key files are PKCS#8 DER encrypted
      const keyPem = this.derToPkcs8Pem(keyBuffer);

      const privateKey = crypto.createPrivateKey({
        key: keyPem,
        format: 'pem',
        passphrase: password,
      });

      return privateKey;
    } catch (error) {
      this.logger.error('Failed to parse private key', error);
      throw new Error(
        `Failed to parse private key: ${error instanceof Error ? error.message : 'Invalid password or key format'}`,
      );
    }
  }

  /**
   * Validate a CSD certificate against a private key
   */
  validateCsdPair(
    certificateBuffer: Buffer,
    keyBuffer: Buffer,
    password: string,
  ): { valid: boolean; error?: string } {
    try {
      const certInfo = this.parseCertificate(certificateBuffer);
      const privateKey = this.parsePrivateKey(keyBuffer, password);

      if (!certInfo.isValid) {
        return {
          valid: false,
          error: `Certificate expired. Valid from ${certInfo.validFrom.toISOString()} to ${certInfo.validTo.toISOString()}`,
        };
      }

      // Test signature
      const testData = 'test-signature-validation';
      const sign = crypto.createSign('SHA256');
      sign.update(testData);
      const signature = sign.sign(privateKey);

      // Verify with certificate public key
      const pem = this.derToPem(certificateBuffer);
      const cert = new crypto.X509Certificate(pem);
      const publicKey = cert.publicKey;

      const verify = crypto.createVerify('SHA256');
      verify.update(testData);
      const isValid = verify.verify(publicKey, signature);

      if (!isValid) {
        return {
          valid: false,
          error: 'Certificate and private key do not match',
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Seal (sign) a CFDI document
   */
  sealComprobante(comprobante: CfdiComprobante, csd: CfdiCsdCertificate): SealResult {
    this.logger.debug(`Sealing CFDI ${comprobante.serie || ''}${comprobante.folio || ''}`);

    try {
      // Parse certificate
      const certBuffer = Buffer.from(csd.certificado, 'base64');
      const certInfo = this.parseCertificate(certBuffer);

      if (!certInfo.isValid) {
        return {
          success: false,
          error: 'CSD certificate has expired',
        };
      }

      // Validate RFC matches
      if (certInfo.rfc !== comprobante.emisor.rfc) {
        return {
          success: false,
          error: `Certificate RFC (${certInfo.rfc}) does not match issuer RFC (${comprobante.emisor.rfc})`,
        };
      }

      // Parse private key
      const keyBuffer = Buffer.from(csd.privateKey, 'base64');
      const privateKey = this.parsePrivateKey(keyBuffer, csd.password);

      // Generate cadena original
      const cadenaOriginal = this.xmlGenerator.generateCadenaOriginal(comprobante);

      // Sign with RSA-SHA256
      const sign = crypto.createSign('SHA256');
      sign.update(cadenaOriginal, 'utf8');
      const signature = sign.sign(privateKey);

      // Convert to base64
      const sello = signature.toString('base64');

      return {
        success: true,
        sello,
        cadenaOriginal,
      };
    } catch (error) {
      this.logger.error('Failed to seal CFDI', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to seal CFDI',
      };
    }
  }

  /**
   * Add seal and certificate to comprobante
   */
  applySignature(
    comprobante: CfdiComprobante,
    csd: CfdiCsdCertificate,
  ): {
    success: boolean;
    comprobante?: CfdiComprobante;
    cadenaOriginal?: string;
    error?: string;
  } {
    try {
      // Parse certificate for number
      const certBuffer = Buffer.from(csd.certificado, 'base64');
      const certInfo = this.parseCertificate(certBuffer);

      // Create a copy with certificate info
      const signedComprobante: CfdiComprobante = {
        ...comprobante,
        noCertificado: certInfo.noCertificado,
        certificado: certInfo.certificadoBase64,
      };

      // Generate seal
      const sealResult = this.sealComprobante(signedComprobante, csd);
      if (!sealResult.success) {
        return {
          success: false,
          error: sealResult.error,
        };
      }

      // Apply seal
      signedComprobante.sello = sealResult.sello;

      return {
        success: true,
        comprobante: signedComprobante,
        cadenaOriginal: sealResult.cadenaOriginal,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply signature',
      };
    }
  }

  /**
   * Verify a sealed CFDI's signature
   */
  verifySignature(
    xml: string,
    certificado: string,
    sello: string,
    cadenaOriginal: string,
  ): boolean {
    try {
      const certBuffer = Buffer.from(certificado, 'base64');
      const pem = this.derToPem(certBuffer);
      const cert = new crypto.X509Certificate(pem);
      const publicKey = cert.publicKey;

      const signatureBuffer = Buffer.from(sello, 'base64');

      const verify = crypto.createVerify('SHA256');
      verify.update(cadenaOriginal, 'utf8');

      return verify.verify(publicKey, signatureBuffer);
    } catch (error) {
      this.logger.error('Signature verification failed', error);
      return false;
    }
  }

  /**
   * Generate QR code string for CFDI (VERIFICATION_URL)
   */
  generateQrString(
    uuid: string,
    rfcEmisor: string,
    rfcReceptor: string,
    total: number,
    sello: string,
  ): string {
    // Last 8 characters of sello
    const selloLast8 = sello.slice(-8);

    // Format: https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=UUID&re=RFCE&rr=RFCR&tt=TOTAL&fe=SELLO8
    const totalFormatted = total.toFixed(6).padStart(17, '0');

    return (
      `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?` +
      `id=${uuid}&re=${rfcEmisor}&rr=${rfcReceptor}&tt=${totalFormatted}&fe=${selloLast8}`
    );
  }

  /**
   * Convert DER-encoded certificate to PEM
   */
  private derToPem(derBuffer: Buffer): string {
    const base64 = derBuffer.toString('base64');
    const lines = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`;
  }

  /**
   * Convert DER-encoded PKCS#8 private key to PEM
   */
  private derToPkcs8Pem(derBuffer: Buffer): string {
    const base64 = derBuffer.toString('base64');
    const lines = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN ENCRYPTED PRIVATE KEY-----\n${lines.join('\n')}\n-----END ENCRYPTED PRIVATE KEY-----`;
  }

  /**
   * Extract RFC from certificate subject string
   */
  private extractRfcFromSubject(subject: string): string {
    // Try different patterns
    const patterns = [
      /OU=([A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3})/,
      /serialNumber=([A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3})/,
      /\/([A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3})\//,
    ];

    for (const pattern of patterns) {
      const match = subject.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Last resort: look for RFC-like pattern anywhere
    const rfcPattern = /([A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3})/;
    const match = subject.match(rfcPattern);
    return match ? match[1] : '';
  }

  /**
   * Generate test/demo CSD for development
   * WARNING: Do not use in production!
   */
  generateTestCsd(rfc: string, _nombre: string): CfdiCsdCertificate {
    this.logger.warn('Generating test CSD - DO NOT USE IN PRODUCTION');

    // Generate a key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: 'test123',
      },
    });

    // Create a simple self-signed certificate (NOT SAT-compliant, for testing only)
    const serialNumber = Date.now().toString().padStart(20, '0');

    return {
      noCertificado: serialNumber,
      certificado: Buffer.from(publicKey).toString('base64'),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      rfcEmisor: rfc,
      privateKey: Buffer.from(privateKey).toString('base64'),
      password: 'test123',
    };
  }
}
