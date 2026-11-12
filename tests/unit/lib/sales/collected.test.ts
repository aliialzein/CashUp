import { describe, expect, it } from "@jest/globals";
import { collectedAmounts, keptAmounts, saleAmountLine } from "../../../../src/lib/driver/sales/collected";
import { CLIENT_PAID_LABEL } from "../../../../src/lib/driver/sales/saleLabels";
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

describe("collectedAmounts (what the client paid)", () => {
    it("uses the total the server saved", () => {
        const totalCollected = { usd: "31", lbp: "120000" };
        expect(collectedAmounts(sale({ totalCollected, deliveryFee: { usd: "2", lbp: "0" } }))).toBe(totalCollected);
    });

    it("falls back to order + delivery fee", () => {
        expect(collectedAmounts(sale({ deliveryFee: { usd: "2", lbp: "50000" } }))).toEqual({ usd: "27", lbp: "170000" });
    });

    it("is the order amount when there is no fee", () => {
        expect(collectedAmounts(sale({}))).toEqual({ usd: "25", lbp: "120000" });
    });

    it("falls back like the backend's balance rule: what was owed (with tip, minus discount) plus the change", () => {
        const paid = collectedAmounts(
            sale({
                deliveryFee: { usd: "2", lbp: "0" },
                tip: { usd: "1", lbp: "0" },
                discount: { usd: "0", lbp: "20000" },
                changeGiven: { usd: "3", lbp: "0" },
            }),
        );
        expect(paid).toEqual({ usd: "31", lbp: "100000" });
    });
});

describe("keptAmounts (client paid minus change given)", () => {
    it("keeps 28 USD when the client paid 31 USD and got 3 USD back (sale #105)", () => {
        const kept = keptAmounts(
            sale({ totalCollected: { usd: "31", lbp: "120000" }, changeGiven: { usd: "3", lbp: "0" } }),
        );
        expect(kept).toEqual({ usd: "28", lbp: "120000" });
    });

    it("is what the client paid when no change was given", () => {
        expect(keptAmounts(sale({ totalCollected: { usd: "15", lbp: "0" } }))).toEqual({ usd: "15", lbp: "0" });
    });

    it("never converts: change given in LBP for a USD payment makes the LBP side negative", () => {
        const kept = keptAmounts(
            sale({ totalCollected: { usd: "20", lbp: "0" }, changeGiven: { usd: "0", lbp: "90000" } }),
        );
        expect(kept).toEqual({ usd: "20", lbp: "-90000" });
    });
});

describe("saleAmountLine", () => {
    it("shows what the client paid for a delivered sale, with the shared label", () => {
        const line = saleAmountLine(sale({ deliveryFee: { usd: "2", lbp: "0" } }));
        expect(line.label).toBe(CLIENT_PAID_LABEL);
        expect(line.label).toBe("Client paid");
        expect(line.amounts.usd).toBe("27");
    });

    it("shows the order amount for a waiting or deleted sale", () => {
        expect(saleAmountLine(sale({ status: "TO_DELIVER" })).label).toBe("To collect");
        expect(saleAmountLine(sale({ status: "DELETED" })).label).toBe("Order amount");
        expect(saleAmountLine(sale({ status: "TO_DELIVER", deliveryFee: { usd: "2", lbp: "0" } })).amounts.usd).toBe("25");
    });
});
