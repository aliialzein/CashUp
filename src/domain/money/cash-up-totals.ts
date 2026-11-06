import type { Currency, PaymentMethod, WalletMethod } from './config';
import { add, D, parseMoney, toMoneyString, type MoneyLike } from './money';

export interface SaleTotalsRowInput {
  currency: Currency;
  method: PaymentMethod;
  count: number;
  businessAmount: MoneyLike;
  deliveryFee: MoneyLike;
  totalCollected: MoneyLike;
  tip: MoneyLike;
  discount: MoneyLike;
  changeGiven?: MoneyLike | null;
  changeCurrency?: Currency | null;
}

export interface ChangeTotalsRowInput {
  currency: Currency;
  total: MoneyLike;
}

export interface CashOutTotalsRowInput {
  currency: Currency;
  total: MoneyLike;
  status?: 'ACTIVE' | 'CANCELLED';
}

export interface CurrencySalesSummary {
  businessAmount: string;
  deliveryFees: string;
  totalCollected: string;
  tips: string;
  discounts: string;
  changeGiven: string;
}

export interface ExpectedGap {
  expected: string;
  counted: string;
  gap: string;
  direction: 'SHORT' | 'OVER' | 'EVEN';
  display: string;
}

export type CurrencyValues = Record<Currency, string>;

const zeroAmounts = (): CurrencyValues => ({ USD: '0.00', LBP: '0.00' });

export function summarizeSales(
  rows: readonly SaleTotalsRowInput[],
  changeRows: readonly ChangeTotalsRowInput[] = [],
): Record<Currency, CurrencySalesSummary> {
  const totals = {
    USD: { businessAmount: new D(0), deliveryFees: new D(0), totalCollected: new D(0), tips: new D(0), discounts: new D(0), changeGiven: new D(0) },
    LBP: { businessAmount: new D(0), deliveryFees: new D(0), totalCollected: new D(0), tips: new D(0), discounts: new D(0), changeGiven: new D(0) },
  };
  for (const row of rows) {
    totals[row.currency].businessAmount = add(
      totals[row.currency].businessAmount.toString(),
      row.businessAmount,
    );
    totals[row.currency].deliveryFees = add(
      totals[row.currency].deliveryFees.toString(),
      row.deliveryFee,
    );
    totals[row.currency].totalCollected = add(
      totals[row.currency].totalCollected.toString(),
      row.totalCollected,
    );
    totals[row.currency].tips = add(totals[row.currency].tips.toString(), row.tip);
    totals[row.currency].discounts = add(totals[row.currency].discounts.toString(), row.discount);
    if (row.changeGiven != null && row.changeCurrency != null) {
      totals[row.changeCurrency].changeGiven = add(
        totals[row.changeCurrency].changeGiven.toString(),
        row.changeGiven,
      );
    }
  }
  for (const row of changeRows) {
    totals[row.currency].changeGiven = add(totals[row.currency].changeGiven.toString(), row.total);
  }
  const summarizeCurrency = (currency: Currency): CurrencySalesSummary => ({
    businessAmount: toMoneyString(totals[currency].businessAmount.toString()),
    deliveryFees: toMoneyString(totals[currency].deliveryFees.toString()),
    totalCollected: toMoneyString(totals[currency].totalCollected.toString()),
    tips: toMoneyString(totals[currency].tips.toString()),
    discounts: toMoneyString(totals[currency].discounts.toString()),
    changeGiven: toMoneyString(totals[currency].changeGiven.toString()),
  });
  return { USD: summarizeCurrency('USD'), LBP: summarizeCurrency('LBP') };
}

export function walletTotals(
  rows: readonly SaleTotalsRowInput[],
): Record<WalletMethod, CurrencyValues> {
  const totals: Record<WalletMethod, CurrencyValues> = {
    WHISH: zeroAmounts(),
    OMT: zeroAmounts(),
  };
  for (const row of rows) {
    if (row.method === 'CASH') continue;
    totals[row.method][row.currency] = toMoneyString(
      add(totals[row.method][row.currency], row.totalCollected).toString(),
    );
  }
  return totals;
}

export interface ComputeExpectedAndGapInput {
  floatUsd: MoneyLike;
  floatLbp: MoneyLike;
  sales: readonly SaleTotalsRowInput[];
  change: readonly ChangeTotalsRowInput[];
  cashOuts: readonly CashOutTotalsRowInput[];
  counted: Record<Currency, MoneyLike>;
}

export function computeExpectedAndGap(
  input: ComputeExpectedAndGapInput,
): Record<Currency, ExpectedGap> {
  const expected = {
    USD: parseMoney(input.floatUsd),
    LBP: parseMoney(input.floatLbp),
  };
  for (const row of input.sales) {
    if (row.method === 'CASH') {
      expected[row.currency] = expected[row.currency].plus(parseMoney(row.totalCollected));
    }
  }
  for (const row of input.change) {
    expected[row.currency] = expected[row.currency].minus(parseMoney(row.total));
  }
  for (const row of input.cashOuts) {
    if (row.status === 'CANCELLED') continue;
    expected[row.currency] = expected[row.currency].minus(parseMoney(row.total));
  }

  return {
    USD: buildExpectedGap(expected.USD, input.counted.USD),
    LBP: buildExpectedGap(expected.LBP, input.counted.LBP),
  };
}

function buildExpectedGap(expected: InstanceType<typeof D>, counted: MoneyLike): ExpectedGap {
  const difference = parseMoney(counted).minus(expected);
  const comparison = difference.comparedTo(0);
  const direction = comparison < 0 ? 'SHORT' : comparison > 0 ? 'OVER' : 'EVEN';
  const gap = difference.toFixed(2);
  const display = comparison > 0 ? `+${gap}` : gap;
  return {
    expected: toMoneyString(expected),
    counted: toMoneyString(counted),
    gap,
    direction,
    display,
  };
}

export type SubmitSnapshotInput = ComputeExpectedAndGapInput;

export function buildSubmitSnapshot(input: SubmitSnapshotInput): {
  expectedUsd: string;
  expectedLbp: string;
  countedUsd: string;
  countedLbp: string;
  gapUsd: string;
  gapLbp: string;
} {
  const result = computeExpectedAndGap(input);
  return {
    expectedUsd: result.USD.expected,
    expectedLbp: result.LBP.expected,
    countedUsd: result.USD.counted,
    countedLbp: result.LBP.counted,
    gapUsd: result.USD.gap,
    gapLbp: result.LBP.gap,
  };
}
