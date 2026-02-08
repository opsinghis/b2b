import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * NetSuite Connection Configuration DTO
 */
export class NetSuiteConnectionConfigDto {
  @ApiProperty({ description: 'NetSuite Account ID', example: '1234567' })
  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @ApiPropertyOptional({
    description: 'NetSuite REST API Base URL',
    example: 'https://1234567.suitetalk.api.netsuite.com',
  })
  @IsString()
  @IsOptional()
  baseUrl?: string;

  @ApiPropertyOptional({
    description: 'API Version',
    example: 'v1',
    default: 'v1',
  })
  @IsString()
  @IsOptional()
  apiVersion?: string;

  @ApiPropertyOptional({
    description: 'Request timeout in milliseconds',
    example: 30000,
    default: 30000,
  })
  @IsNumber()
  @IsOptional()
  @Min(1000)
  @Max(120000)
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Number of retry attempts',
    example: 3,
    default: 3,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10)
  retryAttempts?: number;
}

/**
 * NetSuite TBA Credentials DTO
 */
export class NetSuiteCredentialsDto {
  @ApiProperty({ description: 'Consumer Key from NetSuite integration' })
  @IsString()
  @IsNotEmpty()
  consumerKey!: string;

  @ApiProperty({ description: 'Consumer Secret from NetSuite integration' })
  @IsString()
  @IsNotEmpty()
  consumerSecret!: string;

  @ApiProperty({ description: 'Token ID from NetSuite integration' })
  @IsString()
  @IsNotEmpty()
  tokenId!: string;

  @ApiProperty({ description: 'Token Secret from NetSuite integration' })
  @IsString()
  @IsNotEmpty()
  tokenSecret!: string;

  @ApiProperty({ description: 'NetSuite Account ID (realm)' })
  @IsString()
  @IsNotEmpty()
  realm!: string;
}

/**
 * Address DTO
 */
export class NetSuiteAddressDto {
  @ApiPropertyOptional({ description: 'Address line 1' })
  @IsString()
  @IsOptional()
  addr1?: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  @IsString()
  @IsOptional()
  addr2?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsString()
  @IsOptional()
  zip?: string;

  @ApiPropertyOptional({ description: 'Country code' })
  @IsString()
  @IsOptional()
  country?: string;
}

/**
 * Sales Order Line Item DTO
 */
export class NetSuiteSalesOrderItemDto {
  @ApiProperty({ description: 'Item internal ID' })
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @ApiProperty({ description: 'Quantity', example: 1 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Unit rate/price' })
  @IsNumber()
  @IsOptional()
  rate?: number;

  @ApiPropertyOptional({ description: 'Line description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Location internal ID' })
  @IsString()
  @IsOptional()
  location?: string;
}

/**
 * Create Sales Order DTO
 */
export class CreateNetSuiteSalesOrderDto {
  @ApiProperty({ description: 'Customer internal ID' })
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @ApiPropertyOptional({
    description: 'Order date in YYYY-MM-DD format',
    example: '2024-01-15',
  })
  @IsString()
  @IsOptional()
  orderDate?: string;

  @ApiPropertyOptional({ description: 'External reference ID' })
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiPropertyOptional({ description: 'Order memo/notes' })
  @IsString()
  @IsOptional()
  memo?: string;

  @ApiPropertyOptional({ description: 'Terms internal ID' })
  @IsString()
  @IsOptional()
  terms?: string;

  @ApiPropertyOptional({ description: 'Ship method internal ID' })
  @IsString()
  @IsOptional()
  shipMethod?: string;

  @ApiPropertyOptional({ type: NetSuiteAddressDto })
  @ValidateNested()
  @Type(() => NetSuiteAddressDto)
  @IsOptional()
  billingAddress?: NetSuiteAddressDto;

  @ApiPropertyOptional({ type: NetSuiteAddressDto })
  @ValidateNested()
  @Type(() => NetSuiteAddressDto)
  @IsOptional()
  shippingAddress?: NetSuiteAddressDto;

  @ApiProperty({ type: [NetSuiteSalesOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NetSuiteSalesOrderItemDto)
  items!: NetSuiteSalesOrderItemDto[];

  @ApiPropertyOptional({ description: 'Custom field values' })
  @IsObject()
  @IsOptional()
  customFields?: Record<string, unknown>;
}

/**
 * Customer Address DTO
 */
export class NetSuiteCustomerAddressDto extends NetSuiteAddressDto {
  @ApiPropertyOptional({ description: 'Address label' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ description: 'Is default shipping address' })
  @IsBoolean()
  @IsOptional()
  defaultShipping?: boolean;

  @ApiPropertyOptional({ description: 'Is default billing address' })
  @IsBoolean()
  @IsOptional()
  defaultBilling?: boolean;
}

/**
 * Create Customer DTO
 */
export class CreateNetSuiteCustomerDto {
  @ApiPropertyOptional({ description: 'Company name (for company customers)' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ description: 'First name (for individual customers)' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name (for individual customers)' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Is this an individual (true) or company (false)' })
  @IsBoolean()
  @IsOptional()
  isPerson?: boolean;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'External reference ID' })
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiPropertyOptional({ description: 'Subsidiary internal ID' })
  @IsString()
  @IsOptional()
  subsidiary?: string;

  @ApiPropertyOptional({ description: 'Currency internal ID' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Terms internal ID' })
  @IsString()
  @IsOptional()
  terms?: string;

  @ApiPropertyOptional({ description: 'Price level internal ID' })
  @IsString()
  @IsOptional()
  priceLevel?: string;

  @ApiPropertyOptional({ description: 'Credit limit' })
  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @ApiPropertyOptional({ type: [NetSuiteCustomerAddressDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NetSuiteCustomerAddressDto)
  @IsOptional()
  addresses?: NetSuiteCustomerAddressDto[];

  @ApiPropertyOptional({ description: 'Custom field values' })
  @IsObject()
  @IsOptional()
  customFields?: Record<string, unknown>;
}

/**
 * Inventory Check Request DTO
 */
export class NetSuiteInventoryCheckDto {
  @ApiProperty({ description: 'Item internal ID' })
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @ApiPropertyOptional({ description: 'Location internal ID' })
  @IsString()
  @IsOptional()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Subsidiary internal ID' })
  @IsString()
  @IsOptional()
  subsidiaryId?: string;
}

/**
 * Search Filter DTO
 */
export class NetSuiteSearchFilterDto {
  @ApiProperty({ description: 'Field name' })
  @IsString()
  @IsNotEmpty()
  field!: string;

  @ApiProperty({ description: 'Operator (is, anyof, contains, etc.)' })
  @IsString()
  @IsNotEmpty()
  operator!: string;

  @ApiProperty({ description: 'Filter value(s)' })
  value!: string | string[];
}

/**
 * Execute Saved Search DTO
 */
export class ExecuteNetSuiteSavedSearchDto {
  @ApiPropertyOptional({ description: 'Saved search internal ID' })
  @IsString()
  @IsOptional()
  searchId?: string;

  @ApiPropertyOptional({ description: 'Record type for ad-hoc search' })
  @IsString()
  @IsOptional()
  recordType?: string;

  @ApiPropertyOptional({ type: [NetSuiteSearchFilterDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NetSuiteSearchFilterDto)
  @IsOptional()
  filters?: NetSuiteSearchFilterDto[];

  @ApiPropertyOptional({ description: 'Columns to return' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  columns?: string[];

  @ApiPropertyOptional({ description: 'Page size', default: 100 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Page index (0-based)', default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  pageIndex?: number;
}

/**
 * Sync Parameters DTO
 */
export class NetSuiteSyncParamsDto {
  @ApiPropertyOptional({ description: 'Last sync timestamp' })
  @IsString()
  @IsOptional()
  lastSyncDate?: string;

  @ApiPropertyOptional({ description: 'Include inactive records' })
  @IsBoolean()
  @IsOptional()
  includeInactive?: boolean;

  @ApiPropertyOptional({ description: 'Subsidiary filter' })
  @IsString()
  @IsOptional()
  subsidiaryId?: string;

  @ApiPropertyOptional({ description: 'Page offset' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: 'Page limit' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000)
  limit?: number;
}
