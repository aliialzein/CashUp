import {
  D,
  MoneyError,
  add,
  compare,
  isNegative,
  isZero,
  parseMoney,
  sub,
  sum,
  toMoneyString,
} from '../../../src/domain/money';

describe('money primitives', () => {
  it('uses exact decimal arithmetic and formats without rounding', () => {
    expect(toMoneyString(add('0.1', '0.2').toString())).toBe('0.30');
    expect(toMoneyString(add('9999999999999999.98', '0.01'))).toBe(
      '9999999999999999.99',
    );
    expect(toMoneyString(sub('10.00', '0.01').toString())).toBe('9.99');
    expect(toMoneyString(sum(['0.1', '0.2']).toString())).toBe('0.30');
    expect(toMoneyString(sum([]).toString())).toBe('0.00');
    expect(compare('1.00', '1')).toBe(0);
    expect(compare('0.99', '1')).toBe(-1);
    expect(compare('1.01', '1')).toBe(1);
    expect(isZero('0.00')).toBe(true);
    expect(isZero('0.01')).toBe(false);
    expect(isNegative(new D(-1))).toBe(true);
    expect(isNegative('1')).toBe(false);
    expect(toMoneyString('10')).toBe('10.00');
    expect(toMoneyString('10.2')).toBe('10.20');
    expect(toMoneyString({ toString: () => '10.20' })).toBe('10.20');
    expect(parseMoney(new D('12.34')).toString()).toBe('12.34');
    expect(() => compare(new D(Number.NaN), '0')).toThrow(
      expect.objectContaining({ code: 'INVALID_MONEY' }),
    );
    expect(() => toMoneyString(new D('1.005'))).toThrow(
      expect.objectContaining({ code: 'PRECISION_EXCEEDED' }),
    );
  });

  it.each([
    '',
    ' 1',
    '1 ',
    '-1',
    '+1',
    '1e3',
    '1.234',
    '01',
    '.5',
    '1.',
    'NaN',
    'Infinity',
    '10000000000000000',
    1,
    null,
  ])('rejects invalid input %p with a typed error', (value) => {
    expect(() => parseMoney(value as string)).toThrow(MoneyError);
  });

  it('rejects precision beyond cents instead of rounding', () => {
    expect(() => toMoneyString('1.005')).toThrow(MoneyError);
    expect(() => toMoneyString('1.005')).toThrow(
      expect.objectContaining({ code: 'INVALID_MONEY' }),
    );
  });
});
