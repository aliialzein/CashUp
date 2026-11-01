import {
  buildSubmitSnapshot,
  computeExpectedAndGap,
  summarizeSales,
  walletTotals,
  type SaleTotalsRowInput,
} from '../../../src/domain/money';

const sales: SaleTotalsRowInput[] = [
  {
    currency: 'USD',
    method: 'CASH',
    count: 2,
    businessAmount: '18.00',
    deliveryFee: '2.00',
    totalCollected: '20.00',
    tip: '1.00',
    discount: '0.00',
  },
  {
    currency: 'USD',
    method: 'WHISH',
    count: 1,
    businessAmount: '5.00',
    deliveryFee: '0.00',
    totalCollected: '5.00',
    tip: '0.00',
    discount: '0.00',
  },
  {
    currency: 'LBP',
    method: 'CASH',
    count: 1,
    businessAmount: '20000.00',
    deliveryFee: '1000.00',
    totalCollected: '21000.00',
    tip: '0.00',
    discount: '0.00',
  },
  {
    currency: 'LBP',
    method: 'OMT',
    count: 1,
    businessAmount: '5000.00',
    deliveryFee: '0.00',
    totalCollected: '5000.00',
    tip: '0.00',
    discount: '0.00',
  },
];

describe('cash-up totals', () => {
  it('summarizes sales by currency and wallet without combining currencies', () => {
    expect(summarizeSales(sales, [{ currency: 'LBP', total: '500.00' }])).toEqual({
      USD: {
        businessAmount: '23.00',
        deliveryFees: '2.00',
        totalCollected: '25.00',
        tips: '1.00',
        discounts: '0.00',
        changeGiven: '0.00',
      },
      LBP: {
        businessAmount: '25000.00',
        deliveryFees: '1000.00',
        totalCollected: '26000.00',
        tips: '0.00',
        discounts: '0.00',
        changeGiven: '500.00',
      },
    });
    expect(walletTotals(sales)).toEqual({
      WHISH: { USD: '5.00', LBP: '0.00' },
      OMT: { USD: '0.00', LBP: '5000.00' },
    });
    const changeCases = [
      { ...sales[0], changeGiven: '1.00', changeCurrency: 'USD' as const },
      { ...sales[0], changeGiven: '2.00', changeCurrency: null },
      { ...sales[0], changeGiven: null, changeCurrency: 'USD' as const },
    ];
    expect(summarizeSales(changeCases).USD.changeGiven).toBe('1.00');
  });

  it('computes cash expected and gap separately with floats, change, cash-outs, and wallet exclusion', () => {
    const input = {
      floatUsd: '5.00',
      floatLbp: '1000.00',
      sales,
      change: [{ currency: 'USD' as const, total: '2.00' }],
      cashOuts: [{ currency: 'LBP' as const, total: '5000.00' }],
      counted: { USD: '23.00', LBP: '17000.00' },
    };
    expect(computeExpectedAndGap(input)).toEqual({
      USD: {
        expected: '23.00',
        counted: '23.00',
        gap: '0.00',
        direction: 'EVEN',
        display: '0.00',
      },
      LBP: {
        expected: '17000.00',
        counted: '17000.00',
        gap: '0.00',
        direction: 'EVEN',
        display: '0.00',
      },
    });
    expect(
      computeExpectedAndGap({
        ...input,
        counted: { USD: '13.00', LBP: '17010.00' },
      }),
    ).toMatchObject({
      USD: { direction: 'SHORT', display: '-10.00' },
      LBP: { direction: 'OVER', display: '+10.00' },
    });
  });

  it('formats all gap directions and builds only the persisted snapshot fields', () => {
    const snapshot = buildSubmitSnapshot({
      floatUsd: '0',
      floatLbp: '0',
      sales: [],
      change: [],
      cashOuts: [],
      counted: { USD: '0.01', LBP: '0' },
    });
    expect(snapshot).toEqual({
      expectedUsd: '0.00',
      expectedLbp: '0.00',
      countedUsd: '0.01',
      countedLbp: '0.00',
      gapUsd: '0.01',
      gapLbp: '0.00',
    });
    const details = computeExpectedAndGap({
      floatUsd: '10.00',
      floatLbp: '10.00',
      sales: [],
      change: [],
      cashOuts: [],
      counted: { USD: '0.00', LBP: '10.00' },
    });
    expect(details.USD).toMatchObject({ direction: 'SHORT', display: '-10.00' });
    expect(details.LBP).toMatchObject({ direction: 'EVEN', display: '0.00' });
    expect(Object.keys(details)).toEqual(['USD', 'LBP']);
    expect(JSON.stringify(details)).not.toMatch(/combined|total/i);
    expect(
      buildSubmitSnapshot({
        floatUsd: '0',
        floatLbp: '0',
        sales: [],
        change: [{ currency: 'USD', total: '1.00' }],
        cashOuts: [],
        counted: { USD: '0', LBP: '0' },
      }).expectedUsd,
    ).toBe('-1.00');
  });
});
