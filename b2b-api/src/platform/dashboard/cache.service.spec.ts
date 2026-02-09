import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

// Mock Redis
const mockRedisClient = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  ttl: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
  status: 'ready',
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisClient);
});

describe('CacheService', () => {
  let service: CacheService;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'CACHE_TTL') return 300;
              if (key === 'REDIS_URL') return 'redis://localhost:6379';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('onModuleInit', () => {
    it('should initialize Redis connection', async () => {
      await service.onModuleInit();
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should handle Redis connection errors gracefully', async () => {
      const Redis = require('ioredis');
      Redis.mockImplementationOnce(() => {
        throw new Error('Connection refused');
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue('redis://localhost:6379'),
            },
          },
        ],
      }).compile();

      const newService = module.get<CacheService>(CacheService);
      // Should not throw
      await expect(newService.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close Redis connection when client exists', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });

    it('should handle null client gracefully', async () => {
      // Don't init, just destroy
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return parsed value when key exists', async () => {
      const testData = { foo: 'bar', count: 42 };
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(testData));

      const result = await service.get<typeof testData>('test-key');
      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);

      const result = await service.get('nonexistent-key');
      expect(result).toBeNull();
    });

    it('should return null on Redis error', async () => {
      mockRedisClient.get.mockRejectedValueOnce(new Error('Redis error'));

      const result = await service.get('error-key');
      expect(result).toBeNull();
    });

    it('should return null when client is not initialized', async () => {
      await service.onModuleDestroy();
      // Create a new service without init
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(300),
            },
          },
        ],
      }).compile();

      const uninitService = module.get<CacheService>(CacheService);
      const result = await uninitService.get('any-key');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should set value with default TTL', async () => {
      const testData = { name: 'test' };
      mockRedisClient.setex.mockResolvedValueOnce('OK');

      await service.set('set-key', testData);
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'set-key',
        300, // default TTL
        JSON.stringify(testData),
      );
    });

    it('should set value with custom TTL', async () => {
      const testData = { name: 'test' };
      mockRedisClient.setex.mockResolvedValueOnce('OK');

      await service.set('set-key', testData, 600);
      expect(mockRedisClient.setex).toHaveBeenCalledWith('set-key', 600, JSON.stringify(testData));
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.setex.mockRejectedValueOnce(new Error('Redis write error'));

      // Should not throw
      await expect(service.set('error-key', { data: 'test' })).resolves.not.toThrow();
    });

    it('should do nothing when client is not initialized', async () => {
      await service.onModuleDestroy();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(300),
            },
          },
        ],
      }).compile();

      const uninitService = module.get<CacheService>(CacheService);
      await expect(uninitService.set('any-key', {})).resolves.not.toThrow();
    });
  });

  describe('del', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should delete a key', async () => {
      mockRedisClient.del.mockResolvedValueOnce(1);

      await service.del('delete-key');
      expect(mockRedisClient.del).toHaveBeenCalledWith('delete-key');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.del.mockRejectedValueOnce(new Error('Delete error'));

      await expect(service.del('error-key')).resolves.not.toThrow();
    });

    it('should do nothing when client is not initialized', async () => {
      await service.onModuleDestroy();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(300),
            },
          },
        ],
      }).compile();

      const uninitService = module.get<CacheService>(CacheService);
      await expect(uninitService.del('any-key')).resolves.not.toThrow();
    });
  });

  describe('delByPattern', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should delete keys matching pattern', async () => {
      mockRedisClient.keys.mockResolvedValueOnce(['cache:user:1', 'cache:user:2', 'cache:user:3']);
      mockRedisClient.del.mockResolvedValueOnce(3);

      await service.delByPattern('cache:user:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('cache:user:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'cache:user:1',
        'cache:user:2',
        'cache:user:3',
      );
    });

    it('should not call del when no keys match', async () => {
      mockRedisClient.keys.mockResolvedValueOnce([]);

      await service.delByPattern('nonexistent:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('nonexistent:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.keys.mockRejectedValueOnce(new Error('Keys error'));

      await expect(service.delByPattern('error:*')).resolves.not.toThrow();
    });

    it('should do nothing when client is not initialized', async () => {
      await service.onModuleDestroy();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(300),
            },
          },
        ],
      }).compile();

      const uninitService = module.get<CacheService>(CacheService);
      await expect(uninitService.delByPattern('any:*')).resolves.not.toThrow();
    });
  });

  describe('getTtl', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return TTL for a key', async () => {
      mockRedisClient.ttl.mockResolvedValueOnce(150);

      const ttl = await service.getTtl('ttl-key');
      expect(ttl).toBe(150);
      expect(mockRedisClient.ttl).toHaveBeenCalledWith('ttl-key');
    });

    it('should return -1 on error', async () => {
      mockRedisClient.ttl.mockRejectedValueOnce(new Error('TTL error'));

      const ttl = await service.getTtl('error-key');
      expect(ttl).toBe(-1);
    });

    it('should return -1 when client is not initialized', async () => {
      await service.onModuleDestroy();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(300),
            },
          },
        ],
      }).compile();

      const uninitService = module.get<CacheService>(CacheService);
      const ttl = await uninitService.getTtl('any-key');
      expect(ttl).toBe(-1);
    });
  });

  describe('isConnected', () => {
    it('should return true when client status is ready', async () => {
      await service.onModuleInit();
      expect(service.isConnected()).toBe(true);
    });

    it('should return false when client is not initialized', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(300),
            },
          },
        ],
      }).compile();

      const uninitService = module.get<CacheService>(CacheService);
      expect(uninitService.isConnected()).toBe(false);
    });
  });
});
