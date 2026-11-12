import { jest } from '@jest/globals';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { prisma, resetDatabase } from '../persistence/test-support';
import { login, logout, getCurrentUser, authDestination, SESSION_COOKIE } from '../../../src/modules/auth/auth.service';
import { createBusiness } from '../../../src/modules/business/business.service';
import { sessionCookieJar, withSessionCookies } from '../../support/session-cookies';

jest.setTimeout(20000);
beforeEach(resetDatabase);
afterAll(async () => { await prisma.$disconnect(); });

it('logs in through a cold pool whose first checkout exceeds the interactive acquisition deadline', async () => {
  const input = { email: 'cold-pool@example.test', password: 'cold-pool-test-password' };
  const user = await prisma.user.create({ data: { email: input.email, fullName: 'Cold pool', passwordHash: await hash(input.password) } });
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 1 });
  const originalConnect = pool.connect;
  let first = true;
  pool.connect = ((...args: unknown[]) => {
    if (!first) return Reflect.apply(originalConnect, pool, args);
    first = false;
    // pg query() uses callback checkout; the adapter's transaction start uses a promise.
    if (typeof args[0] === 'function') {
      setTimeout(() => Reflect.apply(originalConnect, pool, args), 2200);
      return;
    }
    return new Promise(resolve => setTimeout(resolve, 2200)).then(() => Reflect.apply(originalConnect, pool, args));
  }) as typeof pool.connect;
  const cold = new PrismaClient({ adapter: new PrismaPg(pool, { disposeExternalPool: true }) });
  const previousClient = globalThis.__cashUpPrismaClient;
  globalThis.__cashUpPrismaClient = cold;
  const fixture = sessionCookieJar();
  try {
    await withSessionCookies(fixture.jar, async () => {
      const started = performance.now();
      await login(input);
      expect(performance.now() - started).toBeGreaterThanOrEqual(2000);
      expect(fixture.values.get(SESSION_COOKIE)).toMatch(/^[a-f0-9]{64}$/);
      expect(await prisma.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(1);
      // A new request reads the issued cookie, without any injected identity.
      expect(await getCurrentUser()).toMatchObject({ id: user.id, membership: null });
      expect(authDestination((await getCurrentUser())!)).toBe('/onboarding');
      await createBusiness({ name: 'Login verification', isSolo: true });
      await logout();
      await login(input);
      expect(authDestination((await getCurrentUser())!)).toBe('/owner');
      expect(await getCurrentUser()).toMatchObject({ id: user.id, membership: { role: 'OWNER', status: 'ACTIVE' } });
      const issuedCookie = fixture.values.get(SESSION_COOKIE);
      await expect(login({ ...input, password: 'intentionally-invalid-password' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
      expect(fixture.values.get(SESSION_COOKIE)).toBe(issuedCookie);
      expect(await prisma.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(1);
      await logout();
      expect(await getCurrentUser()).toBeNull();
      expect(await prisma.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
    });
  } finally {
    globalThis.__cashUpPrismaClient = previousClient;
    await cold.$disconnect();
  }
});