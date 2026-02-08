import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { MasterProduct, Prisma, MasterProductStatus } from '@prisma/client';
import {
  CreateMasterProductDto,
  UpdateMasterProductDto,
  MasterProductListQueryDto,
  ImportProductDto,
  ImportStatisticsDto,
} from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class MasterCatalogService {
  private readonly logger = new Logger(MasterCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMasterProductDto): Promise<MasterProduct> {
    // Check for existing SKU
    const existingProduct = await this.prisma.masterProduct.findUnique({
      where: { sku: dto.sku },
    });

    if (existingProduct) {
      throw new ConflictException(`Product with SKU '${dto.sku}' already exists`);
    }

    const product = await this.prisma.masterProduct.create({
      data: {
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        subcategory: dto.subcategory,
        brand: dto.brand,
        manufacturer: dto.manufacturer,
        uom: dto.uom || 'EA',
        listPrice: new Prisma.Decimal(dto.listPrice),
        currency: dto.currency || 'USD',
        status: dto.status || MasterProductStatus.ACTIVE,
        attributes: (dto.attributes || {}) as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Master product created: ${product.sku} (${product.id})`);

    return product;
  }

  async findAll(query: MasterProductListQueryDto): Promise<PaginatedResult<MasterProduct>> {
    const { search, category, subcategory, brand, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MasterProductWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category }),
      ...(subcategory && { subcategory }),
      ...(brand && { brand }),
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.masterProduct.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.masterProduct.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<MasterProduct> {
    const product = await this.prisma.masterProduct.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Master product with ID '${id}' not found`);
    }

    return product;
  }

  async findBySku(sku: string): Promise<MasterProduct> {
    const product = await this.prisma.masterProduct.findUnique({
      where: { sku },
    });

    if (!product) {
      throw new NotFoundException(`Master product with SKU '${sku}' not found`);
    }

    return product;
  }

  async update(id: string, dto: UpdateMasterProductDto): Promise<MasterProduct> {
    // Verify product exists
    const existingProduct = await this.findOne(id);

    // If SKU is being changed, check for conflicts
    if (dto.sku && dto.sku !== existingProduct.sku) {
      const conflictingProduct = await this.prisma.masterProduct.findUnique({
        where: { sku: dto.sku },
      });

      if (conflictingProduct) {
        throw new ConflictException(`Product with SKU '${dto.sku}' already exists`);
      }
    }

    const updateData: Prisma.MasterProductUpdateInput = {
      ...(dto.sku !== undefined && { sku: dto.sku }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.subcategory !== undefined && { subcategory: dto.subcategory }),
      ...(dto.brand !== undefined && { brand: dto.brand }),
      ...(dto.manufacturer !== undefined && { manufacturer: dto.manufacturer }),
      ...(dto.uom !== undefined && { uom: dto.uom }),
      ...(dto.listPrice !== undefined && { listPrice: new Prisma.Decimal(dto.listPrice) }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.attributes !== undefined && { attributes: dto.attributes as Prisma.InputJsonValue }),
    };

    const product = await this.prisma.masterProduct.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Master product updated: ${product.sku} (${product.id})`);

    return product;
  }

  async remove(id: string): Promise<void> {
    // Verify product exists
    const product = await this.findOne(id);

    // Check if product is referenced by any quote line items
    const lineItemCount = await this.prisma.quoteLineItem.count({
      where: { masterProductId: id },
    });

    if (lineItemCount > 0) {
      // If referenced, set to ARCHIVED instead of deleting
      await this.prisma.masterProduct.update({
        where: { id },
        data: { status: MasterProductStatus.ARCHIVED },
      });

      this.logger.log(
        `Master product archived (referenced by ${lineItemCount} line items): ${product.sku} (${product.id})`,
      );
    } else {
      // Safe to delete
      await this.prisma.masterProduct.delete({
        where: { id },
      });

      this.logger.log(`Master product deleted: ${product.sku} (${product.id})`);
    }
  }

  async getCategories(): Promise<string[]> {
    const results = await this.prisma.masterProduct.groupBy({
      by: ['category'],
      where: { category: { not: null } },
      orderBy: { category: 'asc' },
    });

    return results.map((r) => r.category).filter((c): c is string => c !== null);
  }

  async getBrands(): Promise<string[]> {
    const results = await this.prisma.masterProduct.groupBy({
      by: ['brand'],
      where: { brand: { not: null } },
      orderBy: { brand: 'asc' },
    });

    return results.map((r) => r.brand).filter((b): b is string => b !== null);
  }

  async updateStatus(id: string, status: MasterProductStatus): Promise<MasterProduct> {
    // Verify product exists
    await this.findOne(id);

    const product = await this.prisma.masterProduct.update({
      where: { id },
      data: { status },
    });

    this.logger.log(`Master product status updated: ${product.sku} to ${status}`);

    return product;
  }

  /**
   * Import products from JSON data with batch processing and idempotency
   * @param products Array of product data to import
   * @param batchSize Number of products per transaction (default 500)
   */
  async importProducts(
    products: ImportProductDto[],
    batchSize = 500,
  ): Promise<ImportStatisticsDto> {
    const startTime = Date.now();
    const errors: Array<{ sku: string; error: string }> = [];
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    // Validate products before import
    const validProducts: ImportProductDto[] = [];
    for (const product of products) {
      const validation = this.validateImportProduct(product);
      if (validation.valid) {
        validProducts.push(product);
      } else {
        errors.push({ sku: product.sku || 'unknown', error: validation.error! });
        failed++;
      }
    }

    // Process in batches
    for (let i = 0; i < validProducts.length; i += batchSize) {
      const batch = validProducts.slice(i, i + batchSize);
      const batchResult = await this.processBatch(batch);
      imported += batchResult.imported;
      skipped += batchResult.skipped;
    }

    const durationMs = Date.now() - startTime;

    this.logger.log(
      `Import completed: ${imported} imported, ${skipped} skipped, ${failed} failed in ${durationMs}ms`,
    );

    return {
      total: products.length,
      imported,
      skipped,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      durationMs,
    };
  }

  /**
   * Process a batch of products in a single transaction
   */
  private async processBatch(
    products: ImportProductDto[],
  ): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    // Get existing SKUs to check for duplicates
    const skus = products.map((p) => p.sku);
    const existingProducts = await this.prisma.masterProduct.findMany({
      where: { sku: { in: skus } },
      select: { sku: true },
    });
    const existingSkus = new Set(existingProducts.map((p) => p.sku));

    // Filter out duplicates
    const newProducts = products.filter((p) => !existingSkus.has(p.sku));
    skipped = products.length - newProducts.length;

    if (newProducts.length > 0) {
      // Use createMany for efficient bulk insert
      const result = await this.prisma.masterProduct.createMany({
        data: newProducts.map((product) => ({
          sku: product.sku,
          name: product.name,
          description: product.description,
          category: product.category,
          subcategory: product.subcategory,
          brand: product.brand,
          manufacturer: product.manufacturer,
          uom: product.uom || 'EA',
          listPrice: new Prisma.Decimal(product.listPrice),
          currency: product.currency || 'USD',
          status: product.status || MasterProductStatus.ACTIVE,
          attributes: (product.attributes || {}) as Prisma.InputJsonValue,
        })),
        skipDuplicates: true, // Extra safety for race conditions
      });
      imported = result.count;
    }

    return { imported, skipped };
  }

  /**
   * Validate a product for import
   */
  private validateImportProduct(product: ImportProductDto): { valid: boolean; error?: string } {
    if (!product.sku || typeof product.sku !== 'string') {
      return { valid: false, error: 'SKU is required and must be a string' };
    }
    if (product.sku.length > 100) {
      return { valid: false, error: 'SKU must be 100 characters or less' };
    }
    if (!product.name || typeof product.name !== 'string') {
      return { valid: false, error: 'Name is required and must be a string' };
    }
    if (product.name.length > 255) {
      return { valid: false, error: 'Name must be 255 characters or less' };
    }
    if (product.listPrice === undefined || product.listPrice === null) {
      return { valid: false, error: 'List price is required' };
    }
    if (typeof product.listPrice !== 'number' || isNaN(product.listPrice)) {
      return { valid: false, error: 'List price must be a valid number' };
    }
    if (product.listPrice < 0) {
      return { valid: false, error: 'List price cannot be negative' };
    }
    return { valid: true };
  }

  /**
   * Parse and import from JSON file content
   */
  async importFromJson(fileContent: Buffer): Promise<ImportStatisticsDto> {
    let products: ImportProductDto[];

    try {
      const jsonString = fileContent.toString('utf-8');
      const parsed = JSON.parse(jsonString);

      // Support both array and { products: [...] } format
      if (Array.isArray(parsed)) {
        products = parsed;
      } else if (parsed.products && Array.isArray(parsed.products)) {
        products = parsed.products;
      } else {
        throw new Error('Invalid JSON format: expected array or { products: [...] }');
      }
    } catch (error) {
      throw new Error(
        `Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return this.importProducts(products);
  }
}
