import { z } from 'zod';
import { addStableIssue, clientNumber, getStableIssueCode, moneyString, reason } from '../../../src/shared/validation/common';
import { toValidationError, type ValidationError } from '../../../src/shared/validation/errors';
import { saveCountLinesSchema } from '../../../src/modules/cash-ups/cash-ups.validation';
import { createCashOutSchema } from '../../../src/modules/cash-outs/cash-outs.validation';
import { listSalesQuerySchema } from '../../../src/modules/sales/sales.validation';

it.each([
  [moneyString, 'not money', 'INVALID_MONEY', 'invalid_format'],
  [reason, 'x', 'REASON_TOO_SHORT', 'custom'],
  [clientNumber, 'not a number', 'INVALID_CLIENT_NUMBER', 'invalid_format'],
] as const)('preserves registered schema code %s for invalid input', (schema, input, expected, generic) => {
  const parsed = schema.safeParse(input);
  expect(parsed.success).toBe(false);
  const error = parsed.error!;
  expect(error.issues[0].code).toBe(generic);
  expect(getStableIssueCode(error.issues[0])).toBe(expected);
  expect(toValidationError(error)).toEqual({ code: 'VALIDATION_ERROR', issues: [{ path: [], code: expected }] });
});
it('prefers registered structured metadata over another registered message', () => {
  const schema = z.string().superRefine((_value, context) => {
    context.addIssue({ code: 'custom', message: 'INVALID_MONEY', params: { stableCode: 'AMOUNT_EXCEEDS_MAX' } });
  });
  const error = schema.safeParse('private input').error!;
  expect(getStableIssueCode(error.issues[0])).toBe('AMOUNT_EXCEEDS_MAX');
  expect(toValidationError(error).issues).toEqual([{ path: [], code: 'AMOUNT_EXCEEDS_MAX' }]);
});
it('preserves addStableIssue metadata and nested string/index paths', () => {
  const schema = z.object({ orders: z.array(z.object({ amount: z.string().superRefine((_value, context) => {
    addStableIssue(context, 'AMOUNT_EXCEEDS_MAX', []);
  }) })) });
  const error = schema.safeParse({ orders: [{ amount: 'private input' }] }).error!;
  expect(error.issues[0]).toMatchObject({ path: ['orders', 0, 'amount'], params: { stableCode: 'AMOUNT_EXCEEDS_MAX' } });
  expect(toValidationError(error)).toEqual({ code: 'VALIDATION_ERROR', issues: [{ path: ['orders', '0', 'amount'], code: 'AMOUNT_EXCEEDS_MAX' }] });
});
it.each(['private input', 'UNREGISTERED_APPLICATION_CODE', ' INVALID_MONEY', 'INVALID_MONEY extra', 'invalid_money', 'constructor', '__proto__'])('does not trust unknown issue message %s', message => {
  const schema = z.string().superRefine((_input, context) => context.addIssue({ code: 'custom', message }));
  const error = schema.safeParse('private input').error!;
  expect(getStableIssueCode(error.issues[0])).toBe('custom');
  expect(toValidationError(error)).toEqual({ code: 'VALIDATION_ERROR', issues: [{ path: [], code: 'custom' }] });
});
it('does not promote user input or unknown structured metadata into a code', () => {
  const schema = z.string().superRefine((value, context) => context.addIssue({ code: 'custom', message: value, params: { stableCode: value } }));
  const error = schema.safeParse('submitted private text').error!;
  expect(toValidationError(error)).toEqual({ code: 'VALIDATION_ERROR', issues: [{ path: [], code: 'custom' }] });
  expect(JSON.stringify(toValidationError(error))).not.toContain('submitted private text');
});
it('ignores malformed structured metadata and safely uses a registered message', () => {
  for (const stableCode of [null, 7, { toString: () => 'INVALID_MONEY' }, 'UNREGISTERED_APPLICATION_CODE']) {
    const error = new z.ZodError([{ code: 'custom', message: 'INVALID_MONEY', path: [], params: { stableCode } }]);
    expect(getStableIssueCode(error.issues[0])).toBe('INVALID_MONEY');
  }
});
it('keeps ordinary Zod codes and field paths without emitting messages or input', () => {
  const schema = z.object({ amount: z.string(), quantity: z.number().min(1) });
  const error = schema.safeParse({ amount: 123, quantity: 0 }).error!;
  expect(toValidationError(error)).toEqual({ code: 'VALIDATION_ERROR', issues: [
    { path: ['amount'], code: 'invalid_type' }, { path: ['quantity'], code: 'too_small' },
  ] });
});
it('preserves the registered client-number code in the actual sales query schema', () => {
  const error = listSalesQuerySchema.safeParse({ clientNumber: '+not-a-number' }).error!;
  expect(toValidationError(error)).toEqual({ code: 'VALIDATION_ERROR', issues: [{ path: ['clientNumber'], code: 'INVALID_CLIENT_NUMBER' }] });
});
it('serializes actual schema errors into the unchanged frontend-consumable backend contract', () => {
  const schema = z.object({ cashOuts: z.array(createCashOutSchema) });
  const error = schema.safeParse({ cashOuts: [{ amountUsd: 'private value', reason: 'x' }] }).error!;
  const json = JSON.stringify(toValidationError(error));
  const frontendResult: ValidationError = JSON.parse(json);
  expect(frontendResult).toEqual({ code: 'VALIDATION_ERROR', issues: [
    { path: ['cashOuts', '0', 'amountUsd'], code: 'INVALID_MONEY' },
    { path: ['cashOuts', '0', 'reason'], code: 'REASON_TOO_SHORT' },
  ] });
  expect(frontendResult.issues.find(issue => issue.path.join('.') === 'cashOuts.0.amountUsd')?.code).toBe('INVALID_MONEY');
  expect(json).not.toContain('private value');
  expect(json).not.toContain('message');
});
it('retains real structured nested count-line errors', () => {
  const error = saveCountLinesSchema.safeParse({ lines: [
    { currency: 'USD', denomination: '5', quantity: 1 },
    { currency: 'USD', denomination: '5', quantity: 2 },
  ] }).error!;
  expect(toValidationError(error)).toEqual({ code: 'VALIDATION_ERROR', issues: [{ path: ['lines', '1', 'denomination'], code: 'DUPLICATE_COUNT_LINE' }] });
});
