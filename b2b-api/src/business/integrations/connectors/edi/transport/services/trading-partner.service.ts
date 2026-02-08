import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  TradingPartner,
  TransportProtocol,
  As2PartnerProfile,
  SftpPartnerProfile,
  As2MdnMode,
  SftpAuthMethod,
  TransportHealthCheck,
} from '../interfaces';
import { As2ClientService } from './as2-client.service';
import { SftpClientService } from './sftp-client.service';

/**
 * Create Trading Partner DTO
 */
export interface CreateTradingPartnerDto {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  protocols: TransportProtocol[];
  as2Config?: {
    as2Id: string;
    targetUrl: string;
    email?: string;
    signingCertificateId?: string;
    encryptionCertificateId?: string;
    mdnMode?: As2MdnMode;
    mdnAsyncUrl?: string;
    requestMdnSigned?: boolean;
    httpHeaders?: Record<string, string>;
    httpAuth?: {
      type: 'basic' | 'bearer' | 'none';
      username?: string;
      password?: string;
      token?: string;
    };
    timeoutMs?: number;
  };
  sftpConfig?: {
    host: string;
    port?: number;
    username: string;
    authMethod?: SftpAuthMethod;
    password?: string;
    privateKeyId?: string;
    passphrase?: string;
    hostKeyFingerprint?: string;
    strictHostKeyChecking?: boolean;
    timeoutMs?: number;
    inboundDirectory?: string;
    inboundPattern?: string;
    outboundDirectory?: string;
    filenameTemplate?: string;
    processedDirectory?: string;
    errorDirectory?: string;
    deleteAfterProcessing?: boolean;
    pollIntervalMs?: number;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Update Trading Partner DTO
 */
export interface UpdateTradingPartnerDto extends Partial<CreateTradingPartnerDto> {
  isActive?: boolean;
}

/**
 * Trading Partner Service
 *
 * Manages trading partner profiles and coordinates AS2/SFTP configuration.
 */
@Injectable()
export class TradingPartnerService {
  private readonly logger = new Logger(TradingPartnerService.name);
  private readonly partners = new Map<string, TradingPartner>();
  private readonly partnersByCode = new Map<string, Map<string, TradingPartner>>(); // tenantId -> code -> partner

  constructor(
    private readonly configService: ConfigService,
    private readonly as2Client: As2ClientService,
    private readonly sftpClient: SftpClientService,
  ) {}

  /**
   * Create a new trading partner
   */
  async create(dto: CreateTradingPartnerDto): Promise<TradingPartner> {
    const id = randomUUID();
    const now = new Date();

    // Build AS2 profile if configured
    let as2Profile: As2PartnerProfile | undefined;
    if (dto.as2Config && dto.protocols.includes(TransportProtocol.AS2)) {
      as2Profile = {
        partnerId: id,
        partnerName: dto.name,
        as2Id: dto.as2Config.as2Id,
        targetUrl: dto.as2Config.targetUrl,
        email: dto.as2Config.email,
        signingCertificateId: dto.as2Config.signingCertificateId,
        encryptionCertificateId: dto.as2Config.encryptionCertificateId,
        mdnMode: dto.as2Config.mdnMode || As2MdnMode.SYNC,
        mdnAsyncUrl: dto.as2Config.mdnAsyncUrl,
        requestMdnSigned: dto.as2Config.requestMdnSigned,
        httpHeaders: dto.as2Config.httpHeaders,
        httpAuth: dto.as2Config.httpAuth,
        timeoutMs: dto.as2Config.timeoutMs,
        isActive: true,
      };
    }

    // Build SFTP profile if configured
    let sftpProfile: SftpPartnerProfile | undefined;
    if (dto.sftpConfig && dto.protocols.includes(TransportProtocol.SFTP)) {
      sftpProfile = {
        partnerId: id,
        partnerName: dto.name,
        connection: {
          host: dto.sftpConfig.host,
          port: dto.sftpConfig.port || 22,
          username: dto.sftpConfig.username,
          authMethod: dto.sftpConfig.authMethod || SftpAuthMethod.PASSWORD,
          password: dto.sftpConfig.password,
          privateKeyId: dto.sftpConfig.privateKeyId,
          passphrase: dto.sftpConfig.passphrase,
          hostKeyFingerprint: dto.sftpConfig.hostKeyFingerprint,
          strictHostKeyChecking: dto.sftpConfig.strictHostKeyChecking,
          timeoutMs: dto.sftpConfig.timeoutMs,
        },
        inbound: dto.sftpConfig.inboundDirectory
          ? {
              directory: dto.sftpConfig.inboundDirectory,
              filenamePattern: dto.sftpConfig.inboundPattern,
              pollIntervalMs: dto.sftpConfig.pollIntervalMs,
              processedDirectory: dto.sftpConfig.processedDirectory,
              errorDirectory: dto.sftpConfig.errorDirectory,
              deleteAfterProcessing: dto.sftpConfig.deleteAfterProcessing,
            }
          : undefined,
        outbound: dto.sftpConfig.outboundDirectory
          ? {
              directory: dto.sftpConfig.outboundDirectory,
              filenameTemplate: dto.sftpConfig.filenameTemplate,
            }
          : undefined,
        isActive: true,
      };
    }

    const partner: TradingPartner = {
      id,
      tenantId: dto.tenantId,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      protocols: dto.protocols,
      as2Profile,
      sftpProfile,
      isActive: true,
      metadata: dto.metadata,
      createdAt: now,
      updatedAt: now,
    };

    // Store partner
    this.partners.set(id, partner);

    // Index by tenant and code
    if (!this.partnersByCode.has(dto.tenantId)) {
      this.partnersByCode.set(dto.tenantId, new Map());
    }
    this.partnersByCode.get(dto.tenantId)!.set(dto.code, partner);

    // Register with transport services
    if (as2Profile) {
      this.as2Client.registerPartner(as2Profile);
    }
    if (sftpProfile) {
      this.sftpClient.registerPartner(sftpProfile);
    }

    this.logger.log(`Created trading partner: ${partner.name} (${partner.code})`);
    return partner;
  }

  /**
   * Get trading partner by ID
   */
  async findById(id: string): Promise<TradingPartner | undefined> {
    return this.partners.get(id);
  }

  /**
   * Get trading partner by code within a tenant
   */
  async findByCode(tenantId: string, code: string): Promise<TradingPartner | undefined> {
    return this.partnersByCode.get(tenantId)?.get(code);
  }

  /**
   * List trading partners for a tenant
   */
  async findByTenant(
    tenantId: string,
    options?: {
      protocol?: TransportProtocol;
      isActive?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<{ partners: TradingPartner[]; total: number }> {
    let partners = Array.from(this.partners.values()).filter((p) => p.tenantId === tenantId);

    // Apply filters
    if (options?.protocol) {
      partners = partners.filter((p) => p.protocols.includes(options.protocol!));
    }
    if (options?.isActive !== undefined) {
      partners = partners.filter((p) => p.isActive === options.isActive);
    }

    const total = partners.length;

    // Apply pagination
    if (options?.page !== undefined && options?.limit !== undefined) {
      const offset = (options.page - 1) * options.limit;
      partners = partners.slice(offset, offset + options.limit);
    }

    return { partners, total };
  }

  /**
   * Update trading partner
   */
  async update(id: string, dto: UpdateTradingPartnerDto): Promise<TradingPartner | undefined> {
    const partner = this.partners.get(id);
    if (!partner) {
      return undefined;
    }

    // Update basic fields
    if (dto.name !== undefined) partner.name = dto.name;
    if (dto.description !== undefined) partner.description = dto.description;
    if (dto.protocols !== undefined) partner.protocols = dto.protocols;
    if (dto.isActive !== undefined) partner.isActive = dto.isActive;
    if (dto.metadata !== undefined) partner.metadata = dto.metadata;
    partner.updatedAt = new Date();

    // Update AS2 profile
    if (dto.as2Config && partner.as2Profile) {
      Object.assign(partner.as2Profile, {
        as2Id: dto.as2Config.as2Id ?? partner.as2Profile.as2Id,
        targetUrl: dto.as2Config.targetUrl ?? partner.as2Profile.targetUrl,
        email: dto.as2Config.email ?? partner.as2Profile.email,
        signingCertificateId:
          dto.as2Config.signingCertificateId ?? partner.as2Profile.signingCertificateId,
        encryptionCertificateId:
          dto.as2Config.encryptionCertificateId ?? partner.as2Profile.encryptionCertificateId,
        mdnMode: dto.as2Config.mdnMode ?? partner.as2Profile.mdnMode,
        mdnAsyncUrl: dto.as2Config.mdnAsyncUrl ?? partner.as2Profile.mdnAsyncUrl,
        requestMdnSigned: dto.as2Config.requestMdnSigned ?? partner.as2Profile.requestMdnSigned,
        httpHeaders: dto.as2Config.httpHeaders ?? partner.as2Profile.httpHeaders,
        httpAuth: dto.as2Config.httpAuth ?? partner.as2Profile.httpAuth,
        timeoutMs: dto.as2Config.timeoutMs ?? partner.as2Profile.timeoutMs,
        isActive: partner.isActive,
      });

      // Re-register with AS2 client
      this.as2Client.registerPartner(partner.as2Profile);
    }

    // Update SFTP profile
    if (dto.sftpConfig && partner.sftpProfile) {
      Object.assign(partner.sftpProfile.connection, {
        host: dto.sftpConfig.host ?? partner.sftpProfile.connection.host,
        port: dto.sftpConfig.port ?? partner.sftpProfile.connection.port,
        username: dto.sftpConfig.username ?? partner.sftpProfile.connection.username,
        authMethod: dto.sftpConfig.authMethod ?? partner.sftpProfile.connection.authMethod,
        password: dto.sftpConfig.password ?? partner.sftpProfile.connection.password,
        privateKeyId: dto.sftpConfig.privateKeyId ?? partner.sftpProfile.connection.privateKeyId,
        passphrase: dto.sftpConfig.passphrase ?? partner.sftpProfile.connection.passphrase,
        hostKeyFingerprint:
          dto.sftpConfig.hostKeyFingerprint ?? partner.sftpProfile.connection.hostKeyFingerprint,
        strictHostKeyChecking:
          dto.sftpConfig.strictHostKeyChecking ??
          partner.sftpProfile.connection.strictHostKeyChecking,
        timeoutMs: dto.sftpConfig.timeoutMs ?? partner.sftpProfile.connection.timeoutMs,
      });

      if (dto.sftpConfig.inboundDirectory !== undefined) {
        partner.sftpProfile.inbound = {
          directory: dto.sftpConfig.inboundDirectory,
          filenamePattern: dto.sftpConfig.inboundPattern,
          pollIntervalMs: dto.sftpConfig.pollIntervalMs,
          processedDirectory: dto.sftpConfig.processedDirectory,
          errorDirectory: dto.sftpConfig.errorDirectory,
          deleteAfterProcessing: dto.sftpConfig.deleteAfterProcessing,
        };
      }

      if (dto.sftpConfig.outboundDirectory !== undefined) {
        partner.sftpProfile.outbound = {
          directory: dto.sftpConfig.outboundDirectory,
          filenameTemplate: dto.sftpConfig.filenameTemplate,
        };
      }

      partner.sftpProfile.isActive = partner.isActive;

      // Re-register with SFTP client
      this.sftpClient.registerPartner(partner.sftpProfile);
    }

    this.logger.log(`Updated trading partner: ${partner.name} (${partner.code})`);
    return partner;
  }

  /**
   * Delete trading partner
   */
  async delete(id: string): Promise<boolean> {
    const partner = this.partners.get(id);
    if (!partner) {
      return false;
    }

    // Unregister from transport services
    if (partner.as2Profile) {
      this.as2Client.removePartner(partner.as2Profile.partnerId);
    }
    if (partner.sftpProfile) {
      await this.sftpClient.removePartner(partner.sftpProfile.partnerId);
    }

    // Remove from stores
    this.partners.delete(id);
    this.partnersByCode.get(partner.tenantId)?.delete(partner.code);

    this.logger.log(`Deleted trading partner: ${partner.name} (${partner.code})`);
    return true;
  }

  /**
   * Test connection to a trading partner
   */
  async testConnection(id: string, protocol: TransportProtocol): Promise<TransportHealthCheck> {
    const partner = this.partners.get(id);
    if (!partner) {
      return {
        partnerId: id,
        protocol,
        isHealthy: false,
        lastCheckedAt: new Date(),
        consecutiveFailures: 1,
        error: 'Partner not found',
      };
    }

    if (protocol === TransportProtocol.AS2 && partner.as2Profile) {
      // For AS2, we can only test if partner has a test endpoint
      // For now, we assume healthy if profile exists
      return {
        partnerId: id,
        protocol,
        isHealthy: partner.isActive,
        lastCheckedAt: new Date(),
        consecutiveFailures: 0,
      };
    }

    if (protocol === TransportProtocol.SFTP && partner.sftpProfile) {
      const result = await this.sftpClient.testConnection(partner.sftpProfile.partnerId);
      return {
        partnerId: id,
        protocol,
        isHealthy: result.success,
        lastCheckedAt: new Date(),
        lastSuccessAt: result.success ? new Date() : undefined,
        consecutiveFailures: result.success ? 0 : 1,
        error: result.error,
        latencyMs: result.latencyMs,
      };
    }

    return {
      partnerId: id,
      protocol,
      isHealthy: false,
      lastCheckedAt: new Date(),
      consecutiveFailures: 1,
      error: `Protocol ${protocol} not configured for partner`,
    };
  }

  /**
   * Get health status for all partners
   */
  async getHealthStatus(tenantId: string): Promise<Map<string, TransportHealthCheck[]>> {
    const healthStatus = new Map<string, TransportHealthCheck[]>();
    const { partners } = await this.findByTenant(tenantId, { isActive: true });

    for (const partner of partners) {
      const checks: TransportHealthCheck[] = [];

      for (const protocol of partner.protocols) {
        const check = await this.testConnection(partner.id, protocol);
        checks.push(check);
      }

      healthStatus.set(partner.id, checks);
    }

    return healthStatus;
  }
}
