import type { Currency } from "./money";

/**
 * The only shapes an amount may have: digits, with optional thousands commas in the whole part
 * (a comma must be followed by exactly 3 digits), then an optional dot with digits.
 * "1,000" and "1,000,000" fit; "99,5", "1,00", "1.000,50", spaces, letters and signs do not.
 */
const AMOUNT_SHAPE = /^(\d*|\d+(,\d{3})+)(\.\d*)?$/;

/** USD keeps cents. */
const USD_DECIMALS = 2;

/**
 * The one rule for what a driver may type or paste, used by the screen and by toBackendMoney.
 * Returns the amount without commas, or `null` when the text is refused (the field keeps its previous value).
 * Digits are never changed: extra decimals are cut, never rounded.
 * - USD: "99.555" -> "99.55", "1,000.50" -> "1000.50", "100." stays (the driver is still typing).
 * - LBP: whole numbers only, so the dot and everything after it is cut: "1000.50" -> "1000".
 */
export function cleanAmountInput(raw: string, currency: Currency): string | null {
    if (!AMOUNT_SHAPE.test(raw)) return null;

    const [whole, fraction] = raw.replaceAll(",", "").split(".");
    if (fraction === undefined || currency === "LBP") return whole;
    return `${whole}.${fraction.slice(0, USD_DECIMALS)}`;
}

/** Display only: "1500" -> "1,500", "1234.5" -> "1,234.5". The stored value stays without commas. */
export function formatAmountInput(value: string): string {
    const [whole, fraction] = value.split(".");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/** True when the text holds a non-zero digit, e.g. "0.50" yes, "0.00" no. */
export function hasAmount(value: string): boolean {
  return /[1-9]/.test(value);
}
