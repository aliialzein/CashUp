"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { Icon } from "@/components/ui/Icon";
import { routes } from "@/lib/routes";
import type { Sale, SaleStatus } from "@/types/cash-up";
import { SalesTable } from "./SalesTable";
import { withOrigin } from "@/lib/navigation/origin";

type Filter = "ALL" | SaleStatus;

const FILTERS: { value: Filter; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "TO_DELIVER", label: "To deliver" },
    { value: "DELIVERED", label: "Delivered" },
    { value: "DELETED", label: "Deleted" },
];

/** "All" means every sale that is not deleted. */
function matchesFilter(sale: Sale, filter: Filter): boolean {
    return filter === "ALL" ? sale.status !== "DELETED" : sale.status === filter;
}

/** Finds a sale by number ("105" or "#105") or by phone, ignoring spaces. */
function matchesSearch(sale: Sale, query: string): boolean {
    const text = query.trim().toLowerCase().replace(/^#/, "").replace(/\s/g, "");
    if (text === "") return true;
    const phone = sale.clientPhone.toLowerCase().replace(/\s/g, "");
    return phone.includes(text) || String(sale.number).includes(text);
}

export function SalesList({ sales }: { sales: Sale[] }) {
    const [filter, setFilter] = useState<Filter>("ALL");
    const [query, setQuery] = useState("");

    const options = FILTERS.map(({ value, label }) => ({
        value,
        label,
        count: sales.filter((sale) => matchesFilter(sale, value)).length,
    }));
    const visibleSales = sales.filter((sale) => matchesFilter(sale, filter) && matchesSearch(sale, query));

    if (sales.length === 0) {
        return (
            <div className="space-y-5">
                <FilterChips label="Filter sales" options={options} value={filter} onChange={setFilter} disabled />
                <EmptyState icon="tag" title="No sales yet" text="Add your first sale of the day. It shows here with its status.">
                    <div className="w-48">
                        {/* <ButtonLink href={routes.driver.addSale} className="gap-2"> */}
                        <ButtonLink href={withOrigin(routes.driver.addSale, "sales")} className="gap-2">
                            <Icon name="plus" size={16} />
                            Add first sale
                        </ButtonLink>
                    </div>
                </EmptyState>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
                <FilterChips label="Filter sales" options={options} value={filter} onChange={setFilter} />

                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Search client number or sale"
                    placeholder="Search client number or sale"
                    className="min-h-11 w-80 rounded-[10px] border border-line-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-ink"
                />
            </div>

            {visibleSales.length > 0 ? (
                <SalesTable sales={visibleSales} />
            ) : (
                <Card className="px-5 py-10 text-center text-sm text-muted">No sales match.</Card>
            )}
        </div>
    );
}
