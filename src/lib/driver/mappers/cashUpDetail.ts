import type { CashUpOwnDto } from "@/modules/cash-ups/cash-ups.types";
import type { CashUpDetail } from "@/types/driver/cash-up";
import { formatDay, formatTime } from "./businessTime";
import { mapCashOut, type CashOutInput } from "./cashOut";
import { deliveredTotal, toLedger, type LedgerInput, type OwnCashUpStatus } from "./cashUp";
import { mapSale, pair, type SaleLineInput } from "./sale";

/** The statuses that have a Detail page: locked cash-ups. Open and returned ones continue on Today. */
export type LockedStatus = Extract<OwnCashUpStatus, "SUBMITTED" | "APPROVED">;

/** The fields of the driver's own cash-up that mapCashUpDetail reads, taken from CashUpOwnDto. */
export type CashUpDetailInput = Pick<
    CashUpOwnDto,
    "id" | "number" | "closedAt" | "approvedAt" | "countedUsd" | "countedLbp" | "gapUsd" | "gapLbp"
> & {
    status: LockedStatus;
    /** Today the backend sends it only while OPEN, so it is null here until the agreed update. */
    ledger: LedgerInput | null;
    sales: readonly SaleLineInput[];
    cashOuts: readonly CashOutInput[];
};

/** "26 Oct, 09:10" in business time. */
function dayAndTime(isoDate: string): string {
    return `${formatDay(isoDate)}, ${formatTime(isoDate)}`;
}

/**
 * Backend locked cash-up -> the Detail page. The count, the gap and the submit time are frozen at submit, so a locked
 * cash-up without them is a backend bug: fail loudly instead of guessing (like OPEN_CASH_UP_WITHOUT_LEDGER on Today).
 */
export function mapCashUpDetail(dto: CashUpDetailInput): CashUpDetail {
    const { closedAt, countedUsd, countedLbp, gapUsd, gapLbp } = dto;
    if (closedAt === null || countedUsd === null || countedLbp === null || gapUsd === null || gapLbp === null) {
        throw new Error("LOCKED_CASH_UP_WITHOUT_COUNT");
    }

    const sales = dto.sales.map(mapSale);
    return {
        id: dto.id,
        number: dto.number,
        status: dto.status,
        submittedAt: dayAndTime(closedAt),
        ledger: dto.ledger === null ? null : toLedger(dto.ledger),
        counted: pair(countedUsd, countedLbp),
        gap: pair(gapUsd, gapLbp),
        sales,
        cashOuts: dto.cashOuts.map(mapCashOut),
        deliveredTotal: deliveredTotal(sales),
        review: dto.status === "APPROVED" && dto.approvedAt !== null ? { at: dayAndTime(dto.approvedAt) } : null,
    };
}
