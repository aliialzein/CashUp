import { describe, expect, it } from "@jest/globals";
import { gapStatus, parseCount, totalOfNotes } from "../../../../src/lib/count-cash/calculations";

describe("totalOfNotes", () => {
    it("adds up the notes of one currency", () => {
        expect(totalOfNotes({ "20": 2, "10": 1, "5": 2 })).toBe("60");
        expect(totalOfNotes({ "100000": 12, "50000": 1, "20000": 2 })).toBe("1290000");
    });

    it("is 0 when nothing is counted", () => {
        expect(totalOfNotes({})).toBe("0");
        expect(totalOfNotes({ "100": 0, "50": 0 })).toBe("0");
    });
});

describe("parseCount", () => {
    it("keeps only the digits", () => {
        expect(parseCount("12")).toBe(12);
        expect(parseCount("1a2")).toBe(12);
        expect(parseCount("007")).toBe(7);
    });

    it("is 0 for empty or non-numeric text", () => {
        expect(parseCount("")).toBe(0);
        expect(parseCount("abc")).toBe(0);
    });

    it("never goes above the maximum", () => {
        expect(parseCount("9999")).toBe(9999);
        expect(parseCount("99999")).toBe(9999);
    });
});

describe("gapStatus", () => {
    it("tells whether the count matches, is short or is over", () => {
        expect(gapStatus("0")).toBe("match");
        expect(gapStatus("0.00")).toBe("match");
        expect(gapStatus("-10000")).toBe("short");
        expect(gapStatus("5")).toBe("over");
    });
});
