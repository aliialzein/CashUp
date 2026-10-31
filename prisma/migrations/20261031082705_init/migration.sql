-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "CashUpStatus" AS ENUM ('OPEN', 'SUBMITTED', 'APPROVED', 'VOID');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('TO_DELIVER', 'DELIVERED', 'DELETED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'LBP');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'WHISH', 'OMT');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('DELETE_SALE', 'VOID_CASHUP');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('AWAITING_OWNER', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AmendmentStatus" AS ENUM ('AWAITING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AmendmentChangeKind" AS ENUM ('SALE_FIELD', 'COUNT_ENTRY');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('USER', 'BUSINESS', 'MEMBERSHIP', 'JOIN_CODE', 'CASH_UP', 'SALE', 'CASH_OUT', 'COUNT_ENTRY', 'REQUEST', 'AMENDMENT');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('BUSINESS_CREATED', 'JOIN_CODE_CREATED', 'JOIN_CODE_REVOKED', 'JOIN_CODE_USED', 'MEMBER_JOINED', 'MEMBER_DEACTIVATED', 'MEMBER_REACTIVATED', 'CASHUP_OPENED', 'CASHUP_SUBMITTED', 'CASHUP_APPROVED', 'CASHUP_SELF_APPROVED', 'CASHUP_RETURNED', 'CASHUP_VOIDED', 'SALE_CREATED', 'SALE_EDITED', 'SALE_DELIVERED', 'SALE_CANCELLED', 'SALE_LOCKED_FOR_DELETION', 'SALE_DELETED', 'CASHOUT_CREATED', 'CASHOUT_EDITED', 'COUNT_UPDATED', 'REQUEST_CREATED', 'REQUEST_WITHDRAWN', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'AMENDMENT_PROPOSED', 'AMENDMENT_APPROVED', 'AMENDMENT_REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isSolo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMPTZ(3),

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "join_codes" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'STAFF',
    "label" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "usedById" UUID,
    "revokedAt" TIMESTAMPTZ(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "join_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_ups" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "status" "CashUpStatus" NOT NULL DEFAULT 'OPEN',
    "floatUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "floatLbp" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "referenceRate" DECIMAL(18,2),
    "openedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countStartedAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "approvedAt" TIMESTAMPTZ(3),
    "voidedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "approvedById" UUID,
    "selfApproved" BOOLEAN NOT NULL DEFAULT false,
    "returnReason" TEXT,
    "voidReason" TEXT,
    "lastSaleNumber" INTEGER NOT NULL DEFAULT 0,
    "expectedUsd" DECIMAL(18,2),
    "expectedLbp" DECIMAL(18,2),
    "countedUsd" DECIMAL(18,2),
    "countedLbp" DECIMAL(18,2),
    "gapUsd" DECIMAL(18,2),
    "gapLbp" DECIMAL(18,2),

    CONSTRAINT "cash_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cashUpId" UUID NOT NULL,
    "saleNumber" INTEGER NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'DELIVERED',
    "businessAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deliveryFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tip" DECIMAL(18,2),
    "discount" DECIMAL(18,2),
    "totalCollected" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "changeGiven" DECIMAL(18,2),
    "changeCurrency" "Currency",
    "clientNumber" TEXT,
    "note" TEXT,
    "mixedChange" BOOLEAN NOT NULL DEFAULT false,
    "amountDiffers" BOOLEAN NOT NULL DEFAULT false,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "deletionAwaiting" BOOLEAN NOT NULL DEFAULT false,
    "cancelReason" TEXT,
    "idempotencyKey" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMPTZ(3),
    "deletedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_edits" (
    "id" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "editedById" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_edits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_outs" (
    "id" UUID NOT NULL,
    "cashUpId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotencyKey" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cash_outs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "count_entries" (
    "id" UUID NOT NULL,
    "cashUpId" UUID NOT NULL,
    "currency" "Currency" NOT NULL,
    "denomination" DECIMAL(18,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "count_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'AWAITING_OWNER',
    "reason" TEXT NOT NULL,
    "requestedById" UUID NOT NULL,
    "saleId" UUID,
    "cashUpId" UUID NOT NULL,
    "decidedById" UUID,
    "decisionReason" TEXT,
    "selfApproved" BOOLEAN NOT NULL DEFAULT false,
    "decidedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amendments" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cashUpId" UUID NOT NULL,
    "status" "AmendmentStatus" NOT NULL DEFAULT 'AWAITING_APPROVAL',
    "reason" TEXT NOT NULL,
    "proposedById" UUID NOT NULL,
    "decidedById" UUID,
    "decisionReason" TEXT,
    "selfApproved" BOOLEAN NOT NULL DEFAULT false,
    "decidedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amendment_changes" (
    "id" UUID NOT NULL,
    "amendmentId" UUID NOT NULL,
    "kind" "AmendmentChangeKind" NOT NULL,
    "saleId" UUID,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "countEntryId" UUID,
    "oldQuantity" INTEGER,
    "newQuantity" INTEGER,

    CONSTRAINT "amendment_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "businessId" UUID,
    "actorId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "memberships_businessId_role_idx" ON "memberships"("businessId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_userId_businessId_key" ON "memberships"("userId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "join_codes_codeHash_key" ON "join_codes"("codeHash");

-- CreateIndex
CREATE INDEX "join_codes_businessId_createdAt_idx" ON "join_codes"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "cash_ups_businessId_status_idx" ON "cash_ups"("businessId", "status");

-- CreateIndex
CREATE INDEX "cash_ups_membershipId_status_idx" ON "cash_ups"("membershipId", "status");

-- CreateIndex
CREATE INDEX "cash_ups_businessId_openedAt_idx" ON "cash_ups"("businessId", "openedAt");

-- CreateIndex
CREATE INDEX "sales_cashUpId_status_idx" ON "sales"("cashUpId", "status");

-- CreateIndex
CREATE INDEX "sales_businessId_clientNumber_idx" ON "sales"("businessId", "clientNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sales_cashUpId_saleNumber_key" ON "sales"("cashUpId", "saleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sales_businessId_idempotencyKey_key" ON "sales"("businessId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "sale_edits_saleId_createdAt_idx" ON "sale_edits"("saleId", "createdAt");

-- CreateIndex
CREATE INDEX "cash_outs_cashUpId_idx" ON "cash_outs"("cashUpId");

-- CreateIndex
CREATE UNIQUE INDEX "cash_outs_cashUpId_idempotencyKey_key" ON "cash_outs"("cashUpId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "count_entries_cashUpId_currency_denomination_key" ON "count_entries"("cashUpId", "currency", "denomination");

-- CreateIndex
CREATE INDEX "requests_businessId_status_createdAt_idx" ON "requests"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "requests_cashUpId_status_idx" ON "requests"("cashUpId", "status");

-- CreateIndex
CREATE INDEX "amendments_businessId_status_idx" ON "amendments"("businessId", "status");

-- CreateIndex
CREATE INDEX "amendments_cashUpId_idx" ON "amendments"("cashUpId");

-- CreateIndex
CREATE INDEX "amendment_changes_amendmentId_idx" ON "amendment_changes"("amendmentId");

-- CreateIndex
CREATE INDEX "audit_logs_businessId_createdAt_idx" ON "audit_logs"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_codes" ADD CONSTRAINT "join_codes_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_codes" ADD CONSTRAINT "join_codes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_codes" ADD CONSTRAINT "join_codes_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_ups" ADD CONSTRAINT "cash_ups_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_ups" ADD CONSTRAINT "cash_ups_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_ups" ADD CONSTRAINT "cash_ups_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cashUpId_fkey" FOREIGN KEY ("cashUpId") REFERENCES "cash_ups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_edits" ADD CONSTRAINT "sale_edits_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_edits" ADD CONSTRAINT "sale_edits_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_outs" ADD CONSTRAINT "cash_outs_cashUpId_fkey" FOREIGN KEY ("cashUpId") REFERENCES "cash_ups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "count_entries" ADD CONSTRAINT "count_entries_cashUpId_fkey" FOREIGN KEY ("cashUpId") REFERENCES "cash_ups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_cashUpId_fkey" FOREIGN KEY ("cashUpId") REFERENCES "cash_ups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amendments" ADD CONSTRAINT "amendments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amendments" ADD CONSTRAINT "amendments_cashUpId_fkey" FOREIGN KEY ("cashUpId") REFERENCES "cash_ups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amendments" ADD CONSTRAINT "amendments_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amendments" ADD CONSTRAINT "amendments_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amendment_changes" ADD CONSTRAINT "amendment_changes_amendmentId_fkey" FOREIGN KEY ("amendmentId") REFERENCES "amendments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amendment_changes" ADD CONSTRAINT "amendment_changes_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amendment_changes" ADD CONSTRAINT "amendment_changes_countEntryId_fkey" FOREIGN KEY ("countEntryId") REFERENCES "count_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
