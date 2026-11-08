import type { PaymentMethod } from './config';
import { compare, type MoneyLike } from './money';
export interface DeliveryOrder {
  totalCollectedUsd: MoneyLike;
  totalCollectedLbp: MoneyLike;
  method: PaymentMethod;
}
export type DeliveryConfirmation = DeliveryOrder;
export function computeDeliveryFlags(order: DeliveryOrder, confirmation: DeliveryConfirmation): { amountDiffers: boolean } {
  return {
    amountDiffers:
      compare(order.totalCollectedUsd, confirmation.totalCollectedUsd) !== 0 ||
      compare(order.totalCollectedLbp, confirmation.totalCollectedLbp) !== 0 ||
      order.method !== confirmation.method,
  };
}
