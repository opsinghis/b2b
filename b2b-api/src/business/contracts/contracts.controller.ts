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
import { ContractsService } from './contracts.service';
import {
  CreateContractDto,
  UpdateContractDto,
  ContractResponseDto,
  ContractListQueryDto,
  ContractVersionResponseDto,
  WorkflowActionDto,
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

@ApiTags('Contracts')
@ApiBearerAuth()
@ApiSecurity('x-tenant-id')
@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard, AuthorizationGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanManage('Contract')
  @ApiOperation({ summary: 'Create a new contract' })
  @ApiResponse({
    status: 201,
    description: 'Contract created successfully',
    type: ContractResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async create(
    @Body() dto: CreateContractDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.create(dto, tenantId, user.userId);
    return ContractResponseDto.fromEntity(contract);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @CanRead('Contract')
  @ApiOperation({ summary: 'List all contracts' })
  @ApiResponse({
    status: 200,
    description: 'List of contracts',
  })
  async findAll(@Query() query: ContractListQueryDto, @TenantContext() tenantId: string) {
    const result = await this.contractsService.findAll(query, tenantId);
    return {
      ...result,
      data: result.data.map(ContractResponseDto.fromEntity),
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @CanRead('Contract')
  @ApiOperation({ summary: 'Get a contract by ID' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract details',
    type: ContractResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async findOne(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.findOne(id, tenantId);
    return ContractResponseDto.fromEntity(contract);
  }

  @Get(':id/versions')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @CanRead('Contract')
  @ApiOperation({ summary: 'Get contract version history' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract version history',
    type: [ContractVersionResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async getVersionHistory(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
  ): Promise<ContractVersionResponseDto[]> {
    const versions = await this.contractsService.getVersionHistory(id, tenantId);
    return versions.map(ContractVersionResponseDto.fromEntity);
  }

  @Get(':id/versions/:version')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @CanRead('Contract')
  @ApiOperation({ summary: 'Get a specific contract version' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiParam({ name: 'version', description: 'Version number' })
  @ApiResponse({
    status: 200,
    description: 'Contract version details',
    type: ContractVersionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Contract or version not found' })
  async getVersion(
    @Param('id') id: string,
    @Param('version') version: string,
    @TenantContext() tenantId: string,
  ): Promise<ContractVersionResponseDto> {
    const versionNumber = parseInt(version, 10);
    const contractVersion = await this.contractsService.getVersion(id, versionNumber, tenantId);
    return ContractVersionResponseDto.fromEntity(contractVersion);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanManage('Contract')
  @ApiOperation({ summary: 'Update a contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract updated successfully',
    type: ContractResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or contract not in DRAFT status' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.update(id, dto, tenantId, user.userId);
    return ContractResponseDto.fromEntity(contract);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanManage('Contract')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({ status: 204, description: 'Contract deleted successfully' })
  @ApiResponse({ status: 400, description: 'Contract not in deletable status' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async remove(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.contractsService.remove(id, tenantId, user.userId);
  }

  @Post(':id/restore')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanManage('Contract')
  @ApiOperation({ summary: 'Restore a soft-deleted contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract restored successfully',
    type: ContractResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Contract is not deleted' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async restore(
    @Param('id') id: string,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.restore(id, tenantId, user.userId);
    return ContractResponseDto.fromEntity(contract);
  }

  // ==========================================
  // Workflow Endpoints
  // ==========================================

  @Post(':id/submit')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @CanManage('Contract')
  @ApiOperation({ summary: 'Submit a contract for approval' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract submitted for approval',
    type: ContractResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Contract not in DRAFT status' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async submit(
    @Param('id') id: string,
    @Body() dto: WorkflowActionDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.submit(id, tenantId, user.userId, dto.comments);
    return ContractResponseDto.fromEntity(contract);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanManage('Contract')
  @ApiOperation({ summary: 'Approve a contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract approved',
    type: ContractResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Contract not in PENDING_APPROVAL status' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async approve(
    @Param('id') id: string,
    @Body() dto: WorkflowActionDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.approve(id, tenantId, user.userId, dto.comments);
    return ContractResponseDto.fromEntity(contract);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanManage('Contract')
  @ApiOperation({ summary: 'Reject a contract (send back to draft)' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract rejected',
    type: ContractResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Contract not in approvable status' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async reject(
    @Param('id') id: string,
    @Body() dto: WorkflowActionDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.reject(id, tenantId, user.userId, dto.comments);
    return ContractResponseDto.fromEntity(contract);
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanManage('Contract')
  @ApiOperation({ summary: 'Activate an approved contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract activated',
    type: ContractResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Contract not in APPROVED status or missing effective date',
  })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async activate(
    @Param('id') id: string,
    @Body() dto: WorkflowActionDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.activate(id, tenantId, user.userId, dto.comments);
    return ContractResponseDto.fromEntity(contract);
  }

  @Post(':id/terminate')
  @Roles(UserRole.ADMIN)
  @CanManage('Contract')
  @ApiOperation({ summary: 'Terminate an active contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract terminated',
    type: ContractResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Contract not in ACTIVE status' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async terminate(
    @Param('id') id: string,
    @Body() dto: WorkflowActionDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.terminate(id, tenantId, user.userId, dto.comments);
    return ContractResponseDto.fromEntity(contract);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @CanManage('Contract')
  @ApiOperation({ summary: 'Cancel a contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract cancelled',
    type: ContractResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Contract cannot be cancelled in current status' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: WorkflowActionDto,
    @TenantContext() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.cancel(id, tenantId, user.userId, dto.comments);
    return ContractResponseDto.fromEntity(contract);
  }
}
