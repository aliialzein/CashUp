import { seedConfig, seedDevelopmentStaff } from '../../../scripts/dev-staff-seed.cjs';
import { randomBytes } from 'node:crypto';
import { Client } from 'pg';

jest.mock('pg', () => ({ Client: jest.fn() }));

const environment = () => ({
  NODE_ENV: 'development', CASHUP_SEED_TARGET: 'local-development',
  DATABASE_URL: 'postgresql://local@127.0.0.1:5432/cashup_dev',
  CASHUP_DEV_OWNER_EMAIL: ' Owner@Example.Test ', CASHUP_DEV_OWNER_PASSWORD: randomBytes(20).toString('hex'),
  CASHUP_DEV_STAFF_EMAIL: ' Staff@Example.Test ', CASHUP_DEV_STAFF_PASSWORD: randomBytes(20).toString('hex'),
});

it('normalizes credential emails, preserves password whitespace, and requires distinct accounts', () => {
  const env = environment();
  env.CASHUP_DEV_STAFF_PASSWORD = ` ${env.CASHUP_DEV_STAFF_PASSWORD} `;
  const config = seedConfig(env);
  expect(config.users.map(user => [user.role, user.email])).toEqual([
    ['OWNER', 'owner@example.test'], ['STAFF', 'staff@example.test'],
  ]);
  expect(config.users[1].password).toBe(env.CASHUP_DEV_STAFF_PASSWORD);
  expect(() => seedConfig({ ...env, CASHUP_DEV_STAFF_EMAIL: env.CASHUP_DEV_OWNER_EMAIL })).toThrow('SEED_DISTINCT_EMAILS_REQUIRED');
});

it.each([
  { NODE_ENV: 'production' }, { VERCEL_ENV: 'production' }, { NODE_ENV: undefined },
  { CASHUP_SEED_TARGET: undefined }, { DATABASE_URL: undefined }, { DATABASE_URL: 'invalid' },
  { DATABASE_URL: 'postgresql://local@db.example.test:5432/cashup_dev' },
  { DATABASE_URL: 'postgresql://local@localhost:5432/production' },
  { DATABASE_URL: 'postgresql://local@localhost:6543/cashup_dev' },
  { DATABASE_URL: 'postgresql://local@localhost:5432/cashup_dev?host=remote' },
  { DATABASE_URL: 'postgresql://local@localhost:5432/cashup_dev#fragment' },
  { DATABASE_URL: 'https://localhost:5432/cashup_dev' },
  { CASHUP_DEV_STAFF_PASSWORD: '' }, { CASHUP_DEV_OWNER_PASSWORD: 'x'.repeat(129) },
  { CASHUP_DEV_STAFF_EMAIL: 'invalid' },
])('refuses unsafe configuration before any database access (%j)', async changes => {
  jest.mocked(Client).mockClear();
  await expect(seedDevelopmentStaff({ ...environment(), ...changes })).rejects.toThrow(/^SEED_/);
  expect(Client).not.toHaveBeenCalled();
});

it('permits only the explicitly selected disposable test target in test mode', () => {
  const env = {
    ...environment(), NODE_ENV: 'test', CASHUP_SEED_TARGET: 'disposable-test',
    DATABASE_URL: 'postgresql://cashup_test:cashup_test@localhost:55432/cashup_test',
  };
  expect(seedConfig(env).database).toBe('cashup_test');
  expect(() => seedConfig({ ...env, DATABASE_URL: env.DATABASE_URL.replace(':55432', ':5432') })).toThrow('SEED_TARGET_REFUSED');
  expect(() => seedConfig({ ...env, DATABASE_URL: env.DATABASE_URL.replace('cashup_test:cashup_test', 'other:other') })).toThrow('SEED_TARGET_REFUSED');
});
