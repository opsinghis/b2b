import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { MinioService } from './minio.service';
import { UploadFileDto, FileResponseDto, ListFilesQueryDto } from './dto';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/json',
];

export interface PaginatedFiles {
  data: FileResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  async uploadFile(
    tenantId: string,
    userId: string,
    file: Express.Multer.File,
    dto: UploadFileDto,
  ): Promise<FileResponseDto> {
    this.validateFile(file);

    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    const filename = `${uniqueId}${extension}`;
    const key = this.generateKey(tenantId, dto.entityType, filename);

    await this.minioService.uploadFile(key, file.buffer, file.size, file.mimetype, {
      'x-amz-meta-tenant-id': tenantId,
      'x-amz-meta-uploaded-by': userId,
      'x-amz-meta-original-name': encodeURIComponent(file.originalname),
    });

    const fileRecord = await this.prisma.file.create({
      data: {
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        bucket: this.minioService.getBucket(),
        key,
        entityType: dto.entityType,
        entityId: dto.entityId,
        metadata: (dto.metadata || {}) as object,
        isPublic: dto.isPublic || false,
        tenantId,
        uploadedById: userId,
      },
    });

    this.logger.log(`File uploaded: ${fileRecord.id} by user ${userId}`);

    return this.toFileResponse(fileRecord);
  }

  async getFile(tenantId: string, fileId: string): Promise<FileResponseDto> {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    return this.toFileResponse(file);
  }

  async getFileWithDownloadUrl(
    tenantId: string,
    fileId: string,
    expirySeconds: number = 3600,
  ): Promise<FileResponseDto> {
    const fileResponse = await this.getFile(tenantId, fileId);
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    const downloadUrl = await this.minioService.getPresignedUrl(file.key, expirySeconds);

    return {
      ...fileResponse,
      downloadUrl,
    };
  }

  async getSignedDownloadUrl(
    tenantId: string,
    fileId: string,
    expirySeconds: number = 3600,
  ): Promise<{ url: string; expiresIn: number }> {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    const url = await this.minioService.getPresignedUrl(file.key, expirySeconds);

    return {
      url,
      expiresIn: expirySeconds,
    };
  }

  async listFiles(tenantId: string, query: ListFilesQueryDto): Promise<PaginatedFiles> {
    const { entityType, entityId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      deletedAt: null,
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
    };

    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.file.count({ where }),
    ]);

    return {
      data: files.map((file) => this.toFileResponse(file)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteFile(tenantId: string, fileId: string): Promise<void> {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Soft delete in database
    await this.prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });

    // Optionally delete from MinIO (commented out for soft delete support)
    // await this.minioService.deleteFile(file.key);

    this.logger.log(`File deleted: ${fileId}`);
  }

  async hardDeleteFile(tenantId: string, fileId: string): Promise<void> {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        tenantId,
      },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Delete from MinIO
    await this.minioService.deleteFile(file.key);

    // Hard delete from database
    await this.prisma.file.delete({
      where: { id: fileId },
    });

    this.logger.log(`File hard deleted: ${fileId}`);
  }

  async downloadFile(
    tenantId: string,
    fileId: string,
  ): Promise<{ buffer: Buffer; file: FileResponseDto }> {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    const buffer = await this.minioService.getFile(file.key);

    return {
      buffer,
      file: this.toFileResponse(file),
    };
  }

  async getFilesByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<FileResponseDto[]> {
    const files = await this.prisma.file.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return files.map((file) => this.toFileResponse(file));
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  private generateKey(tenantId: string, entityType: string | undefined, filename: string): string {
    const datePath = new Date().toISOString().slice(0, 10).replace(/-/g, '/');

    if (entityType) {
      return `tenants/${tenantId}/${entityType}/${datePath}/${filename}`;
    }

    return `tenants/${tenantId}/general/${datePath}/${filename}`;
  }

  private toFileResponse(file: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    bucket: string;
    key: string;
    entityType: string | null;
    entityId: string | null;
    isPublic: boolean;
    createdAt: Date;
  }): FileResponseDto {
    return {
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      bucket: file.bucket,
      key: file.key,
      entityType: file.entityType ?? undefined,
      entityId: file.entityId ?? undefined,
      isPublic: file.isPublic,
      createdAt: file.createdAt,
    };
  }
}
