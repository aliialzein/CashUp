import { describe, expect, it } from "@jest/globals";
import { formatAmountInput, sanitizeAmountInput } from "../../../../src/lib/format/amountInput";

describe("sanitizeAmountInput", () => {
    it("keeps only digits for LBP", () => {
        expect(sanitizeAmountInput("1,000 abc", "LBP")).toBe("1000");
        expect(sanitizeAmountInput("12.5", "LBP")).toBe("125");
    });

    it("allows one dot and two decimals for USD", () => {
        expect(sanitizeAmountInput("1.239", "USD")).toBe("1.23");
        expect(sanitizeAmountInput("1.2.3", "USD")).toBe("1.23");
        expect(sanitizeAmountInput("12a", "USD")).toBe("12");
    });
});

describe("formatAmountInput", () => {
    it("adds thousands commas for display", () => {
        expect(formatAmountInput("1500")).toBe("1,500");
        expect(formatAmountInput("1234567")).toBe("1,234,567");
        expect(formatAmountInput("1234.5")).toBe("1,234.5");
    });

    it("keeps a trailing dot while the user is typing", () => {
        expect(formatAmountInput("12.")).toBe("12.");
    });
});
