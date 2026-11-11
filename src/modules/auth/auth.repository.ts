import 'server-only';
import { getPrisma } from '../../shared/db/prisma';
import type { Db } from '../../shared/db/types';
import { Prisma, type User } from '../../generated/prisma/client';
import type { CurrentMember } from './auth.types';
import { NotInTransactionError } from '../../shared/errors/persistence-errors';

export function findActiveMembership(userId: string, businessId: string, db: Db = getPrisma()) {
  return db.membership.findFirst({
    where: { userId, businessId, status: 'ACTIVE' },
    select: { id: true, userId: true, businessId: true, role: true, status: true },
  });
}

export async function lockMembership(member: CurrentMember, tx: Db) {
  if (typeof Reflect.get(tx, '$connect') === 'function') throw new NotInTransactionError();
  return tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "memberships"
    WHERE "id" = ${member.membershipId}::uuid AND "userId" = ${member.userId}::uuid
      AND "businessId" = ${member.businessId}::uuid AND "status" = 'ACTIVE'
      AND "role"::text = ${member.role}
    FOR SHARE
  `);
}

export function usersMatchingEmail(email: string, db: Db = getPrisma()) {
  return db.$queryRaw<User[]>(Prisma.sql`SELECT * FROM "users" WHERE lower("email") = ${email} LIMIT 2`);
}
export function createLocalUser(input: { email: string; fullName: string; passwordHash: string }, db: Db) {
  return db.user.create({ data: { ...input, provider: 'LOCAL' } });
}
export async function lockSignupEmail(email: string, db: Db) {
  await db.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))`);
}
export function createSession(data: { tokenHash: string; userId: string; expiresAt: Date }, db: Db) {
  return db.session.create({ data });
}
export function revokeSession(tokenHash: string, db: Db = getPrisma()) {
  return db.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
}
export function readSession(tokenHash: string) {
  return getPrisma().session.findFirst({
    where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { user: { select: { id: true, email: true, fullName: true, memberships: { select: { businessId: true, role: true, status: true } } } } },
  });
}

/** One statement owns its implicit transaction, including the operation-wide lock. */
export async function consumeAuthAttempt(operation: 'login' | 'signup', emailHash: string, db: Db = getPrisma()): Promise<boolean> {
  const globalKey = `${operation}:global`;
  const accountKey = `${operation}:${emailHash}`;
  // Pruning excludes the upsert keys: one statement must not delete and update the same row.
  const rows = await db.$queryRaw<Array<{ allowed: boolean }>>(Prisma.sql`
    WITH budget_lock AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(hashtextextended(${`auth-attempt:${operation}`}, 0))
    ), pruned AS (
      DELETE FROM "auth_attempts" USING budget_lock
      WHERE "expiresAt" <= CURRENT_TIMESTAMP AND "key" NOT IN (${globalKey}, ${accountKey})
    ), global_budget AS (
      INSERT INTO "auth_attempts" ("key", "attempts", "expiresAt")
      SELECT ${globalKey}, 1, to_timestamp((floor(extract(epoch FROM CURRENT_TIMESTAMP) / 600) + 1) * 600)
      FROM budget_lock
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE WHEN "auth_attempts"."expiresAt" <= CURRENT_TIMESTAMP THEN 1
          ELSE LEAST("auth_attempts"."attempts" + 1, 101) END,
        "expiresAt" = CASE WHEN "auth_attempts"."expiresAt" <= CURRENT_TIMESTAMP THEN EXCLUDED."expiresAt"
          ELSE "auth_attempts"."expiresAt" END
      RETURNING "attempts"
    ), account_budget AS (
      INSERT INTO "auth_attempts" ("key", "attempts", "expiresAt")
      SELECT ${accountKey}, 1, to_timestamp((floor(extract(epoch FROM CURRENT_TIMESTAMP) / 900) + 1) * 900)
      FROM global_budget WHERE "attempts" <= 100
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE WHEN "auth_attempts"."expiresAt" <= CURRENT_TIMESTAMP THEN 1
          ELSE LEAST("auth_attempts"."attempts" + 1, 6) END,
        "expiresAt" = CASE WHEN "auth_attempts"."expiresAt" <= CURRENT_TIMESTAMP THEN EXCLUDED."expiresAt"
          ELSE "auth_attempts"."expiresAt" END
      RETURNING "attempts"
    )
    SELECT COALESCE((SELECT "attempts" <= 5 FROM account_budget), false) AS allowed
  `);
  return rows[0].allowed;
}
