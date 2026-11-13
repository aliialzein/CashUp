import { hash, verify } from 'argon2';
import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient, type User } from '../../../src/generated/prisma/client';
import { signup, login, logout, getCurrentUser, requireCurrentIdentity, authDestination, SESSION_COOKIE } from '../../../src/modules/auth/auth.service';
import * as repository from '../../../src/modules/auth/auth.repository';
import { withTestIdentity } from '../../support/service-context';
import { cookieJar, useCookieJar } from './cookie-fixture';
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('../../../src/modules/auth/auth.repository', () => ({
  findActiveMembership: jest.fn(), lockMembership: jest.fn(), usersMatchingEmail: jest.fn(), createLocalUser: jest.fn(),
  consumeAuthAttempt: jest.fn(), lockSignupEmail: jest.fn(), createSession: jest.fn(), revokeSession: jest.fn(), readSession: jest.fn(), lockLocalCredentials: jest.fn(),
}));
const user = (values: Partial<User> = {}): User => ({ id: 'user', email: 'name@example.test', fullName: 'Name', passwordHash: null, phone: null, provider: 'LOCAL', createdAt: new Date(), updatedAt: new Date(), ...values });
const tx = {};
const transaction = jest.fn(async (work: (client: object) => Promise<unknown>) => work(tx));
const db = { $transaction: transaction } as unknown as PrismaClient;
const input = { email: ' Name@Example.Test ', fullName: ' Name ', password: ' password 123 ' };
let jar: ReturnType<typeof cookieJar>;
const run = <T>(work: () => T) => withTestIdentity('fixture-user', db, work);
beforeEach(() => {
  jar = cookieJar(); useCookieJar(jar);
  jest.mocked(repository.lockLocalCredentials).mockResolvedValue(true);
  jest.mocked(repository.consumeAuthAttempt).mockResolvedValue(true);
  jest.mocked(repository.usersMatchingEmail).mockResolvedValue([]);
  jest.mocked(repository.createLocalUser).mockResolvedValue(user());
  jest.mocked(repository.createSession).mockResolvedValue({ tokenHash: '', userId: 'user', expiresAt: new Date(), revokedAt: null, createdAt: new Date() });
  jest.mocked(repository.revokeSession).mockResolvedValue({ count: 1 });
  jest.mocked(repository.readSession).mockResolvedValue(null);
});
afterEach(() => jest.restoreAllMocks());
it('signs up with a real Argon2id hash and stores only a token hash, issuing a secure bounded cookie', async () => {
  jest.replaceProperty(process, 'env', { ...process.env, NODE_ENV: 'production' });
  await run(() => signup(input));
  const record = jest.mocked(repository.createLocalUser).mock.calls[0][0];
  expect(record).toMatchObject({ email: 'name@example.test', fullName: 'Name' });
  expect(record.passwordHash).toMatch(/^\$argon2id\$/);
  expect(await verify(record.passwordHash, input.password)).toBe(true);
  expect(await verify(record.passwordHash, input.password.trim())).toBe(false);
  const token = jar.values.get(SESSION_COOKIE)!;
  const session = jest.mocked(repository.createSession).mock.calls[0][0];
  expect(session.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
  expect(session.tokenHash).not.toBe(token);
  expect(session.expiresAt.getTime() - Date.now()).toBeGreaterThan(6 * 86400000);
  expect(jar.set).toHaveBeenCalledWith(SESSION_COOKIE, token, expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' }));
  expect(repository.lockSignupEmail).toHaveBeenCalledWith('name@example.test', tx);
  expect(repository.consumeAuthAttempt).toHaveBeenCalledWith('signup', expect.stringMatching(/^[a-f0-9]{64}$/));
});
it('refuses existing mixed-case/social emails without linking accounts', async () => {
  jest.mocked(repository.usersMatchingEmail).mockResolvedValue([user({ provider: 'GOOGLE' })]);
  await expect(run(() => signup(input))).rejects.toMatchObject({ code: 'SIGNUP_UNAVAILABLE' });
  expect(repository.createLocalUser).not.toHaveBeenCalled();
  expect(jar.set).not.toHaveBeenCalled();
});
it('handles the database duplicate-signup constraint race', async () => {
  jest.mocked(repository.createLocalUser).mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }));
  await expect(run(() => signup(input))).rejects.toMatchObject({ code: 'SIGNUP_UNAVAILABLE' });
  expect(jar.set).not.toHaveBeenCalled();
});
it.each([{ email: 'bad' }, { fullName: '' }, { password: 'short' }, { password: 'x'.repeat(129) }, { role: 'OWNER' }])('rejects invalid signup %j before hashing/persistence', async invalid => {
  await expect(run(() => signup({ ...input, ...invalid }))).rejects.toMatchObject({ name: 'ZodError' });
  expect(transaction).not.toHaveBeenCalled();
  expect(repository.consumeAuthAttempt).not.toHaveBeenCalled();
});
it('logs in case-insensitively, preserves passwords verbatim and rotates an existing session', async () => {
  jar.values.set(SESSION_COOKIE, 'a'.repeat(64));
  jest.mocked(repository.usersMatchingEmail).mockResolvedValue([user({ passwordHash: await hash(input.password) })]);
  await run(() => login({ email: input.email, password: input.password }));
  expect(repository.usersMatchingEmail).toHaveBeenCalledWith('name@example.test');
  expect(repository.revokeSession).toHaveBeenCalledWith(createHash('sha256').update('a'.repeat(64)).digest('hex'), tx);
  expect(jar.values.get(SESSION_COOKIE)).not.toBe('a'.repeat(64));
});
it.each(['missing', 'social', 'ambiguous', 'wrong', 'invalid-hash'])('returns the same login failure for %s', async kind => {
  const row = user({ passwordHash: await hash('correct-password') });
  const rows = kind === 'missing' ? [] : kind === 'social' ? [user({ provider: 'GOOGLE' })] : kind === 'ambiguous' ? [row, row] : kind === 'invalid-hash' ? [user({ passwordHash: 'not-a-hash' })] : [row];
  jest.mocked(repository.usersMatchingEmail).mockResolvedValue(rows);
  await expect(run(() => login({ email: input.email, password: 'incorrect-password' }))).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  expect(repository.createSession).not.toHaveBeenCalled(); expect(jar.set).not.toHaveBeenCalled();
});
it('does not issue a cookie when persistence fails unexpectedly', async () => {
  const failure = new Error('database unavailable');
  jest.mocked(repository.createSession).mockRejectedValueOnce(failure);
  await expect(run(() => signup(input))).rejects.toBe(failure);
  expect(jar.set).not.toHaveBeenCalled();
});
it.each([undefined, 'invalid', 'a'.repeat(63)])('rejects missing/invalid cookie %s without a database lookup', async token => {
  if (token) jar.values.set(SESSION_COOKIE, token);
  expect(await getCurrentUser()).toBeNull();
  expect(repository.readSession).not.toHaveBeenCalled();
  expect(jar.set).not.toHaveBeenCalled();
});
it('rejects expired/revoked session lookups without mutating cookies during reads', async () => {
  jar.values.set(SESSION_COOKIE, 'a'.repeat(64));
  expect(await getCurrentUser()).toBeNull();
  await expect(requireCurrentIdentity()).rejects.toMatchObject({ name: 'UnauthenticatedError' });
  expect(jar.set).not.toHaveBeenCalled();
});
it('returns safe current-user fields and a bootstrap identity with no membership', async () => {
  jar.values.set(SESSION_COOKIE, 'a'.repeat(64));
  jest.mocked(repository.readSession).mockResolvedValue({ user: { id: 'user', email: 'name@example.test', fullName: 'Name', memberships: [] } });
  const current = await getCurrentUser();
  expect(current).toEqual({ id: 'user', email: 'name@example.test', fullName: 'Name', membership: null });
  expect(authDestination(current!)).toBe('/onboarding');
  // The actual cookie-based identity function is exercised by requireCurrentMember in auth.test.
  expect(jar.set).not.toHaveBeenCalled();
});
it.each(['STAFF', 'MANAGER', 'OWNER'] as const)('routes active %s membership to an available destination', role => {
  const current = { id: 'u', email: 'u@example.test', fullName: 'User', membership: { businessId: 'b', role, status: 'ACTIVE' as const } };
  expect(authDestination(current)).toBe(role === 'OWNER' ? '/owner' : '/onboarding');
  expect(authDestination({ ...current, membership: { ...current.membership, status: 'INACTIVE' } })).toBe('/onboarding');
});
it('revokes the current session and clears its cookie on logout', async () => {
  jar.values.set(SESSION_COOKIE, 'a'.repeat(64));
  await logout();
  expect(repository.revokeSession).toHaveBeenCalledWith(createHash('sha256').update('a'.repeat(64)).digest('hex'));
  expect(jar.set).toHaveBeenCalledWith(SESSION_COOKIE, '', expect.objectContaining({ maxAge: 0, expires: new Date(0) }));
});
it('clears invalid cookies on logout without a database mutation', async () => {
  jar.values.set(SESSION_COOKIE, 'invalid'); await logout();
  expect(repository.revokeSession).not.toHaveBeenCalled();
});
it('has no development identity fallback, including in production', async () => {
  jest.replaceProperty(process, 'env', { ...process.env, NODE_ENV: 'production', CASHUP_DEV_AUTH: '1', CASHUP_DEV_USER_ID: 'attacker' });
  await expect(requireCurrentIdentity()).rejects.toMatchObject({ name: 'UnauthenticatedError' });
});

it('rejects attempts denied by the database before credential queries or session mutations', async () => {
  jest.mocked(repository.consumeAuthAttempt).mockResolvedValue(false);
  await expect(run(() => login({ email: 'name@example.test', password: 'password123' }))).rejects.toMatchObject({ code: 'TOO_MANY_ATTEMPTS' });
  expect(repository.usersMatchingEmail).not.toHaveBeenCalled();
  expect(repository.createSession).not.toHaveBeenCalled();
});

it('stops before account persistence and cookie access when the rate-limit table is missing', async () => {
  const failure = new Prisma.PrismaClientKnownRequestError('Raw query failed', {
    code: 'P2010', clientVersion: 'test', meta: { code: '42P01' },
  });
  jest.mocked(repository.consumeAuthAttempt).mockRejectedValueOnce(failure);
  await expect(run(() => signup(input))).rejects.toBe(failure);
  expect(transaction).not.toHaveBeenCalled();
  expect(repository.lockSignupEmail).not.toHaveBeenCalled();
  expect(repository.createLocalUser).not.toHaveBeenCalled();
  expect(repository.createSession).not.toHaveBeenCalled();
  expect(jar.set).not.toHaveBeenCalled();
});

it('does not acquire an interactive transaction before rejecting invalid login credentials', async () => {
  jest.mocked(repository.usersMatchingEmail).mockResolvedValue([]);
  await expect(run(() => login({ email: input.email, password: input.password }))).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  expect(repository.consumeAuthAttempt).toHaveBeenCalledWith('login', expect.stringMatching(/^[a-f0-9]{64}$/));
  expect(transaction).not.toHaveBeenCalled();
  expect(jar.set).not.toHaveBeenCalled();
});

it('uses one transaction only for verified login session rotation', async () => {
  jest.mocked(repository.usersMatchingEmail).mockResolvedValue([user({ passwordHash: await hash(input.password) })]);
  await run(() => login({ email: input.email, password: input.password }));
  expect(transaction).toHaveBeenCalledTimes(1);
  expect(repository.createSession).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user' }), tx);
});

it('rejects an old password verified before a concurrent recovery changed the credential hash', async () => {
  jest.mocked(repository.usersMatchingEmail).mockResolvedValue([user({ passwordHash: await hash(input.password) })]);
  jest.mocked(repository.lockLocalCredentials).mockResolvedValue(false);
  await expect(run(() => login({ email: input.email, password: input.password }))).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  expect(repository.createSession).not.toHaveBeenCalled();
  expect(jar.set).not.toHaveBeenCalled();
});
