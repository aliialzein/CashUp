import Decimal from "decimal.js";
import type { Amounts } from "@/lib/format/money";

/** Typed text to Decimal. Empty or unfinished text such as "." counts as 0. */
function toDecimal(value: string): Decimal {
    return /\d/.test(value) ? new Decimal(value) : new Decimal(0);
}

/** Adds per currency. USD is only ever added to USD, and LBP to LBP. */
export function addAmounts(a: Amounts, b: Amounts): Amounts {
    return {
        usd: toDecimal(a.usd).plus(toDecimal(b.usd)).toFixed(),
        lbp: toDecimal(a.lbp).plus(toDecimal(b.lbp)).toFixed(),
    };
}

/** a minus b, per currency. The result can be negative. */
export function subtractAmounts(a: Amounts, b: Amounts): Amounts {
    return {
        usd: toDecimal(a.usd).minus(toDecimal(b.usd)).toFixed(),
        lbp: toDecimal(a.lbp).minus(toDecimal(b.lbp)).toFixed(),
    };
}

export function isZeroAmounts(amounts: Amounts): boolean {
    return toDecimal(amounts.usd).isZero() && toDecimal(amounts.lbp).isZero();
}

/** Negative values become 0, per currency. Used to show only what is missing or extra. */
export function clampAtZero(amounts: Amounts): Amounts {
    return {
        usd: Decimal.max(toDecimal(amounts.usd), 0).toFixed(),
        lbp: Decimal.max(toDecimal(amounts.lbp), 0).toFixed(),
    };
}
