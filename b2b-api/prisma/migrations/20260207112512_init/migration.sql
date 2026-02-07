-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "MasterProductStatus" AS ENUM ('ACTIVE', 'DISCONTINUED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApprovalEntity" AS ENUM ('CONTRACT', 'QUOTE');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('SUBMIT', 'APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApproverType" AS ENUM ('USER', 'ROLE', 'MANAGER', 'ORGANIZATION_HEAD');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR', 'APPROVAL_REQUIRED', 'APPROVAL_COMPLETED', 'CONTRACT_EXPIRING', 'QUOTE_EXPIRING');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "parentId" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "totalValue" DECIMAL(15,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "terms" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_versions" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changes" JSONB NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractId" TEXT NOT NULL,

    CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "subtotal" DECIMAL(15,2) NOT NULL,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_line_items" (
    "id" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "productSku" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,
    "quoteId" TEXT NOT NULL,
    "masterProductId" TEXT,

    CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "brand" TEXT,
    "manufacturer" TEXT,
    "uom" TEXT NOT NULL DEFAULT 'EA',
    "listPrice" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "MasterProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_product_access" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "agreedPrice" DECIMAL(15,2),
    "discountPercent" DECIMAL(5,2),
    "minQuantity" INTEGER,
    "maxQuantity" INTEGER,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "masterProductId" TEXT NOT NULL,

    CONSTRAINT "tenant_product_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_chains" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" "ApprovalEntity" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "approval_chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_chain_levels" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "approverType" "ApproverType" NOT NULL,
    "minApprovers" INTEGER NOT NULL DEFAULT 1,
    "allowDelegation" BOOLEAN NOT NULL DEFAULT false,
    "thresholdMin" DECIMAL(15,2),
    "thresholdMax" DECIMAL(15,2),
    "timeoutHours" INTEGER,
    "escalationLevel" INTEGER,
    "chainId" TEXT NOT NULL,
    "approverUserId" TEXT,
    "approverRoleId" TEXT,

    CONSTRAINT "approval_chain_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "entityType" "ApprovalEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_steps" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "delegatedFrom" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "requestId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "entityType" "ApprovalEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_isActive_idx" ON "tenants"("isActive");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "organizations_tenantId_idx" ON "organizations"("tenantId");

-- CreateIndex
CREATE INDEX "organizations_parentId_idx" ON "organizations"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_tenantId_code_key" ON "organizations"("tenantId", "code");

-- CreateIndex
CREATE INDEX "contracts_tenantId_idx" ON "contracts"("tenantId");

-- CreateIndex
CREATE INDEX "contracts_organizationId_idx" ON "contracts"("organizationId");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_createdById_idx" ON "contracts"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_tenantId_contractNumber_key" ON "contracts"("tenantId", "contractNumber");

-- CreateIndex
CREATE INDEX "contract_versions_contractId_idx" ON "contract_versions"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_versions_contractId_version_key" ON "contract_versions"("contractId", "version");

-- CreateIndex
CREATE INDEX "quotes_tenantId_idx" ON "quotes"("tenantId");

-- CreateIndex
CREATE INDEX "quotes_contractId_idx" ON "quotes"("contractId");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quotes_createdById_idx" ON "quotes"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_tenantId_quoteNumber_key" ON "quotes"("tenantId", "quoteNumber");

-- CreateIndex
CREATE INDEX "quote_line_items_quoteId_idx" ON "quote_line_items"("quoteId");

-- CreateIndex
CREATE INDEX "quote_line_items_masterProductId_idx" ON "quote_line_items"("masterProductId");

-- CreateIndex
CREATE UNIQUE INDEX "quote_line_items_quoteId_lineNumber_key" ON "quote_line_items"("quoteId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "master_products_sku_key" ON "master_products"("sku");

-- CreateIndex
CREATE INDEX "master_products_sku_idx" ON "master_products"("sku");

-- CreateIndex
CREATE INDEX "master_products_category_idx" ON "master_products"("category");

-- CreateIndex
CREATE INDEX "master_products_status_idx" ON "master_products"("status");

-- CreateIndex
CREATE INDEX "tenant_product_access_tenantId_idx" ON "tenant_product_access"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_product_access_masterProductId_idx" ON "tenant_product_access"("masterProductId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_product_access_tenantId_masterProductId_key" ON "tenant_product_access"("tenantId", "masterProductId");

-- CreateIndex
CREATE INDEX "approval_chains_tenantId_idx" ON "approval_chains"("tenantId");

-- CreateIndex
CREATE INDEX "approval_chains_entityType_idx" ON "approval_chains"("entityType");

-- CreateIndex
CREATE INDEX "approval_chains_isActive_idx" ON "approval_chains"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "approval_chains_tenantId_name_key" ON "approval_chains"("tenantId", "name");

-- CreateIndex
CREATE INDEX "approval_chain_levels_chainId_idx" ON "approval_chain_levels"("chainId");

-- CreateIndex
CREATE UNIQUE INDEX "approval_chain_levels_chainId_level_key" ON "approval_chain_levels"("chainId", "level");

-- CreateIndex
CREATE INDEX "approval_requests_tenantId_idx" ON "approval_requests"("tenantId");

-- CreateIndex
CREATE INDEX "approval_requests_entityType_entityId_idx" ON "approval_requests"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "approval_requests_chainId_idx" ON "approval_requests"("chainId");

-- CreateIndex
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");

-- CreateIndex
CREATE INDEX "approval_steps_requestId_idx" ON "approval_steps"("requestId");

-- CreateIndex
CREATE INDEX "approval_steps_approverId_idx" ON "approval_steps"("approverId");

-- CreateIndex
CREATE INDEX "approval_steps_status_idx" ON "approval_steps"("status");

-- CreateIndex
CREATE INDEX "approvals_tenantId_idx" ON "approvals"("tenantId");

-- CreateIndex
CREATE INDEX "approvals_entityType_entityId_idx" ON "approvals"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "approvals_approverId_idx" ON "approvals"("approverId");

-- CreateIndex
CREATE INDEX "approvals_status_idx" ON "approvals"("status");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_idx" ON "audit_logs"("tenantId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_tenantId_idx" ON "notifications"("tenantId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "files_tenantId_idx" ON "files"("tenantId");

-- CreateIndex
CREATE INDEX "files_uploadedById_idx" ON "files"("uploadedById");

-- CreateIndex
CREATE INDEX "files_entityType_entityId_idx" ON "files"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "files_bucket_key_key" ON "files"("bucket", "key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "master_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_product_access" ADD CONSTRAINT "tenant_product_access_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_product_access" ADD CONSTRAINT "tenant_product_access_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "master_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_chains" ADD CONSTRAINT "approval_chains_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_chain_levels" ADD CONSTRAINT "approval_chain_levels_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "approval_chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approval_contract_fk" FOREIGN KEY ("entityId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approval_quote_fk" FOREIGN KEY ("entityId") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
