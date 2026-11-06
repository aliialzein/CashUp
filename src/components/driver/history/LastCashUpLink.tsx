import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatCashUpNumber } from "@/lib/driver/cash-up/cashUpLabel";
import { routes } from "@/lib/routes";
import type { CashUpSummary } from "@/types/cash-up";
import { CashUpStatusBadge } from "./CashUpStatusBadge";
import { HistoryGap } from "./HistoryGap";

/** One line: the last submitted cash-up, its status and gap. It opens that cash-up. */
export function LastCashUpLink({ item }: { item: CashUpSummary }) {
    return (
        <Link
            href={routes.driver.historyDetail(item.id)}
            className="flex items-center gap-2 text-sm text-muted hover:text-ink"
        >
            <span>Last cash-up {formatCashUpNumber(item.number)}</span>
            <span aria-hidden>·</span>
            <CashUpStatusBadge status={item.status} />
            <span aria-hidden>·</span>
            <HistoryGap status={item.status} gap={item.gap} />
            <Icon name="chevronRight" size={14} />
        </Link>
    );
}
