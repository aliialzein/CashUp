import type { Currency } from "@/lib/format/money";
import { DENOMINATIONS, MAX_NOTE_COUNT } from "./denominations";

const CURRENCIES: readonly Currency[] = ["USD", "LBP"];

export type CountProblem = "COUNT_REQUIRED" | "COUNT_INVALID";

function isNoteCount(value: unknown): boolean {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_NOTE_COUNT;
}

/**
 * A server action gets its input from the browser, so the count is checked again there.
 * A missing count is COUNT_REQUIRED. All zeros is a real count: the drawer can be empty.
 */
export function checkCount(count: unknown): CountProblem | null {
    if (typeof count !== "object" || count === null) return "COUNT_REQUIRED";

    for (const currency of CURRENCIES) {
        const notes: unknown = (count as Record<string, unknown>)[currency];
        if (typeof notes !== "object" || notes === null) return "COUNT_REQUIRED";

        const everyNoteValid = DENOMINATIONS[currency].every((denomination) =>
            isNoteCount((notes as Record<string, unknown>)[denomination]),
        );
        if (!everyNoteValid) return "COUNT_INVALID";
    }
    return null;
}
