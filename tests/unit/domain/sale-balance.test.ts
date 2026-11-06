import {
  D,
  MoneyError,
  assertDiscountWithinDue,
  checkSaleBalance,
  computeDeliveryFlags,
} from '../../../src/domain/money';

const baseSale = {
  currency: 'USD' as const,
  businessAmount: '10.00',
  deliveryFee: '2.00',
  totalCollected: '12.00',
};

describe('sale balance', () => {
  it('balances exact amounts, tips, discounts, and tolerates a one-cent difference', () => {
    expect(checkSaleBalance(baseSale)).toMatchObject({
      balanced: true,
      due: '12.00',
      expectedCollected: '12.00',
      difference: '0.00',
    });
    expect(
      checkSaleBalance({ ...baseSale, tip: '1.00', totalCollected: '13.00' }).balanced,
    ).toBe(true);
    expect(
      checkSaleBalance({ ...baseSale, discount: '2.00', totalCollected: '10.00' }).balanced,
    ).toBe(true);
    expect(
      checkSaleBalance({ ...baseSale, totalCollected: '11.99' }).difference,
    ).toBe('-0.01');
    expect(
      checkSaleBalance({ ...baseSale, totalCollected: '12.01' }).difference,
    ).toBe('0.01');
  });

  it('rejects a discount larger than the amount due before discount', () => {
    expect(() =>
      checkSaleBalance({ ...baseSale, discount: '13.00' }),
    ).toThrow(expect.objectContaining({ code: 'NEGATIVE_DUE' }));
    expect(() => assertDiscountWithinDue(new D('-0.01'))).toThrow(MoneyError);
    expect(() => assertDiscountWithinDue('0.00')).not.toThrow();
  });

  it('subtracts change only in the sale currency and identifies mixed-currency change', () => {
    expect(
      checkSaleBalance({
        ...baseSale,
        totalCollected: '13.00',
        changeGiven: '1.00',
        changeCurrency: 'USD',
      }),
    ).toMatchObject({ balanced: true, effectiveChange: '1.00', mixedChange: false });
    expect(
      checkSaleBalance({
        ...baseSale,
        totalCollected: '12.00',
        changeGiven: '1000.00',
        changeCurrency: 'LBP',
      }),
    ).toMatchObject({ balanced: true, effectiveChange: '0.00', mixedChange: true });
  });

  it('handles large LBP amounts and orders without change', () => {
    expect(
      checkSaleBalance({
        currency: 'LBP',
        businessAmount: '99999999999.99',
        deliveryFee: '0.01',
        totalCollected: '100000000000.00',
      }).balanced,
    ).toBe(true);
    expect(checkSaleBalance(baseSale).mixedChange).toBe(false);
    expect(
      checkSaleBalance({ ...baseSale, changeGiven: '1.00' }).mixedChange,
    ).toBe(false);
    expect(
      computeDeliveryFlags(
        { totalCollected: '10.00', currency: 'USD', method: 'CASH' },
        {
          totalCollected: '10.00',
          currency: 'USD',
          method: 'CASH',
          changeGiven: '1.00',
        },
      ).mixedChange,
    ).toBe(false);
  });
});

describe('delivery flags', () => {
  const order = { totalCollected: '10.00', currency: 'USD' as const, method: 'CASH' as const };

  it('reports unchanged and amount, currency, or method changes', () => {
    expect(computeDeliveryFlags(order, order)).toEqual({
      amountDiffers: false,
      mixedChange: false,
    });
    expect(
      computeDeliveryFlags(order, { ...order, totalCollected: '11.00' }).amountDiffers,
    ).toBe(true);
    expect(
      computeDeliveryFlags(order, { ...order, currency: 'LBP' }).amountDiffers,
    ).toBe(true);
    expect(
      computeDeliveryFlags(order, { ...order, method: 'WHISH' }).amountDiffers,
    ).toBe(true);
    expect(
      computeDeliveryFlags(order, {
        ...order,
        changeGiven: '1.00',
        changeCurrency: 'LBP',
      }).mixedChange,
    ).toBe(true);
  });
});
