import type { PaymentMethod } from './config';
import { isCurrencyDifferenceBalanced, parseMoney, type MoneyLike } from './money';
export interface DeliveryOrder {
  totalCollectedUsd: MoneyLike;
  totalCollectedLbp: MoneyLike;
  changeGivenUsd: MoneyLike;
  changeGivenLbp: MoneyLike;
  method: PaymentMethod;
}
export type DeliveryConfirmation = DeliveryOrder;
export function computeDeliveryFlags(
  order: DeliveryOrder,
  confirmation: DeliveryConfirmation,
  referenceRate?: MoneyLike,
): { amountDiffers: boolean } {
  const plannedUsd = parseMoney(order.totalCollectedUsd).minus(parseMoney(order.changeGivenUsd));
  const plannedLbp = parseMoney(order.totalCollectedLbp).minus(parseMoney(order.changeGivenLbp));
  const actualUsd = parseMoney(confirmation.totalCollectedUsd).minus(parseMoney(confirmation.changeGivenUsd));
  const actualLbp = parseMoney(confirmation.totalCollectedLbp).minus(parseMoney(confirmation.changeGivenLbp));
  const usdDifference = plannedUsd.minus(actualUsd);
  const lbpDifference = plannedLbp.minus(actualLbp);
  let amountsDiffer: boolean;
  if (referenceRate === undefined) {
    amountsDiffer = !usdDifference.isZero() || !lbpDifference.isZero();
  }
  else {
    amountsDiffer = !isCurrencyDifferenceBalanced(usdDifference, lbpDifference, referenceRate);
  }
  return {
    amountDiffers:
      amountsDiffer ||
      order.method !== confirmation.method,
  };
}
