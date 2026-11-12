import { describe, expect, it, jest } from "@jest/globals";
import { BusinessRuleError } from "@/shared/errors/service-errors";
import { runAction } from "@/lib/driver/runAction";

describe("runAction", () => {
    it("passes a success on and refreshes", async () => {
        const refresh = jest.fn();

        await expect(runAction("test", async () => ({ ok: true }), refresh)).resolves.toEqual({ ok: true });
        expect(refresh).toHaveBeenCalledTimes(1);
    });

    it("passes a refusal the write returns on, and refreshes nothing", async () => {
        const refresh = jest.fn();

        await expect(runAction("test", async () => ({ ok: false, code: "CASHUP_NOT_OPEN" }), refresh)).resolves.toEqual({
            ok: false,
            code: "CASHUP_NOT_OPEN",
        });
        expect(refresh).not.toHaveBeenCalled();
    });

    it("turns a thrown backend error into its code, without logging it", async () => {
        const refresh = jest.fn();
        const log = jest.spyOn(console, "error").mockImplementation(() => undefined);

        await expect(
            runAction("test", () => Promise.reject(new BusinessRuleError("SALES_AWAITING_DELIVERY")), refresh),
        ).resolves.toEqual({ ok: false, code: "SALES_AWAITING_DELIVERY" });
        expect(log).not.toHaveBeenCalled();
        expect(refresh).not.toHaveBeenCalled();
        log.mockRestore();
    });

    it("hides an unknown error behind INTERNAL_ERROR and logs it with the action's name", async () => {
        const log = jest.spyOn(console, "error").mockImplementation(() => undefined);
        const failure = new Error("database down");

        await expect(runAction("saveCount", () => Promise.reject(failure), jest.fn())).resolves.toEqual({
            ok: false,
            code: "INTERNAL_ERROR",
        });
        expect(log).toHaveBeenCalledWith("saveCount failed", failure);
        log.mockRestore();
    });
});
