import Link from "next/link";
import { CashUpStatusBadge } from "@/components/driver/history/CashUpStatusBadge";
import { HistoryGap } from "@/components/driver/history/HistoryGap";
import { Icon } from "@/components/ui/Icon";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { formatCashUpNumber } from "@/lib/driver/cash-up/cashUpLabel";
import { withOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";
import type { CashUpSummary } from "@/types/driver/cash-up";

/** Phone: the last cash-up as a card. While the owner has not reviewed it, the label says so. */
export function LastCashUpCard({ item }: { item: CashUpSummary }) {
    const waiting = item.status === "SUBMITTED";

    return (
        <section>
            <SectionLabel>{waiting ? "Waiting for the owner · 1" : "Last cash-up"}</SectionLabel>
            <Link
                href={withOrigin(routes.driver.historyDetail(item.id), "today")}
                className="flex min-h-15 items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3"
            >
                <span className="flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                        <span className="font-heading text-[15px] font-semibold">
                            Cash-up {formatCashUpNumber(item.number)}
                        </span>
                        <CashUpStatusBadge status={item.status} />
                    </span>
                    <span className="text-[13px] text-muted">
                        {item.date} · <HistoryGap status={item.status} gap={item.gap} />
                    </span>
                </span>
                <Icon name="chevronRight" size={18} className="text-muted" />
            </Link>
        </section>
    );
}
