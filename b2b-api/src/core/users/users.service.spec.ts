import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { PrismaService } from '@infrastructure/database';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: jest.Mocked<PrismaService>;

  const tenantId = 'tenant-id-123';

  const mockUser: User = {
    id: 'user-id-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    isActive: true,
    lastLoginAt: null,
    tenantId,
    organizationId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            organization: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                BCRYPT_SALT_ROUNDS: 10,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.create(tenantId, {
        email: 'test@example.com',
        password: 'SecureP@ss123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result).toEqual(mockUser);
      expect(bcrypt.hash).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.create(tenantId, {
          email: 'test@example.com',
          password: 'SecureP@ss123',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user with organization', async () => {
      const mockOrg = { id: 'org-id-123', name: 'Test Org', tenantId };
      const userWithOrg = { ...mockUser, organizationId: 'org-id-123' };

      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(mockOrg);
      (prismaService.user.create as jest.Mock).mockResolvedValue(userWithOrg);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.create(tenantId, {
        email: 'test@example.com',
        password: 'SecureP@ss123',
        firstName: 'Test',
        lastName: 'User',
        organizationId: 'org-id-123',
      });

      expect(result.organizationId).toBe('org-id-123');
    });

    it('should throw NotFoundException if organization does not exist', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(tenantId, {
          email: 'test@example.com',
          password: 'SecureP@ss123',
          firstName: 'Test',
          lastName: 'User',
          organizationId: 'non-existent-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [mockUser];
      (prismaService.user.findMany as jest.Mock).mockResolvedValue(users);
      (prismaService.user.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(tenantId, { page: 1, limit: 20 });

      expect(result).toEqual({
        data: users,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by search term', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(tenantId, { search: 'test' });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { email: { contains: 'test', mode: 'insensitive' } },
              { firstName: { contains: 'test', mode: 'insensitive' } },
              { lastName: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by role', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(tenantId, { role: UserRole.ADMIN });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: UserRole.ADMIN,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOne(tenantId, 'user-id-123');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByEmail(tenantId, 'test@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findByEmail(tenantId, 'nonexistent@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updatedUser = { ...mockUser, firstName: 'Updated' };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.update(tenantId, 'user-id-123', {
        firstName: 'Updated',
      });

      expect(result.firstName).toBe('Updated');
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'non-existent-id', { firstName: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if updating to non-existent organization', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'user-id-123', { organizationId: 'non-existent-id' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updatedUser = { ...mockUser, firstName: 'Updated' };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-id-123', {
        firstName: 'Updated',
      });

      expect(result.firstName).toBe('Updated');
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateProfile('non-existent-id', { firstName: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('should change password when current password is correct', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.changePassword('user-id-123', {
          currentPassword: 'OldP@ss123',
          newPassword: 'NewP@ss456',
        }),
      ).resolves.toBeUndefined();

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        data: { passwordHash: 'new-hashed-password' },
      });
    });

    it('should throw UnauthorizedException if current password is wrong', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-id-123', {
          currentPassword: 'WrongP@ss123',
          newPassword: 'NewP@ss456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.changePassword('non-existent-id', {
          currentPassword: 'OldP@ss123',
          newPassword: 'NewP@ss456',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a user', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await service.remove(tenantId, 'user-id-123');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(tenantId, 'non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted user', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(deletedUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        deletedAt: null,
      });

      const result = await service.restore(tenantId, 'user-id-123');

      expect(result.deletedAt).toBeNull();
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.restore(tenantId, 'non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user is not deleted', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.restore(tenantId, 'user-id-123')).rejects.toThrow(ConflictException);
    });
  });
});
