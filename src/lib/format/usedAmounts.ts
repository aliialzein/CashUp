import { hasAmount } from "./amountInput";
import { formatMoney, type Amounts } from "./money";

/** Only the currencies that have an amount: "3.00 USD" or "3.00 USD · 1,000 LBP". Empty text when there is none. */
export function formatUsedAmounts(amounts: Amounts): string {
    const parts: string[] = [];
    if (hasAmount(amounts.usd)) parts.push(formatMoney(amounts.usd, "USD"));
    if (hasAmount(amounts.lbp)) parts.push(formatMoney(amounts.lbp, "LBP"));
    return parts.join(" · ");
}
