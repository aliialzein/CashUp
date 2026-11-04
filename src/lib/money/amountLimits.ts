import Decimal from "decimal.js";
import type { Currency } from "@/lib/format/money";

/** The biggest amount one field accepts, per currency. Far above any real drawer, it mainly stops typos. */
export const MAX_AMOUNT: Record<Currency, string> = {
    USD: "1000000",
    LBP: "100000000000",
};

/**
 * Returns `next` if it is within the limit, otherwise the `previous` value,
 * so an extra digit (or a pasted huge number) is simply not accepted.
 */
export function capAmountInput(next: string, previous: string, currency: Currency): string {
    if (!/\d/.test(next)) return next; // "" or "." has no value to compare yet
    return new Decimal(next).greaterThan(MAX_AMOUNT[currency]) ? previous : next;
}
