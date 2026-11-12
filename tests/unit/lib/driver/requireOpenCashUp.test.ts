import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import type { CashUp } from "@/types/driver/cash-up";

const getOpenCashUp = jest.fn<() => Promise<CashUp | null>>();
// The real redirect() also throws, so the page stops at that line.
const redirect = jest.fn<(url: string) => never>(() => {
    throw new Error("NEXT_REDIRECT");
});

let requireOpenCashUp: () => Promise<CashUp>;

// doMock + import so the fakes are in place before the file under test loads (see realDriverData.test.ts).
beforeAll(async () => {
    jest.doMock("server-only", () => ({}));
    jest.doMock("next/navigation", () => ({ redirect }));
    jest.doMock("../../../../src/lib/driver/data/driverData", () => ({ driverData: { getOpenCashUp } }));
    ({ requireOpenCashUp } = await import("../../../../src/lib/driver/data/requireOpenCashUp"));
});

describe("requireOpenCashUp", () => {
    it("gives back the open cash-up", async () => {
        const openCashUp = { id: "c-43", number: 43 } as CashUp;
        getOpenCashUp.mockResolvedValue(openCashUp);

        await expect(requireOpenCashUp()).resolves.toBe(openCashUp);
        expect(redirect).not.toHaveBeenCalled();
    });

    it("sends the driver to Today when no cash-up is open", async () => {
        getOpenCashUp.mockResolvedValue(null);

        await expect(requireOpenCashUp()).rejects.toThrow("NEXT_REDIRECT");
        expect(redirect).toHaveBeenCalledWith("/today");
    });
});
