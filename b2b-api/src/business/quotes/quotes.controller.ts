import {
  Controller,
  Get,
  Post,
  Patch,
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
  ApiSecurity,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { QuotesService } from './quotes.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteResponseDto,
  QuoteListQueryDto,
  QuoteWorkflowActionDto,
} from './dto';
import { JwtAuthGuard, Roles, RolesGuard, CurrentUser } from '@core/auth';
import { AuthorizationGuard, CanManage, CanRead } from '@core/authorization';
import { TenantContext } from '@core/tenants';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
}

@ApiTags('Quotes')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('quotes')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Quote')
  @ApiOperation({ summary: 'Create a new quote with line items' })
  @ApiResponse({
    status: 201,
    description: 'Quote created successfully',
    type: QuoteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async create(
    @Body() dto: CreateQuoteDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quotesService.create(dto, tenantId, user.userId);
    return QuoteResponseDto.fromEntity(quote);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @CanRead('Quote')
  @ApiOperation({ summary: 'List all quotes' })
  @ApiResponse({
    status: 200,
    description: 'List of quotes',
  })
  async findAll(@Query() query: QuoteListQueryDto, @TenantContext() tenantId: string) {
    const result = await this.quotesService.findAll(query, tenantId);
    return {
      ...result,
      data: result.data.map(QuoteResponseDto.fromEntity),
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @CanRead('Quote')
  @ApiOperation({ summary: 'Get a quote by ID' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({
    status: 200,
    description: 'Quote details with line items',
    type: QuoteResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async findOne(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quotesService.findOne(id, tenantId);
    return QuoteResponseDto.fromEntity(quote);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Quote')
  @ApiOperation({ summary: 'Update a quote' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({
    status: 200,
    description: 'Quote updated successfully',
    type: QuoteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or quote not in DRAFT status' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quotesService.update(id, dto, tenantId, user.userId);
    return QuoteResponseDto.fromEntity(quote);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanManage('Quote')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a quote' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({ status: 204, description: 'Quote deleted successfully' })
  @ApiResponse({ status: 400, description: 'Quote not in deletable status' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async remove(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.quotesService.remove(id, tenantId, user.userId);
  }

  // ==========================================
  // Workflow Endpoints
  // ==========================================

  @Post(':id/submit')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Quote')
  @ApiOperation({ summary: 'Submit a quote for approval' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({
    status: 200,
    description: 'Quote submitted for approval',
    type: QuoteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Quote not in DRAFT status' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async submit(
    @Param('id') id: string,
    @Body() dto: QuoteWorkflowActionDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quotesService.submit(id, tenantId, user.userId, dto.comments);
    return QuoteResponseDto.fromEntity(quote);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanManage('Quote')
  @ApiOperation({ summary: 'Approve a quote (subject to approval threshold)' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({
    status: 200,
    description: 'Quote approved',
    type: QuoteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Quote not in PENDING_APPROVAL status or exceeds threshold',
  })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async approve(
    @Param('id') id: string,
    @Body() dto: QuoteWorkflowActionDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quotesService.approve(
      id,
      tenantId,
      user.userId,
      user.role,
      dto.comments,
    );
    return QuoteResponseDto.fromEntity(quote);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanManage('Quote')
  @ApiOperation({ summary: 'Reject a quote (send back to draft)' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({
    status: 200,
    description: 'Quote rejected',
    type: QuoteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Quote cannot be rejected in current status' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async reject(
    @Param('id') id: string,
    @Body() dto: QuoteWorkflowActionDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quotesService.reject(id, tenantId, user.userId, dto.comments);
    return QuoteResponseDto.fromEntity(quote);
  }

  @Post(':id/send')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Quote')
  @ApiOperation({ summary: 'Send an approved quote to customer' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({
    status: 200,
    description: 'Quote sent to customer',
    type: QuoteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Quote not in APPROVED status' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async send(
    @Param('id') id: string,
    @Body() dto: QuoteWorkflowActionDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quotesService.send(id, tenantId, user.userId, dto.comments);
    return QuoteResponseDto.fromEntity(quote);
  }

  @Post(':id/accept')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Quote')
  @ApiOperation({ summary: 'Mark quote as accepted by customer' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({
    status: 200,
    description: 'Quote accepted',
    type: QuoteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Quote not in SENT status' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async accept(
    @Param('id') id: string,
    @Body() dto: QuoteWorkflowActionDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quotesService.accept(id, tenantId, user.userId, dto.comments);
    return QuoteResponseDto.fromEntity(quote);
  }

  @Post(':id/customer-reject')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Quote')
  @ApiOperation({ summary: 'Mark quote as rejected by customer' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({
    status: 200,
    description: 'Quote rejected by customer',
    type: QuoteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Quote not in SENT status' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async rejectByCustomer(
    @Param('id') id: string,
    @Body() dto: QuoteWorkflowActionDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quotesService.rejectByCustomer(
      id,
      tenantId,
      user.userId,
      dto.comments,
    );
    return QuoteResponseDto.fromEntity(quote);
  }

  @Post(':id/convert-to-contract')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanManage('Quote')
  @ApiOperation({ summary: 'Convert an accepted quote to a contract' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({
    status: 200,
    description: 'Quote converted to contract',
  })
  @ApiResponse({ status: 400, description: 'Quote not in ACCEPTED status' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async convertToContract(
    @Param('id') id: string,
    @Body() dto: QuoteWorkflowActionDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.quotesService.convertToContract(
      id,
      tenantId,
      user.userId,
      dto.comments,
    );
    return {
      quote: QuoteResponseDto.fromEntity(result.quote),
      contractId: result.contractId,
    };
  }
}
