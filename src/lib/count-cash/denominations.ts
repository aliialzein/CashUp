import type { Currency } from "@/lib/format/money";

/** The notes a driver counts, biggest first. Kept as strings, like all money. */
export const DENOMINATIONS: Record<Currency, readonly string[]> = {
    USD: ["100", "50", "20", "10", "5", "1"],
    LBP: ["100000", "50000", "20000", "10000", "5000", "1000"],
};

/** The most notes of one kind a driver can enter. */
export const MAX_NOTE_COUNT = 9999;

/** How many notes of each kind: denomination -> count. */
export type NoteCounts = Record<string, number>;

export function emptyCounts(currency: Currency): NoteCounts {
    return Object.fromEntries(DENOMINATIONS[currency].map((denomination) => [denomination, 0]));
}

const denominationFormatter = new Intl.NumberFormat("en-US");

/** "100000" -> "100,000" */
export function formatDenomination(denomination: string): string {
    return denominationFormatter.format(denomination as Intl.StringNumericLiteral);
}
