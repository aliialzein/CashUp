/** What a server action gives back instead of throwing. */
export type ActionResult = { ok: true } | { ok: false; code: string };

/** The same text for both: the cash-up holds an old pending change the app cannot apply. */
const UNSUPPORTED_CHANGE_TEXT = "This cash-up has a change the app cannot handle. Ask the owner.";

/** The same text for both: a retry of something the server already has. */
const ALREADY_SENT_TEXT = "This was already sent. Refresh to see it.";

/** The same text for both: a generic validation failure, and an amount the backend cannot read. */
const CHECK_AMOUNTS_TEXT = "Check the amounts you entered.";

/**
 * Texts for the backend's stable validation codes. A code in this list is shown as-is to the driver;
 * any other validation problem falls back to VALIDATION_ERROR (see toErrorCode).
 */
const VALIDATION_ERROR_TEXT: Record<string, string> = {
    SALE_NOT_BALANCED: "The amounts do not add up. Check what the client paid and the change.",
    BUSINESS_AMOUNT_MUST_BE_POSITIVE: "Enter the sale amount in USD or LBP.",
    DISCOUNT_EXCEEDS_DUE: "The discount is bigger than what the client owes.",
    CLIENT_NUMBER_REQUIRED: "Enter the client number.",
    INVALID_CLIENT_NUMBER: "Check the client number: 6 to 15 digits, + allowed at the start.",
    MONEY_MUST_BE_POSITIVE: "Enter an amount in USD or LBP.",
    AMOUNT_EXCEEDS_MAX: "This amount is too big. Check the number you typed.",
    EDIT_FIELD_REQUIRED: "Nothing was changed.",
    INVALID_MONEY: CHECK_AMOUNTS_TEXT,
    REASON_TOO_SHORT: "The reason needs at least 3 characters.",
    REASON_TOO_LONG: "The reason can have at most 200 characters.",
    NOTE_TOO_LONG: "The note can have at most 500 characters.",
    CONTROL_CHARACTER: "Remove the special characters from the text.",
    // A broken key or id: the driver cannot cause or fix it by typing.
    INVALID_UUID: "Something went wrong. Please refresh and try again.",
};

const ERROR_TEXT: Record<string, string> = {
    CASHUP_ALREADY_OPEN: "You already have an open cash-up.",
    VALIDATION_ERROR: CHECK_AMOUNTS_TEXT,
    UNAUTHENTICATED: "Please sign in again.",
    FORBIDDEN: "You are not allowed to do this.",
    ACTOR_NOT_ACTIVE: "Your access to this business is not active.",
    COUNT_REQUIRED: "Count your cash before submitting.",
    COUNT_INVALID: "Check the number of notes you entered.",
    CASHUP_NOT_OPEN: "This cash-up is no longer open.",
    CASHUP_NOT_EMPTY: "Only an empty cash-up can be cancelled.",
    CASHUP_HAS_NO_SALES: "Add at least one sale before submitting.",
    SALES_AWAITING_DELIVERY: "Deliver or delete the waiting sales before submitting.",
    REQUESTS_AWAITING_DECISION: "The owner still has to answer a request on this cash-up.",
    SALE_NOT_AWAITING_DELIVERY: "This sale was already delivered.",
    SALE_ALREADY_CANCELLED: "This sale was already deleted.",
    SALE_CANNOT_BE_CANCELLED: "This sale can no longer be deleted.",
    CASHOUT_ALREADY_CANCELLED: "This cash-out was already deleted.",
    ENTITY_NOT_FOUND: "We could not find this. Refresh and try again.",
    CONFLICT: "Something changed in the meantime. Refresh and try again.",
    IDEMPOTENCY_KEY_REUSED: ALREADY_SENT_TEXT,
    IDEMPOTENCY_REPLAY_UNVERIFIABLE: ALREADY_SENT_TEXT,
    // The driver never types a cancel reason (the app sends a fixed one), so do not ask for one.
    VOID_REASON_INVALID: "This cash-up could not be cancelled. Please try again.",
    LEGACY_AMENDMENT_UNSUPPORTED: UNSUPPORTED_CHANGE_TEXT,
    AMENDMENT_FIELD_UNSUPPORTED: UNSUPPORTED_CHANGE_TEXT,
    // The screen is ready but the backend does not take this yet (see realSaleWrites.ts).
    FEATURE_NOT_READY: "This is not available yet. Try again after the next update.",
    ...VALIDATION_ERROR_TEXT,
};

const DEFAULT_ERROR_TEXT = "Something went wrong. Please try again.";

export function errorText(code: string): string {
    return ERROR_TEXT[code] ?? DEFAULT_ERROR_TEXT;
}

/** True for a stable validation code that has its own driver text. */
export function isKnownValidationCode(code: string): boolean {
    return Object.hasOwn(VALIDATION_ERROR_TEXT, code);
}
