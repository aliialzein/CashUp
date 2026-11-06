import { describe, expect, it } from "@jest/globals";
import { canCancelCashUp } from "../../../../src/lib/driver/cash-up/canCancelCashUp";
import type { CashOut, Sale } from "../../../../src/types/driver/cash-up";

const sale: Sale = {
    id: "s-1",
    number: 1,
    clientPhone: "Shop sale",
    time: "09:00",
    status: "DELETED",
    amount: { usd: "1", lbp: "0" },
};
const cashOut: CashOut = { id: "o-1", reason: "Fuel", time: "09:00", amount: { usd: "5", lbp: "0" } };

describe("canCancelCashUp", () => {
    it("allows an open cash-up with nothing recorded", () => {
        expect(canCancelCashUp({ status: "OPEN", sales: [], cashOuts: [] })).toBe(true);
    });

    it("blocks it once a sale exists, even a deleted one", () => {
        expect(canCancelCashUp({ status: "OPEN", sales: [sale], cashOuts: [] })).toBe(false);
    });

    it("blocks it once a cash-out exists", () => {
        expect(canCancelCashUp({ status: "OPEN", sales: [], cashOuts: [cashOut] })).toBe(false);
    });

    it("blocks a returned cash-up", () => {
        expect(canCancelCashUp({ status: "RETURNED", sales: [], cashOuts: [] })).toBe(false);
    });
});
