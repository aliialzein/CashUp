import { hash, verify } from 'argon2';
import { createHash } from 'node:crypto';
import type { PrismaClient } from '../../../src/generated/prisma/client';
import { changePassword, SESSION_COOKIE } from '../../../src/modules/auth/auth.service';
import * as repository from '../../../src/modules/auth/auth.repository';
import { UnauthenticatedError } from '../../../src/shared/errors/service-errors';
import { withTestIdentity } from '../../support/service-context';
import { cookieJar, useCookieJar } from './cookie-fixture';
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('../../../src/modules/auth/auth.repository', () => ({
  findActiveMembership: jest.fn(), lockMembership: jest.fn(), usersMatchingEmail: jest.fn(), createLocalUser: jest.fn(),
  consumeAuthAttempt: jest.fn(), lockSignupEmail: jest.fn(), createSession: jest.fn(), revokeSession: jest.fn(), readSession: jest.fn(),
  lockLocalCredentials: jest.fn(), readLocalCredentials: jest.fn(), replacePasswordKeepingSession: jest.fn(),
}));

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const USER_ID = 'user-1';
const TOKEN = 'a'.repeat(64);
const OLD_PASSWORD = 'Old-password1!';
const NEW_PASSWORD = 'New-password2!';
const input = { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD };
const session = { user: { id: USER_ID, email: 'driver@example.test', fullName: 'Driver', memberships: [] } };
const tx = {};
const transaction = jest.fn(async (work: (client: object) => Promise<unknown>) => work(tx));
const db = { $transaction: transaction } as unknown as PrismaClient;
const run = <T>(work: () => T) => withTestIdentity('fixture-user', db, work);
let oldHash: string;
let jar: ReturnType<typeof cookieJar>;

beforeAll(async () => {
  oldHash = await hash(OLD_PASSWORD);
});
beforeEach(() => {
  jar = cookieJar();
  jar.values.set(SESSION_COOKIE, TOKEN);
  useCookieJar(jar);
  jest.mocked(repository.readSession).mockResolvedValue(session as Awaited<ReturnType<typeof repository.readSession>>);
  jest.mocked(repository.consumeAuthAttempt).mockResolvedValue(true);
  jest.mocked(repository.readLocalCredentials).mockResolvedValue({ passwordHash: oldHash, provider: 'LOCAL' });
  jest.mocked(repository.lockLocalCredentials).mockResolvedValue(true);
  jest.mocked(repository.replacePasswordKeepingSession).mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

it('saves an Argon2id hash of the new password and keeps this session, without touching the cookie', async () => {
  await run(() => changePassword(input));
  expect(repository.lockLocalCredentials).toHaveBeenCalledWith(USER_ID, oldHash, tx);
  expect(repository.replacePasswordKeepingSession).toHaveBeenCalledTimes(1);
  const [userId, newHash, keepTokenHash, client] = jest.mocked(repository.replacePasswordKeepingSession).mock.calls[0];
  expect(userId).toBe(USER_ID);
  expect(newHash).toMatch(/^\$argon2id\$/);
  expect(await verify(newHash, NEW_PASSWORD)).toBe(true);
  expect(await verify(newHash, OLD_PASSWORD)).toBe(false);
  expect(keepTokenHash).toBe(sha256(TOKEN));
  expect(client).toBe(tx);
  expect(jar.set).not.toHaveBeenCalled();
});

it('limits attempts per member, with the hash of the user id', async () => {
  await run(() => changePassword(input));
  expect(repository.consumeAuthAttempt).toHaveBeenCalledWith('password-change', sha256(USER_ID));
});

it('changes nothing when the current password is wrong', async () => {
  await expect(run(() => changePassword({ ...input, currentPassword: 'Wrong-password3!' }))).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  expect(transaction).not.toHaveBeenCalled();
  expect(repository.replacePasswordKeepingSession).not.toHaveBeenCalled();
});

it('stops at too many attempts, before reading the credentials', async () => {
  jest.mocked(repository.consumeAuthAttempt).mockResolvedValue(false);
  await expect(run(() => changePassword(input))).rejects.toMatchObject({ code: 'TOO_MANY_ATTEMPTS' });
  expect(repository.readLocalCredentials).not.toHaveBeenCalled();
  expect(repository.replacePasswordKeepingSession).not.toHaveBeenCalled();
});

it.each([
  ['a Google account', { passwordHash: 'unused', provider: 'GOOGLE' as const }],
  ['a local account without a hash', { passwordHash: null, provider: 'LOCAL' as const }],
  ['a missing user', null],
])('refuses %s as INVALID_CREDENTIALS', async (_case, credentials) => {
  jest.mocked(repository.readLocalCredentials).mockResolvedValue(credentials);
  await expect(run(() => changePassword(input))).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  expect(transaction).not.toHaveBeenCalled();
});

it('refuses when a reset changed the password in between (the lock fails), and replaces nothing', async () => {
  jest.mocked(repository.lockLocalCredentials).mockResolvedValue(false);
  await expect(run(() => changePassword(input))).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  expect(repository.replacePasswordKeepingSession).not.toHaveBeenCalled();
});

it.each([undefined, 'not-a-token', 'a'.repeat(63)])('needs a valid session cookie (%s), without a database lookup', async token => {
  jar.values.delete(SESSION_COOKIE);
  if (token) jar.values.set(SESSION_COOKIE, token);
  await expect(run(() => changePassword(input))).rejects.toBeInstanceOf(UnauthenticatedError);
  expect(repository.readSession).not.toHaveBeenCalled();
  expect(repository.consumeAuthAttempt).not.toHaveBeenCalled();
});

it('needs a live session for the cookie', async () => {
  jest.mocked(repository.readSession).mockResolvedValue(null);
  await expect(run(() => changePassword(input))).rejects.toBeInstanceOf(UnauthenticatedError);
  expect(repository.consumeAuthAttempt).not.toHaveBeenCalled();
});

it.each([
  ['a new password that is too short', { ...input, newPassword: 'short' }],
  ['the same password again', { currentPassword: OLD_PASSWORD, newPassword: OLD_PASSWORD }],
  ['an empty current password', { ...input, currentPassword: '' }],
])('rejects %s before the rate limit', async (_case, invalid) => {
  await expect(run(() => changePassword(invalid))).rejects.toMatchObject({ name: 'ZodError' });
  expect(repository.consumeAuthAttempt).not.toHaveBeenCalled();
  expect(repository.readSession).not.toHaveBeenCalled();
});
