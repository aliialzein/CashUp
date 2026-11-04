import type { CountEntryDto } from '../dto';

export interface CountEntryRow {
  id: string;
  cashUpId: string;
  currency: CountEntryDto['currency'];
  denomination: { toString(): string };
  quantity: number;
  updatedAt: Date;
}

export function mapCountEntry(row: CountEntryRow): CountEntryDto {
  const denomination = row.denomination.toString();
  const [whole, fraction = ''] = denomination.split('.');
  return {
    id: row.id,
    cashUpId: row.cashUpId,
    currency: row.currency,
    denomination: `${whole}.${fraction.padEnd(2, '0')}`,
    quantity: row.quantity,
    updatedAt: row.updatedAt.toISOString(),
  };
}
