import { add, compare, MoneyError, parseMoney, sub, toMoneyString, type MoneyLike } from './money';
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
export function checkSaleBalance(input: SaleBalanceInput) {
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
  return { balanced: USD.balanced && LBP.balanced, USD, LBP };
}
