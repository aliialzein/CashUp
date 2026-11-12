import { toBackendMoney } from "@/lib/money/toBackendMoney";

/** Today's rate the Start cash-up form starts with, in LBP per 1 USD. The driver can change or clear it. */
export const DEFAULT_REFERENCE_RATE_LBP = "90000";

/**
 * The typed rate in the backend's form ("90,000" -> "90000.00"), with the LBP typing rules.
 * `undefined` when the field was cleared (no rate is sent); `null` when it cannot be read.
 * Whether the value is allowed (above 0, under the maximum) is judged by the backend.
 */
export function toBackendReferenceRate(typed: string): string | undefined | null {
    if (typed.trim() === "") return undefined;
    return toBackendMoney(typed, "LBP");
}

/** On Start cash-up only the rate can be refused as "not positive" or "not money" (the float may be 0). */
const RATE_REFUSALS = new Set(["MONEY_MUST_BE_POSITIVE", "INVALID_MONEY"]);

/** A refusal from openCashUp, worded for the rate when it is about the rate. */
export function toStartErrorCode(code: string): string {
    return RATE_REFUSALS.has(code) ? "REFERENCE_RATE_INVALID" : code;
}
