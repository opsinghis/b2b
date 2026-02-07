import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { OrchestratorService } from './orchestrator.service';
import {
  ExecuteToolDto,
  ExecuteMultipleToolsDto,
  ExecutionResultDto,
  MultipleExecutionResultDto,
  RateLimitInfoDto,
} from './dto';
import { TenantContext } from '@core/tenants';
import { CurrentUser } from '@core/auth';
import { CanRead } from '@core/authorization';

@ApiTags('Agent Orchestrator')
@ApiBearerAuth()
@Controller('agent')
@UseGuards(ThrottlerGuard)
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute an agent tool' })
  @ApiResponse({ status: 200, type: ExecutionResultDto })
  @ApiResponse({ status: 400, description: 'Invalid tool or parameters' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions or rate limited' })
  @CanRead('Contract') // Minimal permission check
  async executeTool(
    @TenantContext() tenantId: string,
    @CurrentUser() user: { id: string; permissions?: string[] },
    @Body() dto: ExecuteToolDto,
  ): Promise<ExecutionResultDto> {
    const permissions = user.permissions || [];
    return this.orchestratorService.executeTool(tenantId, user.id, dto, permissions);
  }

  @Post('execute/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute multiple agent tools' })
  @ApiResponse({ status: 200, type: MultipleExecutionResultDto })
  @ApiResponse({ status: 400, description: 'Invalid tools or parameters' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions or rate limited' })
  @CanRead('Contract')
  async executeMultipleTools(
    @TenantContext() tenantId: string,
    @CurrentUser() user: { id: string; permissions?: string[] },
    @Body() dto: ExecuteMultipleToolsDto,
  ): Promise<MultipleExecutionResultDto> {
    const permissions = user.permissions || [];
    return this.orchestratorService.executeMultipleTools(
      tenantId,
      user.id,
      dto.tools,
      permissions,
      dto.parallel,
      dto.stopOnError,
    );
  }

  @Get('rate-limit')
  @ApiOperation({ summary: 'Get current rate limit info' })
  @ApiResponse({ status: 200, type: RateLimitInfoDto })
  @CanRead('Contract')
  async getRateLimitInfo(
    @TenantContext() tenantId: string,
    @CurrentUser() user: { id: string },
  ): Promise<RateLimitInfoDto> {
    return this.orchestratorService.getRateLimitInfo(tenantId, user.id);
  }
}
