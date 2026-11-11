import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { BusinessRuleError } from "@/shared/errors/service-errors";
import type { SaleWriteGateway, SaleDetails, DeliveryDetails } from "@/lib/driver/sales/saleWriteGateway";

/** A fake backend call. */
type FakeBackendCall = (...args: unknown[]) => Promise<unknown>;

const getOwnOpenCashUp = jest.fn<FakeBackendCall>();
const createSale = jest.fn<FakeBackendCall>();
const editSale = jest.fn<FakeBackendCall>();
const confirmSaleDelivery = jest.fn<FakeBackendCall>();
const cancelSale = jest.fn<FakeBackendCall>();

let realSaleWrites: SaleWriteGateway;

const SALE_ID = "sale-7";
/** The open cash-up as the backend sends it; the sale's saved fee is USD 2.00. */
const OPEN_CASH_UP = { id: "cash-up-1", sales: [{ id: SALE_ID, deliveryFeeUsd: "2.00", deliveryFeeLbp: "0.00" }] };
const NO_TIP = { usd: "0.00", lbp: "0.00" };
const DELIVERY: DeliveryDetails = {
    deliveryFee: { usd: "2.00", lbp: "0.00" },
    tip: NO_TIP,
    method: "CASH",
    collected: { usd: "20.00", lbp: "0.00" },
    change: { usd: "8.00", lbp: "0.00" },
};
const DETAILS: SaleDetails = {
    amount: { usd: "10.00", lbp: "0.00" },
    deliveryFee: { usd: "2.00", lbp: "0.00" },
    discount: { usd: "0.00", lbp: "0.00" },
    clientNumber: "+96170123456",
    note: null,
};

// Same pattern as realDriverData.test.ts: doMock + dynamic import, relative paths.
beforeAll(async () => {
    jest.doMock("server-only", () => ({}));
    jest.doMock("../../../../src/modules/cash-ups/cash-ups.service", () => ({ getOwnOpenCashUp }));
    jest.doMock("../../../../src/modules/sales/sales.service", () => ({
        createSale,
        editSale,
        confirmSaleDelivery,
        cancelSale,
    }));
    ({ realSaleWrites } = await import("../../../../src/lib/driver/sales/realSaleWrites"));
});

function expectNoBackendCall() {
    expect(getOwnOpenCashUp).not.toHaveBeenCalled();
    expect(createSale).not.toHaveBeenCalled();
    expect(editSale).not.toHaveBeenCalled();
    expect(confirmSaleDelivery).not.toHaveBeenCalled();
    expect(cancelSale).not.toHaveBeenCalled();
}

describe("realSaleWrites: what the backend cannot take yet", () => {
    it("addSale, editSale and requestSaleDeletion answer FEATURE_NOT_READY without calling the backend", async () => {
        const notReady = { ok: false, code: "FEATURE_NOT_READY" };

        await expect(realSaleWrites.addSale(DETAILS, "7b1d2c3e-4f5a-4b6c-8d9e-0f1a2b3c4d5e")).resolves.toEqual(notReady);
        await expect(realSaleWrites.editSale(SALE_ID, { note: "Gate 2" })).resolves.toEqual(notReady);
        await expect(realSaleWrites.requestSaleDeletion(SALE_ID, "Typed twice")).resolves.toEqual(notReady);

        expectNoBackendCall();
    });
});

describe("realSaleWrites.completeDelivery", () => {
    it("calls the real confirmSaleDelivery when the fee is unchanged and there is no tip", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        confirmSaleDelivery.mockResolvedValue({});

        // "2" and "2.00" are the same fee: the backend's own comparison decides.
        await expect(
            realSaleWrites.completeDelivery(SALE_ID, { ...DELIVERY, deliveryFee: { usd: "2", lbp: "0" } }),
        ).resolves.toEqual({ ok: true });

        expect(confirmSaleDelivery).toHaveBeenCalledWith("cash-up-1", SALE_ID, {
            totalCollectedUsd: "20.00",
            totalCollectedLbp: "0.00",
            changeGivenUsd: "8.00",
            changeGivenLbp: "0.00",
            method: "CASH",
        });
    });

    it("answers FEATURE_NOT_READY for a changed fee, without calling confirmSaleDelivery", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);

        await expect(
            realSaleWrites.completeDelivery(SALE_ID, { ...DELIVERY, deliveryFee: { usd: "3.00", lbp: "0.00" } }),
        ).resolves.toEqual({ ok: false, code: "FEATURE_NOT_READY" });
        expect(confirmSaleDelivery).not.toHaveBeenCalled();
    });

    it("answers FEATURE_NOT_READY for a tip in either currency, without calling confirmSaleDelivery", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);

        await expect(realSaleWrites.completeDelivery(SALE_ID, { ...DELIVERY, tip: { usd: "1.00", lbp: "0.00" } })).resolves.toEqual({
            ok: false,
            code: "FEATURE_NOT_READY",
        });
        await expect(realSaleWrites.completeDelivery(SALE_ID, { ...DELIVERY, tip: { usd: "0.00", lbp: "5000.00" } })).resolves.toEqual({
            ok: false,
            code: "FEATURE_NOT_READY",
        });
        expect(confirmSaleDelivery).not.toHaveBeenCalled();
    });

    it("says so when no cash-up is open, or the sale is not in it", async () => {
        getOwnOpenCashUp.mockResolvedValueOnce(null);
        await expect(realSaleWrites.completeDelivery(SALE_ID, DELIVERY)).resolves.toEqual({ ok: false, code: "CASHUP_NOT_OPEN" });

        getOwnOpenCashUp.mockResolvedValueOnce(OPEN_CASH_UP);
        await expect(realSaleWrites.completeDelivery("other-sale", DELIVERY)).resolves.toEqual({ ok: false, code: "ENTITY_NOT_FOUND" });

        expect(confirmSaleDelivery).not.toHaveBeenCalled();
    });

    it("throws a backend error on, for the action to turn into a code", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        const notWaiting = new BusinessRuleError("SALE_NOT_AWAITING_DELIVERY");
        confirmSaleDelivery.mockRejectedValue(notWaiting);

        await expect(realSaleWrites.completeDelivery(SALE_ID, DELIVERY)).rejects.toBe(notWaiting);
    });
});

describe("realSaleWrites.deleteSale", () => {
    it("cancels the sale in the open cash-up found on the server, with the typed reason", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
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
