import { describe, expect, it } from "@jest/globals";
import { openingFloat } from "../../../../src/lib/cash-up/openingFloat";

describe("openingFloat", () => {
    it("keeps what the driver typed", () => {
        expect(openingFloat({ usd: "50", lbp: "1000000" })).toEqual({ usd: "50", lbp: "1000000" });
    });

    it("turns a blank currency into zero", () => {
        expect(openingFloat({ usd: "", lbp: "1000000" })).toEqual({ usd: "0", lbp: "1000000" });
        expect(openingFloat({ usd: "50", lbp: "  " })).toEqual({ usd: "50", lbp: "0" });
    });

    it("allows zero in both currencies", () => {
        expect(openingFloat({ usd: "", lbp: "" })).toEqual({ usd: "0", lbp: "0" });
    });
});
