/** What a server action gives back instead of throwing. */
export type ActionResult = { ok: true } | { ok: false; code: string };

const ERROR_TEXT: Record<string, string> = {
    CASHUP_ALREADY_OPEN: "You already have an open cash-up.",
    VALIDATION_ERROR: "Check the opening float amounts.",
    UNAUTHENTICATED: "Please sign in again.",
    FORBIDDEN: "You are not allowed to do this.",
    ACTOR_NOT_ACTIVE: "Your access to this business is not active.",
    COUNT_REQUIRED: "Count your cash before submitting.",
    COUNT_INVALID: "Check the number of notes you entered.",
};

const DEFAULT_ERROR_TEXT = "Something went wrong. Please try again.";

export function errorText(code: string): string {
    return ERROR_TEXT[code] ?? DEFAULT_ERROR_TEXT;
}
