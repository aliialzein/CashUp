import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { BusinessRuleError } from "@/shared/errors/service-errors";
import { emptyCounts, type CashCount } from "@/lib/driver/count-cash/denominations";
import type { CountWriteGateway } from "@/lib/driver/count-cash/countWriteGateway";

/** A fake backend call. */
type FakeBackendCall = (...args: unknown[]) => Promise<unknown>;

const getOwnOpenCashUp = jest.fn<FakeBackendCall>();
const replaceOwnCounts = jest.fn<FakeBackendCall>();
const submitCashUp = jest.fn<FakeBackendCall>();

let realCountWrites: CountWriteGateway;

const OPEN_CASH_UP = { id: "cash-up-1" };

/** A count with only the given notes; every other note is 0. */
function count(usd: Record<string, number> = {}, lbp: Record<string, number> = {}): CashCount {
    return { USD: { ...emptyCounts("USD"), ...usd }, LBP: { ...emptyCounts("LBP"), ...lbp } };
}

// Same pattern as realSaleWrites.test.ts: doMock + dynamic import, relative paths.
beforeAll(async () => {
    jest.doMock("server-only", () => ({}));
    jest.doMock("../../../../src/modules/cash-ups/cash-ups.service", () => ({ getOwnOpenCashUp, replaceOwnCounts, submitCashUp }));
    ({ realCountWrites } = await import("../../../../src/lib/driver/count-cash/realCountWrites"));
});

describe("realCountWrites.saveCount", () => {
    it("sends only the counted notes, in the backend's form, to the open cash-up found on the server", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        replaceOwnCounts.mockResolvedValue({});

        await expect(realCountWrites.saveCount(count({ "20": 2, "1": 3 }, { "100000": 5 }))).resolves.toEqual({ ok: true });

        expect(replaceOwnCounts).toHaveBeenCalledWith("cash-up-1", {
            lines: [
                { currency: "USD", denomination: "20.00", quantity: 2 },
                { currency: "USD", denomination: "1.00", quantity: 3 },
                { currency: "LBP", denomination: "100000.00", quantity: 5 },
            ],
        });
        expect(submitCashUp).not.toHaveBeenCalled();
    });

    it("sends no line at all for an empty drawer (the backend then knows the count started)", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        replaceOwnCounts.mockResolvedValue({});

        await realCountWrites.saveCount(count());

        expect(replaceOwnCounts).toHaveBeenCalledWith("cash-up-1", { lines: [] });
    });

    it("sends counted USD 0.10 notes as \"0.10\" (the backend accepts them since the merge)", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        replaceOwnCounts.mockResolvedValue({});

        await expect(realCountWrites.saveCount(count({ "0.10": 4, "20": 1 }))).resolves.toEqual({ ok: true });

        expect(replaceOwnCounts).toHaveBeenCalledWith("cash-up-1", {
            lines: [
                { currency: "USD", denomination: "20.00", quantity: 1 },
                { currency: "USD", denomination: "0.10", quantity: 4 },
            ],
        });
    });

    it("does not mind USD 0.10 when none were counted", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        replaceOwnCounts.mockResolvedValue({});

        await expect(realCountWrites.saveCount(count({ "0.10": 0, "5": 1 }))).resolves.toEqual({ ok: true });
    });

    it("says so when no cash-up is open", async () => {
        getOwnOpenCashUp.mockResolvedValue(null);

        await expect(realCountWrites.saveCount(count({ "5": 1 }))).resolves.toEqual({ ok: false, code: "CASHUP_NOT_OPEN" });
        expect(replaceOwnCounts).not.toHaveBeenCalled();
    });
});

describe("realCountWrites.submitCashUpWithCount", () => {
    it("saves the count, then submits the open cash-up", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        replaceOwnCounts.mockResolvedValue({});
        submitCashUp.mockResolvedValue({});

        await expect(realCountWrites.submitCashUpWithCount(count({ "50": 1 }))).resolves.toEqual({ ok: true });

        expect(replaceOwnCounts).toHaveBeenCalledWith("cash-up-1", { lines: [{ currency: "USD", denomination: "50.00", quantity: 1 }] });
        expect(submitCashUp).toHaveBeenCalledWith("cash-up-1");
    });

    it("keeps the count saved when the submit is refused, and throws the refusal on", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        replaceOwnCounts.mockResolvedValue({});
        const waiting = new BusinessRuleError("SALES_AWAITING_DELIVERY");
        submitCashUp.mockRejectedValue(waiting);

        await expect(realCountWrites.submitCashUpWithCount(count({ "50": 1 }))).rejects.toBe(waiting);
        expect(replaceOwnCounts).toHaveBeenCalledTimes(1);
    });

    it("saves and submits a count with USD 0.10 notes", async () => {
        getOwnOpenCashUp.mockResolvedValue(OPEN_CASH_UP);
        replaceOwnCounts.mockResolvedValue({});
        submitCashUp.mockResolvedValue({});

        await expect(realCountWrites.submitCashUpWithCount(count({ "0.10": 1 }))).resolves.toEqual({ ok: true });
        expect(submitCashUp).toHaveBeenCalledWith("cash-up-1");
    });
});

describe("realCountWrites with a note the backend does not accept", () => {
    it("answers FEATURE_NOT_READY without calling the backend (tested with a backend list that has no USD 0.10)", async () => {
        let gateway: CountWriteGateway | undefined;
        // Own module set, so only this test sees the shortened backend list.
        await jest.isolateModulesAsync(async () => {
            jest.doMock("server-only", () => ({}));
            jest.doMock("../../../../src/modules/cash-ups/cash-ups.service", () => ({ getOwnOpenCashUp, replaceOwnCounts, submitCashUp }));
            jest.doMock("../../../../src/domain/money/config", () => {
                const actual = jest.requireActual<typeof import("../../../../src/domain/money/config")>("../../../../src/domain/money/config");
                return { ...actual, DENOMINATIONS: { ...actual.DENOMINATIONS, USD: actual.DENOMINATIONS.USD.filter((note) => note !== "0.10") } };
            });
            ({ realCountWrites: gateway } = await import("../../../../src/lib/driver/count-cash/realCountWrites"));
        });

        await expect(gateway?.saveCount(count({ "0.10": 4, "20": 1 }))).resolves.toEqual({ ok: false, code: "FEATURE_NOT_READY" });
        await expect(gateway?.submitCashUpWithCount(count({ "0.10": 1 }))).resolves.toEqual({ ok: false, code: "FEATURE_NOT_READY" });
        expect(getOwnOpenCashUp).not.toHaveBeenCalled();
        expect(replaceOwnCounts).not.toHaveBeenCalled();
        expect(submitCashUp).not.toHaveBeenCalled();
    });
});

/** Every .ts/.tsx file under a folder. */
function sourceFiles(folder: string): string[] {
    return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
        const path = join(folder, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.tsx?$/.test(entry.name) ? [path] : [];
    });
}

/** An import of replaceOwnCounts or submitCashUp from the cash-ups service. */
const COUNT_SERVICE_IMPORT = /import\s*{[^}]*\b(replaceOwnCounts|submitCashUp)\b[^}]*}\s*from\s*["'][^"']*modules\/cash-ups\/cash-ups\.service["']/;

describe("the count and submit service boundary", () => {
    it("is imported by realCountWrites.ts only (outside the backend itself)", () => {
        const sourceRoot = join(process.cwd(), "src");
        const importers = sourceFiles(sourceRoot)
            .filter((path) => !relative(sourceRoot, path).startsWith("modules"))
            .filter((path) => COUNT_SERVICE_IMPORT.test(readFileSync(path, "utf8")))
            .map((path) => relative(sourceRoot, path));

        expect(importers).toEqual([join("lib", "driver", "count-cash", "realCountWrites.ts")]);
    });
});
