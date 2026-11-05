"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { Icon } from "@/components/ui/Icon";
import { SearchField } from "@/components/ui/SearchField";
import { withOrigin } from "@/lib/navigation/origin";
import { routes } from "@/lib/routes";
import type { Sale, SaleStatus } from "@/types/cash-up";
import { SaleCards } from "./SaleCards";
import { SalesTable } from "./SalesTable";

type Filter = "ALL" | SaleStatus;

const FILTERS: { value: Filter; label: string; dot?: string }[] = [
    { value: "ALL", label: "All" },
    { value: "TO_DELIVER", label: "To deliver", dot: "bg-amber-600" },
    { value: "DELIVERED", label: "Delivered", dot: "bg-emerald-600" },
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

type ToolbarProps = {
    options: { value: Filter; label: string; dot?: string; count: number }[];
    filter: Filter;
    onFilter: (value: Filter) => void;
    query: string;
    onQuery: (value: string) => void;
    /** With no sales yet, desktop greys the chips and hides the search. Phone keeps both. */
    empty: boolean;
};

/** Phone: search above the chips. Desktop: chips on the left, search on the right. */
function Toolbar({ options, filter, onFilter, query, onQuery, empty }: ToolbarProps) {
    return (
        <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            <FilterChips label="Filter sales" options={options} value={filter} onChange={onFilter} disabled={empty} />
            <SearchField
                value={query}
                onChange={onQuery}
                label="Search client number or sale"
                placeholder="Search client number or sale"
                className={empty ? "md:hidden" : ""}
            />
        </div>
    );
}

export function SalesList({ sales }: { sales: Sale[] }) {
    const [filter, setFilter] = useState<Filter>("ALL");
    const [query, setQuery] = useState("");

    const options = FILTERS.map((item) => ({
        ...item,
        count: sales.filter((sale) => matchesFilter(sale, item.value)).length,
    }));
    const visibleSales = sales.filter((sale) => matchesFilter(sale, filter) && matchesSearch(sale, query));
    const toolbar = (
        <Toolbar
            options={options}
            filter={filter}
            onFilter={setFilter}
            query={query}
            onQuery={setQuery}
            empty={sales.length === 0}
        />
    );

    if (sales.length === 0) {
        return (
            <div className="flex flex-col gap-3 md:gap-5">
                {toolbar}
                <EmptyState
                    icon="tag"
                    title="No sales yet"
                    text={
                        <>
                            <span className="md:hidden">
                                Add your first sale and it will show here. Deliveries waiting to be completed appear at the top.
                            </span>
                            <span className="hidden md:inline">Add your first sale of the day. It shows here with its status.</span>
                        </>
                    }
                    className="mt-3 max-md:[&>div]:hidden md:mt-0"
                >
                    {/* Desktop only: on phone the Add sale button in the title bar is the only one. */}
                    <div className="w-48">
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
        <div className="flex flex-col gap-3 md:gap-5">
            {toolbar}

            {visibleSales.length > 0 ? (
                <>
                    <div className="md:hidden">
                        <SaleCards sales={visibleSales} origin="sales" />
                    </div>
                    <div className="hidden md:block">
                        <SalesTable sales={visibleSales} />
                    </div>
                </>
            ) : (
                <Card className="px-5 py-10 text-center text-sm text-muted">No sales match.</Card>
            )}
        </div>
    );
}
