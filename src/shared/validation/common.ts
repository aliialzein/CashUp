import { z } from 'zod';
import { CLIENT_NUMBER_PATTERN, CURRENCIES, MONEY_PATTERN, NOTE_MAX, PAGE_SIZE, PAYMENT_METHODS, REASON_LENGTH } from '../../domain/money/config';
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/;
const CONTROL_CHARACTERS_EXCEPT_NEWLINE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/;
export const uuid = z.uuid({ error: 'INVALID_UUID' });
export const idempotencyKey = uuid;
function normalizeMoney(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}
export const moneyString = z
  .string()
  .regex(MONEY_PATTERN, { error: 'INVALID_MONEY' })
  .transform(normalizeMoney);
export const positiveMoneyString = moneyString.refine((value) => value !== '0.00', {
  error: 'MONEY_MUST_BE_POSITIVE',
});
export const currency = z.enum(CURRENCIES);
export const paymentMethod = z.enum(PAYMENT_METHODS);
export const reason = z
  .string()
  .refine((value) => !CONTROL_CHARACTERS.test(value), { error: 'CONTROL_CHARACTER' })
  .transform((value) => value.trim())
  .refine((value) => value.length >= REASON_LENGTH.min, { error: 'REASON_TOO_SHORT' })
  .refine((value) => value.length <= REASON_LENGTH.max, { error: 'REASON_TOO_LONG' });
export const note = z
  .string()
  .refine((value) => !CONTROL_CHARACTERS_EXCEPT_NEWLINE.test(value), {
    error: 'CONTROL_CHARACTER',
  })
  .transform((value) => value.trim())
  .refine((value) => value.length <= NOTE_MAX, { error: 'NOTE_TOO_LONG' });
export const clientNumber = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().regex(CLIENT_NUMBER_PATTERN, { error: 'INVALID_CLIENT_NUMBER' }));
const takeQueryValue = z.preprocess((value: unknown) => {
  if (typeof value !== 'string')
    return value;
  if (!/^\d+$/.test(value))
    return Number.NaN;
  return Number(value);
}, z.number().int().min(1).max(PAGE_SIZE.max));
export const pageQuery = z
  .object({
    take: takeQueryValue.default(PAGE_SIZE.default),
    cursorId: uuid.optional(),
  })
  .strict();
export function addStableIssue(context: z.RefinementCtx, code: string, path: (string | number)[]): void {
  context.addIssue({
    code: 'custom',
    message: code,
    path,
    params: { stableCode: code },
  });
}
// Explicit schema codes only: ordinary messages and submitted values are not codes.
const STABLE_ISSUE_CODES: ReadonlySet<string> = new Set([
  'INVALID_UUID', 'INVALID_MONEY', 'MONEY_MUST_BE_POSITIVE',
  'CONTROL_CHARACTER', 'REASON_TOO_SHORT', 'REASON_TOO_LONG', 'NOTE_TOO_LONG',
  'INVALID_CLIENT_NUMBER', 'BUSINESS_NAME_REQUIRED', 'BUSINESS_NAME_TOO_LONG',
  'INVALID_JOIN_CODE', 'AMOUNT_EXCEEDS_MAX', 'REFERENCE_RATE_EXCEEDS_MAX',
  'INVALID_DENOMINATION', 'DUPLICATE_COUNT_LINE', 'INVALID_DATE_RANGE',
  'BUSINESS_AMOUNT_MUST_BE_POSITIVE', 'DISCOUNT_EXCEEDS_DUE',
  'CLIENT_NUMBER_REQUIRED', 'EDIT_FIELD_REQUIRED', 'PAYMENT_NOT_ALLOWED_FOR_PENDING_SALE',
]);
export function getStableIssueCode(issue: z.core.$ZodIssue): string {
  const stableCode = 'params' in issue ? issue.params?.['stableCode'] : undefined;
  if (typeof stableCode === 'string' && STABLE_ISSUE_CODES.has(stableCode)) return stableCode;
  return STABLE_ISSUE_CODES.has(issue.message) ? issue.message : issue.code;
}
export type PageQueryInput = z.input<typeof pageQuery>;
export type PageQuery = z.infer<typeof pageQuery>;
