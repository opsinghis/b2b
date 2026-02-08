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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { TenantContext } from '@core/tenants';
import { CurrentUser } from '@core/auth';
import { CanManage, CanRead } from '@core/authorization';
import {
  CreateApprovalChainDto,
  UpdateApprovalChainDto,
  ApprovalChainQueryDto,
  SubmitApprovalDto,
  ApprovalActionDto,
  DelegateApprovalDto,
  ApprovalChainResponseDto,
  ApprovalChainListResponseDto,
  ApprovalRequestResponseDto,
  PendingApprovalResponseDto,
} from './dto';

@ApiTags('approvals')
@ApiBearerAuth()
@Controller()
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  // ==========================================
  // Approval Chain Endpoints
  // ==========================================

  @Post('admin/approval-chains')
  @CanManage('ApprovalChain')
  @ApiOperation({ summary: 'Create a new approval chain' })
  @ApiResponse({ status: 201, type: ApprovalChainResponseDto })
  async createChain(
    @Body() dto: CreateApprovalChainDto,
    @TenantContext() tenantId: string,
  ): Promise<ApprovalChainResponseDto> {
    return this.approvalsService.createChain(dto, tenantId);
  }

  @Get('admin/approval-chains')
  @CanRead('ApprovalChain')
  @ApiOperation({ summary: 'List approval chains' })
  @ApiResponse({ status: 200, type: ApprovalChainListResponseDto })
  async findAllChains(
    @Query() query: ApprovalChainQueryDto,
    @TenantContext() tenantId: string,
  ): Promise<ApprovalChainListResponseDto> {
    return this.approvalsService.findAllChains(query, tenantId);
  }

  @Get('admin/approval-chains/:id')
  @CanRead('ApprovalChain')
  @ApiOperation({ summary: 'Get approval chain by ID' })
  @ApiResponse({ status: 200, type: ApprovalChainResponseDto })
  async findChainById(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
  ): Promise<ApprovalChainResponseDto> {
    return this.approvalsService.findChainById(id, tenantId);
  }

  @Put('admin/approval-chains/:id')
  @CanManage('ApprovalChain')
  @ApiOperation({ summary: 'Update approval chain' })
  @ApiResponse({ status: 200, type: ApprovalChainResponseDto })
  async updateChain(
    @Param('id') id: string,
    @Body() dto: UpdateApprovalChainDto,
    @TenantContext() tenantId: string,
  ): Promise<ApprovalChainResponseDto> {
    return this.approvalsService.updateChain(id, dto, tenantId);
  }

  @Delete('admin/approval-chains/:id')
  @CanManage('ApprovalChain')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete approval chain' })
  @ApiResponse({ status: 204 })
  async deleteChain(@Param('id') id: string, @TenantContext() tenantId: string): Promise<void> {
    return this.approvalsService.deleteChain(id, tenantId);
  }

  @Post('admin/approval-chains/:id/set-default')
  @CanManage('ApprovalChain')
  @ApiOperation({ summary: 'Set approval chain as default for its entity type' })
  @ApiResponse({ status: 200, type: ApprovalChainResponseDto })
  async setDefaultChain(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
  ): Promise<ApprovalChainResponseDto> {
    return this.approvalsService.setDefaultChain(id, tenantId);
  }

  // ==========================================
  // Approval Request Endpoints
  // ==========================================

  @Post('approvals/submit')
  @CanManage('Approval')
  @ApiOperation({ summary: 'Submit an entity for approval' })
  @ApiResponse({ status: 201, type: ApprovalRequestResponseDto })
  async submitForApproval(
    @Body() dto: SubmitApprovalDto,
    @TenantContext() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalsService.submitForApproval(dto, tenantId, userId);
  }

  @Get('approvals/pending')
  @CanRead('Approval')
  @ApiOperation({ summary: 'Get pending approvals for current user' })
  @ApiResponse({ status: 200, type: [PendingApprovalResponseDto] })
  async getPendingApprovals(
    @TenantContext() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<PendingApprovalResponseDto[]> {
    return this.approvalsService.getPendingApprovals(tenantId, userId);
  }

  @Get('approvals/:id')
  @CanRead('Approval')
  @ApiOperation({ summary: 'Get approval request by ID' })
  @ApiResponse({ status: 200, type: ApprovalRequestResponseDto })
  async getRequestById(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalsService.getRequestById(id, tenantId);
  }

  @Post('approvals/:requestId/steps/:stepId/approve')
  @CanManage('Approval')
  @ApiOperation({ summary: 'Approve an approval step' })
  @ApiResponse({ status: 200, type: ApprovalRequestResponseDto })
  async approve(
    @Param('requestId') requestId: string,
    @Param('stepId') stepId: string,
    @Body() dto: ApprovalActionDto,
    @TenantContext() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalsService.approve(requestId, stepId, tenantId, userId, dto.comments);
  }

  @Post('approvals/:requestId/steps/:stepId/reject')
  @CanManage('Approval')
  @ApiOperation({ summary: 'Reject an approval step' })
  @ApiResponse({ status: 200, type: ApprovalRequestResponseDto })
  async reject(
    @Param('requestId') requestId: string,
    @Param('stepId') stepId: string,
    @Body() dto: ApprovalActionDto,
    @TenantContext() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalsService.reject(requestId, stepId, tenantId, userId, dto.comments);
  }

  @Post('approvals/:requestId/steps/:stepId/delegate')
  @CanManage('Approval')
  @ApiOperation({ summary: 'Delegate an approval step to another user' })
  @ApiResponse({ status: 200, type: ApprovalRequestResponseDto })
  async delegate(
    @Param('requestId') requestId: string,
    @Param('stepId') stepId: string,
    @Body() dto: DelegateApprovalDto,
    @TenantContext() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalsService.delegate(
      requestId,
      stepId,
      tenantId,
      userId,
      dto.delegateToUserId,
      dto.reason,
    );
  }

  @Post('approvals/:id/cancel')
  @CanManage('Approval')
  @ApiOperation({ summary: 'Cancel an approval request' })
  @ApiResponse({ status: 200, type: ApprovalRequestResponseDto })
  async cancelRequest(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalsService.cancelRequest(id, tenantId, userId);
  }
}
