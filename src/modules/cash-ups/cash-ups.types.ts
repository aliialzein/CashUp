import type { CashUpStatus, Currency } from '../../generated/prisma/enums';
import type { ExpectedGap, CurrencySalesSummary, CashLedger } from '../../domain/money/cash-up-totals';
import { SaleLineDto } from '../sales/sales.types';
import { SalesSummaryDto } from '../sales/sales.types';
import { CashOutDto } from '../cash-outs/cash-outs.types';
export interface CashUpDto {
    readonly number: number;
    readonly id: string;
    readonly status: CashUpStatus;
    readonly floatUsd: string;
    readonly floatLbp: string;
    readonly referenceRate: string | null;
    readonly openedAt: string;
    readonly countStartedAt: string | null;
    readonly closedAt: string | null;
    readonly approvedAt: string | null;
    readonly voidedAt: string | null;
    readonly approvedById: string | null;
    readonly selfApproved: boolean;
    readonly returnReason: string | null;
    readonly voidReason: string | null;
    readonly expectedUsd: string | null;
    readonly expectedLbp: string | null;
    readonly countedUsd: string | null;
    readonly countedLbp: string | null;
    readonly gapUsd: string | null;
    readonly gapLbp: string | null;
}
/** All recorded sales, including waiting/deleted, matching the existing sales.length views. */
export interface CashUpHistoryRowDto extends CashUpDto {
    readonly salesCount: number;
}
export type CashUpLedgerDto = Readonly<CashLedger>;
export interface OpenCashUpSummaryDto {
    readonly number: number;
    readonly id: string;
    readonly openedAt: string;
    readonly staffName: string;
    readonly salesCount: number;
    readonly requestsCount: number;
}
export interface CashUpWithSalesDto extends CashUpDto {
    readonly sales: readonly SaleLineDto[];
    readonly salesSummary: SalesSummaryDto;
}
export interface CashUpOwnDto extends CashUpWithSalesDto {
    /** Recalculated from current delivered rows; persisted reconciliation stays in snapshot fields. */
    readonly ledger: CashUpLedgerDto;
    readonly cashOuts: readonly CashOutDto[];
}
export interface CountDto {
    readonly cashUpId: string;
    readonly lines: readonly {
        readonly currency: Currency;
        readonly denomination: string;
        readonly quantity: number;
    }[];
    readonly countedTotals: Record<Currency, string>;
}
export interface SavedCountDto extends CountDto {
    readonly saved: boolean;
    readonly countStartedAt: string | null;
}
export interface CountEntryDto {
    readonly id: string;
    readonly cashUpId: string;
    readonly currency: Currency;
    readonly denomination: string;
    readonly quantity: number;
    readonly updatedAt: string;
}
export interface CashUpReviewDto extends CashUpWithSalesDto {
    readonly cashOuts: readonly CashOutDto[];
    readonly countEntries: readonly CountEntryDto[];
    readonly salesByCurrency: Record<Currency, CurrencySalesSummary>;
    readonly walletTotals: Record<'WHISH' | 'OMT', Record<Currency, string>>;
    readonly expectedAndGap: Record<Currency, ExpectedGap>;
    readonly flags: {
        readonly total: number;
        readonly deleted: number;
        readonly edited: number;
        readonly amountDiffers: number;
        readonly deletionAwaiting: number;
    };
}
