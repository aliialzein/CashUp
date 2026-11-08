import { openCashUpSchema } from "@/validation";
import { UnauthenticatedError } from "@/http/errors";
import { ConflictError, ForbiddenError } from "@/services/errors";
import { errorText } from "@/lib/driver/cash-up/actionResult";
import { toErrorCode } from "@/lib/driver/cash-up/errorCode";
import { describe, it, expect } from "@jest/globals"

describe("toErrorCode", () => {
    it("keeps the code of a service error", () => {
        expect(toErrorCode(new ConflictError("CASHUP_ALREADY_OPEN"))).toBe("CASHUP_ALREADY_OPEN");
        expect(toErrorCode(new ForbiddenError("ACTOR_NOT_ACTIVE"))).toBe("ACTOR_NOT_ACTIVE");
    });

    it("maps a missing session", () => {
        expect(toErrorCode(new UnauthenticatedError())).toBe("UNAUTHENTICATED");
    });

    it("maps a failed validation", () => {
        const result = openCashUpSchema.safeParse({ floatUsd: "50.00", unknownField: 1 });
        expect(result.success).toBe(false);
        expect(toErrorCode(result.error)).toBe("VALIDATION_ERROR");
    });

    it("hides anything unknown behind INTERNAL_ERROR", () => {
        expect(toErrorCode(new Error("db password leaked"))).toBe("INTERNAL_ERROR");
    });
});

describe("errorText", () => {
    it("gives a clear text for a known code", () => {
        expect(errorText("CASHUP_ALREADY_OPEN")).toBe("You already have an open cash-up.");
    });

    it("asks the driver to count before submitting", () => {
        expect(errorText("COUNT_REQUIRED")).toBe("Count your cash before submitting.");
    });

    it("has its own text for a broken count, not the opening float text", () => {
        expect(errorText("COUNT_INVALID")).toBe("Check the number of notes you entered.");
    });

    it("gives a safe default for an unknown code", () => {
        expect(errorText("SOMETHING_NEW")).toBe("Something went wrong. Please try again.");
    });
});
