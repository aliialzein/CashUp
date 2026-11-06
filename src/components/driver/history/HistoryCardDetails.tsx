import { salesLabel } from "@/lib/driver/history/historyHref";
import type { CashUpSummary } from "@/types/driver/cash-up";
import { HistoryGap } from "./HistoryGap";

/** Phone cards: date and sales on the left, the result on the right, and the owner's reason when returned. */
export function HistoryCardDetails({ item }: { item: CashUpSummary }) {
    return (
        <>
            <span className="flex items-center justify-between gap-2 text-[13px]">
                <span className="text-muted">
                    {item.date} · {salesLabel(item.salesCount)}
                </span>
                <HistoryGap status={item.status} gap={item.gap} />
            </span>
            {item.status === "RETURNED" && item.returnReason && (
                <span className="text-[13px] text-warning">&quot;{item.returnReason}&quot;</span>
            )}
        </>
    );
}
