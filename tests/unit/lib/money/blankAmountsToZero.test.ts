import { describe, expect, it } from "@jest/globals";
import { blankAmountsToZero } from "@/lib/money/blankAmountsToZero";

describe("blankAmountsToZero", () => {
    it("turns a blank or spaces-only currency into \"0\"", () => {
        expect(blankAmountsToZero({ usd: "5", lbp: "" })).toEqual({ usd: "5", lbp: "0" });
        expect(blankAmountsToZero({ usd: "  ", lbp: "1000" })).toEqual({ usd: "0", lbp: "1000" });
    });

    it("leaves typed text exactly as it is, so the action still judges it", () => {
        expect(blankAmountsToZero({ usd: "1,000.5", lbp: "." })).toEqual({ usd: "1,000.5", lbp: "." });
    });
});
