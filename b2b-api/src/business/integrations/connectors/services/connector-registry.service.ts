import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import {
  IntegrationConnector,
  ConnectorConfig,
  ConnectorCapability,
  ConnectorEventType,
  ConnectorTestStatus,
  IntegrationConnectorType,
  IntegrationDirection,
  Prisma,
} from '@prisma/client';
import { CredentialVaultService } from './credential-vault.service';
import {
  IConnector,
  ConnectorContext,
  ConnectionTestResult,
  CapabilityDefinition,
  ConfigSchema,
  ConnectorRegistration,
  ConnectorOperationResult,
} from '../interfaces';

export interface RegisterConnectorDto {
  code: string;
  name: string;
  description?: string;
  type: IntegrationConnectorType;
  direction: IntegrationDirection;
  pluginPath?: string;
  pluginVersion?: string;
  isBuiltIn?: boolean;
  config?: Record<string, unknown>;
  configSchema?: Record<string, unknown>;
  declaredCapabilities?: string[];
  rateLimit?: number;
  rateLimitWindow?: number;
  failureThreshold?: number;
  successThreshold?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateConnectorRegistrationDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  config?: Record<string, unknown>;
  configSchema?: Record<string, unknown>;
  declaredCapabilities?: string[];
  rateLimit?: number;
  rateLimitWindow?: number;
  failureThreshold?: number;
  successThreshold?: number;
  metadata?: Record<string, unknown>;
}

export interface ConfigureConnectorDto {
  tenantId: string;
  connectorId: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  config?: Record<string, unknown>;
  credentialVaultId?: string;
  enabledCapabilities?: string[];
  webhookUrl?: string;
  webhookSecret?: string;
  webhookEvents?: string[];
  rateLimit?: number;
  rateLimitWindow?: number;
  transformationOverrides?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateConnectorConfigDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  config?: Record<string, unknown>;
  credentialVaultId?: string | null;
  enabledCapabilities?: string[];
  webhookUrl?: string;
  webhookSecret?: string;
  webhookEvents?: string[];
  rateLimit?: number;
  rateLimitWindow?: number;
  transformationOverrides?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ConnectorQueryDto {
  type?: IntegrationConnectorType;
  direction?: IntegrationDirection;
  isActive?: boolean;
  isBuiltIn?: boolean;
  page?: number;
  limit?: number;
}

export interface ConnectorConfigQueryDto {
  tenantId: string;
  connectorId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ExecuteCapabilityDto {
  configId: string;
  capability: string;
  input: Record<string, unknown>;
  correlationId?: string;
  userId?: string;
}

@Injectable()
export class ConnectorRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ConnectorRegistryService.name);
  private readonly connectorInstances = new Map<string, ConnectorRegistration>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialVaultService: CredentialVaultService,
  ) {}

  async onModuleInit() {
    this.logger.log('Connector Registry Service initialized');
    await this.loadBuiltInConnectors();
  }

  // ============================================
  // Connector Registration (Plugin Management)
  // ============================================

  /**
   * Register a new connector definition
   */
  async registerConnector(dto: RegisterConnectorDto): Promise<IntegrationConnector> {
    // Check if connector code already exists
    const existing = await this.prisma.integrationConnector.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(`Connector with code '${dto.code}' already exists`);
    }

    const connector = await this.prisma.integrationConnector.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        direction: dto.direction,
        pluginPath: dto.pluginPath,
        pluginVersion: dto.pluginVersion,
        isBuiltIn: dto.isBuiltIn ?? false,
        config: (dto.config ?? {}) as Prisma.JsonObject,
        configSchema: dto.configSchema as Prisma.JsonObject | undefined,
        declaredCapabilities: dto.declaredCapabilities ?? [],
        rateLimit: dto.rateLimit,
        rateLimitWindow: dto.rateLimitWindow,
        failureThreshold: dto.failureThreshold ?? 5,
        successThreshold: dto.successThreshold ?? 3,
        metadata: (dto.metadata ?? {}) as Prisma.JsonObject,
        credentials: {} as Prisma.JsonObject,
      },
    });

    // Log event
    await this.logConnectorEvent({
      eventType: ConnectorEventType.REGISTERED,
      connectorCode: connector.code,
      data: { type: dto.type, direction: dto.direction },
    });

    return connector;
  }

  /**
   * Update connector registration
   */
  async updateConnectorRegistration(
    id: string,
    dto: UpdateConnectorRegistrationDto,
  ): Promise<IntegrationConnector> {
    const updateData: Prisma.IntegrationConnectorUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.config !== undefined) updateData.config = dto.config as unknown as Prisma.JsonObject;
    if (dto.configSchema !== undefined) {
      updateData.configSchema = dto.configSchema as unknown as Prisma.JsonObject;
    }
    if (dto.declaredCapabilities !== undefined) {
      updateData.declaredCapabilities = dto.declaredCapabilities;
    }
    if (dto.rateLimit !== undefined) updateData.rateLimit = dto.rateLimit;
    if (dto.rateLimitWindow !== undefined) updateData.rateLimitWindow = dto.rateLimitWindow;
    if (dto.failureThreshold !== undefined) updateData.failureThreshold = dto.failureThreshold;
    if (dto.successThreshold !== undefined) updateData.successThreshold = dto.successThreshold;
    if (dto.metadata !== undefined)
      updateData.metadata = dto.metadata as unknown as Prisma.JsonObject;

    return this.prisma.integrationConnector.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Unregister (delete) a connector
   */
  async unregisterConnector(id: string): Promise<void> {
    const connector = await this.prisma.integrationConnector.findUnique({
      where: { id },
      include: { configs: true },
    });

    if (!connector) {
      throw new NotFoundException(`Connector not found: ${id}`);
    }

    if (connector.configs.length > 0) {
      throw new BadRequestException(
        `Cannot unregister connector: ${connector.configs.length} configuration(s) exist`,
      );
    }

    // Remove from instance cache
    this.connectorInstances.delete(connector.code);

    // Delete capabilities first
    await this.prisma.connectorCapability.deleteMany({
      where: { connectorId: id },
    });

    await this.prisma.integrationConnector.delete({
      where: { id },
    });
  }

  /**
   * Get connector by ID
   */
  async getConnector(id: string): Promise<IntegrationConnector | null> {
    return this.prisma.integrationConnector.findUnique({
      where: { id },
      include: { capabilities: true },
    });
  }

  /**
   * Get connector by code
   */
  async getConnectorByCode(code: string): Promise<IntegrationConnector | null> {
    return this.prisma.integrationConnector.findUnique({
      where: { code },
      include: { capabilities: true },
    });
  }

  /**
   * List all registered connectors
   */
  async listConnectors(query: ConnectorQueryDto) {
    const { type, direction, isActive, isBuiltIn, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.IntegrationConnectorWhereInput = {};

    if (type) where.type = type;
    if (direction) where.direction = direction;
    if (isActive !== undefined) where.isActive = isActive;
    if (isBuiltIn !== undefined) where.isBuiltIn = isBuiltIn;

    const [items, total] = await Promise.all([
      this.prisma.integrationConnector.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          capabilities: true,
          _count: { select: { configs: true } },
        },
      }),
      this.prisma.integrationConnector.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================
  // Connector Configuration (Per-Tenant)
  // ============================================

  /**
   * Configure a connector for a tenant
   */
  async configureConnector(dto: ConfigureConnectorDto): Promise<ConnectorConfig> {
    // Verify connector exists
    const connector = await this.prisma.integrationConnector.findUnique({
      where: { id: dto.connectorId },
    });

    if (!connector) {
      throw new NotFoundException(`Connector not found: ${dto.connectorId}`);
    }

    if (!connector.isActive) {
      throw new BadRequestException('Cannot configure inactive connector');
    }

    // If setting as primary, unset other primary configs for same connector
    if (dto.isPrimary) {
      await this.prisma.connectorConfig.updateMany({
        where: {
          tenantId: dto.tenantId,
          connectorId: dto.connectorId,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    const config = await this.prisma.connectorConfig.create({
      data: {
        tenantId: dto.tenantId,
        connectorId: dto.connectorId,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? true,
        isPrimary: dto.isPrimary ?? false,
        config: (dto.config ?? {}) as Prisma.JsonObject,
        credentialVaultId: dto.credentialVaultId,
        enabledCapabilities: dto.enabledCapabilities ?? [],
        webhookUrl: dto.webhookUrl,
        webhookSecret: dto.webhookSecret,
        webhookEvents: dto.webhookEvents ?? [],
        rateLimit: dto.rateLimit,
        rateLimitWindow: dto.rateLimitWindow,
        transformationOverrides: dto.transformationOverrides as Prisma.JsonObject | undefined,
        metadata: (dto.metadata ?? {}) as Prisma.JsonObject,
      },
      include: {
        connector: true,
        credentialVault: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    // Log event
    await this.logConnectorEvent({
      eventType: ConnectorEventType.CONFIGURED,
      connectorCode: connector.code,
      configId: config.id,
      tenantId: dto.tenantId,
      data: { configName: dto.name },
    });

    return config;
  }

  /**
   * Update connector configuration
   */
  async updateConnectorConfig(id: string, dto: UpdateConnectorConfigDto): Promise<ConnectorConfig> {
    const existing = await this.prisma.connectorConfig.findUnique({
      where: { id },
      include: { connector: true },
    });

    if (!existing) {
      throw new NotFoundException(`Connector config not found: ${id}`);
    }

    // If setting as primary, unset other primary configs
    if (dto.isPrimary) {
      await this.prisma.connectorConfig.updateMany({
        where: {
          tenantId: existing.tenantId,
          connectorId: existing.connectorId,
          isPrimary: true,
          id: { not: id },
        },
        data: { isPrimary: false },
      });
    }

    const updateData: Prisma.ConnectorConfigUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.isPrimary !== undefined) updateData.isPrimary = dto.isPrimary;
    if (dto.config !== undefined) updateData.config = dto.config as Prisma.JsonObject;
    if (dto.credentialVaultId !== undefined) {
      updateData.credentialVault = dto.credentialVaultId
        ? { connect: { id: dto.credentialVaultId } }
        : { disconnect: true };
    }
    if (dto.enabledCapabilities !== undefined) {
      updateData.enabledCapabilities = dto.enabledCapabilities;
    }
    if (dto.webhookUrl !== undefined) updateData.webhookUrl = dto.webhookUrl;
    if (dto.webhookSecret !== undefined) updateData.webhookSecret = dto.webhookSecret;
    if (dto.webhookEvents !== undefined) updateData.webhookEvents = dto.webhookEvents;
    if (dto.rateLimit !== undefined) updateData.rateLimit = dto.rateLimit;
    if (dto.rateLimitWindow !== undefined) updateData.rateLimitWindow = dto.rateLimitWindow;
    if (dto.transformationOverrides !== undefined) {
      updateData.transformationOverrides = dto.transformationOverrides as Prisma.JsonObject;
    }
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata as Prisma.JsonObject;

    return this.prisma.connectorConfig.update({
      where: { id },
      data: updateData,
      include: {
        connector: true,
        credentialVault: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  /**
   * Delete connector configuration
   */
  async deleteConnectorConfig(id: string): Promise<void> {
    await this.prisma.connectorConfig.delete({
      where: { id },
    });
  }

  /**
   * Get connector configuration
   */
  async getConnectorConfig(id: string): Promise<ConnectorConfig | null> {
    return this.prisma.connectorConfig.findUnique({
      where: { id },
      include: {
        connector: true,
        credentialVault: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  /**
   * List connector configurations for a tenant
   */
  async listConnectorConfigs(query: ConnectorConfigQueryDto) {
    const { tenantId, connectorId, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ConnectorConfigWhereInput = { tenantId };

    if (connectorId) where.connectorId = connectorId;
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      this.prisma.connectorConfig.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
        include: {
          connector: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              direction: true,
              isActive: true,
            },
          },
          credentialVault: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      }),
      this.prisma.connectorConfig.count({ where }),
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
   * Get primary configuration for a connector/tenant
   */
  async getPrimaryConfig(tenantId: string, connectorId: string): Promise<ConnectorConfig | null> {
    return this.prisma.connectorConfig.findFirst({
      where: {
        tenantId,
        connectorId,
        isPrimary: true,
        isActive: true,
      },
      include: {
        connector: true,
        credentialVault: true,
      },
    });
  }

  // ============================================
  // Connector Lifecycle
  // ============================================

  /**
   * Enable a connector (globally)
   */
  async enableConnector(id: string): Promise<IntegrationConnector> {
    const connector = await this.prisma.integrationConnector.update({
      where: { id },
      data: { isActive: true },
    });

    await this.logConnectorEvent({
      eventType: ConnectorEventType.ENABLED,
      connectorCode: connector.code,
    });

    return connector;
  }

  /**
   * Disable a connector (globally)
   */
  async disableConnector(id: string): Promise<IntegrationConnector> {
    const connector = await this.prisma.integrationConnector.update({
      where: { id },
      data: { isActive: false },
    });

    await this.logConnectorEvent({
      eventType: ConnectorEventType.DISABLED,
      connectorCode: connector.code,
    });

    return connector;
  }

  /**
   * Enable a connector configuration
   */
  async enableConnectorConfig(id: string): Promise<ConnectorConfig> {
    const config = await this.prisma.connectorConfig.update({
      where: { id },
      data: { isActive: true },
      include: { connector: true },
    });

    await this.logConnectorEvent({
      eventType: ConnectorEventType.ENABLED,
      connectorCode: config.connector.code,
      configId: id,
      tenantId: config.tenantId,
    });

    return config;
  }

  /**
   * Disable a connector configuration
   */
  async disableConnectorConfig(id: string): Promise<ConnectorConfig> {
    const config = await this.prisma.connectorConfig.update({
      where: { id },
      data: { isActive: false },
      include: { connector: true },
    });

    await this.logConnectorEvent({
      eventType: ConnectorEventType.DISABLED,
      connectorCode: config.connector.code,
      configId: id,
      tenantId: config.tenantId,
    });

    return config;
  }

  // ============================================
  // Capability Management
  // ============================================

  /**
   * Declare capabilities for a connector
   */
  async declareCapabilities(
    connectorId: string,
    capabilities: CapabilityDefinition[],
  ): Promise<ConnectorCapability[]> {
    const connector = await this.prisma.integrationConnector.findUnique({
      where: { id: connectorId },
    });

    if (!connector) {
      throw new NotFoundException(`Connector not found: ${connectorId}`);
    }

    // Delete existing capabilities
    await this.prisma.connectorCapability.deleteMany({
      where: { connectorId },
    });

    // Create new capabilities
    const created = await Promise.all(
      capabilities.map((cap) =>
        this.prisma.connectorCapability.create({
          data: {
            connectorId,
            code: cap.code,
            name: cap.name,
            description: cap.description,
            category: cap.category,
            inputSchema: cap.inputSchema as Prisma.JsonObject | undefined,
            outputSchema: cap.outputSchema as Prisma.JsonObject | undefined,
            configSchema: cap.configSchema as Prisma.JsonObject | undefined,
            requiredScopes: cap.requiredScopes ?? [],
            requiredPermissions: cap.requiredPermissions ?? [],
            isOptional: cap.isOptional ?? true,
          },
        }),
      ),
    );

    // Update connector's declared capabilities
    await this.prisma.integrationConnector.update({
      where: { id: connectorId },
      data: {
        declaredCapabilities: capabilities.map((c) => c.code),
      },
    });

    return created;
  }

  /**
   * Get capabilities for a connector
   */
  async getConnectorCapabilities(connectorId: string): Promise<ConnectorCapability[]> {
    return this.prisma.connectorCapability.findMany({
      where: { connectorId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get enabled capabilities for a config
   */
  async getEnabledCapabilities(configId: string): Promise<ConnectorCapability[]> {
    const config = await this.prisma.connectorConfig.findUnique({
      where: { id: configId },
      include: { connector: { include: { capabilities: true } } },
    });

    if (!config) return [];

    // If no specific capabilities enabled, return all non-optional
    if (!config.enabledCapabilities.length) {
      return config.connector.capabilities.filter((c) => !c.isOptional);
    }

    return config.connector.capabilities.filter((c) => config.enabledCapabilities.includes(c.code));
  }

  // ============================================
  // Test Connection
  // ============================================

  /**
   * Test connection for a connector configuration
   */
  async testConnection(configId: string): Promise<ConnectionTestResult> {
    const config = await this.prisma.connectorConfig.findUnique({
      where: { id: configId },
      include: {
        connector: true,
        credentialVault: true,
      },
    });

    if (!config) {
      throw new NotFoundException(`Connector config not found: ${configId}`);
    }

    if (!config.connector.isActive) {
      return {
        success: false,
        message: 'Connector is disabled',
        errors: ['Connector is globally disabled'],
      };
    }

    const startTime = Date.now();

    try {
      // Get connector instance
      const connectorInstance = await this.getConnectorInstance(config.connector.code);

      if (!connectorInstance) {
        // No plugin loaded, perform basic validation
        const result = await this.performBasicConnectionTest(config);
        await this.updateTestResult(configId, result, Date.now() - startTime);
        return result;
      }

      // Get decrypted credentials if available
      let credentials: Record<string, unknown> = {};
      if (config.credentialVaultId) {
        const decrypted = await this.credentialVaultService.getDecryptedCredentials(
          config.credentialVaultId,
          { connectorCode: config.connector.code },
        );
        credentials = decrypted.credentials;
      }

      // Build context
      const context: ConnectorContext = {
        tenantId: config.tenantId,
        configId: config.id,
        config: config.config as Record<string, unknown>,
        credentials,
      };

      // Test connection via plugin
      const result = await connectorInstance.connector.testConnection(context);
      await this.updateTestResult(configId, result, Date.now() - startTime);

      // Log event
      await this.logConnectorEvent({
        eventType: result.success
          ? ConnectorEventType.CONNECTION_SUCCESS
          : ConnectorEventType.CONNECTION_FAILURE,
        connectorCode: config.connector.code,
        configId,
        tenantId: config.tenantId,
        data: { latencyMs: result.latencyMs, message: result.message },
        error: result.success ? undefined : result.message,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      const result: ConnectionTestResult = {
        success: false,
        message: `Connection test failed: ${errorMessage}`,
        latencyMs: Date.now() - startTime,
        errors: [errorMessage],
      };

      await this.updateTestResult(configId, result, Date.now() - startTime);

      await this.logConnectorEvent({
        eventType: ConnectorEventType.CONNECTION_FAILURE,
        connectorCode: config.connector.code,
        configId,
        tenantId: config.tenantId,
        error: errorMessage,
        duration: Date.now() - startTime,
      });

      return result;
    }
  }

  private async performBasicConnectionTest(
    config: ConnectorConfig & { connector: IntegrationConnector },
  ): Promise<ConnectionTestResult> {
    // Basic validation when no plugin is loaded
    const errors: string[] = [];

    // Check if config has required fields
    const configData = config.config as Record<string, unknown>;
    const schema = config.connector.configSchema as ConfigSchema | null;

    if (schema?.required) {
      for (const field of schema.required) {
        if (!(field in configData)) {
          errors.push(`Missing required config field: ${field}`);
        }
      }
    }

    // Check if credentials are configured when needed
    if (!config.credentialVaultId) {
      errors.push('No credentials configured');
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: 'Configuration validation failed',
        errors,
      };
    }

    return {
      success: true,
      message: 'Basic configuration validation passed',
      capabilities: config.connector.declaredCapabilities,
    };
  }

  private async updateTestResult(
    configId: string,
    result: ConnectionTestResult,
    _duration: number,
  ): Promise<void> {
    await this.prisma.connectorConfig.update({
      where: { id: configId },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: result.success ? ConnectorTestStatus.SUCCESS : ConnectorTestStatus.FAILURE,
        lastTestError: result.success ? null : result.message,
      },
    });
  }

  // ============================================
  // Execute Capability
  // ============================================

  /**
   * Execute a capability via a connector
   */
  async executeCapability(dto: ExecuteCapabilityDto): Promise<ConnectorOperationResult> {
    const config = await this.prisma.connectorConfig.findUnique({
      where: { id: dto.configId },
      include: {
        connector: { include: { capabilities: true } },
        credentialVault: true,
      },
    });

    if (!config) {
      throw new NotFoundException(`Connector config not found: ${dto.configId}`);
    }

    if (!config.isActive) {
      return {
        success: false,
        error: 'Connector configuration is disabled',
        retryable: false,
      };
    }

    if (!config.connector.isActive) {
      return {
        success: false,
        error: 'Connector is globally disabled',
        retryable: false,
      };
    }

    // Check if capability is enabled
    const capability = config.connector.capabilities.find((c) => c.code === dto.capability);
    if (!capability) {
      return {
        success: false,
        error: `Unknown capability: ${dto.capability}`,
        retryable: false,
      };
    }

    if (
      config.enabledCapabilities.length > 0 &&
      !config.enabledCapabilities.includes(dto.capability)
    ) {
      return {
        success: false,
        error: `Capability not enabled: ${dto.capability}`,
        retryable: false,
      };
    }

    // Get connector instance
    const connectorInstance = await this.getConnectorInstance(config.connector.code);
    if (!connectorInstance) {
      return {
        success: false,
        error: 'Connector plugin not loaded',
        retryable: false,
      };
    }

    // Get credentials
    let credentials: Record<string, unknown> = {};
    if (config.credentialVaultId) {
      const decrypted = await this.credentialVaultService.getDecryptedCredentials(
        config.credentialVaultId,
        { connectorCode: config.connector.code, userId: dto.userId },
      );
      credentials = decrypted.credentials;
    }

    // Build context
    const context: ConnectorContext = {
      tenantId: config.tenantId,
      configId: config.id,
      config: config.config as Record<string, unknown>,
      credentials,
      correlationId: dto.correlationId,
      userId: dto.userId,
    };

    try {
      const result = await connectorInstance.connector.executeCapability(
        dto.capability,
        dto.input,
        context,
      );
      return result;
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        retryable: true,
      };
    }
  }

  // ============================================
  // Dynamic Connector Loading
  // ============================================

  /**
   * Load built-in connectors
   */
  private async loadBuiltInConnectors(): Promise<void> {
    this.logger.log('Loading built-in connectors...');

    // Built-in connectors would be registered here
    // For now, we just log that we would load them
    const builtInConnectors = await this.prisma.integrationConnector.findMany({
      where: { isBuiltIn: true },
    });

    for (const connector of builtInConnectors) {
      try {
        // Would load the actual plugin here
        this.logger.debug(`Built-in connector registered: ${connector.code}`);
      } catch (error) {
        this.logger.error(`Failed to load built-in connector ${connector.code}:`, error);
      }
    }
  }

  /**
   * Load a connector plugin dynamically
   */
  async loadConnectorPlugin(connectorCode: string): Promise<IConnector | null> {
    const connector = await this.prisma.integrationConnector.findUnique({
      where: { code: connectorCode },
    });

    if (!connector || !connector.pluginPath) {
      return null;
    }

    try {
      // Dynamic import of connector plugin
      // In production, this would use proper plugin loading mechanism
      // const module = await import(connector.pluginPath);
      // const factory: IConnectorFactory = new module.default();
      // const instance = factory.create();

      // For now, return null as plugins would be implemented separately
      return null;
    } catch (error) {
      this.logger.error(`Failed to load connector plugin ${connectorCode}:`, error);
      return null;
    }
  }

  /**
   * Register a connector instance (for programmatic registration)
   */
  registerConnectorInstance(connector: IConnector): void {
    const metadata = connector.getMetadata();

    this.connectorInstances.set(metadata.code, {
      connector,
      metadata,
      state: 'registered',
      loadedAt: new Date(),
    });

    this.logger.log(`Connector instance registered: ${metadata.code}`);
  }

  /**
   * Get connector instance
   */
  async getConnectorInstance(code: string): Promise<ConnectorRegistration | null> {
    // Check if already loaded
    if (this.connectorInstances.has(code)) {
      return this.connectorInstances.get(code) ?? null;
    }

    // Try to load dynamically
    const connector = await this.loadConnectorPlugin(code);
    if (connector) {
      this.registerConnectorInstance(connector);
      return this.connectorInstances.get(code) ?? null;
    }

    return null;
  }

  /**
   * Unload a connector instance
   */
  async unloadConnectorInstance(code: string): Promise<void> {
    const registration = this.connectorInstances.get(code);
    if (registration?.connector.destroy) {
      await registration.connector.destroy();
    }
    this.connectorInstances.delete(code);
  }

  // ============================================
  // Event Logging
  // ============================================

  private async logConnectorEvent(params: {
    eventType: ConnectorEventType;
    connectorCode: string;
    configId?: string;
    tenantId?: string;
    userId?: string;
    correlationId?: string;
    data?: Record<string, unknown>;
    error?: string;
    duration?: number;
  }): Promise<void> {
    await this.prisma.connectorEvent.create({
      data: {
        eventType: params.eventType,
        connectorCode: params.connectorCode,
        configId: params.configId,
        tenantId: params.tenantId,
        userId: params.userId,
        correlationId: params.correlationId,
        data: (params.data ?? {}) as Prisma.JsonObject,
        error: params.error,
        duration: params.duration,
      },
    });
  }

  /**
   * Get connector events
   */
  async getConnectorEvents(params: {
    connectorCode?: string;
    configId?: string;
    tenantId?: string;
    eventType?: ConnectorEventType;
    since?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ConnectorEventWhereInput = {};

    if (params.connectorCode) where.connectorCode = params.connectorCode;
    if (params.configId) where.configId = params.configId;
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.eventType) where.eventType = params.eventType;
    if (params.since) where.createdAt = { gte: params.since };

    const [items, total] = await Promise.all([
      this.prisma.connectorEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.connectorEvent.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
