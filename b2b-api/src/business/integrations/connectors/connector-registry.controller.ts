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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ConnectorRegistryService } from './services/connector-registry.service';
import { CredentialVaultService } from './services/credential-vault.service';
import {
  RegisterConnectorDto,
  UpdateConnectorRegistrationDto,
  ConnectorQueryDto,
  ConfigureConnectorDto,
  UpdateConnectorConfigDto,
  ConnectorConfigQueryDto,
  CreateCredentialDto,
  UpdateCredentialDto,
  CredentialQueryDto,
  RotateCredentialDto,
  DeclareCapabilitiesDto,
  ExecuteCapabilityDto,
  ConnectorEventQueryDto,
  ConnectionTestResultDto,
  ConnectorResponseDto,
  ConnectorConfigResponseDto,
  CredentialVaultResponseDto,
  CapabilityResponseDto,
} from './dto';
import { CapabilityCategory } from '@prisma/client';

@ApiTags('Connector Registry')
@ApiBearerAuth()
@Controller('integrations/connectors')
export class ConnectorRegistryController {
  constructor(
    private readonly connectorRegistryService: ConnectorRegistryService,
    private readonly credentialVaultService: CredentialVaultService,
  ) {}

  // ============================================
  // Connector Registration Endpoints
  // ============================================

  @Post()
  @ApiOperation({ summary: 'Register a new connector' })
  @ApiResponse({ status: 201, description: 'Connector registered', type: ConnectorResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async registerConnector(@Body() dto: RegisterConnectorDto) {
    return this.connectorRegistryService.registerConnector(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all registered connectors' })
  @ApiResponse({ status: 200, description: 'List of connectors' })
  async listConnectors(@Query() query: ConnectorQueryDto) {
    return this.connectorRegistryService.listConnectors(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get connector by ID' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 200, description: 'Connector details', type: ConnectorResponseDto })
  @ApiResponse({ status: 404, description: 'Connector not found' })
  async getConnector(@Param('id') id: string) {
    return this.connectorRegistryService.getConnector(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get connector by code' })
  @ApiParam({ name: 'code', description: 'Connector code' })
  @ApiResponse({ status: 200, description: 'Connector details', type: ConnectorResponseDto })
  @ApiResponse({ status: 404, description: 'Connector not found' })
  async getConnectorByCode(@Param('code') code: string) {
    return this.connectorRegistryService.getConnectorByCode(code);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update connector registration' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 200, description: 'Connector updated', type: ConnectorResponseDto })
  @ApiResponse({ status: 404, description: 'Connector not found' })
  async updateConnector(@Param('id') id: string, @Body() dto: UpdateConnectorRegistrationDto) {
    return this.connectorRegistryService.updateConnectorRegistration(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unregister a connector' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 204, description: 'Connector unregistered' })
  @ApiResponse({ status: 400, description: 'Cannot unregister - configurations exist' })
  @ApiResponse({ status: 404, description: 'Connector not found' })
  async unregisterConnector(@Param('id') id: string) {
    await this.connectorRegistryService.unregisterConnector(id);
  }

  @Post(':id/enable')
  @ApiOperation({ summary: 'Enable a connector' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 200, description: 'Connector enabled', type: ConnectorResponseDto })
  async enableConnector(@Param('id') id: string) {
    return this.connectorRegistryService.enableConnector(id);
  }

  @Post(':id/disable')
  @ApiOperation({ summary: 'Disable a connector' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 200, description: 'Connector disabled', type: ConnectorResponseDto })
  async disableConnector(@Param('id') id: string) {
    return this.connectorRegistryService.disableConnector(id);
  }

  // ============================================
  // Capability Endpoints
  // ============================================

  @Post(':id/capabilities')
  @ApiOperation({ summary: 'Declare capabilities for a connector' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({
    status: 201,
    description: 'Capabilities declared',
    type: [CapabilityResponseDto],
  })
  async declareCapabilities(@Param('id') id: string, @Body() dto: DeclareCapabilitiesDto) {
    return this.connectorRegistryService.declareCapabilities(
      id,
      dto.capabilities.map((cap) => ({
        ...cap,
        category: cap.category as CapabilityCategory,
      })),
    );
  }

  @Get(':id/capabilities')
  @ApiOperation({ summary: 'Get capabilities for a connector' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({
    status: 200,
    description: 'Connector capabilities',
    type: [CapabilityResponseDto],
  })
  async getCapabilities(@Param('id') id: string) {
    return this.connectorRegistryService.getConnectorCapabilities(id);
  }

  // ============================================
  // Connector Configuration Endpoints
  // ============================================

  @Post('configs')
  @ApiOperation({ summary: 'Configure a connector for a tenant' })
  @ApiResponse({
    status: 201,
    description: 'Connector configured',
    type: ConnectorConfigResponseDto,
  })
  async configureConnector(@Body() dto: ConfigureConnectorDto) {
    return this.connectorRegistryService.configureConnector(dto);
  }

  @Get('configs')
  @ApiOperation({ summary: 'List connector configurations for a tenant' })
  @ApiResponse({ status: 200, description: 'List of configurations' })
  async listConfigs(@Query() query: ConnectorConfigQueryDto) {
    return this.connectorRegistryService.listConnectorConfigs(query);
  }

  @Get('configs/:id')
  @ApiOperation({ summary: 'Get connector configuration by ID' })
  @ApiParam({ name: 'id', description: 'Configuration ID' })
  @ApiResponse({
    status: 200,
    description: 'Configuration details',
    type: ConnectorConfigResponseDto,
  })
  async getConfig(@Param('id') id: string) {
    return this.connectorRegistryService.getConnectorConfig(id);
  }

  @Put('configs/:id')
  @ApiOperation({ summary: 'Update connector configuration' })
  @ApiParam({ name: 'id', description: 'Configuration ID' })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated',
    type: ConnectorConfigResponseDto,
  })
  async updateConfig(@Param('id') id: string, @Body() dto: UpdateConnectorConfigDto) {
    return this.connectorRegistryService.updateConnectorConfig(id, dto);
  }

  @Delete('configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete connector configuration' })
  @ApiParam({ name: 'id', description: 'Configuration ID' })
  @ApiResponse({ status: 204, description: 'Configuration deleted' })
  async deleteConfig(@Param('id') id: string) {
    await this.connectorRegistryService.deleteConnectorConfig(id);
  }

  @Post('configs/:id/enable')
  @ApiOperation({ summary: 'Enable a connector configuration' })
  @ApiParam({ name: 'id', description: 'Configuration ID' })
  @ApiResponse({
    status: 200,
    description: 'Configuration enabled',
    type: ConnectorConfigResponseDto,
  })
  async enableConfig(@Param('id') id: string) {
    return this.connectorRegistryService.enableConnectorConfig(id);
  }

  @Post('configs/:id/disable')
  @ApiOperation({ summary: 'Disable a connector configuration' })
  @ApiParam({ name: 'id', description: 'Configuration ID' })
  @ApiResponse({
    status: 200,
    description: 'Configuration disabled',
    type: ConnectorConfigResponseDto,
  })
  async disableConfig(@Param('id') id: string) {
    return this.connectorRegistryService.disableConnectorConfig(id);
  }

  @Post('configs/:id/test')
  @ApiOperation({ summary: 'Test connector connection' })
  @ApiParam({ name: 'id', description: 'Configuration ID' })
  @ApiResponse({ status: 200, description: 'Test result', type: ConnectionTestResultDto })
  async testConnection(@Param('id') id: string) {
    return this.connectorRegistryService.testConnection(id);
  }

  @Get('configs/:id/capabilities')
  @ApiOperation({ summary: 'Get enabled capabilities for a configuration' })
  @ApiParam({ name: 'id', description: 'Configuration ID' })
  @ApiResponse({ status: 200, description: 'Enabled capabilities', type: [CapabilityResponseDto] })
  async getEnabledCapabilities(@Param('id') id: string) {
    return this.connectorRegistryService.getEnabledCapabilities(id);
  }

  // ============================================
  // Execute Capability
  // ============================================

  @Post('execute')
  @ApiOperation({ summary: 'Execute a capability via connector' })
  @ApiResponse({ status: 200, description: 'Execution result' })
  async executeCapability(@Body() dto: ExecuteCapabilityDto) {
    return this.connectorRegistryService.executeCapability(dto);
  }

  // ============================================
  // Credential Vault Endpoints
  // ============================================

  @Post('credentials')
  @ApiOperation({ summary: 'Create credential vault entry' })
  @ApiResponse({
    status: 201,
    description: 'Credential created',
    type: CredentialVaultResponseDto,
  })
  async createCredential(@Body() dto: CreateCredentialDto) {
    return this.credentialVaultService.create({
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  @Get('credentials')
  @ApiOperation({ summary: 'List credential vault entries' })
  @ApiResponse({ status: 200, description: 'List of credentials' })
  async listCredentials(@Query() query: CredentialQueryDto) {
    return this.credentialVaultService.list(query);
  }

  @Get('credentials/:id')
  @ApiOperation({ summary: 'Get credential vault entry by ID' })
  @ApiParam({ name: 'id', description: 'Credential ID' })
  @ApiResponse({
    status: 200,
    description: 'Credential details (without decrypted data)',
    type: CredentialVaultResponseDto,
  })
  async getCredential(@Param('id') id: string) {
    return this.credentialVaultService.get(id);
  }

  @Put('credentials/:id')
  @ApiOperation({ summary: 'Update credential vault entry' })
  @ApiParam({ name: 'id', description: 'Credential ID' })
  @ApiResponse({
    status: 200,
    description: 'Credential updated',
    type: CredentialVaultResponseDto,
  })
  async updateCredential(@Param('id') id: string, @Body() dto: UpdateCredentialDto) {
    return this.credentialVaultService.update(id, {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  @Delete('credentials/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete credential vault entry' })
  @ApiParam({ name: 'id', description: 'Credential ID' })
  @ApiResponse({ status: 204, description: 'Credential deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete - in use by configurations' })
  async deleteCredential(@Param('id') id: string) {
    await this.credentialVaultService.delete(id);
  }

  @Post('credentials/:id/rotate')
  @ApiOperation({ summary: 'Rotate credentials' })
  @ApiParam({ name: 'id', description: 'Credential ID' })
  @ApiResponse({
    status: 200,
    description: 'Credentials rotated',
    type: CredentialVaultResponseDto,
  })
  async rotateCredential(@Param('id') id: string, @Body() dto: RotateCredentialDto) {
    return this.credentialVaultService.rotateCredentials(id, dto.credentials);
  }

  @Get('credentials/expiring')
  @ApiOperation({ summary: 'Get credentials expiring soon' })
  @ApiResponse({ status: 200, description: 'List of expiring credentials' })
  async getExpiringCredentials(
    @Query('tenantId') tenantId: string,
    @Query('withinDays') withinDays?: number,
  ) {
    return this.credentialVaultService.getExpiringCredentials(tenantId, withinDays ?? 7);
  }

  @Get('credentials/needs-rotation')
  @ApiOperation({ summary: 'Get credentials needing rotation' })
  @ApiResponse({ status: 200, description: 'List of credentials needing rotation' })
  async getCredentialsNeedingRotation(@Query('tenantId') tenantId: string) {
    return this.credentialVaultService.getCredentialsNeedingRotation(tenantId);
  }

  // ============================================
  // Event Endpoints
  // ============================================

  @Get('events')
  @ApiOperation({ summary: 'Get connector events' })
  @ApiResponse({ status: 200, description: 'List of events' })
  async getEvents(@Query() query: ConnectorEventQueryDto) {
    return this.connectorRegistryService.getConnectorEvents({
      ...query,
      since: query.since ? new Date(query.since) : undefined,
    });
  }
}
