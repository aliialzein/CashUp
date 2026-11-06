"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { FilterChips } from "@/components/ui/FilterChips";
import { CASH_OUT_REASONS, type CashOutReason } from "@/lib/driver/cash-out/reasons";
import { formatAmounts, type Amounts } from "@/lib/format/money";
import type { CashOut } from "@/types/driver/cash-up";
import { CashOutsResults } from "./CashOutsResults";
import { TODAY_EMPTY, type EmptyText } from "./CashOutsTable";
import { CashOutsTotal } from "./CashOutsTotal";

type Filter = "ALL" | CashOutReason;

const FILTERS: { value: Filter; label: string }[] = [
    { value: "ALL", label: "All" },
    ...CASH_OUT_REASONS.map((reason) => ({ value: reason, label: reason })),
];

const PHONE_EMPTY: EmptyText = {
    title: "No cash-outs yet",
    text: "Money you take out of the drawer, like fuel or a supplier payment, will show up here.",
};

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
    const noMatch = !isEmpty && visibleCashOuts.length === 0;

    return (
        <div className="flex flex-col gap-3 md:gap-5">
            <CashOutsTotal total={total} none={isEmpty} />

            <div className="flex items-center justify-between gap-4">
                <FilterChips label="Filter cash-outs" options={options} value={filter} onChange={setFilter} disabled={isEmpty} />
                {!isEmpty && (
                    <span className="hidden font-mono text-sm font-semibold text-danger md:inline">
                        Total out {formatAmounts(total)}
                    </span>
                )}
            </div>

            {noMatch ? (
                <Card className="px-5 py-10 text-center text-sm text-muted">No cash-outs.</Card>
            ) : (
                <CashOutsResults cashOuts={visibleCashOuts} empty={TODAY_EMPTY} phoneEmpty={PHONE_EMPTY} />
            )}
        </div>
    );
}
