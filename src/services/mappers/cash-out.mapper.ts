import type { CashOutDto, CashOutStatus } from '../dto';

export interface CashOutRow {
  id: string;
  cashUpId: string;
  amount: { toString(): string };
  currency: CashOutDto['currency'];
  reason: string;
  status?: CashOutStatus | null;
  cancelReason?: string | null;
  cancelledAt?: Date | null;
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
    status: row.status ?? 'ACTIVE',
    cancelReason: row.cancelReason ?? null,
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
