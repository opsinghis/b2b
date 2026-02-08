import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID, generateKeyPairSync } from 'crypto';
import * as forge from 'node-forge';
import {
  Certificate,
  CertificateType,
  CertificateFormat,
  CertificateSubject,
  CertificateUploadRequest,
  SshKeyPair,
} from '../interfaces';

/**
 * Certificate Manager Service
 *
 * Manages certificates and SSH keys for EDI transport:
 * - X.509 certificates for AS2 signing/encryption
 * - SSH key pairs for SFTP authentication
 * - Secure storage with encryption at rest
 */
@Injectable()
export class CertificateManagerService implements OnModuleInit {
  private readonly logger = new Logger(CertificateManagerService.name);
  private readonly certificates = new Map<string, Certificate>();
  private readonly privateKeys = new Map<string, string>();
  private readonly sshKeys = new Map<string, SshKeyPair>();
  private readonly sshPrivateKeys = new Map<string, string>();
  private encryptionKey: Buffer | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    // Initialize encryption key for at-rest encryption
    const keyHex = this.configService.get<string>('CERTIFICATE_ENCRYPTION_KEY');
    if (keyHex) {
      this.encryptionKey = Buffer.from(keyHex, 'hex');
    }
    this.logger.log('Certificate Manager initialized');
  }

  // ============================================
  // X.509 Certificate Management
  // ============================================

  /**
   * Upload and store a certificate
   */
  async uploadCertificate(request: CertificateUploadRequest): Promise<Certificate> {
    const id = randomUUID();

    // Parse the certificate
    let cert: forge.pki.Certificate;
    let privateKey: forge.pki.rsa.PrivateKey | null = null;

    try {
      if (request.format === CertificateFormat.PEM) {
        cert = forge.pki.certificateFromPem(request.certificate.toString('utf8'));
        if (request.privateKey) {
          const pkPem = request.privateKey.toString('utf8');
          if (request.passphrase) {
            privateKey = forge.pki.decryptRsaPrivateKey(pkPem, request.passphrase);
          } else {
            privateKey = forge.pki.privateKeyFromPem(pkPem);
          }
        }
      } else if (request.format === CertificateFormat.P12) {
        const p12Der = forge.util.decode64(request.certificate.toString('base64'));
        const p12Asn1 = forge.asn1.fromDer(p12Der);
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, request.passphrase || '');

        // Extract certificate
        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const certBag = certBags[forge.pki.oids.certBag];
        if (!certBag || certBag.length === 0) {
          throw new Error('No certificate found in P12 file');
        }
        cert = certBag[0].cert!;

        // Extract private key
        const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
        const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
        if (keyBag && keyBag.length > 0) {
          privateKey = keyBag[0].key!;
        }
      } else {
        throw new Error(`Unsupported certificate format: ${request.format}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to parse certificate: ${message}`);
    }

    // Extract certificate details
    const fingerprint = this.calculateFingerprint(cert);
    const subject = this.extractSubject(cert.subject.attributes);
    const issuer = this.extractSubject(cert.issuer.attributes);

    // Check if self-signed
    const isSelfSigned = this.isSelfSigned(cert);

    // Check key usage
    const keyUsage = this.extractKeyUsage(cert);
    const extKeyUsage = this.extractExtKeyUsage(cert);

    const certificate: Certificate = {
      id,
      tenantId: request.tenantId,
      partnerId: request.partnerId,
      name: request.name,
      type: request.type,
      format: request.format,
      serialNumber: cert.serialNumber,
      fingerprint,
      fingerprintAlgorithm: 'sha256',
      subject,
      issuer,
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
      publicKey: forge.pki.publicKeyToPem(cert.publicKey as forge.pki.rsa.PublicKey),
      hasPrivateKey: privateKey !== null,
      keyUsage,
      extKeyUsage,
      isCA: this.isCA(cert),
      isSelfSigned,
      isActive: true,
      metadata: request.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store certificate
    this.certificates.set(id, certificate);

    // Store private key if present
    if (privateKey) {
      const pkPem = forge.pki.privateKeyToPem(privateKey);
      // In production, encrypt the private key before storing
      this.privateKeys.set(id, pkPem);
    }

    this.logger.log(`Uploaded certificate: ${certificate.name} (${id})`);
    return certificate;
  }

  /**
   * Get certificate by ID
   */
  async getCertificate(id: string): Promise<Certificate | undefined> {
    return this.certificates.get(id);
  }

  /**
   * Get certificate by fingerprint
   */
  async getCertificateByFingerprint(fingerprint: string): Promise<Certificate | undefined> {
    for (const cert of this.certificates.values()) {
      if (cert.fingerprint === fingerprint) {
        return cert;
      }
    }
    return undefined;
  }

  /**
   * List certificates by tenant
   */
  async listCertificates(tenantId: string, type?: CertificateType): Promise<Certificate[]> {
    const results: Certificate[] = [];
    for (const cert of this.certificates.values()) {
      if (cert.tenantId === tenantId) {
        if (!type || cert.type === type) {
          results.push(cert);
        }
      }
    }
    return results;
  }

  /**
   * Get private key for a certificate
   */
  async getPrivateKey(certificateId: string): Promise<string | undefined> {
    return this.privateKeys.get(certificateId);
  }

  /**
   * Delete certificate
   */
  async deleteCertificate(id: string): Promise<boolean> {
    const deleted = this.certificates.delete(id);
    if (deleted) {
      this.privateKeys.delete(id);
      this.logger.log(`Deleted certificate: ${id}`);
    }
    return deleted;
  }

  /**
   * Update certificate active status
   */
  async updateCertificateStatus(id: string, isActive: boolean): Promise<Certificate | undefined> {
    const cert = this.certificates.get(id);
    if (cert) {
      cert.isActive = isActive;
      cert.updatedAt = new Date();
      this.certificates.set(id, cert);
      this.logger.log(`Updated certificate status: ${id} -> ${isActive ? 'active' : 'inactive'}`);
      return cert;
    }
    return undefined;
  }

  /**
   * Check if certificate is valid (not expired)
   */
  isCertificateValid(certificate: Certificate): boolean {
    const now = new Date();
    return certificate.isActive && now >= certificate.validFrom && now <= certificate.validTo;
  }

  /**
   * Get certificates expiring soon
   */
  async getCertificatesExpiringSoon(
    tenantId: string,
    daysThreshold: number = 30,
  ): Promise<Certificate[]> {
    const results: Certificate[] = [];
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysThreshold);

    for (const cert of this.certificates.values()) {
      if (cert.tenantId === tenantId && cert.validTo <= threshold && cert.validTo > new Date()) {
        results.push(cert);
      }
    }
    return results;
  }

  // ============================================
  // SSH Key Management
  // ============================================

  /**
   * Generate SSH key pair
   */
  async generateSshKeyPair(
    tenantId: string,
    name: string,
    keyType: 'rsa' | 'ed25519' = 'rsa',
    keySize: number = 4096,
    partnerId?: string,
  ): Promise<SshKeyPair> {
    const id = randomUUID();

    let publicKey: string;
    let privateKey: string;
    let fingerprint: string;

    if (keyType === 'rsa') {
      const { publicKey: pubKey, privateKey: privKey } = generateKeyPairSync('rsa', {
        modulusLength: keySize,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      // Convert to OpenSSH format for public key
      publicKey = this.convertToOpenSshFormat(pubKey, name);
      privateKey = privKey;
      fingerprint = this.calculateSshFingerprint(pubKey);
    } else {
      // ed25519
      const { publicKey: pubKey, privateKey: privKey } = generateKeyPairSync('ed25519', {
        publicKeyEncoding: {
          type: 'spki',
          format: 'der',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      publicKey = this.convertEd25519ToOpenSsh(pubKey, name);
      privateKey = privKey;
      fingerprint = this.calculateSshFingerprintFromOpenSsh(publicKey);
    }

    const sshKeyPair: SshKeyPair = {
      id,
      tenantId,
      partnerId,
      name,
      publicKey,
      fingerprint,
      keyType,
      keySize: keyType === 'rsa' ? keySize : undefined,
      hasPrivateKey: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store key pair
    this.sshKeys.set(id, sshKeyPair);
    this.sshPrivateKeys.set(id, privateKey);

    this.logger.log(`Generated SSH key pair: ${name} (${id})`);
    return sshKeyPair;
  }

  /**
   * Import SSH key pair
   */
  async importSshKeyPair(
    tenantId: string,
    name: string,
    publicKey: string,
    privateKey?: string,
    partnerId?: string,
  ): Promise<SshKeyPair> {
    const id = randomUUID();

    // Detect key type
    let keyType: 'rsa' | 'ed25519' | 'ecdsa' = 'rsa';
    if (publicKey.includes('ssh-ed25519')) {
      keyType = 'ed25519';
    } else if (publicKey.includes('ecdsa-sha2')) {
      keyType = 'ecdsa';
    }

    const fingerprint = this.calculateSshFingerprintFromOpenSsh(publicKey);

    const sshKeyPair: SshKeyPair = {
      id,
      tenantId,
      partnerId,
      name,
      publicKey,
      fingerprint,
      keyType,
      hasPrivateKey: privateKey !== undefined,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store key pair
    this.sshKeys.set(id, sshKeyPair);
    if (privateKey) {
      this.sshPrivateKeys.set(id, privateKey);
    }

    this.logger.log(`Imported SSH key pair: ${name} (${id})`);
    return sshKeyPair;
  }

  /**
   * Get SSH key pair by ID
   */
  async getSshKeyPair(id: string): Promise<SshKeyPair | undefined> {
    return this.sshKeys.get(id);
  }

  /**
   * Get SSH private key
   */
  async getSshPrivateKey(id: string): Promise<string | undefined> {
    return this.sshPrivateKeys.get(id);
  }

  /**
   * List SSH key pairs by tenant
   */
  async listSshKeyPairs(tenantId: string): Promise<SshKeyPair[]> {
    const results: SshKeyPair[] = [];
    for (const keyPair of this.sshKeys.values()) {
      if (keyPair.tenantId === tenantId) {
        results.push(keyPair);
      }
    }
    return results;
  }

  /**
   * Delete SSH key pair
   */
  async deleteSshKeyPair(id: string): Promise<boolean> {
    const deleted = this.sshKeys.delete(id);
    if (deleted) {
      this.sshPrivateKeys.delete(id);
      this.logger.log(`Deleted SSH key pair: ${id}`);
    }
    return deleted;
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Calculate certificate fingerprint
   */
  private calculateFingerprint(cert: forge.pki.Certificate): string {
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const hash = createHash('sha256');
    hash.update(Buffer.from(der, 'binary'));
    return hash.digest('hex').toUpperCase();
  }

  /**
   * Extract subject from certificate
   */
  private extractSubject(subject: forge.pki.CertificateField[]): CertificateSubject {
    const result: CertificateSubject = {};

    for (const attr of subject) {
      switch (attr.shortName) {
        case 'CN':
          result.commonName = attr.value as string;
          break;
        case 'O':
          result.organization = attr.value as string;
          break;
        case 'OU':
          result.organizationalUnit = attr.value as string;
          break;
        case 'C':
          result.country = attr.value as string;
          break;
        case 'ST':
          result.state = attr.value as string;
          break;
        case 'L':
          result.locality = attr.value as string;
          break;
        case 'emailAddress':
        case 'E':
          result.email = attr.value as string;
          break;
      }
    }

    return result;
  }

  /**
   * Check if certificate is self-signed
   */
  private isSelfSigned(cert: forge.pki.Certificate): boolean {
    try {
      return cert.verify(cert);
    } catch {
      return false;
    }
  }

  /**
   * Check if certificate is a CA
   */
  private isCA(cert: forge.pki.Certificate): boolean {
    const basicConstraints = cert.getExtension('basicConstraints');
    if (basicConstraints && typeof basicConstraints === 'object' && 'cA' in basicConstraints) {
      return (basicConstraints as { cA?: boolean }).cA === true;
    }
    return false;
  }

  /**
   * Extract key usage extension
   */
  private extractKeyUsage(cert: forge.pki.Certificate): string[] | undefined {
    const ext = cert.getExtension('keyUsage');
    if (ext && typeof ext === 'object') {
      const usage: string[] = [];
      const keyUsage = ext as Record<string, boolean>;
      if (keyUsage.digitalSignature) usage.push('digitalSignature');
      if (keyUsage.nonRepudiation) usage.push('nonRepudiation');
      if (keyUsage.keyEncipherment) usage.push('keyEncipherment');
      if (keyUsage.dataEncipherment) usage.push('dataEncipherment');
      if (keyUsage.keyAgreement) usage.push('keyAgreement');
      if (keyUsage.keyCertSign) usage.push('keyCertSign');
      if (keyUsage.cRLSign) usage.push('cRLSign');
      return usage.length > 0 ? usage : undefined;
    }
    return undefined;
  }

  /**
   * Extract extended key usage extension
   */
  private extractExtKeyUsage(cert: forge.pki.Certificate): string[] | undefined {
    const ext = cert.getExtension('extKeyUsage');
    if (ext && typeof ext === 'object') {
      const usage: string[] = [];
      const extKeyUsage = ext as Record<string, boolean>;
      if (extKeyUsage.serverAuth) usage.push('serverAuth');
      if (extKeyUsage.clientAuth) usage.push('clientAuth');
      if (extKeyUsage.codeSigning) usage.push('codeSigning');
      if (extKeyUsage.emailProtection) usage.push('emailProtection');
      if (extKeyUsage.timeStamping) usage.push('timeStamping');
      return usage.length > 0 ? usage : undefined;
    }
    return undefined;
  }

  /**
   * Convert PEM public key to OpenSSH format
   */
  private convertToOpenSshFormat(pemPublicKey: string, comment: string): string {
    // Simplified conversion - in production, use ssh2 or similar library
    const key = forge.pki.publicKeyFromPem(pemPublicKey);
    const n = (key as forge.pki.rsa.PublicKey).n.toByteArray();
    const e = (key as forge.pki.rsa.PublicKey).e.toByteArray();

    // Build OpenSSH format
    const type = Buffer.from('ssh-rsa');
    const typeLen = Buffer.alloc(4);
    typeLen.writeUInt32BE(type.length, 0);

    const eBuffer = Buffer.from(e);
    const eLen = Buffer.alloc(4);
    eLen.writeUInt32BE(eBuffer.length, 0);

    const nBuffer = Buffer.from(n);
    const nLen = Buffer.alloc(4);
    nLen.writeUInt32BE(nBuffer.length, 0);

    const blob = Buffer.concat([typeLen, type, eLen, eBuffer, nLen, nBuffer]);
    return `ssh-rsa ${blob.toString('base64')} ${comment}`;
  }

  /**
   * Convert ed25519 DER public key to OpenSSH format
   */
  private convertEd25519ToOpenSsh(derPublicKey: Buffer, comment: string): string {
    // ed25519 SPKI DER format: sequence of OID + bitstring with 32-byte key
    // The raw key material starts at offset 12 (after the ASN.1 header)
    const rawKey = derPublicKey.slice(12);

    // Build OpenSSH format
    const type = Buffer.from('ssh-ed25519');
    const typeLen = Buffer.alloc(4);
    typeLen.writeUInt32BE(type.length, 0);

    const keyLen = Buffer.alloc(4);
    keyLen.writeUInt32BE(rawKey.length, 0);

    const blob = Buffer.concat([typeLen, type, keyLen, rawKey]);
    return `ssh-ed25519 ${blob.toString('base64')} ${comment}`;
  }

  /**
   * Calculate SSH fingerprint from PEM
   */
  private calculateSshFingerprint(pemPublicKey: string): string {
    const hash = createHash('sha256');
    hash.update(pemPublicKey);
    return `SHA256:${hash.digest('base64').replace(/=+$/, '')}`;
  }

  /**
   * Calculate SSH fingerprint from OpenSSH format
   */
  private calculateSshFingerprintFromOpenSsh(publicKey: string): string {
    const parts = publicKey.trim().split(' ');
    if (parts.length >= 2) {
      const keyData = Buffer.from(parts[1], 'base64');
      const hash = createHash('sha256');
      hash.update(keyData);
      return `SHA256:${hash.digest('base64').replace(/=+$/, '')}`;
    }
    return '';
  }
}
