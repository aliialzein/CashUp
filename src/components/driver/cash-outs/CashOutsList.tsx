"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { FilterChips } from "@/components/ui/FilterChips";
import { cashOutFilterView, type CashOutFilter } from "@/lib/driver/cash-out/cashOutFilters";
import { formatAmounts, type Amounts } from "@/lib/format/money";
import type { CashOut } from "@/types/driver/cash-up";
import { CashOutsResults } from "./CashOutsResults";
import { TODAY_EMPTY, type EmptyText } from "./CashOutsTable";
import { CashOutsTotal } from "./CashOutsTotal";
import { DeleteCashOutDialog } from "./DeleteCashOutDialog";

const PHONE_EMPTY: EmptyText = {
    title: "No cash-outs yet",
    text: "Money you take out of the drawer, like fuel or a supplier payment, will show up here.",
};

type CashOutsListProps = {
    /** All cash-outs of the open cash-up, deleted ones included. */
    cashOuts: CashOut[];
    /** Total of the cash-outs that are not deleted, per currency, calculated by the server (already negative). */
    total: Amounts;
};

/** The open cash-up's cash-outs: chips, the list, and Delete. Only used on /cash-outs, so every row can be deleted. */
export function CashOutsList({ cashOuts, total }: CashOutsListProps) {
    const [filter, setFilter] = useState<CashOutFilter>("ALL");
    const [deleting, setDeleting] = useState<CashOut | null>(null);
    const [showDeletedNotice, setShowDeletedNotice] = useState(false);

    const { chips, shown } = cashOutFilterView(cashOuts, filter);
    // Nothing recorded at all: the chips are greyed out and the list shows its "No cash-outs yet" state.
    const isEmpty = cashOuts.length === 0;
    // Nothing went out (no cash-out that is not deleted): the total shows muted.
    const nothingOut = chips.find((chip) => chip.value === "ALL")?.count === 0;
    const noMatch = !isEmpty && shown.length === 0;

    function startDelete(cashOut: CashOut) {
        setShowDeletedNotice(false);
        setDeleting(cashOut);
    }

    function finishDelete() {
        setDeleting(null);
        setShowDeletedNotice(true);
    }

    return (
        <div className="flex flex-col gap-3 md:gap-5">
            {showDeletedNotice && (
                <p role="status" className="rounded-xl border border-success-line bg-success-bg px-4 py-3 text-sm text-success">
                    Cash-out deleted. You can find it under Deleted.
                </p>
            )}

            <CashOutsTotal total={total} none={nothingOut} />

            <div className="flex items-center justify-between gap-4">
                <FilterChips label="Filter cash-outs" options={chips} value={filter} onChange={setFilter} disabled={isEmpty} />
                {!nothingOut && (
                    <span className="hidden font-mono text-sm font-semibold text-danger md:inline">
                        Total out {formatAmounts(total)}
                    </span>
                )}
            </div>

            {noMatch ? (
                <Card className="px-5 py-10 text-center text-sm text-muted">No cash-outs here.</Card>
            ) : (
                <CashOutsResults cashOuts={shown} empty={TODAY_EMPTY} phoneEmpty={PHONE_EMPTY} onDelete={startDelete} />
            )}

            <DeleteCashOutDialog cashOut={deleting} onClose={() => setDeleting(null)} onDeleted={finishDelete} />
        </div>
    );
}
