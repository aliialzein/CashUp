"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { FilterChips } from "@/components/ui/FilterChips";
import { HISTORY_FILTERS, matchesHistoryFilter, type HistoryFilter } from "@/lib/history/filters";
import type { CashUpSummary } from "@/types/cash-up";
import { HistoryTable } from "./HistoryTable";

export function HistoryList({ items }: { items: CashUpSummary[] }) {
    const [filter, setFilter] = useState<HistoryFilter>("ALL");

    const isEmpty = items.length === 0;
    const visibleItems = items.filter((item) => matchesHistoryFilter(item, filter));

    return (
        <div className="space-y-5">
            <FilterChips
                label="Filter cash-ups"
                options={HISTORY_FILTERS}
                value={filter}
                onChange={setFilter}
                disabled={isEmpty}
            />

            {isEmpty || visibleItems.length > 0 ? (
                <HistoryTable items={visibleItems} />
            ) : (
                <Card className="px-5 py-10 text-center text-sm text-muted">No cash-ups match.</Card>
            )}
        </div>
    );
}
