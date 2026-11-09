import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import type { DriverDataSource } from "@/lib/driver/data/driverDataSource";
import { EntityNotFoundError, UnauthenticatedError } from "@/shared/errors/service-errors";

/** A fake backend read. It resolves to `unknown` so a test can hand back partial rows like { id, status }. */
type FakeBackendCall = (...args: unknown[]) => Promise<unknown>;

const getOwnOpenCashUp = jest.fn<FakeBackendCall>();
const listOwnCashUps = jest.fn<FakeBackendCall>();
const getOwnCashUp = jest.fn<FakeBackendCall>();
const getOwnCounts = jest.fn<FakeBackendCall>();
const getCurrentUser = jest.fn<FakeBackendCall>();
/** Like the real redirect(): it never returns, it throws. */
const redirect = jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
});

let realDriverData: DriverDataSource;

// doMock + import, not jest.mock: jest.mock is not moved above imports when `jest` is imported,
// and then the real service would load and reach for the database. Here the order is explicit.
// Relative paths on purpose: the "@/" alias is rewritten in static imports only.
beforeAll(async () => {
    jest.doMock("server-only", () => ({}));
    jest.doMock("../../../../src/modules/cash-ups/cash-ups.service", () => ({
        getOwnOpenCashUp,
        listOwnCashUps,
        getOwnCashUp,
        getOwnCounts,
    }));
    // The session redirect (sessionRedirect.ts) is tested on its own; here only its wiring.
    jest.doMock("next/navigation", () => ({ redirect }));
    jest.doMock("../../../../src/modules/auth/auth.service", () => ({ getCurrentUser }));
    ({ realDriverData } = await import("../../../../src/lib/driver/data/realDriverData"));
});

describe("realDriverData without a session", () => {
    it("sends every read to the login page instead of crashing", async () => {
        getCurrentUser.mockResolvedValue(null);
        getOwnOpenCashUp.mockRejectedValue(new UnauthenticatedError());
        listOwnCashUps.mockRejectedValue(new UnauthenticatedError());
        getOwnCashUp.mockRejectedValue(new UnauthenticatedError());

        await expect(realDriverData.getOpenCashUp()).rejects.toThrow("NEXT_REDIRECT /login");
        await expect(realDriverData.getHistory()).rejects.toThrow("NEXT_REDIRECT /login");
        await expect(realDriverData.getCashUpDetail("3f2b8c1e-5a4d-4c7b-9e2f-1a2b3c4d5e6f")).rejects.toThrow("NEXT_REDIRECT /login");
        expect(redirect).toHaveBeenCalledTimes(3);
    });
});

const VALID_ID = "3f2b8c1e-5a4d-4c7b-9e2f-1a2b3c4d5e6f";

/** One backend history row. A test changes only the fields it cares about. */
function historyRow(changes: Record<string, unknown> = {}) {
    return {
        id: "c3",
        number: 42,
        status: "APPROVED",
        returnReason: null,
        openedAt: "2026-10-28T08:30:00.000Z",
        salesCount: 7,
        gapUsd: "-1.00",
        gapLbp: "0.00",
        ...changes,
    };
}

/** The driver's open cash-up as the backend sends it. A test changes only the fields it cares about. */
function openCashUpRow(changes: Record<string, unknown> = {}) {
    return {
        id: "c2",
        number: 43,
        status: "OPEN",
        returnReason: null,
        openedAt: "2026-10-28T06:30:00.000Z",
        countedUsd: null,
        countedLbp: null,
        ledger: {
            floatUsd: "50.00", floatLbp: "1000000.00",
            receivedUsd: "40.00", receivedLbp: "620000.00",
            changeGivenUsd: "3.00", changeGivenLbp: "0.00",
            cashOutsUsd: "5.00", cashOutsLbp: "200000.00",
            expectedUsd: "82.00", expectedLbp: "1420000.00",
        },
        sales: [],
        cashOuts: [],
        ...changes,
    };
}

/** The saved count as the backend sends it. */
function savedCountRow(changes: Record<string, unknown> = {}) {
    return {
        cashUpId: "c2",
        saved: true,
        countStartedAt: "2026-10-28T15:00:00.000Z",
        lines: [{ currency: "USD", denomination: "100.00", quantity: 2 }],
        countedTotals: { USD: "200.00", LBP: "0.00" },
        ...changes,
    };
}

describe("realDriverData.getOpenCashUp", () => {
    it("gives null when the driver has no open cash-up", async () => {
        getOwnOpenCashUp.mockResolvedValue(null);

        await expect(realDriverData.getOpenCashUp()).resolves.toBeNull();
    });

    it("maps an open cash-up with its number, ledger and saved count", async () => {
        getOwnOpenCashUp.mockResolvedValue(openCashUpRow());
        getOwnCounts.mockResolvedValue(savedCountRow());

        const cashUp = await realDriverData.getOpenCashUp();

        expect(cashUp?.number).toBe(43);
        expect(cashUp?.status).toBe("OPEN");
        expect(cashUp?.ledger.expected).toEqual({ usd: "82.00", lbp: "1420000.00" });
        expect(cashUp?.savedCounts?.USD["100"]).toBe(2);
        expect(getOwnCounts).toHaveBeenCalledWith("c2");
    });

    it("shows an open cash-up with a return reason as RETURNED", async () => {
        getOwnOpenCashUp.mockResolvedValue(openCashUpRow({ returnReason: "Count LBP again" }));
        getOwnCounts.mockResolvedValue(savedCountRow());

        const cashUp = await realDriverData.getOpenCashUp();

        expect(cashUp?.status).toBe("RETURNED");
        expect(cashUp?.returned).toEqual({ by: "Owner", text: "Count LBP again" });
    });

    it("has no saved count while the driver has not saved one", async () => {
        getOwnOpenCashUp.mockResolvedValue(openCashUpRow());
        getOwnCounts.mockResolvedValue(savedCountRow({ saved: false, countStartedAt: null, lines: [] }));

        const cashUp = await realDriverData.getOpenCashUp();

        expect(cashUp?.savedCounts).toBeNull();
    });

    it("fails loudly when an open cash-up comes without its ledger", async () => {
        getOwnOpenCashUp.mockResolvedValue(openCashUpRow({ ledger: null }));

        await expect(realDriverData.getOpenCashUp()).rejects.toThrow("OPEN_CASH_UP_WITHOUT_LEDGER");
        expect(getOwnCounts).not.toHaveBeenCalled();
    });

    it("keeps a cancelled cash-out, marked deleted", async () => {
        getOwnOpenCashUp.mockResolvedValue(
            openCashUpRow({
                cashOuts: [
                    {
                        id: "out-1",
                        amountUsd: "5.00",
                        amountLbp: "0.00",
                        reason: "Fuel",
                        note: null,
                        status: "CANCELLED",
                        cancelReason: "Typed twice",
                        createdAt: "2026-10-28T07:00:00.000Z",
                    },
                ],
            }),
        );
        getOwnCounts.mockResolvedValue(savedCountRow());

        const cashUp = await realDriverData.getOpenCashUp();

        expect(cashUp?.cashOuts).toHaveLength(1);
        expect(cashUp?.cashOuts[0]).toEqual(expect.objectContaining({ id: "out-1", isDeleted: true, cancelReason: "Typed twice" }));
    });
});

describe("realDriverData.getHistory", () => {
    it("gives an empty list when the driver has no cash-ups", async () => {
        listOwnCashUps.mockResolvedValue([]);

        await expect(realDriverData.getHistory()).resolves.toEqual([]);
    });

    it("asks the backend for its default page size", async () => {
        listOwnCashUps.mockResolvedValue([]);

        await realDriverData.getHistory();

        expect(listOwnCashUps).toHaveBeenCalledWith(expect.objectContaining({ take: expect.any(Number) }));
    });

    it("maps a backend row to a history row, with the frozen gap", async () => {
        listOwnCashUps.mockResolvedValue([historyRow()]);

        await expect(realDriverData.getHistory()).resolves.toEqual([
            expect.objectContaining({
                id: "c3",
                number: 42,
                status: "APPROVED",
                salesCount: 7,
                gap: { usd: "-1.00", lbp: "0.00" },
            }),
        ]);
    });

    it("shows an open cash-up with a return reason as RETURNED", async () => {
        listOwnCashUps.mockResolvedValue([
            historyRow({ status: "OPEN", returnReason: "Count again", gapUsd: null, gapLbp: null }),
        ]);

        await expect(realDriverData.getHistory()).resolves.toEqual([
            expect.objectContaining({ status: "RETURNED", returnReason: "Count again", gap: null }),
        ]);
    });

    it("leaves VOID cash-ups out of the list", async () => {
        listOwnCashUps.mockResolvedValue([historyRow({ id: "gone", status: "VOID" }), historyRow({ id: "kept" })]);

        const history = await realDriverData.getHistory();

        expect(history.map((row) => row.id)).toEqual(["kept"]);
    });
});

describe("realDriverData.getCashUpDetail", () => {
    it("gives null for an id that is not a uuid, without asking the backend", async () => {
        await expect(realDriverData.getCashUpDetail("c-42")).resolves.toBeNull();

        expect(getOwnCashUp).not.toHaveBeenCalled();
    });

    it("gives null when the backend does not find the cash-up", async () => {
        getOwnCashUp.mockRejectedValue(new EntityNotFoundError());

        await expect(realDriverData.getCashUpDetail(VALID_ID)).resolves.toBeNull();
    });

    it.each(["OPEN", "VOID"])("gives null for a %s cash-up, because only locked ones have a detail page", async (status) => {
        getOwnCashUp.mockResolvedValue({ id: VALID_ID, status });

        await expect(realDriverData.getCashUpDetail(VALID_ID)).resolves.toBeNull();
    });

    it("stops with a stable code while a locked cash-up cannot be mapped yet", async () => {
        getOwnCashUp.mockResolvedValue({ id: VALID_ID, status: "SUBMITTED" });

        await expect(realDriverData.getCashUpDetail(VALID_ID)).rejects.toThrow("CASH_UP_DETAIL_NOT_MAPPED");
    });

    it("lets other backend errors through instead of hiding them", async () => {
        getOwnCashUp.mockRejectedValue(new Error("database down"));

        await expect(realDriverData.getCashUpDetail(VALID_ID)).rejects.toThrow("database down");
    });
});
