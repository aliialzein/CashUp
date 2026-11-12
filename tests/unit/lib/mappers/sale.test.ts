import { describe, expect, it } from "@jest/globals";
import { formatDay, formatTime } from "../../../../src/lib/driver/mappers/businessTime";
import { mapSale, type SaleLineInput } from "../../../../src/lib/driver/mappers/sale";

/** A delivered sale paid in USD only, as the backend sends it. */
function dto(overrides: Partial<SaleLineInput> = {}): SaleLineInput {
    return {
        id: "a3f1212c-b061-4f82-90c5-e057aa8fd564",
        saleNumber: 7,
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
        createdAt: "2026-12-15T13:30:00.000Z",
        isEdited: false,
        amountDiffers: false,
        deletionAwaiting: false,
        cancelReason: null,
        ...overrides,
    };
}

describe("mapSale", () => {
    it("maps a delivered sale", () => {
        expect(mapSale(dto())).toEqual({
            id: "a3f1212c-b061-4f82-90c5-e057aa8fd564",
            number: 7,
            clientPhone: "+96170123456",
            clientNumber: "+96170123456",
            time: "15:30",
            date: "15 Dec",
            status: "DELIVERED",
            amount: { usd: "10.00", lbp: "0.00" },
            deliveryFee: { usd: "2.00", lbp: "0.00" },
            tip: { usd: "0.00", lbp: "0.00" },
            discount: { usd: "0.00", lbp: "0.00" },
            changeGiven: { usd: "0.00", lbp: "0.00" },
            method: "CASH",
            isEdited: false,
            amountDiffers: false,
            deletionAwaiting: false,
            totalCollected: { usd: "12.00", lbp: "0.00" },
        });
    });

    it("keeps both currencies of one sale together", () => {
        const sale = mapSale(
            dto({
                businessAmountUsd: "10.00",
                businessAmountLbp: "100000.00",
                deliveryFeeUsd: "0.00",
                deliveryFeeLbp: "50000.00",
                totalCollectedUsd: "10.00",
                totalCollectedLbp: "150000.00",
            }),
        );
        expect(sale.amount).toEqual({ usd: "10.00", lbp: "100000.00" });
        expect(sale.deliveryFee).toEqual({ usd: "0.00", lbp: "50000.00" });
        expect(sale.totalCollected).toEqual({ usd: "10.00", lbp: "150000.00" });
    });

    it("keeps the change in its own currency", () => {
        const sale = mapSale(dto({ changeGivenUsd: "0.00", changeGivenLbp: "50000.00" }));
        expect(sale.changeGiven).toEqual({ usd: "0.00", lbp: "50000.00" });
    });

    it("gives a waiting sale no payment at all: the backend's nulls never become zeros", () => {
        const sale = mapSale(
            dto({
                status: "TO_DELIVER",
                moneyTaken: "NOT_YET",
                method: null,
                tipUsd: null,
                tipLbp: null,
                totalCollectedUsd: null,
                totalCollectedLbp: null,
                changeGivenUsd: null,
                changeGivenLbp: null,
            }),
        );
        expect(sale.status).toBe("TO_DELIVER");
        expect(sale).not.toHaveProperty("method");
        expect(sale).not.toHaveProperty("tip");
        expect(sale).not.toHaveProperty("totalCollected");
        expect(sale).not.toHaveProperty("changeGiven");
        // The order itself is still there.
        expect(sale.amount).toEqual({ usd: "10.00", lbp: "0.00" });
        expect(sale.deliveryFee).toEqual({ usd: "2.00", lbp: "0.00" });
    });

    it("keeps a delivered sale's tip and change", () => {
        const sale = mapSale(dto({ tipUsd: "1.00", changeGivenUsd: "3.00" }));
        expect(sale.tip).toEqual({ usd: "1.00", lbp: "0.00" });
        expect(sale.changeGiven).toEqual({ usd: "3.00", lbp: "0.00" });
    });

    it("names a sale without a client number a shop sale, but keeps the saved number null", () => {
        const sale = mapSale(dto({ clientNumber: null }));
        expect(sale.clientPhone).toBe("Shop sale");
        expect(sale.clientNumber).toBeNull();
    });

    it("sets the note only when there is one", () => {
        expect(mapSale(dto())).not.toHaveProperty("note");
        expect(mapSale(dto({ note: "Leave it at the door" })).note).toBe("Leave it at the door");
    });

    it("carries the review flags", () => {
        const sale = mapSale(dto({ isEdited: true, amountDiffers: true }));
        expect(sale.isEdited).toBe(true);
        expect(sale.amountDiffers).toBe(true);
    });

    it("carries an open deletion request", () => {
        expect(mapSale(dto({ deletionAwaiting: true })).deletionAwaiting).toBe(true);
    });

    it("sets the cancel reason only on a deleted sale that has one", () => {
        expect(mapSale(dto())).not.toHaveProperty("cancelReason");
        const deleted = mapSale(dto({ status: "DELETED", moneyTaken: "CANCELLED", cancelReason: "Client cancelled" }));
        expect(deleted.cancelReason).toBe("Client cancelled");
    });
});

describe("business time", () => {
    it("shows Beirut winter time (UTC+2)", () => {
        expect(formatTime("2026-12-15T13:30:00.000Z")).toBe("15:30");
    });

    it("shows Beirut summer time (UTC+3)", () => {
        expect(formatTime("2026-07-15T13:30:00.000Z")).toBe("16:30");
    });

    it("moves a late UTC time to the next Beirut day", () => {
        expect(formatDay("2026-12-15T23:30:00.000Z")).toBe("16 Dec");
    });

    it("writes September as Sep", () => {
        expect(formatDay("2026-09-15T10:00:00.000Z")).toBe("15 Sep");
    });
});
