/* eslint-disable @typescript-eslint/no-require-imports -- Standalone no-email diagnostic. */
require('@next/env').loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

async function main() {
  const { email, database, diagnostics } = await require('./password-recovery-smoke.cjs').loadRecoveryModules();
  const report = (stage, error) => console.error(JSON.stringify({ stage, ...diagnostics.sanitizedAuthError(error) }));
  const required = ['DATABASE_URL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM', 'RESET_CODE_SECRET'];
  console.log(JSON.stringify({ stage: 'configuration',
    missingVariables: required.filter(key => !process.env[key]),
    smtpPortValid: Number(process.env.SMTP_PORT) === 465,
    resetSecretValid: Buffer.byteLength(process.env.RESET_CODE_SECRET || '') >= 32,
  }));
  let transport;
  try {
    transport = email.createRecoveryEmailTransport();
    await transport.verify(); // Connect, negotiate verified TLS and authenticate. Never sendMail.
    console.log(JSON.stringify({ stage: 'smtp-verify', ok: true }));
  } catch (error) {
    report('smtp-verify', error); process.exitCode = 1; return;
  } finally {
    transport?.close();
  }
  try {
    // Read-only checks of the actual service's transaction/persistence path. No request
    // budgets, challenges, credentials or account records are created or changed.
    await database.getPrisma().$transaction(async tx => {
      await tx.$queryRaw`SELECT 1`;
      await tx.authAttempt.findFirst({ select: { attempts: true } });
      await tx.user.findFirst({ select: { provider: true } });
      await tx.passwordResetToken.findFirst({ select: { attempts: true, verifiedAt: true, codeHash: true } });
    });
    console.log(JSON.stringify({ stage: 'database-read-and-transaction', ok: true }));
  } catch (error) {
    report('database-read-and-transaction', error); process.exitCode = 1;
  } finally {
    await database.closePrisma();
  }
}
main().catch(() => {
  // Import/runtime errors have no safe sanitizer available yet. Do not dump them.
  console.error(JSON.stringify({ stage: 'diagnostic-startup', name: 'Error', message: 'Diagnostic could not load. Use Node >=22.15 with --conditions=react-server.' }));
  process.exitCode = 1;
});
