import { computeDeliveryFlags } from '../../../src/domain/money/delivery';
const order = { totalCollectedUsd: '10', totalCollectedLbp: '0', method: 'CASH' as const };
it('compares both collected amounts and the single payment method', () => {
    expect(computeDeliveryFlags(order, order)).toEqual({ amountDiffers: false });
    expect(computeDeliveryFlags(order, { ...order, totalCollectedUsd: '11' }).amountDiffers).toBe(true);
    expect(computeDeliveryFlags(order, { ...order, totalCollectedLbp: '1000' }).amountDiffers).toBe(true);
    expect(computeDeliveryFlags(order, { ...order, method: 'WHISH' }).amountDiffers).toBe(true);
});
