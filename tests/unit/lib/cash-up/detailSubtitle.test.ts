import { describe, expect, it } from "@jest/globals";
import { detailSubtitle } from "../../../../src/lib/cash-up/detailSubtitle";
import type { CashUpDetail } from "../../../../src/types/cash-up";

const base: CashUpDetail = {
    id: "c-1",
    number: 1,
    status: "SUBMITTED",
    submittedAt: "27 Oct, 18:05",
    ledger: {
        float: { usd: "0", lbp: "0" },
        received: { usd: "0", lbp: "0" },
        changeGiven: { usd: "0", lbp: "0" },
        cashOuts: { usd: "0", lbp: "0" },
        expected: { usd: "0", lbp: "0" },
    },
    counted: { usd: "0", lbp: "0" },
    gap: { usd: "0", lbp: "0" },
    sales: [],
    cashOuts: [],
    deliveredTotal: { usd: "0", lbp: "0" },
    review: null,
};

describe("detailSubtitle", () => {
    it("says when a submitted cash-up was submitted", () => {
        expect(detailSubtitle(base)).toBe("Submitted 27 Oct, 18:05");
    });

    it("says who approved it and when", () => {
        const approved: CashUpDetail = { ...base, status: "APPROVED", review: { by: "Ali", at: "28 Oct, 09:10" } };
        expect(detailSubtitle(approved)).toBe("Approved 28 Oct, 09:10 by Ali");
    });
});
