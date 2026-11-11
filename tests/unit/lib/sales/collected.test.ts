import { describe, expect, it } from "@jest/globals";
import { collectedAmounts, saleAmountLine, totalCollected } from "../../../../src/lib/driver/sales/collected";
import type { Sale } from "../../../../src/types/driver/cash-up";

function sale(overrides: Partial<Sale>): Sale {
    return {
        id: "s-1",
        number: 1,
        clientPhone: "",
        clientNumber: null,
        time: "10:00",
        status: "DELIVERED",
        amount: { usd: "25", lbp: "120000" },
        ...overrides,
    };
}

describe("collectedAmounts", () => {
    it("uses the total the server calculated", () => {
        const totalCollected = { usd: "28", lbp: "120000" };
        expect(collectedAmounts(sale({ totalCollected, deliveryFee: { usd: "2", lbp: "0" } }))).toBe(totalCollected);
    });

    it("falls back to order + delivery fee", () => {
        const result = collectedAmounts(sale({ deliveryFee: { usd: "2", lbp: "50000" } }));
        expect(Number(result.usd)).toBe(27);
        expect(Number(result.lbp)).toBe(170000);
    });

    it("is the order amount when there is no fee", () => {
        const result = collectedAmounts(sale({}));
        expect(Number(result.usd)).toBe(25);
        expect(Number(result.lbp)).toBe(120000);
    });
});

describe("totalCollected", () => {
    it("adds up what each sale collected, per currency", () => {
        const total = totalCollected([
            sale({ deliveryFee: { usd: "2", lbp: "0" } }),
            sale({ amount: { usd: "10", lbp: "0" }, totalCollected: { usd: "9", lbp: "50000" } }),
        ]);
        expect(Number(total.usd)).toBe(36);
        expect(Number(total.lbp)).toBe(170000);
    });

    it("is zero for no sales", () => {
        const total = totalCollected([]);
        expect(Number(total.usd)).toBe(0);
        expect(Number(total.lbp)).toBe(0);
    });
});

describe("saleAmountLine", () => {
    it("shows what was collected for a delivered sale", () => {
        const line = saleAmountLine(sale({ deliveryFee: { usd: "2", lbp: "0" } }));
        expect(line.label).toBe("Collected");
        expect(Number(line.amounts.usd)).toBe(27);
    });

    it("shows the order amount for a waiting or deleted sale", () => {
        expect(saleAmountLine(sale({ status: "TO_DELIVER" })).label).toBe("To collect");
        expect(saleAmountLine(sale({ status: "DELETED" })).label).toBe("Order amount");
        expect(saleAmountLine(sale({ status: "TO_DELIVER", deliveryFee: { usd: "2", lbp: "0" } })).amounts.usd).toBe("25");
    });
});
