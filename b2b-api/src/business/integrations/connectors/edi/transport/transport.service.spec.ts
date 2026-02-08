import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  As2ClientService,
  As2ServerService,
  CertificateManagerService,
  SftpClientService,
  TradingPartnerService,
  FilePollingService,
  TransportLogService,
  OutboundDeliveryService,
} from './services';
import {
  As2PartnerProfile,
  As2MdnMode,
  As2SigningAlgorithm,
  As2EncryptionAlgorithm,
  As2CompressionAlgorithm,
  SftpPartnerProfile,
  SftpAuthMethod,
  TransportProtocol,
  TransportDirection,
  TransportStatus,
  CertificateType,
  CertificateFormat,
} from './interfaces';

// ============================================
// Test Utilities
// ============================================

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      AS2_DOMAIN: 'test.example.com',
      AS2_LOCAL_ID: 'test-local-as2-id',
      AS2_MDN_EMAIL: 'mdn@test.example.com',
      CERTIFICATE_ENCRYPTION_KEY: 'a'.repeat(64), // 32 bytes hex
      TRANSPORT_LOG_RETENTION_DAYS: '30',
      DELIVERY_PROCESSING_INTERVAL_MS: 1000,
      DELIVERY_CONCURRENCY: 5,
    };
    return config[key] ?? defaultValue;
  }),
};

const createMockCertificateManager = () => ({
  getCertificate: jest.fn(),
  getPrivateKey: jest.fn(),
  getSshPrivateKey: jest.fn(),
  uploadCertificate: jest.fn(),
  deleteCertificate: jest.fn(),
  listCertificates: jest.fn(),
  generateSshKeyPair: jest.fn(),
  importSshKeyPair: jest.fn(),
  getSshKeyPair: jest.fn(),
  listSshKeyPairs: jest.fn(),
  deleteSshKeyPair: jest.fn(),
  isCertificateValid: jest.fn(),
  getCertificatesExpiringSoon: jest.fn(),
});

// ============================================
// AS2 Client Service Tests
// ============================================

describe('As2ClientService', () => {
  let service: As2ClientService;
  let certificateManager: ReturnType<typeof createMockCertificateManager>;

  beforeEach(async () => {
    certificateManager = createMockCertificateManager();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        As2ClientService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CertificateManagerService, useValue: certificateManager },
      ],
    }).compile();

    service = module.get<As2ClientService>(As2ClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Partner Registration', () => {
    const mockPartnerProfile: As2PartnerProfile = {
      partnerId: 'partner-1',
      partnerName: 'Test Partner',
      as2Id: 'test-partner-as2-id',
      targetUrl: 'https://partner.example.com/as2',
      email: 'partner@example.com',
      mdnMode: As2MdnMode.SYNC,
      isActive: true,
    };

    it('should register a partner profile', () => {
      service.registerPartner(mockPartnerProfile);
      const partner = service.getPartner('partner-1');
      expect(partner).toEqual(mockPartnerProfile);
    });

    it('should overwrite existing partner profile', () => {
      service.registerPartner(mockPartnerProfile);
      const updatedProfile = { ...mockPartnerProfile, targetUrl: 'https://new-url.com/as2' };
      service.registerPartner(updatedProfile);
      const partner = service.getPartner('partner-1');
      expect(partner?.targetUrl).toBe('https://new-url.com/as2');
    });

    it('should remove a partner profile', () => {
      service.registerPartner(mockPartnerProfile);
      const result = service.removePartner('partner-1');
      expect(result).toBe(true);
      expect(service.getPartner('partner-1')).toBeUndefined();
    });

    it('should return false when removing non-existent partner', () => {
      const result = service.removePartner('non-existent');
      expect(result).toBe(false);
    });

    it('should list all registered partners', () => {
      service.registerPartner(mockPartnerProfile);
      service.registerPartner({
        ...mockPartnerProfile,
        partnerId: 'partner-2',
        as2Id: 'partner-2-as2',
      });
      const partners = service.listPartners();
      expect(partners).toHaveLength(2);
    });
  });

  describe('Message ID Generation', () => {
    it('should generate unique message IDs', () => {
      const id1 = (service as any).generateMessageId();
      const id2 = (service as any).generateMessageId();
      expect(id1).not.toBe(id2);
      expect(id1).toContain('@test.example.com');
    });
  });

  describe('MIC Calculation', () => {
    it('should calculate MIC using SHA256', () => {
      const data = Buffer.from('test data');
      const mic = service.calculateMic(data, As2SigningAlgorithm.SHA256);
      expect(mic).toBeTruthy();
      expect(typeof mic).toBe('string');
    });

    it('should verify MIC correctly', () => {
      const data = Buffer.from('test data');
      const mic = service.calculateMic(data, As2SigningAlgorithm.SHA256);
      const isValid = service.verifyMic(data, mic, As2SigningAlgorithm.SHA256);
      expect(isValid).toBe(true);
    });

    it('should reject invalid MIC', () => {
      const data = Buffer.from('test data');
      const isValid = service.verifyMic(data, 'invalid-mic', As2SigningAlgorithm.SHA256);
      expect(isValid).toBe(false);
    });
  });

  describe('Send Message', () => {
    const mockPartnerProfile: As2PartnerProfile = {
      partnerId: 'partner-1',
      partnerName: 'Test Partner',
      as2Id: 'test-partner-as2-id',
      targetUrl: 'https://partner.example.com/as2',
      mdnMode: As2MdnMode.SYNC,
      isActive: true,
    };

    it('should fail when partner not found', async () => {
      const result = await service.send({
        partnerId: 'non-existent',
        content: Buffer.from('test'),
        contentType: 'application/xml',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Partner not found');
    });

    it('should fail when partner is inactive', async () => {
      service.registerPartner({ ...mockPartnerProfile, isActive: false });
      const result = await service.send({
        partnerId: 'partner-1',
        content: Buffer.from('test'),
        contentType: 'application/xml',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('inactive');
    });
  });
});

// ============================================
// AS2 Server Service Tests
// ============================================

describe('As2ServerService', () => {
  let service: As2ServerService;
  let certificateManager: ReturnType<typeof createMockCertificateManager>;
  let as2Client: any;

  beforeEach(async () => {
    certificateManager = createMockCertificateManager();
    as2Client = {
      getPartner: jest.fn(),
      registerPartner: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        As2ServerService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CertificateManagerService, useValue: certificateManager },
        { provide: As2ClientService, useValue: as2Client },
      ],
    }).compile();

    service = module.get<As2ServerService>(As2ServerService);
  });

  describe('Local Profile Registration', () => {
    it('should register a local profile', () => {
      const profile = {
        as2Id: 'local-as2-id',
        name: 'Local Identity',
        isActive: true,
      };
      service.registerLocalProfile(profile);
      expect(service.getLocalProfile('local-as2-id')).toEqual(profile);
    });
  });

  describe('Message Handler Registration', () => {
    it('should register a message handler', () => {
      const handler = {
        onMessageReceived: jest.fn(),
      };
      service.registerMessageHandler(handler);
      // Handler should be registered (no direct way to verify, but no error thrown)
    });
  });

  describe('Receive Message', () => {
    it('should fail when required headers are missing', async () => {
      const result = await service.receive({
        headers: {},
        body: Buffer.from('test'),
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required AS2 headers');
    });

    it('should fail when local profile not found', async () => {
      const result = await service.receive({
        headers: {
          'as2-from': 'sender-as2-id',
          'as2-to': 'unknown-recipient',
          'message-id': '<test-message-id>',
        },
        body: Buffer.from('test'),
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown AS2 recipient');
    });

    it('should process message when local profile exists', async () => {
      service.registerLocalProfile({
        as2Id: 'local-as2-id',
        name: 'Local Identity',
        isActive: true,
      });

      const result = await service.receive({
        headers: {
          'as2-from': 'sender-as2-id',
          'as2-to': 'local-as2-id',
          'message-id': '<test-message-id>',
          'content-type': 'application/xml',
        },
        body: Buffer.from('test content'),
      });
      expect(result.success).toBe(true);
      expect(result.as2From).toBe('sender-as2-id');
      expect(result.as2To).toBe('local-as2-id');
    });
  });
});

// ============================================
// Certificate Manager Service Tests
// ============================================

describe('CertificateManagerService', () => {
  let service: CertificateManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateManagerService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CertificateManagerService>(CertificateManagerService);
    await service.onModuleInit();
  });

  describe('SSH Key Generation', () => {
    it('should generate RSA key pair', async () => {
      const keyPair = await service.generateSshKeyPair('tenant-1', 'Test Key', 'rsa', 2048);
      expect(keyPair.id).toBeTruthy();
      expect(keyPair.tenantId).toBe('tenant-1');
      expect(keyPair.name).toBe('Test Key');
      expect(keyPair.keyType).toBe('rsa');
      expect(keyPair.publicKey).toContain('ssh-rsa');
      expect(keyPair.fingerprint).toContain('SHA256:');
      expect(keyPair.hasPrivateKey).toBe(true);
    });

    it('should generate ed25519 key pair', async () => {
      const keyPair = await service.generateSshKeyPair('tenant-1', 'Test Key', 'ed25519');
      expect(keyPair.keyType).toBe('ed25519');
      expect(keyPair.hasPrivateKey).toBe(true);
    });

    it('should retrieve SSH key pair', async () => {
      const created = await service.generateSshKeyPair('tenant-1', 'Test Key');
      const retrieved = await service.getSshKeyPair(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should retrieve SSH private key', async () => {
      const created = await service.generateSshKeyPair('tenant-1', 'Test Key');
      const privateKey = await service.getSshPrivateKey(created.id);
      expect(privateKey).toBeTruthy();
      expect(privateKey).toContain('PRIVATE KEY');
    });

    it('should list SSH key pairs by tenant', async () => {
      await service.generateSshKeyPair('tenant-1', 'Key 1');
      await service.generateSshKeyPair('tenant-1', 'Key 2');
      await service.generateSshKeyPair('tenant-2', 'Key 3');

      const tenant1Keys = await service.listSshKeyPairs('tenant-1');
      expect(tenant1Keys).toHaveLength(2);
    });

    it('should delete SSH key pair', async () => {
      const created = await service.generateSshKeyPair('tenant-1', 'Test Key');
      const deleted = await service.deleteSshKeyPair(created.id);
      expect(deleted).toBe(true);
      const retrieved = await service.getSshKeyPair(created.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('SSH Key Import', () => {
    it('should import SSH public key', async () => {
      const publicKey = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDTest test@example.com';
      const keyPair = await service.importSshKeyPair('tenant-1', 'Imported Key', publicKey);
      expect(keyPair.publicKey).toBe(publicKey);
      expect(keyPair.keyType).toBe('rsa');
      expect(keyPair.hasPrivateKey).toBe(false);
    });
  });
});

// ============================================
// SFTP Client Service Tests
// ============================================

describe('SftpClientService', () => {
  let service: SftpClientService;
  let certificateManager: ReturnType<typeof createMockCertificateManager>;

  beforeEach(async () => {
    certificateManager = createMockCertificateManager();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SftpClientService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CertificateManagerService, useValue: certificateManager },
      ],
    }).compile();

    service = module.get<SftpClientService>(SftpClientService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('Partner Registration', () => {
    const mockPartnerProfile: SftpPartnerProfile = {
      partnerId: 'partner-1',
      partnerName: 'Test Partner',
      connection: {
        host: 'sftp.example.com',
        port: 22,
        username: 'testuser',
        authMethod: SftpAuthMethod.PASSWORD,
        password: 'testpassword',
      },
      isActive: true,
    };

    it('should register a partner profile', () => {
      service.registerPartner(mockPartnerProfile);
      const partner = service.getPartner('partner-1');
      expect(partner).toEqual(mockPartnerProfile);
    });

    it('should remove a partner profile', async () => {
      service.registerPartner(mockPartnerProfile);
      const result = await service.removePartner('partner-1');
      expect(result).toBe(true);
      expect(service.getPartner('partner-1')).toBeUndefined();
    });

    it('should list all registered partners', () => {
      service.registerPartner(mockPartnerProfile);
      service.registerPartner({ ...mockPartnerProfile, partnerId: 'partner-2' });
      const partners = service.listPartners();
      expect(partners).toHaveLength(2);
    });
  });

  describe('File Operations', () => {
    it('should fail upload when partner not found', async () => {
      const result = await service.upload({
        partnerId: 'non-existent',
        content: Buffer.from('test'),
        filename: 'test.txt',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Partner not found');
    });

    it('should fail upload when partner is inactive', async () => {
      service.registerPartner({
        partnerId: 'partner-1',
        partnerName: 'Test Partner',
        connection: {
          host: 'sftp.example.com',
          port: 22,
          username: 'testuser',
          authMethod: SftpAuthMethod.PASSWORD,
        },
        isActive: false,
      });

      const result = await service.upload({
        partnerId: 'partner-1',
        content: Buffer.from('test'),
        filename: 'test.txt',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('inactive');
    });

    it('should fail download when partner not found', async () => {
      const result = await service.download({
        partnerId: 'non-existent',
        remotePath: '/test/file.txt',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Partner not found');
    });

    it('should fail list when partner not found', async () => {
      const result = await service.list({
        partnerId: 'non-existent',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Partner not found');
    });

    it('should fail delete when partner not found', async () => {
      const result = await service.delete({
        partnerId: 'non-existent',
        remotePath: '/test/file.txt',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Partner not found');
    });

    it('should fail move when partner not found', async () => {
      const result = await service.move({
        partnerId: 'non-existent',
        sourcePath: '/source.txt',
        destinationPath: '/dest.txt',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Partner not found');
    });
  });
});

// ============================================
// Transport Log Service Tests
// ============================================

describe('TransportLogService', () => {
  let service: TransportLogService;

  beforeEach(() => {
    service = new TransportLogService();
  });

  describe('Log Lifecycle', () => {
    it('should start a new log entry', async () => {
      const logId = await service.startLog({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.SFTP,
        direction: TransportDirection.OUTBOUND,
      });
      expect(logId).toBeTruthy();

      const log = await service.getLog(logId);
      expect(log).toBeTruthy();
      expect(log?.status).toBe(TransportStatus.IN_PROGRESS);
    });

    it('should complete a log entry', async () => {
      const logId = await service.startLog({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.SFTP,
        direction: TransportDirection.OUTBOUND,
      });

      const log = await service.completeLog(logId);
      expect(log?.status).toBe(TransportStatus.COMPLETED);
      expect(log?.completedAt).toBeTruthy();
      expect(log?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should fail a log entry', async () => {
      const logId = await service.startLog({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.SFTP,
        direction: TransportDirection.OUTBOUND,
      });

      const log = await service.failLog(logId, 'Connection timeout');
      expect(log?.status).toBe(TransportStatus.FAILED);
      expect(log?.error).toBe('Connection timeout');
    });

    it('should increment retry count', async () => {
      const logId = await service.startLog({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.SFTP,
        direction: TransportDirection.OUTBOUND,
      });

      await service.incrementRetry(logId);
      const log = await service.getLog(logId);
      expect(log?.retryCount).toBe(1);
      expect(log?.status).toBe(TransportStatus.RETRYING);
    });

    it('should update log entry', async () => {
      const logId = await service.startLog({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.SFTP,
        direction: TransportDirection.OUTBOUND,
      });

      await service.updateLog(logId, { messageId: 'msg-123', contentSize: 1024 });
      const log = await service.getLog(logId);
      expect(log?.messageId).toBe('msg-123');
      expect(log?.contentSize).toBe(1024);
    });
  });

  describe('Log Queries', () => {
    beforeEach(async () => {
      // Create test logs
      const log1 = await service.startLog({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.SFTP,
        direction: TransportDirection.OUTBOUND,
      });
      await service.completeLog(log1);

      const log2 = await service.startLog({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.AS2,
        direction: TransportDirection.INBOUND,
      });
      await service.failLog(log2, 'Error');

      await service.startLog({
        tenantId: 'tenant-1',
        partnerId: 'partner-2',
        protocol: TransportProtocol.SFTP,
        direction: TransportDirection.OUTBOUND,
      });
    });

    it('should query logs by tenant', async () => {
      const { logs, total } = await service.queryLogs({ tenantId: 'tenant-1' });
      expect(total).toBe(3);
      expect(logs).toHaveLength(3);
    });

    it('should query logs by protocol', async () => {
      const { logs } = await service.queryLogs({
        tenantId: 'tenant-1',
        protocol: TransportProtocol.SFTP,
      });
      expect(logs).toHaveLength(2);
    });

    it('should query logs by status', async () => {
      const { logs } = await service.queryLogs({
        tenantId: 'tenant-1',
        status: TransportStatus.FAILED,
      });
      expect(logs).toHaveLength(1);
    });

    it('should query logs by partner', async () => {
      const { logs } = await service.queryLogs({
        tenantId: 'tenant-1',
        partnerId: 'partner-2',
      });
      expect(logs).toHaveLength(1);
    });

    it('should apply pagination', async () => {
      const { logs, total } = await service.queryLogs({
        tenantId: 'tenant-1',
        page: 1,
        limit: 2,
      });
      expect(logs).toHaveLength(2);
      expect(total).toBe(3);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      const log1 = await service.startLog({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.SFTP,
        direction: TransportDirection.OUTBOUND,
      });
      await service.completeLog(log1);

      const log2 = await service.startLog({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.AS2,
        direction: TransportDirection.INBOUND,
      });
      await service.failLog(log2, 'Error');
    });

    it('should calculate statistics', async () => {
      const stats = await service.getStatistics('tenant-1');
      expect(stats.totalMessages).toBe(2);
      expect(stats.completedMessages).toBe(1);
      expect(stats.failedMessages).toBe(1);
      expect(stats.errorRate).toBe(50);
    });

    it('should get recent errors', async () => {
      const errors = await service.getRecentErrors('tenant-1');
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe('Error');
    });
  });
});

// ============================================
// Trading Partner Service Tests
// ============================================

describe('TradingPartnerService', () => {
  let service: TradingPartnerService;
  let as2Client: any;
  let sftpClient: any;

  beforeEach(async () => {
    as2Client = {
      registerPartner: jest.fn(),
      removePartner: jest.fn(),
    };

    sftpClient = {
      registerPartner: jest.fn(),
      removePartner: jest.fn(),
      testConnection: jest.fn().mockResolvedValue({ success: true, latencyMs: 100 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradingPartnerService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: As2ClientService, useValue: as2Client },
        { provide: SftpClientService, useValue: sftpClient },
      ],
    }).compile();

    service = module.get<TradingPartnerService>(TradingPartnerService);
  });

  describe('Partner CRUD', () => {
    it('should create a trading partner with AS2', async () => {
      const partner = await service.create({
        tenantId: 'tenant-1',
        code: 'PARTNER001',
        name: 'Test Partner',
        protocols: [TransportProtocol.AS2],
        as2Config: {
          as2Id: 'partner-as2-id',
          targetUrl: 'https://partner.example.com/as2',
        },
      });

      expect(partner.id).toBeTruthy();
      expect(partner.code).toBe('PARTNER001');
      expect(partner.as2Profile).toBeTruthy();
      expect(as2Client.registerPartner).toHaveBeenCalled();
    });

    it('should create a trading partner with SFTP', async () => {
      const partner = await service.create({
        tenantId: 'tenant-1',
        code: 'PARTNER002',
        name: 'Test Partner',
        protocols: [TransportProtocol.SFTP],
        sftpConfig: {
          host: 'sftp.partner.com',
          username: 'user',
          password: 'pass',
        },
      });

      expect(partner.sftpProfile).toBeTruthy();
      expect(sftpClient.registerPartner).toHaveBeenCalled();
    });

    it('should find partner by ID', async () => {
      const created = await service.create({
        tenantId: 'tenant-1',
        code: 'PARTNER001',
        name: 'Test Partner',
        protocols: [TransportProtocol.AS2],
        as2Config: {
          as2Id: 'partner-as2-id',
          targetUrl: 'https://partner.example.com/as2',
        },
      });

      const found = await service.findById(created.id);
      expect(found).toEqual(created);
    });

    it('should find partner by code', async () => {
      await service.create({
        tenantId: 'tenant-1',
        code: 'PARTNER001',
        name: 'Test Partner',
        protocols: [TransportProtocol.AS2],
        as2Config: {
          as2Id: 'partner-as2-id',
          targetUrl: 'https://partner.example.com/as2',
        },
      });

      const found = await service.findByCode('tenant-1', 'PARTNER001');
      expect(found?.code).toBe('PARTNER001');
    });

    it('should list partners by tenant', async () => {
      await service.create({
        tenantId: 'tenant-1',
        code: 'PARTNER001',
        name: 'Test Partner 1',
        protocols: [TransportProtocol.AS2],
        as2Config: { as2Id: 'id1', targetUrl: 'https://p1.com' },
      });
      await service.create({
        tenantId: 'tenant-1',
        code: 'PARTNER002',
        name: 'Test Partner 2',
        protocols: [TransportProtocol.SFTP],
        sftpConfig: { host: 'p2.com', username: 'user' },
      });
      await service.create({
        tenantId: 'tenant-2',
        code: 'PARTNER003',
        name: 'Other Tenant Partner',
        protocols: [TransportProtocol.AS2],
        as2Config: { as2Id: 'id3', targetUrl: 'https://p3.com' },
      });

      const { partners, total } = await service.findByTenant('tenant-1');
      expect(total).toBe(2);
      expect(partners).toHaveLength(2);
    });

    it('should update a trading partner', async () => {
      const created = await service.create({
        tenantId: 'tenant-1',
        code: 'PARTNER001',
        name: 'Test Partner',
        protocols: [TransportProtocol.AS2],
        as2Config: {
          as2Id: 'partner-as2-id',
          targetUrl: 'https://partner.example.com/as2',
        },
      });

      const updated = await service.update(created.id, { name: 'Updated Partner' });
      expect(updated?.name).toBe('Updated Partner');
    });

    it('should delete a trading partner', async () => {
      const created = await service.create({
        tenantId: 'tenant-1',
        code: 'PARTNER001',
        name: 'Test Partner',
        protocols: [TransportProtocol.AS2],
        as2Config: {
          as2Id: 'partner-as2-id',
          targetUrl: 'https://partner.example.com/as2',
        },
      });

      const deleted = await service.delete(created.id);
      expect(deleted).toBe(true);
      expect(await service.findById(created.id)).toBeUndefined();
    });
  });

  describe('Connection Testing', () => {
    it('should test SFTP connection', async () => {
      const partner = await service.create({
        tenantId: 'tenant-1',
        code: 'PARTNER001',
        name: 'Test Partner',
        protocols: [TransportProtocol.SFTP],
        sftpConfig: {
          host: 'sftp.partner.com',
          username: 'user',
          password: 'pass',
        },
      });

      const health = await service.testConnection(partner.id, TransportProtocol.SFTP);
      expect(health.isHealthy).toBe(true);
      expect(health.latencyMs).toBe(100);
    });
  });
});

// ============================================
// File Polling Service Tests
// ============================================

describe('FilePollingService', () => {
  let service: FilePollingService;
  let sftpClient: any;
  let transportLog: any;
  let tradingPartner: any;

  beforeEach(async () => {
    sftpClient = {
      list: jest.fn().mockResolvedValue({ success: true, files: [] }),
      download: jest.fn(),
      delete: jest.fn(),
      move: jest.fn(),
    };

    transportLog = {
      startLog: jest.fn().mockResolvedValue('log-id'),
      completeLog: jest.fn(),
      failLog: jest.fn(),
    };

    tradingPartner = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilePollingService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SftpClientService, useValue: sftpClient },
        { provide: TransportLogService, useValue: transportLog },
        { provide: TradingPartnerService, useValue: tradingPartner },
      ],
    }).compile();

    service = module.get<FilePollingService>(FilePollingService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('Poll Job Management', () => {
    it('should create a poll job', async () => {
      const job = await service.createPollJob('tenant-1', 'partner-1', {
        directory: '/inbound',
        pollIntervalMs: 60000,
      });

      expect(job.id).toBeTruthy();
      expect(job.partnerId).toBe('partner-1');
      expect(job.isActive).toBe(true);
    });

    it('should get poll job by ID', async () => {
      const created = await service.createPollJob('tenant-1', 'partner-1', {
        directory: '/inbound',
      });

      const found = service.getPollJob(created.id);
      expect(found).toEqual(created);
    });

    it('should list poll jobs by tenant', async () => {
      await service.createPollJob('tenant-1', 'partner-1', { directory: '/inbound' });
      await service.createPollJob('tenant-1', 'partner-2', { directory: '/inbound' });

      const jobs = service.listPollJobs('tenant-1');
      expect(jobs).toHaveLength(2);
    });

    it('should update poll job', async () => {
      const created = await service.createPollJob('tenant-1', 'partner-1', {
        directory: '/inbound',
      });

      const updated = await service.updatePollJob(created.id, { isActive: false });
      expect(updated?.isActive).toBe(false);
    });

    it('should stop poll job', async () => {
      const created = await service.createPollJob('tenant-1', 'partner-1', {
        directory: '/inbound',
      });

      const stopped = await service.stopPollJob(created.id);
      expect(stopped).toBe(true);
      expect(service.getPollJob(created.id)).toBeUndefined();
    });
  });

  describe('File Handler Registration', () => {
    it('should register a file handler', () => {
      const handler = {
        onFileReceived: jest.fn().mockResolvedValue({ success: true }),
      };
      service.registerFileHandler(handler);
      // No error thrown means success
    });
  });

  describe('Statistics', () => {
    it('should return poll statistics', async () => {
      await service.createPollJob('tenant-1', 'partner-1', { directory: '/inbound' });
      await service.createPollJob('tenant-1', 'partner-2', { directory: '/inbound' });

      const stats = service.getStatistics('tenant-1');
      expect(stats.totalJobs).toBe(2);
      expect(stats.activeJobs).toBe(2);
    });
  });
});

// ============================================
// Outbound Delivery Service Tests
// ============================================

describe('OutboundDeliveryService', () => {
  let service: OutboundDeliveryService;
  let as2Client: any;
  let sftpClient: any;
  let transportLog: any;

  beforeEach(async () => {
    as2Client = {
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'as2-msg-id' }),
    };

    sftpClient = {
      upload: jest.fn().mockResolvedValue({ success: true, filename: 'test.txt' }),
    };

    transportLog = {
      startLog: jest.fn().mockResolvedValue('log-id'),
      completeLog: jest.fn(),
      failLog: jest.fn(),
      incrementRetry: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboundDeliveryService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: As2ClientService, useValue: as2Client },
        { provide: SftpClientService, useValue: sftpClient },
        { provide: TransportLogService, useValue: transportLog },
      ],
    }).compile();

    service = module.get<OutboundDeliveryService>(OutboundDeliveryService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('Delivery Queue', () => {
    it('should queue a delivery job', async () => {
      const job = await service.queueDelivery({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.AS2,
        content: Buffer.from('test'),
        contentType: 'application/xml',
      });

      expect(job.id).toBeTruthy();
      expect(job.status).toBe(TransportStatus.PENDING);
    });

    it('should get delivery job by ID', async () => {
      const created = await service.queueDelivery({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.AS2,
        content: Buffer.from('test'),
        contentType: 'application/xml',
      });

      const found = service.getDeliveryJob(created.id);
      expect(found).toEqual(created);
    });

    it('should list delivery jobs by tenant', async () => {
      await service.queueDelivery({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.AS2,
        content: Buffer.from('test'),
        contentType: 'application/xml',
      });
      await service.queueDelivery({
        tenantId: 'tenant-1',
        partnerId: 'partner-2',
        protocol: TransportProtocol.SFTP,
        content: Buffer.from('test'),
        contentType: 'text/plain',
      });

      const { jobs, total } = service.listDeliveryJobs('tenant-1');
      expect(total).toBe(2);
    });

    it('should cancel a pending delivery job', async () => {
      const created = await service.queueDelivery({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.AS2,
        content: Buffer.from('test'),
        contentType: 'application/xml',
      });

      const cancelled = await service.cancelDeliveryJob(created.id);
      expect(cancelled).toBe(true);
      expect(service.getDeliveryJob(created.id)).toBeUndefined();
    });
  });

  describe('Immediate Processing', () => {
    it('should process AS2 delivery immediately', async () => {
      const job = await service.queueDelivery({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.AS2,
        content: Buffer.from('test'),
        contentType: 'application/xml',
      });

      const result = await service.processNow(job.id);
      expect(result.success).toBe(true);
      expect(as2Client.send).toHaveBeenCalled();
    });

    it('should process SFTP delivery immediately', async () => {
      const job = await service.queueDelivery({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.SFTP,
        content: Buffer.from('test'),
        contentType: 'text/plain',
        filename: 'test.txt',
      });

      const result = await service.processNow(job.id);
      expect(result.success).toBe(true);
      expect(sftpClient.upload).toHaveBeenCalled();
    });

    it('should fail for non-existent job', async () => {
      const result = await service.processNow('non-existent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Statistics', () => {
    it('should return delivery statistics', async () => {
      await service.queueDelivery({
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        protocol: TransportProtocol.AS2,
        content: Buffer.from('test'),
        contentType: 'application/xml',
      });

      const stats = service.getStatistics('tenant-1');
      expect(stats.totalJobs).toBe(1);
      expect(stats.pendingJobs).toBe(1);
    });
  });
});

// ============================================
// Integration Tests
// ============================================

describe('Transport Module Integration', () => {
  let certificateManager: CertificateManagerService;
  let transportLog: TransportLogService;
  let tradingPartnerService: TradingPartnerService;

  beforeEach(async () => {
    const as2Client = {
      registerPartner: jest.fn(),
      removePartner: jest.fn(),
    };

    const sftpClient = {
      registerPartner: jest.fn(),
      removePartner: jest.fn(),
      testConnection: jest.fn().mockResolvedValue({ success: true, latencyMs: 100 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateManagerService,
        TransportLogService,
        TradingPartnerService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: As2ClientService, useValue: as2Client },
        { provide: SftpClientService, useValue: sftpClient },
      ],
    }).compile();

    certificateManager = module.get<CertificateManagerService>(CertificateManagerService);
    transportLog = module.get<TransportLogService>(TransportLogService);
    tradingPartnerService = module.get<TradingPartnerService>(TradingPartnerService);

    await certificateManager.onModuleInit();
  });

  it('should handle complete partner setup workflow', async () => {
    // Generate SSH key for SFTP authentication
    const sshKey = await certificateManager.generateSshKeyPair('tenant-1', 'Partner SSH Key');
    expect(sshKey.id).toBeTruthy();

    // Create trading partner with both AS2 and SFTP
    const partner = await tradingPartnerService.create({
      tenantId: 'tenant-1',
      code: 'FULL_PARTNER',
      name: 'Full Integration Partner',
      protocols: [TransportProtocol.AS2, TransportProtocol.SFTP],
      as2Config: {
        as2Id: 'partner-as2-id',
        targetUrl: 'https://partner.example.com/as2',
        mdnMode: As2MdnMode.SYNC,
      },
      sftpConfig: {
        host: 'sftp.partner.com',
        username: 'partner-user',
        authMethod: SftpAuthMethod.KEY,
        privateKeyId: sshKey.id,
        inboundDirectory: '/inbound',
        outboundDirectory: '/outbound',
      },
    });

    expect(partner.id).toBeTruthy();
    expect(partner.as2Profile).toBeTruthy();
    expect(partner.sftpProfile).toBeTruthy();

    // Test connection
    const health = await tradingPartnerService.testConnection(partner.id, TransportProtocol.SFTP);
    expect(health.isHealthy).toBe(true);
  });

  it('should handle transport logging workflow', async () => {
    // Start log
    const logId = await transportLog.startLog({
      tenantId: 'tenant-1',
      partnerId: 'partner-1',
      protocol: TransportProtocol.AS2,
      direction: TransportDirection.OUTBOUND,
      messageId: 'msg-123',
      contentType: 'application/xml',
      contentSize: 1024,
    });

    // Update with additional info
    await transportLog.updateLog(logId, {
      metadata: { filename: 'invoice.xml' },
    });

    // Complete successfully
    await transportLog.completeLog(logId);

    // Verify log
    const log = await transportLog.getLog(logId);
    expect(log?.status).toBe(TransportStatus.COMPLETED);
    expect(log?.durationMs).toBeGreaterThanOrEqual(0);

    // Check statistics
    const stats = await transportLog.getStatistics('tenant-1');
    expect(stats.completedMessages).toBe(1);
    expect(stats.errorRate).toBe(0);
  });
});
