import { buildCashLedger } from '../../domain/money/cash-up-totals';
import type { CashUpReviewDto } from '../../modules/cash-ups/cash-ups.types';

/** Format exact DTO strings at the display boundary, without floating-point conversion. */
export function ownerMoney(value: string | null): string {
  if (value === null) return '—';
  const [whole, fraction = '00'] = value.split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(2, '0')}`;
}
export function ownerDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Beirut', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}
export function ownerLedger(review: CashUpReviewDto) {
  const delivered = review.sales.filter(sale => sale.status === 'DELIVERED');
  return buildCashLedger({
    floatUsd: review.floatUsd, floatLbp: review.floatLbp,
    sales: delivered.flatMap(sale => {
      if (sale.method === null || sale.totalCollectedUsd === null || sale.totalCollectedLbp === null
        || sale.tipUsd === null || sale.tipLbp === null) throw new Error('Incomplete delivered payment');
      return (['USD', 'LBP'] as const).map(currency => {
        const suffix = currency === 'USD' ? 'Usd' : 'Lbp';
        return { currency, method: sale.method!, count: 1, businessAmount: sale[`businessAmount${suffix}`],
          deliveryFee: sale[`deliveryFee${suffix}`], totalCollected: sale[`totalCollected${suffix}`]!,
          tip: sale[`tip${suffix}`]!, discount: sale[`discount${suffix}`] };
      });
    }),
    change: delivered.flatMap(sale => {
      if (sale.changeGivenUsd === null || sale.changeGivenLbp === null) throw new Error('Incomplete delivered change');
      return [{ currency: 'USD' as const, total: sale.changeGivenUsd }, { currency: 'LBP' as const, total: sale.changeGivenLbp }];
    }),
    cashOuts: review.cashOuts.flatMap(row => [
      { currency: 'USD' as const, total: row.amountUsd, status: row.status },
      { currency: 'LBP' as const, total: row.amountLbp, status: row.status },
    ]),
  });
}
