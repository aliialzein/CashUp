import { describe, expect, it } from "@jest/globals";
import { summarizeSinglePayment } from "../../../../src/lib/delivery/summarizeSinglePayment";
import { isZeroAmounts } from "../../../../src/lib/money/amounts";

const order = { usd: "20", lbp: "120000" };
const fee = { usd: "2", lbp: "0" };
const none = { usd: "0", lbp: "0" };

describe("summarizeSinglePayment", () => {
    it("a wallet payment is what the client sent, and nothing goes into the drawer", () => {
        const paid = { usd: "22", lbp: "120000" };
        const result = summarizeSinglePayment({ order, fee, method: "WHISH", paid, change: none });
        expect(result.intoDrawer).toEqual(none);
        expect(result.throughWallet).toEqual({ usd: "22", lbp: "120000" });
        expect(result.summary.hasGap).toBe(false);
    });

    it("a wallet payment that is short leaves money to collect, and change does not count", () => {
        const result = summarizeSinglePayment({
            order,
            fee,
            method: "OMT",
            paid: { usd: "20", lbp: "0" },
            change: { usd: "3", lbp: "0" },
        });
        expect(result.summary.remaining).toEqual({ usd: "2", lbp: "120000" });
        expect(result.suggestedChange).toEqual(none);
    });

    it("in cash, what stays in the drawer is paid minus change", () => {
        const paid = { usd: "25", lbp: "120000" };
        const result = summarizeSinglePayment({ order, fee, method: "CASH", paid, change: { usd: "3", lbp: "0" } });
        expect(result.intoDrawer).toEqual({ usd: "22", lbp: "120000" });
        expect(result.summary.hasGap).toBe(false);
    });

    it("suggests the change when the client handed over more than is due", () => {
        const paid = { usd: "25", lbp: "120000" };
        const result = summarizeSinglePayment({ order, fee, method: "CASH", paid, change: none });
        expect(result.suggestedChange).toEqual({ usd: "3", lbp: "0" });
        expect(result.summary.extra).toEqual({ usd: "3", lbp: "0" });
        expect(isZeroAmounts(result.summary.remaining)).toBe(true);
    });

    it("reports missing money per currency, never mixing USD and LBP", () => {
        const result = summarizeSinglePayment({ order, fee, method: "CASH", paid: { usd: "20", lbp: "0" }, change: none });
        expect(result.summary.remaining).toEqual({ usd: "2", lbp: "120000" });
        expect(result.summary.hasGap).toBe(true);
    });
});
