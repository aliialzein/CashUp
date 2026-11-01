import type { Currency, PaymentMethod } from './config';
import { compare, type MoneyLike } from './money';

export interface DeliveryOrder {
  totalCollected: MoneyLike;
  currency: Currency;
  method: PaymentMethod;
}

export interface DeliveryConfirmation {
  totalCollected: MoneyLike;
  currency: Currency;
  method: PaymentMethod;
  changeGiven?: MoneyLike | null;
  changeCurrency?: Currency | null;
}

export function computeDeliveryFlags(
  order: DeliveryOrder,
  confirmation: DeliveryConfirmation,
): { amountDiffers: boolean; mixedChange: boolean } {
  return {
    amountDiffers:
      compare(order.totalCollected, confirmation.totalCollected) !== 0 ||
      order.currency !== confirmation.currency ||
      order.method !== confirmation.method,
    mixedChange:
      confirmation.changeGiven != null &&
      confirmation.changeCurrency != null &&
      confirmation.changeCurrency !== confirmation.currency,
  };
}
