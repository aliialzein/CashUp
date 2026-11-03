import type { CashUpDto, OpenCashUpSummaryDto } from '../dto';

export interface CashUpRow {
  id: string;
  businessId: string;
  membershipId: string;
  status: CashUpDto['status'];
  floatUsd: { toString(): string };
  floatLbp: { toString(): string };
  referenceRate: { toString(): string } | null;
  openedAt: Date;
  countStartedAt: Date | null;
  closedAt: Date | null;
  approvedAt: Date | null;
  voidedAt: Date | null;
  approvedById: string | null;
  selfApproved: boolean;
  returnReason: string | null;
  voidReason: string | null;
  expectedUsd: { toString(): string } | null;
  expectedLbp: { toString(): string } | null;
  countedUsd: { toString(): string } | null;
  countedLbp: { toString(): string } | null;
  gapUsd: { toString(): string } | null;
  gapLbp: { toString(): string } | null;
}

function money(value: { toString(): string } | null): string | null {
  if (value === null) return null;
  const [whole, fraction = ''] = value.toString().split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

function date(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

export function mapCashUp(row: CashUpRow): CashUpDto {
  return {
    id: row.id,
    businessId: row.businessId,
    membershipId: row.membershipId,
    status: row.status,
    floatUsd: money(row.floatUsd) ?? '0.00',
    floatLbp: money(row.floatLbp) ?? '0.00',
    referenceRate: money(row.referenceRate),
    openedAt: row.openedAt.toISOString(),
    countStartedAt: date(row.countStartedAt),
    closedAt: date(row.closedAt),
    approvedAt: date(row.approvedAt),
    voidedAt: date(row.voidedAt),
    approvedById: row.approvedById,
    selfApproved: row.selfApproved,
    returnReason: row.returnReason,
    voidReason: row.voidReason,
    expectedUsd: money(row.expectedUsd),
    expectedLbp: money(row.expectedLbp),
    countedUsd: money(row.countedUsd),
    countedLbp: money(row.countedLbp),
    gapUsd: money(row.gapUsd),
    gapLbp: money(row.gapLbp),
  };
}

export interface OpenCashUpSummaryRow {
  id: string;
  openedAt: Date;
  membership: { user: { fullName: string } };
  _count: { sales: number; requests: number };
}

export function mapOpenCashUpSummary(row: OpenCashUpSummaryRow): OpenCashUpSummaryDto {
  return {
    id: row.id,
    openedAt: row.openedAt.toISOString(),
    staffName: row.membership.user.fullName,
    salesCount: row._count.sales,
    requestsCount: row._count.requests,
  };
}
