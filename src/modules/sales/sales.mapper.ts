import { SaleStatus } from '../../generated/prisma/enums';
import type { SaleDto, SaleLineDto } from './sales.types';
type MoneyField = 'businessAmountUsd' | 'businessAmountLbp' | 'deliveryFeeUsd' | 'deliveryFeeLbp' | 'tipUsd' | 'tipLbp' | 'discountUsd' | 'discountLbp' | 'totalCollectedUsd' | 'totalCollectedLbp' | 'changeGivenUsd' | 'changeGivenLbp';
type ActualMoneyField = 'tipUsd' | 'tipLbp' | 'totalCollectedUsd' | 'totalCollectedLbp' | 'changeGivenUsd' | 'changeGivenLbp';
export type SaleRow = Omit<SaleDto, MoneyField | 'createdAt' | 'deliveredAt' | 'deletedAt'> &
  Record<Exclude<MoneyField, ActualMoneyField>, { toString(): string }> &
  Record<ActualMoneyField, { toString(): string } | null> & {
    createdAt: Date; deliveredAt: Date | null; deletedAt: Date | null;
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
    tipUsd: row.tipUsd === null ? null : formatMoney(row.tipUsd),
    tipLbp: row.tipLbp === null ? null : formatMoney(row.tipLbp),
    discountUsd: formatMoney(row.discountUsd),
    discountLbp: formatMoney(row.discountLbp),
    totalCollectedUsd: row.totalCollectedUsd === null ? null : formatMoney(row.totalCollectedUsd),
    totalCollectedLbp: row.totalCollectedLbp === null ? null : formatMoney(row.totalCollectedLbp),
    changeGivenUsd: row.changeGivenUsd === null ? null : formatMoney(row.changeGivenUsd),
    changeGivenLbp: row.changeGivenLbp === null ? null : formatMoney(row.changeGivenLbp),
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

export function mapSaleDeletionRequest(row: import('../../generated/prisma/client').Request): import('./sales.types').SaleDeletionRequestDto {
  return {
    id: row.id, type: row.type, cashUpId: row.cashUpId, saleId: row.saleId, status: row.status,
    reason: row.reason, requestedById: row.requestedById, decidedById: row.decidedById,
    decisionReason: row.decisionReason, selfApproved: row.selfApproved,
    createdAt: row.createdAt.toISOString(), decidedAt: row.decidedAt?.toISOString() ?? null,
  };
}
