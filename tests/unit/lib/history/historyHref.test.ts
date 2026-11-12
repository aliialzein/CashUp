import { describe, expect, it } from "@jest/globals";
import { historyHref, salesLabel } from "../../../../src/lib/driver/history/historyHref";
import { routes } from "../../../../src/lib/routes";
import type { CashUpStatus, CashUpSummary } from "../../../../src/types/driver/cash-up";

function item(status: CashUpStatus): CashUpSummary {
    return { id: "c-7", number: 7, status, date: "1 Oct", isoDate: "2026-10-01", salesCount: 1, gap: null };
}

describe("historyHref", () => {
    it("sends open and returned cash-ups to Today", () => {
        expect(historyHref(item("OPEN"))).toBe(routes.driver.today);
        expect(historyHref(item("RETURNED"))).toBe(routes.driver.today);
    });

    it("sends submitted and approved cash-ups to their detail page", () => {
        expect(historyHref(item("SUBMITTED"))).toBe(routes.driver.historyDetail("c-7"));
        expect(historyHref(item("APPROVED"))).toBe(routes.driver.historyDetail("c-7"));
    });
});

describe("salesLabel", () => {
    it("uses the singular for one sale", () => {
        expect(salesLabel(1)).toBe("1 sale");
        expect(salesLabel(0)).toBe("0 sales");
        expect(salesLabel(3)).toBe("3 sales");
    });
});
