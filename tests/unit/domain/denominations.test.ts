import { DENOMINATIONS } from '../../../src/domain/money/config';
import { countDenominations } from '../../../src/domain/money/cash-up-totals';
import { toMoneyString } from '../../../src/domain/money/money';
import { saveCountLinesSchema } from '../../../src/modules/cash-ups/cash-ups.validation';
import { toValidationError } from '../../../src/shared/validation/errors';

it('keeps the exact required USD denominations and order', () => {
  expect(DENOMINATIONS.USD).toEqual(['0.10', '1', '5', '10', '20', '50', '100']);
});
it('keeps the existing LBP denominations unchanged', () => {
  expect(DENOMINATIONS.LBP).toEqual(['1000', '5000', '10000', '20000', '50000', '100000']);
});
it('accepts a USD dime count and rejects new USD two-dollar count submissions', () => {
  expect(saveCountLinesSchema.parse({ lines: [{ currency: 'USD', denomination: '0.10', quantity: 3 }] })).toEqual({
    lines: [{ currency: 'USD', denomination: '0.10', quantity: 3 }],
  });
  const rejected = saveCountLinesSchema.safeParse({ lines: [{ currency: 'USD', denomination: '2', quantity: 3 }] });
  expect(rejected.success).toBe(false);
  expect(toValidationError(rejected.error!)).toEqual({ code: 'VALIDATION_ERROR', issues: [{ path: ['lines', '0', 'denomination'], code: 'INVALID_DENOMINATION' }] });
});
it('validates every denomination from the shared definition for both currencies', () => {
  const lines = (['USD', 'LBP'] as const).flatMap(currency => DENOMINATIONS[currency].map(denomination => ({ currency, denomination, quantity: 1 })));
  expect(saveCountLinesSchema.parse({ lines }).lines).toEqual(lines.map(line => ({ ...line, denomination: toMoneyString(line.denomination) })));
});
it('counts three USD dimes as exactly 0.30 using the existing decimal counting utility', () => {
  const input = saveCountLinesSchema.parse({ lines: [{ currency: 'USD', denomination: '0.10', quantity: 3 }] });
  expect(countDenominations(input.lines)).toEqual({ USD: '0.30', LBP: '0.00' });
});
