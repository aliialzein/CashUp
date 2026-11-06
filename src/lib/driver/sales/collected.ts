import type { Amounts } from "@/lib/format/money";
import { addAmounts } from "@/lib/money/amounts";
import type { Sale } from "@/types/cash-up";

const NONE: Amounts = { usd: "0", lbp: "0" };

/** What the client paid in total. The server's number wins; order + delivery fee is only a fallback. */
export function collectedAmounts(sale: Sale): Amounts {
    return sale.totalCollected ?? addAmounts(sale.amount, sale.deliveryFee ?? NONE);
}

/** What was collected over several sales. */
export function totalCollected(sales: Sale[]): Amounts {
    return sales.reduce((sum, sale) => addAmounts(sum, collectedAmounts(sale)), NONE);
}

/**
 * The amount a sale row shows, and its label.
 * A waiting or deleted sale has collected nothing, so it shows what the order asked for.
 */
export function saleAmountLine(sale: Sale): { label: string; amounts: Amounts } {
    if (sale.status === "TO_DELIVER") return { label: "To collect", amounts: sale.amount };
    if (sale.status === "DELETED") return { label: "Order amount", amounts: sale.amount };
    return { label: "Collected", amounts: collectedAmounts(sale) };
}
