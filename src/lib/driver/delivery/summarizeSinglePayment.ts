import type { Amounts } from "@/lib/format/money";
import { clampAtZero, subtractAmounts } from "@/lib/money/amounts";
import { summarizeDelivery, type DeliverySummary } from "./summarizeDelivery";

/** The client pays a delivery with exactly one of these. */
export type PaymentMethod = "CASH" | "WHISH" | "OMT";

const ZERO: Amounts = { usd: "0", lbp: "0" };

type SinglePaymentInput = {
    order: Amounts;
    fee: Amounts;
    /** Extra the client gave. Leave out for none. */
    tip?: Amounts;
    /** Money taken off the sale. Leave out for none. */
    discount?: Amounts;
    method: PaymentMethod;
    /** What the client paid: handed over in cash, or sent through the wallet. */
    paid: Amounts;
    /** What the driver gave back. Only used for cash. */
    change: Amounts;
};

export type SinglePaymentSummary = {
    summary: DeliverySummary;
    /** Money that stays in the drawer: paid minus change. Zero for a wallet. */
    intoDrawer: Amounts;
    /** Money that went through the wallet. Zero for cash. */
    throughWallet: Amounts;
    /** The change that would make the drawer match exactly: what was handed over beyond what is due. Zero for a wallet. */
    suggestedChange: Amounts;
};

/** A wallet payment is what the client sent, with no change. A cash payment is what was handed over minus the change. */
export function summarizeSinglePayment({ order, fee, tip, discount, method, paid, change }: SinglePaymentInput): SinglePaymentSummary {
    if (method !== "CASH") {
        const summary = summarizeDelivery({ order, fee, tip, discount, cash: ZERO, wallet: paid });
        return { summary, intoDrawer: ZERO, throughWallet: summary.paid, suggestedChange: ZERO };
    }

    const intoDrawer = subtractAmounts(paid, change);
    const summary = summarizeDelivery({ order, fee, tip, discount, cash: intoDrawer, wallet: ZERO });
    return {
        summary,
        intoDrawer,
        throughWallet: ZERO,
        suggestedChange: clampAtZero(subtractAmounts(paid, summary.due)),
    };
}
