import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '@infrastructure/database';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-id-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    tenantId: 'tenant-id-123',
    organizationId: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            refreshToken: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                BCRYPT_SALT_ROUNDS: 10,
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
        id: 'token-id',
        token: 'refresh-token',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register('tenant-id-123', {
        email: 'test@example.com',
        password: 'SecureP@ss123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(prismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if user exists', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.register('tenant-id-123', {
          email: 'test@example.com',
          password: 'SecureP@ss123',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
        id: 'token-id',
        token: 'refresh-token',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('tenant-id-123', {
        email: 'test@example.com',
        password: 'SecureP@ss123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid user', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login('tenant-id-123', {
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login('tenant-id-123', {
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      (prismaService.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: 'token-id',
        token: 'valid-refresh-token',
        user: mockUser,
      });
      (prismaService.refreshToken.update as jest.Mock).mockResolvedValue({});
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
        id: 'new-token-id',
        token: 'new-refresh-token',
      });

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      (prismaService.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke specific refresh token', async () => {
      (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.logout('user-id-123', 'refresh-token');

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-id-123',
          token: 'refresh-token',
        },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should revoke all tokens when no specific token provided', async () => {
      (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      await service.logout('user-id-123');

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-id-123',
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('validateUser', () => {
    it('should return user for valid payload', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.validateUser({
        sub: 'user-id-123',
        email: 'test@example.com',
        tenantId: 'tenant-id-123',
        role: UserRole.USER,
      });

      expect(result).toEqual(mockUser);
    });

    it('should return null for invalid payload', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser({
        sub: 'invalid-id',
        email: 'test@example.com',
        tenantId: 'tenant-id-123',
        role: UserRole.USER,
      });

      expect(result).toBeNull();
    });
  });
});
