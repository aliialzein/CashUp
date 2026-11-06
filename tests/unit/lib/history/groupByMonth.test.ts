import { describe, expect, it } from "@jest/globals";
import { groupByMonth } from "../../../../src/lib/driver/history/groupByMonth";
import type { CashUpSummary } from "../../../../src/types/cash-up";

function item(id: string, isoDate: string): CashUpSummary {
    return { id, number: 1, status: "APPROVED", date: "x", isoDate, salesCount: 1, gap: null };
}

describe("groupByMonth", () => {
    it("puts cash-ups of the same month in one group", () => {
        const groups = groupByMonth([item("a", "2026-10-28"), item("b", "2026-10-27")]);
        expect(groups).toHaveLength(1);
        expect(groups[0].label).toBe("October 2026");
        expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b"]);
    });

    it("starts a new group when the month changes, newest first", () => {
        const groups = groupByMonth([item("a", "2026-11-02"), item("b", "2026-10-30"), item("c", "2026-10-29")]);
        expect(groups.map((g) => g.label)).toEqual(["November 2026", "October 2026"]);
        expect(groups[1].items).toHaveLength(2);
    });

    it("separates the same month of different years", () => {
        const groups = groupByMonth([item("a", "2026-01-05"), item("b", "2025-01-05")]);
        expect(groups.map((g) => g.label)).toEqual(["January 2026", "January 2025"]);
    });

    it("returns no groups for an empty list", () => {
        expect(groupByMonth([])).toEqual([]);
    });
});
