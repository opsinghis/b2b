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

export enum DynamicsAuthTypeDto {
  AZURE_AD = 'azure_ad',
  CLIENT_CREDENTIALS = 'client_credentials',
  ON_BEHALF_OF = 'on_behalf_of',
}

export class DynamicsConnectionConfigDto {
  @ApiProperty({ description: 'Dynamics 365 organization URL' })
  @IsString()
  @IsNotEmpty()
  organizationUrl!: string;

  @ApiProperty({ description: 'Azure AD tenant ID' })
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @ApiProperty({ enum: DynamicsAuthTypeDto, description: 'Authentication type' })
  @IsEnum(DynamicsAuthTypeDto)
  authType!: DynamicsAuthTypeDto;

  @ApiPropertyOptional({ description: 'Web API version', default: 'v9.2' })
  @IsString()
  @IsOptional()
  apiVersion?: string;

  @ApiPropertyOptional({ description: 'Request timeout in ms', default: 30000 })
  @IsNumber()
  @IsOptional()
  @Min(5000)
  @Max(120000)
  timeout?: number;

  @ApiPropertyOptional({ description: 'Default price level/list ID' })
  @IsString()
  @IsOptional()
  defaultPriceLevelId?: string;

  @ApiPropertyOptional({ description: 'Default transaction currency ID' })
  @IsString()
  @IsOptional()
  defaultCurrency?: string;
}

// ==================== Address DTOs ====================

export class DynamicsAddressInputDto {
  @ApiProperty({ description: 'Address line 1' })
  @IsString()
  @IsNotEmpty()
  line1!: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  @IsString()
  @IsOptional()
  line2?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  @IsString()
  @IsOptional()
  stateOrProvince?: string;

  @ApiProperty({ description: 'Postal code' })
  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  @IsNotEmpty()
  country!: string;
}

// ==================== Sales Order DTOs ====================

export class DynamicsSalesOrderItemInputDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Unit of measure ID' })
  @IsString()
  @IsOptional()
  uomId?: string;

  @ApiPropertyOptional({ description: 'Override price per unit' })
  @IsNumber()
  @IsOptional()
  pricePerUnit?: number;

  @ApiPropertyOptional({ description: 'Manual discount amount' })
  @IsNumber()
  @IsOptional()
  manualDiscountAmount?: number;

  @ApiPropertyOptional({ description: 'Product description (for write-in items)' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Requested delivery date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  requestDeliveryBy?: string;
}

export class CreateDynamicsSalesOrderDto {
  @ApiProperty({ description: 'Order name/number' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Customer ID (account or contact)' })
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ description: 'Customer type', enum: ['account', 'contact'] })
  @IsString()
  @IsNotEmpty()
  customerType!: 'account' | 'contact';

  @ApiPropertyOptional({ description: 'Price level/list ID' })
  @IsString()
  @IsOptional()
  priceLevelId?: string;

  @ApiPropertyOptional({ description: 'Transaction currency ID' })
  @IsString()
  @IsOptional()
  currencyId?: string;

  @ApiPropertyOptional({ description: 'Requested delivery date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  requestDeliveryBy?: string;

  @ApiPropertyOptional({ description: 'Order description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: DynamicsAddressInputDto, description: 'Bill-to address' })
  @ValidateNested()
  @Type(() => DynamicsAddressInputDto)
  @IsOptional()
  billToAddress?: DynamicsAddressInputDto;

  @ApiPropertyOptional({ type: DynamicsAddressInputDto, description: 'Ship-to address' })
  @ValidateNested()
  @Type(() => DynamicsAddressInputDto)
  @IsOptional()
  shipToAddress?: DynamicsAddressInputDto;

  @ApiProperty({ type: [DynamicsSalesOrderItemInputDto], description: 'Order items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DynamicsSalesOrderItemInputDto)
  items!: DynamicsSalesOrderItemInputDto[];
}

export class ListDynamicsSalesOrdersQueryDto {
  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Customer type', enum: ['account', 'contact'] })
  @IsString()
  @IsOptional()
  customerType?: 'account' | 'contact';

  @ApiPropertyOptional({ description: 'Filter from date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter to date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'State code (0=Active, 1=Submitted, 2=Canceled, 3=Fulfilled, 4=Invoiced)',
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  stateCode?: number;

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

// ==================== Account DTOs ====================

export class CreateDynamicsAccountDto {
  @ApiProperty({ description: 'Account name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Account number' })
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Primary contact ID' })
  @IsString()
  @IsOptional()
  primaryContactId?: string;

  @ApiPropertyOptional({ description: 'Parent account ID' })
  @IsString()
  @IsOptional()
  parentAccountId?: string;

  @ApiPropertyOptional({ type: DynamicsAddressInputDto, description: 'Primary address' })
  @ValidateNested()
  @Type(() => DynamicsAddressInputDto)
  @IsOptional()
  address?: DynamicsAddressInputDto;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: 'Industry code' })
  @IsNumber()
  @IsOptional()
  industryCode?: number;

  @ApiPropertyOptional({ description: 'Credit limit' })
  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @ApiPropertyOptional({ description: 'Payment terms code' })
  @IsNumber()
  @IsOptional()
  paymentTermsCode?: number;

  @ApiPropertyOptional({ description: 'Transaction currency ID' })
  @IsString()
  @IsOptional()
  currencyId?: string;
}

export class ListDynamicsAccountsQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  searchTerm?: string;

  @ApiPropertyOptional({ description: 'Industry code' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  industryCode?: number;

  @ApiPropertyOptional({ description: 'State code (0=Active, 1=Inactive)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  stateCode?: number;

  @ApiPropertyOptional({ description: 'Parent account ID' })
  @IsString()
  @IsOptional()
  parentAccountId?: string;

  @ApiPropertyOptional({ description: 'Include contacts', default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeContacts?: boolean;

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

// ==================== Contact DTOs ====================

export class CreateDynamicsContactDto {
  @ApiProperty({ description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Business phone' })
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiPropertyOptional({ description: 'Mobile phone' })
  @IsString()
  @IsOptional()
  mobile?: string;

  @ApiPropertyOptional({ description: 'Job title' })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'Parent account ID' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ type: DynamicsAddressInputDto, description: 'Address' })
  @ValidateNested()
  @Type(() => DynamicsAddressInputDto)
  @IsOptional()
  address?: DynamicsAddressInputDto;
}

export class ListDynamicsContactsQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  searchTerm?: string;

  @ApiPropertyOptional({ description: 'Parent account ID' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ description: 'State code (0=Active, 1=Inactive)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  stateCode?: number;

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

export class ListDynamicsProductsQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  searchTerm?: string;

  @ApiPropertyOptional({ description: 'Product type code' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  productType?: number;

  @ApiPropertyOptional({ description: 'Product structure (1=Product, 2=Family, 3=Bundle)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  productStructure?: number;

  @ApiPropertyOptional({ description: 'State code (0=Active, 1=Inactive)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  stateCode?: number;

  @ApiPropertyOptional({ description: 'Include default UoM', default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeDefaultUom?: boolean;

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

// ==================== Invoice DTOs ====================

export class ListDynamicsInvoicesQueryDto {
  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filter by sales order ID' })
  @IsString()
  @IsOptional()
  salesOrderId?: string;

  @ApiPropertyOptional({ description: 'Filter from date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter to date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({ description: 'State code (0=Active, 1=Closed, 2=Paid, 3=Canceled)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  stateCode?: number;

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

// ==================== Price Level DTOs ====================

export class ListDynamicsPriceLevelsQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  searchTerm?: string;

  @ApiPropertyOptional({ description: 'Active only', default: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  activeOnly?: boolean;

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

// ==================== Response DTOs ====================

export class DynamicsSalesOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderNumber!: string;
  @ApiProperty() status!: string;
  @ApiProperty() customerId!: string;
  @ApiPropertyOptional() orderDate?: string;
  @ApiPropertyOptional() requestedDeliveryDate?: string;
  @ApiProperty() currency!: string;
  @ApiProperty() total!: number;
  @ApiPropertyOptional() items?: unknown[];
  @ApiPropertyOptional() metadata?: Record<string, unknown>;
}

export class DynamicsAccountResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() accountNumber?: string;
  @ApiProperty() type!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() phone?: string;
  @ApiPropertyOptional() addresses?: unknown[];
  @ApiPropertyOptional() metadata?: Record<string, unknown>;
}

export class DynamicsProductResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() type!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() price?: number;
  @ApiPropertyOptional() unit?: string;
  @ApiPropertyOptional() metadata?: Record<string, unknown>;
}

export class DynamicsInvoiceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() invoiceNumber!: string;
  @ApiProperty() status!: string;
  @ApiProperty() customerId!: string;
  @ApiPropertyOptional() orderId?: string;
  @ApiPropertyOptional() invoiceDate?: string;
  @ApiPropertyOptional() dueDate?: string;
  @ApiProperty() currency!: string;
  @ApiProperty() total!: number;
  @ApiPropertyOptional() items?: unknown[];
  @ApiPropertyOptional() metadata?: Record<string, unknown>;
}

export class DynamicsListResponseDto<T> {
  @ApiProperty() items!: T[];
  @ApiPropertyOptional() total?: number;
  @ApiProperty() hasMore!: boolean;
}
