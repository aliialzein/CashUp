import { beforeAll, describe, expect, it, jest } from "@jest/globals";

/** A fake backend call. */
type FakeBackendCall = (...args: unknown[]) => Promise<unknown>;

const openCashUp = jest.fn<FakeBackendCall>();
const revalidatePath = jest.fn();

let startCashUp: (float: { usd: string; lbp: string }) => Promise<{ ok: boolean; code?: string }>;

// Same pattern as realDriverData.test.ts: doMock + dynamic import, relative paths.
// USE_MOCKS is forced off, so the real path runs against the fake backend.
beforeAll(async () => {
    jest.doMock("next/cache", () => ({ revalidatePath }));
    jest.doMock("../../../../src/lib/driver/useMocks", () => ({ USE_MOCKS: false }));
    jest.doMock("../../../../src/modules/cash-ups/cash-ups.service", () => ({
        openCashUp,
        getOwnOpenCashUp: jest.fn(),
        voidOwnOpenCashUp: jest.fn(),
    }));
    ({ startCashUp } = await import("../../../../src/lib/driver/cash-up/actions"));
});

describe("startCashUp (real backend)", () => {
    it("sends the float in the canonical two-decimal form", async () => {
        openCashUp.mockResolvedValue({});

        await expect(startCashUp({ usd: "50", lbp: "1000000" })).resolves.toEqual({ ok: true });

        expect(openCashUp).toHaveBeenCalledWith({ floatUsd: "50.00", floatLbp: "1000000.00" });
    });

    it("refuses an amount it cannot normalize, without calling the backend", async () => {
        await expect(startCashUp({ usd: "1.000,50", lbp: "0" })).resolves.toEqual({ ok: false, code: "VALIDATION_ERROR" });

        expect(openCashUp).not.toHaveBeenCalled();
    });

    it("refuses a blank amount (the form already turns blank into 0 before sending)", async () => {
        await expect(startCashUp({ usd: "", lbp: "0" })).resolves.toEqual({ ok: false, code: "VALIDATION_ERROR" });

        expect(openCashUp).not.toHaveBeenCalled();
    });
});
