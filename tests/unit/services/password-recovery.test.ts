import { createHash, createHmac } from 'node:crypto';
import { verify } from 'argon2';
import type { PrismaClient } from '../../../src/generated/prisma/client';
import { requestPasswordReset, verifyPasswordReset, resetPassword, RESET_COOKIE, RESET_SENT_MESSAGE } from '../../../src/modules/auth/password-recovery.service';
import * as repository from '../../../src/modules/auth/password-recovery.repository';
import { usersMatchingEmail } from '../../../src/modules/auth/auth.repository';
import { sendResetCode } from '../../../src/modules/auth/password-recovery.email';
import { withTestIdentity } from '../../support/service-context';
import { cookieJar, useCookieJar } from './cookie-fixture';
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('../../../src/modules/auth/password-recovery.repository', () => ({
  ...jest.requireActual('../../../src/modules/auth/password-recovery.repository'),
  consumeRecoveryBudget: jest.fn(), lockRecoveryUser: jest.fn(), invalidateRecovery: jest.fn(),
}));
jest.mock('../../../src/modules/auth/auth.repository', () => ({ usersMatchingEmail: jest.fn() }));
jest.mock('../../../src/modules/auth/password-recovery.email', () => ({ sendResetCode: jest.fn() }));
jest.mock('../../../src/lib/logger', () => ({ __esModule: true, default: { error: jest.fn() } }));
const secret = 's'.repeat(32);
const user = { id: 'user', email: 'person@example.test', provider: 'LOCAL', passwordHash: 'existing' };
const code = '012345';
const raw = 'a'.repeat(64);
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const challenge = () => ({ id: 'challenge', userId: user.id, codeHash: createHmac('sha256', secret).update(`challenge:user:${code}`).digest('hex'), attempts: 0, usedAt: null, verifiedAt: null as Date | null, expiresAt: new Date(Date.now() + 600000), tokenHash: digest(raw) });
const token = { create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() };
const db = { passwordResetToken: token, user: { update: jest.fn() }, session: { updateMany: jest.fn() }, $transaction: jest.fn() };
const run = <T>(work: () => T) => withTestIdentity('fixture', db as unknown as PrismaClient, work);
let jar: ReturnType<typeof cookieJar>;
beforeEach(() => {
  jest.resetAllMocks(); process.env.RESET_CODE_SECRET = secret;
  jar = cookieJar(); useCookieJar(jar);
  db.$transaction.mockImplementation(work => work(db));
  jest.mocked(repository.consumeRecoveryBudget).mockResolvedValue(true);
  jest.mocked(usersMatchingEmail).mockResolvedValue([user] as never);
  token.findFirst.mockResolvedValue(challenge());
  token.findUnique.mockResolvedValue({ ...challenge(), verifiedAt: new Date() });
  token.updateMany.mockResolvedValue({ count: 1 });
});
it('returns identical messages for registered, missing, social and ambiguous emails without exposing codes', async () => {
  for (const matches of [[user], [], [{ ...user, provider: 'GOOGLE' }], [user, user], [{ ...user, passwordHash: null }]]) {
    jest.mocked(usersMatchingEmail).mockResolvedValue(matches as never);
    expect(await run(() => requestPasswordReset({ email: ' Person@Example.Test ' }, 'ip'))).toBe(RESET_SENT_MESSAGE);
  }
  expect(sendResetCode).toHaveBeenCalledTimes(1);
  expect(usersMatchingEmail).toHaveBeenCalledWith(user.email, db);
  const saved = token.create.mock.calls[0][0].data;
  const sent = jest.mocked(sendResetCode).mock.calls[0];
  expect(sent[1]).toMatch(/^\d{6}$/);
  expect(saved.codeHash).toBe(createHmac('sha256', secret).update(`${saved.id}:user:${sent[1]}`).digest('hex'));
  expect(saved.expiresAt.getTime() - Date.now()).toBeGreaterThan(590000);
  expect(repository.invalidateRecovery).toHaveBeenCalledWith(user.id, db);
});
it('keeps rate-limited requests generic and does not query accounts', async () => {
  jest.mocked(repository.consumeRecoveryBudget).mockResolvedValue(false);
  expect(await run(() => requestPasswordReset({ email: user.email }))).toBe(RESET_SENT_MESSAGE);
  expect(usersMatchingEmail).not.toHaveBeenCalled();
});
it('handles provider and cleanup failures generically', async () => {
  jest.mocked(sendResetCode).mockRejectedValue(new Error('secret provider body'));
  token.updateMany.mockRejectedValue(new Error('database'));
  expect(await run(() => requestPasswordReset({ email: user.email }))).toBe(RESET_SENT_MESSAGE);
});
it('rejects missing configuration before looking up any account', async () => {
  delete process.env.RESET_CODE_SECRET;
  await expect(run(() => requestPasswordReset({ email: user.email }))).rejects.toThrow('not configured');
  expect(usersMatchingEmail).not.toHaveBeenCalled();
});
it('consumes the code and issues only a secure, bounded HttpOnly authorization cookie', async () => {
  await run(() => verifyPasswordReset({ email: user.email, code }));
  const value = jar.values.get(RESET_COOKIE)!;
  expect(value).toMatch(/^[a-f0-9]{64}$/);
  expect(token.update).toHaveBeenCalledWith({ where: { id: 'challenge' }, data: expect.objectContaining({ codeHash: null, tokenHash: digest(value), verifiedAt: expect.any(Date) }) });
  expect(jar.set).toHaveBeenCalledWith(RESET_COOKIE, value, expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/', expires: expect.any(Date) }));
});
it.each([null, { ...challenge(), expiresAt: new Date(0) }, { ...challenge(), attempts: 5 }, { ...challenge(), codeHash: null }, { ...challenge(), verifiedAt: new Date() }])('rejects missing, expired, exhausted, superseded or consumed codes', async row => {
  token.findFirst.mockResolvedValue(row);
  await expect(run(() => verifyPasswordReset({ email: user.email, code }))).rejects.toThrow('invalid or expired');
  expect(jar.set).not.toHaveBeenCalled();
});
it('persists incorrect attempts without issuing authorization', async () => {
  await expect(run(() => verifyPasswordReset({ email: user.email, code: '999999' }))).rejects.toThrow();
  expect(token.update).toHaveBeenCalledWith({ where: { id: 'challenge' }, data: { attempts: { increment: 1 } } });
});
it.each([{ matches: [] }, { matches: [{ ...user, provider: 'GOOGLE' }] }])('rejects ineligible verification', async ({ matches }) => {
  jest.mocked(usersMatchingEmail).mockResolvedValue(matches as never);
  await expect(run(() => verifyPasswordReset({ email: user.email, code }))).rejects.toThrow();
});
it('hashes verbatim with Argon2id, consumes authorization and revokes every session in the transaction', async () => {
  jar.values.set(RESET_COOKIE, raw);
  const password = ' new password 123 ';
  await run(() => resetPassword({ password, confirmPassword: password }));
  const saved = db.user.update.mock.calls[0][0].data.passwordHash;
  expect(saved).toMatch(/^\$argon2id\$/);
  expect(await verify(saved, password)).toBe(true);
  expect(await verify(saved, password.trim())).toBe(false);
  expect(db.session.updateMany).toHaveBeenCalledWith({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: expect.any(Date) } });
  expect(jar.values.get(RESET_COOKIE)).toBe('');
});
it.each([undefined, 'invalid'])('requires an authorization cookie', async value => {
  if (value) jar.values.set(RESET_COOKIE, value);
  await expect(run(() => resetPassword({ password: 'password123', confirmPassword: 'password123' }))).rejects.toThrow();
  expect(token.findUnique).not.toHaveBeenCalled();
});
it.each([null, { ...challenge(), usedAt: new Date() }, challenge(), { ...challenge(), verifiedAt: new Date(), expiresAt: new Date(0) }])('rejects missing, reused, unverified and expired authorization', async row => {
  jar.values.set(RESET_COOKIE, raw); token.findUnique.mockResolvedValue(row);
  await expect(run(() => resetPassword({ password: 'password123', confirmPassword: 'password123' }))).rejects.toThrow();
  expect(db.user.update).not.toHaveBeenCalled();
});
it('rejects authorization lost to a concurrent reset or resend', async () => {
  jar.values.set(RESET_COOKIE, raw); token.updateMany.mockResolvedValue({ count: 0 });
  await expect(run(() => resetPassword({ password: 'password123', confirmPassword: 'password123' }))).rejects.toThrow();
  expect(db.user.update).not.toHaveBeenCalled();
});
it.each([{ password: 'short', confirmPassword: 'short' }, { password: 'password123', confirmPassword: 'different' }, { password: 'x'.repeat(129), confirmPassword: 'x'.repeat(129) }])('validates passwords and confirmation before persistence', async input => {
  await expect(run(() => resetPassword(input))).rejects.toMatchObject({ name: 'ZodError' });
  expect(db.$transaction).not.toHaveBeenCalled();
});
