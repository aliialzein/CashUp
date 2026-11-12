import { describe, expect, it } from "@jest/globals";
import { cleanAmountInput, formatAmountInput } from "../../../../src/lib/format/amountInput";

describe("cleanAmountInput", () => {
    it("keeps plain digits as typed, leading zeros included", () => {
        expect(cleanAmountInput("100", "USD")).toBe("100");
        expect(cleanAmountInput("007", "LBP")).toBe("007");
        expect(cleanAmountInput("", "USD")).toBe("");
    });

    it("removes a comma only when exactly 3 digits follow it", () => {
        expect(cleanAmountInput("1,000", "LBP")).toBe("1000");
        expect(cleanAmountInput("1,000,000", "LBP")).toBe("1000000");
        expect(cleanAmountInput("1,000.50", "USD")).toBe("1000.50");
    });

    it("refuses wrong commas, so the field keeps its previous value", () => {
        expect(cleanAmountInput("99,5", "USD")).toBeNull();
        expect(cleanAmountInput("1,00", "USD")).toBeNull();
        expect(cleanAmountInput("1,0005", "LBP")).toBeNull();
        expect(cleanAmountInput("1.000,50", "USD")).toBeNull();
        expect(cleanAmountInput("1.000,50", "LBP")).toBeNull();
    });

    it("refuses spaces, letters, signs and a second dot", () => {
        expect(cleanAmountInput(" 1000", "USD")).toBeNull();
        expect(cleanAmountInput("1 000", "LBP")).toBeNull();
        expect(cleanAmountInput("12a", "USD")).toBeNull();
        expect(cleanAmountInput("-5", "USD")).toBeNull();
        expect(cleanAmountInput("1.2.3", "USD")).toBeNull();
    });

    it("USD: keeps one dot and cuts decimals beyond two, never rounds", () => {
        expect(cleanAmountInput("99.5", "USD")).toBe("99.5");
        expect(cleanAmountInput("99.555", "USD")).toBe("99.55");
        expect(cleanAmountInput("99.559", "USD")).toBe("99.55");
    });

    it("USD: lets a dot stand while the driver is still typing", () => {
        expect(cleanAmountInput("100.", "USD")).toBe("100.");
        expect(cleanAmountInput(".5", "USD")).toBe(".5");
    });

    it("LBP: cuts the dot and everything after it, never rounds", () => {
        expect(cleanAmountInput("1000.50", "LBP")).toBe("1000");
        expect(cleanAmountInput("99.9", "LBP")).toBe("99");
        expect(cleanAmountInput("1,000.50", "LBP")).toBe("1000");
        expect(cleanAmountInput("100.", "LBP")).toBe("100");
    });
});

describe("formatAmountInput", () => {
    it("adds thousands commas for display", () => {
        expect(formatAmountInput("1500")).toBe("1,500");
        expect(formatAmountInput("10005")).toBe("10,005");
        expect(formatAmountInput("1234567")).toBe("1,234,567");
        expect(formatAmountInput("1234.5")).toBe("1,234.5");
    });

    it("keeps a trailing dot while the user is typing", () => {
        expect(formatAmountInput("12.")).toBe("12.");
    });
});
