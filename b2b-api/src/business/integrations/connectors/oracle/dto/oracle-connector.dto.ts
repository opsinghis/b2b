import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  ValidateNested,
  IsDateString,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OracleAuthType } from '../interfaces';

/**
 * Oracle connection configuration DTO
 */
export class OracleConnectionConfigDto {
  @ApiProperty({ description: 'Oracle ERP Cloud instance URL' })
  @IsString()
  @IsNotEmpty()
  instanceUrl!: string;

  @ApiProperty({ description: 'Authentication type', enum: ['oauth2', 'basic_auth'] })
  @IsEnum(['oauth2', 'basic_auth'])
  authType!: OracleAuthType;

  @ApiPropertyOptional({ description: 'API version' })
  @IsOptional()
  @IsString()
  apiVersion?: string;

  @ApiPropertyOptional({ description: 'Request timeout in milliseconds' })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({ description: 'Enable logging' })
  @IsOptional()
  @IsBoolean()
  logging?: boolean;

  @ApiPropertyOptional({ description: 'Default business unit' })
  @IsOptional()
  @IsString()
  defaultBusinessUnit?: string;

  @ApiPropertyOptional({ description: 'Default currency code' })
  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @ApiPropertyOptional({ description: 'Default legal entity' })
  @IsOptional()
  @IsString()
  defaultLegalEntity?: string;
}

/**
 * OAuth2 credentials DTO
 */
export class OracleOAuth2CredentialsDto {
  @ApiProperty({ description: 'OAuth2 client ID' })
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @ApiProperty({ description: 'OAuth2 client secret' })
  @IsString()
  @IsNotEmpty()
  clientSecret!: string;

  @ApiProperty({ description: 'OAuth2 token endpoint' })
  @IsString()
  @IsNotEmpty()
  tokenEndpoint!: string;

  @ApiPropertyOptional({ description: 'OAuth2 scopes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}

/**
 * Basic auth credentials DTO
 */
export class OracleBasicAuthCredentialsDto {
  @ApiProperty({ description: 'Username' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

/**
 * Address input DTO
 */
export class OracleAddressInputDto {
  @ApiProperty({ description: 'Address line 1' })
  @IsString()
  @IsNotEmpty()
  address1!: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  @IsOptional()
  @IsString()
  address2?: string;

  @ApiPropertyOptional({ description: 'Address line 3' })
  @IsOptional()
  @IsString()
  address3?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ description: 'Postal code' })
  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @ApiProperty({ description: 'Country code' })
  @IsString()
  @IsNotEmpty()
  country!: string;
}

/**
 * Create sales order line DTO
 */
export class CreateOracleSalesOrderLineDto {
  @ApiProperty({ description: 'Item number (SKU)' })
  @IsString()
  @IsNotEmpty()
  itemNumber!: string;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Unit of measure code' })
  @IsOptional()
  @IsString()
  uomCode?: string;

  @ApiPropertyOptional({ description: 'Unit selling price override' })
  @IsOptional()
  @IsNumber()
  unitSellingPrice?: number;

  @ApiPropertyOptional({ description: 'Requested ship date' })
  @IsOptional()
  @IsDateString()
  requestedShipDate?: string;

  @ApiPropertyOptional({ description: 'Requested fulfillment date' })
  @IsOptional()
  @IsDateString()
  requestedFulfillmentDate?: string;

  @ApiPropertyOptional({ description: 'Ship-to party ID' })
  @IsOptional()
  @IsNumber()
  shipToPartyId?: number;
}

/**
 * Create sales order DTO
 */
export class CreateOracleSalesOrderDto {
  @ApiProperty({ description: 'Source transaction number (your order ID)' })
  @IsString()
  @IsNotEmpty()
  sourceTransactionNumber!: string;

  @ApiPropertyOptional({ description: 'Source system identifier' })
  @IsOptional()
  @IsString()
  sourceTransactionSystem?: string;

  @ApiProperty({ description: 'Customer account ID or number' })
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @ApiPropertyOptional({ description: 'Buying party ID' })
  @IsOptional()
  @IsNumber()
  buyingPartyId?: number;

  @ApiPropertyOptional({ description: 'Business unit ID' })
  @IsOptional()
  @IsNumber()
  businessUnitId?: number;

  @ApiPropertyOptional({ description: 'Requested ship date' })
  @IsOptional()
  @IsDateString()
  requestedShipDate?: string;

  @ApiPropertyOptional({ description: 'Requested fulfillment date' })
  @IsOptional()
  @IsDateString()
  requestedFulfillmentDate?: string;

  @ApiPropertyOptional({ description: 'Customer PO number' })
  @IsOptional()
  @IsString()
  customerPONumber?: string;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiProperty({ description: 'Order lines', type: [CreateOracleSalesOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOracleSalesOrderLineDto)
  lines!: CreateOracleSalesOrderLineDto[];

  @ApiPropertyOptional({ description: 'Ship-to party ID' })
  @IsOptional()
  @IsNumber()
  shipToPartyId?: number;

  @ApiPropertyOptional({ description: 'Ship-to address', type: OracleAddressInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OracleAddressInputDto)
  shipToAddress?: OracleAddressInputDto;

  @ApiPropertyOptional({ description: 'Bill-to customer account ID' })
  @IsOptional()
  @IsNumber()
  billToAccountId?: number;
}

/**
 * Create customer DTO
 */
export class CreateOracleCustomerDto {
  @ApiProperty({ description: 'Customer/Party name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Customer type' })
  @IsOptional()
  @IsString()
  customerType?: string;

  @ApiPropertyOptional({ description: 'Customer classification code' })
  @IsOptional()
  @IsString()
  customerClassCode?: string;

  @ApiPropertyOptional({ description: 'Tax ID' })
  @IsOptional()
  @IsString()
  taxpayerIdentificationNumber?: string;

  @ApiPropertyOptional({ description: 'Primary email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Primary phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional({ description: 'Payment terms code' })
  @IsOptional()
  @IsString()
  paymentTermsCode?: string;

  @ApiPropertyOptional({ description: 'Credit limit' })
  @IsOptional()
  @IsNumber()
  creditLimit?: number;

  @ApiPropertyOptional({ description: 'Primary address', type: OracleAddressInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OracleAddressInputDto)
  address?: OracleAddressInputDto;
}

/**
 * List sales orders query DTO
 */
export class ListOracleSalesOrdersQueryDto {
  @ApiPropertyOptional({ description: 'Customer account ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Order status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Created after date' })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'Created before date' })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional({ description: 'Limit results' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: 'Include line items' })
  @IsOptional()
  @IsBoolean()
  includeLines?: boolean;
}

/**
 * List customers query DTO
 */
export class ListOracleCustomersQueryDto {
  @ApiPropertyOptional({ description: 'Customer status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Customer type' })
  @IsOptional()
  @IsString()
  customerType?: string;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  nameContains?: string;

  @ApiPropertyOptional({ description: 'Limit results' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

/**
 * List items query DTO
 */
export class ListOracleItemsQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsNumber()
  organizationId?: number;

  @ApiPropertyOptional({ description: 'Item status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Item type' })
  @IsOptional()
  @IsString()
  itemType?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  searchTerm?: string;

  @ApiPropertyOptional({ description: 'Limit results' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

/**
 * List invoices query DTO
 */
export class ListOracleInvoicesQueryDto {
  @ApiPropertyOptional({ description: 'Customer account ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Invoice status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Created after date' })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'Created before date' })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional({ description: 'Limit results' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: 'Include line items' })
  @IsOptional()
  @IsBoolean()
  includeLines?: boolean;
}
