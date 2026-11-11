import { describe, expect, it } from "@jest/globals";
import { NOTE_MAX, REASON_LENGTH } from "@/domain/money/config";
import { mockCashOutWrites } from "@/lib/driver/cash-out/mockCashOutWrites";
import type { CashOutDetails } from "@/lib/driver/cash-out/cashOutWriteGateway";
import { getOpenCashUp } from "@/lib/driver/mock/today";

// The mock gateway changes the shared mock open cash-up in memory; each test uses its own save key.

const FUEL: CashOutDetails = { amount: { usd: "5.00", lbp: "0.00" }, reason: "Fuel", note: null };

function openCashUp() {
    const cashUp = getOpenCashUp();
    if (cashUp === null) throw new Error("the mock scenario must have an open cash-up for these tests");
    return cashUp;
}

/** Adds a cash-out with its own save key and returns it (it goes first in the list). */
async function addCashOut(saveKey: string, details: CashOutDetails = FUEL) {
    await expect(mockCashOutWrites.addCashOut(details, saveKey)).resolves.toEqual({ ok: true });
    return openCashUp().cashOuts[0];
}

describe("mockCashOutWrites.addCashOut", () => {
    it("keeps the cash-out at the top with its category, detail and note, and moves Total out and Expected", async () => {
        const { ledger } = openCashUp();
        const before = { cashOuts: ledger.cashOuts, expected: ledger.expected };

        const cashOut = await addCashOut("key-add", {
            amount: { usd: "2.50", lbp: "100000.00" },
            reason: "Other: Car wash",
            note: "Before the trip",
        });

        expect(cashOut).toMatchObject({ reason: "Other", detail: "Car wash", note: "Before the trip", isDeleted: false });
        expect(openCashUp().ledger.cashOuts).not.toEqual(before.cashOuts);
        expect(openCashUp().ledger.expected).not.toEqual(before.expected);
    });

    it("adds a repeated save (same key) only once", async () => {
        await addCashOut("key-repeat");
        const count = openCashUp().cashOuts.length;

        await expect(mockCashOutWrites.addCashOut(FUEL, "key-repeat")).resolves.toEqual({ ok: true });
        expect(openCashUp().cashOuts).toHaveLength(count);
    });

    it.each([
        ["REASON_TOO_SHORT", { ...FUEL, reason: "x".repeat(REASON_LENGTH.min - 1) }],
        ["REASON_TOO_LONG", { ...FUEL, reason: "x".repeat(REASON_LENGTH.max + 1) }],
        ["CONTROL_CHARACTER", { ...FUEL, reason: "Fuel\u0007" }],
        ["NOTE_TOO_LONG", { ...FUEL, note: "x".repeat(NOTE_MAX + 1) }],
        ["MONEY_MUST_BE_POSITIVE", { ...FUEL, amount: { usd: "0.00", lbp: "0.00" } }],
    ])("refuses with %s, like the backend, and adds nothing", async (code, details) => {
        const count = openCashUp().cashOuts.length;

        await expect(mockCashOutWrites.addCashOut(details, `key-${code}`)).resolves.toEqual({ ok: false, code });
        expect(openCashUp().cashOuts).toHaveLength(count);
    });
});

describe("mockCashOutWrites.cancelCashOut", () => {
    it("marks the cash-out deleted with its trimmed reason and gives the totals back", async () => {
        const totalsBefore = { ...openCashUp().ledger };
        const cashOut = await addCashOut("key-delete");

        await expect(mockCashOutWrites.cancelCashOut(cashOut.id, "  Typed twice ")).resolves.toEqual({ ok: true });

        expect(cashOut).toMatchObject({ isDeleted: true, cancelReason: "Typed twice" });
        expect(openCashUp().ledger.cashOuts).toEqual(totalsBefore.cashOuts);
        expect(openCashUp().ledger.expected).toEqual(totalsBefore.expected);
    });

    it("answers CONFLICT for a cash-out that is already deleted", async () => {
        const cashOut = await addCashOut("key-delete-twice");
        await mockCashOutWrites.cancelCashOut(cashOut.id, "Typed twice");

        await expect(mockCashOutWrites.cancelCashOut(cashOut.id, "Typed twice")).resolves.toEqual({ ok: false, code: "CONFLICT" });
    });

    it("checks the reason like the backend, before looking for the cash-out", async () => {
        const cashOut = await addCashOut("key-delete-short");

        await expect(mockCashOutWrites.cancelCashOut(cashOut.id, "ab")).resolves.toEqual({ ok: false, code: "REASON_TOO_SHORT" });
        expect(cashOut.isDeleted).toBe(false);
    });

    it("answers ENTITY_NOT_FOUND for an unknown cash-out", async () => {
        await expect(mockCashOutWrites.cancelCashOut("no-such-cash-out", "Typed twice")).resolves.toEqual({
            ok: false,
            code: "ENTITY_NOT_FOUND",
        });
    });
});
