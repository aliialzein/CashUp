"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { FilterChips } from "@/components/ui/FilterChips";
import { CASH_OUT_REASONS, type CashOutReason } from "@/lib/cash-out/reasons";
import { formatAmounts, type Amounts } from "@/lib/format/money";
import type { CashOut } from "@/types/cash-up";
import { CashOutsTable } from "./CashOutsTable";

type Filter = "ALL" | CashOutReason;

const FILTERS: { value: Filter; label: string }[] = [
    { value: "ALL", label: "All" },
    ...CASH_OUT_REASONS.map((reason) => ({ value: reason, label: reason })),
];

function matchesFilter(cashOut: CashOut, filter: Filter): boolean {
    return filter === "ALL" || cashOut.reason === filter;
}

type CashOutsListProps = {
    cashOuts: CashOut[];
    /** Total of all cash-outs per currency, calculated by the server (already negative). */
    total: Amounts;
};

export function CashOutsList({ cashOuts, total }: CashOutsListProps) {
    const [filter, setFilter] = useState<Filter>("ALL");

    const isEmpty = cashOuts.length === 0;
    const options = FILTERS.map(({ value, label }) => ({
        value,
        label,
        count: cashOuts.filter((cashOut) => matchesFilter(cashOut, value)).length,
    }));
    const visibleCashOuts = cashOuts.filter((cashOut) => matchesFilter(cashOut, filter));

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
                <FilterChips label="Filter cash-outs" options={options} value={filter} onChange={setFilter} disabled={isEmpty} />
                {!isEmpty && <span className="font-mono text-sm font-semibold text-danger">Total out {formatAmounts(total)}</span>}
            </div>

            {isEmpty || visibleCashOuts.length > 0 ? (
                <CashOutsTable cashOuts={visibleCashOuts} />
            ) : (
                <Card className="px-5 py-10 text-center text-sm text-muted">No cash-outs.</Card>
            )}
        </div>
    );
}
