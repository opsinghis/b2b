import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';
import { CanRead, CanManage, CanCreate, CanDelete } from '@core/authorization';
import { CurrentTenantId } from '@core/tenants';
import { TenantCatalogService } from './tenant-catalog.service';
import { CategoriesService } from './categories.service';
import {
  TenantProductQueryDto,
  TenantProductResponseDto,
  TenantProductListResponseDto,
  GrantAccessDto,
  SetPricingDto,
  SearchSuggestionsQueryDto,
  SearchSuggestionsResponseDto,
  RelatedProductsResponseDto,
  CategoryResponseDto,
  CategoryTreeResponseDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto';

@ApiTags('Tenant Catalog')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('catalog')
export class TenantCatalogController {
  constructor(
    private readonly tenantCatalogService: TenantCatalogService,
    private readonly categoriesService: CategoriesService,
  ) {}

  // ==========================================
  // Category Endpoints
  // ==========================================

  @Get('categories')
  @CanRead('MasterProduct')
  @ApiOperation({
    summary: 'Get category tree',
    description: 'Returns all categories as a hierarchical tree structure',
  })
  @ApiResponse({
    status: 200,
    description: 'Category tree',
    type: CategoryTreeResponseDto,
  })
  async getCategoryTree(): Promise<CategoryTreeResponseDto> {
    return this.categoriesService.getCategoryTree();
  }

  @Get('categories/:id')
  @CanRead('MasterProduct')
  @ApiOperation({
    summary: 'Get a single category',
    description: 'Returns a category with its children',
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category found',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategory(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findOne(id);
  }

  @Get('categories/slug/:slug')
  @CanRead('MasterProduct')
  @ApiOperation({
    summary: 'Get a category by slug',
    description: 'Returns a category by its URL-friendly slug',
  })
  @ApiParam({ name: 'slug', description: 'Category slug' })
  @ApiResponse({
    status: 200,
    description: 'Category found',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategoryBySlug(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findBySlug(slug);
  }

  // ==========================================
  // Product Endpoints
  // ==========================================

  @Get('products')
  @CanRead('MasterProduct')
  @ApiOperation({
    summary: 'List products available to the tenant',
    description:
      'Returns products the tenant has access to with tenant-specific pricing. Supports filters for category, price range, and availability.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of products',
    type: TenantProductListResponseDto,
  })
  async findAll(
    @CurrentTenantId() tenantId: string,
    @Query() query: TenantProductQueryDto,
  ): Promise<TenantProductListResponseDto> {
    return this.tenantCatalogService.findAll(tenantId, query);
  }

  @Get('products/:id')
  @CanRead('MasterProduct')
  @ApiOperation({
    summary: 'Get a product with tenant-specific pricing',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    type: TenantProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<TenantProductResponseDto> {
    return this.tenantCatalogService.findOne(id, tenantId);
  }

  @Get('products/:id/related')
  @CanRead('MasterProduct')
  @ApiOperation({
    summary: 'Get related products',
    description: 'Returns products related by category or brand',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum related products', example: 8 })
  @ApiResponse({
    status: 200,
    description: 'Related products',
    type: RelatedProductsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getRelatedProducts(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ): Promise<RelatedProductsResponseDto> {
    return this.tenantCatalogService.getRelatedProducts(id, tenantId, limit);
  }

  @Get('products/sku/:sku')
  @CanRead('MasterProduct')
  @ApiOperation({
    summary: 'Get a product by SKU with tenant-specific pricing',
  })
  @ApiParam({ name: 'sku', description: 'Product SKU' })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    type: TenantProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findBySku(
    @CurrentTenantId() tenantId: string,
    @Param('sku') sku: string,
  ): Promise<TenantProductResponseDto> {
    return this.tenantCatalogService.findBySku(sku, tenantId);
  }

  // ==========================================
  // Search Endpoints
  // ==========================================

  @Get('search/suggestions')
  @CanRead('MasterProduct')
  @ApiOperation({
    summary: 'Get search suggestions for autocomplete',
    description: 'Returns product, category, and brand suggestions based on query',
  })
  @ApiResponse({
    status: 200,
    description: 'Search suggestions',
    type: SearchSuggestionsResponseDto,
  })
  async getSearchSuggestions(
    @CurrentTenantId() tenantId: string,
    @Query() query: SearchSuggestionsQueryDto,
  ): Promise<SearchSuggestionsResponseDto> {
    return this.tenantCatalogService.getSearchSuggestions(tenantId, query);
  }

  // ==========================================
  // Admin Endpoints
  // ==========================================

  @Post('products/:id/access')
  @CanManage('MasterProduct')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Grant or update access to a product (Admin only)',
    description: 'Grant or revoke tenant access to a master catalog product',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Access updated',
    type: TenantProductResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async grantAccess(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: GrantAccessDto,
  ): Promise<TenantProductResponseDto> {
    return this.tenantCatalogService.grantAccess(id, tenantId, dto);
  }

  @Put('products/:id/pricing')
  @CanManage('MasterProduct')
  @ApiOperation({
    summary: 'Update pricing for a product (Admin only)',
    description: 'Set tenant-specific pricing. Must have access to the product first.',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Pricing updated',
    type: TenantProductResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden or no access' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async setPricing(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SetPricingDto,
  ): Promise<TenantProductResponseDto> {
    return this.tenantCatalogService.setPricing(id, tenantId, dto);
  }
}

// Admin controller for category management
@ApiTags('Admin - Categories')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('admin/catalog/categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @CanManage('MasterProduct')
  @ApiOperation({
    summary: 'Get all categories including inactive (Admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Category tree including inactive',
    type: CategoryTreeResponseDto,
  })
  async getCategoryTree(): Promise<CategoryTreeResponseDto> {
    return this.categoriesService.getCategoryTree(true);
  }

  @Post()
  @CanCreate('MasterProduct')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new category (Admin)',
  })
  @ApiResponse({
    status: 201,
    description: 'Category created',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async createCategory(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.create(dto);
  }

  @Put(':id')
  @CanManage('MasterProduct')
  @ApiOperation({
    summary: 'Update a category (Admin)',
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category updated',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Slug already exists or circular reference' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @CanDelete('MasterProduct')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a category (Admin)',
    description: 'Soft deletes a category by marking it inactive',
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 204, description: 'Category deleted' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category has subcategories' })
  async deleteCategory(@Param('id') id: string): Promise<void> {
    return this.categoriesService.delete(id);
  }
}
