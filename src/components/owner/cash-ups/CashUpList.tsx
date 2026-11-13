"use client";

import { useState } from "react";
import type { OwnerCashUpSummaryDto } from "@/modules/cash-ups/cash-ups.types";
import { CASH_UP_FILTERS, matchesFilter, type CashUpFilter } from "@/lib/owner/cashUpOverview";
import CashUpCard from "./CashUpCard";

/** The filter chips and the matching cash-ups. The list comes from the server; filtering happens here. */
export default function CashUpList({ cashUps }: { cashUps: OwnerCashUpSummaryDto[] }) {
  const [filter, setFilter] = useState<CashUpFilter>("TO_REVIEW");
  const shown = cashUps.filter((cashUp) => matchesFilter(cashUp, filter));

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Filter cash-ups" className="flex flex-wrap gap-2">
        {CASH_UP_FILTERS.map((chip) => {
          const active = chip.id === filter;
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(chip.id)}
              className={`min-h-11 rounded-full border px-4 text-sm font-medium transition ${
                active ? "border-ink bg-ink text-white shadow-sm" : "border-line bg-surface text-muted hover:bg-subtle"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {shown.length > 0 ? (
        <div className="space-y-3">
          {shown.map((cashUp) => (
            <CashUpCard key={cashUp.id} cashUp={cashUp} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <h2 className="font-semibold text-ink">
            {cashUps.length === 0 ? "Cash-ups will appear here" : "Nothing here right now"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {cashUps.length === 0
              ? "Your business has no recorded cash-ups yet."
              : "No cash-ups match this filter. Try another one."}
          </p>
        </div>
      )}
    </div>
  );
}
