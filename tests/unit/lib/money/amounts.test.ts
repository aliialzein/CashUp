import { describe, expect, it } from "@jest/globals";
import { addAmounts, clampAtZero, isZeroAmounts, subtractAmounts } from "../../../../src/lib/money/amounts";

describe("amounts", () => {
    it("adds per currency without float errors", () => {
        expect(addAmounts({ usd: "0.1", lbp: "1000" }, { usd: "0.2", lbp: "500" })).toEqual({
            usd: "0.3",
            lbp: "1500",
        });
    });

    it("subtracts and can go negative", () => {
        expect(subtractAmounts({ usd: "15", lbp: "0" }, { usd: "22", lbp: "0" })).toEqual({
            usd: "-7",
            lbp: "0",
        });
    });

    it("treats empty or unfinished typing as zero", () => {
        expect(addAmounts({ usd: "", lbp: "." }, { usd: "5", lbp: "12." })).toEqual({
            usd: "5",
            lbp: "12",
        });
    });

    it("detects zero", () => {
        expect(isZeroAmounts({ usd: "0", lbp: "0" })).toBe(true);
        expect(isZeroAmounts({ usd: "0", lbp: "1" })).toBe(false);
    });

    it("clamps negatives at zero", () => {
        expect(clampAtZero({ usd: "-7", lbp: "120" })).toEqual({ usd: "0", lbp: "120" });
    });
});
