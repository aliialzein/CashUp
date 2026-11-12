/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CLI, also imported by Jest. */
const { Client } = require('pg');
const { hash, verify, argon2id } = require('argon2');
const { z } = require('zod');

// Separate from scripts/dev-seed.sql; never adopt an existing account or membership.
const businessId = 'a78d1715-4cb3-4556-8e2a-72072f039f37';
const businessName = 'CashUp Driver Development';
const fixtures = [
  { role: 'OWNER', id: 'b1527d72-e65e-47d5-908f-97f9eb769604', membershipId: '093de91b-dd51-49e6-a102-958d26ff94cf', fullName: 'Development Owner' },
  { role: 'STAFF', id: '48c228b5-921e-4959-8a97-4f97ca3223dc', membershipId: '1fed52f4-a8e3-4093-a0fc-a6f6209ddbc8', fullName: 'Development Staff' },
];
const credentials = z.object({
  email: z.string().trim().max(254).email().transform(value => value.toLowerCase()),
  password: z.string().min(8).max(128),
});
// Match auth.service.ts signup hashing; passwords are never trimmed.
const hashOptions = { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

function refuse(code) {
  throw new Error(code);
}

function seedConfig(env) {
  if (env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production') refuse('SEED_PRODUCTION_REFUSED');
  let target;
  try { target = new URL(env.DATABASE_URL); } catch { refuse('SEED_TARGET_REFUSED'); }
  const local = env.NODE_ENV === 'development' && env.CASHUP_SEED_TARGET === 'local-development'
    && target.pathname === '/cashup_dev' && (target.port === '' || target.port === '5432');
  const disposable = env.NODE_ENV === 'test' && env.CASHUP_SEED_TARGET === 'disposable-test'
    && target.pathname === '/cashup_test' && target.port === '55432'
    && target.username === 'cashup_test' && target.password === 'cashup_test';
  if (!['postgres:', 'postgresql:'].includes(target.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    || target.search || target.hash || !(local || disposable)) refuse('SEED_TARGET_REFUSED');
  const users = fixtures.map(fixture => {
    const result = credentials.safeParse({
      email: env[`CASHUP_DEV_${fixture.role}_EMAIL`],
      password: env[`CASHUP_DEV_${fixture.role}_PASSWORD`],
    });
    if (!result.success) refuse('SEED_CREDENTIALS_REQUIRED');
    return { ...fixture, ...result.data };
  });
  if (users[0].email === users[1].email) refuse('SEED_DISTINCT_EMAILS_REQUIRED');
  return { connectionString: env.DATABASE_URL, database: target.pathname.slice(1), users };
}

async function seedDevelopmentStaff(env) {
  const config = seedConfig(env); // Validate before creating a client or making any connection.
  const client = new Client({ connectionString: config.connectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '10s'");
    const target = await client.query('SELECT current_database() AS database');
    if (target.rows[0]?.database !== config.database) refuse('SEED_TARGET_REFUSED');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', ['cashup-dev-staff-seed']);
    const existingBusiness = await client.query('SELECT name, "isSolo" FROM businesses WHERE id = $1 FOR UPDATE', [businessId]);
    if (existingBusiness.rows.length && (existingBusiness.rows[0].name !== businessName || existingBusiness.rows[0].isSolo))
      refuse('SEED_FIXTURE_CONFLICT');
    if (!existingBusiness.rows.length) {
      await client.query('INSERT INTO businesses (id, name, "isSolo", "createdAt", "updatedAt") VALUES ($1, $2, false, NOW(), NOW())', [businessId, businessName]);
    }
    // Use the same email lock and case-insensitive collision check as signup.
    for (const user of [...config.users].sort((a, b) => a.email.localeCompare(b.email))) {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [user.email]);
      const existing = await client.query('SELECT id, email, provider, "passwordHash" FROM users WHERE id = $1 OR lower(email) = $2 FOR UPDATE', [user.id, user.email]);
      if (existing.rows.length) {
        const row = existing.rows[0];
        if (existing.rows.length !== 1 || row.id !== user.id || row.email !== user.email
          || row.provider !== 'LOCAL' || !row.passwordHash || !await verify(row.passwordHash, user.password))
          refuse('SEED_FIXTURE_CONFLICT');
      } else {
        const passwordHash = await hash(user.password, hashOptions);
        await client.query('INSERT INTO users (id, email, "passwordHash", "fullName", provider, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, \'LOCAL\', NOW(), NOW())', [user.id, user.email, passwordHash, user.fullName]);
      }
      const membership = await client.query('SELECT id, "userId", "businessId", role, status, "deactivatedAt" FROM memberships WHERE id = $1 OR "userId" = $2 FOR UPDATE', [user.membershipId, user.id]);
      if (membership.rows.length) {
        const row = membership.rows[0];
        if (membership.rows.length !== 1 || row.id !== user.membershipId || row.userId !== user.id
          || row.businessId !== businessId || row.role !== user.role || row.status !== 'ACTIVE' || row.deactivatedAt)
          refuse('SEED_FIXTURE_CONFLICT');
      } else if (existing.rows.length) {
        // A previously seeded user whose membership changed is not silently rejoined.
        refuse('SEED_FIXTURE_CONFLICT');
      } else {
        await client.query('INSERT INTO memberships (id, "userId", "businessId", role, status, "joinedAt") VALUES ($1, $2, $3, $4::"MembershipRole", \'ACTIVE\', NOW())', [user.membershipId, user.id, businessId, user.role]);
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

module.exports = { seedConfig, seedDevelopmentStaff };

if (require.main === module) {
  // Match next dev's .env.local/.env precedence without logging loaded values.
  require('@next/env').loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  seedDevelopmentStaff(process.env).then(() => {
    console.log('Development owner and active staff fixtures are ready. Existing credentials were preserved.');
  }).catch(error => {
    const code = /^SEED_[A-Z_]+$/.test(error.message) ? error.message : 'SEED_FAILED';
    console.error(`${code}: no seed changes committed. Check the documented target and fixture requirements.`);
    process.exitCode = 1;
  });
}
