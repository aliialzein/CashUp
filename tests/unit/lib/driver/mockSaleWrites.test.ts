import { describe, expect, it } from "@jest/globals";
import { getOpenCashUp } from "@/lib/driver/mock/today";
import { mockSaleWrites } from "@/lib/driver/sales/mockSaleWrites";
import type { SaleDetails } from "@/lib/driver/sales/saleWriteGateway";
import type { Sale } from "@/types/driver/cash-up";

// The mock gateway changes the shared mock cash-up in memory; each test adds its own sale, so they do not collide.

const DETAILS: SaleDetails = {
    amount: { usd: "10.00", lbp: "0.00" },
    deliveryFee: { usd: "2.00", lbp: "0.00" },
    discount: { usd: "0.00", lbp: "0.00" },
    clientNumber: "+96170123456",
    note: "Gate 2",
};
const DELIVERY = {
    deliveryFee: { usd: "3.00", lbp: "0.00" },
    tip: { usd: "1.00", lbp: "0.00" },
    method: "CASH" as const,
    collected: { usd: "20.00", lbp: "0.00" },
    change: { usd: "6.00", lbp: "0.00" },
};

function openSales(): Sale[] {
    const cashUp = getOpenCashUp();
    if (cashUp === null) throw new Error("the mock scenario must have an open cash-up for these tests");
    return cashUp.sales;
}

/** Adds a sale with its own save key and returns it. */
async function addSale(saveKey: string): Promise<Sale> {
    await expect(mockSaleWrites.addSale(DETAILS, saveKey)).resolves.toEqual({ ok: true });
    return openSales()[0];
}

describe("mockSaleWrites", () => {
    it("adds a \"to deliver\" sale at the top, only once per save key", async () => {
        const before = openSales().length;
        const sale = await addSale("key-add");
        await mockSaleWrites.addSale(DETAILS, "key-add");

        expect(openSales()).toHaveLength(before + 1);
        expect(sale).toMatchObject({ status: "TO_DELIVER", clientPhone: "+96170123456", note: "Gate 2", amount: DETAILS.amount });
    });

    it("edits only the changed fields and marks the sale edited", async () => {
        const sale = await addSale("key-edit");

        await expect(mockSaleWrites.editSale(sale.id, { note: null, discount: { usd: "1.00", lbp: "0.00" } })).resolves.toEqual({ ok: true });

        expect(sale).not.toHaveProperty("note");
        expect(sale.discount).toEqual({ usd: "1.00", lbp: "0.00" });
        expect(sale.amount).toEqual(DETAILS.amount);
        expect(sale.isEdited).toBe(true);
    });

    it("delivers a sale with fee, tip, method, collected and change, then refuses to edit it", async () => {
        const sale = await addSale("key-deliver");

        await expect(mockSaleWrites.completeDelivery(sale.id, DELIVERY)).resolves.toEqual({ ok: true });
        expect(sale).toMatchObject({ status: "DELIVERED", tip: DELIVERY.tip, totalCollected: DELIVERY.collected, changeGiven: DELIVERY.change });

        await expect(mockSaleWrites.editSale(sale.id, { note: "late" })).resolves.toEqual({ ok: false, code: "SALE_NOT_AWAITING_DELIVERY" });
        await expect(mockSaleWrites.deleteSale(sale.id, "Client cancelled")).resolves.toEqual({ ok: false, code: "SALE_CANNOT_BE_CANCELLED" });
    });

    it("deletes a \"to deliver\" sale with its reason", async () => {
        const sale = await addSale("key-delete");

        await expect(mockSaleWrites.deleteSale(sale.id, " Client cancelled ")).resolves.toEqual({ ok: true });
        expect(sale).toMatchObject({ status: "DELETED", cancelReason: "Client cancelled" });
        await expect(mockSaleWrites.deleteSale(sale.id, "again")).resolves.toEqual({ ok: false, code: "SALE_ALREADY_CANCELLED" });
    });

    it("opens a deletion request on a delivered sale, once", async () => {
        const sale = await addSale("key-request");
        await mockSaleWrites.completeDelivery(sale.id, DELIVERY);

        await expect(mockSaleWrites.requestSaleDeletion(sale.id, "Typed twice")).resolves.toEqual({ ok: true });
        expect(sale.deletionAwaiting).toBe(true);
        await expect(mockSaleWrites.requestSaleDeletion(sale.id, "Typed twice")).resolves.toEqual({ ok: false, code: "CONFLICT" });
    });

    it("refuses a request on a sale that is not delivered, and an unknown sale", async () => {
        const sale = await addSale("key-request-waiting");

        await expect(mockSaleWrites.requestSaleDeletion(sale.id, "Typed twice")).resolves.toEqual({ ok: false, code: "CONFLICT" });
        await expect(mockSaleWrites.deleteSale("no-such-sale", "Typed twice")).resolves.toEqual({ ok: false, code: "ENTITY_NOT_FOUND" });
    });
});
