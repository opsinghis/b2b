import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { UserAddress } from '@prisma/client';
import { CreateUserAddressDto, UpdateUserAddressDto } from './dto';

@Injectable()
export class UserAddressesService {
  private readonly logger = new Logger(UserAddressesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all addresses for a user
   */
  async findAll(tenantId: string, userId: string): Promise<UserAddress[]> {
    return this.prisma.userAddress.findMany({
      where: {
        tenantId,
        userId,
        deletedAt: null,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Get address by ID
   */
  async findOne(id: string, tenantId: string, userId: string): Promise<UserAddress> {
    const address = await this.prisma.userAddress.findFirst({
      where: {
        id,
        tenantId,
        userId,
        deletedAt: null,
      },
    });

    if (!address) {
      throw new NotFoundException(`Address '${id}' not found`);
    }

    return address;
  }

  /**
   * Get default address for a user
   */
  async findDefault(tenantId: string, userId: string): Promise<UserAddress | null> {
    return this.prisma.userAddress.findFirst({
      where: {
        tenantId,
        userId,
        isDefault: true,
        deletedAt: null,
      },
    });
  }

  /**
   * Create new address
   */
  async create(dto: CreateUserAddressDto, tenantId: string, userId: string): Promise<UserAddress> {
    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.userAddress.updateMany({
        where: {
          tenantId,
          userId,
          isDefault: true,
          deletedAt: null,
        },
        data: { isDefault: false },
      });
    }

    // If this is the first address, make it default
    const existingCount = await this.prisma.userAddress.count({
      where: {
        tenantId,
        userId,
        deletedAt: null,
      },
    });

    const address = await this.prisma.userAddress.create({
      data: {
        tenantId,
        userId,
        label: dto.label,
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company,
        street1: dto.street1,
        street2: dto.street2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country ?? 'US',
        phone: dto.phone,
        isDefault: dto.isDefault ?? existingCount === 0,
        isShipping: dto.isShipping ?? true,
        isBilling: dto.isBilling ?? true,
      },
    });

    this.logger.log(`Created address ${address.id} for user ${userId}`);

    return address;
  }

  /**
   * Update address
   */
  async update(
    id: string,
    dto: UpdateUserAddressDto,
    tenantId: string,
    userId: string,
  ): Promise<UserAddress> {
    await this.findOne(id, tenantId, userId);

    // If setting this as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.userAddress.updateMany({
        where: {
          tenantId,
          userId,
          isDefault: true,
          deletedAt: null,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.userAddress.update({
      where: { id },
      data: {
        label: dto.label,
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company,
        street1: dto.street1,
        street2: dto.street2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        phone: dto.phone,
        isDefault: dto.isDefault,
        isShipping: dto.isShipping,
        isBilling: dto.isBilling,
      },
    });

    this.logger.log(`Updated address ${id}`);

    return address;
  }

  /**
   * Soft delete address
   */
  async delete(id: string, tenantId: string, userId: string): Promise<void> {
    const address = await this.findOne(id, tenantId, userId);

    await this.prisma.userAddress.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // If deleted address was default, make another one default
    if (address.isDefault) {
      const nextAddress = await this.prisma.userAddress.findFirst({
        where: {
          tenantId,
          userId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (nextAddress) {
        await this.prisma.userAddress.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }

    this.logger.log(`Deleted address ${id}`);
  }

  /**
   * Convert address to JSON for order storage
   */
  toOrderAddress(address: UserAddress): Record<string, unknown> {
    return {
      firstName: address.firstName,
      lastName: address.lastName,
      company: address.company,
      street1: address.street1,
      street2: address.street2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone,
    };
  }
}
