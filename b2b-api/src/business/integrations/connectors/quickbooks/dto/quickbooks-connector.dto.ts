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
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * QuickBooks environment enum
 */
export enum QuickBooksEnvironmentDto {
  SANDBOX = 'sandbox',
  PRODUCTION = 'production',
}

/**
 * QuickBooks connection configuration DTO
 */
export class QuickBooksConnectionConfigDto {
  @ApiProperty({ description: 'QuickBooks Company ID (Realm ID)' })
  @IsString()
  realmId!: string;

  @ApiProperty({ enum: QuickBooksEnvironmentDto, description: 'QuickBooks environment' })
  @IsEnum(QuickBooksEnvironmentDto)
  environment!: QuickBooksEnvironmentDto;

  @ApiPropertyOptional({ description: 'Minor version for API requests (default: 65)' })
  @IsOptional()
  @IsNumber()
  minorVersion?: number;

  @ApiPropertyOptional({ description: 'Request timeout in milliseconds' })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({ description: 'Enable request/response logging' })
  @IsOptional()
  @IsBoolean()
  logging?: boolean;
}

/**
 * QuickBooks OAuth2 credentials DTO
 */
export class QuickBooksOAuth2CredentialsDto {
  @ApiProperty({ description: 'OAuth2 client ID' })
  @IsString()
  clientId!: string;

  @ApiProperty({ description: 'OAuth2 client secret' })
  @IsString()
  clientSecret!: string;

  @ApiProperty({ description: 'OAuth2 access token' })
  @IsString()
  accessToken!: string;

  @ApiProperty({ description: 'OAuth2 refresh token' })
  @IsString()
  refreshToken!: string;

  @ApiPropertyOptional({ description: 'Token expiry time (Unix timestamp in ms)' })
  @IsOptional()
  @IsNumber()
  expiresAt?: number;
}

/**
 * QuickBooks credentials DTO
 */
export class QuickBooksCredentialsDto {
  @ApiProperty({ type: QuickBooksOAuth2CredentialsDto })
  @ValidateNested()
  @Type(() => QuickBooksOAuth2CredentialsDto)
  oauth2!: QuickBooksOAuth2CredentialsDto;
}

/**
 * QuickBooks address DTO
 */
export class QuickBooksAddressDto {
  @ApiProperty({ description: 'Address line 1' })
  @IsString()
  line1!: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiPropertyOptional({ description: 'Address line 3' })
  @IsOptional()
  @IsString()
  line3?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;
}

/**
 * Create customer DTO
 */
export class CreateQuickBooksCustomerDto {
  @ApiProperty({ description: 'Display name (required, unique)' })
  @IsString()
  displayName!: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Primary phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Mobile phone' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ description: 'Website' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: QuickBooksAddressDto, description: 'Billing address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuickBooksAddressDto)
  billingAddress?: QuickBooksAddressDto;

  @ApiPropertyOptional({ type: QuickBooksAddressDto, description: 'Shipping address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuickBooksAddressDto)
  shippingAddress?: QuickBooksAddressDto;

  @ApiPropertyOptional({ description: 'Is taxable' })
  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @ApiPropertyOptional({ description: 'Payment terms reference ID' })
  @IsOptional()
  @IsString()
  paymentTermsId?: string;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;
}

/**
 * Item type enum
 */
export enum QuickBooksItemTypeDto {
  INVENTORY = 'Inventory',
  NON_INVENTORY = 'NonInventory',
  SERVICE = 'Service',
  GROUP = 'Group',
  CATEGORY = 'Category',
}

/**
 * Create item DTO
 */
export class CreateQuickBooksItemDto {
  @ApiProperty({ description: 'Item name (required, unique)' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: QuickBooksItemTypeDto, description: 'Item type' })
  @IsEnum(QuickBooksItemTypeDto)
  type!: QuickBooksItemTypeDto;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'SKU' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Unit price' })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Purchase cost' })
  @IsOptional()
  @IsNumber()
  purchaseCost?: number;

  @ApiPropertyOptional({ description: 'Purchase description' })
  @IsOptional()
  @IsString()
  purchaseDescription?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Is taxable' })
  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @ApiPropertyOptional({ description: 'Track quantity on hand' })
  @IsOptional()
  @IsBoolean()
  trackQtyOnHand?: boolean;

  @ApiPropertyOptional({ description: 'Quantity on hand (for inventory items)' })
  @IsOptional()
  @IsNumber()
  qtyOnHand?: number;

  @ApiPropertyOptional({ description: 'Inventory start date (for inventory items)' })
  @IsOptional()
  @IsDateString()
  invStartDate?: string;

  @ApiPropertyOptional({ description: 'Income account reference ID' })
  @IsOptional()
  @IsString()
  incomeAccountId?: string;

  @ApiPropertyOptional({ description: 'Expense account reference ID' })
  @IsOptional()
  @IsString()
  expenseAccountId?: string;

  @ApiPropertyOptional({ description: 'Asset account reference ID (for inventory items)' })
  @IsOptional()
  @IsString()
  assetAccountId?: string;
}

/**
 * Invoice line DTO
 */
export class QuickBooksInvoiceLineDto {
  @ApiPropertyOptional({ description: 'Item reference ID' })
  @IsOptional()
  @IsString()
  itemId?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Quantity' })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Unit price' })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Amount (calculated if not provided)' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ description: 'Service date' })
  @IsOptional()
  @IsDateString()
  serviceDate?: string;

  @ApiPropertyOptional({ description: 'Tax code reference ID' })
  @IsOptional()
  @IsString()
  taxCodeId?: string;
}

/**
 * Create invoice DTO
 */
export class CreateQuickBooksInvoiceDto {
  @ApiProperty({ description: 'Customer reference ID (required)' })
  @IsString()
  customerId!: string;

  @ApiPropertyOptional({ description: 'Transaction date' })
  @IsOptional()
  @IsDateString()
  txnDate?: string;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ type: [QuickBooksInvoiceLineDto], description: 'Line items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickBooksInvoiceLineDto)
  lines!: QuickBooksInvoiceLineDto[];

  @ApiPropertyOptional({ description: 'Document number' })
  @IsOptional()
  @IsString()
  docNumber?: string;

  @ApiPropertyOptional({ description: 'Private note (internal)' })
  @IsOptional()
  @IsString()
  privateNote?: string;

  @ApiPropertyOptional({ description: 'Customer memo' })
  @IsOptional()
  @IsString()
  customerMemo?: string;

  @ApiPropertyOptional({ type: QuickBooksAddressDto, description: 'Billing address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuickBooksAddressDto)
  billingAddress?: QuickBooksAddressDto;

  @ApiPropertyOptional({ type: QuickBooksAddressDto, description: 'Shipping address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuickBooksAddressDto)
  shippingAddress?: QuickBooksAddressDto;

  @ApiPropertyOptional({ description: 'Ship date' })
  @IsOptional()
  @IsDateString()
  shipDate?: string;

  @ApiPropertyOptional({ description: 'Tracking number' })
  @IsOptional()
  @IsString()
  trackingNum?: string;

  @ApiPropertyOptional({ description: 'Email to send invoice to' })
  @IsOptional()
  @IsString()
  billEmail?: string;

  @ApiPropertyOptional({ description: 'Payment terms reference ID' })
  @IsOptional()
  @IsString()
  paymentTermsId?: string;

  @ApiPropertyOptional({ description: 'Apply tax after discount' })
  @IsOptional()
  @IsBoolean()
  applyTaxAfterDiscount?: boolean;
}

/**
 * Create sales receipt DTO
 */
export class CreateQuickBooksSalesReceiptDto {
  @ApiPropertyOptional({ description: 'Customer reference ID (optional for sales receipts)' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Transaction date' })
  @IsOptional()
  @IsDateString()
  txnDate?: string;

  @ApiProperty({ type: [QuickBooksInvoiceLineDto], description: 'Line items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickBooksInvoiceLineDto)
  lines!: QuickBooksInvoiceLineDto[];

  @ApiPropertyOptional({ description: 'Document number' })
  @IsOptional()
  @IsString()
  docNumber?: string;

  @ApiPropertyOptional({ description: 'Private note' })
  @IsOptional()
  @IsString()
  privateNote?: string;

  @ApiPropertyOptional({ description: 'Customer memo' })
  @IsOptional()
  @IsString()
  customerMemo?: string;

  @ApiPropertyOptional({ type: QuickBooksAddressDto, description: 'Billing address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuickBooksAddressDto)
  billingAddress?: QuickBooksAddressDto;

  @ApiPropertyOptional({ type: QuickBooksAddressDto, description: 'Shipping address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuickBooksAddressDto)
  shippingAddress?: QuickBooksAddressDto;

  @ApiPropertyOptional({ description: 'Payment method reference ID' })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({ description: 'Payment reference number' })
  @IsOptional()
  @IsString()
  paymentRefNum?: string;

  @ApiPropertyOptional({ description: 'Deposit to account reference ID' })
  @IsOptional()
  @IsString()
  depositToAccountId?: string;
}

/**
 * Invoice application for payment DTO
 */
export class PaymentInvoiceApplicationDto {
  @ApiProperty({ description: 'Invoice ID' })
  @IsString()
  invoiceId!: string;

  @ApiPropertyOptional({ description: 'Amount to apply' })
  @IsOptional()
  @IsNumber()
  amount?: number;
}

/**
 * Create payment DTO
 */
export class CreateQuickBooksPaymentDto {
  @ApiProperty({ description: 'Customer reference ID (required)' })
  @IsString()
  customerId!: string;

  @ApiProperty({ description: 'Total payment amount' })
  @IsNumber()
  totalAmt!: number;

  @ApiPropertyOptional({ description: 'Transaction date' })
  @IsOptional()
  @IsDateString()
  txnDate?: string;

  @ApiPropertyOptional({ description: 'Payment method reference ID' })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({ description: 'Payment reference number' })
  @IsOptional()
  @IsString()
  paymentRefNum?: string;

  @ApiPropertyOptional({ description: 'Private note' })
  @IsOptional()
  @IsString()
  privateNote?: string;

  @ApiPropertyOptional({ description: 'Deposit to account reference ID' })
  @IsOptional()
  @IsString()
  depositToAccountId?: string;

  @ApiPropertyOptional({
    type: [PaymentInvoiceApplicationDto],
    description: 'Invoices to apply payment to',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentInvoiceApplicationDto)
  invoices?: PaymentInvoiceApplicationDto[];

  @ApiPropertyOptional({ description: 'Process payment (credit card)' })
  @IsOptional()
  @IsBoolean()
  processPayment?: boolean;
}
