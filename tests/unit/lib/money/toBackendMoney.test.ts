import { describe, expect, it } from "@jest/globals";
import { MONEY_PATTERN } from "@/domain/money/config";
import type { Currency } from "@/lib/format/money";
import { toBackendMoney } from "@/lib/money/toBackendMoney";

/** Every agreed example: what the driver typed -> what the backend receives. */
const EXAMPLES: [string, Currency, string][] = [
    ["100", "USD", "100.00"],
    ["100.00", "USD", "100.00"],
    ["99.5", "USD", "99.50"],
    ["99.50", "USD", "99.50"],
    ["100.", "USD", "100.00"],
    [".5", "USD", "0.50"],
    ["007", "USD", "7.00"],
    ["0", "USD", "0.00"],
    ["000", "USD", "0.00"],
    ["99.555", "USD", "99.55"],
    ["1,000.50", "USD", "1000.50"],
    ["1000", "LBP", "1000.00"],
    ["1,000,000", "LBP", "1000000.00"],
    ["1000.50", "LBP", "1000.00"],
    ["007", "LBP", "7.00"],
];

describe("toBackendMoney", () => {
    it.each(EXAMPLES)("turns %s (%s) into %s", (typed, currency, expected) => {
        expect(toBackendMoney(typed, currency)).toBe(expected);
    });

    it("gives null for an empty amount, so the caller decides what blank means", () => {
        expect(toBackendMoney("", "USD")).toBeNull();
        expect(toBackendMoney("", "LBP")).toBeNull();
        expect(toBackendMoney(".", "USD")).toBeNull();
    });

    it("gives null for text the input rule refuses", () => {
        expect(toBackendMoney("abc", "USD")).toBeNull();
        expect(toBackendMoney("1.2.3", "USD")).toBeNull();
        expect(toBackendMoney("1.000,50", "USD")).toBeNull();
        expect(toBackendMoney("99,5", "LBP")).toBeNull();
        expect(toBackendMoney(" 100", "LBP")).toBeNull();
        expect(toBackendMoney("-5", "USD")).toBeNull();
    });

    // The frontend must never send a shape the backend rejects ("100.", ".5", "007"...).
    it.each(EXAMPLES)("sends %s (%s) in a shape the backend accepts", (typed, currency) => {
        expect(toBackendMoney(typed, currency)).toMatch(MONEY_PATTERN);
    });
});
