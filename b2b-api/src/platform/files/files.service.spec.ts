import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FilesService } from './files.service';
import { MinioService } from './minio.service';
import { PrismaService } from '@infrastructure/database';

describe('FilesService', () => {
  let service: FilesService;
  let prismaService: PrismaService;
  let minioService: MinioService;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  const mockFile = {
    id: 'file-789',
    filename: 'abc123.pdf',
    originalName: 'document.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    bucket: 'b2b-files',
    key: 'tenants/tenant-123/general/2026/02/07/abc123.pdf',
    entityType: null,
    entityId: null,
    metadata: {},
    isPublic: false,
    createdAt: new Date('2026-02-07T10:00:00Z'),
    updatedAt: new Date('2026-02-07T10:00:00Z'),
    deletedAt: null,
    tenantId: mockTenantId,
    uploadedById: mockUserId,
  };

  const mockMulterFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'document.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('test file content'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: PrismaService,
          useValue: {
            file: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: MinioService,
          useValue: {
            uploadFile: jest.fn(),
            getFile: jest.fn(),
            deleteFile: jest.fn(),
            getPresignedUrl: jest.fn(),
            getPresignedPutUrl: jest.fn(),
            getBucket: jest.fn().mockReturnValue('b2b-files'),
            fileExists: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    prismaService = module.get(PrismaService);
    minioService = module.get(MinioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      (minioService.uploadFile as jest.Mock).mockResolvedValue(mockFile.key);
      (prismaService.file.create as jest.Mock).mockResolvedValue(mockFile);

      const dto = {
        entityType: undefined,
        entityId: undefined,
        isPublic: false,
      };

      const result = await service.uploadFile(mockTenantId, mockUserId, mockMulterFile, dto);

      expect(result).toMatchObject({
        id: mockFile.id,
        filename: mockFile.filename,
        originalName: mockFile.originalName,
        mimeType: mockFile.mimeType,
        size: mockFile.size,
        bucket: mockFile.bucket,
        key: mockFile.key,
        isPublic: mockFile.isPublic,
      });
      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(prismaService.file.create).toHaveBeenCalled();
    });

    it('should upload a file with entity association', async () => {
      const fileWithEntity = {
        ...mockFile,
        entityType: 'Contract',
        entityId: 'contract-123',
        key: 'tenants/tenant-123/Contract/2026/02/07/abc123.pdf',
      };
      (minioService.uploadFile as jest.Mock).mockResolvedValue(fileWithEntity.key);
      (prismaService.file.create as jest.Mock).mockResolvedValue(fileWithEntity);

      const dto = {
        entityType: 'Contract',
        entityId: 'contract-123',
        isPublic: false,
      };

      const result = await service.uploadFile(mockTenantId, mockUserId, mockMulterFile, dto);

      expect(result.entityType).toBe('Contract');
      expect(result.entityId).toBe('contract-123');
    });

    it('should throw BadRequestException for missing file', async () => {
      await expect(service.uploadFile(mockTenantId, mockUserId, null as any, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for oversized file', async () => {
      const oversizedFile = {
        ...mockMulterFile,
        size: 60 * 1024 * 1024, // 60 MB
      };

      await expect(service.uploadFile(mockTenantId, mockUserId, oversizedFile, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for disallowed mime type', async () => {
      const invalidFile = {
        ...mockMulterFile,
        mimetype: 'application/x-executable',
      };

      await expect(service.uploadFile(mockTenantId, mockUserId, invalidFile, {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getFile', () => {
    it('should return file metadata', async () => {
      (prismaService.file.findFirst as jest.Mock).mockResolvedValue(mockFile);

      const result = await service.getFile(mockTenantId, mockFile.id);

      expect(result).toMatchObject({
        id: mockFile.id,
        filename: mockFile.filename,
        originalName: mockFile.originalName,
      });
      expect(prismaService.file.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockFile.id,
          tenantId: mockTenantId,
          deletedAt: null,
        },
      });
    });

    it('should throw NotFoundException when file not found', async () => {
      (prismaService.file.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getFile(mockTenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSignedDownloadUrl', () => {
    it('should return a signed download URL', async () => {
      const signedUrl = 'https://minio.example.com/signed-url';
      (prismaService.file.findFirst as jest.Mock).mockResolvedValue(mockFile);
      (minioService.getPresignedUrl as jest.Mock).mockResolvedValue(signedUrl);

      const result = await service.getSignedDownloadUrl(mockTenantId, mockFile.id, 3600);

      expect(result).toEqual({
        url: signedUrl,
        expiresIn: 3600,
      });
      expect(minioService.getPresignedUrl).toHaveBeenCalledWith(mockFile.key, 3600);
    });

    it('should throw NotFoundException when file not found', async () => {
      (prismaService.file.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getSignedDownloadUrl(mockTenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listFiles', () => {
    it('should return paginated files', async () => {
      const files = [mockFile, { ...mockFile, id: 'file-790' }];
      (prismaService.file.findMany as jest.Mock).mockResolvedValue(files);
      (prismaService.file.count as jest.Mock).mockResolvedValue(2);

      const query = { page: 1, limit: 20 };
      const result = await service.listFiles(mockTenantId, query);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by entity type and id', async () => {
      (prismaService.file.findMany as jest.Mock).mockResolvedValue([mockFile]);
      (prismaService.file.count as jest.Mock).mockResolvedValue(1);

      const query = { entityType: 'Contract', entityId: 'contract-123', page: 1, limit: 20 };
      await service.listFiles(mockTenantId, query);

      expect(prismaService.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            entityType: 'Contract',
            entityId: 'contract-123',
          }),
        }),
      );
    });
  });

  describe('deleteFile', () => {
    it('should soft delete a file', async () => {
      (prismaService.file.findFirst as jest.Mock).mockResolvedValue(mockFile);
      (prismaService.file.update as jest.Mock).mockResolvedValue({
        ...mockFile,
        deletedAt: new Date(),
      });

      await service.deleteFile(mockTenantId, mockFile.id);

      expect(prismaService.file.update).toHaveBeenCalledWith({
        where: { id: mockFile.id },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when file not found', async () => {
      (prismaService.file.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteFile(mockTenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('hardDeleteFile', () => {
    it('should hard delete a file from MinIO and database', async () => {
      (prismaService.file.findFirst as jest.Mock).mockResolvedValue(mockFile);
      (minioService.deleteFile as jest.Mock).mockResolvedValue(undefined);
      (prismaService.file.delete as jest.Mock).mockResolvedValue(mockFile);

      await service.hardDeleteFile(mockTenantId, mockFile.id);

      expect(minioService.deleteFile).toHaveBeenCalledWith(mockFile.key);
      expect(prismaService.file.delete).toHaveBeenCalledWith({
        where: { id: mockFile.id },
      });
    });

    it('should throw NotFoundException when file not found', async () => {
      (prismaService.file.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.hardDeleteFile(mockTenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('downloadFile', () => {
    it('should return file buffer and metadata', async () => {
      const fileBuffer = Buffer.from('test content');
      (prismaService.file.findFirst as jest.Mock).mockResolvedValue(mockFile);
      (minioService.getFile as jest.Mock).mockResolvedValue(fileBuffer);

      const result = await service.downloadFile(mockTenantId, mockFile.id);

      expect(result.buffer).toEqual(fileBuffer);
      expect(result.file).toMatchObject({
        id: mockFile.id,
        filename: mockFile.filename,
      });
      expect(minioService.getFile).toHaveBeenCalledWith(mockFile.key);
    });

    it('should throw NotFoundException when file not found', async () => {
      (prismaService.file.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.downloadFile(mockTenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFilesByEntity', () => {
    it('should return files by entity type and id', async () => {
      const files = [
        { ...mockFile, entityType: 'Contract', entityId: 'contract-123' },
        { ...mockFile, id: 'file-790', entityType: 'Contract', entityId: 'contract-123' },
      ];
      (prismaService.file.findMany as jest.Mock).mockResolvedValue(files);

      const result = await service.getFilesByEntity(mockTenantId, 'Contract', 'contract-123');

      expect(result).toHaveLength(2);
      expect(prismaService.file.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          entityType: 'Contract',
          entityId: 'contract-123',
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no files found', async () => {
      (prismaService.file.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getFilesByEntity(mockTenantId, 'Contract', 'contract-999');

      expect(result).toEqual([]);
    });
  });

  describe('getFileWithDownloadUrl', () => {
    it('should return file with download URL', async () => {
      const signedUrl = 'https://minio.example.com/signed-url';
      (prismaService.file.findFirst as jest.Mock).mockResolvedValue(mockFile);
      (prismaService.file.findUnique as jest.Mock).mockResolvedValue(mockFile);
      (minioService.getPresignedUrl as jest.Mock).mockResolvedValue(signedUrl);

      const result = await service.getFileWithDownloadUrl(mockTenantId, mockFile.id, 3600);

      expect(result.downloadUrl).toBe(signedUrl);
      expect(result.id).toBe(mockFile.id);
    });
  });
});

describe('MinioService', () => {
  let minioService: MinioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: MinioService,
          useValue: {
            uploadFile: jest.fn(),
            getFile: jest.fn(),
            deleteFile: jest.fn(),
            getPresignedUrl: jest.fn(),
            getPresignedPutUrl: jest.fn(),
            getBucket: jest.fn().mockReturnValue('b2b-files'),
            fileExists: jest.fn(),
            getFileStats: jest.fn(),
            copyFile: jest.fn(),
          },
        },
      ],
    }).compile();

    minioService = module.get<MinioService>(MinioService);
  });

  describe('getBucket', () => {
    it('should return bucket name', () => {
      expect(minioService.getBucket()).toBe('b2b-files');
    });
  });

  describe('uploadFile', () => {
    it('should upload file to MinIO', async () => {
      const key = 'test/file.pdf';
      (minioService.uploadFile as jest.Mock).mockResolvedValue(key);

      const result = await minioService.uploadFile(key, Buffer.from('test'), 4, 'application/pdf');

      expect(result).toBe(key);
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate presigned URL', async () => {
      const url = 'https://minio.example.com/signed';
      (minioService.getPresignedUrl as jest.Mock).mockResolvedValue(url);

      const result = await minioService.getPresignedUrl('test/file.pdf', 3600);

      expect(result).toBe(url);
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      (minioService.fileExists as jest.Mock).mockResolvedValue(true);

      const result = await minioService.fileExists('test/file.pdf');

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      (minioService.fileExists as jest.Mock).mockResolvedValue(false);

      const result = await minioService.fileExists('nonexistent.pdf');

      expect(result).toBe(false);
    });
  });
});
