import 'server-only';
import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { hash } from 'argon2';
import { getPrisma } from '../../shared/db/prisma';
import { HASH_OPTIONS, readResetAuthorization, writeResetAuthorization } from './auth.service';
export { RESET_COOKIE } from './auth.service';
import { usersMatchingEmail } from './auth.repository';
import { consumeRecoveryBudget, invalidateRecovery, lockRecoveryUser, createRecoveryChallenge, findActiveRecovery, findRecoveryAuthorization, failRecoveryDelivery, recordWrongRecoveryCode, authorizeRecovery, consumeRecoveryAuthorization, replaceRecoveredPassword } from './password-recovery.repository';
import { sendResetCode } from './password-recovery.email';
import { requestResetSchema, verifyResetSchema, resetPasswordSchema, type RequestResetInput, type VerifyResetInput, type ResetPasswordInput } from './auth.validation';
import { reportUnexpectedAuthFailure } from './auth-diagnostics';

export const RESET_SENT_MESSAGE = 'If an account exists with this email, we’ve sent a reset code.';
const lifetime = 600000;
const digest = (raw: string) => createHash('sha256').update(raw).digest('hex');
function codeDigest(id: string, userId: string, code: string) {
  const secret = process.env.RESET_CODE_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('Recovery secret is not configured');
  return createHmac('sha256', secret).update(`${id}:${userId}:${code}`).digest('hex');
}
export class RecoveryFailure extends Error {
  constructor() { super('Recovery details are invalid or expired. Please request a new code.'); }
}

export async function requestPasswordReset(values: RequestResetInput, ip: string = 'unknown'): Promise<string> {
  const { email } = requestResetSchema.parse(values);
  // Validate configuration for every email, including unknown accounts.
  codeDigest('', '', '');
  const delivery = await getPrisma().$transaction(async tx => {
    if (!await consumeRecoveryBudget(digest(email), digest(ip), tx)) return null;
    const matches = await usersMatchingEmail(email, tx);
    const user = matches.length === 1 ? matches[0] : null;
    if (!user || user.provider !== 'LOCAL' || !user.passwordHash) return null;
    await lockRecoveryUser(user.id, tx);
    await invalidateRecovery(user.id, tx);
    const id = randomUUID();
    const code = randomInt(0, 1000000).toString().padStart(6, '0');
    await createRecoveryChallenge({ id, userId: user.id, codeHash: codeDigest(id, user.id, code), tokenHash: digest(randomBytes(32).toString('hex')), expiresAt: new Date(Date.now() + lifetime) }, tx);
    return { id, email: user.email, code };
  });
  if (delivery) {
    try { await sendResetCode(delivery.email, delivery.code, delivery.id); }
    catch (error) {
      reportUnexpectedAuthFailure('reset-email', error);
      // Invalidate only this delivery, never a newer resend.
      try { await failRecoveryDelivery(delivery.id); }
      catch (cleanupError) { reportUnexpectedAuthFailure('reset-email', cleanupError); }
    }
  }
  return RESET_SENT_MESSAGE;
}

export async function verifyPasswordReset(values: VerifyResetInput): Promise<void> {
  const { email, code } = verifyResetSchema.parse(values);
  const raw = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + lifetime);
  const success = await getPrisma().$transaction(async tx => {
    const matches = await usersMatchingEmail(email, tx);
    const user = matches.length === 1 ? matches[0] : null;
    if (!user || user.provider !== 'LOCAL') return false;
    await lockRecoveryUser(user.id, tx);
    const challenge = await findActiveRecovery(user.id, tx);
    if (!challenge || !challenge.codeHash || challenge.verifiedAt || challenge.attempts >= 5 || challenge.expiresAt <= new Date()) return false;
    const correct = timingSafeEqual(Buffer.from(challenge.codeHash, 'hex'), Buffer.from(codeDigest(challenge.id, user.id, code), 'hex'));
    if (!correct) {
      await recordWrongRecoveryCode(challenge.id, tx);
      return false; // Commit failed attempts rather than rolling them back with an exception.
    }
    await authorizeRecovery(challenge.id, digest(raw), expiresAt, tx);
    return true;
  });
  if (!success) throw new RecoveryFailure();
  await writeResetAuthorization(raw, expiresAt);
}

export async function resetPassword(values: ResetPasswordInput): Promise<void> {
  const input = resetPasswordSchema.parse(values);
  const raw = await readResetAuthorization();
  if (!raw || !/^[a-f0-9]{64}$/.test(raw)) throw new RecoveryFailure();
  const tokenHash = digest(raw);
  const db = getPrisma();
  const candidate = await findRecoveryAuthorization(tokenHash);
  if (!candidate || candidate.usedAt || !candidate.verifiedAt || candidate.expiresAt <= new Date()) throw new RecoveryFailure();
  const passwordHash = await hash(input.password, HASH_OPTIONS);
  const success = await db.$transaction(async tx => {
    await lockRecoveryUser(candidate.userId, tx);
    const consumed = await consumeRecoveryAuthorization(candidate.id, tokenHash, tx);
    if (consumed.count !== 1) return false;
    await replaceRecoveredPassword(candidate.userId, passwordHash, tx);
    await invalidateRecovery(candidate.userId, tx);
    return true;
  });
  if (!success) throw new RecoveryFailure();
  await writeResetAuthorization('', new Date(0));
}
