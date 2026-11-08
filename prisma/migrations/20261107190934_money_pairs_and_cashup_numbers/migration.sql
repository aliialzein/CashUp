BEGIN;

-- Prevent writes while amounts and counters are being migrated.
LOCK TABLE
  "businesses",
  "memberships",
  "cash_ups",
  "sales",
  "cash_outs"
IN ACCESS EXCLUSIVE MODE;

-- Stop rather than guess the currency of existing change.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "sales"
    WHERE COALESCE("changeGiven", 0) <> 0
      AND "changeCurrency" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot migrate: some sales have nonzero changeGiven with no changeCurrency. Resolve these rows first.';
  END IF;
END;
$$;

-- Remove the old checks before replacing their columns.
ALTER TABLE "sales"
  DROP CONSTRAINT IF EXISTS "sales_non_negative";

ALTER TABLE "cash_outs"
  DROP CONSTRAINT IF EXISTS "cash_outs_positive";

-- Business counter for allocating cash-up numbers.
ALTER TABLE "businesses"
  ADD COLUMN "lastCashUpNumber" INTEGER NOT NULL DEFAULT 0;

-- Add cash-up numbers as nullable until existing records are numbered.
ALTER TABLE "cash_ups"
  ADD COLUMN "number" INTEGER;

WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "businessId"
      ORDER BY "openedAt", "id"
    )::INTEGER AS cashup_number
  FROM "cash_ups"
)
UPDATE "cash_ups" AS cashup
SET "number" = numbered.cashup_number
FROM numbered
WHERE cashup."id" = numbered."id";

UPDATE "businesses" AS business
SET "lastCashUpNumber" = COALESCE(
  (
    SELECT MAX(cashup."number")
    FROM "cash_ups" AS cashup
    WHERE cashup."businessId" = business."id"
  ),
  0
);

ALTER TABLE "cash_ups"
  ALTER COLUMN "number" SET NOT NULL;

CREATE UNIQUE INDEX "cash_ups_businessId_number_key"
  ON "cash_ups"("businessId", "number");

-- Add cash-out money pairs while retaining the old columns.
ALTER TABLE "cash_outs"
  ADD COLUMN "amountUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "amountLbp" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "note" TEXT;

UPDATE "cash_outs"
SET
  "amountUsd" = CASE
    WHEN "currency" = 'USD' THEN "amount"
    ELSE 0
  END,
  "amountLbp" = CASE
    WHEN "currency" = 'LBP' THEN "amount"
    ELSE 0
  END;

-- Add sale money pairs while retaining the old columns.
ALTER TABLE "sales"
  ADD COLUMN "businessAmountUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "businessAmountLbp" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryFeeUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryFeeLbp" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "tipUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "tipLbp" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "discountUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "discountLbp" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "totalCollectedUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "totalCollectedLbp" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "changeGivenUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "changeGivenLbp" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- Order amounts follow the sale currency.
-- Change follows its own currency.
UPDATE "sales"
SET
  "businessAmountUsd" = CASE
    WHEN "currency" = 'USD' THEN "businessAmount"
    ELSE 0
  END,
  "businessAmountLbp" = CASE
    WHEN "currency" = 'LBP' THEN "businessAmount"
    ELSE 0
  END,

  "deliveryFeeUsd" = CASE
    WHEN "currency" = 'USD' THEN "deliveryFee"
    ELSE 0
  END,
  "deliveryFeeLbp" = CASE
    WHEN "currency" = 'LBP' THEN "deliveryFee"
    ELSE 0
  END,

  "tipUsd" = CASE
    WHEN "currency" = 'USD' THEN COALESCE("tip", 0)
    ELSE 0
  END,
  "tipLbp" = CASE
    WHEN "currency" = 'LBP' THEN COALESCE("tip", 0)
    ELSE 0
  END,

  "discountUsd" = CASE
    WHEN "currency" = 'USD' THEN COALESCE("discount", 0)
    ELSE 0
  END,
  "discountLbp" = CASE
    WHEN "currency" = 'LBP' THEN COALESCE("discount", 0)
    ELSE 0
  END,

  "totalCollectedUsd" = CASE
    WHEN "currency" = 'USD' THEN "totalCollected"
    ELSE 0
  END,
  "totalCollectedLbp" = CASE
    WHEN "currency" = 'LBP' THEN "totalCollected"
    ELSE 0
  END,

  "changeGivenUsd" = CASE
    WHEN "changeCurrency" = 'USD' THEN COALESCE("changeGiven", 0)
    ELSE 0
  END,
  "changeGivenLbp" = CASE
    WHEN "changeCurrency" = 'LBP' THEN COALESCE("changeGiven", 0)
    ELSE 0
  END;

-- Validate the new money columns before removing the originals.
ALTER TABLE "sales"
  ADD CONSTRAINT "sales_non_negative" CHECK (
    "businessAmountUsd" >= 0
    AND "businessAmountLbp" >= 0
    AND "deliveryFeeUsd" >= 0
    AND "deliveryFeeLbp" >= 0
    AND "tipUsd" >= 0
    AND "tipLbp" >= 0
    AND "discountUsd" >= 0
    AND "discountLbp" >= 0
    AND "totalCollectedUsd" >= 0
    AND "totalCollectedLbp" >= 0
    AND "changeGivenUsd" >= 0
    AND "changeGivenLbp" >= 0
  );

ALTER TABLE "cash_outs"
  ADD CONSTRAINT "cash_outs_positive" CHECK (
    "amountUsd" >= 0
    AND "amountLbp" >= 0
    AND ("amountUsd" > 0 OR "amountLbp" > 0)
  );

-- Remove old columns after the backfill and validation.
ALTER TABLE "sales"
  DROP COLUMN "businessAmount",
  DROP COLUMN "deliveryFee",
  DROP COLUMN "tip",
  DROP COLUMN "discount",
  DROP COLUMN "totalCollected",
  DROP COLUMN "changeGiven",
  DROP COLUMN "currency",
  DROP COLUMN "changeCurrency",
  DROP COLUMN "mixedChange";

ALTER TABLE "cash_outs"
  DROP COLUMN "amount",
  DROP COLUMN "currency";

-- Ensure the composite index exists before removing the old index.
CREATE INDEX IF NOT EXISTS "cash_outs_cashUpId_status_idx"
  ON "cash_outs"("cashUpId", "status");

DROP INDEX IF EXISTS "cash_outs_cashUpId_idx";

-- Enforce the existing one-active-manager business rule.
CREATE UNIQUE INDEX IF NOT EXISTS "one_active_manager_per_business"
  ON "memberships"("businessId")
  WHERE "role" = 'MANAGER' AND "status" = 'ACTIVE';

-- Existing owner/open-cash-up/request indexes and the audit
-- immutability trigger are preserved by leaving them untouched.

COMMIT;