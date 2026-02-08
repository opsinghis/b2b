import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import {
  MasterProduct,
  TenantProductAccess,
  Prisma,
  MasterProductStatus,
  Category,
} from '@prisma/client';
import {
  TenantProductQueryDto,
  TenantProductResponseDto,
  GrantAccessDto,
  SetPricingDto,
  SearchSuggestionsQueryDto,
  SearchSuggestionsResponseDto,
  SearchSuggestionDto,
  RelatedProductDto,
  RelatedProductsResponseDto,
} from './dto';
import { CategoriesService } from './categories.service';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type MasterProductWithAccess = MasterProduct & {
  tenantAccess?: TenantProductAccess[];
  categoryEntity?: Category | null;
};

@Injectable()
export class TenantCatalogService {
  private readonly logger = new Logger(TenantCatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  /**
   * Get paginated catalog for a tenant
   * By default, only shows products the tenant has access to
   */
  async findAll(
    tenantId: string,
    query: TenantProductQueryDto,
  ): Promise<PaginatedResult<TenantProductResponseDto>> {
    const {
      search,
      category,
      categoryId,
      subcategory,
      brand,
      status,
      availability,
      minPrice,
      maxPrice,
      accessOnly = true,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    // If categoryId is provided, get all descendant category IDs
    let categoryIds: string[] | undefined;
    if (categoryId) {
      categoryIds = await this.categoriesService.getCategoryIdsWithDescendants(categoryId);
    }

    // Build where clause for master products
    const where: Prisma.MasterProductWhereInput = {
      status: status || MasterProductStatus.ACTIVE,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category }),
      ...(categoryIds && { categoryId: { in: categoryIds } }),
      ...(subcategory && { subcategory }),
      ...(brand && { brand }),
      ...(availability && { availability }),
      ...(minPrice !== undefined && {
        listPrice: { gte: new Prisma.Decimal(minPrice) },
      }),
      ...(maxPrice !== undefined && {
        listPrice: { ...(minPrice !== undefined ? {} : {}), lte: new Prisma.Decimal(maxPrice) },
      }),
      ...(accessOnly && {
        tenantAccess: {
          some: {
            tenantId,
            isActive: true,
          },
        },
      }),
    };

    // Handle combined min/max price filter
    if (minPrice !== undefined && maxPrice !== undefined) {
      where.listPrice = {
        gte: new Prisma.Decimal(minPrice),
        lte: new Prisma.Decimal(maxPrice),
      };
    }

    const [products, total] = await Promise.all([
      this.prisma.masterProduct.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: {
          tenantAccess: {
            where: { tenantId },
          },
          categoryEntity: true,
        },
      }),
      this.prisma.masterProduct.count({ where }),
    ]);

    const data = products.map((product) =>
      this.toTenantProductResponse(product as MasterProductWithAccess, tenantId),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single product with tenant-specific pricing
   */
  async findOne(productId: string, tenantId: string): Promise<TenantProductResponseDto> {
    const product = await this.prisma.masterProduct.findUnique({
      where: { id: productId },
      include: {
        tenantAccess: {
          where: { tenantId },
        },
        categoryEntity: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    return this.toTenantProductResponse(product as MasterProductWithAccess, tenantId);
  }

  /**
   * Get a product by SKU with tenant-specific pricing
   */
  async findBySku(sku: string, tenantId: string): Promise<TenantProductResponseDto> {
    const product = await this.prisma.masterProduct.findUnique({
      where: { sku },
      include: {
        tenantAccess: {
          where: { tenantId },
        },
        categoryEntity: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with SKU '${sku}' not found`);
    }

    return this.toTenantProductResponse(product as MasterProductWithAccess, tenantId);
  }

  /**
   * Get related products (same category, brand, etc.)
   */
  async getRelatedProducts(
    productId: string,
    tenantId: string,
    limit = 8,
  ): Promise<RelatedProductsResponseDto> {
    const product = await this.prisma.masterProduct.findUnique({
      where: { id: productId },
      include: {
        tenantAccess: {
          where: { tenantId },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    // Find related products by category or brand
    const relatedProducts = await this.prisma.masterProduct.findMany({
      where: {
        id: { not: productId },
        status: MasterProductStatus.ACTIVE,
        OR: [
          ...(product.categoryId ? [{ categoryId: product.categoryId }] : []),
          ...(product.category ? [{ category: product.category }] : []),
          ...(product.brand ? [{ brand: product.brand }] : []),
        ],
        tenantAccess: {
          some: {
            tenantId,
            isActive: true,
          },
        },
      },
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        tenantAccess: {
          where: { tenantId },
        },
      },
    });

    const data: RelatedProductDto[] = relatedProducts.map((p) => {
      const access = p.tenantAccess?.find((a) => a.tenantId === tenantId);
      const effectivePrice = this.calculateEffectivePrice(p.listPrice, access);

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        listPrice: p.listPrice.toString(),
        effectivePrice: effectivePrice.toString(),
        primaryImage: p.primaryImage,
        availability: p.availability,
      };
    });

    return {
      data,
      relationType: product.categoryId ? 'same_category' : 'same_brand',
    };
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSearchSuggestions(
    tenantId: string,
    query: SearchSuggestionsQueryDto,
  ): Promise<SearchSuggestionsResponseDto> {
    const { q, limit = 10 } = query;

    if (!q || q.length < 2) {
      return { suggestions: [] };
    }

    const suggestions: SearchSuggestionDto[] = [];

    // Get product suggestions
    const products = await this.prisma.masterProduct.findMany({
      where: {
        status: MasterProductStatus.ACTIVE,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
        ],
        tenantAccess: {
          some: {
            tenantId,
            isActive: true,
          },
        },
      },
      take: Math.ceil(limit / 2),
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    for (const product of products) {
      suggestions.push({
        type: 'product',
        text: product.name,
        id: product.id,
      });
    }

    // Get category suggestions
    const categories = await this.prisma.category.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
      },
      take: Math.ceil(limit / 4),
      select: { id: true, name: true, _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });

    for (const category of categories) {
      suggestions.push({
        type: 'category',
        text: category.name,
        id: category.id,
        count: category._count.products,
      });
    }

    // Get brand suggestions - using distinct query instead of groupBy due to Prisma limitations
    const brandProducts = await this.prisma.masterProduct.findMany({
      where: {
        status: MasterProductStatus.ACTIVE,
        brand: { contains: q, mode: 'insensitive' },
        tenantAccess: {
          some: {
            tenantId,
            isActive: true,
          },
        },
      },
      select: { brand: true },
      distinct: ['brand'],
      take: Math.ceil(limit / 4),
    });

    for (const product of brandProducts) {
      if (product.brand) {
        suggestions.push({
          type: 'brand',
          text: product.brand,
        });
      }
    }

    return {
      suggestions: suggestions.slice(0, limit),
    };
  }

  /**
   * Grant or update access for a tenant to a product
   */
  async grantAccess(
    productId: string,
    tenantId: string,
    dto: GrantAccessDto,
  ): Promise<TenantProductResponseDto> {
    // Verify product exists
    const product = await this.prisma.masterProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    // Upsert the access record
    await this.prisma.tenantProductAccess.upsert({
      where: {
        tenantId_masterProductId: {
          tenantId,
          masterProductId: productId,
        },
      },
      create: {
        tenantId,
        masterProductId: productId,
        isActive: dto.isActive,
        agreedPrice: dto.agreedPrice ? new Prisma.Decimal(dto.agreedPrice) : null,
        discountPercent: dto.discountPercent ? new Prisma.Decimal(dto.discountPercent) : null,
        minQuantity: dto.minQuantity || null,
        maxQuantity: dto.maxQuantity || null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
      update: {
        isActive: dto.isActive,
        agreedPrice: dto.agreedPrice ? new Prisma.Decimal(dto.agreedPrice) : null,
        discountPercent: dto.discountPercent ? new Prisma.Decimal(dto.discountPercent) : null,
        minQuantity: dto.minQuantity || null,
        maxQuantity: dto.maxQuantity || null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });

    this.logger.log(
      `Access ${dto.isActive ? 'granted' : 'revoked'} for tenant ${tenantId} to product ${productId}`,
    );

    return this.findOne(productId, tenantId);
  }

  /**
   * Update pricing for a tenant's product access
   */
  async setPricing(
    productId: string,
    tenantId: string,
    dto: SetPricingDto,
  ): Promise<TenantProductResponseDto> {
    // Verify product exists
    const product = await this.prisma.masterProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    // Check if tenant has access
    const access = await this.prisma.tenantProductAccess.findUnique({
      where: {
        tenantId_masterProductId: {
          tenantId,
          masterProductId: productId,
        },
      },
    });

    if (!access) {
      throw new ForbiddenException(
        `Tenant does not have access to product '${productId}'. Grant access first.`,
      );
    }

    // Update pricing
    await this.prisma.tenantProductAccess.update({
      where: {
        tenantId_masterProductId: {
          tenantId,
          masterProductId: productId,
        },
      },
      data: {
        ...(dto.agreedPrice !== undefined && {
          agreedPrice: dto.agreedPrice !== null ? new Prisma.Decimal(dto.agreedPrice) : null,
        }),
        ...(dto.discountPercent !== undefined && {
          discountPercent:
            dto.discountPercent !== null ? new Prisma.Decimal(dto.discountPercent) : null,
        }),
        ...(dto.minQuantity !== undefined && { minQuantity: dto.minQuantity }),
        ...(dto.maxQuantity !== undefined && { maxQuantity: dto.maxQuantity }),
        ...(dto.validFrom !== undefined && {
          validFrom: dto.validFrom !== null ? new Date(dto.validFrom) : null,
        }),
        ...(dto.validUntil !== undefined && {
          validUntil: dto.validUntil !== null ? new Date(dto.validUntil) : null,
        }),
      },
    });

    this.logger.log(`Pricing updated for tenant ${tenantId} on product ${productId}`);

    return this.findOne(productId, tenantId);
  }

  /**
   * Check if a tenant has access to a product
   */
  async hasAccess(productId: string, tenantId: string): Promise<boolean> {
    const access = await this.prisma.tenantProductAccess.findUnique({
      where: {
        tenantId_masterProductId: {
          tenantId,
          masterProductId: productId,
        },
      },
    });

    if (!access || !access.isActive) {
      return false;
    }

    // Check validity period
    const now = new Date();
    if (access.validFrom && access.validFrom > now) {
      return false;
    }
    if (access.validUntil && access.validUntil < now) {
      return false;
    }

    return true;
  }

  /**
   * Calculate effective price for a tenant
   * Priority: agreedPrice > discountPercent > listPrice
   */
  calculateEffectivePrice(
    listPrice: Prisma.Decimal,
    access?: TenantProductAccess | null,
  ): Prisma.Decimal {
    if (!access || !access.isActive) {
      return listPrice;
    }

    // Check validity period
    const now = new Date();
    if (access.validFrom && access.validFrom > now) {
      return listPrice;
    }
    if (access.validUntil && access.validUntil < now) {
      return listPrice;
    }

    // Priority 1: Agreed price
    if (access.agreedPrice) {
      return access.agreedPrice;
    }

    // Priority 2: Discount percentage
    if (access.discountPercent) {
      const discount = listPrice.mul(access.discountPercent).div(100);
      return listPrice.sub(discount);
    }

    // Default: List price
    return listPrice;
  }

  /**
   * Convert master product with access to tenant product response
   */
  private toTenantProductResponse(
    product: MasterProductWithAccess,
    tenantId: string,
  ): TenantProductResponseDto {
    const access = product.tenantAccess?.find((a) => a.tenantId === tenantId);
    const effectivePrice = this.calculateEffectivePrice(product.listPrice, access);
    const hasAccess = this.checkAccess(access);

    // Parse images from JSON
    let images: string[] = [];
    try {
      if (product.images) {
        const parsed = product.images as unknown;
        if (Array.isArray(parsed)) {
          images = parsed as string[];
        }
      }
    } catch {
      images = [];
    }

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      subcategory: product.subcategory,
      brand: product.brand,
      uom: product.uom,
      listPrice: product.listPrice.toString(),
      effectivePrice: effectivePrice.toString(),
      discountedPrice: null, // Will be calculated with promotions/tier discounts
      currency: product.currency,
      status: product.status,
      availability: product.availability,
      primaryImage: product.primaryImage,
      images,
      categoryEntity: product.categoryEntity
        ? {
            id: product.categoryEntity.id,
            name: product.categoryEntity.name,
            slug: product.categoryEntity.slug,
          }
        : null,
      hasAccess,
      tenantPricing: access
        ? {
            agreedPrice: access.agreedPrice?.toString() ?? null,
            discountPercent: access.discountPercent?.toString() ?? null,
            minQuantity: access.minQuantity,
            maxQuantity: access.maxQuantity,
            validFrom: access.validFrom,
            validUntil: access.validUntil,
          }
        : null,
    };
  }

  private checkAccess(access?: TenantProductAccess | null): boolean {
    if (!access || !access.isActive) {
      return false;
    }

    const now = new Date();
    if (access.validFrom && access.validFrom > now) {
      return false;
    }
    if (access.validUntil && access.validUntil < now) {
      return false;
    }

    return true;
  }
}
