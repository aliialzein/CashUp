import { describe, expect, it } from "@jest/globals";
import { activeCashOuts } from "@/lib/driver/cash-out/activeCashOuts";
import type { CashOut } from "@/types/driver/cash-up";

function cashOut(id: string, isDeleted: boolean): CashOut {
    return { id, reason: "Fuel", time: "09:00", amount: { usd: "5.00", lbp: "0.00" }, isDeleted };
}

describe("activeCashOuts", () => {
    it("hides deleted cash-outs and keeps the others in their order", () => {
        const result = activeCashOuts([cashOut("a", false), cashOut("b", true), cashOut("c", false)]);

        expect(result.map((kept) => kept.id)).toEqual(["a", "c"]);
    });

    it("gives an empty list when every cash-out is deleted", () => {
        expect(activeCashOuts([cashOut("a", true)])).toEqual([]);
    });
});
