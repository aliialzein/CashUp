import type { PaymentMethod } from "@/lib/driver/delivery/summarizeSinglePayment";

/**
 * The words the driver sees for a sale's money. Every screen imports them from here, so they never differ.
 * The backend calls "client paid" totalCollected; the driver never sees that name.
 */

/** Everything the client handed over, before any change. */
export const CLIENT_PAID_LABEL = "Client paid";

/** What the driver gave back to the client. */
export const CHANGE_GIVEN_LABEL = "Change given";

/** The cards that add up every delivered sale (cash and wallet together): client paid minus change. */
export const DELIVERED_TOTAL_LABEL = "Delivered";

/** How the client paid, as the driver reads it. */
export const METHOD_LABEL: Record<PaymentMethod, string> = { CASH: "Cash", WHISH: "Whish", OMT: "OMT" };

/** A cash sale's client paid minus change: money that stayed in the drawer. */
const KEPT_LABEL = "Kept";

/**
 * The label of one sale's total (client paid minus change). "Kept" only for cash, because it reads as money in the
 * drawer; a wallet payment never reaches the drawer, so it says which wallet received it.
 * A delivered sale always has a method; without one, it falls back to "Kept".
 */
export function saleTotalLabel(method: PaymentMethod | undefined): string {
    if (method === undefined || method === "CASH") return KEPT_LABEL;
    return `Received by ${METHOD_LABEL[method]}`;
}
