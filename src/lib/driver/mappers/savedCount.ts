import { emptyCounts, type CashCount } from "@/lib/driver/count-cash/denominations";
import type { Currency } from "@/lib/format/money";

/** What the backend sends for the driver's saved count. */
export type SavedCountInput = {
    saved: boolean;
    lines: readonly {
        readonly currency: Currency;
        readonly denomination: string;
        readonly quantity: number;
    }[];
};

/** The backend writes money with two decimals ("100.00"). The screens use the note name ("100"). "0.10" stays. */
function toNoteName(denomination: string): string {
    return denomination.endsWith(".00") ? denomination.slice(0, -3) : denomination;
}

/** Backend count lines -> the notes Count cash shows again. `null` until a count is saved. */
export function mapSavedCount(dto: SavedCountInput): CashCount | null {
    if (!dto.saved) return null;

    const counts: CashCount = { USD: emptyCounts("USD"), LBP: emptyCounts("LBP") };
    for (const line of dto.lines) {
        const note = toNoteName(line.denomination);
        // A note the screens do not know is skipped, so it can never create a ghost row.
        if (note in counts[line.currency]) counts[line.currency][note] = line.quantity;
    }
    return counts;
}
