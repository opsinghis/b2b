import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database';
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  ChangePasswordDto,
  UserListQueryDto,
} from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly saltRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 10);
  }

  async create(tenantId: string, dto: CreateUserDto): Promise<User> {
    // Check if email already exists in tenant
    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenantId,
        email: dto.email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new ConflictException(`User with email '${dto.email}' already exists in this tenant`);
    }

    // Verify organization exists if provided
    if (dto.organizationId) {
      const organization = await this.prisma.organization.findFirst({
        where: {
          id: dto.organizationId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID '${dto.organizationId}' not found`);
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        organizationId: dto.organizationId,
        tenantId,
      },
    });

    this.logger.log(`User created: ${user.email} in tenant ${tenantId}`);

    return user;
  }

  async findAll(
    tenantId: string,
    query: UserListQueryDto,
  ): Promise<PaginatedResult<User>> {
    const { search, isActive, role, organizationId, includeDeleted, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      tenantId,
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(isActive !== undefined && { isActive }),
      ...(role && { role }),
      ...(organizationId !== undefined && { organizationId }),
      ...(!includeDeleted && { deletedAt: null }),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          organization: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(tenantId: string, id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        organization: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    return user;
  }

  async findByEmail(tenantId: string, email: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        email: email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with email '${email}' not found`);
    }

    return user;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto): Promise<User> {
    // Verify user exists
    await this.findOne(tenantId, id);

    // Verify organization exists if updating organization
    if (dto.organizationId !== undefined && dto.organizationId !== null) {
      const organization = await this.prisma.organization.findFirst({
        where: {
          id: dto.organizationId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID '${dto.organizationId}' not found`);
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.organizationId !== undefined && { organizationId: dto.organizationId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log(`User updated: ${user.email} (${user.id})`);

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      },
    });

    this.logger.log(`User profile updated: ${updatedUser.email}`);

    return updatedUser;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    this.logger.log(`Password changed for user: ${user.email}`);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    // Verify user exists
    const user = await this.findOne(tenantId, id);

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`User soft-deleted: ${user.email} (${user.id})`);
  }

  async restore(tenantId: string, id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    if (!user.deletedAt) {
      throw new ConflictException(`User with ID '${id}' is not deleted`);
    }

    const restoredUser = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });

    this.logger.log(`User restored: ${restoredUser.email} (${restoredUser.id})`);

    return restoredUser;
  }
}
