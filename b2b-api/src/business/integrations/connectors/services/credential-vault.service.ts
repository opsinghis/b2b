import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database';
import { CredentialType, CredentialVault, Prisma } from '@prisma/client';
import { createCipheriv, createDecipheriv, randomBytes, scrypt, createHash } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export interface CreateCredentialDto {
  tenantId: string;
  name: string;
  description?: string;
  type: CredentialType;
  credentials: Record<string, unknown>;
  expiresAt?: Date;
  rotationPolicy?: RotationPolicy;
  accessPolicy?: AccessPolicy;
  metadata?: Record<string, unknown>;
}

export interface UpdateCredentialDto {
  name?: string;
  description?: string;
  credentials?: Record<string, unknown>;
  expiresAt?: Date;
  rotationPolicy?: RotationPolicy;
  accessPolicy?: AccessPolicy;
  metadata?: Record<string, unknown>;
}

export interface RotationPolicy {
  enabled: boolean;
  intervalDays: number;
  autoRotate: boolean;
  notifyBeforeDays?: number;
}

export interface AccessPolicy {
  allowedConnectors?: string[];
  allowedUsers?: string[];
  allowedRoles?: string[];
  maxAccessCount?: number;
  ipWhitelist?: string[];
}

export interface CredentialQueryDto {
  tenantId: string;
  type?: CredentialType;
  name?: string;
  includeExpired?: boolean;
  page?: number;
  limit?: number;
}

export interface DecryptedCredentials {
  vaultId: string;
  type: CredentialType;
  credentials: Record<string, unknown>;
  expiresAt?: Date;
}

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

@Injectable()
export class CredentialVaultService {
  private readonly logger = new Logger(CredentialVaultService.name);
  private readonly masterKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Get master key from environment (should be set securely)
    const masterKeyEnv = this.configService.get<string>('CREDENTIAL_VAULT_MASTER_KEY');
    if (!masterKeyEnv) {
      this.logger.warn('CREDENTIAL_VAULT_MASTER_KEY not set, using derived key from APP_SECRET');
      const appSecret = this.configService.get<string>('APP_SECRET', 'default-app-secret-key');
      // Derive a key synchronously for initialization
      this.masterKey = Buffer.alloc(KEY_LENGTH);
      // Use a simple hash for initialization; actual encryption uses scrypt
      const hash = createHash('sha256').update(appSecret).digest();
      hash.copy(this.masterKey);
    } else {
      this.masterKey = Buffer.from(masterKeyEnv, 'base64');
      if (this.masterKey.length !== KEY_LENGTH) {
        throw new Error(`Master key must be ${KEY_LENGTH} bytes when decoded from base64`);
      }
    }
  }

  /**
   * Create a new credential vault entry
   */
  async create(dto: CreateCredentialDto): Promise<CredentialVault> {
    // Encrypt the credentials
    const encrypted = await this.encryptCredentials(dto.credentials);

    return this.prisma.credentialVault.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        encryptedData: encrypted.encryptedData,
        encryptionKeyId: encrypted.keyId,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        expiresAt: dto.expiresAt,
        rotationPolicy: dto.rotationPolicy as Prisma.JsonObject | undefined,
        accessPolicy: (dto.accessPolicy ?? {}) as Prisma.JsonObject,
        metadata: (dto.metadata ?? {}) as Prisma.JsonObject,
      },
    });
  }

  /**
   * Update credential vault entry
   */
  async update(id: string, dto: UpdateCredentialDto): Promise<CredentialVault> {
    const existing = await this.prisma.credentialVault.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Credential vault entry not found: ${id}`);
    }

    const updateData: Prisma.CredentialVaultUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.expiresAt !== undefined) updateData.expiresAt = dto.expiresAt;
    if (dto.rotationPolicy !== undefined) {
      updateData.rotationPolicy = dto.rotationPolicy as unknown as Prisma.JsonObject;
    }
    if (dto.accessPolicy !== undefined) {
      updateData.accessPolicy = dto.accessPolicy as unknown as Prisma.JsonObject;
    }
    if (dto.metadata !== undefined) {
      updateData.metadata = dto.metadata as unknown as Prisma.JsonObject;
    }

    // Re-encrypt if credentials are being updated
    if (dto.credentials) {
      const encrypted = await this.encryptCredentials(dto.credentials);
      updateData.encryptedData = encrypted.encryptedData;
      updateData.encryptionKeyId = encrypted.keyId;
      updateData.iv = encrypted.iv;
      updateData.authTag = encrypted.authTag;
      updateData.rotatedAt = new Date();
    }

    return this.prisma.credentialVault.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Get credential vault entry (without decrypted credentials)
   */
  async get(id: string): Promise<CredentialVault | null> {
    return this.prisma.credentialVault.findUnique({
      where: { id },
    });
  }

  /**
   * Get credential vault entry by tenant and name
   */
  async getByName(tenantId: string, name: string): Promise<CredentialVault | null> {
    return this.prisma.credentialVault.findUnique({
      where: {
        tenantId_name: { tenantId, name },
      },
    });
  }

  /**
   * List credential vault entries
   */
  async list(query: CredentialQueryDto) {
    const { tenantId, type, name, includeExpired = false, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CredentialVaultWhereInput = { tenantId };

    if (type) where.type = type;
    if (name) where.name = { contains: name, mode: 'insensitive' };
    if (!includeExpired) {
      where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.credentialVault.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          expiresAt: true,
          rotatedAt: true,
          lastAccessedAt: true,
          accessCount: true,
          rotationPolicy: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          // Exclude sensitive fields
          encryptedData: false,
          encryptionKeyId: false,
          iv: false,
          authTag: false,
          accessPolicy: false,
        },
      }),
      this.prisma.credentialVault.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete credential vault entry
   */
  async delete(id: string): Promise<void> {
    // Check if any connector configs are using this vault
    const configs = await this.prisma.connectorConfig.count({
      where: { credentialVaultId: id },
    });

    if (configs > 0) {
      throw new BadRequestException(
        `Cannot delete credential vault: ${configs} connector config(s) are using it`,
      );
    }

    await this.prisma.credentialVault.delete({
      where: { id },
    });
  }

  /**
   * Retrieve and decrypt credentials
   */
  async getDecryptedCredentials(
    id: string,
    accessContext?: { connectorCode?: string; userId?: string },
  ): Promise<DecryptedCredentials> {
    const vault = await this.prisma.credentialVault.findUnique({
      where: { id },
    });

    if (!vault) {
      throw new NotFoundException(`Credential vault entry not found: ${id}`);
    }

    // Check if expired
    if (vault.expiresAt && vault.expiresAt < new Date()) {
      throw new BadRequestException('Credentials have expired');
    }

    // Check access policy
    const accessPolicy = vault.accessPolicy as AccessPolicy;
    if (accessPolicy) {
      if (
        accessContext?.connectorCode &&
        accessPolicy.allowedConnectors?.length &&
        !accessPolicy.allowedConnectors.includes(accessContext.connectorCode)
      ) {
        throw new BadRequestException('Access denied: connector not in allowed list');
      }

      if (
        accessContext?.userId &&
        accessPolicy.allowedUsers?.length &&
        !accessPolicy.allowedUsers.includes(accessContext.userId)
      ) {
        throw new BadRequestException('Access denied: user not in allowed list');
      }

      if (accessPolicy.maxAccessCount && vault.accessCount >= accessPolicy.maxAccessCount) {
        throw new BadRequestException('Access denied: max access count reached');
      }
    }

    // Decrypt credentials
    const credentials = await this.decryptCredentials({
      encryptedData: vault.encryptedData,
      keyId: vault.encryptionKeyId,
      iv: vault.iv,
      authTag: vault.authTag,
    });

    // Update access tracking
    await this.prisma.credentialVault.update({
      where: { id },
      data: {
        lastAccessedAt: new Date(),
        accessCount: { increment: 1 },
      },
    });

    return {
      vaultId: vault.id,
      type: vault.type,
      credentials,
      expiresAt: vault.expiresAt ?? undefined,
    };
  }

  /**
   * Rotate credentials
   */
  async rotateCredentials(
    id: string,
    newCredentials: Record<string, unknown>,
  ): Promise<CredentialVault> {
    const vault = await this.get(id);
    if (!vault) {
      throw new NotFoundException(`Credential vault entry not found: ${id}`);
    }

    const encrypted = await this.encryptCredentials(newCredentials);

    return this.prisma.credentialVault.update({
      where: { id },
      data: {
        encryptedData: encrypted.encryptedData,
        encryptionKeyId: encrypted.keyId,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        rotatedAt: new Date(),
      },
    });
  }

  /**
   * Check for credentials needing rotation
   */
  async getCredentialsNeedingRotation(tenantId: string): Promise<CredentialVault[]> {
    const now = new Date();

    // Find credentials with rotation policy that are due
    const vaults = await this.prisma.credentialVault.findMany({
      where: {
        tenantId,
        rotationPolicy: { not: Prisma.AnyNull },
      },
    });

    return vaults.filter((vault) => {
      const policy = vault.rotationPolicy as RotationPolicy | null;
      if (!policy?.enabled) return false;

      const lastRotation = vault.rotatedAt ?? vault.createdAt;
      const daysSinceRotation = Math.floor(
        (now.getTime() - lastRotation.getTime()) / (1000 * 60 * 60 * 24),
      );

      return daysSinceRotation >= policy.intervalDays;
    });
  }

  /**
   * Get credentials expiring soon
   */
  async getExpiringCredentials(
    tenantId: string,
    withinDays: number = 7,
  ): Promise<CredentialVault[]> {
    const expirationThreshold = new Date();
    expirationThreshold.setDate(expirationThreshold.getDate() + withinDays);

    return this.prisma.credentialVault.findMany({
      where: {
        tenantId,
        expiresAt: {
          not: null,
          lte: expirationThreshold,
          gt: new Date(),
        },
      },
      orderBy: { expiresAt: 'asc' },
    });
  }

  /**
   * Encrypt credentials using AES-256-GCM
   */
  private async encryptCredentials(
    credentials: Record<string, unknown>,
  ): Promise<{ encryptedData: string; keyId: string; iv: string; authTag: string }> {
    const plaintext = JSON.stringify(credentials);
    const iv = randomBytes(IV_LENGTH);

    // Derive a unique key for this encryption using scrypt
    const salt = randomBytes(16);
    const derivedKey = (await scryptAsync(this.masterKey, salt, KEY_LENGTH)) as Buffer;

    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // KeyId includes the salt for key derivation
    const keyId = salt.toString('base64');

    return {
      encryptedData: encrypted,
      keyId,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Decrypt credentials using AES-256-GCM
   */
  private async decryptCredentials(params: {
    encryptedData: string;
    keyId: string;
    iv: string;
    authTag: string;
  }): Promise<Record<string, unknown>> {
    const { encryptedData, keyId, iv, authTag } = params;

    // Derive the same key using the salt from keyId
    const salt = Buffer.from(keyId, 'base64');
    const derivedKey = (await scryptAsync(this.masterKey, salt, KEY_LENGTH)) as Buffer;

    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, derivedKey, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}
