import type { Amounts } from "@/lib/format/money";
import { addAmounts, clampAtZero, isZeroAmounts, subtractAmounts } from "@/lib/money/amounts";

const ZERO: Amounts = { usd: "0", lbp: "0" };

export type DeliveryInput = {
    /** What the sale asked for. */
    order: Amounts;
    /** Delivery fee typed by the driver. */
    fee: Amounts;
    /** Extra the client gave, typed at delivery. Leave out for none. */
    tip?: Amounts;
    /** Money taken off the sale. Leave out for none. */
    discount?: Amounts;
    /** Paid in cash, goes into the drawer. */
    cash: Amounts;
    /** Paid by wallet (Whish or OMT), not drawer cash. */
    wallet: Amounts;
};

export type DeliverySummary = {
    /** order + fee + tip - discount */
    due: Amounts;
    /** cash + wallet */
    paid: Amounts;
    /** paid - due. Negative = still to collect, positive = extra. */
    gap: Amounts;
    /** What is still missing per currency. Never negative. */
    remaining: Amounts;
    /** What was collected beyond what is due, per currency. Never negative. */
    extra: Amounts;
    hasGap: boolean;
};

/**
 * What the screen shows while the driver fills in a delivery: only for the gap warning and "Use exact amount".
 * The backend still judges the numbers and flags "amount differs" itself.
 */
export function summarizeDelivery({ order, fee, tip = ZERO, discount = ZERO, cash, wallet }: DeliveryInput): DeliverySummary {
    const due = subtractAmounts(addAmounts(addAmounts(order, fee), tip), discount);
    const paid = addAmounts(cash, wallet);
    const gap = subtractAmounts(paid, due);
    return {
        due,
        paid,
        gap,
        remaining: clampAtZero(subtractAmounts(due, paid)),
        extra: clampAtZero(gap),
        hasGap: !isZeroAmounts(gap),
    };
}
