import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CredentialVaultService } from './credential-vault.service';
import { PrismaService } from '@infrastructure/database';
import { CredentialType } from '@prisma/client';

describe('CredentialVaultService', () => {
  let service: CredentialVaultService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prismaService: any;

  const mockCredentialVault = {
    id: 'vault-1',
    tenantId: 'tenant-1',
    name: 'API Keys',
    description: 'API key credentials',
    type: CredentialType.API_KEY,
    encryptedData: 'encrypted-data',
    encryptionKeyId: 'key-id',
    iv: 'iv-base64',
    authTag: 'auth-tag-base64',
    accessPolicy: {},
    expiresAt: null,
    rotatedAt: null,
    rotationPolicy: null,
    lastAccessedAt: null,
    accessCount: 0,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      credentialVault: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      connectorConfig: {
        count: jest.fn(),
      },
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'CREDENTIAL_VAULT_MASTER_KEY') {
          return null; // Will use derived key
        }
        if (key === 'APP_SECRET') {
          return 'test-app-secret-key-32-bytes!!!';
        }
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialVaultService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CredentialVaultService>(CredentialVaultService);
    prismaService = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a new credential vault entry', async () => {
      prismaService.credentialVault.create.mockResolvedValue(mockCredentialVault);

      const result = await service.create({
        tenantId: 'tenant-1',
        name: 'API Keys',
        type: CredentialType.API_KEY,
        credentials: { apiKey: 'secret-key' },
      });

      expect(result).toEqual(mockCredentialVault);
      expect(prismaService.credentialVault.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'API Keys',
          type: CredentialType.API_KEY,
          encryptedData: expect.any(String),
          encryptionKeyId: expect.any(String),
          iv: expect.any(String),
          authTag: expect.any(String),
        }),
      });
    });

    it('should create with expiration date', async () => {
      const expiresAt = new Date('2025-12-31');
      prismaService.credentialVault.create.mockResolvedValue({
        ...mockCredentialVault,
        expiresAt,
      });

      const result = await service.create({
        tenantId: 'tenant-1',
        name: 'API Keys',
        type: CredentialType.API_KEY,
        credentials: { apiKey: 'secret-key' },
        expiresAt,
      });

      expect(result.expiresAt).toEqual(expiresAt);
    });

    it('should create with rotation policy', async () => {
      const rotationPolicy = {
        enabled: true,
        intervalDays: 30,
        autoRotate: false,
      };
      prismaService.credentialVault.create.mockResolvedValue({
        ...mockCredentialVault,
        rotationPolicy,
      });

      const result = await service.create({
        tenantId: 'tenant-1',
        name: 'API Keys',
        type: CredentialType.API_KEY,
        credentials: { apiKey: 'secret-key' },
        rotationPolicy,
      });

      expect(result.rotationPolicy).toEqual(rotationPolicy);
    });
  });

  describe('update', () => {
    it('should update credential vault entry', async () => {
      prismaService.credentialVault.findUnique.mockResolvedValue(mockCredentialVault);
      prismaService.credentialVault.update.mockResolvedValue({
        ...mockCredentialVault,
        name: 'Updated Name',
      });

      const result = await service.update('vault-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException if vault not found', async () => {
      prismaService.credentialVault.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should re-encrypt when credentials are updated', async () => {
      prismaService.credentialVault.findUnique.mockResolvedValue(mockCredentialVault);
      prismaService.credentialVault.update.mockResolvedValue({
        ...mockCredentialVault,
        rotatedAt: new Date(),
      });

      await service.update('vault-1', {
        credentials: { apiKey: 'new-secret-key' },
      });

      expect(prismaService.credentialVault.update).toHaveBeenCalledWith({
        where: { id: 'vault-1' },
        data: expect.objectContaining({
          encryptedData: expect.any(String),
          rotatedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('get', () => {
    it('should return credential vault by ID', async () => {
      prismaService.credentialVault.findUnique.mockResolvedValue(mockCredentialVault);

      const result = await service.get('vault-1');

      expect(result).toEqual(mockCredentialVault);
    });

    it('should return null if not found', async () => {
      prismaService.credentialVault.findUnique.mockResolvedValue(null);

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByName', () => {
    it('should return credential vault by tenant and name', async () => {
      prismaService.credentialVault.findUnique.mockResolvedValue(mockCredentialVault);

      const result = await service.getByName('tenant-1', 'API Keys');

      expect(result).toEqual(mockCredentialVault);
      expect(prismaService.credentialVault.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_name: { tenantId: 'tenant-1', name: 'API Keys' },
        },
      });
    });
  });

  describe('list', () => {
    it('should list credential vaults with pagination', async () => {
      prismaService.credentialVault.findMany.mockResolvedValue([mockCredentialVault]);
      prismaService.credentialVault.count.mockResolvedValue(1);

      const result = await service.list({
        tenantId: 'tenant-1',
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should filter by type', async () => {
      prismaService.credentialVault.findMany.mockResolvedValue([mockCredentialVault]);
      prismaService.credentialVault.count.mockResolvedValue(1);

      await service.list({
        tenantId: 'tenant-1',
        type: CredentialType.API_KEY,
      });

      expect(prismaService.credentialVault.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            type: CredentialType.API_KEY,
          }),
        }),
      );
    });

    it('should exclude sensitive fields from list', async () => {
      prismaService.credentialVault.findMany.mockResolvedValue([mockCredentialVault]);
      prismaService.credentialVault.count.mockResolvedValue(1);

      await service.list({ tenantId: 'tenant-1' });

      expect(prismaService.credentialVault.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            encryptedData: false,
            encryptionKeyId: false,
            iv: false,
            authTag: false,
            accessPolicy: false,
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should delete credential vault entry', async () => {
      prismaService.connectorConfig.count.mockResolvedValue(0);
      prismaService.credentialVault.delete.mockResolvedValue(mockCredentialVault);

      await service.delete('vault-1');

      expect(prismaService.credentialVault.delete).toHaveBeenCalledWith({
        where: { id: 'vault-1' },
      });
    });

    it('should throw BadRequestException if in use by configs', async () => {
      prismaService.connectorConfig.count.mockResolvedValue(2);

      await expect(service.delete('vault-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDecryptedCredentials', () => {
    it('should throw NotFoundException if vault not found', async () => {
      prismaService.credentialVault.findUnique.mockResolvedValue(null);

      await expect(service.getDecryptedCredentials('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if credentials expired', async () => {
      prismaService.credentialVault.findUnique.mockResolvedValue({
        ...mockCredentialVault,
        expiresAt: new Date('2020-01-01'), // Past date
      });

      await expect(service.getDecryptedCredentials('vault-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if max access count reached', async () => {
      prismaService.credentialVault.findUnique.mockResolvedValue({
        ...mockCredentialVault,
        accessPolicy: { maxAccessCount: 5 },
        accessCount: 5,
      });

      await expect(service.getDecryptedCredentials('vault-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if connector not in allowed list', async () => {
      prismaService.credentialVault.findUnique.mockResolvedValue({
        ...mockCredentialVault,
        accessPolicy: { allowedConnectors: ['other-connector'] },
      });

      await expect(
        service.getDecryptedCredentials('vault-1', { connectorCode: 'my-connector' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rotateCredentials', () => {
    it('should rotate credentials', async () => {
      prismaService.credentialVault.findUnique.mockResolvedValue(mockCredentialVault);
      prismaService.credentialVault.update.mockResolvedValue({
        ...mockCredentialVault,
        rotatedAt: new Date(),
      });

      const result = await service.rotateCredentials('vault-1', {
        apiKey: 'new-key',
      });

      expect(result.rotatedAt).toBeDefined();
      expect(prismaService.credentialVault.update).toHaveBeenCalledWith({
        where: { id: 'vault-1' },
        data: expect.objectContaining({
          encryptedData: expect.any(String),
          rotatedAt: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundException if vault not found', async () => {
      prismaService.credentialVault.findUnique.mockResolvedValue(null);

      await expect(service.rotateCredentials('nonexistent', { apiKey: 'new-key' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCredentialsNeedingRotation', () => {
    it('should return credentials due for rotation', async () => {
      const oldRotatedAt = new Date();
      oldRotatedAt.setDate(oldRotatedAt.getDate() - 40); // 40 days ago

      prismaService.credentialVault.findMany.mockResolvedValue([
        {
          ...mockCredentialVault,
          rotationPolicy: { enabled: true, intervalDays: 30, autoRotate: false },
          rotatedAt: oldRotatedAt,
        },
      ]);

      const result = await service.getCredentialsNeedingRotation('tenant-1');

      expect(result).toHaveLength(1);
    });

    it('should not return credentials with disabled rotation', async () => {
      prismaService.credentialVault.findMany.mockResolvedValue([
        {
          ...mockCredentialVault,
          rotationPolicy: { enabled: false, intervalDays: 30, autoRotate: false },
        },
      ]);

      const result = await service.getCredentialsNeedingRotation('tenant-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getExpiringCredentials', () => {
    it('should return credentials expiring within specified days', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 5); // 5 days from now

      prismaService.credentialVault.findMany.mockResolvedValue([
        { ...mockCredentialVault, expiresAt },
      ]);

      const result = await service.getExpiringCredentials('tenant-1', 7);

      expect(result).toHaveLength(1);
    });
  });
});
