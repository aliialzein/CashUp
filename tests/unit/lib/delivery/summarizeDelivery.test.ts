import { describe, expect, it } from "@jest/globals";
import { summarizeDelivery } from "../../../../src/lib/delivery/summarizeDelivery";

const order = { usd: "20", lbp: "120000" };
const fee = { usd: "2", lbp: "0" };
const none = { usd: "0", lbp: "0" };

describe("summarizeDelivery", () => {
    it("has no gap when cash + wallet cover order + fee", () => {
        const summary = summarizeDelivery({
            order,
            fee,
            cash: { usd: "15", lbp: "0" },
            wallet: { usd: "7", lbp: "120000" },
        });
        expect(summary.due).toEqual({ usd: "22", lbp: "120000" });
        expect(summary.paid).toEqual({ usd: "22", lbp: "120000" });
        expect(summary.hasGap).toBe(false);
    });
    
    it("reports what is still missing as negative", () => {
        const summary = summarizeDelivery({ order, fee, cash: { usd: "15", lbp: "0" }, wallet: none });
        expect(summary.gap).toEqual({ usd: "-7", lbp: "-120000" });
        expect(summary.remaining).toEqual({ usd: "7", lbp: "120000" });
        expect(summary.hasGap).toBe(true);
    });

    it("reports extra money as positive", () => {
        const summary = summarizeDelivery({ order, fee, cash: { usd: "30", lbp: "120000" }, wallet: none });
        expect(summary.gap).toEqual({ usd: "8", lbp: "0" });
        expect(summary.extra).toEqual({ usd: "8", lbp: "0" });
        expect(summary.hasGap).toBe(true);
    });
});
