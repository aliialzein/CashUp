import { jest } from '@jest/globals';
import { randomUUID, createHash } from 'node:crypto';
import { verify } from 'argon2';
import { prisma } from '../persistence/test-support';
import { withTestIdentity } from '../../support/service-context';
import { sessionCookieJar, withSessionCookies } from '../../support/session-cookies';
import { consumeRecoveryBudget } from '../../../src/modules/auth/password-recovery.repository';

const send = jest.fn<(...args: string[]) => Promise<void>>().mockResolvedValue(undefined);
jest.unstable_mockModule('../../../src/modules/auth/password-recovery.email', () => ({ sendResetCode: send }));
const { requestPasswordReset, verifyPasswordReset, resetPassword, RESET_COOKIE } = await import('../../../src/modules/auth/password-recovery.service');
process.env.RESET_CODE_SECRET = 'integration-only-secret-at-least-32-bytes';
jest.setTimeout(30000);
afterAll(() => prisma.$disconnect());
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const run = <T>(jar: ReturnType<typeof sessionCookieJar>, work: () => T) => withTestIdentity('fixture', prisma, () => withSessionCookies(jar.jar, work));
async function fixture() {
  const email = `${randomUUID()}@example.test`;
  const user = await prisma.user.create({ data: { email, fullName: 'Recovery test', passwordHash: 'old-hash' } });
  const jar = sessionCookieJar();
  await run(jar, () => requestPasswordReset({ email }, randomUUID()));
  const code = send.mock.calls.findLast(call => call[0] === email)![1];
  return { email, user, jar, code };
}
it('serializes failed attempts and successful code consumption in PostgreSQL', async () => {
  const { email, user, jar, code } = await fixture();
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => run(jar, () => verifyPasswordReset({ email, code: code === '999999' ? '888888' : '999999' }))));
  expect(results.every(result => result.status === 'rejected')).toBe(true);
  expect((await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id, usedAt: null } })).attempts).toBe(5);
  await expect(run(jar, () => verifyPasswordReset({ email, code }))).rejects.toThrow();
  const fresh = await fixture();
  const verified = await Promise.allSettled(Array.from({ length: 2 }, () => run(fresh.jar, () => verifyPasswordReset({ email: fresh.email, code: fresh.code }))));
  expect(verified.filter(result => result.status === 'fulfilled')).toHaveLength(1);
});
it('allows exactly one concurrent reset, revokes sessions, and rejects authorization reuse', async () => {
  const { email, user, jar, code } = await fixture();
  await prisma.session.create({ data: { tokenHash: digest(randomUUID()), userId: user.id, expiresAt: new Date(Date.now() + 600000) } });
  await run(jar, () => verifyPasswordReset({ email, code }));
  const raw = jar.values.get(RESET_COOKIE)!;
  const password = ' new password123 ';
  const attempts = Array.from({ length: 3 }, () => {
    const isolated = sessionCookieJar(); isolated.values.set(RESET_COOKIE, raw);
    return run(isolated, () => resetPassword({ password, confirmPassword: password }));
  });
  expect((await Promise.allSettled(attempts)).filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(await verify((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash!, password)).toBe(true);
  expect(await prisma.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
  jar.values.set(RESET_COOKIE, raw);
  await expect(run(jar, () => resetPassword({ password, confirmPassword: password }))).rejects.toThrow();
});
it('invalidates previous codes and verified authorization on resend after cooldown', async () => {
  const { email, user, jar, code } = await fixture();
  await run(jar, () => verifyPasswordReset({ email, code }));
  const old = jar.values.get(RESET_COOKIE)!;
  await prisma.authAttempt.update({ where: { key: `reset:c:${digest(email)}` }, data: { expiresAt: new Date(0) } });
  await run(jar, () => requestPasswordReset({ email }, randomUUID()));
  expect(await prisma.passwordResetToken.count({ where: { userId: user.id, usedAt: null } })).toBe(1);
  jar.values.set(RESET_COOKIE, old);
  await expect(run(jar, () => resetPassword({ password: 'password123', confirmPassword: 'password123' }))).rejects.toThrow();
});
it('rejects expired authorization in PostgreSQL without changing the password', async () => {
  const { email, user, jar, code } = await fixture();
  await run(jar, () => verifyPasswordReset({ email, code }));
  await prisma.passwordResetToken.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(0) } });
  await expect(run(jar, () => resetPassword({ password: 'password123', confirmPassword: 'password123' }))).rejects.toThrow();
  expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBe('old-hash');
});
it('enforces shared cooldown, hourly email/IP budgets and expiry', async () => {
  const email = digest(randomUUID()), ip = digest(randomUUID());
  const budget = () => prisma.$transaction(tx => consumeRecoveryBudget(email, ip, tx));
  expect(await budget()).toBe(true);
  expect(await budget()).toBe(false);
  await prisma.authAttempt.update({ where: { key: `reset:c:${email}` }, data: { expiresAt: new Date(0) } });
  expect(await budget()).toBe(true);
  await prisma.authAttempt.update({ where: { key: `reset:e:${email}` }, data: { attempts: 5 } });
  expect(await budget()).toBe(false);
  const otherEmail = digest(randomUUID());
  await prisma.authAttempt.update({ where: { key: `reset:ip:${ip}` }, data: { attempts: 30 } });
  expect(await prisma.$transaction(tx => consumeRecoveryBudget(otherEmail, ip, tx))).toBe(false);
  const { email: address, jar, code, user } = await fixture();
  await prisma.passwordResetToken.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(0) } });
  await expect(run(jar, () => verifyPasswordReset({ email: address, code }))).rejects.toThrow();
});
