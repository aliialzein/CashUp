import { describe, expect, it } from "@jest/globals";
import { lastClosedCashUp } from "../../../../src/lib/history/lastClosedCashUp";
import type { CashUpStatus, CashUpSummary } from "../../../../src/types/cash-up";

function item(id: string, status: CashUpStatus): CashUpSummary {
    return { id, number: 1, status, date: "28 Oct", isoDate: "2026-10-28", salesCount: 1, gap: null };
}

describe("lastClosedCashUp", () => {
    it("skips open and returned cash-ups", () => {
        const history = [item("a", "OPEN"), item("b", "RETURNED"), item("c", "SUBMITTED"), item("d", "APPROVED")];
        expect(lastClosedCashUp(history)?.id).toBe("c");
    });

    it("finds an approved one", () => {
        expect(lastClosedCashUp([item("a", "APPROVED")])?.id).toBe("a");
    });

    it("returns null when nothing was submitted yet", () => {
        expect(lastClosedCashUp([item("a", "OPEN")])).toBeNull();
        expect(lastClosedCashUp([])).toBeNull();
    });
});
