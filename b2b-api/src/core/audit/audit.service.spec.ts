import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '@infrastructure/database';

describe('AuditService', () => {
  let service: AuditService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockAuditLog = {
    id: 'audit-123',
    tenantId: 'tenant-123',
    userId: 'user-123',
    action: 'CREATE',
    entityType: 'Quote',
    entityId: 'quote-123',
    changes: {},
    metadata: {},
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: {
            auditLog: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue(mockAuditLog);

      const result = await service.log('tenant-123', 'user-123', {
        action: 'CREATE',
        entityType: 'Quote',
        entityId: 'quote-123',
        changes: { field: 'value' },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(result).toEqual(mockAuditLog);
      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-123',
          userId: 'user-123',
          action: 'CREATE',
          entityType: 'Quote',
          entityId: 'quote-123',
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [mockAuditLog];
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(
        { tenantId: 'tenant-123' },
        { page: 1, limit: 20 },
      );

      expect(result).toEqual({
        data: mockLogs,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply filters', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({
        tenantId: 'tenant-123',
        userId: 'user-123',
        entityType: 'Quote',
        action: 'CREATE',
      });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-123',
            userId: 'user-123',
            entityType: 'Quote',
            action: 'CREATE',
          }),
        }),
      );
    });

    it('should apply date range filters', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(0);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await service.findAll({
        tenantId: 'tenant-123',
        startDate,
        endDate,
      });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-123',
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });
  });

  describe('findByEntity', () => {
    it('should return audit logs for specific entity', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([mockAuditLog]);

      const result = await service.findByEntity('tenant-123', 'Quote', 'quote-123');

      expect(result).toEqual([mockAuditLog]);
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'tenant-123',
            entityType: 'Quote',
            entityId: 'quote-123',
          },
        }),
      );
    });
  });
});
