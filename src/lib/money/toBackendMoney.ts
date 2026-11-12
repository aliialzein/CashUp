import { cleanAmountInput } from "@/lib/format/amountInput";
import type { Amounts, Currency } from "@/lib/format/money";

/** The backend stores two decimals for both currencies. */
const BACKEND_DECIMALS = 2;

/** Both currencies of one amount, already in the backend's two-decimal form ("100.00", "1000.00"). */
export type BackendAmounts = Amounts;

/**
 * What the driver typed -> the canonical money string the backend expects, with exactly two decimals.
 * String logic only, never Number or parseFloat, so no digit can change.
 * "100" -> "100.00", "99.5" -> "99.50", "100." -> "100.00", ".5" -> "0.50", "007" -> "7.00", LBP "1000" -> "1000.00".
 * Returns `null` for an empty amount and for text the input rule refuses; the caller decides what that means.
 */
export function toBackendMoney(typed: string, currency: Currency): string | null {
    const cleaned = cleanAmountInput(typed, currency);
    if (cleaned === null || !/\d/.test(cleaned)) return null;

    const [whole, fraction = ""] = cleaned.split(".");
    // "007" -> "7", "000" -> "0", "" (from ".5") -> "0".
    const wholeWithoutLeadingZeros = whole.replace(/^0+(?=\d)/, "") || "0";
    return `${wholeWithoutLeadingZeros}.${fraction.padEnd(BACKEND_DECIMALS, "0")}`;
}

/** Both currencies in the backend form, or `null` if either side cannot be read (same rule as toBackendMoney). */
export function toBackendAmounts(amounts: Amounts): BackendAmounts | null {
    const usd = toBackendMoney(amounts.usd, "USD");
    const lbp = toBackendMoney(amounts.lbp, "LBP");
    return usd === null || lbp === null ? null : { usd, lbp };
}
