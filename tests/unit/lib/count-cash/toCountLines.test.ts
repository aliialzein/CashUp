import { describe, expect, it } from "@jest/globals";
import { DENOMINATIONS, emptyCounts } from "../../../../src/lib/count-cash/denominations";
import { toCountLines } from "../../../../src/lib/count-cash/toCountLines";

const empty = { USD: emptyCounts("USD"), LBP: emptyCounts("LBP") };

describe("toCountLines", () => {
    it("sends every note, zeros included (13 lines)", () => {
        const lines = toCountLines(empty);
        expect(lines).toHaveLength(DENOMINATIONS.USD.length + DENOMINATIONS.LBP.length);
        expect(lines.every((line) => line.quantity === 0)).toBe(true);
    });

    it("pads denominations to two decimals, like the API", () => {
        const lines = toCountLines(empty);
        expect(lines.map((line) => line.denomination)).toEqual(
            expect.arrayContaining(["100.00", "1.00", "0.10", "100000.00", "1000.00"]),
        );
    });

    it("carries the counted quantities per currency", () => {
        const lines = toCountLines({
            USD: { ...empty.USD, "20": 2, "0.10": 7 },
            LBP: { ...empty.LBP, "100000": 3 },
        });
        expect(lines).toContainEqual({ currency: "USD", denomination: "20.00", quantity: 2 });
        expect(lines).toContainEqual({ currency: "USD", denomination: "0.10", quantity: 7 });
        expect(lines).toContainEqual({ currency: "LBP", denomination: "100000.00", quantity: 3 });
    });

    it("has no duplicate currency and denomination pairs", () => {
        const keys = toCountLines(empty).map((line) => `${line.currency}:${line.denomination}`);
        expect(new Set(keys).size).toBe(keys.length);
    });
});
