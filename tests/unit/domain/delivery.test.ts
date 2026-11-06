import { computeDeliveryFlags } from '../../../src/domain/money/delivery';

describe('computeDeliveryFlags', () => {
  const order = {
    totalCollected: '10.00',
    currency: 'USD' as const,
    method: 'CASH' as const,
  };

  it('marks a confirmed amount difference', () => {
    expect(
      computeDeliveryFlags(order, { ...order, totalCollected: '10.01' }).amountDiffers,
    ).toBe(true);
  });

  it('marks a confirmed currency difference', () => {
    expect(
      computeDeliveryFlags(order, { ...order, currency: 'LBP' }).amountDiffers,
    ).toBe(true);
  });

  it('marks a confirmed payment-method difference', () => {
    expect(
      computeDeliveryFlags(order, { ...order, method: 'WHISH' }).amountDiffers,
    ).toBe(true);
  });

  it('does not mark unchanged details and detects mixed-currency change', () => {
    expect(computeDeliveryFlags(order, order)).toEqual({
      amountDiffers: false,
      mixedChange: false,
    });
    expect(
      computeDeliveryFlags(order, {
        ...order,
        changeGiven: '1.00',
        changeCurrency: 'LBP',
      }),
    ).toEqual({ amountDiffers: false, mixedChange: true });
  });
});
