import type { Currency } from './config';
import { add, compare, D, MoneyError, parseMoney, sub, toMoneyString, type MoneyLike } from './money';

export interface SaleBalanceInput {
  currency: Currency;
  businessAmount: MoneyLike;
  deliveryFee: MoneyLike;
  tip?: MoneyLike | null;
  discount?: MoneyLike | null;
  totalCollected: MoneyLike;
  changeGiven?: MoneyLike | null;
  changeCurrency?: Currency | null;
}

export interface SaleBalanceResult {
  balanced: boolean;
  due: string;
  effectiveChange: string;
  expectedCollected: string;
  difference: string;
  mixedChange: boolean;
}

export function assertDiscountWithinDue(due: MoneyLike): void {
  if (compare(due, '0') < 0) throw new MoneyError('NEGATIVE_DUE');
}

export function checkSaleBalance(input: SaleBalanceInput): SaleBalanceResult {
  const due = sub(
    add(add(input.businessAmount, input.deliveryFee), input.tip ?? '0'),
    input.discount ?? '0',
  );
  assertDiscountWithinDue(due);

  const mixedChange =
    input.changeGiven != null &&
    input.changeCurrency != null &&
    input.changeCurrency !== input.currency;
  const effectiveChange =
    input.changeGiven != null && input.changeCurrency === input.currency
      ? parseMoney(input.changeGiven)
      : new D(0);
  const expectedCollected = parseMoney(input.totalCollected).minus(effectiveChange);
  const difference = expectedCollected.minus(due);
  return {
    balanced: difference.isZero(),
    due: toMoneyString(due),
    effectiveChange: toMoneyString(effectiveChange),
    expectedCollected: toMoneyString(expectedCollected),
    difference: difference.toFixed(2),
    mixedChange,
  };
}
