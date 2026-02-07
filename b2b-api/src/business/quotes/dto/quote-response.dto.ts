import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Quote, QuoteLineItem, QuoteStatus } from '@prisma/client';

export class QuoteLineItemResponseDto {
  @ApiProperty({ example: 'line-item-id-123' })
  id!: string;

  @ApiProperty({ example: 1 })
  lineNumber!: number;

  @ApiProperty({ example: 'Enterprise Software License' })
  productName!: string;

  @ApiPropertyOptional({ example: 'SKU-001' })
  productSku?: string | null;

  @ApiPropertyOptional({ example: 'Annual license for 100 users' })
  description?: string | null;

  @ApiProperty({ example: 10 })
  quantity!: number;

  @ApiProperty({ example: '1000.00' })
  unitPrice!: string;

  @ApiProperty({ example: '100.00' })
  discount!: string;

  @ApiProperty({ example: '9900.00' })
  total!: string;

  @ApiPropertyOptional({ example: 'master-product-id-123' })
  masterProductId?: string | null;

  static fromEntity(lineItem: QuoteLineItem): QuoteLineItemResponseDto {
    const dto = new QuoteLineItemResponseDto();
    dto.id = lineItem.id;
    dto.lineNumber = lineItem.lineNumber;
    dto.productName = lineItem.productName;
    dto.productSku = lineItem.productSku;
    dto.description = lineItem.description;
    dto.quantity = lineItem.quantity;
    dto.unitPrice = lineItem.unitPrice.toString();
    dto.discount = lineItem.discount.toString();
    dto.total = lineItem.total.toString();
    dto.masterProductId = lineItem.masterProductId;
    return dto;
  }
}

export class QuoteResponseDto {
  @ApiProperty({ example: 'quote-id-123' })
  id!: string;

  @ApiProperty({ example: 'QT-2024-0001' })
  quoteNumber!: string;

  @ApiProperty({ example: 'Q4 Enterprise Deal' })
  title!: string;

  @ApiPropertyOptional({ example: 'Annual software licensing quote' })
  description?: string | null;

  @ApiProperty({ enum: QuoteStatus, example: 'DRAFT' })
  status!: QuoteStatus;

  @ApiPropertyOptional({ example: '2024-03-31T00:00:00.000Z' })
  validUntil?: Date | null;

  @ApiProperty({ example: '10000.00' })
  subtotal!: string;

  @ApiProperty({ example: '500.00' })
  discount!: string;

  @ApiProperty({ example: '950.00' })
  tax!: string;

  @ApiProperty({ example: '10450.00' })
  total!: string;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiPropertyOptional({ example: 'Terms and conditions apply' })
  notes?: string | null;

  @ApiProperty({ example: { priority: 'high' } })
  metadata!: Record<string, unknown>;

  @ApiProperty({ example: 'tenant-id-123' })
  tenantId!: string;

  @ApiPropertyOptional({ example: 'contract-id-123' })
  contractId?: string | null;

  @ApiProperty({ example: 'user-id-123' })
  createdById!: string;

  @ApiPropertyOptional({ example: 'user-id-456' })
  approvedById?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  deletedAt?: Date | null;

  @ApiProperty({ type: [QuoteLineItemResponseDto] })
  lineItems!: QuoteLineItemResponseDto[];

  static fromEntity(
    quote: Quote & { lineItems?: QuoteLineItem[] },
  ): QuoteResponseDto {
    const dto = new QuoteResponseDto();
    dto.id = quote.id;
    dto.quoteNumber = quote.quoteNumber;
    dto.title = quote.title;
    dto.description = quote.description;
    dto.status = quote.status;
    dto.validUntil = quote.validUntil;
    dto.subtotal = quote.subtotal.toString();
    dto.discount = quote.discount.toString();
    dto.tax = quote.tax.toString();
    dto.total = quote.total.toString();
    dto.currency = quote.currency;
    dto.notes = quote.notes;
    dto.metadata = quote.metadata as Record<string, unknown>;
    dto.tenantId = quote.tenantId;
    dto.contractId = quote.contractId;
    dto.createdById = quote.createdById;
    dto.approvedById = quote.approvedById;
    dto.createdAt = quote.createdAt;
    dto.updatedAt = quote.updatedAt;
    dto.deletedAt = quote.deletedAt;

    dto.lineItems = quote.lineItems
      ? quote.lineItems.map(QuoteLineItemResponseDto.fromEntity)
      : [];

    return dto;
  }
}
