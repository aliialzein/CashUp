-- Match the existing server-only data-access posture: no public session-table policies.
-- The trusted Prisma database role must be the table owner or have BYPASSRLS, as for users.
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
