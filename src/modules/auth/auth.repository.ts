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

/** Serialize each operation's budget, prune expired rows, then admit a bounded account key. */
export async function consumeAuthAttempt(operation: 'login' | 'signup', emailHash: string, tx: Db): Promise<boolean> {
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`auth-attempt:${operation}`}, 0))`);
  await tx.$executeRaw(Prisma.sql`DELETE FROM "auth_attempts" WHERE "expiresAt" <= CURRENT_TIMESTAMP`);
  const consume = async (key: string, seconds: number, maximum: number) => {
    const rows = await tx.$queryRaw<Array<{ attempts: number }>>(Prisma.sql`
      INSERT INTO "auth_attempts" ("key", "attempts", "expiresAt")
      VALUES (${key}, 1, to_timestamp((floor(extract(epoch FROM CURRENT_TIMESTAMP) / ${seconds}) + 1) * ${seconds}))
      ON CONFLICT ("key") DO UPDATE SET "attempts" = LEAST("auth_attempts"."attempts" + 1, ${maximum + 1})
      RETURNING "attempts"
    `);
    return rows[0].attempts <= maximum;
  };
  if (!await consume(`${operation}:global`, 600, 100)) return false;
  return consume(`${operation}:${emailHash}`, 900, 5);
}
