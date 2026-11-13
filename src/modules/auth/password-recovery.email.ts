import 'server-only';

export async function sendResetCode(email: string, code: string, challengeId: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error('Recovery email is not configured');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `password-reset/${challengeId}` },
    body: JSON.stringify({ from, to: [email], subject: 'Your CashUp reset code',
      text: `Your CashUp password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.` }),
    signal: AbortSignal.timeout(10000),
  });
  // Provider bodies may contain recipient data. Never log or propagate them.
  if (!response.ok) throw new Error(`Recovery email rejected (${response.status})`);
}
