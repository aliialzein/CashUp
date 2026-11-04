-- CashOut status lifecycle support for cancellation while preserving existing rows.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CASHOUT_CANCELLED';

CREATE TYPE "CashOutStatus" AS ENUM ('ACTIVE', 'CANCELLED');

ALTER TABLE "cash_outs"
  ADD COLUMN "status" "CashOutStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "cancelledAt" TIMESTAMPTZ(3),
  ADD COLUMN "cancelReason" TEXT,
  ADD COLUMN "cancelledByMembershipId" UUID;

ALTER TABLE "cash_outs"
  ADD CONSTRAINT "cash_outs_cancelledByMembershipId_fkey"
  FOREIGN KEY ("cancelledByMembershipId") REFERENCES "memberships"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "cash_outs_cashUpId_status_idx"
  ON "cash_outs" ("cashUpId", "status");
