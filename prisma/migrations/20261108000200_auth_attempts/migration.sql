CREATE TABLE "auth_attempts" (
    "key" VARCHAR(80) NOT NULL,
    "attempts" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "auth_attempts_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "auth_attempts_expiresAt_idx" ON "auth_attempts"("expiresAt");
ALTER TABLE "auth_attempts" ENABLE ROW LEVEL SECURITY;
