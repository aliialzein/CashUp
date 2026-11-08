import { SaleStatus } from '../../generated/prisma/enums';
import type { SaleDto, SaleLineDto } from './sales.types';
type MoneyField = 'businessAmountUsd' | 'businessAmountLbp' | 'deliveryFeeUsd' | 'deliveryFeeLbp' | 'tipUsd' | 'tipLbp' | 'discountUsd' | 'discountLbp' | 'totalCollectedUsd' | 'totalCollectedLbp' | 'changeGivenUsd' | 'changeGivenLbp';
export type SaleRow = Omit<SaleDto, MoneyField | 'createdAt' | 'deliveredAt' | 'deletedAt'> & Record<MoneyField, {
  toString(): string;
}> & {
  createdAt: Date;
  deliveredAt: Date | null;
  deletedAt: Date | null;
};
function formatMoney(value: {
  toString(): string;
}): string {
  const [whole, fraction = ''] = value.toString().split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}
export function mapSale(row: SaleRow): SaleDto {
  return {
    id: row.id,
    cashUpId: row.cashUpId,
    saleNumber: row.saleNumber,
    status: row.status,
    businessAmountUsd: formatMoney(row.businessAmountUsd),
    businessAmountLbp: formatMoney(row.businessAmountLbp),
    deliveryFeeUsd: formatMoney(row.deliveryFeeUsd),
    deliveryFeeLbp: formatMoney(row.deliveryFeeLbp),
    tipUsd: formatMoney(row.tipUsd),
    tipLbp: formatMoney(row.tipLbp),
    discountUsd: formatMoney(row.discountUsd),
    discountLbp: formatMoney(row.discountLbp),
    totalCollectedUsd: formatMoney(row.totalCollectedUsd),
    totalCollectedLbp: formatMoney(row.totalCollectedLbp),
    changeGivenUsd: formatMoney(row.changeGivenUsd),
    changeGivenLbp: formatMoney(row.changeGivenLbp),
    method: row.method,
    clientNumber: row.clientNumber,
    note: row.note,
    amountDiffers: row.amountDiffers,
    isEdited: row.isEdited,
    deletionAwaiting: row.deletionAwaiting,
    createdAt: row.createdAt.toISOString(),
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    cancelReason: row.cancelReason,
  };
}
export function mapSaleLine(row: SaleRow): SaleLineDto {
  const { cashUpId, deletedAt, ...sale } = mapSale(row);
  void cashUpId;
  void deletedAt;
  return {
    ...sale,
    moneyTaken: row.status === SaleStatus.DELIVERED ? 'COLLECTED' : row.status === SaleStatus.TO_DELIVER ? 'NOT_YET' : 'CANCELLED'
  };
}
