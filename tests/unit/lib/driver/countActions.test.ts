import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { BusinessRuleError } from "@/shared/errors/service-errors";
import { emptyCounts, type CashCount } from "@/lib/driver/count-cash/denominations";
import type * as CountActions from "@/lib/driver/count-cash/actions";

/** A fake gateway method. */
type FakeGatewayCall = (...args: unknown[]) => Promise<unknown>;

const gateway = {
    saveCount: jest.fn<FakeGatewayCall>(),
    submitCashUpWithCount: jest.fn<FakeGatewayCall>(),
};
const revalidatePath = jest.fn();

let actions: typeof CountActions;

const COUNT: CashCount = { USD: { ...emptyCounts("USD"), "20": 2 }, LBP: emptyCounts("LBP") };

// Same pattern as saleActions.test.ts: the gateway switch is replaced, so these tests prove the actions talk only to it.
beforeAll(async () => {
    jest.doMock("next/cache", () => ({ revalidatePath }));
    jest.doMock("../../../../src/lib/driver/count-cash/countWrites", () => ({ countWrites: gateway }));
    actions = await import("../../../../src/lib/driver/count-cash/actions");
});

describe("saveCount", () => {
    it("passes the count to the gateway and refreshes Today and the count page", async () => {
        gateway.saveCount.mockResolvedValue({ ok: true });

        await expect(actions.saveCount(COUNT)).resolves.toEqual({ ok: true });

        expect(gateway.saveCount).toHaveBeenCalledWith(COUNT);
        expect(revalidatePath).toHaveBeenCalledWith("/today");
        expect(revalidatePath).toHaveBeenCalledWith("/count-cash");
    });

    it("refuses a broken count without calling the gateway", async () => {
        const broken = { USD: { ...emptyCounts("USD"), "20": -1 }, LBP: emptyCounts("LBP") };

        await expect(actions.saveCount(broken)).resolves.toEqual({ ok: false, code: "COUNT_INVALID" });
        expect(gateway.saveCount).not.toHaveBeenCalled();
    });

    it("passes FEATURE_NOT_READY on and refreshes nothing", async () => {
        gateway.saveCount.mockResolvedValue({ ok: false, code: "FEATURE_NOT_READY" });

        await expect(actions.saveCount(COUNT)).resolves.toEqual({ ok: false, code: "FEATURE_NOT_READY" });
        expect(revalidatePath).not.toHaveBeenCalled();
    });
});

describe("submitCashUpWithCount", () => {
    it("passes the count to the gateway's save-and-submit", async () => {
        gateway.submitCashUpWithCount.mockResolvedValue({ ok: true });

        await expect(actions.submitCashUpWithCount(COUNT)).resolves.toEqual({ ok: true });
        expect(gateway.submitCashUpWithCount).toHaveBeenCalledWith(COUNT);
    });

    it("turns a refused submit into its code (the gateway already saved the count)", async () => {
        gateway.submitCashUpWithCount.mockRejectedValue(new BusinessRuleError("SALES_AWAITING_DELIVERY"));

        await expect(actions.submitCashUpWithCount(COUNT)).resolves.toEqual({ ok: false, code: "SALES_AWAITING_DELIVERY" });
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("refuses a missing count without calling the gateway", async () => {
        await expect(actions.submitCashUpWithCount(null as unknown as CashCount)).resolves.toEqual({ ok: false, code: "COUNT_REQUIRED" });
        expect(gateway.submitCashUpWithCount).not.toHaveBeenCalled();
    });
});
