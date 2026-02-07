import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CanManage } from '@core/authorization';
import { MasterCatalogService } from './master-catalog.service';
import { ImportResponseDto } from './dto';

@ApiTags('Master Catalog Admin')
@ApiBearerAuth()
@Controller('admin/master-catalog')
export class MasterCatalogAdminController {
  constructor(private readonly masterCatalogService: MasterCatalogService) {}

  @Post('import')
  @CanManage('MasterProduct')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Import products from JSON file (Admin only)',
    description: 'Batch import master products from a JSON file. Supports up to 10MB files.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'JSON file containing products array',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Import completed',
    type: ImportResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format or validation errors',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin only',
  })
  async importProducts(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: 'application/json' }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ): Promise<ImportResponseDto> {
    try {
      const statistics = await this.masterCatalogService.importFromJson(file.buffer);

      return {
        success: statistics.failed === 0,
        statistics,
        message:
          statistics.failed === 0
            ? 'Import completed successfully'
            : `Import completed with ${statistics.failed} errors`,
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to import products',
      );
    }
  }
}
