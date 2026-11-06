import Decimal from "decimal.js";
import { MAX_NOTE_COUNT, type NoteCounts } from "./denominations";

/** Adds up the money in the notes, e.g. { "20": 2, "5": 2 } -> "50". */
export function totalOfNotes(counts: NoteCounts): string {
    return Object.entries(counts)
        .reduce((sum, [denomination, count]) => sum.plus(new Decimal(denomination).times(count)), new Decimal(0))
        .toString();
}

/** Turns what the driver typed into a count: digits only, empty is 0, never above the maximum. */
export function parseCount(raw: string): number {
    const digits = raw.replace(/\D/g, "");
    return digits === "" ? 0 : Math.min(Number.parseInt(digits, 10), MAX_NOTE_COUNT);
}

export type GapStatus = "match" | "short" | "over";

/** The gap is counted minus expected: 0 matches, negative is short, positive is over. */
export function gapStatus(gap: string): GapStatus {
    const value = new Decimal(gap);
    if (value.isZero()) return "match";
    return value.isNegative() ? "short" : "over";
}
