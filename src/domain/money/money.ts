import Decimal from 'decimal.js';
import { MONEY_PATTERN } from './config';

export const D = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
});

export type MoneyLike = string | { toString(): string };

export type MoneyErrorCode =
  | 'INVALID_MONEY'
  | 'PRECISION_EXCEEDED'
  | 'NEGATIVE_MONEY'
  | 'NEGATIVE_DUE';

export class MoneyError extends Error {
  constructor(readonly code: MoneyErrorCode) {
    super(code);
    this.name = 'MoneyError';
  }
}

export function parseMoney(value: MoneyLike): Decimal {
  if (typeof value !== 'string' && (typeof value !== 'object' || value === null)) {
    throw new MoneyError('INVALID_MONEY');
  }

  const text = typeof value === 'string' ? value : value.toString();
  if (!MONEY_PATTERN.test(text)) throw new MoneyError('INVALID_MONEY');

  return new D(text);
}

export function add(left: MoneyLike, right: MoneyLike): Decimal {
  return parseMoney(left).plus(parseMoney(right));
}

export function sub(left: MoneyLike, right: MoneyLike): Decimal {
  return parseMoney(left).minus(parseMoney(right));
}

export function compare(left: MoneyLike, right: MoneyLike): -1 | 0 | 1 {
  const result = parseArithmeticMoney(left).comparedTo(parseArithmeticMoney(right));
  if (result === null) throw new MoneyError('INVALID_MONEY');
  return result < 0 ? -1 : result > 0 ? 1 : 0;
}

export function isCurrencyDifferenceBalanced(
  usdDifference: InstanceType<typeof D>,
  lbpDifference: InstanceType<typeof D>,
  referenceRate: MoneyLike,
): boolean {
  const rate = parseMoney(referenceRate);
  if (rate.comparedTo(0) <= 0) throw new MoneyError('INVALID_MONEY');
  return usdDifference.mul(rate).plus(lbpDifference).isZero();
}

export function isZero(value: MoneyLike): boolean {
  return parseArithmeticMoney(value).isZero();
}

export function isNegative(value: MoneyLike): boolean {
  return parseArithmeticMoney(value).isNegative();
}

export function sum(values: readonly MoneyLike[]): Decimal {
  return values.reduce<Decimal>(
    (total, value) => total.plus(parseMoney(value)),
    new D(0),
  );
}

export function toMoneyString(value: MoneyLike): string {
  const decimal = parseArithmeticMoney(value);
  if (decimal.decimalPlaces() > 2) throw new MoneyError('PRECISION_EXCEEDED');
  return decimal.toFixed(2);
}

function parseArithmeticMoney(value: MoneyLike): Decimal {
  if (value instanceof D) {
    if (!value.isFinite()) throw new MoneyError('INVALID_MONEY');
    if (value.decimalPlaces() > 2) throw new MoneyError('PRECISION_EXCEEDED');
    return value;
  }
  return parseMoney(value);
}
