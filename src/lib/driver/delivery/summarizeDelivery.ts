import type { Amounts } from "@/lib/format/money";
import { addAmounts, clampAtZero, isZeroAmounts, subtractAmounts } from "@/lib/money/amounts";

export type DeliveryInput = {
    /** What the sale asked for. */
    order: Amounts;
    /** Delivery fee typed by the driver. */
    fee: Amounts;
    /** Paid in cash, goes into the drawer. */
    cash: Amounts;
    /** Paid by wallet (Whish or OMT), not drawer cash. */
    wallet: Amounts;
};

export type DeliverySummary = {
    /** order + fee */
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

export function summarizeDelivery({ order, fee, cash, wallet }: DeliveryInput): DeliverySummary {
    const due = addAmounts(order, fee);
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
