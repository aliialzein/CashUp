import { describe, expect, it } from "@jest/globals";
import { capAmountInput } from "../../../../src/lib/money/amountLimits";

describe("capAmountInput", () => {
    it("accepts amounts up to the maximum", () => {
        expect(capAmountInput("999999.99", "999999.9", "USD")).toBe("999999.99");
        expect(capAmountInput("1000000", "100000", "USD")).toBe("1000000");
        expect(capAmountInput("100000000000", "10000000000", "LBP")).toBe("100000000000");
    });

    it("keeps the previous value when the maximum is exceeded", () => {
        expect(capAmountInput("10000000", "1000000", "USD")).toBe("1000000");
        expect(capAmountInput("1000000.01", "1000000", "USD")).toBe("1000000");
        expect(capAmountInput("1000000000000", "100000000000", "LBP")).toBe("100000000000");
    });

    it("does not touch text that has no digits yet", () => {
        expect(capAmountInput("", "5", "USD")).toBe("");
        expect(capAmountInput(".", "", "USD")).toBe(".");
    });
});
