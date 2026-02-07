import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MasterProductStatus, ProductAvailability } from '@prisma/client';

export class TenantPricingDto {
  @ApiPropertyOptional({
    description: 'Agreed fixed price for the tenant',
    example: '899.99',
  })
  agreedPrice?: string | null;

  @ApiPropertyOptional({
    description: 'Discount percentage off list price',
    example: '10.00',
  })
  discountPercent?: string | null;

  @ApiPropertyOptional({
    description: 'Minimum quantity per order',
    example: 1,
  })
  minQuantity?: number | null;

  @ApiPropertyOptional({
    description: 'Maximum quantity per order',
    example: 100,
  })
  maxQuantity?: number | null;

  @ApiPropertyOptional({
    description: 'Pricing validity start date',
    example: '2026-01-01',
  })
  validFrom?: Date | null;

  @ApiPropertyOptional({
    description: 'Pricing validity end date',
    example: '2026-12-31',
  })
  validUntil?: Date | null;
}

export class ProductCategoryDto {
  @ApiProperty({ description: 'Category ID', example: 'clh123' })
  id!: string;

  @ApiProperty({ description: 'Category name', example: 'Electronics' })
  name!: string;

  @ApiProperty({ description: 'Category slug', example: 'electronics' })
  slug!: string;
}

export class TenantProductResponseDto {
  @ApiProperty({
    description: 'Product ID (master product ID)',
    example: 'clh1234567890',
  })
  id!: string;

  @ApiProperty({
    description: 'Unique product SKU',
    example: 'PROD-001',
  })
  sku!: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Enterprise Software License',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Product description',
  })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Product category (legacy text field)',
  })
  category?: string | null;

  @ApiPropertyOptional({
    description: 'Product subcategory',
  })
  subcategory?: string | null;

  @ApiPropertyOptional({
    description: 'Brand name',
  })
  brand?: string | null;

  @ApiProperty({
    description: 'Unit of measure',
    example: 'EA',
  })
  uom!: string;

  @ApiProperty({
    description: 'List price (base price)',
    example: '999.99',
  })
  listPrice!: string;

  @ApiProperty({
    description: 'Effective price for tenant (after discounts/agreed price)',
    example: '899.99',
  })
  effectivePrice!: string;

  @ApiPropertyOptional({
    description: 'Discounted price after applying promotions/tier discounts',
    example: '849.99',
  })
  discountedPrice?: string | null;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  currency!: string;

  @ApiProperty({
    description: 'Product status',
    enum: MasterProductStatus,
  })
  status!: MasterProductStatus;

  @ApiProperty({
    description: 'Product availability status',
    enum: ProductAvailability,
  })
  availability!: ProductAvailability;

  @ApiPropertyOptional({
    description: 'Primary product image URL',
  })
  primaryImage?: string | null;

  @ApiPropertyOptional({
    description: 'Additional product images',
    type: [String],
  })
  images?: string[];

  @ApiPropertyOptional({
    description: 'Category entity (hierarchical)',
    type: ProductCategoryDto,
  })
  categoryEntity?: ProductCategoryDto | null;

  @ApiPropertyOptional({
    description: 'Tenant-specific pricing details',
    type: TenantPricingDto,
  })
  tenantPricing?: TenantPricingDto | null;

  @ApiProperty({
    description: 'Whether tenant has access to this product',
    example: true,
  })
  hasAccess!: boolean;
}

export class TenantProductListResponseDto {
  @ApiProperty({
    description: 'List of products',
    type: [TenantProductResponseDto],
  })
  data!: TenantProductResponseDto[];

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}

export class RelatedProductDto {
  @ApiProperty({ description: 'Product ID', example: 'clh123' })
  id!: string;

  @ApiProperty({ description: 'Product SKU', example: 'PROD-002' })
  sku!: string;

  @ApiProperty({ description: 'Product name', example: 'Related Product' })
  name!: string;

  @ApiPropertyOptional({ description: 'Product description' })
  description?: string | null;

  @ApiProperty({ description: 'List price', example: '199.99' })
  listPrice!: string;

  @ApiPropertyOptional({ description: 'Effective price for tenant', example: '179.99' })
  effectivePrice?: string;

  @ApiPropertyOptional({ description: 'Primary image URL' })
  primaryImage?: string | null;

  @ApiProperty({ description: 'Product availability', enum: ProductAvailability })
  availability!: ProductAvailability;
}

export class RelatedProductsResponseDto {
  @ApiProperty({
    description: 'Related products',
    type: [RelatedProductDto],
  })
  data!: RelatedProductDto[];

  @ApiProperty({ description: 'Relation type', example: 'same_category' })
  relationType!: string;
}
