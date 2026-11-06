import { describe, expect, it } from "@jest/globals";
import { matchesHistoryFilter } from "../../../../src/lib/history/filters";
import type { CashUpSummary } from "../../../../src/types/cash-up";

function cashUp(overrides: Partial<CashUpSummary>): CashUpSummary {
    return {
        id: "c-1",
        number: 1,
        status: "APPROVED",
        date: "1 Oct", isoDate: "2026-10-01",
        salesCount: 1,
        gap: { usd: "0", lbp: "0" },
        ...overrides,
    };
}

describe("matchesHistoryFilter", () => {
    it("matches by status", () => {
        expect(matchesHistoryFilter(cashUp({ status: "OPEN", gap: null }), "IN_PROGRESS")).toBe(true);
        expect(matchesHistoryFilter(cashUp({ status: "SUBMITTED" }), "SUBMITTED")).toBe(true);
        expect(matchesHistoryFilter(cashUp({ status: "SUBMITTED" }), "APPROVED")).toBe(false);
        expect(matchesHistoryFilter(cashUp({ status: "RETURNED", gap: null }), "RETURNED")).toBe(true);
    });

    it("shows everything under All", () => {
        expect(matchesHistoryFilter(cashUp({ status: "OPEN", gap: null }), "ALL")).toBe(true);
    });

    it("matched means zero gap in both currencies", () => {
        expect(matchesHistoryFilter(cashUp({}), "MATCHED")).toBe(true);
        expect(matchesHistoryFilter(cashUp({ gap: { usd: "0", lbp: "-10000" } }), "MATCHED")).toBe(false);
        expect(matchesHistoryFilter(cashUp({ status: "OPEN", gap: null }), "MATCHED")).toBe(false);
    });

    it("needs attention means returned or short in any currency", () => {
        expect(matchesHistoryFilter(cashUp({ status: "RETURNED", gap: null }), "NEEDS_ATTENTION")).toBe(true);
        expect(matchesHistoryFilter(cashUp({ gap: { usd: "0", lbp: "-10000" } }), "NEEDS_ATTENTION")).toBe(true);
        expect(matchesHistoryFilter(cashUp({ gap: { usd: "-2", lbp: "0" } }), "NEEDS_ATTENTION")).toBe(true);
    });

    it("does not flag extra money, matches or open cash-ups", () => {
        expect(matchesHistoryFilter(cashUp({ gap: { usd: "5", lbp: "0" } }), "NEEDS_ATTENTION")).toBe(false);
        expect(matchesHistoryFilter(cashUp({}), "NEEDS_ATTENTION")).toBe(false);
        expect(matchesHistoryFilter(cashUp({ status: "OPEN", gap: null }), "NEEDS_ATTENTION")).toBe(false);
    });
});