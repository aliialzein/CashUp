import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { BusinessRuleError } from "@/shared/errors/service-errors";

/** A fake backend call. It resolves to `unknown` so a test can hand back partial rows. */
type FakeBackendCall = (...args: unknown[]) => Promise<unknown>;

const getOwnOpenCashUp = jest.fn<FakeBackendCall>();
const voidOwnOpenCashUp = jest.fn<FakeBackendCall>();
const revalidatePath = jest.fn();

let cancelCashUp: () => Promise<{ ok: boolean; code?: string }>;

// Same pattern as realDriverData.test.ts: doMock + dynamic import, relative paths.
// USE_MOCKS is forced off, so the real path runs against the fake backend.
beforeAll(async () => {
    jest.doMock("next/cache", () => ({ revalidatePath }));
    jest.doMock("../../../../src/lib/driver/useMocks", () => ({ USE_MOCKS: false }));
    jest.doMock("../../../../src/modules/cash-ups/cash-ups.service", () => ({
        getOwnOpenCashUp,
        voidOwnOpenCashUp,
        openCashUp: jest.fn(),
    }));
    ({ cancelCashUp } = await import("../../../../src/lib/driver/cash-up/actions"));
});

/** The driver's open cash-up as the backend sends it, only the fields the check reads. */
function openCashUpRow(changes: Record<string, unknown> = {}) {
    return { id: "c1", status: "OPEN", returnReason: null, sales: [], cashOuts: [], ...changes };
}

describe("cancelCashUp (real backend)", () => {
    it("cancels an empty cash-up with the fixed reason, then refreshes Today", async () => {
        getOwnOpenCashUp.mockResolvedValue(openCashUpRow());
        voidOwnOpenCashUp.mockResolvedValue({});

        await expect(cancelCashUp()).resolves.toEqual({ ok: true });

        expect(voidOwnOpenCashUp).toHaveBeenCalledWith("c1", "Empty cash-up");
        expect(revalidatePath).toHaveBeenCalledWith("/today");
    });

    it("does not cancel a cash-up that has a sale, even a deleted one", async () => {
        getOwnOpenCashUp.mockResolvedValue(openCashUpRow({ sales: [{ id: "s1", status: "DELETED" }] }));

        await expect(cancelCashUp()).resolves.toEqual({ ok: false, code: "CASHUP_NOT_EMPTY" });

        expect(voidOwnOpenCashUp).not.toHaveBeenCalled();
    });

    it("does not cancel a cash-up whose only cash-out is deleted", async () => {
        getOwnOpenCashUp.mockResolvedValue(openCashUpRow({ cashOuts: [{ id: "o1", status: "CANCELLED" }] }));

        await expect(cancelCashUp()).resolves.toEqual({ ok: false, code: "CASHUP_NOT_EMPTY" });

        expect(voidOwnOpenCashUp).not.toHaveBeenCalled();
    });

    it("does not cancel a returned cash-up, like the Today screen", async () => {
        getOwnOpenCashUp.mockResolvedValue(openCashUpRow({ returnReason: "Count again" }));

        await expect(cancelCashUp()).resolves.toEqual({ ok: false, code: "CASHUP_NOT_EMPTY" });

        expect(voidOwnOpenCashUp).not.toHaveBeenCalled();
    });

    it("says the cash-up is no longer open when there is none", async () => {
        getOwnOpenCashUp.mockResolvedValue(null);

        await expect(cancelCashUp()).resolves.toEqual({ ok: false, code: "CASHUP_NOT_OPEN" });

        expect(voidOwnOpenCashUp).not.toHaveBeenCalled();
    });

    it("turns a backend error into its code and does not refresh", async () => {
        getOwnOpenCashUp.mockResolvedValue(openCashUpRow());
        voidOwnOpenCashUp.mockRejectedValue(new BusinessRuleError("CASHUP_NOT_OPEN"));

        await expect(cancelCashUp()).resolves.toEqual({ ok: false, code: "CASHUP_NOT_OPEN" });

        expect(revalidatePath).not.toHaveBeenCalled();
    });
});
