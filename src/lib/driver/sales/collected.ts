import type { Amounts } from "@/lib/format/money";
import { addAmounts, subtractAmounts } from "@/lib/money/amounts";
import type { Sale } from "@/types/driver/cash-up";
import { CLIENT_PAID_LABEL } from "./saleLabels";

const NONE: Amounts = { usd: "0", lbp: "0" };

/** What the client owed: order + delivery fee + tip − discount, per currency. */
function dueAmounts(sale: Sale): Amounts {
    const withFeeAndTip = addAmounts(addAmounts(sale.amount, sale.deliveryFee ?? NONE), sale.tip ?? NONE);
    return subtractAmounts(withFeeAndTip, sale.discount ?? NONE);
}

/**
 * What the client paid (the backend's totalCollected). The server's number wins. Without it (mock sales only), the
 * backend's balance rule gives it: what was owed plus the change given back.
 */
export function collectedAmounts(sale: Sale): Amounts {
    return sale.totalCollected ?? addAmounts(dueAmounts(sale), sale.changeGiven ?? NONE);
}

/** What the sale kept: client paid minus change given, per currency. Never converted, so one side can be negative. */
export function keptAmounts(sale: Sale): Amounts {
    return subtractAmounts(collectedAmounts(sale), sale.changeGiven ?? NONE);
}

/**
 * The amount a sale row shows, and its label.
 * A waiting or deleted sale has collected nothing, so it shows what the order asked for.
 */
export function saleAmountLine(sale: Sale): { label: string; amounts: Amounts } {
    if (sale.status === "TO_DELIVER") return { label: "To collect", amounts: sale.amount };
    if (sale.status === "DELETED") return { label: "Order amount", amounts: sale.amount };
    return { label: CLIENT_PAID_LABEL, amounts: collectedAmounts(sale) };
}
