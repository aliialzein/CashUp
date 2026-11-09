import type { CashOut } from "@/types/driver/cash-up";
import { CASH_OUT_REASONS, type CashOutReason } from "./reasons";

/** One chip of the cash-outs list. "ALL" and the categories never include deleted cash-outs; "DELETED" shows only those. */
export type CashOutFilter = "ALL" | CashOutReason | "DELETED";

/** The chips in the order the design shows them. */
const CASH_OUT_FILTERS: { value: CashOutFilter; label: string }[] = [
    { value: "ALL", label: "All" },
    ...CASH_OUT_REASONS.map((reason) => ({ value: reason, label: reason })),
    { value: "DELETED", label: "Deleted" },
];

export type CashOutChip = { value: CashOutFilter; label: string; count: number };

/**
 * What the list shows for the selected chip. No total on purpose: Total out comes from the server,
 * which already leaves deleted cash-outs out.
 */
export type CashOutFilterView = { chips: CashOutChip[]; shown: CashOut[] };

function matchesFilter(cashOut: CashOut, filter: CashOutFilter): boolean {
    if (filter === "DELETED") return cashOut.isDeleted;
    if (cashOut.isDeleted) return false;
    // An unknown backend reason already arrives as "Other" (see parseReasonText).
    return filter === "ALL" || cashOut.reason === filter;
}

/** The chips with their counts, and the cash-outs of the selected chip. Used by both the phone and the desktop list. */
export function cashOutFilterView(cashOuts: readonly CashOut[], selected: CashOutFilter): CashOutFilterView {
    return {
        chips: CASH_OUT_FILTERS.map(({ value, label }) => ({
            value,
            label,
            count: cashOuts.filter((cashOut) => matchesFilter(cashOut, value)).length,
        })),
        shown: cashOuts.filter((cashOut) => matchesFilter(cashOut, selected)),
    };
}
