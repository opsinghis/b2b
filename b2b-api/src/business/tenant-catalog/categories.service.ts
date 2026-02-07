import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { Category } from '@prisma/client';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  CategoryTreeResponseDto,
} from './dto';

type CategoryWithChildren = Category & {
  children?: CategoryWithChildren[];
  _count?: { products: number };
};

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all categories as a tree structure
   */
  async getCategoryTree(includeInactive = false): Promise<CategoryTreeResponseDto> {
    const categories = await this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    // Build tree structure
    const categoryMap = new Map<string, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];

    // First pass: create map of all categories
    for (const cat of categories) {
      categoryMap.set(cat.id, { ...cat, children: [] });
    }

    // Second pass: build tree
    for (const cat of categories) {
      const categoryWithChildren = categoryMap.get(cat.id)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children!.push(categoryWithChildren);
      } else {
        rootCategories.push(categoryWithChildren);
      }
    }

    return {
      data: rootCategories.map((cat) => this.toCategoryResponse(cat)),
      total: categories.length,
    };
  }

  /**
   * Get a single category by ID
   */
  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    return this.toCategoryResponse(category as CategoryWithChildren);
  }

  /**
   * Get category by slug
   */
  async findBySlug(slug: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug '${slug}' not found`);
    }

    return this.toCategoryResponse(category as CategoryWithChildren);
  }

  /**
   * Create a new category
   */
  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    // Check if slug is unique
    const existing = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Category with slug '${dto.slug}' already exists`);
    }

    // Validate parent exists if provided
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(`Parent category with ID '${dto.parentId}' not found`);
      }
    }

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        parentId: dto.parentId || null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    this.logger.log(`Created category '${category.name}' (${category.id})`);

    return this.toCategoryResponse(category as CategoryWithChildren);
  }

  /**
   * Update a category
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    // Check slug uniqueness if changed
    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.prisma.category.findUnique({
        where: { slug: dto.slug },
      });

      if (slugExists) {
        throw new ConflictException(`Category with slug '${dto.slug}' already exists`);
      }
    }

    // Validate parent exists if provided and prevent circular reference
    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new ConflictException('Category cannot be its own parent');
      }

      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(`Parent category with ID '${dto.parentId}' not found`);
      }

      // Check for circular reference
      const isCircular = await this.checkCircularReference(id, dto.parentId);
      if (isCircular) {
        throw new ConflictException('Circular reference detected in category hierarchy');
      }
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
    });

    this.logger.log(`Updated category '${category.name}' (${category.id})`);

    return this.toCategoryResponse(category as CategoryWithChildren);
  }

  /**
   * Delete a category (soft delete by marking inactive)
   */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        _count: { select: { products: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    if (existing.children.length > 0) {
      throw new ConflictException(
        `Cannot delete category with ${existing.children.length} subcategories. Delete subcategories first.`,
      );
    }

    // Soft delete - mark as inactive
    await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Deleted (deactivated) category '${existing.name}' (${id})`);
  }

  /**
   * Get all category IDs including descendants
   */
  async getCategoryIdsWithDescendants(categoryId: string): Promise<string[]> {
    const allIds: string[] = [categoryId];

    const getDescendants = async (parentId: string): Promise<void> => {
      const children = await this.prisma.category.findMany({
        where: { parentId, isActive: true },
        select: { id: true },
      });

      for (const child of children) {
        allIds.push(child.id);
        await getDescendants(child.id);
      }
    };

    await getDescendants(categoryId);
    return allIds;
  }

  /**
   * Check for circular reference in category hierarchy
   */
  private async checkCircularReference(
    categoryId: string,
    newParentId: string,
  ): Promise<boolean> {
    let currentId: string | null = newParentId;

    while (currentId) {
      if (currentId === categoryId) {
        return true;
      }

      const parentCategory: { parentId: string | null } | null =
        await this.prisma.category.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });

      currentId = parentCategory?.parentId || null;
    }

    return false;
  }

  /**
   * Convert category to response DTO
   */
  private toCategoryResponse(category: CategoryWithChildren): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      parentId: category.parentId,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      productCount: category._count?.products ?? 0,
      children: category.children?.map((child) => this.toCategoryResponse(child)),
    };
  }
}
