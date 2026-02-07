import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Res,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { FilesService, PaginatedFiles } from './files.service';
import {
  UploadFileDto,
  FileResponseDto,
  FileUploadResponseDto,
  SignedUrlResponseDto,
  ListFilesQueryDto,
} from './dto';
import { CurrentUser } from '@core/auth';
import { TenantContext } from '@core/tenants';
import { CanRead, CanCreate, CanDelete } from '@core/authorization';
import { AuditLog } from '@core/audit';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        entityType: {
          type: 'string',
          description: 'Entity type the file is associated with',
        },
        entityId: {
          type: 'string',
          description: 'Entity ID the file is associated with',
        },
        isPublic: {
          type: 'boolean',
          description: 'Whether the file should be publicly accessible',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, type: FileUploadResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @CanCreate('File')
  @AuditLog({ action: 'FILE_UPLOAD', entityType: 'File' })
  async uploadFile(
    @TenantContext() tenantId: string,
    @CurrentUser() user: { id: string },
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ): Promise<FileUploadResponseDto> {
    const uploadedFile = await this.filesService.uploadFile(
      tenantId,
      user.id,
      file,
      dto,
    );

    return {
      file: uploadedFile,
      message: 'File uploaded successfully',
    };
  }

  @Get()
  @ApiOperation({ summary: 'List files' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  @CanRead('File')
  async listFiles(
    @TenantContext() tenantId: string,
    @Query() query: ListFilesQueryDto,
  ): Promise<PaginatedFiles> {
    return this.filesService.listFiles(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiResponse({ status: 200, type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  @CanRead('File')
  async getFile(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ): Promise<FileResponseDto> {
    return this.filesService.getFile(tenantId, id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download file content' })
  @ApiResponse({ status: 200, description: 'File content' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @CanRead('File')
  async downloadFile(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, file } = await this.filesService.downloadFile(tenantId, id);

    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      'Content-Length': buffer.length,
    });

    res.status(HttpStatus.OK).send(buffer);
  }

  @Get(':id/signed-url')
  @ApiOperation({ summary: 'Get signed download URL' })
  @ApiResponse({ status: 200, type: SignedUrlResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  @CanRead('File')
  async getSignedUrl(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Query('expiresIn') expiresIn?: number,
  ): Promise<SignedUrlResponseDto> {
    const expiry = expiresIn ? Math.min(expiresIn, 86400) : 3600; // Max 24 hours
    return this.filesService.getSignedDownloadUrl(tenantId, id, expiry);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file (soft delete)' })
  @ApiResponse({ status: 204, description: 'File deleted' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @CanDelete('File')
  @AuditLog({ action: 'FILE_DELETE', entityType: 'File' })
  async deleteFile(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.filesService.deleteFile(tenantId, id);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get files by entity' })
  @ApiResponse({ status: 200, type: [FileResponseDto] })
  @CanRead('File')
  async getFilesByEntity(
    @TenantContext() tenantId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<FileResponseDto[]> {
    return this.filesService.getFilesByEntity(tenantId, entityType, entityId);
  }
}
