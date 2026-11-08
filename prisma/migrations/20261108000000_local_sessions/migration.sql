-- Only opaque session hashes are persisted; existing users and credentials are unchanged.
CREATE TABLE "sessions" (
 "tokenHash" VARCHAR(64) PRIMARY KEY,
 "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL,
 "revokedAt" TIMESTAMPTZ(3),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");
