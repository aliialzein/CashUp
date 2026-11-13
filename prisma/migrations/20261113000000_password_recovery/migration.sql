ALTER TABLE "password_reset_tokens"
  ADD COLUMN "codeHash" VARCHAR(64),
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "verifiedAt" TIMESTAMPTZ(3);

-- Legacy tokens cannot authorize the new code-based flow.
UPDATE "password_reset_tokens" SET "usedAt" = CURRENT_TIMESTAMP WHERE "usedAt" IS NULL;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "reset_attempts_bounded" CHECK ("attempts" BETWEEN 0 AND 5);
CREATE UNIQUE INDEX "password_reset_one_active" ON "password_reset_tokens" ("userId") WHERE "usedAt" IS NULL;
