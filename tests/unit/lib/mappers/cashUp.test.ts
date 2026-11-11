import { mapCashOut, type CashOutInput } from "@/lib/driver/mappers/cashOut";
import { mapCashUp, type CashUpInput } from "@/lib/driver/mappers/cashUp";
import type { SaleLineInput } from "@/lib/driver/mappers/sale";
import { expect, describe, it } from "@jest/globals"

function saleLine(overrides: Partial<SaleLineInput> = {}): SaleLineInput {
    return {
        id: "sale-1",
        saleNumber: 1,
        status: "DELIVERED",
        moneyTaken: "COLLECTED",
        businessAmountUsd: "10.00",
        businessAmountLbp: "0.00",
        deliveryFeeUsd: "2.00",
        deliveryFeeLbp: "0.00",
        tipUsd: "0.00",
        tipLbp: "0.00",
        discountUsd: "0.00",
        discountLbp: "0.00",
        totalCollectedUsd: "12.00",
        totalCollectedLbp: "0.00",
        changeGivenUsd: "0.00",
        changeGivenLbp: "0.00",
        method: "CASH",
        clientNumber: null,
        note: null,
        createdAt: "2026-10-28T06:30:00.000Z",
        isEdited: false,
        amountDiffers: false,
        deletionAwaiting: false,
        cancelReason: null,
        ...overrides,
    };
}

function cashUp(overrides: Partial<CashUpInput> = {}): CashUpInput {
    return {
        id: "cash-up-1",
        number: 42,
        status: "OPEN",
        returnReason: null,
        openedAt: "2026-10-28T06:30:00.000Z",
        ledger: {
            floatUsd: "20.00", floatLbp: "0.00",
            receivedUsd: "12.00", receivedLbp: "0.00",
            changeGivenUsd: "0.00", changeGivenLbp: "0.00",
            cashOutsUsd: "0.00", cashOutsLbp: "0.00",
            expectedUsd: "32.00", expectedLbp: "0.00",
        },
        countedUsd: null,
        countedLbp: null,
        sales: [],
        cashOuts: [],
        ...overrides,
    };
}

describe("mapCashOut", () => {
    const base: CashOutInput = {
        id: "out-1", amountUsd: "2.00", amountLbp: "0.00",
        reason: "Fuel", note: null, status: "ACTIVE", cancelReason: null,
        createdAt: "2026-10-28T06:30:00.000Z",
    };

    it("keeps a known reason, with no detail", () => {
        expect(mapCashOut(base).reason).toBe("Fuel");
        expect(mapCashOut(base)).not.toHaveProperty("detail");
    });

    it("turns an unknown reason into Other and keeps the whole text as the detail", () => {
        const result = mapCashOut({ ...base, reason: "Shop supplies" });
        expect(result.reason).toBe("Other");
        expect(result.detail).toBe("Shop supplies");
    });

    it("splits \"Other: <detail>\" into the category and the driver's words", () => {
        const result = mapCashOut({ ...base, reason: "Other: Car wash" });
        expect(result.reason).toBe("Other");
        expect(result.detail).toBe("Car wash");
    });

    it("sets the note only when there is one", () => {
        expect(mapCashOut(base).note).toBeUndefined();
        expect(mapCashOut({ ...base, note: "Diesel" }).note).toBe("Diesel");
    });

    it("marks an active cash-out as not deleted, without a cancel reason", () => {
        const result = mapCashOut(base);
        expect(result.isDeleted).toBe(false);
        expect(result).not.toHaveProperty("cancelReason");
    });

    it("keeps a cancelled cash-out, marked deleted, with its reason", () => {
        const result = mapCashOut({ ...base, status: "CANCELLED", cancelReason: "Typed twice" });
        expect(result.isDeleted).toBe(true);
        expect(result.cancelReason).toBe("Typed twice");
        expect(result.amount).toEqual({ usd: "2.00", lbp: "0.00" });
    });
});

describe("mapCashUp", () => {
    it("shows OPEN with a return reason as RETURNED", () => {
        const result = mapCashUp(cashUp({ returnReason: "Recount LBP" }));
        expect(result.status).toBe("RETURNED");
        expect(result.returned).toEqual({ by: "Owner", text: "Recount LBP" });
    });

    it("keeps OPEN when nothing was returned", () => {
        const result = mapCashUp(cashUp());
        expect(result.status).toBe("OPEN");
        expect(result.returned).toBeNull();
    });

    it("has no saved note counts, because the backend does not send count lines yet", () => {
        expect(mapCashUp(cashUp({ countedUsd: "30.00", countedLbp: "0.00" })).savedCounts).toBeNull();
    });

    it("has no count until both currencies are counted", () => {
        expect(mapCashUp(cashUp()).counted).toBeNull();
        expect(mapCashUp(cashUp({ countedUsd: "30.00", countedLbp: "0.00" })).counted).not.toBeNull();
    });

    it("skips deleted sales in the count and totals, and splits delivered from waiting", () => {
        const result = mapCashUp(
            cashUp({
                sales: [
                    saleLine({ id: "a", status: "DELIVERED" }),
                    saleLine({ id: "b", status: "TO_DELIVER", moneyTaken: "NOT_YET" }),
                    saleLine({ id: "c", status: "DELETED", moneyTaken: "CANCELLED" }),
                ],
            }),
        );
        expect(result.salesCount).toBe(2);
        expect(result.sales).toHaveLength(3);
        expect(result.deliveredTotal.usd).toBe(result.waitingTotal.usd);
        expect(result.salesTotal.usd).not.toBe(result.deliveredTotal.usd);
    });

    it("builds the start text in Beirut time", () => {
        expect(mapCashUp(cashUp()).startedAt).toBe("28 Oct, 08:30");
    });
});
