'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { ZodError } from 'zod';
import { requireCurrentMember, requireOwnerPermission } from '../../../modules/auth/auth.service';
import { approveCashUp, returnCashUpToOpen } from '../../../modules/cash-ups/cash-ups.service';
import { decideSaleDeletion } from '../../../modules/sales/sales.service';
import { createJoinCode } from '../../../modules/business/business.service';
import { ServiceError, UnauthenticatedError } from '../../../shared/errors/service-errors';
import { toValidationError } from '../../../shared/validation/errors';

export type OwnerActionResult = { ok: true } | { ok: false; code: string; message: string; fields?: Record<string, string> };

function refresh(cashUpId: string) {
  for (const path of ['/owner', '/owner/cash-ups',
    `/owner/cash-ups/${cashUpId}/review`, `/owner/cash-ups/${cashUpId}/sales`]) revalidatePath(path);
}
function failure(error: unknown): OwnerActionResult {
  unstable_rethrow(error);
  if (error instanceof ZodError) {
    const fields = Object.fromEntries(toValidationError(error).issues.map(issue => [issue.path.join('.'), issue.code]));
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Please check your details.', fields };
  }
  if (error instanceof ServiceError) {
    const messages: Partial<Record<typeof error.code, string>> = {
      CASHUP_ALREADY_OPEN: 'This member already has an open cash-up. Finish it before returning another.',
      CASHUP_STATE_CONFLICT: 'This cash-up has already changed. Refresh to see its current state.',
      REQUEST_ALREADY_DECIDED: 'This request has already been decided. Refresh to see the decision.',
      CASHUP_NOT_OPEN: 'Sale-deletion decisions require an open cash-up.',
      ACTOR_NOT_ACTIVE: 'Your membership is inactive. Contact your business owner.',
      REVIEW_NOT_ALLOWED: 'Your account is not eligible to review this cash-up or request.',
    };
    return { ok: false, code: error.code, message: messages[error.code] ?? error.message };
  }
  if (error instanceof UnauthenticatedError) return { ok: false, code: 'UNAUTHENTICATED', message: 'Please sign in again.' };
  return { ok: false, code: 'UNEXPECTED_ERROR', message: 'Unable to save your decision. Please try again.' };
}
async function requireOwner() { requireOwnerPermission(await requireCurrentMember()); }

export async function approveCashUpAction(cashUpId: string): Promise<OwnerActionResult> {
  try { await requireOwner(); const result = await approveCashUp(cashUpId); refresh(result.id); return { ok: true }; }
  catch (error) { return failure(error); }
}
export async function returnCashUpAction(cashUpId: string, reason: string): Promise<OwnerActionResult> {
  try { await requireOwner(); const result = await returnCashUpToOpen(cashUpId, reason); refresh(result.id); return { ok: true }; }
  catch (error) { return failure(error); }
}
export type JoinCodeResult = { ok: true; code: string; expiresAt: string } | Extract<OwnerActionResult, { ok: false }>;

/** A new one-time join code (backend defaults: 1 use, valid 7 days). The plain code is only returned here, once. */
export async function createJoinCodeAction(): Promise<JoinCodeResult> {
  try {
    await requireOwner();
    const result = await createJoinCode({ maxUses: 1, expiresInDays: 7 });
    revalidatePath('/owner/team');
    return { ok: true, code: result.code, expiresAt: result.expiresAt };
  } catch (error) {
    const result = failure(error);
    return result.ok ? { ok: false, code: 'UNEXPECTED_ERROR', message: 'Unable to create a code. Please try again.' } : result;
  }
}
export async function decideSaleDeletionAction(requestId: string, decision: 'APPROVE' | 'REFUSE', reason: string): Promise<OwnerActionResult> {
  try {
    await requireOwner();
    const result = await decideSaleDeletion(requestId, decision, reason);
    refresh(result.request.cashUpId);
    return { ok: true };
  } catch (error) { return failure(error); }
}
