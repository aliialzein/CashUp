import { add, compare, isCurrencyDifferenceBalanced, MoneyError, parseMoney, sub, toMoneyString, type MoneyLike } from './money';
export interface SaleBalanceInput {
  businessAmountUsd: MoneyLike;
  businessAmountLbp: MoneyLike;
  deliveryFeeUsd: MoneyLike;
  deliveryFeeLbp: MoneyLike;
  tipUsd: MoneyLike;
  tipLbp: MoneyLike;
  discountUsd: MoneyLike;
  discountLbp: MoneyLike;
  totalCollectedUsd: MoneyLike;
  totalCollectedLbp: MoneyLike;
  changeGivenUsd: MoneyLike;
  changeGivenLbp: MoneyLike;
}
export function assertDiscountWithinDue(due: MoneyLike): void {
  if (compare(due, '0') < 0) throw new MoneyError('NEGATIVE_DUE');
}
export function checkSaleBalance(input: SaleBalanceInput, referenceRate?: MoneyLike) {
  const calculate = (suffix: 'Usd' | 'Lbp') => {
    const due = sub(add(add(input[`businessAmount${suffix}`], input[`deliveryFee${suffix}`]), input[`tip${suffix}`]), input[`discount${suffix}`]);
    assertDiscountWithinDue(due);
    const change = parseMoney(input[`changeGiven${suffix}`]);
    const collected = parseMoney(input[`totalCollected${suffix}`]).minus(change);
    const difference = collected.minus(due);
    return {
      balanced: difference.isZero(),
      due: toMoneyString(due),
      effectiveChange: toMoneyString(change),
      expectedCollected: toMoneyString(collected),
      difference: difference.toFixed(2)
    };
  };
  const USD = calculate('Usd');
  const LBP = calculate('Lbp');
  const usdDifference = parseMoney(input.totalCollectedUsd)
    .minus(parseMoney(input.changeGivenUsd))
    .minus(parseMoney(USD.due));
  const lbpDifference = parseMoney(input.totalCollectedLbp)
    .minus(parseMoney(input.changeGivenLbp))
    .minus(parseMoney(LBP.due));
  const usdSign = usdDifference.comparedTo(0);
  const lbpSign = lbpDifference.comparedTo(0);
  const requiresReferenceRate =
    (usdSign > 0 && lbpSign < 0) ||
    (usdSign < 0 && lbpSign > 0);
  if (referenceRate === undefined) {
    return {
      balanced: USD.balanced && LBP.balanced,
      requiresReferenceRate,
      USD,
      LBP,
    };
  }
  return {
    balanced: isCurrencyDifferenceBalanced(usdDifference, lbpDifference, referenceRate),
    requiresReferenceRate: false,
    USD,
    LBP,
  };
}
