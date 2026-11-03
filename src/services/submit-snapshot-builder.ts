import type { CashUpSnapshot } from '../persistence';
import { buildSubmitSnapshot, type Currency } from '../domain/money';
import type { TransactionRepositories } from './ports';
import type { CashUpRow } from './mappers/cash-up.mapper';

export type SnapshotCashUp = Pick<CashUpRow, 'id' | 'floatUsd' | 'floatLbp'>;

export class SubmitSnapshotBuilder {
  /**
   * Requires transaction-branded repositories because all four aggregates must describe
   * the state protected by the cash-up row lock already held by the caller.
   */
  async build(
    repos: TransactionRepositories,
    cashUp: SnapshotCashUp,
  ): Promise<CashUpSnapshot> {
    const sales = await repos.sales.totalsByCurrencyAndMethod(cashUp.id);
    const changes = await repos.sales.changeGivenByCurrency(cashUp.id);
    const cashOuts = await repos.cashOuts.totalsByCurrency(cashUp.id);
    const counts = await repos.counts.countedTotals(cashUp.id);
    const counted: Record<Currency, string> = {
      USD: counts.USD.toString(),
      LBP: counts.LBP.toString(),
    };
    return buildSubmitSnapshot({
      floatUsd: cashUp.floatUsd.toString(),
      floatLbp: cashUp.floatLbp.toString(),
      sales,
      change: changes,
      cashOuts,
      counted,
    });
  }
}
