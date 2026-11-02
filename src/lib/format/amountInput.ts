import type { Currency } from "./money";

/** Keeps only what can be typed as an amount: digits, plus one dot and 2 decimals for USD. */
export function sanitizeAmountInput(raw: string, currency: Currency): string {
    if (currency === "LBP")
        return raw.replace(/\D/g, "");

    const cleaned = raw.replace(/[^\d.]/g, "");
    const [whole, ...rest] = cleaned.split(".");
    if (rest.length === 0)
        return whole;

    return `${whole}.${rest.join("").slice(0, 2)}`;
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
