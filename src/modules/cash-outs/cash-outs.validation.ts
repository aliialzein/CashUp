import { z } from 'zod';
import { MONEY_PATTERN } from '../../domain/money/config';
import { compare, type MoneyLike } from '../../domain/money/money';
import { addStableIssue, moneyString, note, reason } from '../../shared/validation/common';
import { addMaxIssue } from '../../shared/validation/financial';
import { reasonBody } from '../../shared/validation/financial';
export const cancelCashOutSchema = reasonBody;
const cashOutBase = z.object({
  amountUsd: moneyString.default('0.00'),
  amountLbp: moneyString.default('0.00'),
  reason,
  note: note.nullable().optional()
}).strict();
function refineCashOut(value: z.infer<typeof cashOutBase>, context: z.RefinementCtx) {
  addMaxIssue(context, 'amountUsd', value.amountUsd, 'USD');
  addMaxIssue(context, 'amountLbp', value.amountLbp, 'LBP');
  if (![value.amountUsd, value.amountLbp].every(amount => MONEY_PATTERN.test(amount)))
    return;
  if (compare(value.amountUsd, '0') <= 0 && compare(value.amountLbp, '0') <= 0)
    addStableIssue(context, 'MONEY_MUST_BE_POSITIVE', ['amountUsd']);
}
export const createCashOutSchema = cashOutBase.superRefine(refineCashOut);
export const updateCashOutSchema = z.object({
  amountUsd: moneyString.optional(),
  amountLbp: moneyString.optional(),
  reason: reason.optional(),
  note: note.nullable().optional()
}).strict().superRefine((value, context) => {
  if (!Object.values(value).some(entry => entry !== undefined))
    addStableIssue(context, 'EDIT_FIELD_REQUIRED', []);
  addMaxIssue(context, 'amountUsd', value.amountUsd, 'USD');
  addMaxIssue(context, 'amountLbp', value.amountLbp, 'LBP');
});
export interface MergedCashOutCurrent {
  amountUsd: MoneyLike;
  amountLbp: MoneyLike;
  reason: string;
  note?: string | null;
}
export function validateMergedCashOut(current: MergedCashOutCurrent, changes: UpdateCashOutInput) {
  return createCashOutSchema.safeParse({
    amountUsd: (changes.amountUsd ?? current.amountUsd).toString(),
    amountLbp: (changes.amountLbp ?? current.amountLbp).toString(),
    reason: changes.reason ?? current.reason,
    note: changes.note === undefined ? current.note : changes.note
  });
}
export type CancelCashOutInput = z.input<typeof cancelCashOutSchema>;
export type CancelCashOut = z.infer<typeof cancelCashOutSchema>;
export type CreateCashOutInput = z.input<typeof createCashOutSchema>;
export type CreateCashOut = z.infer<typeof createCashOutSchema>;
export type UpdateCashOutInput = z.input<typeof updateCashOutSchema>;
export type UpdateCashOut = z.infer<typeof updateCashOutSchema>;
