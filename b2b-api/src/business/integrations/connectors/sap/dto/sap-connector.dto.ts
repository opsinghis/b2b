import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== Configuration DTOs ====================

export enum SapAuthTypeDto {
  BASIC = 'basic',
  OAUTH2 = 'oauth2',
}

export class SapConnectionConfigDto {
  @ApiProperty({ description: 'SAP S/4HANA base URL' })
  @IsString()
  @IsNotEmpty()
  baseUrl!: string;

  @ApiPropertyOptional({ description: 'SAP client number (e.g., 100)' })
  @IsString()
  @IsOptional()
  client?: string;

  @ApiPropertyOptional({ description: 'Language code (e.g., EN)', default: 'EN' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({ enum: SapAuthTypeDto, description: 'Authentication type' })
  @IsEnum(SapAuthTypeDto)
  authType!: SapAuthTypeDto;

  @ApiPropertyOptional({ description: 'Request timeout in ms', default: 30000 })
  @IsNumber()
  @IsOptional()
  @Min(5000)
  @Max(120000)
  timeout?: number;

  @ApiPropertyOptional({ description: 'Default sales organization' })
  @IsString()
  @IsOptional()
  salesOrganization?: string;

  @ApiPropertyOptional({ description: 'Default distribution channel' })
  @IsString()
  @IsOptional()
  distributionChannel?: string;

  @ApiPropertyOptional({ description: 'Default division' })
  @IsString()
  @IsOptional()
  division?: string;

  @ApiPropertyOptional({ description: 'Default plant' })
  @IsString()
  @IsOptional()
  defaultPlant?: string;
}

// ==================== Sales Order DTOs ====================

export class SapSalesOrderItemInputDto {
  @ApiProperty({ description: 'Material number' })
  @IsString()
  @IsNotEmpty()
  material!: string;

  @ApiProperty({ description: 'Requested quantity' })
  @IsNumber()
  @Min(0.001)
  requestedQuantity!: number;

  @ApiProperty({ description: 'Unit of measure' })
  @IsString()
  @IsNotEmpty()
  requestedQuantityUnit!: string;

  @ApiPropertyOptional({ description: 'Plant for delivery' })
  @IsString()
  @IsOptional()
  plant?: string;

  @ApiPropertyOptional({ description: 'Customer material number' })
  @IsString()
  @IsOptional()
  customerMaterial?: string;
}

export class CreateSapSalesOrderDto {
  @ApiProperty({ description: 'Sales order type (e.g., OR)', default: 'OR' })
  @IsString()
  @IsNotEmpty()
  salesOrderType!: string;

  @ApiProperty({ description: 'Sales organization' })
  @IsString()
  @IsNotEmpty()
  salesOrganization!: string;

  @ApiProperty({ description: 'Distribution channel' })
  @IsString()
  @IsNotEmpty()
  distributionChannel!: string;

  @ApiProperty({ description: 'Division' })
  @IsString()
  @IsNotEmpty()
  division!: string;

  @ApiProperty({ description: 'Sold-to party (customer)' })
  @IsString()
  @IsNotEmpty()
  soldToParty!: string;

  @ApiPropertyOptional({ description: 'Customer PO reference' })
  @IsString()
  @IsOptional()
  purchaseOrderByCustomer?: string;

  @ApiPropertyOptional({ description: 'Requested delivery date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  requestedDeliveryDate?: string;

  @ApiProperty({ type: [SapSalesOrderItemInputDto], description: 'Order items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SapSalesOrderItemInputDto)
  items!: SapSalesOrderItemInputDto[];
}

export class ListSapSalesOrdersQueryDto {
  @ApiPropertyOptional({ description: 'Filter by customer' })
  @IsString()
  @IsOptional()
  customer?: string;

  @ApiPropertyOptional({ description: 'Filter by sales organization' })
  @IsString()
  @IsOptional()
  salesOrganization?: string;

  @ApiPropertyOptional({ description: 'Filter from date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter to date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Filter by status (A=Not processed, B=Partial, C=Complete)' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Include line items', default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeItems?: boolean;

  @ApiPropertyOptional({ description: 'Max results', default: 100 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  top?: number;

  @ApiPropertyOptional({ description: 'Skip results', default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  skip?: number;
}

// ==================== Business Partner DTOs ====================

export class SapAddressInputDto {
  @ApiProperty({ description: 'Street name' })
  @IsString()
  @IsNotEmpty()
  streetName!: string;

  @ApiPropertyOptional({ description: 'House number' })
  @IsString()
  @IsOptional()
  houseNumber?: string;

  @ApiProperty({ description: 'Postal code' })
  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @ApiProperty({ description: 'City name' })
  @IsString()
  @IsNotEmpty()
  cityName!: string;

  @ApiPropertyOptional({ description: 'Region/State' })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({ description: 'Country code (ISO 2-letter)' })
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsString()
  @IsOptional()
  emailAddress?: string;
}

export class CreateSapBusinessPartnerDto {
  @ApiProperty({ description: 'BP category (1=Person, 2=Organization)' })
  @IsString()
  @IsNotEmpty()
  businessPartnerCategory!: string;

  @ApiPropertyOptional({ description: 'First name (for persons)' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name (for persons)' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Organization name line 1' })
  @IsString()
  @IsOptional()
  organizationName1?: string;

  @ApiPropertyOptional({ description: 'Organization name line 2' })
  @IsString()
  @IsOptional()
  organizationName2?: string;

  @ApiPropertyOptional({ description: 'Language code' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Tax number' })
  @IsString()
  @IsOptional()
  taxNumber1?: string;

  @ApiPropertyOptional({ description: 'VAT registration number' })
  @IsString()
  @IsOptional()
  vatRegistration?: string;

  @ApiPropertyOptional({ type: [SapAddressInputDto], description: 'Addresses' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SapAddressInputDto)
  @IsOptional()
  addresses?: SapAddressInputDto[];
}

export class ListSapBusinessPartnersQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  searchTerm?: string;

  @ApiPropertyOptional({ description: 'BP category (1=Person, 2=Organization)' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter customers only', default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isCustomer?: boolean;

  @ApiPropertyOptional({ description: 'Include addresses', default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeAddresses?: boolean;

  @ApiPropertyOptional({ description: 'Max results', default: 100 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  top?: number;

  @ApiPropertyOptional({ description: 'Skip results', default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  skip?: number;
}

// ==================== Product DTOs ====================

export class ListSapProductsQueryDto {
  @ApiPropertyOptional({ description: 'Product type' })
  @IsString()
  @IsOptional()
  productType?: string;

  @ApiPropertyOptional({ description: 'Product group' })
  @IsString()
  @IsOptional()
  productGroup?: string;

  @ApiPropertyOptional({ description: 'Division' })
  @IsString()
  @IsOptional()
  division?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  searchTerm?: string;

  @ApiPropertyOptional({ description: 'Language for descriptions' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Max results', default: 100 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  top?: number;

  @ApiPropertyOptional({ description: 'Skip results', default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  skip?: number;
}

// ==================== Billing Document DTOs ====================

export class ListSapBillingDocumentsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by customer' })
  @IsString()
  @IsOptional()
  customer?: string;

  @ApiPropertyOptional({ description: 'Document type (F2=Invoice, G2=Credit, L2=Debit)' })
  @IsString()
  @IsOptional()
  billingDocumentType?: string;

  @ApiPropertyOptional({ description: 'Filter from date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter to date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Include line items', default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeItems?: boolean;

  @ApiPropertyOptional({ description: 'Max results', default: 100 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  top?: number;

  @ApiPropertyOptional({ description: 'Skip results', default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  skip?: number;
}

// ==================== ATP DTOs ====================

export class CheckSapAtpDto {
  @ApiProperty({ description: 'Material number' })
  @IsString()
  @IsNotEmpty()
  material!: string;

  @ApiProperty({ description: 'Plant' })
  @IsString()
  @IsNotEmpty()
  plant!: string;

  @ApiProperty({ description: 'Requested quantity' })
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @ApiProperty({ description: 'Unit of measure' })
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiProperty({ description: 'Requested delivery date (YYYY-MM-DD)' })
  @IsDateString()
  requestedDate!: string;

  @ApiPropertyOptional({ description: 'Customer (for customer-specific ATP)' })
  @IsString()
  @IsOptional()
  customer?: string;

  @ApiPropertyOptional({ description: 'Sales organization' })
  @IsString()
  @IsOptional()
  salesOrganization?: string;

  @ApiPropertyOptional({ description: 'Distribution channel' })
  @IsString()
  @IsOptional()
  distributionChannel?: string;
}

// ==================== Response DTOs ====================

export class SapSalesOrderResponseDto {
  @ApiProperty() salesOrder!: string;
  @ApiProperty() salesOrderType!: string;
  @ApiProperty() status!: string;
  @ApiProperty() customerId!: string;
  @ApiPropertyOptional() customerPO?: string;
  @ApiPropertyOptional() orderDate?: string;
  @ApiPropertyOptional() requestedDeliveryDate?: string;
  @ApiProperty() currency!: string;
  @ApiProperty() totalAmount!: number;
  @ApiPropertyOptional() items?: any[];
  @ApiPropertyOptional() metadata?: Record<string, unknown>;
}

export class SapBusinessPartnerResponseDto {
  @ApiProperty() businessPartnerId!: string;
  @ApiProperty() type!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() firstName?: string;
  @ApiPropertyOptional() lastName?: string;
  @ApiPropertyOptional() taxId?: string;
  @ApiPropertyOptional() vatNumber?: string;
  @ApiPropertyOptional() addresses?: any[];
  @ApiPropertyOptional() metadata?: Record<string, unknown>;
}

export class SapProductResponseDto {
  @ApiProperty() productId!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() type?: string;
  @ApiPropertyOptional() category?: string;
  @ApiProperty() unit!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() metadata?: Record<string, unknown>;
}

export class SapAtpResponseDto {
  @ApiProperty() material!: string;
  @ApiProperty() plant!: string;
  @ApiProperty() availableQuantity!: number;
  @ApiProperty() unit!: string;
  @ApiProperty() availabilityDate!: string;
  @ApiProperty() isAvailable!: boolean;
  @ApiProperty() confirmedQuantity!: number;
  @ApiPropertyOptional() scheduleLines?: any[];
}

export class SapListResponseDto<T> {
  @ApiProperty() items!: T[];
  @ApiPropertyOptional() total?: number;
  @ApiProperty() hasMore!: boolean;
}
