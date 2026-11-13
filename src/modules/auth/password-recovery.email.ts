import 'server-only';
import nodemailer from 'nodemailer';
import { sanitizedAuthError } from './auth-diagnostics';

// Shared by delivery and the no-email SMTP diagnostic so their configuration cannot drift.
export function createRecoveryEmailTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;
  if (!host || port !== 465 || !user || !pass || !from) throw new Error('Recovery email is not configured');
  return nodemailer.createTransport({
    host, port, secure: true,
    auth: { user, pass },
    tls: { rejectUnauthorized: true },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000,
    logger: false, debug: false,
  });
}

export async function sendResetCode(email: string, code: string, challengeId: string): Promise<void> {
  // Keep the caller's interface; SMTP has no provider idempotency-key facility.
  void challengeId;
  const transport = createRecoveryEmailTransport();
  try {
    await transport.sendMail({ from: process.env.EMAIL_FROM, to: [email], subject: 'Your CashUp reset code',
      text: `Your CashUp password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.` });
  } catch (error) {
    // SMTP exceptions can contain recipient/server details. Never log or propagate them.
    const safe = sanitizedAuthError(error);
    const failure = Object.assign(new Error(safe.message), { name: safe.name,
      code: safe.code, command: safe.command, responseCode: safe.responseCode });
    throw failure;
  }
}
