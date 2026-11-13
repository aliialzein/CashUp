/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CLI, matching dev-staff-seed.cjs. */
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { pathToFileURL, fileURLToPath } = require('node:url');
const { registerHooks } = require('node:module');
const ts = require('typescript');

// Temporary backend-only smoke test. Run from the project root with Node >=22.15:
// node --conditions=react-server scripts/password-recovery-smoke.cjs "you@example.com"
// One request only: no retries, account creation, verification or password changes.
async function loadRecoveryModules() {
  // Use the package's actual server export condition. Never stub server-only.
  require('server-only');
  const sourceRoot = pathToFileURL(path.resolve(__dirname, '../src') + path.sep).href;
  // The application uses extensionless TypeScript imports; preserve ESM/import.meta
  // in generated Prisma code without changing project configuration or dependencies.
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (context.parentURL?.startsWith(sourceRoot)) {
        if (specifier.startsWith('.') && !/\.(?:[cm]?[jt]sx?|json|node)$/.test(specifier)) {
          return nextResolve(`${specifier}.ts`, context);
        }
        if (specifier === 'next/headers' || specifier === 'next/server') {
          return nextResolve(`${specifier}.js`, context);
        }
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url.startsWith(sourceRoot) && url.endsWith('.ts')) {
        const source = ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
          compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
          fileName: fileURLToPath(url),
        }).outputText;
        return { format: 'module', source, shortCircuit: true };
      }
      return nextLoad(url, context);
    },
  });
  const fromSource = relative => import(new URL(relative, sourceRoot).href);
  return {
    service: await fromSource('modules/auth/password-recovery.service.ts'),
    repository: await fromSource('modules/auth/auth.repository.ts'),
    validation: await fromSource('modules/auth/auth.validation.ts'),
    database: await fromSource('shared/db/prisma.ts'),
  };
}

async function main() {
  if (process.argv.length !== 3) {
    console.error('Usage: node --conditions=react-server scripts/password-recovery-smoke.cjs "you@example.com"');
    process.exitCode = 1;
    return;
  }
  // Same development environment precedence and silent loading as dev-staff-seed.cjs.
  require('@next/env').loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw new Error('SMOKE_DEVELOPMENT_ONLY');
  }
  if (!process.env.DATABASE_URL || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM
      || Buffer.byteLength(process.env.RESET_CODE_SECRET || '') < 32) {
    throw new Error('SMOKE_CONFIGURATION_REQUIRED');
  }
  const { service, repository, validation, database } = await loadRecoveryModules();
  try {
    const input = validation.requestResetSchema.parse({ email: process.argv[2] });
    const matches = await repository.usersMatchingEmail(input.email);
    if (matches.length !== 1 || matches[0].provider !== 'LOCAL' || !matches[0].passwordHash) {
      throw new Error('SMOKE_EXISTING_LOCAL_ACCOUNT_REQUIRED');
    }
    // The real service owns challenges, cooldowns, shared limits and Resend delivery.
    // Keep its default IP bucket; never invent a fresh IP to bypass limits.
    console.log(await service.requestPasswordReset(input));
    console.log('This response does not confirm delivery. Check your inbox/spam and the Resend Emails dashboard. Do not rerun automatically.');
  } finally {
    await database.closePrisma();
  }
}

module.exports = { loadRecoveryModules };
if (require.main === module) {
  main().catch(error => {
    const code = /^SMOKE_[A-Z_]+$/.test(error?.message) ? error.message : 'SMOKE_TEST_FAILED';
    // Never print raw exceptions: connection errors may contain credentials.
    console.error(`${code}: check the recipient, development configuration and server-only command. No automatic retry was made.`);
    process.exitCode = 1;
  });
}
