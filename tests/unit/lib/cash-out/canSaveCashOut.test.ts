import { describe, expect, it } from "@jest/globals";
import { canSaveCashOut } from "../../../../src/lib/cash-out/canSaveCashOut";

describe("canSaveCashOut", () => {
    it("needs an amount in at least one currency", () => {
        expect(canSaveCashOut({ amount: { usd: "", lbp: "" }, reason: "Fuel", detail: "" })).toBe(false);
        expect(canSaveCashOut({ amount: { usd: "0", lbp: "0" }, reason: "Fuel", detail: "" })).toBe(false);
        expect(canSaveCashOut({ amount: { usd: "5", lbp: "" }, reason: "Fuel", detail: "" })).toBe(true);
        expect(canSaveCashOut({ amount: { usd: "", lbp: "200000" }, reason: "Supplier", detail: "" })).toBe(true);
    });

    it("needs a written explanation when the reason is Other", () => {
        const amount = { usd: "5", lbp: "" };
        expect(canSaveCashOut({ amount, reason: "Other", detail: "" })).toBe(false);
        expect(canSaveCashOut({ amount, reason: "Other", detail: "   " })).toBe(false);
        expect(canSaveCashOut({ amount, reason: "Other", detail: "Car wash" })).toBe(true);
    });

    it("ignores the explanation for the other reasons", () => {
        expect(canSaveCashOut({ amount: { usd: "5", lbp: "" }, reason: "Fuel", detail: "" })).toBe(true);
    });
});
