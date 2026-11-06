import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cashUpLabel } from "@/lib/driver/cash-up/cashUpLabel";
import { historyHref } from "@/lib/driver/history/historyHref";
import type { CashUpSummary } from "@/types/cash-up";
import { CashUpStatusBadge } from "./CashUpStatusBadge";
import { HistoryCardDetails } from "./HistoryCardDetails";

type HistoryCardPlainProps = {
    item: CashUpSummary;
    /** Its own box. Turn it off for a row inside a list that is already boxed. */
    framed?: boolean;
};

/** Badge next to the title, arrow on the right. */
export function HistoryCardPlain({ item, framed = true }: HistoryCardPlainProps) {
    const frame = framed ? "rounded-xl border border-line bg-surface" : "active:bg-canvas";
    return (
        <li>
            <Link href={historyHref(item)} className={`flex min-h-11 flex-col gap-1.5 px-4 py-3 ${frame}`}>
                <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                        <span className="font-heading text-[15px] font-semibold whitespace-nowrap">
                            {cashUpLabel(item.number)}
                        </span>
                        <CashUpStatusBadge status={item.status} />
                    </span>
                    <Icon name="chevronRight" size={18} className="shrink-0 text-muted" />
                </span>
                <HistoryCardDetails item={item} />
            </Link>
        </li>
    );
}

/** The same card without its own box, for the grouped list. */
export function HistoryCardRow({ item }: { item: CashUpSummary }) {
    return <HistoryCardPlain item={item} framed={false} />;
}
