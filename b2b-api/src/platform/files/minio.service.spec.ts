import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MinioService } from './minio.service';
import * as Minio from 'minio';

// Mock Minio client
jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    bucketExists: jest.fn(),
    makeBucket: jest.fn(),
    putObject: jest.fn(),
    getObject: jest.fn(),
    removeObject: jest.fn(),
    presignedGetObject: jest.fn(),
    presignedPutObject: jest.fn(),
    statObject: jest.fn(),
    copyObject: jest.fn(),
  })),
  CopyConditions: jest.fn().mockImplementation(() => ({})),
}));

describe('MinioService', () => {
  let service: MinioService;
  let mockMinioClient: jest.Mocked<Minio.Client>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinioService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                MINIO_ENDPOINT: 'localhost',
                MINIO_PORT: 9000,
                MINIO_USE_SSL: 'false',
                MINIO_ACCESS_KEY: 'minioadmin',
                MINIO_SECRET_KEY: 'minioadmin',
                MINIO_BUCKET: 'test-bucket',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MinioService>(MinioService);
    mockMinioClient = (service as any).client;
  });

  describe('constructor', () => {
    it('should create MinIO client with config values', () => {
      expect(Minio.Client).toHaveBeenCalledWith({
        endPoint: 'localhost',
        port: 9000,
        useSSL: false,
        accessKey: 'minioadmin',
        secretKey: 'minioadmin',
      });
    });
  });

  describe('onModuleInit', () => {
    it('should create bucket if it does not exist', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('test-bucket');
      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith('test-bucket');
    });

    it('should not create bucket if it already exists', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);

      await service.onModuleInit();

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('test-bucket');
      expect(mockMinioClient.makeBucket).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockMinioClient.bucketExists.mockRejectedValue(new Error('Connection failed'));

      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('getBucket', () => {
    it('should return bucket name', () => {
      expect(service.getBucket()).toBe('test-bucket');
    });
  });

  describe('uploadFile', () => {
    it('should upload file to bucket', async () => {
      mockMinioClient.putObject.mockResolvedValue({ etag: 'test-etag', versionId: null });
      const buffer = Buffer.from('test content');

      const result = await service.uploadFile(
        'test-key.txt',
        buffer,
        buffer.length,
        'text/plain',
        { custom: 'metadata' },
      );

      expect(result).toBe('test-key.txt');
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        'test-key.txt',
        buffer,
        buffer.length,
        { 'Content-Type': 'text/plain', custom: 'metadata' },
      );
    });

    it('should upload file without metadata', async () => {
      mockMinioClient.putObject.mockResolvedValue({ etag: 'test-etag', versionId: null });
      const buffer = Buffer.from('test');

      await service.uploadFile('key', buffer, buffer.length, 'text/plain');

      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        'key',
        buffer,
        buffer.length,
        { 'Content-Type': 'text/plain' },
      );
    });
  });

  describe('getFile', () => {
    it('should retrieve file as buffer', async () => {
      const testData = Buffer.from('file content');
      const createMockStream = (): { on: jest.Mock } => {
        const stream: { on: jest.Mock } = {
          on: jest.fn((event: string, callback: (...args: unknown[]) => void) => {
            if (event === 'data') {
              callback(testData);
            }
            if (event === 'end') {
              callback();
            }
            return stream;
          }),
        };
        return stream;
      };
      mockMinioClient.getObject.mockResolvedValue(createMockStream() as any);

      const result = await service.getFile('test-key');

      expect(result).toEqual(testData);
      expect(mockMinioClient.getObject).toHaveBeenCalledWith('test-bucket', 'test-key');
    });

    it('should handle stream errors', async () => {
      const mockError = new Error('Stream error');
      const createErrorStream = (): { on: jest.Mock } => {
        const stream: { on: jest.Mock } = {
          on: jest.fn((event: string, callback: (...args: unknown[]) => void) => {
            if (event === 'error') {
              callback(mockError);
            }
            return stream;
          }),
        };
        return stream;
      };
      mockMinioClient.getObject.mockResolvedValue(createErrorStream() as any);

      await expect(service.getFile('test-key')).rejects.toThrow('Stream error');
    });
  });

  describe('deleteFile', () => {
    it('should delete file from bucket', async () => {
      mockMinioClient.removeObject.mockResolvedValue(undefined);

      await service.deleteFile('test-key');

      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('test-bucket', 'test-key');
    });
  });

  describe('getPresignedUrl', () => {
    it('should return presigned GET URL with default expiry', async () => {
      mockMinioClient.presignedGetObject.mockResolvedValue('https://presigned-url');

      const result = await service.getPresignedUrl('test-key');

      expect(result).toBe('https://presigned-url');
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'test-bucket',
        'test-key',
        3600,
      );
    });

    it('should return presigned GET URL with custom expiry', async () => {
      mockMinioClient.presignedGetObject.mockResolvedValue('https://presigned-url');

      const result = await service.getPresignedUrl('test-key', 7200);

      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'test-bucket',
        'test-key',
        7200,
      );
    });
  });

  describe('getPresignedPutUrl', () => {
    it('should return presigned PUT URL with default expiry', async () => {
      mockMinioClient.presignedPutObject.mockResolvedValue('https://presigned-put-url');

      const result = await service.getPresignedPutUrl('test-key');

      expect(result).toBe('https://presigned-put-url');
      expect(mockMinioClient.presignedPutObject).toHaveBeenCalledWith(
        'test-bucket',
        'test-key',
        3600,
      );
    });

    it('should return presigned PUT URL with custom expiry', async () => {
      mockMinioClient.presignedPutObject.mockResolvedValue('https://presigned-put-url');

      const result = await service.getPresignedPutUrl('test-key', 1800);

      expect(mockMinioClient.presignedPutObject).toHaveBeenCalledWith(
        'test-bucket',
        'test-key',
        1800,
      );
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockMinioClient.statObject.mockResolvedValue({
        size: 100,
        metaData: {},
        lastModified: new Date(),
        etag: 'etag',
      } as any);

      const result = await service.fileExists('test-key');

      expect(result).toBe(true);
      expect(mockMinioClient.statObject).toHaveBeenCalledWith('test-bucket', 'test-key');
    });

    it('should return false when file does not exist', async () => {
      mockMinioClient.statObject.mockRejectedValue(new Error('Not found'));

      const result = await service.fileExists('nonexistent-key');

      expect(result).toBe(false);
    });
  });

  describe('getFileStats', () => {
    it('should return file statistics', async () => {
      const stats = {
        size: 1024,
        metaData: { 'content-type': 'text/plain' },
        lastModified: new Date('2024-01-01'),
        etag: 'test-etag',
      };
      mockMinioClient.statObject.mockResolvedValue(stats as any);

      const result = await service.getFileStats('test-key');

      expect(result).toEqual(stats);
      expect(mockMinioClient.statObject).toHaveBeenCalledWith('test-bucket', 'test-key');
    });
  });

  describe('copyFile', () => {
    it('should copy file within bucket', async () => {
      mockMinioClient.copyObject.mockResolvedValue({ etag: 'new-etag' } as any);

      await service.copyFile('source-key', 'dest-key');

      expect(mockMinioClient.copyObject).toHaveBeenCalledWith(
        'test-bucket',
        'dest-key',
        '/test-bucket/source-key',
        expect.any(Object),
      );
    });
  });
});
