import { describe, expect, it } from "@jest/globals";
import { cashOutFilterView, type CashOutFilter } from "@/lib/driver/cash-out/cashOutFilters";
import { mapCashOut, type CashOutInput } from "@/lib/driver/mappers/cashOut";
import type { CashOut } from "@/types/driver/cash-up";

function cashOut(id: string, reason: CashOut["reason"], isDeleted = false): CashOut {
    return { id, reason, time: "10:00", amount: { usd: "5", lbp: "0" }, isDeleted };
}

const CASH_OUTS: CashOut[] = [
    cashOut("fuel-1", "Fuel"),
    cashOut("fuel-2", "Fuel"),
    cashOut("supplier-1", "Supplier"),
    cashOut("other-1", "Other"),
    cashOut("fuel-deleted", "Fuel", true),
    cashOut("supplier-deleted", "Supplier", true),
];

function countsOf(cashOuts: readonly CashOut[]): Record<CashOutFilter, number> {
    const { chips } = cashOutFilterView(cashOuts, "ALL");
    return Object.fromEntries(chips.map((chip) => [chip.value, chip.count])) as Record<CashOutFilter, number>;
}

function idsShown(selected: CashOutFilter): string[] {
    return cashOutFilterView(CASH_OUTS, selected).shown.map((shownCashOut) => shownCashOut.id);
}

describe("cashOutFilterView", () => {
    it("lists the chips in the design's order", () => {
        const labels = cashOutFilterView(CASH_OUTS, "ALL").chips.map((chip) => chip.label);
        expect(labels).toEqual(["All", "Fuel", "Supplier", "Change top-up", "Other", "Deleted"]);
    });

    it("counts each chip, with All and the categories leaving deleted cash-outs out", () => {
        expect(countsOf(CASH_OUTS)).toEqual({
            ALL: 4,
            Fuel: 2,
            Supplier: 1,
            "Change top-up": 0,
            Other: 1,
            DELETED: 2,
        });
    });

    it("All shows every cash-out that is not deleted", () => {
        expect(idsShown("ALL")).toEqual(["fuel-1", "fuel-2", "supplier-1", "other-1"]);
    });

    it("a category shows only its cash-outs that are not deleted", () => {
        expect(idsShown("Fuel")).toEqual(["fuel-1", "fuel-2"]);
        expect(idsShown("Change top-up")).toEqual([]);
    });

    it("Deleted shows only the deleted cash-outs", () => {
        expect(idsShown("DELETED")).toEqual(["fuel-deleted", "supplier-deleted"]);
    });

    it("counts an unknown backend reason as Other", () => {
        const fromBackend: CashOutInput = {
            id: "old-1",
            amountUsd: "3.00",
            amountLbp: "0.00",
            reason: "Bank deposit",
            note: null,
            status: "ACTIVE",
            cancelReason: null,
            createdAt: "2026-10-28T06:30:00.000Z",
        };

        expect(countsOf([mapCashOut(fromBackend)]).Other).toBe(1);
    });

    it("gives no total: Total out comes from the server, which already leaves deleted cash-outs out", () => {
        expect(Object.keys(cashOutFilterView(CASH_OUTS, "DELETED")).sort()).toEqual(["chips", "shown"]);
    });

    it("counts zero everywhere for an empty list", () => {
        const { chips, shown } = cashOutFilterView([], "ALL");
        expect(chips.every((chip) => chip.count === 0)).toBe(true);
        expect(shown).toEqual([]);
    });
});
