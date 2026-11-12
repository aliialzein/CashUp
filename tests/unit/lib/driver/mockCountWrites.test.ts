import { describe, expect, it } from "@jest/globals";
import { mockCountWrites } from "@/lib/driver/count-cash/mockCountWrites";
import { emptyCounts, type CashCount } from "@/lib/driver/count-cash/denominations";
import { getOpenCashUp } from "@/lib/driver/mock/today";

// The mock gateway changes the shared mock cash-up in memory, so these tests run in order; the last one closes it.

const COUNT: CashCount = { USD: { ...emptyCounts("USD"), "20": 2 }, LBP: { ...emptyCounts("LBP"), "100000": 1 } };

function openCashUp() {
    const cashUp = getOpenCashUp();
    if (cashUp === null) throw new Error("the mock scenario must have an open cash-up for these tests");
    return cashUp;
}

describe("mockCountWrites", () => {
    it("keeps a saved count on the open cash-up, so it loads again", async () => {
        await expect(mockCountWrites.saveCount(COUNT)).resolves.toEqual({ ok: true });
        expect(openCashUp().savedCounts).toEqual(COUNT);
    });

    it("refuses to submit while a sale waits for delivery, and keeps the count saved", async () => {
        const recount: CashCount = { ...COUNT, USD: { ...COUNT.USD, "20": 3 } };
        expect(openCashUp().sales.some((sale) => sale.status === "TO_DELIVER")).toBe(true);

        await expect(mockCountWrites.submitCashUpWithCount(recount)).resolves.toEqual({ ok: false, code: "SALES_AWAITING_DELIVERY" });
        expect(openCashUp().savedCounts).toEqual(recount);
    });

    it("refuses to submit while a deletion request is open", async () => {
        const cashUp = openCashUp();
        for (const sale of cashUp.sales) if (sale.status === "TO_DELIVER") sale.status = "DELIVERED";
        cashUp.sales[0].deletionAwaiting = true;

        await expect(mockCountWrites.submitCashUpWithCount(COUNT)).resolves.toEqual({ ok: false, code: "REQUESTS_AWAITING_DECISION" });
        cashUp.sales[0].deletionAwaiting = false;
    });

    it("submits when nothing blocks it, and closes the open cash-up", async () => {
        await expect(mockCountWrites.submitCashUpWithCount(COUNT)).resolves.toEqual({ ok: true });
        expect(getOpenCashUp()).toBeNull();
        await expect(mockCountWrites.saveCount(COUNT)).resolves.toEqual({ ok: false, code: "CASHUP_NOT_OPEN" });
    });
});
