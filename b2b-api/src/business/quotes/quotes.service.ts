import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { AuditService } from '@core/audit';
import { ContractsService } from '@business/contracts';
import { TenantCatalogService } from '@business/tenant-catalog';
import { NotificationsService } from '@platform/notifications';
import { Quote, QuoteLineItem, Prisma, QuoteStatus, UserRole, NotificationType } from '@prisma/client';
import { CreateQuoteDto, CreateQuoteLineItemDto, UpdateQuoteDto, QuoteListQueryDto } from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type QuoteWithLineItems = Quote & { lineItems: QuoteLineItem[] };

// Approval thresholds based on user role
const APPROVAL_THRESHOLDS: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: Infinity,
  [UserRole.ADMIN]: 100000,
  [UserRole.MANAGER]: 50000,
  [UserRole.USER]: 10000,
  [UserRole.VIEWER]: 0,
};

/**
 * Quote State Machine
 * Valid transitions:
 * DRAFT -> PENDING_APPROVAL (submit)
 * PENDING_APPROVAL -> APPROVED (approve) | DRAFT (reject)
 * APPROVED -> SENT (send)
 * SENT -> ACCEPTED | REJECTED | EXPIRED
 * ACCEPTED -> CONVERTED (convert to contract)
 * Any (except CONVERTED/EXPIRED) -> DRAFT (reject back)
 */
const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  [QuoteStatus.DRAFT]: [QuoteStatus.PENDING_APPROVAL],
  [QuoteStatus.PENDING_APPROVAL]: [QuoteStatus.APPROVED, QuoteStatus.DRAFT],
  [QuoteStatus.APPROVED]: [QuoteStatus.SENT, QuoteStatus.DRAFT],
  [QuoteStatus.SENT]: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED],
  [QuoteStatus.ACCEPTED]: [QuoteStatus.CONVERTED],
  [QuoteStatus.REJECTED]: [],
  [QuoteStatus.EXPIRED]: [],
  [QuoteStatus.CONVERTED]: [],
};

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly contractsService: ContractsService,
    private readonly tenantCatalogService: TenantCatalogService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async generateQuoteNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QT-${year}`;

    const latestQuote = await this.prisma.quote.findFirst({
      where: {
        tenantId,
        quoteNumber: { startsWith: prefix },
      },
      orderBy: { quoteNumber: 'desc' },
    });

    let sequence = 1;
    if (latestQuote) {
      const parts = latestQuote.quoteNumber.split('-');
      const lastSequence = parseInt(parts[2], 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  private calculateLineItemTotal(lineItem: CreateQuoteLineItemDto & { unitPrice: number }): {
    subtotal: number;
    discount: number;
    total: number;
  } {
    const subtotal = lineItem.quantity * lineItem.unitPrice;
    const discount = lineItem.discount || 0;
    const total = subtotal - discount;
    return { subtotal, discount, total };
  }

  /**
   * Resolve line item details from catalog if masterProductId is provided
   * Otherwise validate that required manual fields are present
   */
  private async resolveLineItem(
    item: CreateQuoteLineItemDto,
    tenantId: string,
  ): Promise<CreateQuoteLineItemDto & { unitPrice: number; productName: string }> {
    // If masterProductId is provided, resolve from catalog
    if (item.masterProductId) {
      // Validate tenant access
      const hasAccess = await this.tenantCatalogService.hasAccess(item.masterProductId, tenantId);

      if (!hasAccess) {
        throw new ForbiddenException(
          `Tenant does not have access to product '${item.masterProductId}'`,
        );
      }

      // Get product with tenant pricing
      const product = await this.tenantCatalogService.findOne(item.masterProductId, tenantId);

      // Use provided values or resolve from catalog
      return {
        ...item,
        productName: item.productName || product.name,
        productSku: item.productSku || product.sku,
        description: item.description || product.description || undefined,
        unitPrice: item.unitPrice || parseFloat(product.effectivePrice),
      };
    }

    // Manual entry - validate required fields
    if (!item.productName) {
      throw new BadRequestException('productName is required when masterProductId is not provided');
    }

    if (item.unitPrice === undefined || item.unitPrice === null) {
      throw new BadRequestException('unitPrice is required when masterProductId is not provided');
    }

    return item as CreateQuoteLineItemDto & { unitPrice: number; productName: string };
  }

  /**
   * Resolve all line items with catalog integration
   */
  private async resolveLineItems(
    lineItems: CreateQuoteLineItemDto[],
    tenantId: string,
  ): Promise<Array<CreateQuoteLineItemDto & { unitPrice: number; productName: string }>> {
    return Promise.all(lineItems.map((item) => this.resolveLineItem(item, tenantId)));
  }

  private calculateQuoteTotals(lineItems: Array<CreateQuoteLineItemDto & { unitPrice: number }>): {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  } {
    let subtotal = 0;
    let discount = 0;

    for (const item of lineItems) {
      const calc = this.calculateLineItemTotal(item);
      subtotal += calc.subtotal;
      discount += calc.discount;
    }

    // Tax is 0 by default, can be calculated based on business rules
    const tax = 0;
    const total = subtotal - discount + tax;

    return { subtotal, discount, tax, total };
  }

  async create(dto: CreateQuoteDto, tenantId: string, userId: string): Promise<QuoteWithLineItems> {
    // Resolve line items with catalog integration
    const resolvedLineItems = await this.resolveLineItems(dto.lineItems, tenantId);

    const quoteNumber = await this.generateQuoteNumber(tenantId);
    const totals = this.calculateQuoteTotals(resolvedLineItems);

    const quote = await this.prisma.quote.create({
      data: {
        quoteNumber,
        title: dto.title,
        description: dto.description,
        customerName: dto.customerName || null,
        customerEmail: dto.customerEmail || null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        subtotal: new Prisma.Decimal(totals.subtotal),
        discount: new Prisma.Decimal(totals.discount),
        discountPercent:
          dto.discountPercent !== undefined ? new Prisma.Decimal(dto.discountPercent) : null,
        tax: new Prisma.Decimal(totals.tax),
        total: new Prisma.Decimal(totals.total),
        currency: dto.currency || 'USD',
        notes: dto.notes,
        internalNotes: dto.internalNotes || null,
        metadata: (dto.metadata || {}) as Prisma.InputJsonValue,
        tenantId,
        contractId: dto.contractId || null,
        createdById: userId,
        lineItems: {
          create: resolvedLineItems.map((item, index) => {
            const calc = this.calculateLineItemTotal(item);
            return {
              lineNumber: index + 1,
              productName: item.productName,
              productSku: item.productSku,
              description: item.description,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              discount: new Prisma.Decimal(calc.discount),
              total: new Prisma.Decimal(calc.total),
              masterProductId: item.masterProductId || null,
            };
          }),
        },
      },
      include: {
        lineItems: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    this.logger.log(`Quote created: ${quote.quoteNumber} (${quote.id}) by user ${userId}`);

    return quote;
  }

  async findAll(
    query: QuoteListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResult<QuoteWithLineItems>> {
    const { search, status, contractId, includeDeleted, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.QuoteWhereInput = {
      tenantId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { quoteNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
      ...(contractId && { contractId }),
      ...(!includeDeleted && { deletedAt: null }),
    };

    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          lineItems: {
            orderBy: { lineNumber: 'asc' },
          },
        },
      }),
      this.prisma.quote.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, tenantId: string): Promise<QuoteWithLineItems> {
    const quote = await this.prisma.quote.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        lineItems: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException(`Quote with ID '${id}' not found`);
    }

    return quote;
  }

  async update(
    id: string,
    dto: UpdateQuoteDto,
    tenantId: string,
    userId: string,
  ): Promise<QuoteWithLineItems> {
    const currentQuote = await this.findOne(id, tenantId);

    if (currentQuote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot update quote in '${currentQuote.status}' status. Only DRAFT quotes can be updated.`,
      );
    }

    // Resolve line items if provided
    let resolvedLineItems:
      | Array<CreateQuoteLineItemDto & { unitPrice: number; productName: string }>
      | undefined;
    let totalsUpdate = {};

    if (dto.lineItems) {
      resolvedLineItems = await this.resolveLineItems(dto.lineItems, tenantId);
      const totals = this.calculateQuoteTotals(resolvedLineItems);
      totalsUpdate = {
        subtotal: new Prisma.Decimal(totals.subtotal),
        discount: new Prisma.Decimal(totals.discount),
        tax: new Prisma.Decimal(totals.tax),
        total: new Prisma.Decimal(totals.total),
      };
    }

    // Start transaction
    const quote = await this.prisma.$transaction(async (tx) => {
      // If line items are updated, delete existing and create new
      if (resolvedLineItems) {
        await tx.quoteLineItem.deleteMany({
          where: { quoteId: id },
        });

        await tx.quoteLineItem.createMany({
          data: resolvedLineItems.map((item, index) => {
            const calc = this.calculateLineItemTotal(item);
            return {
              quoteId: id,
              lineNumber: index + 1,
              productName: item.productName,
              productSku: item.productSku,
              description: item.description,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              discount: new Prisma.Decimal(calc.discount),
              total: new Prisma.Decimal(calc.total),
              masterProductId: item.masterProductId || null,
            };
          }),
        });
      }

      // Update the quote
      return tx.quote.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.customerName !== undefined && { customerName: dto.customerName || null }),
          ...(dto.customerEmail !== undefined && { customerEmail: dto.customerEmail || null }),
          ...(dto.validUntil !== undefined && {
            validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          }),
          ...(dto.currency !== undefined && { currency: dto.currency }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.internalNotes !== undefined && { internalNotes: dto.internalNotes || null }),
          ...(dto.discountPercent !== undefined && {
            discountPercent:
              dto.discountPercent !== undefined ? new Prisma.Decimal(dto.discountPercent) : null,
          }),
          ...(dto.contractId !== undefined && { contractId: dto.contractId }),
          ...(dto.metadata !== undefined && { metadata: dto.metadata as Prisma.InputJsonValue }),
          ...totalsUpdate,
        },
        include: {
          lineItems: {
            orderBy: { lineNumber: 'asc' },
          },
        },
      });
    });

    this.logger.log(`Quote updated: ${quote.quoteNumber} by user ${userId}`);

    return quote;
  }

  async remove(id: string, tenantId: string, userId: string): Promise<void> {
    const quote = await this.findOne(id, tenantId);

    if (quote.status !== QuoteStatus.DRAFT && quote.status !== QuoteStatus.REJECTED) {
      throw new BadRequestException(
        `Cannot delete quote in '${quote.status}' status. Only DRAFT or REJECTED quotes can be deleted.`,
      );
    }

    await this.prisma.quote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Quote soft-deleted: ${quote.quoteNumber} (${quote.id}) by user ${userId}`);
  }

  // ==========================================
  // Workflow Methods
  // ==========================================

  async submit(
    id: string,
    tenantId: string,
    userId: string,
    comments?: string,
  ): Promise<QuoteWithLineItems> {
    return this.transitionStatus(
      id,
      tenantId,
      userId,
      QuoteStatus.DRAFT,
      QuoteStatus.PENDING_APPROVAL,
      'SUBMIT',
      comments,
    );
  }

  async approve(
    id: string,
    tenantId: string,
    userId: string,
    userRole: UserRole,
    comments?: string,
  ): Promise<QuoteWithLineItems> {
    const quote = await this.findOne(id, tenantId);

    if (quote.status !== QuoteStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Cannot approve quote in '${quote.status}' status. Expected 'PENDING_APPROVAL'.`,
      );
    }

    // Check approval threshold
    const threshold = APPROVAL_THRESHOLDS[userRole];
    const quoteTotal = quote.total.toNumber();

    if (quoteTotal > threshold) {
      throw new BadRequestException(
        `Quote total (${quoteTotal}) exceeds your approval threshold (${threshold}). A higher-level approver is required.`,
      );
    }

    const approvedQuote = await this.transitionStatusDirect(
      id,
      tenantId,
      userId,
      quote.status,
      QuoteStatus.APPROVED,
      'APPROVE',
      comments,
    );

    // Set the approver
    await this.prisma.quote.update({
      where: { id },
      data: { approvedById: userId },
    });

    // Send notification to quote creator
    if (quote.createdById) {
      const message = comments
        ? `Your quote ${quote.quoteNumber} has been approved. Comments: ${comments}`
        : `Your quote ${quote.quoteNumber} has been approved and is ready to be sent to the customer.`;

      await this.notificationsService.notifyUser(
        tenantId,
        quote.createdById,
        NotificationType.SUCCESS,
        'Quote Approved',
        message,
        {
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          action: 'approved',
          comments,
        },
      );
    }

    return this.findOne(id, tenantId);
  }

  async reject(
    id: string,
    tenantId: string,
    userId: string,
    comments?: string,
  ): Promise<QuoteWithLineItems> {
    const quote = await this.findOne(id, tenantId);

    if (
      quote.status !== QuoteStatus.PENDING_APPROVAL &&
      quote.status !== QuoteStatus.APPROVED &&
      quote.status !== QuoteStatus.SENT
    ) {
      throw new BadRequestException(`Cannot reject quote in '${quote.status}' status.`);
    }

    await this.transitionStatusDirect(
      id,
      tenantId,
      userId,
      quote.status,
      QuoteStatus.DRAFT,
      'REJECT',
      comments,
    );

    // Send notification to quote creator about rejection
    if (quote.createdById) {
      const message = comments
        ? `Your quote ${quote.quoteNumber} has been rejected. Reason: ${comments}`
        : `Your quote ${quote.quoteNumber} has been rejected and returned to draft status.`;

      await this.notificationsService.notifyUser(
        tenantId,
        quote.createdById,
        NotificationType.WARNING,
        'Quote Rejected',
        message,
        {
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          action: 'rejected',
          comments,
        },
      );
    }

    return this.findOne(id, tenantId);
  }

  async send(
    id: string,
    tenantId: string,
    userId: string,
    comments?: string,
  ): Promise<QuoteWithLineItems> {
    return this.transitionStatus(
      id,
      tenantId,
      userId,
      QuoteStatus.APPROVED,
      QuoteStatus.SENT,
      'SEND',
      comments,
    );
  }

  async accept(
    id: string,
    tenantId: string,
    userId: string,
    comments?: string,
  ): Promise<QuoteWithLineItems> {
    return this.transitionStatus(
      id,
      tenantId,
      userId,
      QuoteStatus.SENT,
      QuoteStatus.ACCEPTED,
      'ACCEPT',
      comments,
    );
  }

  async rejectByCustomer(
    id: string,
    tenantId: string,
    userId: string,
    comments?: string,
  ): Promise<QuoteWithLineItems> {
    return this.transitionStatus(
      id,
      tenantId,
      userId,
      QuoteStatus.SENT,
      QuoteStatus.REJECTED,
      'CUSTOMER_REJECT',
      comments,
    );
  }

  async convertToContract(
    id: string,
    tenantId: string,
    userId: string,
    comments?: string,
  ): Promise<{ quote: QuoteWithLineItems; contractId: string }> {
    const quote = await this.findOne(id, tenantId);

    if (quote.status !== QuoteStatus.ACCEPTED) {
      throw new BadRequestException(
        `Cannot convert quote in '${quote.status}' status. Only ACCEPTED quotes can be converted to contracts.`,
      );
    }

    // Create the contract from the quote
    const contract = await this.contractsService.create(
      {
        title: `Contract from ${quote.quoteNumber}: ${quote.title}`,
        description: quote.description || undefined,
        totalValue: quote.total.toNumber(),
        currency: quote.currency,
        terms: {
          sourceQuote: quote.quoteNumber,
          quoteId: quote.id,
        },
        metadata: {
          convertedFromQuote: true,
          quoteNumber: quote.quoteNumber,
          originalQuoteTotal: quote.total.toString(),
        },
      },
      tenantId,
      userId,
    );

    // Update quote status and link to contract
    await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.CONVERTED,
        contractId: contract.id,
      },
    });

    // Create audit log
    await this.auditService.log(tenantId, userId, {
      action: 'QUOTE_CONVERT_TO_CONTRACT',
      entityType: 'Quote',
      entityId: id,
      changes: {
        status: { from: QuoteStatus.ACCEPTED, to: QuoteStatus.CONVERTED },
        contractId: { from: null, to: contract.id },
      },
      metadata: {
        comments,
        contractNumber: contract.contractNumber,
      },
    });

    this.logger.log(
      `Quote ${quote.quoteNumber} converted to contract ${contract.contractNumber} by user ${userId}`,
    );

    return {
      quote: await this.findOne(id, tenantId),
      contractId: contract.id,
    };
  }

  isValidTransition(from: QuoteStatus, to: QuoteStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  getApprovalThreshold(role: UserRole): number {
    return APPROVAL_THRESHOLDS[role];
  }

  private async transitionStatus(
    id: string,
    tenantId: string,
    userId: string,
    expectedStatus: QuoteStatus,
    newStatus: QuoteStatus,
    action: string,
    comments?: string,
  ): Promise<QuoteWithLineItems> {
    const quote = await this.findOne(id, tenantId);

    if (quote.status !== expectedStatus) {
      throw new BadRequestException(
        `Cannot ${action.toLowerCase()} quote in '${quote.status}' status. Expected '${expectedStatus}'.`,
      );
    }

    if (!this.isValidTransition(quote.status, newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from '${quote.status}' to '${newStatus}'.`,
      );
    }

    return this.transitionStatusDirect(
      id,
      tenantId,
      userId,
      quote.status,
      newStatus,
      action,
      comments,
    );
  }

  private async transitionStatusDirect(
    id: string,
    tenantId: string,
    userId: string,
    fromStatus: QuoteStatus,
    toStatus: QuoteStatus,
    action: string,
    comments?: string,
  ): Promise<QuoteWithLineItems> {
    await this.prisma.quote.update({
      where: { id },
      data: { status: toStatus },
    });

    await this.auditService.log(tenantId, userId, {
      action: `QUOTE_${action}`,
      entityType: 'Quote',
      entityId: id,
      changes: {
        status: { from: fromStatus, to: toStatus },
      },
      metadata: {
        comments,
        action,
      },
    });

    this.logger.log(
      `Quote ${id} transitioned from ${fromStatus} to ${toStatus} (${action}) by user ${userId}`,
    );

    return this.findOne(id, tenantId);
  }
}
