import { jest } from '@jest/globals';
import { randomBytes, randomUUID } from 'node:crypto';
import { verify } from 'argon2';
import { seedDevelopmentStaff } from '../../../scripts/dev-staff-seed.cjs';
import { prisma, resetDatabase, seedBusinesses } from '../persistence/test-support';
import { login, requireCurrentMember } from '../../../src/modules/auth/auth.service';
import { openCashUp, getOwnCashUp, getOwnOpenCashUp } from '../../../src/modules/cash-ups/cash-ups.service';
import { sessionCookieJar, withSessionCookies } from '../../support/session-cookies';

jest.setTimeout(20000);
beforeEach(resetDatabase);
afterAll(async () => { await prisma.$disconnect(); });

function environment() {
  return {
    NODE_ENV: 'test', CASHUP_SEED_TARGET: 'disposable-test', DATABASE_URL: process.env.TEST_DATABASE_URL,
    CASHUP_DEV_OWNER_EMAIL: 'seed-owner@example.test', CASHUP_DEV_OWNER_PASSWORD: randomBytes(20).toString('hex'),
    CASHUP_DEV_STAFF_EMAIL: 'seed-staff@example.test', CASHUP_DEV_STAFF_PASSWORD: randomBytes(20).toString('hex'),
  };
}

it('creates real login credentials, reruns without changes, and keeps unrelated fixtures intact', async () => {
  await seedBusinesses();
  const before = await prisma.user.findMany({ orderBy: { id: 'asc' } });
  const env = environment();
  await seedDevelopmentStaff(env);
  const users = await prisma.user.findMany({ where: { email: { in: [env.CASHUP_DEV_OWNER_EMAIL, env.CASHUP_DEV_STAFF_EMAIL] } }, orderBy: { email: 'asc' } });
  expect(users).toHaveLength(2);
  expect(await verify(users.find(user => user.email === env.CASHUP_DEV_STAFF_EMAIL)!.passwordHash!, env.CASHUP_DEV_STAFF_PASSWORD)).toBe(true);
  expect(users.every(user => user.passwordHash?.startsWith('$argon2id$v=19$m=19456,t=2,p=1$'))).toBe(true);
  const memberships = await prisma.membership.findMany({ where: { userId: { in: users.map(user => user.id) } }, orderBy: { id: 'asc' } });
  expect(memberships.map(row => row.role).sort()).toEqual(['OWNER', 'STAFF']);
  expect(memberships.every(row => row.status === 'ACTIVE')).toBe(true);
  expect(new Set(memberships.map(row => row.businessId)).size).toBe(1);
  await seedDevelopmentStaff(env);
  expect(await prisma.user.findMany({ where: { id: { in: users.map(user => user.id) } }, orderBy: { email: 'asc' } })).toEqual(users);
  expect(await prisma.membership.findMany({ where: { userId: { in: users.map(user => user.id) } }, orderBy: { id: 'asc' } })).toEqual(memberships);
  expect(await prisma.user.findMany({ where: { id: { in: before.map(user => user.id) } }, orderBy: { id: 'asc' } })).toEqual(before);
  const { jar } = sessionCookieJar();
  await withSessionCookies(jar, async () => {
    await login({ email: env.CASHUP_DEV_STAFF_EMAIL, password: env.CASHUP_DEV_STAFF_PASSWORD });
    await expect(requireCurrentMember()).resolves.toMatchObject({ role: 'STAFF', businessId: memberships[0].businessId });
    const cashUp = await openCashUp({ floatUsd: '20', referenceRate: '89500' });
    await expect(getOwnOpenCashUp()).resolves.toMatchObject({ id: cashUp.id });
    await expect(getOwnCashUp(randomUUID())).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
    await prisma.membership.update({ where: { userId: users.find(user => user.email === env.CASHUP_DEV_STAFF_EMAIL)!.id }, data: { status: 'INACTIVE', deactivatedAt: new Date() } });
    await expect(getOwnOpenCashUp()).rejects.toMatchObject({ code: 'ACTOR_NOT_ACTIVE' });
  });
});

it.each(['password', 'email-collision', 'inactive', 'other-business'] as const)('refuses %s conflicts without modifying any records', async conflict => {
  const env = environment();
  if (conflict === 'email-collision') {
    await prisma.user.create({ data: { email: env.CASHUP_DEV_STAFF_EMAIL.toUpperCase(), fullName: 'Existing user', provider: 'GOOGLE' } });
  } else {
    await seedDevelopmentStaff(env);
    if (conflict === 'password') env.CASHUP_DEV_STAFF_PASSWORD = randomBytes(20).toString('hex');
    if (conflict === 'inactive') {
      const user = await prisma.user.findUniqueOrThrow({ where: { email: env.CASHUP_DEV_STAFF_EMAIL } });
      await prisma.membership.update({ where: { userId: user.id }, data: { status: 'INACTIVE', deactivatedAt: new Date() } });
    }
    if (conflict === 'other-business') {
      const { businessA } = await seedBusinesses();
      const user = await prisma.user.findUniqueOrThrow({ where: { email: env.CASHUP_DEV_STAFF_EMAIL } });
      await prisma.membership.update({ where: { userId: user.id }, data: { businessId: businessA.id } });
    }
  }
  const before = {
    users: await prisma.user.findMany({ orderBy: { id: 'asc' } }),
    businesses: await prisma.business.findMany({ orderBy: { id: 'asc' } }),
    memberships: await prisma.membership.findMany({ orderBy: { id: 'asc' } }),
  };
  await expect(seedDevelopmentStaff(env)).rejects.toThrow('SEED_FIXTURE_CONFLICT');
  expect(await prisma.user.findMany({ orderBy: { id: 'asc' } })).toEqual(before.users);
  expect(await prisma.business.findMany({ orderBy: { id: 'asc' } })).toEqual(before.businesses);
  expect(await prisma.membership.findMany({ orderBy: { id: 'asc' } })).toEqual(before.memberships);
});
