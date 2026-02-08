import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
} from '@nestjs/swagger';
import { MasterProductStatus } from '@prisma/client';
import { CanManage, CanRead } from '@core/authorization';
import { MasterCatalogService } from './master-catalog.service';
import {
  CreateMasterProductDto,
  UpdateMasterProductDto,
  MasterProductListQueryDto,
  MasterProductResponseDto,
  MasterProductListResponseDto,
} from './dto';

@ApiTags('Master Catalog')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('master-catalog/products')
export class MasterCatalogController {
  constructor(private readonly masterCatalogService: MasterCatalogService) {}

  @Post()
  @CanManage('MasterProduct')
  @ApiOperation({ summary: 'Create a master product (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: MasterProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 409, description: 'SKU already exists' })
  async create(@Body() dto: CreateMasterProductDto): Promise<MasterProductResponseDto> {
    const product = await this.masterCatalogService.create(dto);
    return this.toResponseDto(product);
  }

  @Get()
  @CanRead('MasterProduct')
  @ApiOperation({ summary: 'List all master products' })
  @ApiResponse({
    status: 200,
    description: 'List of master products',
    type: MasterProductListResponseDto,
  })
  async findAll(@Query() query: MasterProductListQueryDto): Promise<MasterProductListResponseDto> {
    const result = await this.masterCatalogService.findAll(query);
    return {
      ...result,
      data: result.data.map((p) => this.toResponseDto(p)),
    };
  }

  @Get('categories')
  @CanRead('MasterProduct')
  @ApiOperation({ summary: 'Get all product categories' })
  @ApiResponse({
    status: 200,
    description: 'List of categories',
    type: [String],
  })
  async getCategories(): Promise<string[]> {
    return this.masterCatalogService.getCategories();
  }

  @Get('brands')
  @CanRead('MasterProduct')
  @ApiOperation({ summary: 'Get all product brands' })
  @ApiResponse({
    status: 200,
    description: 'List of brands',
    type: [String],
  })
  async getBrands(): Promise<string[]> {
    return this.masterCatalogService.getBrands();
  }

  @Get(':id')
  @CanRead('MasterProduct')
  @ApiOperation({ summary: 'Get a master product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    type: MasterProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string): Promise<MasterProductResponseDto> {
    const product = await this.masterCatalogService.findOne(id);
    return this.toResponseDto(product);
  }

  @Get('sku/:sku')
  @CanRead('MasterProduct')
  @ApiOperation({ summary: 'Get a master product by SKU' })
  @ApiParam({ name: 'sku', description: 'Product SKU' })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    type: MasterProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findBySku(@Param('sku') sku: string): Promise<MasterProductResponseDto> {
    const product = await this.masterCatalogService.findBySku(sku);
    return this.toResponseDto(product);
  }

  @Patch(':id')
  @CanManage('MasterProduct')
  @ApiOperation({ summary: 'Update a master product (Admin only)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: MasterProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'SKU already exists' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMasterProductDto,
  ): Promise<MasterProductResponseDto> {
    const product = await this.masterCatalogService.update(id, dto);
    return this.toResponseDto(product);
  }

  @Patch(':id/status')
  @CanManage('MasterProduct')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update product status (Admin only)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
    type: MasterProductResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: MasterProductStatus,
  ): Promise<MasterProductResponseDto> {
    const product = await this.masterCatalogService.updateStatus(id, status);
    return this.toResponseDto(product);
  }

  @Delete(':id')
  @CanManage('MasterProduct')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a master product (Admin only)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 204, description: 'Product deleted or archived' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.masterCatalogService.remove(id);
  }

  private toResponseDto(product: {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    category: string | null;
    subcategory: string | null;
    brand: string | null;
    manufacturer: string | null;
    uom: string;
    listPrice: { toString(): string };
    currency: string;
    status: MasterProductStatus;
    attributes: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): MasterProductResponseDto {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      subcategory: product.subcategory,
      brand: product.brand,
      manufacturer: product.manufacturer,
      uom: product.uom,
      listPrice: product.listPrice.toString(),
      currency: product.currency,
      status: product.status,
      attributes: product.attributes as Record<string, unknown>,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
