import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { shouldUseMocks } from "@/lib/driver/useMocks";

describe("shouldUseMocks", () => {
    it.each([
        ["USE_MOCKS is not set (development)", { NODE_ENV: "development" }, false],
        ["USE_MOCKS is \"1\" (development)", { USE_MOCKS: "1", NODE_ENV: "development" }, true],
        ["USE_MOCKS is \"1\" (test)", { USE_MOCKS: "1", NODE_ENV: "test" }, true],
        ["USE_MOCKS is \"0\"", { USE_MOCKS: "0", NODE_ENV: "development" }, false],
        ["USE_MOCKS is empty", { USE_MOCKS: "", NODE_ENV: "development" }, false],
        ["USE_MOCKS is \"true\" (only exactly \"1\" counts)", { USE_MOCKS: "true", NODE_ENV: "development" }, false],
        ["USE_MOCKS is \" 1\" (no trimming)", { USE_MOCKS: " 1", NODE_ENV: "development" }, false],
        ["production, USE_MOCKS not set", { NODE_ENV: "production" }, false],
        ["production, even with USE_MOCKS \"1\"", { USE_MOCKS: "1", NODE_ENV: "production" }, false],
    ])("%s -> mocks %s", (_case, environment, expected) => {
        expect(shouldUseMocks(environment)).toBe(expected);
    });
});

describe("USE_MOCKS (read from the real environment when the file loads)", () => {
    const savedUseMocks = process.env.USE_MOCKS;

    afterEach(() => {
        if (savedUseMocks === undefined) delete process.env.USE_MOCKS;
        else process.env.USE_MOCKS = savedUseMocks;
    });

    async function loadUseMocks(): Promise<boolean> {
        let value = false;
        await jest.isolateModulesAsync(async () => {
            ({ USE_MOCKS: value } = await import("@/lib/driver/useMocks"));
        });
        return value;
    }

    it("is off when USE_MOCKS is not set: real data by default", async () => {
        delete process.env.USE_MOCKS;
        await expect(loadUseMocks()).resolves.toBe(false);
    });

    it("is on when USE_MOCKS is \"1\" outside production (jest runs as \"test\")", async () => {
        process.env.USE_MOCKS = "1";
        await expect(loadUseMocks()).resolves.toBe(true);
    });
});
