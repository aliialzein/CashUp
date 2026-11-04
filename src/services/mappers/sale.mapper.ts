import { SaleStatus } from '../../persistence';
import type { SaleDto, SaleLineDto } from '../dto';

export type SaleRow = Omit<
  SaleDto,
  | 'businessAmount'
  | 'deliveryFee'
  | 'tip'
  | 'discount'
  | 'totalCollected'
  | 'changeGiven'
  | 'createdAt'
  | 'deliveredAt'
  | 'deletedAt'
> & {
  businessAmount: { toString(): string };
  deliveryFee: { toString(): string };
  tip: { toString(): string } | null;
  discount: { toString(): string } | null;
  totalCollected: { toString(): string };
  changeGiven: { toString(): string } | null;
  createdAt: Date;
  deliveredAt: Date | null;
  deletedAt: Date | null;
  cancelReason: string | null;
};

function formatMoney(value: { toString(): string }): string {
  const [whole, fraction = ''] = value.toString().split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

function money(value: { toString(): string } | null): string | null {
  if (value === null) return null;
  return formatMoney(value);
}

function date(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

export function mapSale(row: SaleRow): SaleDto {
  return {
    id: row.id,
    cashUpId: row.cashUpId,
    saleNumber: row.saleNumber,
    status: row.status,
    businessAmount: formatMoney(row.businessAmount),
    deliveryFee: formatMoney(row.deliveryFee),
    tip: money(row.tip),
    discount: money(row.discount),
    totalCollected: formatMoney(row.totalCollected),
    currency: row.currency,
    method: row.method,
    changeGiven: money(row.changeGiven),
    changeCurrency: row.changeCurrency,
    clientNumber: row.clientNumber,
    note: row.note,
    mixedChange: row.mixedChange,
    amountDiffers: row.amountDiffers,
    isEdited: row.isEdited,
    deletionAwaiting: row.deletionAwaiting,
    createdAt: row.createdAt.toISOString(),
    deliveredAt: date(row.deliveredAt),
    deletedAt: date(row.deletedAt),
    cancelReason: row.cancelReason,
  };
}

export function mapSaleLine(row: SaleRow): SaleLineDto {
  let moneyTaken: SaleLineDto['moneyTaken'];
  let amountCollected: string | null = null;
  let amountExpected: string | null = null;
  switch (row.status) {
    case SaleStatus.DELIVERED:
      moneyTaken = 'COLLECTED';
      amountCollected = money(row.totalCollected);
      break;
    case SaleStatus.TO_DELIVER:
      moneyTaken = 'NOT_YET';
      amountExpected = money(row.totalCollected);
      break;
    case SaleStatus.DELETED:
      moneyTaken = 'CANCELLED';
      break;
  }
  return {
    id: row.id,
    saleNumber: row.saleNumber,
    status: row.status,
    moneyTaken,
    amountCollected,
    amountExpected,
    currency: row.currency,
    method: row.method,
    changeGiven: money(row.changeGiven),
    changeCurrency: row.changeCurrency,
    businessAmount: formatMoney(row.businessAmount),
    deliveryFee: formatMoney(row.deliveryFee),
    tip: money(row.tip),
    discount: money(row.discount),
    clientNumber: row.clientNumber,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    deliveredAt: date(row.deliveredAt),
    cancelReason: row.cancelReason,
    isEdited: row.isEdited,
    amountDiffers: row.amountDiffers,
    mixedChange: row.mixedChange,
    deletionAwaiting: row.deletionAwaiting,
  };
}
