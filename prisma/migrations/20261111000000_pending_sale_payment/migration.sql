BEGIN;
LOCK TABLE "sales" IN ACCESS EXCLUSIVE MODE;
-- Old pending creation required balanced tender and a method. These may be plans,
-- but cannot safely be assumed meaningless. Preserve every value before clearing it.
ALTER TABLE "sales" ADD COLUMN "legacyPendingPayment" JSONB;
ALTER TABLE "sales" ALTER COLUMN "tipUsd" DROP NOT NULL, ALTER COLUMN "tipUsd" DROP DEFAULT;
ALTER TABLE "sales" ALTER COLUMN "tipLbp" DROP NOT NULL, ALTER COLUMN "tipLbp" DROP DEFAULT;
ALTER TABLE "sales" ALTER COLUMN "totalCollectedUsd" DROP NOT NULL, ALTER COLUMN "totalCollectedUsd" DROP DEFAULT;
ALTER TABLE "sales" ALTER COLUMN "totalCollectedLbp" DROP NOT NULL, ALTER COLUMN "totalCollectedLbp" DROP DEFAULT;
ALTER TABLE "sales" ALTER COLUMN "changeGivenUsd" DROP NOT NULL, ALTER COLUMN "changeGivenUsd" DROP DEFAULT;
ALTER TABLE "sales" ALTER COLUMN "changeGivenLbp" DROP NOT NULL, ALTER COLUMN "changeGivenLbp" DROP DEFAULT;
ALTER TABLE "sales" ALTER COLUMN "method" DROP NOT NULL;
UPDATE "sales" SET "legacyPendingPayment" = jsonb_build_object(
  'tipUsd', "tipUsd"::text,
  'tipLbp', "tipLbp"::text,
  'totalCollectedUsd', "totalCollectedUsd"::text,
  'totalCollectedLbp', "totalCollectedLbp"::text,
  'changeGivenUsd', "changeGivenUsd"::text,
  'changeGivenLbp', "changeGivenLbp"::text,
  'method', "method"::text,
  'deliveredAt', "deliveredAt"::text,
  'amountDiffers', "amountDiffers"::text),
"tipUsd" = NULL, "tipLbp" = NULL, "totalCollectedUsd" = NULL, "totalCollectedLbp" = NULL, "changeGivenUsd" = NULL, "changeGivenLbp" = NULL, "method" = NULL, "deliveredAt" = NULL, "amountDiffers" = false
WHERE "status" = 'TO_DELIVER';
-- Delivered historical values (including legacy timestamps) remain untouched.
-- Deleted rows may originate from either pending cancellation or delivered deletion.
ALTER TABLE "sales" ADD CONSTRAINT "sales_payment_state" CHECK (
  ("status" <> 'TO_DELIVER' OR ("tipUsd" IS NULL AND "tipLbp" IS NULL AND "totalCollectedUsd" IS NULL AND "totalCollectedLbp" IS NULL AND "changeGivenUsd" IS NULL AND "changeGivenLbp" IS NULL AND "method" IS NULL AND "deliveredAt" IS NULL))
  AND ("status" <> 'DELIVERED' OR ("tipUsd" IS NOT NULL AND "tipLbp" IS NOT NULL AND "totalCollectedUsd" IS NOT NULL AND "totalCollectedLbp" IS NOT NULL AND "changeGivenUsd" IS NOT NULL AND "changeGivenLbp" IS NOT NULL AND "method" IS NOT NULL))
);
COMMIT;
