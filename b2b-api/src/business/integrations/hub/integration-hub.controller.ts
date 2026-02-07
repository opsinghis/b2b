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
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@core/auth';
import { IntegrationHubService } from './integration-hub.service';
import {
  CreateIntegrationMessageDto,
  IntegrationMessageQueryDto,
  IntegrationMessageResponseDto,
  ReprocessMessageDto,
  CreateConnectorDto,
  UpdateConnectorDto,
  ConnectorQueryDto,
  ConnectorResponseDto,
  ConnectorHealthDto,
  CreateTransformationDto,
  UpdateTransformationDto,
  TransformationQueryDto,
  TransformationResponseDto,
  TransformPayloadDto,
  TransformResultDto,
  DeadLetterQueryDto,
  DeadLetterResponseDto,
  ReprocessDeadLetterDto,
  BulkReprocessDto,
  BulkReprocessResultDto,
  DeadLetterStatsDto,
} from './dto';

@ApiTags('Integration Hub')
@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IntegrationHubController {
  constructor(private readonly hubService: IntegrationHubService) {}

  // ============================================
  // Message Endpoints
  // ============================================

  @Post('messages')
  @ApiOperation({ summary: 'Route a new integration message' })
  @ApiResponse({ status: 201, type: IntegrationMessageResponseDto })
  @Roles('ADMIN', 'SUPER_ADMIN')
  async routeMessage(@Body() dto: CreateIntegrationMessageDto) {
    return this.hubService.routeMessage(dto);
  }

  @Get('messages')
  @ApiOperation({ summary: 'List integration messages' })
  @ApiResponse({ status: 200 })
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  async listMessages(@Query() query: IntegrationMessageQueryDto) {
    return this.hubService.listMessages(query);
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Get a message by ID' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 200, type: IntegrationMessageResponseDto })
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  async getMessage(@Param('id') id: string) {
    return this.hubService.getMessage(id);
  }

  @Post('messages/reprocess')
  @ApiOperation({ summary: 'Reprocess a failed message' })
  @ApiResponse({ status: 200 })
  @Roles('ADMIN', 'SUPER_ADMIN')
  async reprocessMessage(
    @Body() dto: ReprocessMessageDto,
    @CurrentUser('id') userId: string,
  ) {
    const message = await this.hubService.getMessage(dto.id);
    if (!message) {
      return { error: 'Message not found' };
    }
    return this.hubService.processMessage(message);
  }

  // ============================================
  // Connector Endpoints
  // ============================================

  @Post('connectors')
  @ApiOperation({ summary: 'Create a new connector' })
  @ApiResponse({ status: 201, type: ConnectorResponseDto })
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createConnector(@Body() dto: CreateConnectorDto) {
    return this.hubService.createConnector(dto);
  }

  @Get('connectors')
  @ApiOperation({ summary: 'List connectors' })
  @ApiResponse({ status: 200 })
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  async listConnectors(@Query() query: ConnectorQueryDto) {
    return this.hubService.listConnectors(query);
  }

  @Get('connectors/:id')
  @ApiOperation({ summary: 'Get a connector by ID' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 200, type: ConnectorResponseDto })
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  async getConnector(@Param('id') id: string) {
    return this.hubService.getConnector(id);
  }

  @Get('connectors/code/:code')
  @ApiOperation({ summary: 'Get a connector by code' })
  @ApiParam({ name: 'code', description: 'Connector code' })
  @ApiResponse({ status: 200, type: ConnectorResponseDto })
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  async getConnectorByCode(@Param('code') code: string) {
    return this.hubService.getConnectorByCode(code);
  }

  @Put('connectors/:id')
  @ApiOperation({ summary: 'Update a connector' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 200, type: ConnectorResponseDto })
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateConnector(
    @Param('id') id: string,
    @Body() dto: UpdateConnectorDto,
  ) {
    return this.hubService.updateConnector(id, dto);
  }

  @Delete('connectors/:id')
  @ApiOperation({ summary: 'Delete a connector' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteConnector(@Param('id') id: string) {
    return this.hubService.deleteConnector(id);
  }

  // ============================================
  // Transformation Endpoints
  // ============================================

  @Post('transformations')
  @ApiOperation({ summary: 'Create a new transformation' })
  @ApiResponse({ status: 201, type: TransformationResponseDto })
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createTransformation(@Body() dto: CreateTransformationDto) {
    return this.hubService.createTransformation(dto);
  }

  @Get('transformations')
  @ApiOperation({ summary: 'List transformations' })
  @ApiResponse({ status: 200 })
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  async listTransformations(@Query() query: TransformationQueryDto) {
    return this.hubService.listTransformations(query);
  }

  @Get('transformations/:id')
  @ApiOperation({ summary: 'Get a transformation by ID' })
  @ApiParam({ name: 'id', description: 'Transformation ID' })
  @ApiResponse({ status: 200, type: TransformationResponseDto })
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  async getTransformation(@Param('id') id: string) {
    return this.hubService.getTransformation(id);
  }

  @Put('transformations/:id')
  @ApiOperation({ summary: 'Update a transformation' })
  @ApiParam({ name: 'id', description: 'Transformation ID' })
  @ApiResponse({ status: 200, type: TransformationResponseDto })
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateTransformation(
    @Param('id') id: string,
    @Body() dto: UpdateTransformationDto,
  ) {
    return this.hubService.updateTransformation(id, dto);
  }

  @Delete('transformations/:id')
  @ApiOperation({ summary: 'Delete a transformation' })
  @ApiParam({ name: 'id', description: 'Transformation ID' })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteTransformation(@Param('id') id: string) {
    return this.hubService.deleteTransformation(id);
  }

  @Post('transformations/test')
  @ApiOperation({ summary: 'Test a transformation with sample payload' })
  @ApiResponse({ status: 200, type: TransformResultDto })
  @Roles('ADMIN', 'SUPER_ADMIN')
  async testTransformation(@Body() dto: TransformPayloadDto) {
    return this.hubService.transformPayload(dto);
  }

  // ============================================
  // Dead Letter Queue Endpoints
  // ============================================

  @Get('dead-letters')
  @ApiOperation({ summary: 'List dead letter messages' })
  @ApiResponse({ status: 200 })
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  async listDeadLetters(@Query() query: DeadLetterQueryDto) {
    return this.hubService.listDeadLetters(query);
  }

  @Get('dead-letters/stats')
  @ApiOperation({ summary: 'Get dead letter queue statistics' })
  @ApiResponse({ status: 200, type: DeadLetterStatsDto })
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  async getDeadLetterStats() {
    return this.hubService.getDeadLetterStats();
  }

  @Post('dead-letters/reprocess')
  @ApiOperation({ summary: 'Reprocess a dead letter message' })
  @ApiResponse({ status: 200 })
  @Roles('ADMIN', 'SUPER_ADMIN')
  async reprocessDeadLetter(
    @Body() dto: ReprocessDeadLetterDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.hubService.reprocessDeadLetter(dto.id, userId);
  }

  @Post('dead-letters/bulk-reprocess')
  @ApiOperation({ summary: 'Bulk reprocess dead letter messages' })
  @ApiResponse({ status: 200, type: BulkReprocessResultDto })
  @Roles('ADMIN', 'SUPER_ADMIN')
  async bulkReprocessDeadLetters(
    @Body() dto: BulkReprocessDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.hubService.bulkReprocessDeadLetters(dto, userId);
  }

  // ============================================
  // Health Check Endpoints
  // ============================================

  @Get('health')
  @ApiOperation({ summary: 'Get health status of all connectors' })
  @ApiResponse({ status: 200, type: [ConnectorHealthDto] })
  async getAllConnectorsHealth() {
    return this.hubService.getAllConnectorsHealth();
  }

  @Get('health/:code')
  @ApiOperation({ summary: 'Get health status of a specific connector' })
  @ApiParam({ name: 'code', description: 'Connector code' })
  @ApiResponse({ status: 200, type: ConnectorHealthDto })
  async getConnectorHealth(@Param('code') code: string) {
    return this.hubService.getConnectorHealth(code);
  }
}

// Admin-only controller for system-level operations
@ApiTags('Integration Hub - Admin')
@Controller('admin/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@ApiBearerAuth()
export class AdminIntegrationHubController {
  constructor(private readonly hubService: IntegrationHubService) {}

  @Post('connectors/:code/circuit/reset')
  @ApiOperation({ summary: 'Reset circuit breaker for a connector' })
  @ApiParam({ name: 'code', description: 'Connector code' })
  @ApiResponse({ status: 200 })
  async resetCircuitBreaker(@Param('code') code: string) {
    const connector = await this.hubService.getConnectorByCode(code);
    if (!connector) {
      return { error: 'Connector not found' };
    }

    await this.hubService.updateConnector(connector.id, {
      circuitState: 'CLOSED' as any,
    });

    return { message: `Circuit breaker reset for connector: ${code}` };
  }

  @Post('connectors/:code/rate-limit/reset')
  @ApiOperation({ summary: 'Reset rate limit counter for a connector' })
  @ApiParam({ name: 'code', description: 'Connector code' })
  @ApiResponse({ status: 200 })
  async resetRateLimit(@Param('code') code: string) {
    const connector = await this.hubService.getConnectorByCode(code);
    if (!connector) {
      return { error: 'Connector not found' };
    }

    // Reset is handled automatically on next window
    return { message: `Rate limit will reset on next window for connector: ${code}` };
  }
}
