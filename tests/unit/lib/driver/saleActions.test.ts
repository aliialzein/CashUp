import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { BusinessRuleError, ConflictError } from "@/shared/errors/service-errors";
import type * as SaleActions from "@/lib/driver/sales/actions";

/** A fake gateway method. */
type FakeGatewayCall = (...args: unknown[]) => Promise<unknown>;

const gateway = {
    addSale: jest.fn<FakeGatewayCall>(),
    editSale: jest.fn<FakeGatewayCall>(),
    completeDelivery: jest.fn<FakeGatewayCall>(),
    deleteSale: jest.fn<FakeGatewayCall>(),
    requestSaleDeletion: jest.fn<FakeGatewayCall>(),
};
const revalidatePath = jest.fn();

let actions: typeof SaleActions;

const OK = { ok: true };
const SAVE_KEY = "7b1d2c3e-4f5a-4b6c-8d9e-0f1a2b3c4d5e";
const SALE_ID = "sale-7";
/** What the Add sale form sends: blank currencies already "0", amounts as typed. */
const TYPED_SALE = {
    saveKey: SAVE_KEY,
    amount: { usd: "1,000.5", lbp: "0" },
    deliveryFee: { usd: "2", lbp: "0" },
    discount: { usd: "0", lbp: "50,000" },
    clientNumber: " +96170123456 ",
    note: "  ",
};
const TYPED_DELIVERY = {
    deliveryFee: { usd: "2", lbp: "0" },
    tip: { usd: "1", lbp: "0" },
    method: "CASH",
    collected: { usd: "20", lbp: "0" },
    change: { usd: "4.5", lbp: "0" },
};

// Same pattern as cashOutActions.test.ts: doMock + dynamic import, relative paths.
// The gateway switch is replaced, so these tests prove the actions talk only to the gateway.
beforeAll(async () => {
    jest.doMock("next/cache", () => ({ revalidatePath }));
    jest.doMock("../../../../src/lib/driver/sales/saleWrites", () => ({ saleWrites: gateway }));
    actions = await import("../../../../src/lib/driver/sales/actions");
});

describe("addSale", () => {
    it("sends the normalized money, the trimmed client number, a blank note as null, and the save key", async () => {
        gateway.addSale.mockResolvedValue(OK);

        await expect(actions.addSale(TYPED_SALE)).resolves.toEqual(OK);

        expect(gateway.addSale).toHaveBeenCalledWith(
            {
                amount: { usd: "1000.50", lbp: "0.00" },
                deliveryFee: { usd: "2.00", lbp: "0.00" },
                discount: { usd: "0.00", lbp: "50000.00" },
                clientNumber: "+96170123456",
                note: null,
            },
            SAVE_KEY,
        );
        expect(revalidatePath).toHaveBeenCalledWith("/sales");
        expect(revalidatePath).toHaveBeenCalledWith("/today");
    });

    it("refuses an amount it cannot read, without calling the gateway", async () => {
        await expect(actions.addSale({ ...TYPED_SALE, discount: { usd: "1.000,50", lbp: "0" } })).resolves.toEqual({
            ok: false,
            code: "VALIDATION_ERROR",
        });
        expect(gateway.addSale).not.toHaveBeenCalled();
    });

    it("passes FEATURE_NOT_READY on to the screen and refreshes nothing", async () => {
        gateway.addSale.mockResolvedValue({ ok: false, code: "FEATURE_NOT_READY" });

        await expect(actions.addSale(TYPED_SALE)).resolves.toEqual({ ok: false, code: "FEATURE_NOT_READY" });
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("turns a thrown backend error into its code", async () => {
        gateway.addSale.mockRejectedValue(new ConflictError("IDEMPOTENCY_KEY_REUSED"));

        await expect(actions.addSale(TYPED_SALE)).resolves.toEqual({ ok: false, code: "IDEMPOTENCY_KEY_REUSED" });
        expect(revalidatePath).not.toHaveBeenCalled();
    });
});

describe("editSale", () => {
    it("sends only the changed fields, normalized", async () => {
        gateway.editSale.mockResolvedValue(OK);

        await expect(actions.editSale(SALE_ID, { deliveryFee: { usd: "3.5", lbp: "0" }, note: " Gate 2 " })).resolves.toEqual(OK);

        expect(gateway.editSale).toHaveBeenCalledWith(SALE_ID, { deliveryFee: { usd: "3.50", lbp: "0.00" }, note: "Gate 2" });
    });

    it("sends the client number without spaces and dashes", async () => {
        gateway.editSale.mockResolvedValue(OK);

        await actions.editSale(SALE_ID, { clientNumber: "+961 70-123 456" });

        expect(gateway.editSale).toHaveBeenCalledWith(SALE_ID, { clientNumber: "+96170123456" });
    });

    it("refuses an edit with nothing changed, without calling the gateway", async () => {
        await expect(actions.editSale(SALE_ID, {})).resolves.toEqual({ ok: false, code: "EDIT_FIELD_REQUIRED" });
        expect(gateway.editSale).not.toHaveBeenCalled();
    });

    it("refuses an amount it cannot read, without calling the gateway", async () => {
        await expect(actions.editSale(SALE_ID, { amount: { usd: "abc", lbp: "0" } })).resolves.toEqual({
            ok: false,
            code: "VALIDATION_ERROR",
        });
        expect(gateway.editSale).not.toHaveBeenCalled();
    });
});

describe("completeDelivery", () => {
    it("sends fee, tip, method, collected and change in one call, normalized", async () => {
        gateway.completeDelivery.mockResolvedValue(OK);

        await expect(actions.completeDelivery(SALE_ID, TYPED_DELIVERY)).resolves.toEqual(OK);

        expect(gateway.completeDelivery).toHaveBeenCalledWith(SALE_ID, {
            deliveryFee: { usd: "2.00", lbp: "0.00" },
            tip: { usd: "1.00", lbp: "0.00" },
            method: "CASH",
            collected: { usd: "20.00", lbp: "0.00" },
            change: { usd: "4.50", lbp: "0.00" },
        });
    });

    it("refuses an unknown payment method and an unreadable amount, without calling the gateway", async () => {
        await expect(actions.completeDelivery(SALE_ID, { ...TYPED_DELIVERY, method: "CARD" })).resolves.toEqual({
            ok: false,
            code: "VALIDATION_ERROR",
        });
        await expect(actions.completeDelivery(SALE_ID, { ...TYPED_DELIVERY, tip: { usd: "", lbp: "0" } })).resolves.toEqual({
            ok: false,
            code: "VALIDATION_ERROR",
        });
        expect(gateway.completeDelivery).not.toHaveBeenCalled();
    });

    it("turns a thrown backend error into its code", async () => {
        gateway.completeDelivery.mockRejectedValue(new BusinessRuleError("SALE_NOT_AWAITING_DELIVERY"));

        await expect(actions.completeDelivery(SALE_ID, TYPED_DELIVERY)).resolves.toEqual({
            ok: false,
            code: "SALE_NOT_AWAITING_DELIVERY",
        });
    });
});

describe("deleteSale and requestSaleDeletion", () => {
    it("pass the sale id and the typed reason to the gateway, then refresh", async () => {
        gateway.deleteSale.mockResolvedValue(OK);
        gateway.requestSaleDeletion.mockResolvedValue(OK);

        await expect(actions.deleteSale(SALE_ID, "Client cancelled")).resolves.toEqual(OK);
        await expect(actions.requestSaleDeletion(SALE_ID, "Typed twice")).resolves.toEqual(OK);

        expect(gateway.deleteSale).toHaveBeenCalledWith(SALE_ID, "Client cancelled");
        expect(gateway.requestSaleDeletion).toHaveBeenCalledWith(SALE_ID, "Typed twice");
        expect(revalidatePath).toHaveBeenCalledWith("/sales");
    });

    it("turn a thrown backend error into its code", async () => {
        gateway.deleteSale.mockRejectedValue(new BusinessRuleError("SALE_CANNOT_BE_CANCELLED"));

        await expect(actions.deleteSale(SALE_ID, "Client cancelled")).resolves.toEqual({
            ok: false,
            code: "SALE_CANNOT_BE_CANCELLED",
        });
    });
});
