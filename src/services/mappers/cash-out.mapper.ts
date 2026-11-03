import type { CashOutDto } from '../dto';

export interface CashOutRow {
  id: string;
  cashUpId: string;
  amount: { toString(): string };
  currency: CashOutDto['currency'];
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}

export function mapCashOut(row: CashOutRow): CashOutDto {
  const [whole, fraction = ''] = row.amount.toString().split('.');
  return {
    id: row.id,
    cashUpId: row.cashUpId,
    amount: `${whole}.${fraction.padEnd(2, '0')}`,
    currency: row.currency,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
