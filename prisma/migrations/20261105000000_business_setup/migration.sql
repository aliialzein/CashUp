ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BUSINESS_SOLO_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEMBER_ROLE_CHANGED';

CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE "memberships"
  ADD COLUMN "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "memberships"
SET
  "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"MembershipStatus" ELSE 'INACTIVE'::"MembershipStatus" END,
  "deactivatedAt" = CASE
    WHEN "isActive" THEN NULL
    ELSE COALESCE("deactivatedAt", CURRENT_TIMESTAMP)
  END;

DROP INDEX "one_active_manager_per_business";
DROP INDEX "memberships_userId_businessId_key";

ALTER TABLE "memberships"
  DROP COLUMN "isActive",
  ADD CONSTRAINT "memberships_status_deactivatedAt_check"
    CHECK (
      ("status" = 'ACTIVE' AND "deactivatedAt" IS NULL)
      OR ("status" = 'INACTIVE' AND "deactivatedAt" IS NOT NULL)
    );

CREATE UNIQUE INDEX "memberships_userId_key" ON "memberships"("userId");
CREATE UNIQUE INDEX one_active_manager_per_business
  ON "memberships" ("businessId")
  WHERE role = 'MANAGER' AND status = 'ACTIVE';

ALTER TABLE "join_codes" DROP CONSTRAINT "join_codes_usedById_fkey";
ALTER TABLE "join_codes" RENAME COLUMN "createdById" TO "createdByUserId";
ALTER TABLE "join_codes"
  ADD COLUMN "maxUses" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "usedCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "join_codes"
SET "usedCount" = CASE WHEN "usedAt" IS NULL THEN 0 ELSE 1 END,
    role = 'STAFF';

ALTER TABLE "join_codes" ALTER COLUMN "maxUses" DROP DEFAULT;

ALTER TABLE "join_codes" DROP CONSTRAINT "join_code_not_owner";
ALTER TABLE "join_codes"
  RENAME CONSTRAINT "join_codes_createdById_fkey" TO "join_codes_createdByUserId_fkey";
ALTER TABLE "join_codes"
  ADD CONSTRAINT "join_code_staff_only" CHECK (role = 'STAFF'),
  ADD CONSTRAINT "join_code_uses_within_limit" CHECK ("usedCount" <= "maxUses"),
  ADD CONSTRAINT "join_code_max_uses_positive" CHECK ("maxUses" > 0),
  DROP COLUMN "label",
  DROP COLUMN "usedAt",
  DROP COLUMN "usedById";
