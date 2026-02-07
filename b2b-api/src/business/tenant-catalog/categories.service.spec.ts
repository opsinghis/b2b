import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '@infrastructure/database';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockCategory = {
    id: 'cat-1',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic products',
    imageUrl: 'https://example.com/electronics.jpg',
    parentId: null,
    isActive: true,
    sortOrder: 0,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { products: 10 },
    children: [],
  };

  const mockChildCategory = {
    id: 'cat-2',
    name: 'Smartphones',
    slug: 'smartphones',
    description: 'Mobile phones',
    imageUrl: null,
    parentId: 'cat-1',
    isActive: true,
    sortOrder: 0,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { products: 5 },
    children: [],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategoryTree', () => {
    it('should return category tree with nested children', async () => {
      const mockCategories = [
        { ...mockCategory, children: [] },
        { ...mockChildCategory, children: [] },
      ];

      (prismaService.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const result = await service.getCategoryTree();

      expect(result.data).toHaveLength(1); // Only root categories
      expect(result.data[0].children).toHaveLength(1);
      expect(result.total).toBe(2);
      expect(prismaService.category.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { products: true } } },
      });
    });

    it('should include inactive categories when includeInactive is true', async () => {
      (prismaService.category.findMany as jest.Mock).mockResolvedValue([mockCategory]);

      await service.getCategoryTree(true);

      expect(prismaService.category.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { products: true } } },
      });
    });
  });

  describe('findOne', () => {
    it('should return a category by ID', async () => {
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue({
        ...mockCategory,
        children: [{ ...mockChildCategory, _count: { products: 5 } }],
      });

      const result = await service.findOne('cat-1');

      expect(result.id).toBe('cat-1');
      expect(result.name).toBe('Electronics');
      expect(result.children).toHaveLength(1);
      expect(prismaService.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        include: {
          children: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: { _count: { select: { products: true } } },
          },
          _count: { select: { products: true } },
        },
      });
    });

    it('should throw NotFoundException if category not found', async () => {
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('should return a category by slug', async () => {
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue({
        ...mockCategory,
        children: [],
      });

      const result = await service.findBySlug('electronics');

      expect(result.slug).toBe('electronics');
      expect(prismaService.category.findUnique).toHaveBeenCalledWith({
        where: { slug: 'electronics' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if category not found', async () => {
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findBySlug('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'New Category',
      slug: 'new-category',
      description: 'A new category',
      isActive: true,
    };

    it('should create a new category', async () => {
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.category.create as jest.Mock).mockResolvedValue({
        ...createDto,
        id: 'new-cat',
        parentId: null,
        imageUrl: null,
        sortOrder: 0,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { products: 0 },
      });

      const result = await service.create(createDto);

      expect(result.name).toBe('New Category');
      expect(prismaService.category.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if slug already exists', async () => {
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if parent not found', async () => {
      (prismaService.category.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce(null); // parent check

      await expect(
        service.create({ ...createDto, parentId: 'invalid-parent' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Category',
    };

    it('should update a category', async () => {
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (prismaService.category.update as jest.Mock).mockResolvedValue({
        ...mockCategory,
        name: 'Updated Category',
        children: [],
      });

      const result = await service.update('cat-1', updateDto);

      expect(result.name).toBe('Updated Category');
      expect(prismaService.category.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if category not found', async () => {
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new slug already exists', async () => {
      (prismaService.category.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce({ id: 'other-cat', slug: 'taken-slug' });

      await expect(service.update('cat-1', { slug: 'taken-slug' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if setting self as parent', async () => {
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);

      await expect(service.update('cat-1', { parentId: 'cat-1' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('delete', () => {
    it('should soft delete a category', async () => {
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue({
        ...mockCategory,
        children: [],
        _count: { products: 0 },
      });
      (prismaService.category.update as jest.Mock).mockResolvedValue({
        ...mockCategory,
        isActive: false,
      });

      await service.delete('cat-1');

      expect(prismaService.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException if category not found', async () => {
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if category has children', async () => {
      (prismaService.category.findUnique as jest.Mock).mockResolvedValue({
        ...mockCategory,
        children: [mockChildCategory],
      });

      await expect(service.delete('cat-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('getCategoryIdsWithDescendants', () => {
    it('should return category ID with all descendant IDs', async () => {
      (prismaService.category.findMany as jest.Mock)
        .mockResolvedValueOnce([{ id: 'cat-2' }]) // children of cat-1
        .mockResolvedValueOnce([{ id: 'cat-3' }]) // children of cat-2
        .mockResolvedValueOnce([]); // children of cat-3

      const result = await service.getCategoryIdsWithDescendants('cat-1');

      expect(result).toContain('cat-1');
      expect(result).toContain('cat-2');
      expect(result).toContain('cat-3');
    });
  });
});
