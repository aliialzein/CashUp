import { z } from 'zod';
import { DENOMINATIONS, MONEY_PATTERN, MAX_COUNT_LINES, MAX_COUNT_QUANTITY, REFERENCE_RATE_MAX } from '../../domain/money/config';
import { compare, toMoneyString } from '../../domain/money/money';
import { addStableIssue, currency, moneyString, pageQuery, positiveMoneyString, uuid } from '../../shared/validation/common';
import { addMaxIssue } from '../../shared/validation/financial';
import { reasonBody } from '../../shared/validation/financial';
export const openCashUpSchema = z.object({
  floatUsd: moneyString.default('0.00'),
  floatLbp: moneyString.default('0.00'),
  referenceRate: positiveMoneyString.optional(),
}).strict().superRefine((value, context) => {
  addMaxIssue(context, 'floatUsd', value.floatUsd, 'USD');
  addMaxIssue(context, 'floatLbp', value.floatLbp, 'LBP');
  if (value.referenceRate !== undefined && MONEY_PATTERN.test(value.referenceRate) && compare(value.referenceRate, REFERENCE_RATE_MAX) > 0)
    addStableIssue(context, 'REFERENCE_RATE_EXCEEDS_MAX', ['referenceRate']);
});
export const requestVoidCashUpSchema = reasonBody;
export const voidCashUpSchema = reasonBody;
export const returnCashUpSchema = reasonBody;
const countLineSchema = z
  .object({
    currency,
    denomination: moneyString,
    quantity: z.number().int().min(0).max(MAX_COUNT_QUANTITY),
  })
  .strict()
  .superRefine((value, context) => {
    const allowed = DENOMINATIONS[value.currency].map((denomination) => toMoneyString(denomination));
    if (!allowed.includes(value.denomination)) {
      addStableIssue(context, 'INVALID_DENOMINATION', ['denomination']);
    }
  });
export const saveCountLinesSchema = z
  .object({
    lines: z.array(countLineSchema).max(MAX_COUNT_LINES),
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<string>();
    value.lines.forEach((line, index) => {
      const key = `${line.currency}:${line.denomination}`;
      if (seen.has(key)) {
        addStableIssue(context, 'DUPLICATE_COUNT_LINE', ['lines', index, 'denomination']);
      }
      seen.add(key);
    });
  });
export const cashUpHistoryQuerySchema = pageQuery
  .extend({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    membershipId: uuid.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.from && value.to && value.from > value.to) {
      addStableIssue(context, 'INVALID_DATE_RANGE', ['from']);
    }
  });
export type OpenCashUpInput = z.input<typeof openCashUpSchema>;
export type OpenCashUp = z.infer<typeof openCashUpSchema>;
export type RequestVoidCashUpInput = z.input<typeof requestVoidCashUpSchema>;
export type RequestVoidCashUp = z.infer<typeof requestVoidCashUpSchema>;
export type VoidCashUpInput = z.input<typeof voidCashUpSchema>;
export type VoidCashUp = z.infer<typeof voidCashUpSchema>;
export type ReturnCashUpInput = z.input<typeof returnCashUpSchema>;
export type ReturnCashUp = z.infer<typeof returnCashUpSchema>;
export type SaveCountLinesInput = z.input<typeof saveCountLinesSchema>;
export type SaveCountLines = z.infer<typeof saveCountLinesSchema>;
export type CashUpHistoryQueryInput = z.input<typeof cashUpHistoryQuerySchema>;
export type CashUpHistoryQuery = z.infer<typeof cashUpHistoryQuerySchema>;
