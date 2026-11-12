import { describe, expect, it } from "@jest/globals";
import { checkCount } from "@/lib/driver/count-cash/checkCount";
import { emptyCounts } from "@/lib/driver/count-cash/denominations";

const zeroCount = () => ({ USD: emptyCounts("USD"), LBP: emptyCounts("LBP") });

describe("checkCount", () => {
    it("accepts a full count", () => {
        const count = zeroCount();
        count.USD["20"] = 3;
        count.LBP["100000"] = 12;

        expect(checkCount(count)).toBeNull();
    });

    it("accepts all zeros, because a drawer can really be empty", () => {
        expect(checkCount(zeroCount())).toBeNull();
    });

    it.each([undefined, null, "count"])("asks for a count when it is missing (%p)", (missing) => {
        expect(checkCount(missing)).toBe("COUNT_REQUIRED");
    });

    it("asks for a count when one currency is missing", () => {
        expect(checkCount({ USD: emptyCounts("USD") })).toBe("COUNT_REQUIRED");
    });

    it.each([-1, 1.5, 10000, "3"])("refuses a note count of %p", (badQuantity) => {
        const count: Record<string, Record<string, unknown>> = zeroCount();
        count.USD["10"] = badQuantity;

        expect(checkCount(count)).toBe("COUNT_INVALID");
    });

    it("refuses a count with a note left out", () => {
        const count = zeroCount();
        delete count.LBP["5000"];

        expect(checkCount(count)).toBe("COUNT_INVALID");
    });
});
