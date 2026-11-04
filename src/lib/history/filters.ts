import { gapStatus } from "@/lib/count-cash/calculations";
import type { Amounts } from "@/lib/format/money";
import type { CashUpSummary } from "@/types/cash-up";

export type HistoryFilter =
    | "ALL"
    | "IN_PROGRESS"
    | "SUBMITTED"
    | "RETURNED"
    | "APPROVED"
    | "MATCHED"
    | "NEEDS_ATTENTION";

export const HISTORY_FILTERS: { value: HistoryFilter; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "IN_PROGRESS", label: "In progress" },
    { value: "SUBMITTED", label: "Submitted" },
    { value: "RETURNED", label: "Returned" },
    { value: "APPROVED", label: "Approved" },
    { value: "MATCHED", label: "Matched" },
    { value: "NEEDS_ATTENTION", label: "Needs attention" },
];

function isMatched(gap: Amounts): boolean {
    return gapStatus(gap.usd) === "match" && gapStatus(gap.lbp) === "match";
}

/** Short in at least one currency. Extra money is not a problem for this filter. */
function hasShortfall(gap: Amounts): boolean {
    return gapStatus(gap.usd) === "short" || gapStatus(gap.lbp) === "short";
}

export function matchesHistoryFilter(item: CashUpSummary, filter: HistoryFilter): boolean {
    switch (filter) {
        case "ALL":
            return true;
        case "IN_PROGRESS":
            return item.status === "OPEN";
        case "SUBMITTED":
            return item.status === "SUBMITTED";
        case "RETURNED":
            return item.status === "RETURNED";
        case "APPROVED":
            return item.status === "APPROVED";
        case "MATCHED":
            return item.gap !== null && isMatched(item.gap);
        case "NEEDS_ATTENTION":
            return item.status === "RETURNED" || (item.gap !== null && hasShortfall(item.gap));
    }
}