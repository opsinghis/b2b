import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { MinioService } from './minio.service';
import { DatabaseModule } from '@infrastructure/database';
import { AuthorizationModule } from '@core/authorization';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuthorizationModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB
      },
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService, MinioService],
  exports: [FilesService, MinioService],
})
export class FilesModule {}
