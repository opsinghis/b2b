/**
 * EDI Transport Types
 *
 * Type definitions for AS2, SFTP, and common transport functionality.
 */

// ============================================
// AS2 Types
// ============================================

export enum As2MessageDisposition {
  PROCESSED = 'processed',
  FAILED = 'failed',
  DISPATCHED = 'dispatched',
}

export enum As2MdnMode {
  SYNC = 'sync',
  ASYNC = 'async',
}

export enum As2EncryptionAlgorithm {
  AES128_CBC = 'aes128-cbc',
  AES192_CBC = 'aes192-cbc',
  AES256_CBC = 'aes256-cbc',
  DES3 = '3des',
}

export enum As2SigningAlgorithm {
  SHA1 = 'sha1',
  SHA256 = 'sha256',
  SHA384 = 'sha384',
  SHA512 = 'sha512',
}

export enum As2CompressionAlgorithm {
  ZLIB = 'zlib',
  NONE = 'none',
}

export interface As2PartnerProfile {
  partnerId: string;
  partnerName: string;
  as2Id: string;
  targetUrl: string;
  email?: string;

  // Security
  signingCertificateId?: string;
  encryptionCertificateId?: string;

  // Preferences
  encryptionAlgorithm?: As2EncryptionAlgorithm;
  signingAlgorithm?: As2SigningAlgorithm;
  compressionAlgorithm?: As2CompressionAlgorithm;
  mdnMode: As2MdnMode;
  mdnAsyncUrl?: string;
  requestMdnSigned?: boolean;

  // Connection
  httpHeaders?: Record<string, string>;
  httpAuth?: As2HttpAuth;
  timeoutMs?: number;
  retryConfig?: As2RetryConfig;

  // Metadata
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export interface As2HttpAuth {
  type: 'basic' | 'bearer' | 'none';
  username?: string;
  password?: string;
  token?: string;
}

export interface As2RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface As2Message {
  messageId: string;
  as2From: string;
  as2To: string;
  subject?: string;
  contentType: string;
  payload: Buffer;
  headers: Record<string, string>;
  signedAttributes?: As2SignedAttributes;
  encryptedAttributes?: As2EncryptedAttributes;
  timestamp: Date;
}

export interface As2SignedAttributes {
  algorithm: As2SigningAlgorithm;
  certificateFingerprint: string;
  signature?: Buffer;
}

export interface As2EncryptedAttributes {
  algorithm: As2EncryptionAlgorithm;
  certificateFingerprint: string;
}

export interface As2Mdn {
  messageId: string;
  originalMessageId: string;
  as2From: string;
  as2To: string;
  disposition: As2MdnDisposition;
  mic?: string;
  micAlgorithm?: string;
  humanReadable?: string;
  signed: boolean;
  timestamp: Date;
  rawMdn?: Buffer;
}

export interface As2MdnDisposition {
  type: 'automatic-action' | 'manual-action';
  mode: 'mdn-sent-automatically' | 'mdn-sent-manually';
  modifier?: 'processed' | 'failed' | 'error';
  statusModifier?: 'warning' | 'error' | 'failure';
  statusText?: string;
}

export interface As2SendRequest {
  partnerId: string;
  content: Buffer;
  contentType: string;
  subject?: string;
  filename?: string;
  requestMdn?: boolean;
  mdnMode?: As2MdnMode;
  sign?: boolean;
  encrypt?: boolean;
  compress?: boolean;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface As2SendResult {
  success: boolean;
  messageId: string;
  mdn?: As2Mdn;
  httpStatusCode?: number;
  error?: string;
  errorDetails?: Record<string, unknown>;
  timestamp: Date;
  durationMs: number;
}

export interface As2ReceiveRequest {
  headers: Record<string, string>;
  body: Buffer;
}

export interface As2ReceiveResult {
  success: boolean;
  messageId: string;
  as2From: string;
  as2To: string;
  content: Buffer;
  contentType: string;
  subject?: string;
  filename?: string;
  signed: boolean;
  encrypted: boolean;
  signatureVerified?: boolean;
  mdn?: As2Mdn;
  error?: string;
  timestamp: Date;
}

// ============================================
// SFTP Types
// ============================================

export enum SftpAuthMethod {
  PASSWORD = 'password',
  KEY = 'key',
  KEY_AND_PASSWORD = 'key_and_password',
}

export interface SftpConnectionConfig {
  host: string;
  port: number;
  username: string;
  authMethod: SftpAuthMethod;
  password?: string;
  privateKeyId?: string;
  passphrase?: string;
  hostKeyFingerprint?: string;
  strictHostKeyChecking?: boolean;
  timeoutMs?: number;
  retryConfig?: SftpRetryConfig;
  keepAliveIntervalMs?: number;
}

export interface SftpRetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface SftpPartnerProfile {
  partnerId: string;
  partnerName: string;
  connection: SftpConnectionConfig;
  inbound?: SftpInboundConfig;
  outbound?: SftpOutboundConfig;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export interface SftpInboundConfig {
  directory: string;
  filenamePattern?: string;
  pollIntervalMs?: number;
  processedDirectory?: string;
  errorDirectory?: string;
  deleteAfterProcessing?: boolean;
  moveAfterProcessing?: boolean;
  maxFilesPerPoll?: number;
}

export interface SftpOutboundConfig {
  directory: string;
  filenameTemplate?: string;
  tempDirectory?: string;
  useTempFile?: boolean;
  overwriteExisting?: boolean;
}

export interface SftpFile {
  filename: string;
  path: string;
  size: number;
  modifiedAt: Date;
  accessedAt: Date;
  isDirectory: boolean;
  permissions?: string;
  owner?: string;
  group?: string;
}

export interface SftpUploadRequest {
  partnerId: string;
  content: Buffer;
  filename: string;
  directory?: string;
  overwrite?: boolean;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface SftpUploadResult {
  success: boolean;
  filename: string;
  remotePath: string;
  size: number;
  error?: string;
  timestamp: Date;
  durationMs: number;
}

export interface SftpDownloadRequest {
  partnerId: string;
  remotePath: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface SftpDownloadResult {
  success: boolean;
  content: Buffer;
  filename: string;
  remotePath: string;
  size: number;
  error?: string;
  timestamp: Date;
  durationMs: number;
}

export interface SftpListRequest {
  partnerId: string;
  directory?: string;
  pattern?: string;
  recursive?: boolean;
}

export interface SftpListResult {
  success: boolean;
  files: SftpFile[];
  directory: string;
  error?: string;
  timestamp: Date;
}

export interface SftpDeleteRequest {
  partnerId: string;
  remotePath: string;
  correlationId?: string;
}

export interface SftpDeleteResult {
  success: boolean;
  remotePath: string;
  error?: string;
  timestamp: Date;
}

export interface SftpMoveRequest {
  partnerId: string;
  sourcePath: string;
  destinationPath: string;
  overwrite?: boolean;
  correlationId?: string;
}

export interface SftpMoveResult {
  success: boolean;
  sourcePath: string;
  destinationPath: string;
  error?: string;
  timestamp: Date;
}

// ============================================
// Certificate Types
// ============================================

export enum CertificateType {
  SIGNING = 'signing',
  ENCRYPTION = 'encryption',
  TLS = 'tls',
  SSH = 'ssh',
}

export enum CertificateFormat {
  PEM = 'pem',
  DER = 'der',
  P12 = 'p12',
  JKS = 'jks',
}

export interface Certificate {
  id: string;
  tenantId: string;
  partnerId?: string;
  name: string;
  type: CertificateType;
  format: CertificateFormat;
  serialNumber?: string;
  fingerprint: string;
  fingerprintAlgorithm: string;
  subject: CertificateSubject;
  issuer: CertificateSubject;
  validFrom: Date;
  validTo: Date;
  publicKey: string;
  hasPrivateKey: boolean;
  keyUsage?: string[];
  extKeyUsage?: string[];
  isCA: boolean;
  isSelfSigned: boolean;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificateSubject {
  commonName?: string;
  organization?: string;
  organizationalUnit?: string;
  country?: string;
  state?: string;
  locality?: string;
  email?: string;
}

export interface CertificateUploadRequest {
  tenantId: string;
  partnerId?: string;
  name: string;
  type: CertificateType;
  certificate: Buffer;
  privateKey?: Buffer;
  passphrase?: string;
  format: CertificateFormat;
  metadata?: Record<string, unknown>;
}

export interface SshKeyPair {
  id: string;
  tenantId: string;
  partnerId?: string;
  name: string;
  publicKey: string;
  fingerprint: string;
  keyType: 'rsa' | 'ed25519' | 'ecdsa';
  keySize?: number;
  hasPrivateKey: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Trading Partner Types
// ============================================

export enum TransportProtocol {
  AS2 = 'as2',
  SFTP = 'sftp',
  FTPS = 'ftps',
  HTTP = 'http',
  HTTPS = 'https',
}

export interface TradingPartner {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  protocols: TransportProtocol[];
  as2Profile?: As2PartnerProfile;
  sftpProfile?: SftpPartnerProfile;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Transport Logging Types
// ============================================

export enum TransportDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum TransportStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export interface TransportLog {
  id: string;
  tenantId: string;
  partnerId: string;
  protocol: TransportProtocol;
  direction: TransportDirection;
  status: TransportStatus;
  messageId?: string;
  correlationId?: string;
  filename?: string;
  contentType?: string;
  contentSize?: number;
  error?: string;
  errorDetails?: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

// ============================================
// Polling Types
// ============================================

export interface PollJob {
  id: string;
  tenantId: string;
  partnerId: string;
  protocol: TransportProtocol;
  config: SftpInboundConfig;
  lastPollAt?: Date;
  nextPollAt: Date;
  isActive: boolean;
  failureCount: number;
  lastError?: string;
}

export interface PollResult {
  jobId: string;
  partnerId: string;
  filesFound: number;
  filesProcessed: number;
  filesFailed: number;
  files: PollResultFile[];
  error?: string;
  timestamp: Date;
  durationMs: number;
}

export interface PollResultFile {
  filename: string;
  remotePath: string;
  size: number;
  status: 'processed' | 'failed' | 'skipped';
  error?: string;
  messageId?: string;
}

// ============================================
// Delivery Types
// ============================================

export interface DeliveryJob {
  id: string;
  tenantId: string;
  partnerId: string;
  protocol: TransportProtocol;
  messageId: string;
  correlationId?: string;
  content: Buffer;
  contentType: string;
  filename?: string;
  priority: number;
  status: TransportStatus;
  retryCount: number;
  maxRetries: number;
  scheduledAt: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface DeliveryResult {
  jobId: string;
  partnerId: string;
  protocol: TransportProtocol;
  success: boolean;
  messageId?: string;
  filename?: string;
  error?: string;
  mdn?: As2Mdn;
  timestamp: Date;
  durationMs: number;
}

// ============================================
// Health Check Types
// ============================================

export interface TransportHealthCheck {
  partnerId: string;
  protocol: TransportProtocol;
  isHealthy: boolean;
  lastCheckedAt: Date;
  lastSuccessAt?: Date;
  consecutiveFailures: number;
  error?: string;
  latencyMs?: number;
}
