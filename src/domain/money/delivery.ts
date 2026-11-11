import type { PaymentMethod } from './config';
import type { MoneyLike } from './money';
import { checkSaleBalance, type SaleBalanceInput } from './sale-balance';
type PaymentFields = 'totalCollectedUsd' | 'totalCollectedLbp' | 'changeGivenUsd' | 'changeGivenLbp';
export type DeliveryOrder = Omit<SaleBalanceInput, PaymentFields> & { method: PaymentMethod | null };
export type DeliveryConfirmation = Pick<SaleBalanceInput, PaymentFields> & { method: PaymentMethod };
export function computeDeliveryFlags(
  order: DeliveryOrder,
  confirmation: DeliveryConfirmation,
  referenceRate?: MoneyLike,
): { amountDiffers: boolean } {
  const balance = checkSaleBalance({ ...order, ...confirmation }, referenceRate);
  return {
    amountDiffers: !balance.balanced || (order.method !== null && order.method !== confirmation.method),
  };
}
