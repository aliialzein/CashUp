import { describe, expect, it } from "@jest/globals";
import { groupByMonth } from "../../../../src/lib/driver/history/groupByMonth";
import { mapCashUpSummary } from "../../../../src/lib/driver/mappers/cashUpSummary";
import type { CashUpSummary } from "../../../../src/types/driver/cash-up";

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

describe("groupByMonth with the real history mapper (Beirut months, not UTC)", () => {
    /** A history row opened at this UTC moment, mapped like the backend's rows are. */
    function openedAt(id: string, iso: string): CashUpSummary {
        return mapCashUpSummary({
            id,
            number: 1,
            status: "APPROVED",
            returnReason: null,
            openedAt: iso,
            salesCount: 1,
            gapUsd: "0.00",
            gapLbp: "0.00",
        });
    }

    it("puts a cash-up opened at 01:00 Beirut on 1 November in November, though it is still 31 October in UTC", () => {
        const groups = groupByMonth([openedAt("nov", "2026-10-31T23:00:00.000Z"), openedAt("oct", "2026-10-31T21:30:00.000Z")]);

        expect(groups.map((g) => g.label)).toEqual(["November 2026", "October 2026"]);
        expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([["nov"], ["oct"]]);
    });

    it("does the same in summer time (Beirut is UTC+3): 01:00 Beirut on 1 July is in July", () => {
        expect(groupByMonth([openedAt("jul", "2026-06-30T22:00:00.000Z")])[0].label).toBe("July 2026");
    });
});
