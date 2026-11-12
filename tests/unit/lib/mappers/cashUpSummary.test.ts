import { formatIsoDay } from "@/lib/driver/mappers/businessTime";
import { mapCashUpSummary, type CashUpSummaryInput } from "@/lib/driver/mappers/cashUpSummary";
import { describe, expect, it } from "@jest/globals"

function row(overrides: Partial<CashUpSummaryInput> = {}): CashUpSummaryInput {
    return {
        id: "cash-up-1",
        number: 42,
        status: "SUBMITTED",
        returnReason: null,
        openedAt: "2026-10-28T06:30:00.000Z",
        salesCount: 7,
        gapUsd: "-1.00",
        gapLbp: "0.00",
        ...overrides,
    };
}

describe("formatIsoDay", () => {
    it("uses the Beirut day, not the UTC day", () => {
        // 22:30 UTC on 27 Oct is already 28 Oct in Beirut (UTC+2).
        expect(formatIsoDay("2026-10-27T22:30:00.000Z")).toBe("2026-10-28");
    });
});

describe("mapCashUpSummary", () => {
    it("maps the date texts and the sales count", () => {
        const result = mapCashUpSummary(row());
        expect(result.date).toBe("28 Oct");
        expect(result.isoDate).toBe("2026-10-28");
        expect(result.salesCount).toBe(7);
    });

    it("has no gap until it was submitted", () => {
        expect(mapCashUpSummary(row({ status: "OPEN", gapUsd: null, gapLbp: null })).gap).toBeNull();
        expect(mapCashUpSummary(row()).gap).not.toBeNull();
    });

    it("shows a returned cash-up with its reason", () => {
        const result = mapCashUpSummary(row({ status: "OPEN", returnReason: "Recount LBP", gapUsd: null, gapLbp: null }));
        expect(result.status).toBe("RETURNED");
        expect(result.returnReason).toBe("Recount LBP");
    });

    it("leaves returnReason out when nothing was returned", () => {
        expect(mapCashUpSummary(row()).returnReason).toBeUndefined();
    });
});
