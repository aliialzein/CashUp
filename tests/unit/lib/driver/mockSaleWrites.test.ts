import { describe, expect, it } from "@jest/globals";
import { getOpenCashUp } from "@/lib/driver/mock/today";
import { mockDeletionRequests, mockSaleWrites } from "@/lib/driver/sales/mockSaleWrites";
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

    it("gives a new sale no payment at all, like the backend", async () => {
        const sale = await addSale("key-add-no-payment");

        for (const field of ["method", "tip", "totalCollected", "changeGiven"]) expect(sale).not.toHaveProperty(field);
    });

    it("refuses a new sale the backend's createSaleSchema refuses, without adding it", async () => {
        const before = openSales().length;

        // An empty number is left out of the payload, so the backend's schema asks for one.
        await expect(mockSaleWrites.addSale({ ...DETAILS, clientNumber: "" }, "key-add-no-client")).resolves.toEqual({
            ok: false,
            code: "CLIENT_NUMBER_REQUIRED",
        });
        expect(openSales()).toHaveLength(before);
    });

    it("edits only the changed fields and marks the sale edited", async () => {
        const sale = await addSale("key-edit");

        await expect(mockSaleWrites.editSale(sale.id, { note: null, discount: { usd: "1.00", lbp: "0.00" } })).resolves.toEqual({ ok: true });

        expect(sale).not.toHaveProperty("note");
        expect(sale.discount).toEqual({ usd: "1.00", lbp: "0.00" });
        expect(sale.amount).toEqual(DETAILS.amount);
        expect(sale.isEdited).toBe(true);
    });

    it("refuses an edit that clears the client number, and keeps the old number", async () => {
        const sale = await addSale("key-edit-clear-number");

        await expect(mockSaleWrites.editSale(sale.id, { clientNumber: "" })).resolves.toEqual({
            ok: false,
            code: "CLIENT_NUMBER_REQUIRED",
        });
        expect(sale.clientNumber).toBe("+96170123456");
    });

    it("refuses an edit that makes the discount bigger than what is owed (the backend's validateMergedSale)", async () => {
        const sale = await addSale("key-edit-discount");

        await expect(mockSaleWrites.editSale(sale.id, { discount: { usd: "50.00", lbp: "0.00" } })).resolves.toEqual({
            ok: false,
            code: "DISCOUNT_EXCEEDS_DUE",
        });
        expect(sale.discount).toEqual(DETAILS.discount);
    });

    it("delivers a sale with fee, tip, method, collected and change, then refuses to edit or delete it", async () => {
        const sale = await addSale("key-deliver");

        await expect(mockSaleWrites.completeDelivery(sale.id, DELIVERY)).resolves.toEqual({ ok: true });
        expect(sale).toMatchObject({ status: "DELIVERED", tip: DELIVERY.tip, totalCollected: DELIVERY.collected, changeGiven: DELIVERY.change });

        await expect(mockSaleWrites.editSale(sale.id, { note: "late" })).resolves.toEqual({ ok: false, code: "SALE_ALREADY_DELIVERED" });
        await expect(mockSaleWrites.deleteSale(sale.id, "Client cancelled")).resolves.toEqual({ ok: false, code: "SALE_CANNOT_BE_CANCELLED" });
        await expect(mockSaleWrites.completeDelivery(sale.id, DELIVERY)).resolves.toEqual({ ok: false, code: "SALE_NOT_AWAITING_DELIVERY" });
    });

    it("keeps the shop's fee when the driver did not change it, and takes a 0.00 tip", async () => {
        const sale = await addSale("key-deliver-same-fee");

        await expect(
            mockSaleWrites.completeDelivery(sale.id, {
                ...DELIVERY,
                deliveryFee: { usd: "2", lbp: "0" },
                tip: { usd: "0.00", lbp: "0.00" },
                change: { usd: "8.00", lbp: "0.00" },
            }),
        ).resolves.toEqual({ ok: true });
        expect(sale.deliveryFee).toEqual({ usd: "2.00", lbp: "0.00" });
        expect(sale.tip).toEqual({ usd: "0.00", lbp: "0.00" });
        expect(sale.amountDiffers).toBe(false);
    });

    it("deletes a \"to deliver\" sale with its trimmed reason, once", async () => {
        const sale = await addSale("key-delete");

        await expect(mockSaleWrites.deleteSale(sale.id, " Client cancelled ")).resolves.toEqual({ ok: true });
        expect(sale).toMatchObject({ status: "DELETED", cancelReason: "Client cancelled" });
        await expect(mockSaleWrites.deleteSale(sale.id, "again")).resolves.toEqual({ ok: false, code: "SALE_ALREADY_CANCELLED" });
        await expect(mockSaleWrites.completeDelivery(sale.id, DELIVERY)).resolves.toEqual({ ok: false, code: "SALE_NOT_AWAITING_DELIVERY" });
    });

    it("refuses a reason the backend's schema refuses", async () => {
        const sale = await addSale("key-delete-short");

        await expect(mockSaleWrites.deleteSale(sale.id, "ab")).resolves.toEqual({ ok: false, code: "REASON_TOO_SHORT" });
        expect(sale.status).toBe("TO_DELIVER");
    });

    it("opens a deletion request on a delivered sale once, stores it like the backend and locks the sale", async () => {
        const sale = await addSale("key-request");
        await mockSaleWrites.completeDelivery(sale.id, DELIVERY);

        await expect(mockSaleWrites.requestSaleDeletion(sale.id, " Typed twice ")).resolves.toEqual({ ok: true });
        expect(sale.deletionAwaiting).toBe(true);
        expect(mockDeletionRequests().filter((request) => request.saleId === sale.id)).toEqual([
            expect.objectContaining({ saleId: sale.id, status: "AWAITING_OWNER", reason: "Typed twice" }),
        ]);

        await expect(mockSaleWrites.requestSaleDeletion(sale.id, "Typed twice")).resolves.toEqual({
            ok: false,
            code: "SALE_DELETION_REQUEST_EXISTS",
        });
        await expect(mockSaleWrites.editSale(sale.id, { note: "late" })).resolves.toEqual({ ok: false, code: "CONFLICT" });
    });

    it("refuses a request on a sale that is not delivered, and an unknown sale", async () => {
        const sale = await addSale("key-request-waiting");

        await expect(mockSaleWrites.requestSaleDeletion(sale.id, "Typed twice")).resolves.toEqual({
            ok: false,
            code: "SALE_DELETION_REQUIRES_DELIVERED",
        });
        await expect(mockSaleWrites.deleteSale("no-such-sale", "Typed twice")).resolves.toEqual({ ok: false, code: "ENTITY_NOT_FOUND" });
    });
});

describe("mockSaleWrites.completeDelivery with today's rate (the backend's checkSaleBalance and computeDeliveryFlags)", () => {
    // Owed: 10.00 + fee 3.00 + tip 1.00 = 14.00 USD. The client pays 20 USD and gets 5 USD + 90,000 LBP (= 1 USD) back.
    const MIXED_CHANGE = {
        ...DELIVERY,
        collected: { usd: "20.00", lbp: "0.00" },
        change: { usd: "5.00", lbp: "90000.00" },
    };

    function setRate(referenceRate: string | null) {
        const cashUp = getOpenCashUp();
        if (cashUp === null) throw new Error("the mock scenario must have an open cash-up for these tests");
        cashUp.referenceRate = referenceRate;
    }

    it("accepts change in both currencies at the cash-up's rate, as balanced", async () => {
        setRate("90000");
        const sale = await addSale("key-rate-mixed");

        await expect(mockSaleWrites.completeDelivery(sale.id, MIXED_CHANGE)).resolves.toEqual({ ok: true });
        expect(sale).toMatchObject({ status: "DELIVERED", amountDiffers: false });
    });

    it("refuses change in both currencies when the cash-up has no rate", async () => {
        setRate(null);
        const sale = await addSale("key-rate-missing");

        await expect(mockSaleWrites.completeDelivery(sale.id, MIXED_CHANGE)).resolves.toEqual({
            ok: false,
            code: "SALE_REQUIRES_REFERENCE_RATE",
        });
        expect(sale.status).toBe("TO_DELIVER");
        setRate("90000");
    });

    it("flags a delivery that does not match what is owed as \"amount differs\"", async () => {
        setRate("90000");
        const sale = await addSale("key-rate-short");

        await expect(mockSaleWrites.completeDelivery(sale.id, { ...DELIVERY, collected: { usd: "10.00", lbp: "0.00" }, change: { usd: "0.00", lbp: "0.00" } })).resolves.toEqual({ ok: true });
        expect(sale.amountDiffers).toBe(true);
    });
});
