import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserAddressesService } from './user-addresses.service';
import { PrismaService } from '@infrastructure/database';

describe('UserAddressesService', () => {
  let service: UserAddressesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockAddress = {
    id: 'addr-123',
    label: 'Home',
    firstName: 'John',
    lastName: 'Doe',
    company: null,
    street1: '123 Main St',
    street2: 'Apt 4',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
    phone: '+1234567890',
    isDefault: true,
    isShipping: true,
    isBilling: true,
    tenantId: mockTenantId,
    userId: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAddressesService,
        {
          provide: PrismaService,
          useValue: {
            userAddress: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserAddressesService>(UserAddressesService);
    prismaService = module.get(PrismaService);
  });

  describe('findAll', () => {
    it('should return all addresses for a user', async () => {
      prismaService.userAddress.findMany = jest.fn().mockResolvedValue([mockAddress]);

      const result = await service.findAll(mockTenantId, mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
      expect(prismaService.userAddress.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          userId: mockUserId,
          deletedAt: null,
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('findOne', () => {
    it('should return an address by id', async () => {
      prismaService.userAddress.findFirst = jest.fn().mockResolvedValue(mockAddress);

      const result = await service.findOne('addr-123', mockTenantId, mockUserId);

      expect(result.id).toBe('addr-123');
    });

    it('should throw NotFoundException if address not found', async () => {
      prismaService.userAddress.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('not-found', mockTenantId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findDefault', () => {
    it('should return the default address', async () => {
      prismaService.userAddress.findFirst = jest.fn().mockResolvedValue(mockAddress);

      const result = await service.findDefault(mockTenantId, mockUserId);

      expect(result?.isDefault).toBe(true);
      expect(prismaService.userAddress.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          userId: mockUserId,
          isDefault: true,
          deletedAt: null,
        },
      });
    });

    it('should return null if no default address', async () => {
      prismaService.userAddress.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.findDefault(mockTenantId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new address', async () => {
      prismaService.userAddress.updateMany = jest.fn().mockResolvedValue({ count: 0 });
      prismaService.userAddress.count = jest.fn().mockResolvedValue(0);
      prismaService.userAddress.create = jest.fn().mockResolvedValue(mockAddress);

      const dto = {
        firstName: 'John',
        lastName: 'Doe',
        street1: '123 Main St',
        city: 'New York',
        postalCode: '10001',
      };

      const result = await service.create(dto, mockTenantId, mockUserId);

      expect(result.firstName).toBe('John');
      expect(prismaService.userAddress.create).toHaveBeenCalled();
    });

    it('should set first address as default', async () => {
      prismaService.userAddress.updateMany = jest.fn().mockResolvedValue({ count: 0 });
      prismaService.userAddress.count = jest.fn().mockResolvedValue(0);
      prismaService.userAddress.create = jest.fn().mockResolvedValue(mockAddress);

      const dto = {
        firstName: 'John',
        lastName: 'Doe',
        street1: '123 Main St',
        city: 'New York',
        postalCode: '10001',
      };

      await service.create(dto, mockTenantId, mockUserId);

      expect(prismaService.userAddress.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isDefault: true,
          }),
        }),
      );
    });

    it('should unset other defaults when creating new default', async () => {
      prismaService.userAddress.updateMany = jest.fn().mockResolvedValue({ count: 1 });
      prismaService.userAddress.count = jest.fn().mockResolvedValue(1);
      prismaService.userAddress.create = jest.fn().mockResolvedValue(mockAddress);

      const dto = {
        firstName: 'John',
        lastName: 'Doe',
        street1: '123 Main St',
        city: 'New York',
        postalCode: '10001',
        isDefault: true,
      };

      await service.create(dto, mockTenantId, mockUserId);

      expect(prismaService.userAddress.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          userId: mockUserId,
          isDefault: true,
          deletedAt: null,
        },
        data: { isDefault: false },
      });
    });
  });

  describe('update', () => {
    it('should update an address', async () => {
      prismaService.userAddress.findFirst = jest.fn().mockResolvedValue(mockAddress);
      prismaService.userAddress.updateMany = jest.fn().mockResolvedValue({ count: 0 });
      prismaService.userAddress.update = jest.fn().mockResolvedValue({
        ...mockAddress,
        firstName: 'Jane',
      });

      const result = await service.update(
        'addr-123',
        { firstName: 'Jane' },
        mockTenantId,
        mockUserId,
      );

      expect(result.firstName).toBe('Jane');
    });

    it('should throw NotFoundException if address not found', async () => {
      prismaService.userAddress.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.update('not-found', { firstName: 'Jane' }, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should soft delete an address', async () => {
      prismaService.userAddress.findFirst = jest
        .fn()
        .mockResolvedValueOnce(mockAddress) // findOne
        .mockResolvedValueOnce(null); // next address query
      prismaService.userAddress.update = jest.fn().mockResolvedValue({
        ...mockAddress,
        deletedAt: new Date(),
      });

      await service.delete('addr-123', mockTenantId, mockUserId);

      expect(prismaService.userAddress.update).toHaveBeenCalledWith({
        where: { id: 'addr-123' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should set next address as default when deleting default', async () => {
      const nextAddress = { ...mockAddress, id: 'addr-456', isDefault: false };
      prismaService.userAddress.findFirst = jest
        .fn()
        .mockResolvedValueOnce(mockAddress) // findOne (get address to delete)
        .mockResolvedValueOnce(nextAddress); // find next address
      prismaService.userAddress.update = jest.fn().mockResolvedValue({
        ...mockAddress,
        deletedAt: new Date(),
      });

      await service.delete('addr-123', mockTenantId, mockUserId);

      expect(prismaService.userAddress.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'addr-456' },
        data: { isDefault: true },
      });
    });

    it('should throw NotFoundException if address not found', async () => {
      prismaService.userAddress.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.delete('not-found', mockTenantId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toOrderAddress', () => {
    it('should convert address to order JSON format', () => {
      const result = service.toOrderAddress(mockAddress);

      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        company: null,
        street1: '123 Main St',
        street2: 'Apt 4',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        phone: '+1234567890',
      });
    });
  });
});
