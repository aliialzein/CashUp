import Decimal from "decimal.js";
import type { Currency } from "@/lib/format/money";
import { DENOMINATIONS, type CashCount } from "./denominations";

/** One line of a saved count, in the backend's form. */
export type CountLineInput = {
    currency: Currency;
    denomination: string;
    quantity: number;
};

const CURRENCIES: readonly Currency[] = ["USD", "LBP"];

/**
 * Turns the form state into count lines: one per note, zeros included (realCountWrites sends only the counted ones).
 * The backend wants the denomination with two decimals, like its toMoneyString: "20" -> "20.00", "0.10" -> "0.10".
 */
export function toCountLines(counts: CashCount): CountLineInput[] {
    return CURRENCIES.flatMap((currency) =>
        DENOMINATIONS[currency].map((denomination) => ({
            currency,
            denomination: new Decimal(denomination).toFixed(2),
            quantity: counts[currency][denomination] ?? 0,
        })),
    );
}
