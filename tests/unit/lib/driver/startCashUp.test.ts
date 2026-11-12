import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { openCashUpSchema } from "@/modules/cash-ups/cash-ups.validation";
import { DEFAULT_REFERENCE_RATE_LBP } from "@/lib/driver/cash-up/referenceRate";

/** A fake backend call. */
type FakeBackendCall = (...args: unknown[]) => Promise<unknown>;

const openCashUp = jest.fn<FakeBackendCall>();
const revalidatePath = jest.fn();

let startCashUp: (float: { usd: string; lbp: string }, typedRate: string) => Promise<{ ok: boolean; code?: string }>;

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
    it("sends the float and the default rate in the canonical two-decimal form", async () => {
        openCashUp.mockResolvedValue({});

        await expect(startCashUp({ usd: "50", lbp: "1000000" }, DEFAULT_REFERENCE_RATE_LBP)).resolves.toEqual({ ok: true });

        expect(openCashUp).toHaveBeenCalledWith({ floatUsd: "50.00", floatLbp: "1000000.00", referenceRate: "90000.00" });
    });

    it("sends a rate the driver changed, commas removed", async () => {
        openCashUp.mockResolvedValue({});

        await startCashUp({ usd: "0", lbp: "0" }, "89,500");

        expect(openCashUp).toHaveBeenCalledWith({ floatUsd: "0.00", floatLbp: "0.00", referenceRate: "89500.00" });
    });

    it("sends no rate at all when the field was cleared", async () => {
        openCashUp.mockResolvedValue({});

        await startCashUp({ usd: "50", lbp: "0" }, "");

        expect(openCashUp).toHaveBeenCalledWith({ floatUsd: "50.00", floatLbp: "0.00" });
    });

    it("refuses a rate it cannot read, without calling the backend", async () => {
        await expect(startCashUp({ usd: "50", lbp: "0" }, "9a")).resolves.toEqual({ ok: false, code: "REFERENCE_RATE_INVALID" });
        expect(openCashUp).not.toHaveBeenCalled();
    });

    it("words the backend's \"not positive\" refusal (a rate of 0) for the rate", async () => {
        const zeroRate = openCashUpSchema.safeParse({ floatUsd: "50.00", floatLbp: "0.00", referenceRate: "0.00" });
        openCashUp.mockRejectedValue(zeroRate.error);

        await expect(startCashUp({ usd: "50", lbp: "0" }, "0")).resolves.toEqual({ ok: false, code: "REFERENCE_RATE_INVALID" });
    });

    it("passes the backend's \"too high\" refusal on", async () => {
        const tooHigh = openCashUpSchema.safeParse({ floatUsd: "50.00", floatLbp: "0.00", referenceRate: "99999999.00" });
        openCashUp.mockRejectedValue(tooHigh.error);

        await expect(startCashUp({ usd: "50", lbp: "0" }, "99,999,999")).resolves.toEqual({
            ok: false,
            code: "REFERENCE_RATE_EXCEEDS_MAX",
        });
    });

    it("refuses an amount it cannot normalize, without calling the backend", async () => {
        await expect(startCashUp({ usd: "1.000,50", lbp: "0" }, DEFAULT_REFERENCE_RATE_LBP)).resolves.toEqual({
            ok: false,
            code: "VALIDATION_ERROR",
        });

        expect(openCashUp).not.toHaveBeenCalled();
    });

    it("refuses a blank amount (the form already turns blank into 0 before sending)", async () => {
        await expect(startCashUp({ usd: "", lbp: "0" }, DEFAULT_REFERENCE_RATE_LBP)).resolves.toEqual({
            ok: false,
            code: "VALIDATION_ERROR",
        });

        expect(openCashUp).not.toHaveBeenCalled();
    });
});
