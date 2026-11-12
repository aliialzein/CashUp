import { type Sale, type CashOut } from "../../generated/prisma/client";
import { buildCashLedger } from "../../domain/money/cash-up-totals";
import { mapSaleLine } from "../sales/sales.mapper";
import { mapCashOut } from "../cash-outs/cash-outs.mapper";
import { type SalesSummaryDto } from "../sales/sales.types";
import { type CashUpDto, type OpenCashUpSummaryDto, type CashUpOwnDto, type CountEntryDto } from "./cash-ups.types";
export interface CashUpRow {
    id: string;
    number: number;
    businessId: string;
    membershipId: string;
    status: CashUpDto['status'];
    floatUsd: {
        toString(): string;
    };
    floatLbp: {
        toString(): string;
    };
    referenceRate: {
        toString(): string;
    } | null;
    openedAt: Date;
    countStartedAt: Date | null;
    closedAt: Date | null;
    approvedAt: Date | null;
    voidedAt: Date | null;
    approvedById: string | null;
    selfApproved: boolean;
    returnReason: string | null;
    voidReason: string | null;
    expectedUsd: {
        toString(): string;
    } | null;
    expectedLbp: {
        toString(): string;
    } | null;
    countedUsd: {
        toString(): string;
    } | null;
    countedLbp: {
        toString(): string;
    } | null;
    gapUsd: {
        toString(): string;
    } | null;
    gapLbp: {
        toString(): string;
    } | null;
}
function formatMoney(value: {
    toString(): string;
}): string {
    const [whole, fraction = ''] = value.toString().split('.');
    return `${whole}.${fraction.padEnd(2, '0')}`;
}
function money(value: {
    toString(): string;
} | null): string | null {
    if (value === null)
        return null;
    return formatMoney(value);
}
function date(value: Date | null): string | null {
    return value?.toISOString() ?? null;
}
export function mapCashUp(row: CashUpRow): CashUpDto {
    return {
        id: row.id,
        number: row.number,
        status: row.status,
        floatUsd: formatMoney(row.floatUsd),
        floatLbp: formatMoney(row.floatLbp),
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
    number: number;
    openedAt: Date;
    membership: {
        user: {
            fullName: string;
        };
    };
    _count: {
        sales: number;
        requests: number;
    };
}
export function mapOpenCashUpSummary(row: OpenCashUpSummaryRow): OpenCashUpSummaryDto {
    return {
        id: row.id,
        number: row.number,
        openedAt: row.openedAt.toISOString(),
        staffName: row.membership.user.fullName,
        salesCount: row._count.sales,
        requestsCount: row._count.requests,
    };
}
/** Ledger derived from the delivered sales and cash-outs in this response.
 * Saved cash-up snapshot fields remain unchanged.
 */
export function mapOwnCashUp(
    row: CashUpRow,
    sales: readonly Sale[],
    cashOuts: readonly CashOut[],
    salesSummary: SalesSummaryDto,
    requests: readonly import('../sales/sales.types').SaleDeletionRequestDto[] = [],
): CashUpOwnDto {
    const delivered = sales.filter((sale): sale is Sale & {
        method: NonNullable<Sale['method']>; tipUsd: NonNullable<Sale['tipUsd']>; tipLbp: NonNullable<Sale['tipLbp']>;
        totalCollectedUsd: NonNullable<Sale['totalCollectedUsd']>; totalCollectedLbp: NonNullable<Sale['totalCollectedLbp']>;
        changeGivenUsd: NonNullable<Sale['changeGivenUsd']>; changeGivenLbp: NonNullable<Sale['changeGivenLbp']>;
    } => {
        if (sale.status !== 'DELIVERED') return false;
        if (sale.method === null || sale.tipUsd === null || sale.tipLbp === null ||
            sale.totalCollectedUsd === null || sale.totalCollectedLbp === null ||
            sale.changeGivenUsd === null || sale.changeGivenLbp === null)
            throw new Error('Delivered sale has incomplete payment');
        return true;
    });

    const ledger = buildCashLedger({
        floatUsd: row.floatUsd,
        floatLbp: row.floatLbp,
        sales: delivered.flatMap(sale =>
            (['USD', 'LBP'] as const).map(currency => {
                const suffix = currency === 'USD' ? 'Usd' : 'Lbp';

                return {
                    currency,
                    method: sale.method,
                    count: 1,
                    businessAmount: sale[`businessAmount${suffix}`],
                    deliveryFee: sale[`deliveryFee${suffix}`],
                    totalCollected: sale[`totalCollected${suffix}`],
                    tip: sale[`tip${suffix}`],
                    discount: sale[`discount${suffix}`],
                };
            }),
        ),
        change: delivered.flatMap(sale => [
            { currency: 'USD' as const, total: sale.changeGivenUsd },
            { currency: 'LBP' as const, total: sale.changeGivenLbp },
        ]),
        cashOuts: cashOuts.flatMap(cashOut => [
            {
                currency: 'USD' as const,
                total: cashOut.amountUsd,
                status: cashOut.status,
            },
            {
                currency: 'LBP' as const,
                total: cashOut.amountLbp,
                status: cashOut.status,
            },
        ]),
    });

    return {
        ...mapCashUp(row),
        sales: sales.map(mapSaleLine),
        cashOuts: cashOuts.map(mapCashOut),
        salesSummary,
        requests,
        ledger,
    };
}
export interface CountEntryRow {
    id: string;
    cashUpId: string;
    currency: CountEntryDto['currency'];
    denomination: {
        toString(): string;
    };
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
