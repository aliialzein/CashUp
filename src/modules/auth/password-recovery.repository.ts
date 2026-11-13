import 'server-only';
import { Prisma } from '../../generated/prisma/client';
import type { Db } from '../../shared/db/types';
import { getPrisma } from '../../shared/db/prisma';

export async function lockRecoveryUser(userId: string, tx: Db) {
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE`);
}

/** Shared limits reuse auth_attempts. The advisory lock serializes pruning and budgets across instances. */
export async function consumeRecoveryBudget(emailHash: string, ipHash: string, tx: Db): Promise<boolean> {
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended('recovery-budget', 0))`);
  const now = new Date();
  await tx.authAttempt.deleteMany({ where: { expiresAt: { lte: now }, key: { startsWith: 'reset:' } } });
  const expiresAt = new Date(now.getTime() + 3600000);
  // Stop before allocating arbitrary email keys when the global/IP budget is spent.
  for (const [key, limit] of [['reset:global', 1000], [`reset:ip:${ipHash}`, 30], [`reset:e:${emailHash}`, 5]] as const) {
    const row = await tx.authAttempt.upsert({ where: { key }, create: { key, attempts: 1, expiresAt }, update: { attempts: { increment: 1 } } });
    if (row.attempts > limit) return false;
  }
  const key = `reset:c:${emailHash}`;
  if (await tx.authAttempt.findUnique({ where: { key } })) return false;
  await tx.authAttempt.create({ data: { key, attempts: 1, expiresAt: new Date(now.getTime() + 60000) } });
  return true;
}

export async function invalidateRecovery(userId: string, tx: Db) {
  await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date(), codeHash: null } });
}

export function createRecoveryChallenge(data: Prisma.PasswordResetTokenUncheckedCreateInput, tx: Db) {
  return tx.passwordResetToken.create({ data });
}
export function findActiveRecovery(userId: string, tx: Db) {
  return tx.passwordResetToken.findFirst({ where: { userId, usedAt: null } });
}
export function findRecoveryAuthorization(tokenHash: string) {
  return getPrisma().passwordResetToken.findUnique({ where: { tokenHash } });
}
export function failRecoveryDelivery(id: string) {
  return getPrisma().passwordResetToken.updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date(), codeHash: null } });
}
export function recordWrongRecoveryCode(id: string, tx: Db) {
  return tx.passwordResetToken.update({ where: { id }, data: { attempts: { increment: 1 } } });
}
export function authorizeRecovery(id: string, tokenHash: string, expiresAt: Date, tx: Db) {
  return tx.passwordResetToken.update({ where: { id }, data: { codeHash: null, verifiedAt: new Date(), tokenHash, expiresAt } });
}
export function consumeRecoveryAuthorization(id: string, tokenHash: string, tx: Db) {
  return tx.passwordResetToken.updateMany({ where: { id, tokenHash, usedAt: null, verifiedAt: { not: null }, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
}
export async function replaceRecoveredPassword(userId: string, passwordHash: string, tx: Db) {
  await tx.user.update({ where: { id: userId }, data: { passwordHash } });
  await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}
