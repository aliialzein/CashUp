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
export function summarizeSales(rows: readonly SaleTotalsRowInput[], changeRows: readonly ChangeTotalsRowInput[] = []): Record<Currency, CurrencySalesSummary> {
  const totals = {
    USD: { businessAmount: new D(0), deliveryFees: new D(0), totalCollected: new D(0), tips: new D(0), discounts: new D(0), changeGiven: new D(0) },
    LBP: { businessAmount: new D(0), deliveryFees: new D(0), totalCollected: new D(0), tips: new D(0), discounts: new D(0), changeGiven: new D(0) },
  };
  for (const row of rows) {
    totals[row.currency].businessAmount = add(totals[row.currency].businessAmount.toString(), row.businessAmount);
    totals[row.currency].deliveryFees = add(totals[row.currency].deliveryFees.toString(), row.deliveryFee);
    totals[row.currency].totalCollected = add(totals[row.currency].totalCollected.toString(), row.totalCollected);
    totals[row.currency].tips = add(totals[row.currency].tips.toString(), row.tip);
    totals[row.currency].discounts = add(totals[row.currency].discounts.toString(), row.discount);
    if (row.changeGiven != null && row.changeCurrency != null) {
      totals[row.changeCurrency].changeGiven = add(totals[row.changeCurrency].changeGiven.toString(), row.changeGiven);
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
export function walletTotals(rows: readonly SaleTotalsRowInput[]): Record<WalletMethod, CurrencyValues> {
  const totals: Record<WalletMethod, CurrencyValues> = {
    WHISH: zeroAmounts(),
    OMT: zeroAmounts(),
  };
  for (const row of rows) {
    if (row.method === 'CASH')
      continue;
    totals[row.method][row.currency] = toMoneyString(add(totals[row.method][row.currency], row.totalCollected).toString());
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
export interface CashLedgerInput {
  floatUsd: MoneyLike;
  floatLbp: MoneyLike;
  sales: readonly SaleTotalsRowInput[];
  change: readonly ChangeTotalsRowInput[];
  cashOuts: readonly CashOutTotalsRowInput[];
}
export interface CashLedger {
  floatUsd: string;
  floatLbp: string;
  receivedUsd: string;
  receivedLbp: string;
  changeGivenUsd: string;
  changeGivenLbp: string;
  cashOutsUsd: string;
  cashOutsLbp: string;
  expectedUsd: string;
  expectedLbp: string;
}
/** Physical cash only. Callers supply delivered sale/change rows; no conversion. */
export function buildCashLedger(input: CashLedgerInput): CashLedger {
  const received = { USD: new D(0), LBP: new D(0) };
  const change = { USD: new D(0), LBP: new D(0) };
  const cashOuts = { USD: new D(0), LBP: new D(0) };
  for (const row of input.sales) {
    if (row.method === 'CASH')
      received[row.currency] = received[row.currency].plus(parseMoney(row.totalCollected));
  }
  for (const row of input.change)
    change[row.currency] = change[row.currency].plus(parseMoney(row.total));
  for (const row of input.cashOuts) {
    if (row.status === 'CANCELLED')
      continue;
    cashOuts[row.currency] = cashOuts[row.currency].plus(parseMoney(row.total));
  }
  return {
    floatUsd: toMoneyString(input.floatUsd), floatLbp: toMoneyString(input.floatLbp),
    receivedUsd: toMoneyString(received.USD), receivedLbp: toMoneyString(received.LBP),
    changeGivenUsd: toMoneyString(change.USD), changeGivenLbp: toMoneyString(change.LBP),
    cashOutsUsd: toMoneyString(cashOuts.USD), cashOutsLbp: toMoneyString(cashOuts.LBP),
    expectedUsd: toMoneyString(parseMoney(input.floatUsd).plus(received.USD).minus(change.USD).minus(cashOuts.USD)),
    expectedLbp: toMoneyString(parseMoney(input.floatLbp).plus(received.LBP).minus(change.LBP).minus(cashOuts.LBP)),
  };
}
export function computeExpectedAndGap(input: ComputeExpectedAndGapInput): Record<Currency, ExpectedGap> {
  const ledger = buildCashLedger(input);
  return {
    USD: buildExpectedGap(new D(ledger.expectedUsd), input.counted.USD),
    LBP: buildExpectedGap(new D(ledger.expectedLbp), input.counted.LBP),
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
/** Reused for saved-count reads and the counted totals in submission snapshots. */
export function countDenominations(rows: readonly {
  currency: Currency;
  denomination: MoneyLike;
  quantity: number;
}[]): CurrencyValues {
  const totals = { USD: new D(0), LBP: new D(0) };
  for (const row of rows)
    totals[row.currency] = totals[row.currency].plus(parseMoney(row.denomination).times(row.quantity));
  return { USD: toMoneyString(totals.USD), LBP: toMoneyString(totals.LBP) };
}
