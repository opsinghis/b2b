import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import Client from 'ssh2-sftp-client';
import {
  SftpPartnerProfile,
  SftpConnectionConfig,
  SftpFile,
  SftpUploadRequest,
  SftpUploadResult,
  SftpDownloadRequest,
  SftpDownloadResult,
  SftpListRequest,
  SftpListResult,
  SftpDeleteRequest,
  SftpDeleteResult,
  SftpMoveRequest,
  SftpMoveResult,
  SftpAuthMethod,
  SftpRetryConfig,
} from '../interfaces';
import { CertificateManagerService } from './certificate-manager.service';

/**
 * Connection pool entry
 */
interface PooledConnection {
  client: Client;
  partnerId: string;
  createdAt: Date;
  lastUsedAt: Date;
  isActive: boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: SftpRetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * SFTP Client Service
 *
 * Provides SFTP file transfer capabilities:
 * - Connection pooling
 * - Automatic reconnection
 * - File upload/download
 * - Directory listing
 * - File move/delete operations
 * - Retry with exponential backoff
 */
@Injectable()
export class SftpClientService implements OnModuleDestroy {
  private readonly logger = new Logger(SftpClientService.name);
  private readonly partnerProfiles = new Map<string, SftpPartnerProfile>();
  private readonly connectionPool = new Map<string, PooledConnection>();
  private readonly maxConnectionAge = 5 * 60 * 1000; // 5 minutes
  private readonly maxPoolSize = 10;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly certificateManager: CertificateManagerService,
  ) {
    // Start connection cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanupConnections(), 60000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    await this.closeAllConnections();
  }

  /**
   * Register a trading partner profile
   */
  registerPartner(profile: SftpPartnerProfile): void {
    this.partnerProfiles.set(profile.partnerId, profile);
    this.logger.log(`Registered SFTP partner: ${profile.partnerId} (${profile.connection.host})`);
  }

  /**
   * Get partner profile by ID
   */
  getPartner(partnerId: string): SftpPartnerProfile | undefined {
    return this.partnerProfiles.get(partnerId);
  }

  /**
   * Remove partner profile
   */
  async removePartner(partnerId: string): Promise<boolean> {
    // Close any existing connection
    await this.closeConnection(partnerId);
    const result = this.partnerProfiles.delete(partnerId);
    if (result) {
      this.logger.log(`Removed SFTP partner: ${partnerId}`);
    }
    return result;
  }

  /**
   * List all registered partners
   */
  listPartners(): SftpPartnerProfile[] {
    return Array.from(this.partnerProfiles.values());
  }

  /**
   * Upload a file to the partner's SFTP server
   */
  async upload(request: SftpUploadRequest): Promise<SftpUploadResult> {
    const startTime = Date.now();

    try {
      const partner = this.partnerProfiles.get(request.partnerId);
      if (!partner) {
        throw new Error(`Partner not found: ${request.partnerId}`);
      }

      if (!partner.isActive) {
        throw new Error(`Partner is inactive: ${request.partnerId}`);
      }

      const client = await this.getConnection(partner);

      // Determine target path
      const directory = request.directory || partner.outbound?.directory || '/';
      const remotePath = this.joinPath(directory, request.filename);

      this.logger.log(`Uploading file to ${partner.connection.host}:${remotePath}`);

      // Use temp file if configured
      let actualPath = remotePath;
      if (partner.outbound?.useTempFile && partner.outbound?.tempDirectory) {
        const tempFilename = `.${request.filename}.${randomUUID()}.tmp`;
        actualPath = this.joinPath(partner.outbound.tempDirectory, tempFilename);
      }

      // Upload the file
      await this.executeWithRetry(async () => {
        await client.put(request.content, actualPath);
      }, partner.connection.retryConfig || DEFAULT_RETRY_CONFIG);

      // Move from temp to final location if using temp file
      if (actualPath !== remotePath) {
        await client.rename(actualPath, remotePath);
      }

      const durationMs = Date.now() - startTime;
      this.logger.log(`File uploaded successfully in ${durationMs}ms: ${remotePath}`);

      return {
        success: true,
        filename: request.filename,
        remotePath,
        size: request.content.length,
        timestamp: new Date(),
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`SFTP upload failed: ${errorMessage}`);

      return {
        success: false,
        filename: request.filename,
        remotePath: '',
        size: 0,
        error: errorMessage,
        timestamp: new Date(),
        durationMs,
      };
    }
  }

  /**
   * Download a file from the partner's SFTP server
   */
  async download(request: SftpDownloadRequest): Promise<SftpDownloadResult> {
    const startTime = Date.now();

    try {
      const partner = this.partnerProfiles.get(request.partnerId);
      if (!partner) {
        throw new Error(`Partner not found: ${request.partnerId}`);
      }

      if (!partner.isActive) {
        throw new Error(`Partner is inactive: ${request.partnerId}`);
      }

      const client = await this.getConnection(partner);

      this.logger.log(`Downloading file from ${partner.connection.host}:${request.remotePath}`);

      // Download the file
      const content = await this.executeWithRetry(async () => {
        return (await client.get(request.remotePath)) as Buffer;
      }, partner.connection.retryConfig || DEFAULT_RETRY_CONFIG);

      const durationMs = Date.now() - startTime;
      const filename = this.getFilename(request.remotePath);
      this.logger.log(`File downloaded successfully in ${durationMs}ms: ${request.remotePath}`);

      return {
        success: true,
        content,
        filename,
        remotePath: request.remotePath,
        size: content.length,
        timestamp: new Date(),
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`SFTP download failed: ${errorMessage}`);

      return {
        success: false,
        content: Buffer.alloc(0),
        filename: '',
        remotePath: request.remotePath,
        size: 0,
        error: errorMessage,
        timestamp: new Date(),
        durationMs,
      };
    }
  }

  /**
   * List files in a directory
   */
  async list(request: SftpListRequest): Promise<SftpListResult> {
    try {
      const partner = this.partnerProfiles.get(request.partnerId);
      if (!partner) {
        throw new Error(`Partner not found: ${request.partnerId}`);
      }

      if (!partner.isActive) {
        throw new Error(`Partner is inactive: ${request.partnerId}`);
      }

      const client = await this.getConnection(partner);

      const directory = request.directory || partner.inbound?.directory || '/';
      this.logger.log(`Listing files in ${partner.connection.host}:${directory}`);

      // List files
      const listing = await this.executeWithRetry(async () => {
        return await client.list(directory, (item: Client.FileInfo) => {
          // Filter by pattern if specified
          if (request.pattern) {
            const regex = this.patternToRegex(request.pattern);
            return regex.test(item.name);
          }
          return true;
        });
      }, partner.connection.retryConfig || DEFAULT_RETRY_CONFIG);

      // Map to our file type
      const files: SftpFile[] = listing.map((item: Client.FileInfo) => ({
        filename: item.name,
        path: this.joinPath(directory, item.name),
        size: item.size,
        modifiedAt: new Date(item.modifyTime),
        accessedAt: new Date(item.accessTime),
        isDirectory: item.type === 'd',
        permissions: item.rights ? this.formatPermissions(item.rights) : undefined,
        owner: item.owner ? String(item.owner) : undefined,
        group: item.group ? String(item.group) : undefined,
      }));

      // Handle recursive listing
      if (request.recursive) {
        const subdirs = files.filter(
          (f) => f.isDirectory && f.filename !== '.' && f.filename !== '..',
        );
        for (const subdir of subdirs) {
          const subResult = await this.list({
            ...request,
            directory: subdir.path,
          });
          files.push(...subResult.files);
        }
      }

      return {
        success: true,
        files,
        directory,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`SFTP list failed: ${errorMessage}`);

      return {
        success: false,
        files: [],
        directory: request.directory || '/',
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Delete a file
   */
  async delete(request: SftpDeleteRequest): Promise<SftpDeleteResult> {
    try {
      const partner = this.partnerProfiles.get(request.partnerId);
      if (!partner) {
        throw new Error(`Partner not found: ${request.partnerId}`);
      }

      if (!partner.isActive) {
        throw new Error(`Partner is inactive: ${request.partnerId}`);
      }

      const client = await this.getConnection(partner);

      this.logger.log(`Deleting file ${partner.connection.host}:${request.remotePath}`);

      await this.executeWithRetry(async () => {
        await client.delete(request.remotePath);
      }, partner.connection.retryConfig || DEFAULT_RETRY_CONFIG);

      return {
        success: true,
        remotePath: request.remotePath,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`SFTP delete failed: ${errorMessage}`);

      return {
        success: false,
        remotePath: request.remotePath,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Move/rename a file
   */
  async move(request: SftpMoveRequest): Promise<SftpMoveResult> {
    try {
      const partner = this.partnerProfiles.get(request.partnerId);
      if (!partner) {
        throw new Error(`Partner not found: ${request.partnerId}`);
      }

      if (!partner.isActive) {
        throw new Error(`Partner is inactive: ${request.partnerId}`);
      }

      const client = await this.getConnection(partner);

      this.logger.log(
        `Moving file ${partner.connection.host}:${request.sourcePath} -> ${request.destinationPath}`,
      );

      // Check if destination exists and handle overwrite
      if (!request.overwrite) {
        const exists = await client.exists(request.destinationPath);
        if (exists) {
          throw new Error(`Destination already exists: ${request.destinationPath}`);
        }
      }

      await this.executeWithRetry(async () => {
        await client.rename(request.sourcePath, request.destinationPath);
      }, partner.connection.retryConfig || DEFAULT_RETRY_CONFIG);

      return {
        success: true,
        sourcePath: request.sourcePath,
        destinationPath: request.destinationPath,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`SFTP move failed: ${errorMessage}`);

      return {
        success: false,
        sourcePath: request.sourcePath,
        destinationPath: request.destinationPath,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test connection to a partner
   */
  async testConnection(
    partnerId: string,
  ): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const startTime = Date.now();

    try {
      const partner = this.partnerProfiles.get(partnerId);
      if (!partner) {
        throw new Error(`Partner not found: ${partnerId}`);
      }

      // Force new connection for test
      await this.closeConnection(partnerId);
      const client = await this.getConnection(partner);

      // Try to list root directory
      await client.list('/');

      const latencyMs = Date.now() - startTime;
      return { success: true, latencyMs };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const latencyMs = Date.now() - startTime;
      return { success: false, latencyMs, error: errorMessage };
    }
  }

  /**
   * Get or create a connection for a partner
   */
  private async getConnection(partner: SftpPartnerProfile): Promise<Client> {
    const poolKey = partner.partnerId;

    // Check for existing connection
    const pooled = this.connectionPool.get(poolKey);
    if (pooled && pooled.isActive) {
      // Check if connection is still alive
      try {
        await pooled.client.list('/');
        pooled.lastUsedAt = new Date();
        return pooled.client;
      } catch {
        // Connection is dead, remove it
        await this.closeConnection(partner.partnerId);
      }
    }

    // Create new connection
    const client = new Client();
    const config = await this.buildConnectionConfig(partner.connection);

    await client.connect(config);

    // Add to pool
    const entry: PooledConnection = {
      client,
      partnerId: partner.partnerId,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      isActive: true,
    };
    this.connectionPool.set(poolKey, entry);

    // Enforce pool size limit
    if (this.connectionPool.size > this.maxPoolSize) {
      await this.evictOldestConnection();
    }

    this.logger.log(`Connected to SFTP server: ${partner.connection.host}`);
    return client;
  }

  /**
   * Build connection configuration
   */
  private async buildConnectionConfig(
    config: SftpConnectionConfig,
  ): Promise<Client.ConnectOptions> {
    const options: Client.ConnectOptions = {
      host: config.host,
      port: config.port,
      username: config.username,
      readyTimeout: config.timeoutMs || 10000,
    };

    // Handle authentication
    if (config.authMethod === SftpAuthMethod.PASSWORD) {
      options.password = config.password;
    } else if (
      config.authMethod === SftpAuthMethod.KEY ||
      config.authMethod === SftpAuthMethod.KEY_AND_PASSWORD
    ) {
      if (config.privateKeyId) {
        const privateKey = await this.certificateManager.getSshPrivateKey(config.privateKeyId);
        if (!privateKey) {
          throw new Error(`SSH private key not found: ${config.privateKeyId}`);
        }
        options.privateKey = privateKey;
        if (config.passphrase) {
          options.passphrase = config.passphrase;
        }
      }
      if (config.authMethod === SftpAuthMethod.KEY_AND_PASSWORD && config.password) {
        options.password = config.password;
      }
    }

    // Host key verification
    if (!config.strictHostKeyChecking) {
      options.algorithms = {
        serverHostKey: [
          'ssh-rsa',
          'ssh-dss',
          'ssh-ed25519',
          'ecdsa-sha2-nistp256',
          'ecdsa-sha2-nistp384',
          'ecdsa-sha2-nistp521',
        ],
      };
    }

    return options;
  }

  /**
   * Close connection for a partner
   */
  private async closeConnection(partnerId: string): Promise<void> {
    const pooled = this.connectionPool.get(partnerId);
    if (pooled) {
      pooled.isActive = false;
      try {
        await pooled.client.end();
      } catch {
        // Ignore close errors
      }
      this.connectionPool.delete(partnerId);
    }
  }

  /**
   * Close all connections
   */
  private async closeAllConnections(): Promise<void> {
    for (const [partnerId] of this.connectionPool) {
      await this.closeConnection(partnerId);
    }
  }

  /**
   * Clean up stale connections
   */
  private async cleanupConnections(): Promise<void> {
    const now = Date.now();

    for (const [partnerId, pooled] of this.connectionPool) {
      const age = now - pooled.createdAt.getTime();
      const idle = now - pooled.lastUsedAt.getTime();

      // Close connections that are too old or idle
      if (age > this.maxConnectionAge || idle > this.maxConnectionAge / 2) {
        await this.closeConnection(partnerId);
      }
    }
  }

  /**
   * Evict oldest connection from pool
   */
  private async evictOldestConnection(): Promise<void> {
    let oldest: { partnerId: string; lastUsed: Date } | null = null;

    for (const [partnerId, pooled] of this.connectionPool) {
      if (!oldest || pooled.lastUsedAt < oldest.lastUsed) {
        oldest = { partnerId, lastUsed: pooled.lastUsedAt };
      }
    }

    if (oldest) {
      await this.closeConnection(oldest.partnerId);
    }
  }

  /**
   * Execute operation with retry
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryConfig: SftpRetryConfig,
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = retryConfig.baseDelayMs;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < retryConfig.maxRetries) {
          this.logger.warn(
            `SFTP operation failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}): ${lastError.message}`,
          );
          await this.sleep(delay);
          delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelayMs);
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Join path components
   */
  private joinPath(directory: string, filename: string): string {
    const dir = directory.endsWith('/') ? directory.slice(0, -1) : directory;
    return `${dir}/${filename}`;
  }

  /**
   * Get filename from path
   */
  private getFilename(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || '';
  }

  /**
   * Convert glob pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`, 'i');
  }

  /**
   * Format file permissions
   */
  private formatPermissions(rights: Client.FileInfo['rights']): string {
    if (!rights) return '';
    // rights structure varies - handle both object and string formats
    if (typeof rights === 'string') {
      return rights;
    }
    const r = rights as { user?: string; group?: string; other?: string };
    const u = r.user || '---';
    const g = r.group || '---';
    const o = r.other || '---';
    return `${u}${g}${o}`;
  }
}
