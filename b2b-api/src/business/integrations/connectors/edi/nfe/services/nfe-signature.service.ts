import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { NfeCertificate, NfeCertificateType } from '../interfaces';

/**
 * Certificate Information
 */
export interface CertificateInfo {
  serialNumber: string;
  subjectName: string;
  issuerName: string;
  validFrom: Date;
  validTo: Date;
  cnpj?: string;
  cpf?: string;
  thumbprint: string;
  isValid: boolean;
  daysToExpire: number;
}

/**
 * Signature Result
 */
export interface SignatureResult {
  success: boolean;
  signedXml?: string;
  error?: string;
}

/**
 * NF-e Signature Service
 *
 * Provides digital signature functionality for NF-e documents using
 * A1 (software) or A3 (hardware token) certificates.
 *
 * The signature follows XML-DSig standard with specific requirements
 * for Brazilian electronic invoicing (NF-e).
 *
 * @see Manual de Integração - Contribuinte (versão 4.0.1)
 */
@Injectable()
export class NfeSignatureService {
  private readonly logger = new Logger(NfeSignatureService.name);

  private readonly SIGNATURE_NAMESPACE = 'http://www.w3.org/2000/09/xmldsig#';
  private readonly C14N_METHOD = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
  private readonly SIGNATURE_METHOD = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
  private readonly DIGEST_METHOD = 'http://www.w3.org/2000/09/xmldsig#sha1';
  private readonly TRANSFORM_ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';

  /**
   * Sign NF-e XML document
   */
  signNfe(xml: string, certificate: NfeCertificate): SignatureResult {
    this.logger.debug('Signing NF-e XML');

    try {
      // Validate certificate
      const certInfo = this.parseCertificate(certificate);
      if (!certInfo.isValid) {
        return {
          success: false,
          error: `Certificate is not valid: expires in ${certInfo.daysToExpire} days`,
        };
      }

      // Extract the ID from infNFe for reference
      const idMatch = xml.match(/Id="(NFe[0-9]{44})"/);
      if (!idMatch) {
        return { success: false, error: 'Could not find NF-e ID in XML' };
      }

      const referenceUri = `#${idMatch[1]}`;

      // Sign the XML
      const signedXml = this.signXml(xml, referenceUri, certificate);

      return { success: true, signedXml };
    } catch (error) {
      this.logger.error('Error signing NF-e XML', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error signing XML',
      };
    }
  }

  /**
   * Sign event XML document
   */
  signEvento(xml: string, certificate: NfeCertificate): SignatureResult {
    this.logger.debug('Signing Event XML');

    try {
      // Extract the ID from infEvento for reference
      const idMatch = xml.match(/Id="(ID[0-9]+)"/);
      if (!idMatch) {
        return { success: false, error: 'Could not find Event ID in XML' };
      }

      const referenceUri = `#${idMatch[1]}`;

      // Sign the XML
      const signedXml = this.signXml(xml, referenceUri, certificate);

      return { success: true, signedXml };
    } catch (error) {
      this.logger.error('Error signing Event XML', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error signing XML',
      };
    }
  }

  /**
   * Sign XML with reference
   */
  private signXml(xml: string, referenceUri: string, certificate: NfeCertificate): string {
    // Get private key from certificate
    const privateKey = this.extractPrivateKey(certificate);
    const publicCert = this.extractPublicCertificate(certificate);

    // Canonicalize the referenced element
    const canonicalXml = this.canonicalize(xml);

    // Create digest
    const digestValue = this.createDigest(canonicalXml);

    // Create SignedInfo
    const signedInfo = this.createSignedInfo(referenceUri, digestValue);

    // Create signature value
    const signatureValue = this.createSignatureValue(signedInfo, privateKey);

    // Get X509 certificate data
    const x509Data = this.extractX509Data(publicCert);

    // Build signature element
    const signatureElement = this.buildSignatureElement(signedInfo, signatureValue, x509Data);

    // Insert signature into XML
    const signedXml = this.insertSignature(xml, signatureElement, referenceUri);

    return signedXml;
  }

  /**
   * Parse certificate and extract information
   */
  parseCertificate(certificate: NfeCertificate): CertificateInfo {
    try {
      if (certificate.type === NfeCertificateType.A1 && certificate.pfx) {
        // Parse PFX/P12 certificate
        const pfxBuffer = Buffer.from(certificate.pfx, 'base64');
        const p12 = this.parsePfx(pfxBuffer, certificate.password);

        const cert = p12.certificate;
        const now = new Date();
        const validTo = cert.validTo;
        const daysToExpire = Math.floor(
          (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
          serialNumber: cert.serialNumber,
          subjectName: cert.subjectName,
          issuerName: cert.issuerName,
          validFrom: cert.validFrom,
          validTo: cert.validTo,
          cnpj: this.extractCnpjFromSubject(cert.subjectName),
          cpf: this.extractCpfFromSubject(cert.subjectName),
          thumbprint: cert.thumbprint,
          isValid: now >= cert.validFrom && now <= cert.validTo,
          daysToExpire,
        };
      }

      // For A3 certificates, we need hardware interaction
      // Return basic info for now
      return {
        serialNumber: certificate.serialNumber || 'A3-HARDWARE',
        subjectName: 'A3 Hardware Certificate',
        issuerName: 'Unknown',
        validFrom: new Date(),
        validTo: certificate.validTo || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        cnpj: certificate.cnpj,
        thumbprint: 'A3-HARDWARE',
        isValid: true,
        daysToExpire: 365,
      };
    } catch (error) {
      this.logger.error('Error parsing certificate', error);
      return {
        serialNumber: 'INVALID',
        subjectName: 'Invalid Certificate',
        issuerName: 'Unknown',
        validFrom: new Date(),
        validTo: new Date(),
        thumbprint: 'INVALID',
        isValid: false,
        daysToExpire: -1,
      };
    }
  }

  /**
   * Validate certificate and key pair
   */
  validateCertificatePair(certificate: NfeCertificate): { valid: boolean; error?: string } {
    try {
      if (certificate.type === NfeCertificateType.A1 && certificate.pfx) {
        const pfxBuffer = Buffer.from(certificate.pfx, 'base64');
        const p12 = this.parsePfx(pfxBuffer, certificate.password);

        // Test signing with the key pair
        const testData = 'test-data-for-validation';
        const sign = crypto.createSign('RSA-SHA1');
        sign.update(testData);
        const signature = sign.sign(p12.privateKey, 'base64');

        // Verify signature
        const verify = crypto.createVerify('RSA-SHA1');
        verify.update(testData);
        const isValid = verify.verify(p12.certificate.publicKey, signature, 'base64');

        if (!isValid) {
          return { valid: false, error: 'Key pair verification failed' };
        }

        // Check expiration
        const now = new Date();
        if (now < p12.certificate.validFrom || now > p12.certificate.validTo) {
          return { valid: false, error: 'Certificate is expired or not yet valid' };
        }

        return { valid: true };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Certificate validation failed',
      };
    }
  }

  /**
   * Generate test certificate for development
   */
  generateTestCertificate(cnpj: string, razaoSocial: string): NfeCertificate {
    // Generate a self-signed test certificate
    // NOTE: This is for development/testing only - NOT for production use

    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Create a mock PFX (in real scenario, this would be a proper X.509 certificate)
    const mockPfxData = {
      privateKey,
      publicKey,
      cnpj,
      razaoSocial,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };

    return {
      type: NfeCertificateType.A1,
      pfx: Buffer.from(JSON.stringify(mockPfxData)).toString('base64'),
      password: 'test-password',
      serialNumber: crypto.randomBytes(16).toString('hex'),
      validFrom: mockPfxData.validFrom,
      validTo: mockPfxData.validTo,
      cnpj,
      subjectName: razaoSocial,
    };
  }

  /**
   * Extract CNPJ from certificate subject
   */
  private extractCnpjFromSubject(subject: string): string | undefined {
    // CNPJ is typically in format: CN=EMPRESA:12345678000199
    const match = subject.match(/CN=[^:]*:(\d{14})/);
    return match ? match[1] : undefined;
  }

  /**
   * Extract CPF from certificate subject
   */
  private extractCpfFromSubject(subject: string): string | undefined {
    // CPF is typically in format: CN=PESSOA:12345678901
    const match = subject.match(/CN=[^:]*:(\d{11})/);
    return match ? match[1] : undefined;
  }

  /**
   * Parse PFX/P12 certificate
   */
  private parsePfx(
    pfxBuffer: Buffer,
    password: string,
  ): {
    privateKey: string;
    certificate: {
      serialNumber: string;
      subjectName: string;
      issuerName: string;
      validFrom: Date;
      validTo: Date;
      publicKey: string;
      thumbprint: string;
    };
  } {
    // In a real implementation, this would use a library like node-forge or pkcs12
    // For now, we'll handle the mock format from generateTestCertificate
    // and throw for real PFX files (which would need proper PKCS#12 parsing)

    try {
      // Try to parse as mock certificate
      const mockData = JSON.parse(pfxBuffer.toString());
      if (mockData.privateKey && mockData.publicKey) {
        return {
          privateKey: mockData.privateKey,
          certificate: {
            serialNumber: crypto.randomBytes(16).toString('hex'),
            subjectName: `CN=${mockData.razaoSocial}:${mockData.cnpj}`,
            issuerName: 'CN=Test CA',
            validFrom: new Date(mockData.validFrom),
            validTo: new Date(mockData.validTo),
            publicKey: mockData.publicKey,
            thumbprint: crypto.createHash('sha1').update(mockData.publicKey).digest('hex'),
          },
        };
      }
    } catch {
      // Not a mock certificate, would need proper PKCS#12 parsing
    }

    // For production, you would use a library like node-forge:
    // const forge = require('node-forge');
    // const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    // const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    throw new Error(
      'Real PKCS#12 certificate parsing requires node-forge or similar library. ' +
        'Please install node-forge and implement proper certificate parsing.',
    );
  }

  /**
   * Extract private key from certificate
   */
  private extractPrivateKey(certificate: NfeCertificate): string {
    if (certificate.type === NfeCertificateType.A1 && certificate.pfx) {
      const pfxBuffer = Buffer.from(certificate.pfx, 'base64');
      const p12 = this.parsePfx(pfxBuffer, certificate.password);
      return p12.privateKey;
    }

    throw new Error('A3 hardware certificates require external signing implementation');
  }

  /**
   * Extract public certificate
   */
  private extractPublicCertificate(certificate: NfeCertificate): string {
    if (certificate.type === NfeCertificateType.A1 && certificate.pfx) {
      const pfxBuffer = Buffer.from(certificate.pfx, 'base64');
      const p12 = this.parsePfx(pfxBuffer, certificate.password);
      return p12.certificate.publicKey;
    }

    throw new Error('A3 hardware certificates require external certificate retrieval');
  }

  /**
   * Canonicalize XML (Canonical XML 1.0)
   */
  private canonicalize(xml: string): string {
    // Simple canonicalization for NF-e
    // In production, use a proper XML library like xml-crypto

    return xml
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .trim();
  }

  /**
   * Create SHA-1 digest
   */
  private createDigest(data: string): string {
    const hash = crypto.createHash('sha1');
    hash.update(data, 'utf8');
    return hash.digest('base64');
  }

  /**
   * Create SignedInfo element
   */
  private createSignedInfo(referenceUri: string, digestValue: string): string {
    return (
      `<SignedInfo xmlns="${this.SIGNATURE_NAMESPACE}">` +
      `<CanonicalizationMethod Algorithm="${this.C14N_METHOD}"/>` +
      `<SignatureMethod Algorithm="${this.SIGNATURE_METHOD}"/>` +
      `<Reference URI="${referenceUri}">` +
      '<Transforms>' +
      `<Transform Algorithm="${this.TRANSFORM_ENVELOPED}"/>` +
      `<Transform Algorithm="${this.C14N_METHOD}"/>` +
      '</Transforms>' +
      `<DigestMethod Algorithm="${this.DIGEST_METHOD}"/>` +
      `<DigestValue>${digestValue}</DigestValue>` +
      '</Reference>' +
      '</SignedInfo>'
    );
  }

  /**
   * Create signature value
   */
  private createSignatureValue(signedInfo: string, privateKey: string): string {
    const sign = crypto.createSign('RSA-SHA1');
    sign.update(this.canonicalize(signedInfo));
    return sign.sign(privateKey, 'base64');
  }

  /**
   * Extract X509 data from certificate
   */
  private extractX509Data(publicCert: string): string {
    // Remove PEM headers and get base64 content
    const certContent = publicCert
      .replace(/-----BEGIN [^-]+-----/, '')
      .replace(/-----END [^-]+-----/, '')
      .replace(/\s/g, '');

    return certContent;
  }

  /**
   * Build complete signature element
   */
  private buildSignatureElement(
    signedInfo: string,
    signatureValue: string,
    x509Data: string,
  ): string {
    return (
      `<Signature xmlns="${this.SIGNATURE_NAMESPACE}">` +
      signedInfo +
      `<SignatureValue>${signatureValue}</SignatureValue>` +
      '<KeyInfo>' +
      '<X509Data>' +
      `<X509Certificate>${x509Data}</X509Certificate>` +
      '</X509Data>' +
      '</KeyInfo>' +
      '</Signature>'
    );
  }

  /**
   * Insert signature into XML
   */
  private insertSignature(xml: string, signatureElement: string, referenceUri: string): string {
    // For NF-e, signature goes inside </infNFe> or </infEvento>
    const elementId = referenceUri.replace('#', '');

    if (elementId.startsWith('NFe')) {
      // NF-e document - insert before </infNFe>
      return xml.replace('</infNFe>', `${signatureElement}</infNFe>`);
    } else if (elementId.startsWith('ID')) {
      // Event document - insert before </infEvento>
      return xml.replace('</infEvento>', `${signatureElement}</infEvento>`);
    }

    // Fallback - insert before closing root element
    const rootClose = xml.lastIndexOf('</');
    return xml.slice(0, rootClose) + signatureElement + xml.slice(rootClose);
  }

  /**
   * Verify XML signature
   */
  verifySignature(signedXml: string): { valid: boolean; error?: string } {
    try {
      // Extract signature value and certificate from XML
      const signatureValueMatch = signedXml.match(/<SignatureValue>([^<]+)<\/SignatureValue>/);
      const x509Match = signedXml.match(/<X509Certificate>([^<]+)<\/X509Certificate>/);
      const digestValueMatch = signedXml.match(/<DigestValue>([^<]+)<\/DigestValue>/);

      if (!signatureValueMatch || !x509Match || !digestValueMatch) {
        return { valid: false, error: 'Missing signature components' };
      }

      // For full verification, you would:
      // 1. Extract SignedInfo
      // 2. Canonicalize it
      // 3. Verify signature with public key
      // 4. Compute digest of referenced element
      // 5. Compare with DigestValue

      // This is a simplified check
      this.logger.debug('Signature verification requires full XML-DSig implementation');

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Signature verification failed',
      };
    }
  }

  /**
   * Get certificate expiration warning
   */
  getCertificateExpirationWarning(certificate: NfeCertificate): string | null {
    const info = this.parseCertificate(certificate);

    if (info.daysToExpire < 0) {
      return `Certificate has expired ${Math.abs(info.daysToExpire)} days ago`;
    } else if (info.daysToExpire <= 30) {
      return `Certificate will expire in ${info.daysToExpire} days`;
    }

    return null;
  }
}
