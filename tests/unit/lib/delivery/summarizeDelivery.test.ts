import { describe, expect, it } from "@jest/globals";
import { summarizeDelivery } from "../../../../src/lib/driver/delivery/summarizeDelivery";

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

    it("adds the tip and takes off the discount, each in its own currency", () => {
        const summary = summarizeDelivery({
            order,
            fee,
            tip: { usd: "1", lbp: "0" },
            discount: { usd: "0", lbp: "20000" },
            cash: { usd: "23", lbp: "100000" },
            wallet: none,
        });
        expect(summary.due).toEqual({ usd: "23", lbp: "100000" });
        expect(summary.hasGap).toBe(false);
    });

    it("treats a missing tip and discount as none", () => {
        expect(summarizeDelivery({ order, fee, cash: none, wallet: none }).due).toEqual({ usd: "22", lbp: "120000" });
    });
});
