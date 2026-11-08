import { jest } from '@jest/globals';
import { hash, verify } from 'argon2';
import { createHash } from 'node:crypto';
import { prisma, resetDatabase } from '../persistence/test-support';
import { signup, login, logout, getCurrentUser, requireCurrentIdentity, requireCurrentMember, authDestination, SESSION_COOKIE } from '../../../src/modules/auth/auth.service';
import { createBusiness } from '../../../src/modules/business/business.service';
import { sessionCookieJar, withSessionCookies } from '../../support/session-cookies';

jest.setTimeout(20000);
beforeEach(resetDatabase);
afterAll(async () => { await prisma.$disconnect(); });
const input = { email: ' New.User@Example.Test ', fullName: ' New User ', password: ' password123 ' };
const digest = (raw: string) => createHash('sha256').update(raw).digest('hex');

it('creates only a user and hashed session; no-membership identity reaches working business setup', async () => {
  const fixture = sessionCookieJar();
  await withSessionCookies(fixture.jar, async () => {
    await signup(input);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'new.user@example.test' } });
    expect(user.provider).toBe('LOCAL');
    expect(await verify(user.passwordHash!, input.password)).toBe(true);
    expect(await verify(user.passwordHash!, input.password.trim())).toBe(false);
    const raw = fixture.values.get(SESSION_COOKIE)!;
    expect(raw).toMatch(/^[a-f0-9]{64}$/);
    const session = await prisma.session.findUniqueOrThrow({ where: { tokenHash: digest(raw) } });
    expect(session.userId).toBe(user.id);
    expect(session.tokenHash).not.toBe(raw);
    expect(await prisma.membership.count()).toBe(0);
    const safe = await getCurrentUser();
    expect(Object.keys(safe!).sort()).toEqual(['id', 'email', 'fullName', 'membership'].sort());
    expect(authDestination(safe!)).toBe('/onboarding');
    await expect(requireCurrentIdentity()).resolves.toEqual({ userId: user.id, businessId: undefined });
    await expect(requireCurrentMember()).rejects.toMatchObject({ name: 'UnauthenticatedError' });
    const business = await createBusiness({ name: 'New business', isSolo: true });
    await expect(requireCurrentMember()).resolves.toMatchObject({ userId: user.id, businessId: business.id, role: 'OWNER' });
    expect(authDestination((await getCurrentUser())!)).toBe('/owner');
  });
});

it('serializes concurrent normalized duplicate signups through the database', async () => {
  const a = sessionCookieJar(), b = sessionCookieJar();
  const results = await Promise.allSettled([
    withSessionCookies(a.jar, () => signup(input)),
    withSessionCookies(b.jar, () => signup({ ...input, email: 'NEW.USER@example.test' })),
  ]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(await prisma.user.count()).toBe(1);
  expect(await prisma.session.count()).toBe(1);
});

it('rejects legacy mixed-case/social registrations and ambiguous case-folded login without linking', async () => {
  const passwordHash = await hash(input.password);
  await prisma.user.create({ data: { email: 'Mixed@Example.Test', fullName: 'Legacy', passwordHash, provider: 'LOCAL' } });
  await prisma.user.create({ data: { email: 'mixed@example.test', fullName: 'Social', provider: 'GOOGLE' } });
  const jar = sessionCookieJar();
  await withSessionCookies(jar.jar, async () => {
    await expect(signup({ ...input, email: 'MIXED@example.test' })).rejects.toMatchObject({ code: 'SIGNUP_UNAVAILABLE' });
    await expect(login({ email: 'mixed@example.test', password: input.password })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });
  expect(await prisma.user.count()).toBe(2);
  expect(await prisma.session.count()).toBe(0);
});

it('logs in with normalized email and revokes previous and logged-out sessions', async () => {
  const jar = sessionCookieJar();
  await withSessionCookies(jar.jar, async () => {
    await signup(input);
    const old = jar.values.get(SESSION_COOKIE)!;
    await login({ email: 'NEW.USER@EXAMPLE.TEST', password: input.password });
    const current = jar.values.get(SESSION_COOKIE)!;
    expect(current).not.toBe(old);
    expect((await prisma.session.findUniqueOrThrow({ where: { tokenHash: digest(old) } })).revokedAt).not.toBeNull();
    await logout();
    expect((await prisma.session.findUniqueOrThrow({ where: { tokenHash: digest(current) } })).revokedAt).not.toBeNull();
    jar.values.set(SESSION_COOKIE, current);
    expect(await getCurrentUser()).toBeNull();
  });
});

it('rejects expired and forged cookies without mutating them during reads', async () => {
  const jar = sessionCookieJar();
  await withSessionCookies(jar.jar, async () => {
    await signup(input);
    const raw = jar.values.get(SESSION_COOKIE)!;
    await prisma.session.update({ where: { tokenHash: digest(raw) }, data: { expiresAt: new Date(0) } });
    const writes = jar.writes.length;
    expect(await getCurrentUser()).toBeNull();
    jar.values.set(SESSION_COOKIE, 'a'.repeat(64));
    expect(await getCurrentUser()).toBeNull();
    jar.values.delete(SESSION_COOKIE);
    expect(await getCurrentUser()).toBeNull();
    expect(jar.writes).toHaveLength(writes);
  });
});

it('keeps simultaneous session users isolated and rejects inactive membership while retaining identity', async () => {
  const a = sessionCookieJar(), b = sessionCookieJar();
  await Promise.all([
    withSessionCookies(a.jar, () => signup(input)),
    withSessionCookies(b.jar, () => signup({ ...input, email: 'second@example.test' })),
  ]);
  const [first, second] = await Promise.all([withSessionCookies(a.jar, () => getCurrentUser()), withSessionCookies(b.jar, () => getCurrentUser())]);
  expect(first!.id).not.toBe(second!.id);
  await withSessionCookies(a.jar, async () => {
    await createBusiness({ name: 'Business', isSolo: true });
    await prisma.membership.update({ where: { userId: first!.id }, data: { status: 'INACTIVE', deactivatedAt: new Date() } });
    await expect(requireCurrentIdentity()).resolves.toMatchObject({ userId: first!.id });
    await expect(requireCurrentMember()).rejects.toMatchObject({ code: 'ACTOR_NOT_ACTIVE' });
    expect(authDestination((await getCurrentUser())!)).toBe('/onboarding');
  });
  expect(await withSessionCookies(b.jar, () => getCurrentUser())).toMatchObject({ id: second!.id, membership: null });
});

it('authenticates a single legacy mixed-case local email and treats email wildcard characters literally', async () => {
  const passwordHash = await hash(input.password);
  await prisma.user.create({ data: { email: 'Legacy@Example.Test', fullName: 'Legacy', passwordHash } });
  await prisma.user.create({ data: { email: 'wildXcard@example.test', fullName: 'Different', passwordHash } });
  const fixture = sessionCookieJar();
  await withSessionCookies(fixture.jar, async () => {
    await login({ email: 'LEGACY@example.test', password: input.password });
    expect(await getCurrentUser()).toMatchObject({ email: 'Legacy@Example.Test' });
    await expect(login({ email: 'wild_card@example.test', password: input.password })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(await getCurrentUser()).toMatchObject({ email: 'Legacy@Example.Test' });
  });
});

it('keeps session storage behind the same RLS boundary as existing credentials', async () => {
  const rows = await prisma.$queryRaw<Array<{ relrowsecurity: boolean }>>`SELECT relrowsecurity FROM pg_class WHERE oid = 'sessions'::regclass`;
  expect(rows).toEqual([{ relrowsecurity: true }]);
});

 it('enforces shared atomic account limits without storing passwords or email addresses', async () => {
  const attempts = await Promise.allSettled(Array.from({ length: 9 }, () =>
    withSessionCookies(sessionCookieJar().jar, () => login({ email: 'limited@example.test', password: 'wrong-password' }))));
  expect(attempts.filter(row => row.status === 'rejected' && row.reason.code === 'INVALID_CREDENTIALS')).toHaveLength(5);
  expect(attempts.filter(row => row.status === 'rejected' && row.reason.code === 'TOO_MANY_ATTEMPTS')).toHaveLength(4);
  const rows = await prisma.authAttempt.findMany();
  expect(rows).toHaveLength(2);
  expect(rows.every(row => !row.key.includes('@') && !row.key.includes('password'))).toBe(true);
  await prisma.authAttempt.updateMany({ data: { expiresAt: new Date(0) } });
  await withSessionCookies(sessionCookieJar().jar, async () => {
    await expect(login({ email: 'limited@example.test', password: 'wrong-password' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });
  expect((await prisma.authAttempt.findMany()).every(row => row.attempts === 1)).toBe(true);
});

it('bounds account rows through the global budget and caps counters', async () => {
  await prisma.authAttempt.create({ data: { key: 'login:global', attempts: 100, expiresAt: new Date(Date.now() + 600000) } });
  await withSessionCookies(sessionCookieJar().jar, async () => {
    await expect(login({ email: 'new-target@example.test', password: 'wrong-password' })).rejects.toMatchObject({ code: 'TOO_MANY_ATTEMPTS' });
  });
  expect(await prisma.authAttempt.count()).toBe(1);
  expect((await prisma.authAttempt.findUniqueOrThrow({ where: { key: 'login:global' } })).attempts).toBe(101);
});
