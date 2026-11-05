import { describe, expect, it } from "@jest/globals";
import { formatUsedAmounts } from "../../../../src/lib/format/usedAmounts";

describe("formatUsedAmounts", () => {
    it("shows only the currency that has an amount", () => {
        expect(formatUsedAmounts({ usd: "3", lbp: "0" })).toBe("3.00 USD");
    });

    it("shows both when both have an amount", () => {
        expect(formatUsedAmounts({ usd: "3", lbp: "1000" })).toBe("3.00 USD · 1,000 LBP");
    });

    it("is empty when there is nothing", () => {
        expect(formatUsedAmounts({ usd: "0", lbp: "0" })).toBe("");
    });
});
