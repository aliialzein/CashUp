/** What a server action gives back instead of throwing. */
export type ActionResult = { ok: true } | { ok: false; code: string };

/** The same text for both: the cash-up holds an old pending change the app cannot apply. */
const UNSUPPORTED_CHANGE_TEXT = "This cash-up has a change the app cannot handle. Ask the owner.";

/** The same text for both: a retry of something the server already has. */
const ALREADY_SENT_TEXT = "This was already sent. Refresh to see it.";

const ERROR_TEXT: Record<string, string> = {
    CASHUP_ALREADY_OPEN: "You already have an open cash-up.",
    VALIDATION_ERROR: "Check the amounts you entered.",
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
    SALE_NOT_BALANCED: "The amounts do not add up. Check what the client paid and the change.",
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
};

const DEFAULT_ERROR_TEXT = "Something went wrong. Please try again.";

export function errorText(code: string): string {
    return ERROR_TEXT[code] ?? DEFAULT_ERROR_TEXT;
}
