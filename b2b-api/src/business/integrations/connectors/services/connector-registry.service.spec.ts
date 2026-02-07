import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConnectorRegistryService } from './connector-registry.service';
import { CredentialVaultService } from './credential-vault.service';
import { PrismaService } from '@infrastructure/database';
import {
  IntegrationConnectorType,
  IntegrationDirection,
  ConnectorEventType,
  CapabilityCategory,
} from '@prisma/client';

describe('ConnectorRegistryService', () => {
  let service: ConnectorRegistryService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prismaService: any;

  const mockConnector = {
    id: 'connector-1',
    code: 'test-connector',
    name: 'Test Connector',
    description: 'A test connector',
    type: IntegrationConnectorType.API,
    direction: IntegrationDirection.BIDIRECTIONAL,
    isActive: true,
    isBuiltIn: false,
    pluginPath: null,
    pluginVersion: null,
    config: {},
    configSchema: null,
    credentials: {},
    declaredCapabilities: ['sync', 'webhook'],
    rateLimit: 100,
    rateLimitWindow: 60,
    currentCount: 0,
    windowStart: null,
    circuitState: 'CLOSED',
    failureCount: 0,
    failureThreshold: 5,
    successCount: 0,
    successThreshold: 3,
    lastFailureAt: null,
    circuitOpenedAt: null,
    halfOpenAt: null,
    lastHealthCheck: null,
    healthStatus: 'UNKNOWN',
    healthDetails: null,
    totalMessages: 0,
    successfulMessages: 0,
    failedMessages: 0,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    capabilities: [],
    configs: [],
    _count: { configs: 0 },
  };

  const mockConnectorConfig = {
    id: 'config-1',
    tenantId: 'tenant-1',
    connectorId: 'connector-1',
    name: 'Production Config',
    description: 'Production configuration',
    isActive: true,
    isPrimary: true,
    config: { endpoint: 'https://api.example.com' },
    credentialVaultId: 'vault-1',
    enabledCapabilities: ['sync'],
    webhookUrl: null,
    webhookSecret: null,
    webhookEvents: [],
    rateLimit: null,
    rateLimitWindow: null,
    transformationOverrides: null,
    lastTestedAt: null,
    lastTestResult: null,
    lastTestError: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    connector: mockConnector,
    credentialVault: null,
  };

  const mockCapability = {
    id: 'cap-1',
    connectorId: 'connector-1',
    code: 'sync',
    name: 'Sync Data',
    description: 'Synchronize data',
    category: CapabilityCategory.SYNC,
    inputSchema: null,
    outputSchema: null,
    configSchema: null,
    requiredScopes: [],
    requiredPermissions: [],
    isOptional: true,
    isDeprecated: false,
    deprecatedMessage: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      integrationConnector: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      connectorConfig: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      connectorCapability: {
        create: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      connectorEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockCredentialVault = {
      getDecryptedCredentials: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectorRegistryService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: CredentialVaultService,
          useValue: mockCredentialVault,
        },
      ],
    }).compile();

    service = module.get<ConnectorRegistryService>(ConnectorRegistryService);
    prismaService = module.get(PrismaService);
  });

  describe('registerConnector', () => {
    it('should register a new connector', async () => {
      prismaService.integrationConnector.findUnique.mockResolvedValue(null);
      prismaService.integrationConnector.create.mockResolvedValue(mockConnector);
      prismaService.connectorEvent.create.mockResolvedValue({} as never);

      const dto = {
        code: 'test-connector',
        name: 'Test Connector',
        type: IntegrationConnectorType.API,
        direction: IntegrationDirection.BIDIRECTIONAL,
      };

      const result = await service.registerConnector(dto);

      expect(result).toEqual(mockConnector);
      expect(prismaService.integrationConnector.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: dto.code,
          name: dto.name,
          type: dto.type,
          direction: dto.direction,
        }),
      });
      expect(prismaService.connectorEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: ConnectorEventType.REGISTERED,
          connectorCode: dto.code,
        }),
      });
    });

    it('should throw BadRequestException if connector code already exists', async () => {
      prismaService.integrationConnector.findUnique.mockResolvedValue(mockConnector);

      const dto = {
        code: 'test-connector',
        name: 'Test Connector',
        type: IntegrationConnectorType.API,
        direction: IntegrationDirection.BIDIRECTIONAL,
      };

      await expect(service.registerConnector(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateConnectorRegistration', () => {
    it('should update connector registration', async () => {
      const updatedConnector = { ...mockConnector, name: 'Updated Name' };
      prismaService.integrationConnector.update.mockResolvedValue(updatedConnector);

      const result = await service.updateConnectorRegistration('connector-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(prismaService.integrationConnector.update).toHaveBeenCalledWith({
        where: { id: 'connector-1' },
        data: { name: 'Updated Name' },
      });
    });
  });

  describe('unregisterConnector', () => {
    it('should unregister a connector with no configs', async () => {
      prismaService.integrationConnector.findUnique.mockResolvedValue({
        ...mockConnector,
        configs: [],
      });
      prismaService.connectorCapability.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.integrationConnector.delete.mockResolvedValue(mockConnector);

      await service.unregisterConnector('connector-1');

      expect(prismaService.connectorCapability.deleteMany).toHaveBeenCalledWith({
        where: { connectorId: 'connector-1' },
      });
      expect(prismaService.integrationConnector.delete).toHaveBeenCalledWith({
        where: { id: 'connector-1' },
      });
    });

    it('should throw NotFoundException if connector not found', async () => {
      prismaService.integrationConnector.findUnique.mockResolvedValue(null);

      await expect(service.unregisterConnector('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if connector has configs', async () => {
      prismaService.integrationConnector.findUnique.mockResolvedValue({
        ...mockConnector,
        configs: [mockConnectorConfig],
      });

      await expect(service.unregisterConnector('connector-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getConnector', () => {
    it('should return connector by ID', async () => {
      prismaService.integrationConnector.findUnique.mockResolvedValue(mockConnector);

      const result = await service.getConnector('connector-1');

      expect(result).toEqual(mockConnector);
    });

    it('should return null if connector not found', async () => {
      prismaService.integrationConnector.findUnique.mockResolvedValue(null);

      const result = await service.getConnector('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listConnectors', () => {
    it('should list connectors with pagination', async () => {
      prismaService.integrationConnector.findMany.mockResolvedValue([mockConnector]);
      prismaService.integrationConnector.count.mockResolvedValue(1);

      const result = await service.listConnectors({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by type', async () => {
      prismaService.integrationConnector.findMany.mockResolvedValue([mockConnector]);
      prismaService.integrationConnector.count.mockResolvedValue(1);

      await service.listConnectors({ type: IntegrationConnectorType.API });

      expect(prismaService.integrationConnector.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: IntegrationConnectorType.API }),
        }),
      );
    });
  });

  describe('configureConnector', () => {
    it('should configure a connector for a tenant', async () => {
      prismaService.integrationConnector.findUnique.mockResolvedValue(mockConnector);
      prismaService.connectorConfig.updateMany.mockResolvedValue({ count: 0 });
      prismaService.connectorConfig.create.mockResolvedValue(mockConnectorConfig);
      prismaService.connectorEvent.create.mockResolvedValue({} as never);

      const dto = {
        tenantId: 'tenant-1',
        connectorId: 'connector-1',
        name: 'Production Config',
        isPrimary: true,
      };

      const result = await service.configureConnector(dto);

      expect(result).toEqual(mockConnectorConfig);
      expect(prismaService.connectorConfig.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if connector not found', async () => {
      prismaService.integrationConnector.findUnique.mockResolvedValue(null);

      await expect(
        service.configureConnector({
          tenantId: 'tenant-1',
          connectorId: 'nonexistent',
          name: 'Config',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if connector is inactive', async () => {
      prismaService.integrationConnector.findUnique.mockResolvedValue({
        ...mockConnector,
        isActive: false,
      });

      await expect(
        service.configureConnector({
          tenantId: 'tenant-1',
          connectorId: 'connector-1',
          name: 'Config',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateConnectorConfig', () => {
    it('should update connector configuration', async () => {
      prismaService.connectorConfig.findUnique.mockResolvedValue(mockConnectorConfig);
      prismaService.connectorConfig.update.mockResolvedValue({
        ...mockConnectorConfig,
        name: 'Updated Config',
      });

      const result = await service.updateConnectorConfig('config-1', {
        name: 'Updated Config',
      });

      expect(result.name).toBe('Updated Config');
    });

    it('should throw NotFoundException if config not found', async () => {
      prismaService.connectorConfig.findUnique.mockResolvedValue(null);

      await expect(
        service.updateConnectorConfig('nonexistent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('enableConnector', () => {
    it('should enable a connector', async () => {
      prismaService.integrationConnector.update.mockResolvedValue({
        ...mockConnector,
        isActive: true,
      });
      prismaService.connectorEvent.create.mockResolvedValue({} as never);

      const result = await service.enableConnector('connector-1');

      expect(result.isActive).toBe(true);
      expect(prismaService.connectorEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: ConnectorEventType.ENABLED,
        }),
      });
    });
  });

  describe('disableConnector', () => {
    it('should disable a connector', async () => {
      prismaService.integrationConnector.update.mockResolvedValue({
        ...mockConnector,
        isActive: false,
      });
      prismaService.connectorEvent.create.mockResolvedValue({} as never);

      const result = await service.disableConnector('connector-1');

      expect(result.isActive).toBe(false);
      expect(prismaService.connectorEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: ConnectorEventType.DISABLED,
        }),
      });
    });
  });

  describe('declareCapabilities', () => {
    it('should declare capabilities for a connector', async () => {
      prismaService.integrationConnector.findUnique.mockResolvedValue(mockConnector);
      prismaService.connectorCapability.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.connectorCapability.create.mockResolvedValue(mockCapability);
      prismaService.integrationConnector.update.mockResolvedValue(mockConnector);

      const capabilities = [
        {
          code: 'sync',
          name: 'Sync Data',
          category: CapabilityCategory.SYNC,
        },
      ];

      const result = await service.declareCapabilities('connector-1', capabilities);

      expect(result).toHaveLength(1);
      expect(prismaService.connectorCapability.deleteMany).toHaveBeenCalled();
      expect(prismaService.connectorCapability.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if connector not found', async () => {
      prismaService.integrationConnector.findUnique.mockResolvedValue(null);

      await expect(service.declareCapabilities('nonexistent', [])).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('testConnection', () => {
    it('should test connection and return success for basic validation', async () => {
      prismaService.connectorConfig.findUnique.mockResolvedValue({
        ...mockConnectorConfig,
        connector: mockConnector,
        credentialVault: { id: 'vault-1', name: 'Test Vault', type: 'API_KEY' },
      });
      prismaService.connectorConfig.update.mockResolvedValue(mockConnectorConfig);
      prismaService.connectorEvent.create.mockResolvedValue({} as never);

      const result = await service.testConnection('config-1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('validation passed');
    });

    it('should return failure if connector is disabled', async () => {
      prismaService.connectorConfig.findUnique.mockResolvedValue({
        ...mockConnectorConfig,
        connector: { ...mockConnector, isActive: false },
      });

      const result = await service.testConnection('config-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('disabled');
    });

    it('should throw NotFoundException if config not found', async () => {
      prismaService.connectorConfig.findUnique.mockResolvedValue(null);

      await expect(service.testConnection('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getConnectorCapabilities', () => {
    it('should return capabilities for a connector', async () => {
      prismaService.connectorCapability.findMany.mockResolvedValue([mockCapability]);

      const result = await service.getConnectorCapabilities('connector-1');

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('sync');
    });
  });

  describe('getEnabledCapabilities', () => {
    it('should return enabled capabilities for a config', async () => {
      prismaService.connectorConfig.findUnique.mockResolvedValue({
        ...mockConnectorConfig,
        connector: {
          ...mockConnector,
          capabilities: [mockCapability],
        },
      });

      const result = await service.getEnabledCapabilities('config-1');

      expect(result).toHaveLength(1);
    });

    it('should return empty array if config not found', async () => {
      prismaService.connectorConfig.findUnique.mockResolvedValue(null);

      const result = await service.getEnabledCapabilities('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getConnectorEvents', () => {
    it('should return connector events with pagination', async () => {
      const mockEvent = {
        id: 'event-1',
        eventType: ConnectorEventType.REGISTERED,
        connectorCode: 'test-connector',
        configId: null,
        data: {},
        error: null,
        duration: null,
        tenantId: null,
        userId: null,
        correlationId: null,
        metadata: {},
        createdAt: new Date(),
      };

      prismaService.connectorEvent.findMany.mockResolvedValue([mockEvent]);
      prismaService.connectorEvent.count.mockResolvedValue(1);

      const result = await service.getConnectorEvents({
        connectorCode: 'test-connector',
        page: 1,
        limit: 50,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
