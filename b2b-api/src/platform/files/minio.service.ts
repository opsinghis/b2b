import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.configService.get<number>('MINIO_PORT', 9000),
      useSSL: this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'b2b-files');
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created bucket: ${this.bucket}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to ensure bucket exists: ${message}`);
    }
  }

  getBucket(): string {
    return this.bucket;
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    size: number,
    mimeType: string,
    metadata: Record<string, string> = {},
  ): Promise<string> {
    await this.client.putObject(this.bucket, key, buffer, size, {
      'Content-Type': mimeType,
      ...metadata,
    });
    return key;
  }

  async getFile(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, key);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  async getPresignedUrl(key: string, expirySeconds: number = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  async getPresignedPutUrl(key: string, expirySeconds: number = 3600): Promise<string> {
    return this.client.presignedPutObject(this.bucket, key, expirySeconds);
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, key);
      return true;
    } catch {
      return false;
    }
  }

  async getFileStats(key: string): Promise<Minio.BucketItemStat> {
    return this.client.statObject(this.bucket, key);
  }

  async copyFile(sourceKey: string, destKey: string): Promise<void> {
    const conds = new Minio.CopyConditions();
    await this.client.copyObject(this.bucket, destKey, `/${this.bucket}/${sourceKey}`, conds);
  }
}
