-- CreateEnum
CREATE TYPE "ProductAvailability" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'PREORDER', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'SALARY_DEDUCTION', 'INVOICE', 'WALLET');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalaryDeductionTxnType" AS ENUM ('DEDUCTION', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SalaryDeductionTxnStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "SalaryDeductionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'BOGO', 'FREE_SHIPPING');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "PartnerCommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IntegrationDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "IntegrationMessageStatus" AS ENUM ('PENDING', 'TRANSFORMING', 'TRANSFORMED', 'ROUTING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "IntegrationConnectorType" AS ENUM ('ERP', 'CRM', 'ECOMMERCE', 'PAYMENT', 'SHIPPING', 'INVENTORY', 'WEBHOOK', 'API', 'FILE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CircuitBreakerState" AS ENUM ('CLOSED', 'OPEN', 'HALF_OPEN');

-- CreateEnum
CREATE TYPE "ConnectorHealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ConnectorTestStatus" AS ENUM ('SUCCESS', 'FAILURE', 'TIMEOUT', 'ERROR');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('API_KEY', 'BASIC_AUTH', 'OAUTH2', 'BEARER_TOKEN', 'CLIENT_CREDENTIALS', 'CERTIFICATE', 'SSH_KEY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CapabilityCategory" AS ENUM ('SYNC', 'ASYNC', 'WEBHOOK', 'POLLING', 'BATCH', 'STREAM', 'CRUD', 'SEARCH', 'REPORT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ConnectorEventType" AS ENUM ('REGISTERED', 'CONFIGURED', 'ENABLED', 'DISABLED', 'TESTED', 'CONNECTION_SUCCESS', 'CONNECTION_FAILURE', 'CREDENTIAL_ROTATED', 'CAPABILITY_ENABLED', 'CAPABILITY_DISABLED', 'ERROR');

-- CreateEnum
CREATE TYPE "WarehouseType" AS ENUM ('STANDARD', 'DISTRIBUTION_CENTER', 'FULFILLMENT_CENTER', 'DROP_SHIP', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "InventoryReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'RELEASED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryReservationType" AS ENUM ('ORDER', 'CART', 'QUOTE', 'TRANSFER', 'HOLD');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('RECEIPT', 'SALE', 'RETURN', 'ADJUSTMENT_INCREASE', 'ADJUSTMENT_DECREASE', 'TRANSFER_IN', 'TRANSFER_OUT', 'RESERVATION', 'RELEASE', 'WRITE_OFF', 'CYCLE_COUNT');

-- CreateEnum
CREATE TYPE "InventoryAlertType" AS ENUM ('LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'REORDER_POINT', 'SAFETY_STOCK_BREACH', 'SYNC_FAILURE', 'RESERVATION_EXPIRING');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "InventorySyncJobType" AS ENUM ('FULL_SYNC', 'DELTA_SYNC', 'WAREHOUSE_SYNC', 'PRODUCT_SYNC');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PriceListType" AS ENUM ('STANDARD', 'CONTRACT', 'PROMOTIONAL', 'VOLUME', 'CUSTOMER_SPECIFIC', 'CHANNEL', 'REGIONAL');

-- CreateEnum
CREATE TYPE "PriceListStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RoundingRule" AS ENUM ('NONE', 'UP', 'DOWN', 'NEAREST', 'NEAREST_05', 'NEAREST_09', 'NEAREST_99');

-- CreateEnum
CREATE TYPE "PriceAssignmentType" AS ENUM ('CUSTOMER', 'ORGANIZATION', 'CUSTOMER_GROUP', 'CHANNEL', 'REGION');

-- CreateEnum
CREATE TYPE "PriceOverrideType" AS ENUM ('FIXED_PRICE', 'PERCENTAGE_DISCOUNT', 'FIXED_DISCOUNT', 'MARKUP_PERCENTAGE', 'MARKUP_FIXED');

-- CreateEnum
CREATE TYPE "PriceOverrideScopeType" AS ENUM ('CUSTOMER', 'ORGANIZATION', 'CONTRACT', 'QUOTE', 'ORDER', 'PROMOTION');

-- CreateEnum
CREATE TYPE "PriceOverrideStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ExchangeRateType" AS ENUM ('SPOT', 'FORWARD', 'AVERAGE', 'BUDGETED');

-- CreateEnum
CREATE TYPE "PriceListSyncJobType" AS ENUM ('FULL_SYNC', 'DELTA_SYNC', 'PRICE_LIST_IMPORT', 'PRICE_UPDATE');

-- AlterTable
ALTER TABLE "master_products" ADD COLUMN     "availability" "ProductAvailability" NOT NULL DEFAULT 'IN_STOCK',
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "images" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "primaryImage" TEXT;

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(15,2) NOT NULL,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "couponDiscount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "shippingAddress" JSONB NOT NULL DEFAULT '{}',
    "billingAddress" JSONB NOT NULL DEFAULT '{}',
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "carrier" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "processingAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cancelledById" TEXT,
    "refundedById" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "productSku" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT NOT NULL,
    "masterProductId" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "couponDiscount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cartId" TEXT NOT NULL,
    "masterProductId" TEXT,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PaymentMethodType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "minAmount" DECIMAL(15,2),
    "maxAmount" DECIMAL(15,2),
    "processingFee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "processingFeePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_method_user_types" (
    "id" TEXT NOT NULL,
    "userRole" "UserRole" NOT NULL,
    "paymentMethodId" TEXT NOT NULL,

    CONSTRAINT "payment_method_user_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_methods" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "minDays" INTEGER,
    "maxDays" INTEGER,
    "baseCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "freeThreshold" DECIMAL(15,2),
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "delivery_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT,
    "street1" TEXT NOT NULL,
    "street2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "phone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isShipping" BOOLEAN NOT NULL DEFAULT true,
    "isBilling" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "externalRef" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_deductions" (
    "id" TEXT NOT NULL,
    "monthlyLimit" DECIMAL(15,2) NOT NULL,
    "usedAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(15,2) NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "autoRenewal" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "salary_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_deduction_transactions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" "SalaryDeductionTxnType" NOT NULL,
    "status" "SalaryDeductionTxnStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "description" TEXT,
    "processedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "salaryDeductionId" TEXT NOT NULL,
    "orderId" TEXT,
    "paymentId" TEXT,

    CONSTRAINT "salary_deduction_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_deduction_limit_requests" (
    "id" TEXT NOT NULL,
    "requestedLimit" DECIMAL(15,2) NOT NULL,
    "currentLimit" DECIMAL(15,2) NOT NULL,
    "reason" TEXT,
    "status" "SalaryDeductionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewedById" TEXT,

    CONSTRAINT "salary_deduction_limit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "discountPercent" DECIMAL(5,2) NOT NULL,
    "minSpend" DECIMAL(15,2),
    "minOrders" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "icon" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "discount_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_discount_tiers" (
    "id" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "reason" TEXT,
    "totalSpend" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSavings" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discountTierId" TEXT NOT NULL,
    "assignedById" TEXT,

    CONSTRAINT "user_discount_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" "PromotionType" NOT NULL,
    "discountValue" DECIMAL(15,2) NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "minOrderAmount" DECIMAL(15,2),
    "maxDiscount" DECIMAL(15,2),
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "perUserLimit" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "targetUserRoles" "UserRole"[],
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER NOT NULL DEFAULT 1,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "assignedToId" TEXT,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_usages" (
    "id" TEXT NOT NULL,
    "discountApplied" DECIMAL(15,2) NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "tenantId" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "couponId" TEXT,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,

    CONSTRAINT "promotion_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "onboardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_team_members" (
    "id" TEXT NOT NULL,
    "role" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "partner_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_commissions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "orderTotal" DECIMAL(15,2) NOT NULL,
    "status" "PartnerCommissionStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,

    CONSTRAINT "partner_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_resources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "fileKey" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partnerId" TEXT,
    "uploadedById" TEXT,

    CONSTRAINT "partner_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_messages" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "correlationId" TEXT,
    "sourceConnector" TEXT NOT NULL,
    "targetConnector" TEXT NOT NULL,
    "direction" "IntegrationDirection" NOT NULL,
    "type" TEXT NOT NULL,
    "status" "IntegrationMessageStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "sourcePayload" JSONB NOT NULL,
    "canonicalPayload" JSONB,
    "targetPayload" JSONB,
    "transformedAt" TIMESTAMP(3),
    "transformErrors" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "errorDetails" JSONB,
    "dlqReason" TEXT,
    "movedToDlqAt" TIMESTAMP(3),
    "circuitState" TEXT,
    "idempotencyKey" TEXT,
    "processedHash" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_connectors" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "IntegrationConnectorType" NOT NULL,
    "direction" "IntegrationDirection" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pluginPath" TEXT,
    "pluginVersion" TEXT,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "configSchema" JSONB,
    "declaredCapabilities" TEXT[],
    "rateLimit" INTEGER,
    "rateLimitWindow" INTEGER,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3),
    "circuitState" "CircuitBreakerState" NOT NULL DEFAULT 'CLOSED',
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "failureThreshold" INTEGER NOT NULL DEFAULT 5,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "successThreshold" INTEGER NOT NULL DEFAULT 3,
    "lastFailureAt" TIMESTAMP(3),
    "circuitOpenedAt" TIMESTAMP(3),
    "halfOpenAt" TIMESTAMP(3),
    "lastHealthCheck" TIMESTAMP(3),
    "healthStatus" "ConnectorHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "healthDetails" JSONB,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "successfulMessages" INTEGER NOT NULL DEFAULT 0,
    "failedMessages" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_dead_letters" (
    "id" TEXT NOT NULL,
    "originalMessageId" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "payload" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "retryable" BOOLEAN NOT NULL DEFAULT true,
    "reprocessedAt" TIMESTAMP(3),
    "reprocessedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_dead_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_transformations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceConnector" TEXT NOT NULL,
    "targetConnector" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "sourceToCanonical" JSONB NOT NULL,
    "canonicalToTarget" JSONB NOT NULL,
    "sourceSchema" JSONB,
    "canonicalSchema" JSONB,
    "targetSchema" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_transformations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "credentialVaultId" TEXT,
    "rateLimit" INTEGER,
    "rateLimitWindow" INTEGER,
    "transformationOverrides" JSONB,
    "enabledCapabilities" TEXT[],
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "webhookEvents" TEXT[],
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResult" "ConnectorTestStatus",
    "lastTestError" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,

    CONSTRAINT "connector_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_vaults" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CredentialType" NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "encryptionKeyId" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "accessPolicy" JSONB NOT NULL DEFAULT '{}',
    "expiresAt" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3),
    "rotationPolicy" JSONB,
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "credential_vaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_capabilities" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "CapabilityCategory" NOT NULL,
    "inputSchema" JSONB,
    "outputSchema" JSONB,
    "configSchema" JSONB,
    "requiredScopes" TEXT[],
    "requiredPermissions" TEXT[],
    "isOptional" BOOLEAN NOT NULL DEFAULT true,
    "isDeprecated" BOOLEAN NOT NULL DEFAULT false,
    "deprecatedMessage" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "connectorId" TEXT NOT NULL,

    CONSTRAINT "connector_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_events" (
    "id" TEXT NOT NULL,
    "eventType" "ConnectorEventType" NOT NULL,
    "connectorCode" TEXT NOT NULL,
    "configId" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "duration" INTEGER,
    "tenantId" TEXT,
    "userId" TEXT,
    "correlationId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "WarehouseType" NOT NULL DEFAULT 'STANDARD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "address" JSONB NOT NULL DEFAULT '{}',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "safetyStockDays" INTEGER NOT NULL DEFAULT 3,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 2,
    "cutoffTime" TEXT,
    "operatingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "externalId" TEXT,
    "externalSystem" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_levels" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "quantityOnOrder" INTEGER NOT NULL DEFAULT 0,
    "quantityAllocated" INTEGER NOT NULL DEFAULT 0,
    "quantityAvailable" INTEGER NOT NULL DEFAULT 0,
    "atp" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER,
    "safetyStock" INTEGER NOT NULL DEFAULT 0,
    "minOrderQty" INTEGER NOT NULL DEFAULT 1,
    "maxOrderQty" INTEGER,
    "availability" "ProductAvailability" NOT NULL DEFAULT 'IN_STOCK',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncSource" TEXT,
    "lastReceivedAt" TIMESTAMP(3),
    "lastSoldAt" TIMESTAMP(3),
    "averageDailySales" DECIMAL(15,4),
    "daysOfStock" INTEGER,
    "externalId" TEXT,
    "externalSystem" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "masterProductId" TEXT,

    CONSTRAINT "inventory_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reservations" (
    "id" TEXT NOT NULL,
    "reservationNumber" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantityFulfilled" INTEGER NOT NULL DEFAULT 0,
    "status" "InventoryReservationStatus" NOT NULL DEFAULT 'PENDING',
    "type" "InventoryReservationType" NOT NULL DEFAULT 'ORDER',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalRef" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "inventoryLevelId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "movementNumber" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousQty" INTEGER NOT NULL,
    "newQty" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "unitCost" DECIMAL(15,4),
    "totalCost" DECIMAL(15,2),
    "reason" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "inventoryLevelId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_alerts" (
    "id" TEXT NOT NULL,
    "alertType" "InventoryAlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "threshold" INTEGER,
    "currentValue" INTEGER,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryLevelId" TEXT NOT NULL,

    CONSTRAINT "inventory_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_sync_jobs" (
    "id" TEXT NOT NULL,
    "jobType" "InventorySyncJobType" NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "connectorId" TEXT,
    "warehouseId" TEXT,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errors" JSONB,
    "summary" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "inventory_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_lists" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PriceListType" NOT NULL DEFAULT 'STANDARD',
    "status" "PriceListStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "basePriceListId" TEXT,
    "priceModifier" DECIMAL(10,4),
    "roundingRule" "RoundingRule" NOT NULL DEFAULT 'NONE',
    "roundingPrecision" INTEGER NOT NULL DEFAULT 2,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isCustomerSpecific" BOOLEAN NOT NULL DEFAULT false,
    "externalId" TEXT,
    "externalSystem" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" "SyncJobStatus",
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "basePrice" DECIMAL(15,4) NOT NULL,
    "listPrice" DECIMAL(15,4) NOT NULL,
    "minPrice" DECIMAL(15,4),
    "maxPrice" DECIMAL(15,4),
    "cost" DECIMAL(15,4),
    "currency" TEXT,
    "quantityBreaks" JSONB NOT NULL DEFAULT '[]',
    "maxDiscountPercent" DECIMAL(5,2),
    "isDiscountable" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uom" TEXT NOT NULL DEFAULT 'EA',
    "externalId" TEXT,
    "externalSystem" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "priceListId" TEXT NOT NULL,
    "masterProductId" TEXT,

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_price_assignments" (
    "id" TEXT NOT NULL,
    "assignmentType" "PriceAssignmentType" NOT NULL DEFAULT 'CUSTOMER',
    "assignmentId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "externalRef" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,

    CONSTRAINT "customer_price_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_overrides" (
    "id" TEXT NOT NULL,
    "overrideType" "PriceOverrideType" NOT NULL DEFAULT 'FIXED_PRICE',
    "overrideValue" DECIMAL(15,4) NOT NULL,
    "scopeType" "PriceOverrideScopeType" NOT NULL DEFAULT 'CUSTOMER',
    "scopeId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "minQuantity" INTEGER,
    "maxQuantity" INTEGER,
    "status" "PriceOverrideStatus" NOT NULL DEFAULT 'ACTIVE',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "reason" TEXT,
    "externalRef" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "priceListItemId" TEXT NOT NULL,

    CONSTRAINT "price_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_exchange_rates" (
    "id" TEXT NOT NULL,
    "sourceCurrency" TEXT NOT NULL,
    "targetCurrency" TEXT NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "rateSource" TEXT,
    "rateType" "ExchangeRateType" NOT NULL DEFAULT 'SPOT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "currency_exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_sync_jobs" (
    "id" TEXT NOT NULL,
    "jobType" "PriceListSyncJobType" NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "connectorId" TEXT,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),
    "deltaToken" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errors" JSONB,
    "summary" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,

    CONSTRAINT "price_list_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_isActive_idx" ON "categories"("isActive");

-- CreateIndex
CREATE INDEX "orders_tenantId_idx" ON "orders"("tenantId");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "orders_tenantId_orderNumber_key" ON "orders"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_masterProductId_idx" ON "order_items"("masterProductId");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_orderId_lineNumber_key" ON "order_items"("orderId", "lineNumber");

-- CreateIndex
CREATE INDEX "carts_tenantId_idx" ON "carts"("tenantId");

-- CreateIndex
CREATE INDEX "carts_userId_idx" ON "carts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "carts_tenantId_userId_key" ON "carts"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- CreateIndex
CREATE INDEX "cart_items_masterProductId_idx" ON "cart_items"("masterProductId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_masterProductId_key" ON "cart_items"("cartId", "masterProductId");

-- CreateIndex
CREATE INDEX "payment_methods_tenantId_idx" ON "payment_methods"("tenantId");

-- CreateIndex
CREATE INDEX "payment_methods_isActive_idx" ON "payment_methods"("isActive");

-- CreateIndex
CREATE INDEX "payment_methods_type_idx" ON "payment_methods"("type");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_tenantId_code_key" ON "payment_methods"("tenantId", "code");

-- CreateIndex
CREATE INDEX "payment_method_user_types_paymentMethodId_idx" ON "payment_method_user_types"("paymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_user_types_paymentMethodId_userRole_key" ON "payment_method_user_types"("paymentMethodId", "userRole");

-- CreateIndex
CREATE INDEX "delivery_methods_tenantId_idx" ON "delivery_methods"("tenantId");

-- CreateIndex
CREATE INDEX "delivery_methods_isActive_idx" ON "delivery_methods"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_methods_tenantId_code_key" ON "delivery_methods"("tenantId", "code");

-- CreateIndex
CREATE INDEX "user_addresses_tenantId_idx" ON "user_addresses"("tenantId");

-- CreateIndex
CREATE INDEX "user_addresses_userId_idx" ON "user_addresses"("userId");

-- CreateIndex
CREATE INDEX "user_addresses_isDefault_idx" ON "user_addresses"("isDefault");

-- CreateIndex
CREATE INDEX "payments_tenantId_idx" ON "payments"("tenantId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_tenantId_paymentNumber_key" ON "payments"("tenantId", "paymentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "salary_deductions_userId_key" ON "salary_deductions"("userId");

-- CreateIndex
CREATE INDEX "salary_deductions_tenantId_idx" ON "salary_deductions"("tenantId");

-- CreateIndex
CREATE INDEX "salary_deductions_userId_idx" ON "salary_deductions"("userId");

-- CreateIndex
CREATE INDEX "salary_deductions_periodStart_periodEnd_idx" ON "salary_deductions"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "salary_deduction_transactions_salaryDeductionId_idx" ON "salary_deduction_transactions"("salaryDeductionId");

-- CreateIndex
CREATE INDEX "salary_deduction_transactions_orderId_idx" ON "salary_deduction_transactions"("orderId");

-- CreateIndex
CREATE INDEX "salary_deduction_transactions_status_idx" ON "salary_deduction_transactions"("status");

-- CreateIndex
CREATE INDEX "salary_deduction_transactions_createdAt_idx" ON "salary_deduction_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "salary_deduction_limit_requests_tenantId_idx" ON "salary_deduction_limit_requests"("tenantId");

-- CreateIndex
CREATE INDEX "salary_deduction_limit_requests_userId_idx" ON "salary_deduction_limit_requests"("userId");

-- CreateIndex
CREATE INDEX "salary_deduction_limit_requests_status_idx" ON "salary_deduction_limit_requests"("status");

-- CreateIndex
CREATE INDEX "discount_tiers_tenantId_idx" ON "discount_tiers"("tenantId");

-- CreateIndex
CREATE INDEX "discount_tiers_level_idx" ON "discount_tiers"("level");

-- CreateIndex
CREATE INDEX "discount_tiers_isActive_idx" ON "discount_tiers"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "discount_tiers_tenantId_code_key" ON "discount_tiers"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "user_discount_tiers_userId_key" ON "user_discount_tiers"("userId");

-- CreateIndex
CREATE INDEX "user_discount_tiers_tenantId_idx" ON "user_discount_tiers"("tenantId");

-- CreateIndex
CREATE INDEX "user_discount_tiers_discountTierId_idx" ON "user_discount_tiers"("discountTierId");

-- CreateIndex
CREATE UNIQUE INDEX "user_discount_tiers_tenantId_userId_key" ON "user_discount_tiers"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "promotions_tenantId_idx" ON "promotions"("tenantId");

-- CreateIndex
CREATE INDEX "promotions_isActive_idx" ON "promotions"("isActive");

-- CreateIndex
CREATE INDEX "promotions_startDate_endDate_idx" ON "promotions"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "promotions_type_idx" ON "promotions"("type");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_tenantId_code_key" ON "promotions"("tenantId", "code");

-- CreateIndex
CREATE INDEX "coupons_tenantId_idx" ON "coupons"("tenantId");

-- CreateIndex
CREATE INDEX "coupons_promotionId_idx" ON "coupons"("promotionId");

-- CreateIndex
CREATE INDEX "coupons_assignedToId_idx" ON "coupons"("assignedToId");

-- CreateIndex
CREATE INDEX "coupons_isActive_idx" ON "coupons"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_tenantId_code_key" ON "coupons"("tenantId", "code");

-- CreateIndex
CREATE INDEX "promotion_usages_tenantId_idx" ON "promotion_usages"("tenantId");

-- CreateIndex
CREATE INDEX "promotion_usages_promotionId_idx" ON "promotion_usages"("promotionId");

-- CreateIndex
CREATE INDEX "promotion_usages_couponId_idx" ON "promotion_usages"("couponId");

-- CreateIndex
CREATE INDEX "promotion_usages_userId_idx" ON "promotion_usages"("userId");

-- CreateIndex
CREATE INDEX "promotion_usages_usedAt_idx" ON "promotion_usages"("usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "partners_userId_key" ON "partners"("userId");

-- CreateIndex
CREATE INDEX "partners_tenantId_idx" ON "partners"("tenantId");

-- CreateIndex
CREATE INDEX "partners_userId_idx" ON "partners"("userId");

-- CreateIndex
CREATE INDEX "partners_organizationId_idx" ON "partners"("organizationId");

-- CreateIndex
CREATE INDEX "partners_isActive_idx" ON "partners"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "partners_tenantId_code_key" ON "partners"("tenantId", "code");

-- CreateIndex
CREATE INDEX "partner_team_members_tenantId_idx" ON "partner_team_members"("tenantId");

-- CreateIndex
CREATE INDEX "partner_team_members_partnerId_idx" ON "partner_team_members"("partnerId");

-- CreateIndex
CREATE INDEX "partner_team_members_userId_idx" ON "partner_team_members"("userId");

-- CreateIndex
CREATE INDEX "partner_team_members_isActive_idx" ON "partner_team_members"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "partner_team_members_partnerId_userId_key" ON "partner_team_members"("partnerId", "userId");

-- CreateIndex
CREATE INDEX "partner_commissions_tenantId_idx" ON "partner_commissions"("tenantId");

-- CreateIndex
CREATE INDEX "partner_commissions_partnerId_idx" ON "partner_commissions"("partnerId");

-- CreateIndex
CREATE INDEX "partner_commissions_orderId_idx" ON "partner_commissions"("orderId");

-- CreateIndex
CREATE INDEX "partner_commissions_teamMemberId_idx" ON "partner_commissions"("teamMemberId");

-- CreateIndex
CREATE INDEX "partner_commissions_status_idx" ON "partner_commissions"("status");

-- CreateIndex
CREATE INDEX "partner_commissions_createdAt_idx" ON "partner_commissions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "partner_commissions_partnerId_orderId_key" ON "partner_commissions"("partnerId", "orderId");

-- CreateIndex
CREATE INDEX "partner_resources_tenantId_idx" ON "partner_resources"("tenantId");

-- CreateIndex
CREATE INDEX "partner_resources_partnerId_idx" ON "partner_resources"("partnerId");

-- CreateIndex
CREATE INDEX "partner_resources_type_idx" ON "partner_resources"("type");

-- CreateIndex
CREATE INDEX "partner_resources_isPublic_idx" ON "partner_resources"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "integration_messages_messageId_key" ON "integration_messages"("messageId");

-- CreateIndex
CREATE INDEX "integration_messages_messageId_idx" ON "integration_messages"("messageId");

-- CreateIndex
CREATE INDEX "integration_messages_correlationId_idx" ON "integration_messages"("correlationId");

-- CreateIndex
CREATE INDEX "integration_messages_sourceConnector_idx" ON "integration_messages"("sourceConnector");

-- CreateIndex
CREATE INDEX "integration_messages_targetConnector_idx" ON "integration_messages"("targetConnector");

-- CreateIndex
CREATE INDEX "integration_messages_status_idx" ON "integration_messages"("status");

-- CreateIndex
CREATE INDEX "integration_messages_type_idx" ON "integration_messages"("type");

-- CreateIndex
CREATE INDEX "integration_messages_idempotencyKey_idx" ON "integration_messages"("idempotencyKey");

-- CreateIndex
CREATE INDEX "integration_messages_nextRetryAt_idx" ON "integration_messages"("nextRetryAt");

-- CreateIndex
CREATE INDEX "integration_messages_movedToDlqAt_idx" ON "integration_messages"("movedToDlqAt");

-- CreateIndex
CREATE INDEX "integration_messages_createdAt_idx" ON "integration_messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connectors_code_key" ON "integration_connectors"("code");

-- CreateIndex
CREATE INDEX "integration_connectors_code_idx" ON "integration_connectors"("code");

-- CreateIndex
CREATE INDEX "integration_connectors_type_idx" ON "integration_connectors"("type");

-- CreateIndex
CREATE INDEX "integration_connectors_isActive_idx" ON "integration_connectors"("isActive");

-- CreateIndex
CREATE INDEX "integration_connectors_circuitState_idx" ON "integration_connectors"("circuitState");

-- CreateIndex
CREATE INDEX "integration_connectors_healthStatus_idx" ON "integration_connectors"("healthStatus");

-- CreateIndex
CREATE INDEX "integration_dead_letters_originalMessageId_idx" ON "integration_dead_letters"("originalMessageId");

-- CreateIndex
CREATE INDEX "integration_dead_letters_connector_idx" ON "integration_dead_letters"("connector");

-- CreateIndex
CREATE INDEX "integration_dead_letters_reason_idx" ON "integration_dead_letters"("reason");

-- CreateIndex
CREATE INDEX "integration_dead_letters_retryable_idx" ON "integration_dead_letters"("retryable");

-- CreateIndex
CREATE INDEX "integration_dead_letters_createdAt_idx" ON "integration_dead_letters"("createdAt");

-- CreateIndex
CREATE INDEX "integration_transformations_sourceConnector_idx" ON "integration_transformations"("sourceConnector");

-- CreateIndex
CREATE INDEX "integration_transformations_targetConnector_idx" ON "integration_transformations"("targetConnector");

-- CreateIndex
CREATE INDEX "integration_transformations_isActive_idx" ON "integration_transformations"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "integration_transformations_sourceConnector_targetConnector_key" ON "integration_transformations"("sourceConnector", "targetConnector", "sourceType", "targetType");

-- CreateIndex
CREATE INDEX "connector_configs_tenantId_idx" ON "connector_configs"("tenantId");

-- CreateIndex
CREATE INDEX "connector_configs_connectorId_idx" ON "connector_configs"("connectorId");

-- CreateIndex
CREATE INDEX "connector_configs_isActive_idx" ON "connector_configs"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "connector_configs_tenantId_connectorId_name_key" ON "connector_configs"("tenantId", "connectorId", "name");

-- CreateIndex
CREATE INDEX "credential_vaults_tenantId_idx" ON "credential_vaults"("tenantId");

-- CreateIndex
CREATE INDEX "credential_vaults_type_idx" ON "credential_vaults"("type");

-- CreateIndex
CREATE INDEX "credential_vaults_expiresAt_idx" ON "credential_vaults"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "credential_vaults_tenantId_name_key" ON "credential_vaults"("tenantId", "name");

-- CreateIndex
CREATE INDEX "connector_capabilities_connectorId_idx" ON "connector_capabilities"("connectorId");

-- CreateIndex
CREATE INDEX "connector_capabilities_category_idx" ON "connector_capabilities"("category");

-- CreateIndex
CREATE UNIQUE INDEX "connector_capabilities_connectorId_code_key" ON "connector_capabilities"("connectorId", "code");

-- CreateIndex
CREATE INDEX "connector_events_connectorCode_idx" ON "connector_events"("connectorCode");

-- CreateIndex
CREATE INDEX "connector_events_eventType_idx" ON "connector_events"("eventType");

-- CreateIndex
CREATE INDEX "connector_events_tenantId_idx" ON "connector_events"("tenantId");

-- CreateIndex
CREATE INDEX "connector_events_createdAt_idx" ON "connector_events"("createdAt");

-- CreateIndex
CREATE INDEX "warehouses_tenantId_idx" ON "warehouses"("tenantId");

-- CreateIndex
CREATE INDEX "warehouses_isActive_idx" ON "warehouses"("isActive");

-- CreateIndex
CREATE INDEX "warehouses_isDefault_idx" ON "warehouses"("isDefault");

-- CreateIndex
CREATE INDEX "warehouses_externalId_idx" ON "warehouses"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_tenantId_code_key" ON "warehouses"("tenantId", "code");

-- CreateIndex
CREATE INDEX "inventory_levels_tenantId_idx" ON "inventory_levels"("tenantId");

-- CreateIndex
CREATE INDEX "inventory_levels_warehouseId_idx" ON "inventory_levels"("warehouseId");

-- CreateIndex
CREATE INDEX "inventory_levels_sku_idx" ON "inventory_levels"("sku");

-- CreateIndex
CREATE INDEX "inventory_levels_masterProductId_idx" ON "inventory_levels"("masterProductId");

-- CreateIndex
CREATE INDEX "inventory_levels_availability_idx" ON "inventory_levels"("availability");

-- CreateIndex
CREATE INDEX "inventory_levels_atp_idx" ON "inventory_levels"("atp");

-- CreateIndex
CREATE INDEX "inventory_levels_lastSyncAt_idx" ON "inventory_levels"("lastSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_levels_tenantId_warehouseId_sku_key" ON "inventory_levels"("tenantId", "warehouseId", "sku");

-- CreateIndex
CREATE INDEX "inventory_reservations_tenantId_idx" ON "inventory_reservations"("tenantId");

-- CreateIndex
CREATE INDEX "inventory_reservations_warehouseId_idx" ON "inventory_reservations"("warehouseId");

-- CreateIndex
CREATE INDEX "inventory_reservations_inventoryLevelId_idx" ON "inventory_reservations"("inventoryLevelId");

-- CreateIndex
CREATE INDEX "inventory_reservations_sku_idx" ON "inventory_reservations"("sku");

-- CreateIndex
CREATE INDEX "inventory_reservations_status_idx" ON "inventory_reservations"("status");

-- CreateIndex
CREATE INDEX "inventory_reservations_sourceType_sourceId_idx" ON "inventory_reservations"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "inventory_reservations_expiresAt_idx" ON "inventory_reservations"("expiresAt");

-- CreateIndex
CREATE INDEX "inventory_reservations_createdAt_idx" ON "inventory_reservations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_reservations_tenantId_reservationNumber_key" ON "inventory_reservations"("tenantId", "reservationNumber");

-- CreateIndex
CREATE INDEX "inventory_movements_tenantId_idx" ON "inventory_movements"("tenantId");

-- CreateIndex
CREATE INDEX "inventory_movements_inventoryLevelId_idx" ON "inventory_movements"("inventoryLevelId");

-- CreateIndex
CREATE INDEX "inventory_movements_type_idx" ON "inventory_movements"("type");

-- CreateIndex
CREATE INDEX "inventory_movements_referenceType_referenceId_idx" ON "inventory_movements"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "inventory_movements_createdAt_idx" ON "inventory_movements"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_movements_tenantId_movementNumber_key" ON "inventory_movements"("tenantId", "movementNumber");

-- CreateIndex
CREATE INDEX "inventory_alerts_tenantId_idx" ON "inventory_alerts"("tenantId");

-- CreateIndex
CREATE INDEX "inventory_alerts_inventoryLevelId_idx" ON "inventory_alerts"("inventoryLevelId");

-- CreateIndex
CREATE INDEX "inventory_alerts_alertType_idx" ON "inventory_alerts"("alertType");

-- CreateIndex
CREATE INDEX "inventory_alerts_status_idx" ON "inventory_alerts"("status");

-- CreateIndex
CREATE INDEX "inventory_alerts_severity_idx" ON "inventory_alerts"("severity");

-- CreateIndex
CREATE INDEX "inventory_alerts_createdAt_idx" ON "inventory_alerts"("createdAt");

-- CreateIndex
CREATE INDEX "inventory_sync_jobs_tenantId_idx" ON "inventory_sync_jobs"("tenantId");

-- CreateIndex
CREATE INDEX "inventory_sync_jobs_jobType_idx" ON "inventory_sync_jobs"("jobType");

-- CreateIndex
CREATE INDEX "inventory_sync_jobs_status_idx" ON "inventory_sync_jobs"("status");

-- CreateIndex
CREATE INDEX "inventory_sync_jobs_createdAt_idx" ON "inventory_sync_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "price_lists_tenantId_idx" ON "price_lists"("tenantId");

-- CreateIndex
CREATE INDEX "price_lists_status_idx" ON "price_lists"("status");

-- CreateIndex
CREATE INDEX "price_lists_effectiveFrom_effectiveTo_idx" ON "price_lists"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "price_lists_currency_idx" ON "price_lists"("currency");

-- CreateIndex
CREATE INDEX "price_lists_priority_idx" ON "price_lists"("priority");

-- CreateIndex
CREATE INDEX "price_lists_isDefault_idx" ON "price_lists"("isDefault");

-- CreateIndex
CREATE INDEX "price_lists_externalId_idx" ON "price_lists"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "price_lists_tenantId_code_key" ON "price_lists"("tenantId", "code");

-- CreateIndex
CREATE INDEX "price_list_items_priceListId_idx" ON "price_list_items"("priceListId");

-- CreateIndex
CREATE INDEX "price_list_items_sku_idx" ON "price_list_items"("sku");

-- CreateIndex
CREATE INDEX "price_list_items_masterProductId_idx" ON "price_list_items"("masterProductId");

-- CreateIndex
CREATE INDEX "price_list_items_isActive_idx" ON "price_list_items"("isActive");

-- CreateIndex
CREATE INDEX "price_list_items_effectiveFrom_effectiveTo_idx" ON "price_list_items"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "price_list_items_priceListId_sku_key" ON "price_list_items"("priceListId", "sku");

-- CreateIndex
CREATE INDEX "customer_price_assignments_tenantId_idx" ON "customer_price_assignments"("tenantId");

-- CreateIndex
CREATE INDEX "customer_price_assignments_priceListId_idx" ON "customer_price_assignments"("priceListId");

-- CreateIndex
CREATE INDEX "customer_price_assignments_assignmentType_assignmentId_idx" ON "customer_price_assignments"("assignmentType", "assignmentId");

-- CreateIndex
CREATE INDEX "customer_price_assignments_effectiveFrom_effectiveTo_idx" ON "customer_price_assignments"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "customer_price_assignments_isActive_idx" ON "customer_price_assignments"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "customer_price_assignments_tenantId_priceListId_assignmentT_key" ON "customer_price_assignments"("tenantId", "priceListId", "assignmentType", "assignmentId");

-- CreateIndex
CREATE INDEX "price_overrides_tenantId_idx" ON "price_overrides"("tenantId");

-- CreateIndex
CREATE INDEX "price_overrides_priceListItemId_idx" ON "price_overrides"("priceListItemId");

-- CreateIndex
CREATE INDEX "price_overrides_scopeType_scopeId_idx" ON "price_overrides"("scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "price_overrides_effectiveFrom_effectiveTo_idx" ON "price_overrides"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "price_overrides_status_idx" ON "price_overrides"("status");

-- CreateIndex
CREATE INDEX "currency_exchange_rates_tenantId_idx" ON "currency_exchange_rates"("tenantId");

-- CreateIndex
CREATE INDEX "currency_exchange_rates_sourceCurrency_targetCurrency_idx" ON "currency_exchange_rates"("sourceCurrency", "targetCurrency");

-- CreateIndex
CREATE INDEX "currency_exchange_rates_effectiveFrom_effectiveTo_idx" ON "currency_exchange_rates"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "currency_exchange_rates_isActive_idx" ON "currency_exchange_rates"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "currency_exchange_rates_tenantId_sourceCurrency_targetCurre_key" ON "currency_exchange_rates"("tenantId", "sourceCurrency", "targetCurrency", "effectiveFrom", "rateType");

-- CreateIndex
CREATE INDEX "price_list_sync_jobs_tenantId_idx" ON "price_list_sync_jobs"("tenantId");

-- CreateIndex
CREATE INDEX "price_list_sync_jobs_priceListId_idx" ON "price_list_sync_jobs"("priceListId");

-- CreateIndex
CREATE INDEX "price_list_sync_jobs_jobType_idx" ON "price_list_sync_jobs"("jobType");

-- CreateIndex
CREATE INDEX "price_list_sync_jobs_status_idx" ON "price_list_sync_jobs"("status");

-- CreateIndex
CREATE INDEX "price_list_sync_jobs_createdAt_idx" ON "price_list_sync_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "master_products_categoryId_idx" ON "master_products"("categoryId");

-- CreateIndex
CREATE INDEX "master_products_availability_idx" ON "master_products"("availability");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_products" ADD CONSTRAINT "master_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_refundedById_fkey" FOREIGN KEY ("refundedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "master_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "master_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method_user_types" ADD CONSTRAINT "payment_method_user_types_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_methods" ADD CONSTRAINT "delivery_methods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_deductions" ADD CONSTRAINT "salary_deductions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_deductions" ADD CONSTRAINT "salary_deductions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_deduction_transactions" ADD CONSTRAINT "salary_deduction_transactions_salaryDeductionId_fkey" FOREIGN KEY ("salaryDeductionId") REFERENCES "salary_deductions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_deduction_limit_requests" ADD CONSTRAINT "salary_deduction_limit_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_deduction_limit_requests" ADD CONSTRAINT "salary_deduction_limit_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_deduction_limit_requests" ADD CONSTRAINT "salary_deduction_limit_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_tiers" ADD CONSTRAINT "discount_tiers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_discount_tiers" ADD CONSTRAINT "user_discount_tiers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_discount_tiers" ADD CONSTRAINT "user_discount_tiers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_discount_tiers" ADD CONSTRAINT "user_discount_tiers_discountTierId_fkey" FOREIGN KEY ("discountTierId") REFERENCES "discount_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_discount_tiers" ADD CONSTRAINT "user_discount_tiers_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_team_members" ADD CONSTRAINT "partner_team_members_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_team_members" ADD CONSTRAINT "partner_team_members_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_team_members" ADD CONSTRAINT "partner_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_resources" ADD CONSTRAINT "partner_resources_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_resources" ADD CONSTRAINT "partner_resources_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_configs" ADD CONSTRAINT "connector_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_configs" ADD CONSTRAINT "connector_configs_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "integration_connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_configs" ADD CONSTRAINT "connector_configs_credentialVaultId_fkey" FOREIGN KEY ("credentialVaultId") REFERENCES "credential_vaults"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_vaults" ADD CONSTRAINT "credential_vaults_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_capabilities" ADD CONSTRAINT "connector_capabilities_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "integration_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "master_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_inventoryLevelId_fkey" FOREIGN KEY ("inventoryLevelId") REFERENCES "inventory_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventoryLevelId_fkey" FOREIGN KEY ("inventoryLevelId") REFERENCES "inventory_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_alerts" ADD CONSTRAINT "inventory_alerts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_alerts" ADD CONSTRAINT "inventory_alerts_inventoryLevelId_fkey" FOREIGN KEY ("inventoryLevelId") REFERENCES "inventory_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_sync_jobs" ADD CONSTRAINT "inventory_sync_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_basePriceListId_fkey" FOREIGN KEY ("basePriceListId") REFERENCES "price_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "master_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_price_assignments" ADD CONSTRAINT "customer_price_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_price_assignments" ADD CONSTRAINT "customer_price_assignments_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_overrides" ADD CONSTRAINT "price_overrides_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_overrides" ADD CONSTRAINT "price_overrides_priceListItemId_fkey" FOREIGN KEY ("priceListItemId") REFERENCES "price_list_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_exchange_rates" ADD CONSTRAINT "currency_exchange_rates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_sync_jobs" ADD CONSTRAINT "price_list_sync_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_sync_jobs" ADD CONSTRAINT "price_list_sync_jobs_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
