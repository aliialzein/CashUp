import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { formatCashUpNumber } from "@/lib/driver/cash-up/cashUpLabel";
import { historyHref, salesLabel } from "@/lib/driver/history/historyHref";
import type { CashUpSummary } from "@/types/cash-up";
import { CashUpStatusBadge } from "./CashUpStatusBadge";
import { HistoryGap } from "./HistoryGap";

const COLUMNS = "grid grid-cols-[150px_120px_100px_160px_1fr_24px] items-center gap-3 px-5";

export function HistoryTable({ items }: { items: CashUpSummary[] }) {
    return (
        <Card as="section" aria-label="Cash-ups" className="overflow-hidden">
            <div className={`${COLUMNS} h-10 border-b border-line bg-canvas text-xs font-medium tracking-wider text-muted uppercase`}>
                <span>Cash-up</span>
                <span>Date</span>
                <span>Sales</span>
                <span>Status</span>
                <span className="text-right">Gap</span>
                <span />
            </div>

            {items.length === 0 && (
                <EmptyState
                    bare
                    icon="clock"
                    title="Nothing here yet"
                    text="Your first submitted cash-up will be listed in this table."
                />
            )}

            {items.map((item) => (
                <Link
                    key={item.id}
                    href={historyHref(item)}
                    className={`${COLUMNS} h-14 border-b border-subtle text-sm last:border-b-0 hover:bg-canvas`}
                >
                    <span className="font-heading font-semibold">Cash-up {formatCashUpNumber(item.number)}</span>
                    <span className="text-muted">{item.date}</span>
                    <span className="text-muted">{salesLabel(item.salesCount)}</span>
                    <span>
                        <CashUpStatusBadge status={item.status} />
                    </span>
                    <span className="text-right">
                        <HistoryGap status={item.status} gap={item.gap} />
                    </span>
                    <span className="text-muted">
                        <Icon name="chevronRight" size={18} />
                    </span>
                </Link>
            ))}
        </Card>
    );
}
