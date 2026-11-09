import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { ConflictError } from "@/shared/errors/service-errors";
import { createCashOutSchema } from "@/modules/cash-outs/cash-outs.validation";
import type { AddCashOutInput } from "@/lib/driver/cash-out/actions";

/** A fake backend call. */
type FakeBackendCall = (...args: unknown[]) => Promise<unknown>;
type ActionOutcome = { ok: boolean; code?: string };

const getOwnOpenCashUp = jest.fn<FakeBackendCall>();
const createCashOut = jest.fn<FakeBackendCall>();
const cancelBackendCashOut = jest.fn<FakeBackendCall>();
const revalidatePath = jest.fn();

let addCashOut: (input: AddCashOutInput) => Promise<ActionOutcome>;
let cancelCashOut: (cashOutId: string, reason: string) => Promise<ActionOutcome>;

const OPEN_CASH_UP = { id: "cash-up-1" };
const SAVE_KEY = "4f0c7b1e-8a2d-4c6e-9b3f-2d1a5e7c9b0a";
// The form sends "0" for a currency left blank (blankAmountsToZero), so the inputs here do too.
const FUEL_INPUT: AddCashOutInput = {
    saveKey: SAVE_KEY,
    amount: { usd: "1,000.5", lbp: "0" },
    reason: "Fuel",
    detail: "",
    note: "  Filled the bike ",
};

// Same pattern as realDriverData.test.ts: doMock + dynamic import, relative paths.
// USE_MOCKS is forced off, so the real path runs against the fake backend.
beforeAll(async () => {
    jest.doMock("next/cache", () => ({ revalidatePath }));
    jest.doMock("../../../../src/lib/driver/useMocks", () => ({ USE_MOCKS: false }));
    jest.doMock("../../../../src/modules/cash-ups/cash-ups.service", () => ({ getOwnOpenCashUp }));
    jest.doMock("../../../../src/modules/cash-outs/cash-outs.service", () => ({
        createCashOut,
        cancelCashOut: cancelBackendCashOut,
    }));
    ({ addCashOut, cancelCashOut } = await import("../../../../src/lib/driver/cash-out/actions"));
});

describe("addCashOut (real backend)", () => {
    it("finds the open cash-up on the server and sends normalized money, the save key, the reason and the note", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        createCashOut.mockResolvedValue({ cashOut: {}, replayed: false });

        await expect(addCashOut(FUEL_INPUT)).resolves.toEqual({ ok: true });

        expect(createCashOut).toHaveBeenCalledWith("cash-up-1", {
            idempotencyKey: SAVE_KEY,
            amountUsd: "1000.50",
            amountLbp: "0.00",
            reason: "Fuel",
            note: "Filled the bike",
        });
        expect(revalidatePath).toHaveBeenCalledWith("/cash-outs");
        expect(revalidatePath).toHaveBeenCalledWith("/today");
    });

    it("sends Other as \"Other: <detail>\" and a blank note as null", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        createCashOut.mockResolvedValue({ cashOut: {}, replayed: false });

        await addCashOut({ ...FUEL_INPUT, amount: { usd: "5", lbp: "0" }, reason: "Other", detail: " Car wash ", note: "  " });

        expect(createCashOut).toHaveBeenCalledWith("cash-up-1", expect.objectContaining({ reason: "Other: Car wash", note: null }));
    });

    it("counts a replayed save (same key, same data) as a success", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        createCashOut.mockResolvedValue({ cashOut: {}, replayed: true });

        await expect(addCashOut({ ...FUEL_INPUT, amount: { usd: "5", lbp: "0" } })).resolves.toEqual({ ok: true });
    });

    it("refuses an amount it cannot normalize, without calling the backend", async () => {
        await expect(addCashOut({ ...FUEL_INPUT, amount: { usd: "1.000,50", lbp: "0" } })).resolves.toEqual({
            ok: false,
            code: "VALIDATION_ERROR",
        });

        expect(getOwnOpenCashUp).not.toHaveBeenCalled();
        expect(createCashOut).not.toHaveBeenCalled();
    });

    it("stays strict about a blank amount: turning blank into 0 is the form's job", async () => {
        await expect(addCashOut({ ...FUEL_INPUT, amount: { usd: "5", lbp: "" } })).resolves.toEqual({
            ok: false,
            code: "VALIDATION_ERROR",
        });

        expect(createCashOut).not.toHaveBeenCalled();
    });

    it("refuses Other without a detail, and an unknown category, without calling the backend", async () => {
        const amount = { usd: "5", lbp: "0" };
        await expect(addCashOut({ ...FUEL_INPUT, amount, reason: "Other", detail: " " })).resolves.toEqual({ ok: false, code: "VALIDATION_ERROR" });
        await expect(addCashOut({ ...FUEL_INPUT, amount, reason: "Lunch" })).resolves.toEqual({ ok: false, code: "VALIDATION_ERROR" });

        expect(createCashOut).not.toHaveBeenCalled();
    });

    it("says so when no cash-up is open", async () => {
        getOwnOpenCashUp.mockResolvedValue(null);

        await expect(addCashOut({ ...FUEL_INPUT, amount: { usd: "5", lbp: "0" } })).resolves.toEqual({ ok: false, code: "CASHUP_NOT_OPEN" });

        expect(createCashOut).not.toHaveBeenCalled();
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("turns a backend error into its code and refreshes nothing", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        createCashOut.mockRejectedValue(new ConflictError("IDEMPOTENCY_KEY_REUSED"));

        await expect(addCashOut({ ...FUEL_INPUT, amount: { usd: "5", lbp: "0" } })).resolves.toEqual({
            ok: false,
            code: "IDEMPOTENCY_KEY_REUSED",
        });
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("passes the backend's stable validation code on to the screen", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        const tooShort = createCashOutSchema.safeParse({ amountUsd: "5.00", amountLbp: "0.00", reason: "ab" });
        createCashOut.mockRejectedValue(tooShort.error);

        await expect(addCashOut({ ...FUEL_INPUT, amount: { usd: "5", lbp: "0" } })).resolves.toEqual({
            ok: false,
            code: "REASON_TOO_SHORT",
        });
    });
});

describe("cancelCashOut (real backend)", () => {
    it("cancels the cash-out in the open cash-up found on the server, with the given reason", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        cancelBackendCashOut.mockResolvedValue({ cashOut: {} });

        await expect(cancelCashOut("cash-out-7", "Typed twice")).resolves.toEqual({ ok: true });

        expect(cancelBackendCashOut).toHaveBeenCalledWith("cash-up-1", "cash-out-7", "Typed twice");
        expect(revalidatePath).toHaveBeenCalledWith("/cash-outs");
    });

    it("says so when no cash-up is open", async () => {
        getOwnOpenCashUp.mockResolvedValue(null);

        await expect(cancelCashOut("cash-out-7", "Typed twice")).resolves.toEqual({ ok: false, code: "CASHUP_NOT_OPEN" });
        expect(cancelBackendCashOut).not.toHaveBeenCalled();
    });

    it("turns a backend error into its code", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        cancelBackendCashOut.mockRejectedValue(new ConflictError());

        await expect(cancelCashOut("cash-out-7", "Typed twice")).resolves.toEqual({ ok: false, code: "CONFLICT" });
        expect(revalidatePath).not.toHaveBeenCalled();
    });
});
