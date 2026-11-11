import { computeDeliveryFlags } from '../../../src/domain/money/delivery';
import { MoneyError } from '../../../src/domain/money/money';
const order = {
    totalCollectedUsd: '10',
    totalCollectedLbp: '0',
    changeGivenUsd: '0',
    changeGivenLbp: '0',
    method: 'CASH' as const,
};
it('compares both collected amounts and the single payment method', () => {
    expect(computeDeliveryFlags(order, order)).toEqual({ amountDiffers: false });
    expect(computeDeliveryFlags(order, { ...order, totalCollectedUsd: '11' }).amountDiffers).toBe(true);
    expect(computeDeliveryFlags(order, { ...order, totalCollectedLbp: '1000' }).amountDiffers).toBe(true);
    expect(computeDeliveryFlags(order, { ...order, method: 'WHISH' }).amountDiffers).toBe(true);
});
it('compares collected value at the reference rate without weakening method flags', () => {
    const planned = {
        totalCollectedUsd: '20',
        totalCollectedLbp: '0',
        changeGivenUsd: '8',
        changeGivenLbp: '0',
        method: 'CASH' as const,
    };
    const equivalent = {
        totalCollectedUsd: '0',
        totalCollectedLbp: '1790000',
        changeGivenUsd: '0',
        changeGivenLbp: '716000',
        method: 'CASH' as const,
    };
    expect(computeDeliveryFlags(planned, equivalent, '89500')).toEqual({ amountDiffers: false });
    expect(computeDeliveryFlags(planned, { ...equivalent, method: 'WHISH' }, '89500')).toEqual({ amountDiffers: true });
    expect(computeDeliveryFlags(planned, {
        ...equivalent,
        changeGivenLbp: '700000',
    }, '89500')).toEqual({ amountDiffers: true });
    expect(computeDeliveryFlags(planned, equivalent)).toEqual({ amountDiffers: true });
});
it('uses exact Decimal equivalence without implicit cent rounding', () => {
    expect(computeDeliveryFlags(
        { totalCollectedUsd: '0.01', totalCollectedLbp: '0', changeGivenUsd: '0', changeGivenLbp: '0', method: 'CASH' },
        { totalCollectedUsd: '0', totalCollectedLbp: '895', changeGivenUsd: '0', changeGivenLbp: '0', method: 'CASH' },
        '89500.5',
    )).toEqual({ amountDiffers: true });
    expect(() => computeDeliveryFlags(order, order, '0')).toThrow(MoneyError);
});
