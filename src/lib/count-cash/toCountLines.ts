import Decimal from "decimal.js";
import type { Currency } from "@/lib/format/money";
import { DENOMINATIONS, type NoteCounts } from "./denominations";

/** One row of the save-count request: PUT /api/v1/cash-ups/:id/count */
export type CountLineInput = {
    currency: Currency;
    denomination: string;
    quantity: number;
};

const CURRENCIES: readonly Currency[] = ["USD", "LBP"];

/**
 * Turns the form state into the lines the API expects.
 * Every note is sent, zeros included, so a recount can never leave an old number behind.
 * The API wants the denomination with two decimals: "20" -> "20.00".
 */
export function toCountLines(counts: Record<Currency, NoteCounts>): CountLineInput[] {
    return CURRENCIES.flatMap((currency) =>
        DENOMINATIONS[currency].map((denomination) => ({
            currency,
            denomination: new Decimal(denomination).toFixed(2),
            quantity: counts[currency][denomination] ?? 0,
        })),
    );
}
