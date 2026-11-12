import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BusinessRuleError, ConflictError } from "@/shared/errors/service-errors";
import type { SaleWriteGateway, SaleDetails, DeliveryDetails } from "@/lib/driver/sales/saleWriteGateway";

/** A fake backend call. */
type FakeBackendCall = (...args: unknown[]) => Promise<unknown>;

const getOwnOpenCashUp = jest.fn<FakeBackendCall>();
const createSale = jest.fn<FakeBackendCall>();
const editSale = jest.fn<FakeBackendCall>();
const confirmSaleDelivery = jest.fn<FakeBackendCall>();
const cancelSale = jest.fn<FakeBackendCall>();
const requestSaleDeletion = jest.fn<FakeBackendCall>();

let realSaleWrites: SaleWriteGateway;

const SAVE_KEY = "7b1d2c3e-4f5a-4b6c-8d9e-0f1a2b3c4d5e";
const SALE_ID = "sale-7";
/** The open cash-up as the backend sends it; the sale's saved fee is USD 2.00. */
const OPEN_CASH_UP = { id: "cash-up-1", sales: [{ id: SALE_ID, deliveryFeeUsd: "2.00", deliveryFeeLbp: "0.00" }] };
const DELIVERY: DeliveryDetails = {
    deliveryFee: { usd: "2.00", lbp: "0.00" },
    tip: { usd: "0.00", lbp: "0.00" },
    method: "CASH",
    collected: { usd: "20.00", lbp: "0.00" },
    change: { usd: "8.00", lbp: "0.00" },
};
const DETAILS: SaleDetails = {
    amount: { usd: "10.00", lbp: "0.00" },
    deliveryFee: { usd: "2.00", lbp: "0.00" },
    discount: { usd: "0.00", lbp: "50000.00" },
    clientNumber: "+96170123456",
    note: null,
};
/** The payment fields a "to deliver" sale must never carry: the backend refuses any value, even "0.00". */
const PAYMENT_FIELDS = ["method", "tipUsd", "tipLbp", "totalCollectedUsd", "totalCollectedLbp", "changeGivenUsd", "changeGivenLbp"];

// Same pattern as realDriverData.test.ts: doMock + dynamic import, relative paths.
beforeAll(async () => {
    jest.doMock("server-only", () => ({}));
    jest.doMock("../../../../src/modules/cash-ups/cash-ups.service", () => ({ getOwnOpenCashUp }));
    jest.doMock("../../../../src/modules/sales/sales.service", () => ({
        createSale,
        editSale,
        confirmSaleDelivery,
        cancelSale,
        requestSaleDeletion,
    }));
    ({ realSaleWrites } = await import("../../../../src/lib/driver/sales/realSaleWrites"));
});

beforeEach(() => {
    getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
});

/** What confirmSaleDelivery received in its last call. */
function sentDelivery(): Record<string, unknown> {
    return confirmSaleDelivery.mock.calls.at(-1)?.[2] as Record<string, unknown>;
}

describe("realSaleWrites.addSale", () => {
    it("creates a \"to deliver\" sale with the order fields and the save key", async () => {
        createSale.mockResolvedValue({});

        await expect(realSaleWrites.addSale(DETAILS, SAVE_KEY)).resolves.toEqual({ ok: true });

        expect(createSale).toHaveBeenCalledWith("cash-up-1", {
            status: "TO_DELIVER",
            businessAmountUsd: "10.00",
            businessAmountLbp: "0.00",
            deliveryFeeUsd: "2.00",
            deliveryFeeLbp: "0.00",
            discountUsd: "0.00",
            discountLbp: "50000.00",
            clientNumber: "+96170123456",
            note: null,
            idempotencyKey: SAVE_KEY,
        });
    });

    it("sends no payment field at all, not even as zero or null", async () => {
        createSale.mockResolvedValue({});

        await realSaleWrites.addSale(DETAILS, SAVE_KEY);

        const sent = createSale.mock.calls.at(-1)?.[1] as Record<string, unknown>;
        for (const field of PAYMENT_FIELDS) expect(sent).not.toHaveProperty(field);
    });

    it("leaves an empty client number out, so the backend answers CLIENT_NUMBER_REQUIRED", async () => {
        createSale.mockResolvedValue({});

        await realSaleWrites.addSale({ ...DETAILS, clientNumber: "" }, SAVE_KEY);

        expect(createSale.mock.calls.at(-1)?.[1]).not.toHaveProperty("clientNumber");
    });

    it("says so when no cash-up is open, without creating anything", async () => {
        getOwnOpenCashUp.mockResolvedValue(null);

        await expect(realSaleWrites.addSale(DETAILS, SAVE_KEY)).resolves.toEqual({ ok: false, code: "CASHUP_NOT_OPEN" });
        expect(createSale).not.toHaveBeenCalled();
    });
});

describe("realSaleWrites.editSale", () => {
    it("sends only the changed fields, in the backend's names", async () => {
        editSale.mockResolvedValue({});

        await expect(
            realSaleWrites.editSale(SALE_ID, { deliveryFee: { usd: "3.00", lbp: "0.00" }, note: "Gate 2" }),
        ).resolves.toEqual({ ok: true });

        expect(editSale).toHaveBeenCalledWith("cash-up-1", SALE_ID, {
            deliveryFeeUsd: "3.00",
            deliveryFeeLbp: "0.00",
            note: "Gate 2",
        });
    });

    it("sends a cleared client number as null, so the backend refuses it instead of keeping the old one", async () => {
        editSale.mockResolvedValue({});

        await realSaleWrites.editSale(SALE_ID, { clientNumber: "" });

        expect(editSale).toHaveBeenCalledWith("cash-up-1", SALE_ID, { clientNumber: null });
    });

    it("throws the backend's refusal of a delivered sale on, for the action to turn into a code", async () => {
        const delivered = new BusinessRuleError("SALE_ALREADY_DELIVERED");
        editSale.mockRejectedValue(delivered);

        await expect(realSaleWrites.editSale(SALE_ID, { note: "Gate 2" })).rejects.toBe(delivered);
    });
});

describe("realSaleWrites.completeDelivery", () => {
    it("always sends the method, the payment and the tip, with an empty tip as \"0.00\"", async () => {
        confirmSaleDelivery.mockResolvedValue({});

        await expect(realSaleWrites.completeDelivery(SALE_ID, DELIVERY)).resolves.toEqual({ ok: true });

        expect(confirmSaleDelivery).toHaveBeenCalledWith("cash-up-1", SALE_ID, {
            tipUsd: "0.00",
            tipLbp: "0.00",
            totalCollectedUsd: "20.00",
            totalCollectedLbp: "0.00",
            changeGivenUsd: "8.00",
            changeGivenLbp: "0.00",
            method: "CASH",
        });
    });

    it("leaves out an unchanged fee, so the backend keeps the shop's fee (\"2\" and \"2.00\" are the same)", async () => {
        confirmSaleDelivery.mockResolvedValue({});

        await realSaleWrites.completeDelivery(SALE_ID, { ...DELIVERY, deliveryFee: { usd: "2", lbp: "0" } });

        expect(sentDelivery()).not.toHaveProperty("deliveryFeeUsd");
        expect(sentDelivery()).not.toHaveProperty("deliveryFeeLbp");
    });

    it("sends only the fee currency the driver changed", async () => {
        confirmSaleDelivery.mockResolvedValue({});

        await realSaleWrites.completeDelivery(SALE_ID, { ...DELIVERY, deliveryFee: { usd: "2.00", lbp: "50000.00" } });

        expect(sentDelivery()).toHaveProperty("deliveryFeeLbp", "50000.00");
        expect(sentDelivery()).not.toHaveProperty("deliveryFeeUsd");
    });

    it("sends a fee changed to zero as \"0.00\", which replaces the shop's fee", async () => {
        confirmSaleDelivery.mockResolvedValue({});

        await realSaleWrites.completeDelivery(SALE_ID, { ...DELIVERY, deliveryFee: { usd: "0.00", lbp: "0.00" } });

        expect(sentDelivery()).toHaveProperty("deliveryFeeUsd", "0.00");
        expect(sentDelivery()).not.toHaveProperty("deliveryFeeLbp");
    });

    it("sends a tip in either currency", async () => {
        confirmSaleDelivery.mockResolvedValue({});

        await realSaleWrites.completeDelivery(SALE_ID, { ...DELIVERY, tip: { usd: "1.00", lbp: "5000.00" } });

        expect(sentDelivery()).toMatchObject({ tipUsd: "1.00", tipLbp: "5000.00" });
    });

    it("says so when no cash-up is open, or the sale is not in it", async () => {
        getOwnOpenCashUp.mockResolvedValueOnce(null);
        await expect(realSaleWrites.completeDelivery(SALE_ID, DELIVERY)).resolves.toEqual({ ok: false, code: "CASHUP_NOT_OPEN" });

        await expect(realSaleWrites.completeDelivery("other-sale", DELIVERY)).resolves.toEqual({ ok: false, code: "ENTITY_NOT_FOUND" });

        expect(confirmSaleDelivery).not.toHaveBeenCalled();
    });

    it("throws a backend error on, for the action to turn into a code", async () => {
        const notWaiting = new BusinessRuleError("SALE_NOT_AWAITING_DELIVERY");
        confirmSaleDelivery.mockRejectedValue(notWaiting);

        await expect(realSaleWrites.completeDelivery(SALE_ID, DELIVERY)).rejects.toBe(notWaiting);
    });
});

describe("realSaleWrites.deleteSale", () => {
    it("cancels the sale in the open cash-up found on the server, with the typed reason", async () => {
        cancelSale.mockResolvedValue({});

        await expect(realSaleWrites.deleteSale(SALE_ID, "Client cancelled")).resolves.toEqual({ ok: true });
        expect(cancelSale).toHaveBeenCalledWith("cash-up-1", SALE_ID, "Client cancelled");
    });

    it("says so when no cash-up is open", async () => {
        getOwnOpenCashUp.mockResolvedValue(null);

        await expect(realSaleWrites.deleteSale(SALE_ID, "Client cancelled")).resolves.toEqual({ ok: false, code: "CASHUP_NOT_OPEN" });
        expect(cancelSale).not.toHaveBeenCalled();
    });
});

describe("realSaleWrites.requestSaleDeletion", () => {
    it("asks the owner to delete the sale, in the open cash-up found on the server", async () => {
        requestSaleDeletion.mockResolvedValue({});

        await expect(realSaleWrites.requestSaleDeletion(SALE_ID, "Typed twice")).resolves.toEqual({ ok: true });
        expect(requestSaleDeletion).toHaveBeenCalledWith("cash-up-1", SALE_ID, "Typed twice");
    });

    it("throws the backend's refusal of a second request on", async () => {
        const exists = new ConflictError("SALE_DELETION_REQUEST_EXISTS");
        requestSaleDeletion.mockRejectedValue(exists);

        await expect(realSaleWrites.requestSaleDeletion(SALE_ID, "Typed twice")).rejects.toBe(exists);
    });

    it("says so when no cash-up is open", async () => {
        getOwnOpenCashUp.mockResolvedValue(null);

        await expect(realSaleWrites.requestSaleDeletion(SALE_ID, "Typed twice")).resolves.toEqual({
            ok: false,
            code: "CASHUP_NOT_OPEN",
        });
        expect(requestSaleDeletion).not.toHaveBeenCalled();
    });
});

/** Every .ts/.tsx file under a folder. */
function sourceFiles(folder: string): string[] {
    return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
        const path = join(folder, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.tsx?$/.test(entry.name) ? [path] : [];
    });
}

describe("the sales service boundary", () => {
    it("is imported by realSaleWrites.ts only (outside the backend itself)", () => {
        const sourceRoot = join(process.cwd(), "src");
        const importers = sourceFiles(sourceRoot)
            .filter((path) => !relative(sourceRoot, path).startsWith("modules"))
            .filter((path) => readFileSync(path, "utf8").includes("modules/sales/sales.service"))
            .map((path) => relative(sourceRoot, path));

        expect(importers).toEqual([join("lib", "driver", "sales", "realSaleWrites.ts")]);
    });
});
