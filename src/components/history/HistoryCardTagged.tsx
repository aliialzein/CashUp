import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cashUpLabel } from "@/lib/cash-up/cashUpLabel";
import { historyHref } from "@/lib/history/historyHref";
import type { CashUpStatus, CashUpSummary } from "@/types/cash-up";
import { CashUpStatusBadge } from "./CashUpStatusBadge";
import { HistoryCardDetails } from "./HistoryCardDetails";

/** The border takes the colour of the status, the same one as its badge. */
const BORDER: Record<CashUpStatus, string> = {
    OPEN: "border-line-strong",
    SUBMITTED: "border-info-line",
    RETURNED: "border-warning-line",
    APPROVED: "border-success-line",
};

/** The status badge sits on the top border. The title and the arrow share the first row. */
export function HistoryCardTagged({ item }: { item: CashUpSummary }) {
    return (
        <li>
            <Link
                href={historyHref(item)}
                className={`relative flex min-h-11 flex-col gap-1.5 rounded-xl border bg-surface px-4 pt-4 pb-3 ${BORDER[item.status]}`}
            >
                <span className="absolute -top-3 left-3">
                    <CashUpStatusBadge status={item.status} />
                </span>
                <span className="flex items-center justify-between gap-2">
                    <span className="font-heading text-[15px] font-semibold whitespace-nowrap">
                        {cashUpLabel(item.number)}
                    </span>
                    <Icon name="chevronRight" size={18} className="shrink-0 text-muted" />
                </span>
                <HistoryCardDetails item={item} />
            </Link>
        </li>
    );
}
