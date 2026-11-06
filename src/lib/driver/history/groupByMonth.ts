import type { CashUpSummary } from "@/types/driver/cash-up";

export type MonthGroup = {
    /** "2026-10" */
    key: string;
    /** "October 2026" */
    label: string;
    items: CashUpSummary[];
};

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/** Splits a newest-first list into one group per month, keeping the order. */
export function groupByMonth(items: CashUpSummary[]): MonthGroup[] {
    const groups: MonthGroup[] = [];
    for (const item of items) {
        const key = item.isoDate.slice(0, 7);
        const last = groups[groups.length - 1];
        if (last?.key === key) {
            last.items.push(item);
        } else {
            groups.push({ key, label: monthFormatter.format(new Date(`${key}-01T00:00:00Z`)), items: [item] });
        }
    }
    return groups;
}
