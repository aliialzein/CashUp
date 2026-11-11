import { describe, expect, it } from "@jest/globals";
import { mapCashUpDetail, type CashUpDetailInput } from "@/lib/driver/mappers/cashUpDetail";
import type { SaleLineInput } from "@/lib/driver/mappers/sale";

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
        clientNumber: "+96170123456",
        note: null,
        createdAt: "2026-10-28T06:30:00.000Z",
        isEdited: false,
        amountDiffers: false,
        deletionAwaiting: false,
        cancelReason: null,
        ...overrides,
    };
}

const LEDGER = {
    floatUsd: "50.00",
    floatLbp: "0.00",
    receivedUsd: "12.00",
    receivedLbp: "0.00",
    changeGivenUsd: "0.00",
    changeGivenLbp: "0.00",
    cashOutsUsd: "5.00",
    cashOutsLbp: "0.00",
    expectedUsd: "57.00",
    expectedLbp: "0.00",
};

/** A submitted cash-up as today's backend sends it: no ledger. */
function locked(overrides: Partial<CashUpDetailInput> = {}): CashUpDetailInput {
    return {
        id: "c-42",
        number: 42,
        status: "SUBMITTED",
        closedAt: "2026-10-28T16:05:00.000Z",
        approvedAt: null,
        countedUsd: "55.00",
        countedLbp: "0.00",
        gapUsd: "-2.00",
        gapLbp: "0.00",
        ledger: null,
        sales: [saleLine(), saleLine({ id: "sale-2", saleNumber: 2, status: "DELETED", moneyTaken: "CANCELLED", cancelReason: "Typed twice" })],
        cashOuts: [
            {
                id: "out-1",
                amountUsd: "5.00",
                amountLbp: "0.00",
                reason: "Fuel",
                note: null,
                status: "ACTIVE",
                cancelReason: null,
                createdAt: "2026-10-28T09:00:00.000Z",
            },
        ],
        ...overrides,
    };
}

describe("mapCashUpDetail", () => {
    it("maps a submitted cash-up: when, the frozen count and gap, every sale and cash-out, no review", () => {
        const detail = mapCashUpDetail(locked());

        // Business time is Beirut: 16:05 UTC is 18:05.
        expect(detail.submittedAt).toBe("28 Oct, 18:05");
        expect(detail.status).toBe("SUBMITTED");
        expect(detail.counted).toEqual({ usd: "55.00", lbp: "0.00" });
        expect(detail.gap).toEqual({ usd: "-2.00", lbp: "0.00" });
        expect(detail.sales.map((sale) => sale.status)).toEqual(["DELIVERED", "DELETED"]);
        expect(detail.sales[1].cancelReason).toBe("Typed twice");
        expect(detail.cashOuts.map((cashOut) => cashOut.reason)).toEqual(["Fuel"]);
        expect(detail.review).toBeNull();
    });

    it("keeps the totals null when today's backend sends no ledger (the page shows the grey line)", () => {
        expect(mapCashUpDetail(locked()).ledger).toBeNull();
    });

    it("converts the backend's totals when the ledger is present, without computing anything", () => {
        expect(mapCashUpDetail(locked({ ledger: LEDGER })).ledger).toEqual({
            float: { usd: "50.00", lbp: "0.00" },
            received: { usd: "12.00", lbp: "0.00" },
            changeGiven: { usd: "0.00", lbp: "0.00" },
            cashOuts: { usd: "5.00", lbp: "0.00" },
            expected: { usd: "57.00", lbp: "0.00" },
        });
    });

    it("gives an approved cash-up its approval time (the subtitle says \"by Owner\")", () => {
        const detail = mapCashUpDetail(locked({ status: "APPROVED", approvedAt: "2026-10-29T07:10:00.000Z" }));
        expect(detail.review).toEqual({ at: "29 Oct, 09:10" });
    });

    it("adds up only the delivered sales for the Sales card, the same way as Today", () => {
        expect(mapCashUpDetail(locked()).deliveredTotal).toEqual({ usd: "12", lbp: "0" });
    });

    it.each(["closedAt", "countedUsd", "countedLbp", "gapUsd", "gapLbp"] as const)(
        "fails loudly when the frozen %s is missing on a locked cash-up",
        (field) => {
            expect(() => mapCashUpDetail(locked({ [field]: null }))).toThrow("LOCKED_CASH_UP_WITHOUT_COUNT");
        },
    );
});
