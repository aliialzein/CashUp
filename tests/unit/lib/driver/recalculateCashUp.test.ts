import { describe, expect, it } from "@jest/globals";
import { recalculateMockCashUp } from "@/lib/driver/mock/recalculateCashUp";
import type { CashOut, CashUp, Sale } from "@/types/driver/cash-up";

const NONE = { usd: "0", lbp: "0" };

/** A fresh mock cash-up: $50 float, one sale still to deliver ($20 + $2 fee), nothing else. */
function cashUp(changes: Partial<CashUp> = {}): CashUp {
    const waiting: Sale = {
        id: "s-1",
        number: 1,
        clientPhone: "+96170123456",
        clientNumber: "+96170123456",
        time: "10:00",
        status: "TO_DELIVER",
        amount: { usd: "20", lbp: "0" },
        deliveryFee: { usd: "2", lbp: "0" },
    };
    return recalculateMockCashUp({
        id: "cu-1",
        number: 1,
        status: "OPEN",
        returned: null,
        startedAt: "27 Oct, 08:30",
        referenceRate: null,
        ledger: { float: { usd: "50", lbp: "0" }, received: NONE, changeGiven: NONE, cashOuts: NONE, expected: NONE },
        salesCount: 0,
        salesTotal: NONE,
        counted: null,
        savedCounts: null,
        deliveredTotal: NONE,
        waitingTotal: NONE,
        sales: [waiting],
        cashOuts: [],
        ...changes,
    });
}

/** Marks the sale delivered the way the mock gateway does. */
function deliver(target: CashUp, method: NonNullable<Sale["method"]>, collected: Sale["amount"], change = NONE): CashUp {
    const [sale] = target.sales;
    Object.assign(sale, { status: "DELIVERED", method, totalCollected: collected, changeGiven: change, tip: NONE });
    return recalculateMockCashUp(target);
}

const FUEL: CashOut = { id: "co-1", reason: "Fuel", time: "10:20", amount: { usd: "5", lbp: "0" }, isDeleted: false };

describe("recalculateMockCashUp (backend's buildCashLedger on the mock data)", () => {
    it("starts with the float as expected cash and the waiting sale on the sale cards", () => {
        const fresh = cashUp();
        expect(fresh.ledger.expected).toEqual({ usd: "50.00", lbp: "0.00" });
        expect(fresh.salesCount).toBe(1);
        expect(fresh.waitingTotal).toEqual({ usd: "22", lbp: "0" });
    });

    it("a cash delivery raises received and expected (collected minus the change)", () => {
        const delivered = deliver(cashUp(), "CASH", { usd: "30", lbp: "0" }, { usd: "8", lbp: "0" });

        expect(delivered.ledger.received).toEqual({ usd: "30.00", lbp: "0.00" });
        expect(delivered.ledger.changeGiven).toEqual({ usd: "8.00", lbp: "0.00" });
        expect(delivered.ledger.expected).toEqual({ usd: "72.00", lbp: "0.00" });
        expect(delivered.deliveredTotal).toEqual({ usd: "22", lbp: "0" });
        expect(delivered.waitingTotal).toEqual({ usd: "0.00", lbp: "0.00" });
    });

    it("a Whish delivery does not touch the drawer", () => {
        const delivered = deliver(cashUp(), "WHISH", { usd: "22", lbp: "0" });

        expect(delivered.ledger.received).toEqual({ usd: "0.00", lbp: "0.00" });
        expect(delivered.ledger.expected).toEqual({ usd: "50.00", lbp: "0.00" });
        expect(delivered.deliveredTotal).toEqual({ usd: "22", lbp: "0" });
    });

    it("a cash-out lowers expected, and shows as money out (negative)", () => {
        const withCashOut = cashUp({ cashOuts: [{ ...FUEL }] });

        expect(withCashOut.ledger.cashOuts).toEqual({ usd: "-5", lbp: "0" });
        expect(withCashOut.ledger.expected).toEqual({ usd: "45.00", lbp: "0.00" });
    });

    it("a deleted cash-out no longer counts", () => {
        const withDeleted = cashUp({ cashOuts: [{ ...FUEL, isDeleted: true, cancelReason: "Typed twice" }] });

        expect(withDeleted.ledger.cashOuts).toEqual({ usd: "0", lbp: "0" });
        expect(withDeleted.ledger.expected).toEqual({ usd: "50.00", lbp: "0.00" });
    });

    it("a deleted sale leaves the sale cards", () => {
        const target = cashUp();
        target.sales[0].status = "DELETED";

        expect(recalculateMockCashUp(target).salesCount).toBe(0);
    });

    it("fails loudly for a delivered mock sale without its payment (a mock data bug)", () => {
        const target = cashUp();
        target.sales[0].status = "DELIVERED";

        expect(() => recalculateMockCashUp(target)).toThrow("MOCK_DELIVERED_SALE_WITHOUT_PAYMENT");
    });
});

describe("the open mock cash-up", () => {
    it("starts with exactly the totals it always showed ($60 and 1,300,000 LBP expected)", async () => {
        const { mockOpenCashUp } = await import("@/lib/driver/mock/cash-up");

        expect(mockOpenCashUp.ledger.expected).toEqual({ usd: "60.00", lbp: "1300000.00" });
        expect(mockOpenCashUp.ledger.cashOuts).toEqual({ usd: "-5", lbp: "-200000" });
    });
});
