import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import type { DriverDataSource } from "@/lib/driver/data/driverDataSource";
import { EntityNotFoundError } from "@/services/errors";

/** A fake backend read. It resolves to `unknown` so a test can hand back partial rows like { id, status }. */
type FakeBackendCall = (...args: unknown[]) => Promise<unknown>;

const listOwn = jest.fn<FakeBackendCall>();
const getOwn = jest.fn<FakeBackendCall>();

let realDriverData: DriverDataSource;

// doMock + import, not jest.mock: jest.mock is not moved above imports when `jest` is imported,
// and then the real context would load and reach for the database. Here the order is explicit.
// Relative paths on purpose: the "@/" alias is rewritten in static imports only.
beforeAll(async () => {
    jest.doMock("server-only", () => ({}));
    jest.doMock("../../../../src/server/context", () => ({
        currentActor: async () => ({ deps: { queries: { listOwn, getOwn } }, actor: { role: "STAFF" } }),
    }));
    ({ realDriverData } = await import("../../../../src/lib/driver/data/realDriverData"));
});

const VALID_ID = "3f2b8c1e-5a4d-4c7b-9e2f-1a2b3c4d5e6f";

describe("realDriverData.getOpenCashUp", () => {
    it("gives null when the driver has no open cash-up", async () => {
        listOwn.mockResolvedValue([{ id: "c1", status: "SUBMITTED" }]);

        await expect(realDriverData.getOpenCashUp()).resolves.toBeNull();
    });

    it("stops with a stable code while the open cash-up cannot be mapped yet", async () => {
        listOwn.mockResolvedValue([{ id: "c2", status: "OPEN" }]);

        await expect(realDriverData.getOpenCashUp()).rejects.toThrow("OPEN_CASH_UP_NOT_MAPPED");
    });
});

describe("realDriverData.getHistory", () => {
    it("gives an empty list when the driver has no cash-ups", async () => {
        listOwn.mockResolvedValue([]);

        await expect(realDriverData.getHistory()).resolves.toEqual([]);
    });

    it("asks the backend for its default page size", async () => {
        listOwn.mockResolvedValue([]);

        await realDriverData.getHistory();

        expect(listOwn).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ take: expect.any(Number) }));
    });

    it("stops with a stable code while history rows cannot be mapped yet", async () => {
        listOwn.mockResolvedValue([{ id: "c3", status: "APPROVED" }]);

        await expect(realDriverData.getHistory()).rejects.toThrow("HISTORY_NOT_MAPPED");
    });
});

describe("realDriverData.getCashUpDetail", () => {
    it("gives null for an id that is not a uuid, without asking the backend", async () => {
        await expect(realDriverData.getCashUpDetail("c-42")).resolves.toBeNull();

        expect(getOwn).not.toHaveBeenCalled();
    });

    it("gives null when the backend does not find the cash-up", async () => {
        getOwn.mockRejectedValue(new EntityNotFoundError());

        await expect(realDriverData.getCashUpDetail(VALID_ID)).resolves.toBeNull();
    });

    it.each(["OPEN", "VOID"])("gives null for a %s cash-up, because only locked ones have a detail page", async (status) => {
        getOwn.mockResolvedValue({ id: VALID_ID, status });

        await expect(realDriverData.getCashUpDetail(VALID_ID)).resolves.toBeNull();
    });

    it("stops with a stable code while a locked cash-up cannot be mapped yet", async () => {
        getOwn.mockResolvedValue({ id: VALID_ID, status: "SUBMITTED" });

        await expect(realDriverData.getCashUpDetail(VALID_ID)).rejects.toThrow("CASH_UP_DETAIL_NOT_MAPPED");
    });

    it("lets other backend errors through instead of hiding them", async () => {
        getOwn.mockRejectedValue(new Error("database down"));

        await expect(realDriverData.getCashUpDetail(VALID_ID)).rejects.toThrow("database down");
    });
});
