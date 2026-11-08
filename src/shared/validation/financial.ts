import { z } from 'zod';
import { MAX_AMOUNT, MONEY_PATTERN, type Currency } from '../../domain/money/config';
import { compare } from '../../domain/money/money';
import { addStableIssue, reason } from './common';
export function addMaxIssue(context: z.RefinementCtx, field: string, amount: string | null | undefined, selectedCurrency: Currency | undefined): void {
  if (amount == null || selectedCurrency == null || !MONEY_PATTERN.test(amount))
    return;
  if (compare(amount, MAX_AMOUNT[selectedCurrency]) > 0)
    addStableIssue(context, 'AMOUNT_EXCEEDS_MAX', [field]);
}
export const reasonBody = z.object({ reason }).strict();
