import type { CashOutDto, CashOutStatus } from './cash-outs.types';
export interface CashOutRow {
  id: string;
  cashUpId: string;
  amountUsd: {
    toString(): string;
  };
  amountLbp: {
    toString(): string;
  };
  note: string | null;
  reason: string;
  status?: CashOutStatus | null;
  cancelReason?: string | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export function mapCashOut(row: CashOutRow): CashOutDto {
  return {
    id: row.id,
    cashUpId: row.cashUpId,
    amountUsd: formatMoney(row.amountUsd),
    amountLbp: formatMoney(row.amountLbp),
    note: row.note,
    reason: row.reason,
    status: row.status ?? 'ACTIVE',
    cancelReason: row.cancelReason ?? null,
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
function formatMoney(value: {
  toString(): string;
}): string {
  const [whole, fraction = ''] = value.toString().split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}
