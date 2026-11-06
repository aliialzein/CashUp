"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { FilterChips } from "@/components/ui/FilterChips";
import { HISTORY_FILTERS, matchesHistoryFilter, type HistoryFilter } from "@/lib/history/filters";
import type { CashUpSummary } from "@/types/cash-up";
import { HistoryResults } from "./HistoryResults";

export function HistoryList({ items }: { items: CashUpSummary[] }) {
    const [filter, setFilter] = useState<HistoryFilter>("ALL");

    const isEmpty = items.length === 0;
    const isFiltered = filter !== "ALL";
    const visibleItems = items.filter((item) => matchesHistoryFilter(item, filter));
    const count = visibleItems.length;

    return (
        <div className="flex flex-col gap-3 md:gap-5">
            {/* Phone: nothing to filter yet, so the chips stay hidden. */}
            <div className={isEmpty ? "max-md:hidden" : undefined}>
                <FilterChips
                    label="Filter cash-ups"
                    options={HISTORY_FILTERS}
                    value={filter}
                    onChange={setFilter}
                    disabled={isEmpty}
                />
            </div>

            {/* Phone: a filtered list shows how many match. The full list shows month headings instead. */}
            {isFiltered && count > 0 && (
                <span className="text-xs font-medium tracking-wider text-muted uppercase md:hidden">
                    {count} {count === 1 ? "cash-up" : "cash-ups"}
                </span>
            )}

            {isEmpty || count > 0 ? (
                <HistoryResults items={visibleItems} byMonth={!isFiltered} />
            ) : (
                <Card className="px-5 py-10 text-center text-sm text-muted">No cash-ups match.</Card>
            )}
        </div>
    );
}
