import { cleanAmountInput } from "@/lib/format/amountInput";
import type { Currency } from "@/lib/format/money";

/** The backend stores two decimals for both currencies. */
const BACKEND_DECIMALS = 2;

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
