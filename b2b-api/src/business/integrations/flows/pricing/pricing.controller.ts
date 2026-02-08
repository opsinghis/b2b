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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@core/auth/guards/jwt-auth.guard';
import { TenantContext } from '@core/tenants/tenant-context.decorator';
import { PricingService, CurrencyService, PricingSyncService, PriceOverrideService } from './services';
import {
  CreatePriceListDto,
  UpdatePriceListDto,
  CreatePriceListItemDto,
  UpdatePriceListItemDto,
  BulkUpsertPriceListItemsDto,
  CreateCustomerAssignmentDto,
  CreatePriceOverrideDto,
  UpdatePriceOverrideDto,
  CreateExchangeRateDto,
  ConvertCurrencyDto,
  CalculatePriceDto,
  CalculatePricesDto,
  ImportPriceListDto,
  StartSyncJobDto,
  PriceListQueryDto,
  PriceListItemQueryDto,
  PriceOverrideQueryDto,
} from './dto';

@ApiTags('Pricing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pricing')
export class PricingController {
  constructor(
    private readonly pricingService: PricingService,
    private readonly currencyService: CurrencyService,
    private readonly syncService: PricingSyncService,
    private readonly overrideService: PriceOverrideService,
  ) {}

  // ============================================
  // Price Lists
  // ============================================

  @Post('price-lists')
  @ApiOperation({ summary: 'Create a price list' })
  @ApiResponse({ status: 201, description: 'Price list created' })
  async createPriceList(
    @TenantContext('tenantId') tenantId: string,
    @Body() dto: CreatePriceListDto,
  ) {
    return this.pricingService.createPriceList(tenantId, dto as any);
  }

  @Get('price-lists')
  @ApiOperation({ summary: 'Query price lists' })
  @ApiResponse({ status: 200, description: 'List of price lists' })
  async queryPriceLists(
    @TenantContext('tenantId') tenantId: string,
    @Query() query: PriceListQueryDto,
  ) {
    return this.pricingService.queryPriceLists({ ...query, tenantId });
  }

  @Get('price-lists/:id')
  @ApiOperation({ summary: 'Get price list by ID' })
  @ApiParam({ name: 'id', description: 'Price list ID' })
  @ApiResponse({ status: 200, description: 'Price list details' })
  async getPriceList(
    @TenantContext('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.pricingService.getPriceListWithItems(tenantId, id);
  }

  @Put('price-lists/:id')
  @ApiOperation({ summary: 'Update a price list' })
  @ApiParam({ name: 'id', description: 'Price list ID' })
  @ApiResponse({ status: 200, description: 'Price list updated' })
  async updatePriceList(
    @TenantContext('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePriceListDto,
  ) {
    return this.pricingService.updatePriceList(tenantId, id, dto);
  }

  @Delete('price-lists/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a price list' })
  @ApiParam({ name: 'id', description: 'Price list ID' })
  @ApiResponse({ status: 204, description: 'Price list deleted' })
  async deletePriceList(
    @TenantContext('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.pricingService.deletePriceList(tenantId, id);
  }

  // ============================================
  // Price List Items
  // ============================================

  @Post('price-lists/:priceListId/items')
  @ApiOperation({ summary: 'Add item to price list' })
  @ApiParam({ name: 'priceListId', description: 'Price list ID' })
  @ApiResponse({ status: 201, description: 'Item added' })
  async addPriceListItem(
    @TenantContext('tenantId') tenantId: string,
    @Param('priceListId') priceListId: string,
    @Body() dto: CreatePriceListItemDto,
  ) {
    return this.pricingService.addPriceListItem(tenantId, priceListId, dto as any);
  }

  @Get('price-lists/:priceListId/items')
  @ApiOperation({ summary: 'Query price list items' })
  @ApiParam({ name: 'priceListId', description: 'Price list ID' })
  @ApiResponse({ status: 200, description: 'List of items' })
  async queryPriceListItems(
    @Param('priceListId') priceListId: string,
    @Query() query: PriceListItemQueryDto,
  ) {
    return this.pricingService.queryPriceListItems({ ...query, priceListId });
  }

  @Put('price-lists/:priceListId/items/:itemId')
  @ApiOperation({ summary: 'Update price list item' })
  @ApiParam({ name: 'priceListId', description: 'Price list ID' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({ status: 200, description: 'Item updated' })
  async updatePriceListItem(
    @TenantContext('tenantId') tenantId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePriceListItemDto,
  ) {
    return this.pricingService.updatePriceListItem(tenantId, itemId, dto);
  }

  @Delete('price-lists/:priceListId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete price list item' })
  @ApiParam({ name: 'priceListId', description: 'Price list ID' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({ status: 204, description: 'Item deleted' })
  async deletePriceListItem(
    @TenantContext('tenantId') tenantId: string,
    @Param('itemId') itemId: string,
  ) {
    await this.pricingService.deletePriceListItem(tenantId, itemId);
  }

  @Post('price-lists/:priceListId/items/bulk')
  @ApiOperation({ summary: 'Bulk upsert price list items' })
  @ApiParam({ name: 'priceListId', description: 'Price list ID' })
  @ApiResponse({ status: 200, description: 'Items upserted' })
  async bulkUpsertPriceListItems(
    @TenantContext('tenantId') tenantId: string,
    @Param('priceListId') priceListId: string,
    @Body() dto: BulkUpsertPriceListItemsDto,
  ) {
    return this.pricingService.bulkUpsertPriceListItems(tenantId, priceListId, dto.items as any);
  }

  // ============================================
  // Customer Assignments
  // ============================================

  @Post('assignments')
  @ApiOperation({ summary: 'Assign price list to customer/organization' })
  @ApiResponse({ status: 201, description: 'Assignment created' })
  async assignPriceList(
    @TenantContext('tenantId') tenantId: string,
    @Body() dto: CreateCustomerAssignmentDto,
  ) {
    return this.pricingService.assignPriceList(tenantId, dto as any);
  }

  @Get('assignments/customer/:customerId')
  @ApiOperation({ summary: 'Get price lists for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer price lists' })
  async getCustomerPriceLists(
    @TenantContext('tenantId') tenantId: string,
    @Param('customerId') customerId: string,
    @Query('organizationId') organizationId?: string,
    @Query('priceDate') priceDate?: Date,
  ) {
    return this.pricingService.getCustomerPriceLists(
      tenantId,
      customerId,
      organizationId,
      priceDate,
    );
  }

  @Delete('assignments/:assignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove price list assignment' })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID' })
  @ApiResponse({ status: 204, description: 'Assignment removed' })
  async removePriceListAssignment(
    @TenantContext('tenantId') tenantId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    await this.pricingService.removePriceListAssignment(tenantId, assignmentId);
  }

  // ============================================
  // Price Overrides
  // ============================================

  @Post('overrides')
  @ApiOperation({ summary: 'Create a price override' })
  @ApiResponse({ status: 201, description: 'Override created' })
  async createOverride(
    @TenantContext('tenantId') tenantId: string,
    @Body() dto: CreatePriceOverrideDto,
  ) {
    return this.overrideService.createOverride(tenantId, dto as any);
  }

  @Get('overrides')
  @ApiOperation({ summary: 'Query price overrides' })
  @ApiResponse({ status: 200, description: 'List of overrides' })
  async queryOverrides(
    @TenantContext('tenantId') tenantId: string,
    @Query() query: PriceOverrideQueryDto,
  ) {
    return this.overrideService.queryOverrides({ ...query, tenantId });
  }

  @Get('overrides/:id')
  @ApiOperation({ summary: 'Get override by ID' })
  @ApiParam({ name: 'id', description: 'Override ID' })
  @ApiResponse({ status: 200, description: 'Override details' })
  async getOverride(
    @TenantContext('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.overrideService.getOverride(tenantId, id);
  }

  @Put('overrides/:id')
  @ApiOperation({ summary: 'Update a price override' })
  @ApiParam({ name: 'id', description: 'Override ID' })
  @ApiResponse({ status: 200, description: 'Override updated' })
  async updateOverride(
    @TenantContext('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePriceOverrideDto,
  ) {
    return this.overrideService.updateOverride(tenantId, id, dto);
  }

  @Post('overrides/:id/approve')
  @ApiOperation({ summary: 'Approve a price override' })
  @ApiParam({ name: 'id', description: 'Override ID' })
  @ApiResponse({ status: 200, description: 'Override approved' })
  async approveOverride(
    @TenantContext('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body('approverId') approverId?: string,
  ) {
    return this.overrideService.approveOverride(tenantId, id, approverId ?? 'system');
  }

  @Post('overrides/:id/revoke')
  @ApiOperation({ summary: 'Revoke a price override' })
  @ApiParam({ name: 'id', description: 'Override ID' })
  @ApiResponse({ status: 200, description: 'Override revoked' })
  async revokeOverride(
    @TenantContext('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.overrideService.revokeOverride(tenantId, id, reason);
  }

  @Delete('overrides/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a price override' })
  @ApiParam({ name: 'id', description: 'Override ID' })
  @ApiResponse({ status: 204, description: 'Override deleted' })
  async deleteOverride(
    @TenantContext('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.overrideService.deleteOverride(tenantId, id);
  }

  // ============================================
  // Currency
  // ============================================

  @Post('exchange-rates')
  @ApiOperation({ summary: 'Create/update exchange rate' })
  @ApiResponse({ status: 201, description: 'Exchange rate created/updated' })
  async upsertExchangeRate(
    @TenantContext('tenantId') tenantId: string,
    @Body() dto: CreateExchangeRateDto,
  ) {
    return this.currencyService.upsertExchangeRate(tenantId, dto as any);
  }

  @Get('exchange-rates')
  @ApiOperation({ summary: 'Get active exchange rates' })
  @ApiResponse({ status: 200, description: 'List of exchange rates' })
  async getActiveRates(
    @TenantContext('tenantId') tenantId: string,
    @Query('rateType') rateType?: string,
  ) {
    return this.currencyService.getActiveRates(
      tenantId,
      rateType as 'SPOT' | 'FORWARD' | 'AVERAGE' | 'BUDGETED' | undefined,
    );
  }

  @Get('currencies')
  @ApiOperation({ summary: 'Get supported currencies' })
  @ApiResponse({ status: 200, description: 'List of currencies' })
  async getSupportedCurrencies(@TenantContext('tenantId') tenantId: string) {
    return this.currencyService.getSupportedCurrencies(tenantId);
  }

  @Post('currency/convert')
  @ApiOperation({ summary: 'Convert amount between currencies' })
  @ApiResponse({ status: 200, description: 'Converted amount' })
  async convertCurrency(
    @TenantContext('tenantId') tenantId: string,
    @Body() dto: ConvertCurrencyDto,
  ) {
    return this.currencyService.convertCurrency(
      tenantId,
      dto.amount,
      dto.sourceCurrency,
      dto.targetCurrency,
      dto.rateType,
      dto.date,
    );
  }

  @Delete('exchange-rates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete exchange rate' })
  @ApiParam({ name: 'id', description: 'Exchange rate ID' })
  @ApiResponse({ status: 204, description: 'Exchange rate deleted' })
  async deleteExchangeRate(
    @TenantContext('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.currencyService.deleteExchangeRate(tenantId, id);
  }

  // ============================================
  // Price Calculation
  // ============================================

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate price for a single SKU' })
  @ApiResponse({ status: 200, description: 'Calculated price' })
  async calculatePrice(
    @TenantContext('tenantId') tenantId: string,
    @Body() dto: CalculatePriceDto,
  ) {
    return this.pricingService.calculatePrice({ ...dto, tenantId });
  }

  @Post('calculate/batch')
  @ApiOperation({ summary: 'Calculate prices for multiple SKUs' })
  @ApiResponse({ status: 200, description: 'Calculated prices' })
  async calculatePrices(
    @TenantContext('tenantId') tenantId: string,
    @Body() dto: CalculatePricesDto,
  ) {
    return this.pricingService.calculatePrices({ ...dto, tenantId });
  }

  // ============================================
  // Sync
  // ============================================

  @Post('sync/import')
  @ApiOperation({ summary: 'Import price list from ERP data' })
  @ApiResponse({ status: 200, description: 'Import result' })
  async importPriceList(
    @TenantContext('tenantId') tenantId: string,
    @Body() dto: ImportPriceListDto,
  ) {
    return this.syncService.importPriceList(tenantId, dto);
  }

  @Post('sync/start')
  @ApiOperation({ summary: 'Start a sync job' })
  @ApiResponse({ status: 201, description: 'Sync job started' })
  async startSyncJob(
    @TenantContext('tenantId') tenantId: string,
    @Body() dto: StartSyncJobDto,
  ) {
    return this.syncService.startSyncJob({ ...dto, tenantId });
  }

  @Get('sync/jobs/:jobId')
  @ApiOperation({ summary: 'Get sync job status' })
  @ApiParam({ name: 'jobId', description: 'Sync job ID' })
  @ApiResponse({ status: 200, description: 'Sync job status' })
  async getSyncJobStatus(
    @TenantContext('tenantId') tenantId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.syncService.getSyncJobStatus(tenantId, jobId);
  }

  @Get('sync/history/:priceListId')
  @ApiOperation({ summary: 'Get sync history for a price list' })
  @ApiParam({ name: 'priceListId', description: 'Price list ID' })
  @ApiResponse({ status: 200, description: 'Sync history' })
  async getSyncHistory(
    @TenantContext('tenantId') tenantId: string,
    @Param('priceListId') priceListId: string,
    @Query('limit') limit?: number,
  ) {
    return this.syncService.getSyncHistory(tenantId, priceListId, limit);
  }

  @Post('sync/jobs/:jobId/cancel')
  @ApiOperation({ summary: 'Cancel a running sync job' })
  @ApiParam({ name: 'jobId', description: 'Sync job ID' })
  @ApiResponse({ status: 200, description: 'Job cancelled' })
  async cancelSyncJob(
    @TenantContext('tenantId') tenantId: string,
    @Param('jobId') jobId: string,
  ) {
    await this.syncService.cancelSyncJob(tenantId, jobId);
    return { message: 'Job cancelled' };
  }

  @Post('sync/batch')
  @ApiOperation({ summary: 'Schedule batch sync for all price lists' })
  @ApiResponse({ status: 200, description: 'Batch sync scheduled' })
  async scheduleBatchSync(
    @TenantContext('tenantId') tenantId: string,
    @Query('connectorId') connectorId?: string,
  ) {
    const jobIds = await this.syncService.scheduleBatchSync(tenantId, connectorId);
    return { jobIds, count: jobIds.length };
  }
}
