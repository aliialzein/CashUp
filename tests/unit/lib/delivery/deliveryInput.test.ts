import { describe, expect, it } from "@jest/globals";
import { toDeliveryInput } from "@/lib/driver/delivery/deliveryInput";

const TYPED = {
    fee: { usd: "2", lbp: "" },
    tip: { usd: "", lbp: "" },
    paid: { usd: "30", lbp: "" },
    change: { usd: "8", lbp: "" },
};

describe("toDeliveryInput", () => {
    it("sends blank currencies as \"0\" and keeps typed amounts as typed", () => {
        expect(toDeliveryInput({ ...TYPED, method: "CASH" })).toEqual({
            deliveryFee: { usd: "2", lbp: "0" },
            tip: { usd: "0", lbp: "0" },
            method: "CASH",
            collected: { usd: "30", lbp: "0" },
            change: { usd: "8", lbp: "0" },
        });
    });

    it("sends no change for a wallet payment, whatever is left in the hidden change field", () => {
        expect(toDeliveryInput({ ...TYPED, method: "WHISH" }).change).toEqual({ usd: "0", lbp: "0" });
    });
});
