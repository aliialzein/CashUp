import { openCashUpSchema } from "@/modules/cash-ups/cash-ups.validation";
import { createCashOutSchema } from "@/modules/cash-outs/cash-outs.validation";
import { ConflictError, ForbiddenError, UnauthenticatedError } from "@/shared/errors/service-errors";
import { clientNumber, uuid } from "@/shared/validation/common";
import { errorText, isKnownValidationCode } from "@/lib/driver/cash-up/actionResult";
import { toErrorCode } from "@/lib/driver/cash-up/errorCode";
import { describe, it, expect } from "@jest/globals"

/** Runs a real backend schema and returns the code toErrorCode gives its failure. */
function codeOfFailedParse(schema: { safeParse: (input: unknown) => { success: boolean; error?: unknown } }, input: unknown): string {
    const result = schema.safeParse(input);
    expect(result.success).toBe(false);
    return toErrorCode(result.error);
}

const VALID_CASH_OUT = { amountUsd: "10.00", amountLbp: "0.00", reason: "Fuel" };

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

describe("toErrorCode with the backend's stable validation codes", () => {
    it("reads a code the backend put in params.stableCode", () => {
        expect(codeOfFailedParse(createCashOutSchema, { ...VALID_CASH_OUT, amountUsd: "0.00" })).toBe("MONEY_MUST_BE_POSITIVE");
    });

    it("reads a code the backend put only in the message", () => {
        expect(codeOfFailedParse(createCashOutSchema, { ...VALID_CASH_OUT, reason: "ab" })).toBe("REASON_TOO_SHORT");
        expect(codeOfFailedParse(createCashOutSchema, { ...VALID_CASH_OUT, reason: "x".repeat(201) })).toBe("REASON_TOO_LONG");
        expect(codeOfFailedParse(createCashOutSchema, { ...VALID_CASH_OUT, note: "x".repeat(501) })).toBe("NOTE_TOO_LONG");
        expect(codeOfFailedParse(createCashOutSchema, { ...VALID_CASH_OUT, reason: "Fuel\u0007" })).toBe("CONTROL_CHARACTER");
        expect(codeOfFailedParse(createCashOutSchema, { ...VALID_CASH_OUT, amountUsd: "1.234" })).toBe("INVALID_MONEY");
        expect(codeOfFailedParse(clientNumber, "12")).toBe("INVALID_CLIENT_NUMBER");
        expect(codeOfFailedParse(uuid, "not-a-uuid")).toBe("INVALID_UUID");
    });

    it("gives the first known code when there are several", () => {
        expect(codeOfFailedParse(createCashOutSchema, { ...VALID_CASH_OUT, amountUsd: "abc", reason: "ab" })).toBe("INVALID_MONEY");
    });

    it("skips problems it has no text for and still finds a known code", () => {
        expect(codeOfFailedParse(createCashOutSchema, { ...VALID_CASH_OUT, reason: "ab", unknownField: 1 })).toBe("REASON_TOO_SHORT");
    });

    it("never passes a raw zod message on to the screen", () => {
        // An unknown key gives the zod message 'Unrecognized key: "unknownField"', which is not a code.
        expect(codeOfFailedParse(createCashOutSchema, { ...VALID_CASH_OUT, unknownField: 1 })).toBe("VALIDATION_ERROR");
    });
});

describe("isKnownValidationCode", () => {
    it("knows the stable validation codes and nothing else", () => {
        expect(isKnownValidationCode("REASON_TOO_SHORT")).toBe(true);
        expect(isKnownValidationCode("VALIDATION_ERROR")).toBe(false);
        expect(isKnownValidationCode("CONFLICT")).toBe(false);
        expect(isKnownValidationCode("constructor")).toBe(false);
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

    it("talks about amounts in general for a failed validation, not only the opening float", () => {
        expect(errorText("VALIDATION_ERROR")).toBe("Check the amounts you entered.");
    });

    // Every backend code a driver can reach has its own text, so the driver never sees only "Something went wrong".
    it.each([
        ["CASHUP_NOT_OPEN", "This cash-up is no longer open."],
        ["CASHUP_NOT_EMPTY", "Only an empty cash-up can be cancelled."],
        ["CASHUP_HAS_NO_SALES", "Add at least one sale before submitting."],
        ["SALES_AWAITING_DELIVERY", "Deliver or delete the waiting sales before submitting."],
        ["REQUESTS_AWAITING_DECISION", "The owner still has to answer a request on this cash-up."],
        ["SALE_NOT_BALANCED", "The amounts do not add up. Check what the client paid and the change."],
        ["SALE_NOT_AWAITING_DELIVERY", "This sale was already delivered."],
        ["SALE_ALREADY_CANCELLED", "This sale was already deleted."],
        ["SALE_CANNOT_BE_CANCELLED", "This sale can no longer be deleted."],
        ["CASHOUT_ALREADY_CANCELLED", "This cash-out was already deleted."],
        ["ENTITY_NOT_FOUND", "We could not find this. Refresh and try again."],
        ["CONFLICT", "Something changed in the meantime. Refresh and try again."],
        ["IDEMPOTENCY_KEY_REUSED", "This was already sent. Refresh to see it."],
        ["IDEMPOTENCY_REPLAY_UNVERIFIABLE", "This was already sent. Refresh to see it."],
        ["VOID_REASON_INVALID", "This cash-up could not be cancelled. Please try again."],
        ["LEGACY_AMENDMENT_UNSUPPORTED", "This cash-up has a change the app cannot handle. Ask the owner."],
        ["AMENDMENT_FIELD_UNSUPPORTED", "This cash-up has a change the app cannot handle. Ask the owner."],
        ["BUSINESS_AMOUNT_MUST_BE_POSITIVE", "Enter the sale amount in USD or LBP."],
        ["DISCOUNT_EXCEEDS_DUE", "The discount is bigger than what the client owes."],
        ["CLIENT_NUMBER_REQUIRED", "Enter the client number."],
        ["INVALID_CLIENT_NUMBER", "Check the client number: 6 to 15 digits, + allowed at the start."],
        ["MONEY_MUST_BE_POSITIVE", "Enter an amount in USD or LBP."],
        ["AMOUNT_EXCEEDS_MAX", "This amount is too big. Check the number you typed."],
        ["EDIT_FIELD_REQUIRED", "Nothing was changed."],
        ["INVALID_MONEY", "Check the amounts you entered."],
        ["REASON_TOO_SHORT", "The reason needs at least 3 characters."],
        ["REASON_TOO_LONG", "The reason can have at most 200 characters."],
        ["NOTE_TOO_LONG", "The note can have at most 500 characters."],
        ["CONTROL_CHARACTER", "Remove the special characters from the text."],
        ["INVALID_UUID", "Something went wrong. Please refresh and try again."],
    ])("gives %s its own text", (code, text) => {
        expect(errorText(code)).toBe(text);
    });
});
