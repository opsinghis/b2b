import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiSecurity,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SalaryDeductionService } from './salary-deduction.service';
import {
  UpdateSalaryDeductionPreferencesDto,
  CreateLimitRequestDto,
  AdminUpdateSalaryDeductionDto,
  AdminListSalaryDeductionsQueryDto,
  AdminListLimitRequestsQueryDto,
  ApproveRejectLimitRequestDto,
  SalaryDeductionResponseDto,
  SalaryDeductionHistoryResponseDto,
  LimitRequestResponseDto,
  AdminSalaryDeductionListResponseDto,
  LimitRequestListResponseDto,
  SalaryDeductionReportResponseDto,
} from './dto';
import { JwtAuthGuard, Roles, RolesGuard, CurrentUser } from '@core/auth';
import { AuthorizationGuard, CanManage } from '@core/authorization';
import { TenantContext } from '@core/tenants';

interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
}

@ApiTags('Salary Deduction')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('users/me/salary-deduction')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class SalaryDeductionController {
  constructor(private readonly salaryDeductionService: SalaryDeductionService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('SalaryDeduction')
  @ApiOperation({ summary: 'Get salary deduction status and limits' })
  @ApiResponse({
    status: 200,
    description: 'Salary deduction status',
    type: SalaryDeductionResponseDto,
  })
  async getStatus(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SalaryDeductionResponseDto> {
    const deduction = await this.salaryDeductionService.getStatus(tenantId, user.id);
    return SalaryDeductionResponseDto.fromEntity(deduction);
  }

  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('SalaryDeduction')
  @ApiOperation({ summary: 'Get salary deduction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Deduction history',
    type: SalaryDeductionHistoryResponseDto,
  })
  async getHistory(
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<SalaryDeductionHistoryResponseDto> {
    const { transactions, total } = await this.salaryDeductionService.getHistory(
      tenantId,
      user.id,
      page || 1,
      limit || 20,
    );
    return SalaryDeductionHistoryResponseDto.fromEntities(
      transactions,
      total,
      page || 1,
      limit || 20,
    );
  }

  @Patch()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('SalaryDeduction')
  @ApiOperation({ summary: 'Update salary deduction preferences' })
  @ApiResponse({
    status: 200,
    description: 'Updated preferences',
    type: SalaryDeductionResponseDto,
  })
  async updatePreferences(
    @Body() dto: UpdateSalaryDeductionPreferencesDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SalaryDeductionResponseDto> {
    const deduction = await this.salaryDeductionService.updatePreferences(
      tenantId,
      user.id,
      dto,
    );
    return SalaryDeductionResponseDto.fromEntity(deduction);
  }

  @Post('limit-request')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('SalaryDeduction')
  @ApiOperation({ summary: 'Request limit increase' })
  @ApiResponse({
    status: 201,
    description: 'Limit request created',
    type: LimitRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 409, description: 'Pending request exists' })
  async createLimitRequest(
    @Body() dto: CreateLimitRequestDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LimitRequestResponseDto> {
    const request = await this.salaryDeductionService.createLimitRequest(
      tenantId,
      user.id,
      dto,
    );
    return LimitRequestResponseDto.fromEntity(request);
  }
}

@ApiTags('Admin - Salary Deduction')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('admin/salary-deductions')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class AdminSalaryDeductionController {
  constructor(private readonly salaryDeductionService: SalaryDeductionService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @CanManage('SalaryDeduction')
  @ApiOperation({ summary: 'List all salary deductions' })
  @ApiResponse({
    status: 200,
    description: 'List of salary deductions',
    type: AdminSalaryDeductionListResponseDto,
  })
  async findAll(
    @Query() query: AdminListSalaryDeductionsQueryDto,
    @TenantContext() tenantId: string,
  ): Promise<AdminSalaryDeductionListResponseDto> {
    const { deductions, total } = await this.salaryDeductionService.findAllAdmin(tenantId, query);
    return AdminSalaryDeductionListResponseDto.fromEntities(
      deductions,
      total,
      query.page || 1,
      query.limit || 20,
    );
  }

  @Patch(':userId')
  @Roles(UserRole.ADMIN)
  @CanManage('SalaryDeduction')
  @ApiOperation({ summary: 'Update user salary deduction settings' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Updated salary deduction',
    type: SalaryDeductionResponseDto,
  })
  async update(
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateSalaryDeductionDto,
    @TenantContext() tenantId: string,
  ): Promise<SalaryDeductionResponseDto> {
    const deduction = await this.salaryDeductionService.updateAdmin(tenantId, userId, dto);
    return SalaryDeductionResponseDto.fromEntity(deduction);
  }

  @Get('report')
  @Roles(UserRole.ADMIN)
  @CanManage('SalaryDeduction')
  @ApiOperation({ summary: 'Get salary deduction report' })
  @ApiResponse({
    status: 200,
    description: 'Report data',
    type: SalaryDeductionReportResponseDto,
  })
  async getReport(@TenantContext() tenantId: string): Promise<SalaryDeductionReportResponseDto> {
    const report = await this.salaryDeductionService.getReport(tenantId);
    return {
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      totalEnrolled: report.totalEnrolled,
      totalActive: report.totalActive,
      totalDeducted: report.totalDeducted.toString(),
      totalLimit: report.totalLimit.toString(),
      utilizationRate: report.utilizationRate,
      pendingRequests: report.pendingRequests,
    };
  }

  @Get('limit-requests')
  @Roles(UserRole.ADMIN)
  @CanManage('SalaryDeduction')
  @ApiOperation({ summary: 'List limit requests' })
  @ApiResponse({
    status: 200,
    description: 'List of limit requests',
    type: LimitRequestListResponseDto,
  })
  async findLimitRequests(
    @Query() query: AdminListLimitRequestsQueryDto,
    @TenantContext() tenantId: string,
  ): Promise<LimitRequestListResponseDto> {
    const { requests, total } = await this.salaryDeductionService.findLimitRequests(
      tenantId,
      query,
    );
    return LimitRequestListResponseDto.fromEntities(
      requests,
      total,
      query.page || 1,
      query.limit || 20,
    );
  }

  @Post('limit-requests/:id/approve')
  @Roles(UserRole.ADMIN)
  @CanManage('SalaryDeduction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve limit request' })
  @ApiParam({ name: 'id', description: 'Limit request ID' })
  @ApiResponse({
    status: 200,
    description: 'Request approved',
    type: LimitRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Already processed' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async approveLimitRequest(
    @Param('id') id: string,
    @Body() dto: ApproveRejectLimitRequestDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LimitRequestResponseDto> {
    const request = await this.salaryDeductionService.approveLimitRequest(
      id,
      tenantId,
      user.id,
      dto.reviewNotes,
    );
    return LimitRequestResponseDto.fromEntity(request);
  }

  @Post('limit-requests/:id/reject')
  @Roles(UserRole.ADMIN)
  @CanManage('SalaryDeduction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject limit request' })
  @ApiParam({ name: 'id', description: 'Limit request ID' })
  @ApiResponse({
    status: 200,
    description: 'Request rejected',
    type: LimitRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Already processed' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async rejectLimitRequest(
    @Param('id') id: string,
    @Body() dto: ApproveRejectLimitRequestDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LimitRequestResponseDto> {
    const request = await this.salaryDeductionService.rejectLimitRequest(
      id,
      tenantId,
      user.id,
      dto.reviewNotes,
    );
    return LimitRequestResponseDto.fromEntity(request);
  }
}
