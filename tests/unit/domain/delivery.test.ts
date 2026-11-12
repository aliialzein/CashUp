import { computeDeliveryFlags, type DeliveryOrder } from '../../../src/domain/money/delivery';
import { MoneyError } from '../../../src/domain/money/money';
const order: DeliveryOrder = {
  businessAmountUsd: '10', businessAmountLbp: '0', deliveryFeeUsd: '2', deliveryFeeLbp: '0',
  tipUsd: '1', tipLbp: '0', discountUsd: '1', discountLbp: '0', method: null,
};
const paid = { totalCollectedUsd: '20', totalCollectedLbp: '0', changeGivenUsd: '8', changeGivenLbp: '0', method: 'CASH' as const };
it('compares net collection to final business + fee + tip - discount, including ordinary change', () => {
  expect(computeDeliveryFlags(order, paid)).toEqual({ amountDiffers: false });
  expect(computeDeliveryFlags(order, { ...paid, totalCollectedUsd: '21' }).amountDiffers).toBe(true);
  expect(computeDeliveryFlags(order, { ...paid, totalCollectedLbp: '1000' }).amountDiffers).toBe(true);
});
it('ignores payment-method changes, including historical expected methods', () => {
  expect(computeDeliveryFlags(order, { ...paid, method: 'WHISH' }).amountDiffers).toBe(false);
  expect(computeDeliveryFlags({ ...order, method: 'CASH' }, { ...paid, method: 'WHISH' }).amountDiffers).toBe(false);
});
it.each(['CASH', 'WHISH', 'OMT'] as const)('flags real financial differences paid by %s', method => {
  expect(computeDeliveryFlags({ ...order, method: 'CASH' }, { ...paid, method, totalCollectedUsd: '21' }).amountDiffers).toBe(true);
});
it('compares both currency movements exactly at the cash-up reference rate', () => {
  const equivalent = { totalCollectedUsd: '0', totalCollectedLbp: '1790000', changeGivenUsd: '0', changeGivenLbp: '716000', method: 'CASH' as const };
  expect(computeDeliveryFlags(order, equivalent, '89500').amountDiffers).toBe(false);
  expect(computeDeliveryFlags(order, { ...equivalent, changeGivenLbp: '700000' }, '89500').amountDiffers).toBe(true);
  expect(computeDeliveryFlags(order, equivalent).amountDiffers).toBe(true);
  expect(computeDeliveryFlags(order, { ...paid, changeGivenUsd: '5', changeGivenLbp: '268500' }, '89500').amountDiffers).toBe(false);
});
it('uses exact Decimal equivalence without implicit cent rounding', () => {
  expect(computeDeliveryFlags({ ...order, businessAmountUsd: '0.01', deliveryFeeUsd: '0', tipUsd: '0', discountUsd: '0' },
    { ...paid, totalCollectedUsd: '0', totalCollectedLbp: '895', changeGivenUsd: '0' }, '89500.5').amountDiffers).toBe(true);
  expect(() => computeDeliveryFlags(order, paid, '0')).toThrow(MoneyError);
});
