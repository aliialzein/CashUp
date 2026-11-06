import { EmptyState } from "@/components/ui/EmptyState";
import { groupByMonth } from "@/lib/driver/history/groupByMonth";
import type { CashUpSummary } from "@/types/cash-up";
import { HistoryCards } from "./HistoryCards";
import { HistoryTable } from "./HistoryTable";

type HistoryResultsProps = {
    items: CashUpSummary[];
    /** Phone only: put a month heading above each month's cards. */
    byMonth?: boolean;
};

/** Phone: cards (under month headings when asked), or an empty state. Desktop: the table. */
export function HistoryResults({ items, byMonth = false }: HistoryResultsProps) {
    return (
        <>
            <div className="md:hidden">
                {items.length === 0 ? (
                    <EmptyState
                        icon="clock"
                        title="No cash-ups yet"
                        text="Your submitted and approved cash-ups will appear here."
                    />
                ) : byMonth ? (
                    <div className="flex flex-col gap-5">
                        {groupByMonth(items).map((group) => (
                            <section key={group.key} aria-label={group.label} className="flex flex-col gap-3">
                                <h2 className="text-xs font-medium tracking-wider text-muted uppercase">{group.label}</h2>
                                <HistoryCards items={group.items} />
                            </section>
                        ))}
                    </div>
                ) : (
                    <HistoryCards items={items} />
                )}
            </div>
            <div className="hidden md:block">
                <HistoryTable items={items} />
            </div>
        </>
    );
}
