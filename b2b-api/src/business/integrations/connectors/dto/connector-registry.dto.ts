import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  IsEnum,
  IsBoolean,
  IsArray,
  Min,
  Max,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IntegrationConnectorType,
  IntegrationDirection,
  CredentialType,
  CapabilityCategory,
  ConnectorTestStatus,
  ConnectorEventType,
} from '@prisma/client';

// ============================================
// Connector Registration DTOs
// ============================================

export class RegisterConnectorDto {
  @ApiProperty({ description: 'Unique connector code' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Connector name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Connector description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: IntegrationConnectorType })
  @IsEnum(IntegrationConnectorType)
  type!: IntegrationConnectorType;

  @ApiProperty({ enum: IntegrationDirection })
  @IsEnum(IntegrationDirection)
  direction!: IntegrationDirection;

  @ApiPropertyOptional({ description: 'Plugin path for dynamic loading' })
  @IsOptional()
  @IsString()
  pluginPath?: string;

  @ApiPropertyOptional({ description: 'Plugin version' })
  @IsOptional()
  @IsString()
  pluginVersion?: string;

  @ApiPropertyOptional({ description: 'Is built-in connector', default: false })
  @IsOptional()
  @IsBoolean()
  isBuiltIn?: boolean;

  @ApiPropertyOptional({ description: 'Default configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Configuration schema (JSON Schema)' })
  @IsOptional()
  @IsObject()
  configSchema?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Declared capability codes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declaredCapabilities?: string[];

  @ApiPropertyOptional({ description: 'Rate limit (requests per window)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimit?: number;

  @ApiPropertyOptional({ description: 'Rate limit window in seconds' })
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimitWindow?: number;

  @ApiPropertyOptional({ description: 'Failure threshold for circuit breaker', default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  failureThreshold?: number;

  @ApiPropertyOptional({ description: 'Success threshold to close circuit', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  successThreshold?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateConnectorRegistrationDto extends PartialType(RegisterConnectorDto) {
  @ApiPropertyOptional({ description: 'Is connector active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ConnectorQueryDto {
  @ApiPropertyOptional({ enum: IntegrationConnectorType })
  @IsOptional()
  @IsEnum(IntegrationConnectorType)
  type?: IntegrationConnectorType;

  @ApiPropertyOptional({ enum: IntegrationDirection })
  @IsOptional()
  @IsEnum(IntegrationDirection)
  direction?: IntegrationDirection;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by built-in status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isBuiltIn?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

// ============================================
// Connector Configuration DTOs
// ============================================

export class ConfigureConnectorDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsString()
  tenantId!: string;

  @ApiProperty({ description: 'Connector ID' })
  @IsString()
  connectorId!: string;

  @ApiProperty({ description: 'Configuration name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Configuration description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is configuration active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is primary configuration', default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Configuration settings' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Credential vault ID' })
  @IsOptional()
  @IsString()
  credentialVaultId?: string;

  @ApiPropertyOptional({ description: 'Enabled capability codes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledCapabilities?: string[];

  @ApiPropertyOptional({ description: 'Webhook URL for callbacks' })
  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'Webhook secret for signature verification' })
  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @ApiPropertyOptional({ description: 'Webhook event types to receive' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  webhookEvents?: string[];

  @ApiPropertyOptional({ description: 'Rate limit override' })
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimit?: number;

  @ApiPropertyOptional({ description: 'Rate limit window override (seconds)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimitWindow?: number;

  @ApiPropertyOptional({ description: 'Transformation overrides' })
  @IsOptional()
  @IsObject()
  transformationOverrides?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateConnectorConfigDto extends PartialType(ConfigureConnectorDto) {}

export class ConnectorConfigQueryDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsString()
  tenantId!: string;

  @ApiPropertyOptional({ description: 'Filter by connector ID' })
  @IsOptional()
  @IsString()
  connectorId?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

// ============================================
// Credential Vault DTOs
// ============================================

export class CreateCredentialDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsString()
  tenantId!: string;

  @ApiProperty({ description: 'Credential name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Credential description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CredentialType })
  @IsEnum(CredentialType)
  type!: CredentialType;

  @ApiProperty({ description: 'Credential data (will be encrypted)' })
  @IsObject()
  credentials!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Rotation policy' })
  @IsOptional()
  @IsObject()
  rotationPolicy?: {
    enabled: boolean;
    intervalDays: number;
    autoRotate: boolean;
    notifyBeforeDays?: number;
  };

  @ApiPropertyOptional({ description: 'Access policy' })
  @IsOptional()
  @IsObject()
  accessPolicy?: {
    allowedConnectors?: string[];
    allowedUsers?: string[];
    allowedRoles?: string[];
    maxAccessCount?: number;
    ipWhitelist?: string[];
  };

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateCredentialDto extends PartialType(CreateCredentialDto) {}

export class CredentialQueryDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsString()
  tenantId!: string;

  @ApiPropertyOptional({ enum: CredentialType })
  @IsOptional()
  @IsEnum(CredentialType)
  type?: CredentialType;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Include expired credentials', default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeExpired?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class RotateCredentialDto {
  @ApiProperty({ description: 'New credential data (will be encrypted)' })
  @IsObject()
  credentials!: Record<string, unknown>;
}

// ============================================
// Capability DTOs
// ============================================

export class DeclareCapabilityDto {
  @ApiProperty({ description: 'Capability code' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Capability name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Capability description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CapabilityCategory })
  @IsEnum(CapabilityCategory)
  category!: CapabilityCategory;

  @ApiPropertyOptional({ description: 'Input schema (JSON Schema)' })
  @IsOptional()
  @IsObject()
  inputSchema?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Output schema (JSON Schema)' })
  @IsOptional()
  @IsObject()
  outputSchema?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Configuration schema (JSON Schema)' })
  @IsOptional()
  @IsObject()
  configSchema?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Required OAuth scopes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredScopes?: string[];

  @ApiPropertyOptional({ description: 'Required permissions' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredPermissions?: string[];

  @ApiPropertyOptional({ description: 'Is optional capability', default: true })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;
}

export class DeclareCapabilitiesDto {
  @ApiProperty({ type: [DeclareCapabilityDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeclareCapabilityDto)
  capabilities!: DeclareCapabilityDto[];
}

// ============================================
// Execute Capability DTO
// ============================================

export class ExecuteCapabilityDto {
  @ApiProperty({ description: 'Connector configuration ID' })
  @IsString()
  configId!: string;

  @ApiProperty({ description: 'Capability code to execute' })
  @IsString()
  capability!: string;

  @ApiProperty({ description: 'Capability input data' })
  @IsObject()
  input!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Correlation ID for tracing' })
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiPropertyOptional({ description: 'User ID for audit' })
  @IsOptional()
  @IsString()
  userId?: string;
}

// ============================================
// Event Query DTO
// ============================================

export class ConnectorEventQueryDto {
  @ApiPropertyOptional({ description: 'Filter by connector code' })
  @IsOptional()
  @IsString()
  connectorCode?: string;

  @ApiPropertyOptional({ description: 'Filter by config ID' })
  @IsOptional()
  @IsString()
  configId?: string;

  @ApiPropertyOptional({ description: 'Filter by tenant ID' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: ConnectorEventType })
  @IsOptional()
  @IsEnum(ConnectorEventType)
  eventType?: ConnectorEventType;

  @ApiPropertyOptional({ description: 'Filter events since date' })
  @IsOptional()
  @IsDateString()
  since?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

// ============================================
// Response DTOs
// ============================================

export class ConnectionTestResultDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional()
  latencyMs?: number;

  @ApiPropertyOptional()
  details?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String] })
  capabilities?: string[];

  @ApiPropertyOptional({ type: [String] })
  errors?: string[];
}

export class ConnectorResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: IntegrationConnectorType })
  type!: IntegrationConnectorType;

  @ApiProperty({ enum: IntegrationDirection })
  direction!: IntegrationDirection;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isBuiltIn!: boolean;

  @ApiPropertyOptional()
  pluginPath?: string;

  @ApiPropertyOptional()
  pluginVersion?: string;

  @ApiProperty()
  config!: Record<string, unknown>;

  @ApiPropertyOptional()
  configSchema?: Record<string, unknown>;

  @ApiProperty({ type: [String] })
  declaredCapabilities!: string[];

  @ApiPropertyOptional()
  rateLimit?: number;

  @ApiPropertyOptional()
  rateLimitWindow?: number;

  @ApiProperty()
  failureThreshold!: number;

  @ApiProperty()
  successThreshold!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ConnectorConfigResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isPrimary!: boolean;

  @ApiProperty()
  config!: Record<string, unknown>;

  @ApiPropertyOptional()
  credentialVaultId?: string;

  @ApiProperty({ type: [String] })
  enabledCapabilities!: string[];

  @ApiPropertyOptional()
  webhookUrl?: string;

  @ApiProperty({ type: [String] })
  webhookEvents!: string[];

  @ApiPropertyOptional()
  lastTestedAt?: Date;

  @ApiPropertyOptional({ enum: ConnectorTestStatus })
  lastTestResult?: ConnectorTestStatus;

  @ApiPropertyOptional()
  lastTestError?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CredentialVaultResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: CredentialType })
  type!: CredentialType;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiPropertyOptional()
  rotatedAt?: Date;

  @ApiPropertyOptional()
  lastAccessedAt?: Date;

  @ApiProperty()
  accessCount!: number;

  @ApiPropertyOptional()
  rotationPolicy?: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CapabilityResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: CapabilityCategory })
  category!: CapabilityCategory;

  @ApiPropertyOptional()
  inputSchema?: Record<string, unknown>;

  @ApiPropertyOptional()
  outputSchema?: Record<string, unknown>;

  @ApiPropertyOptional()
  configSchema?: Record<string, unknown>;

  @ApiProperty({ type: [String] })
  requiredScopes!: string[];

  @ApiProperty({ type: [String] })
  requiredPermissions!: string[];

  @ApiProperty()
  isOptional!: boolean;

  @ApiProperty()
  isDeprecated!: boolean;

  @ApiPropertyOptional()
  deprecatedMessage?: string;
}
