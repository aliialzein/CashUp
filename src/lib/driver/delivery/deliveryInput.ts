import type { Amounts } from "@/lib/format/money";
import { blankAmountsToZero } from "@/lib/money/blankAmountsToZero";
import type { PaymentMethod } from "./summarizeSinglePayment";

const NO_CHANGE: Amounts = { usd: "0", lbp: "0" };

/** The Complete delivery fields as typed. */
export type DeliveryFormValues = {
    fee: Amounts;
    tip: Amounts;
    method: PaymentMethod;
    /** What the client handed over (cash) or sent (wallet). */
    paid: Amounts;
    /** What the driver gave back. Only used for cash. */
    change: Amounts;
};

/** What the form sends: blank currencies as "0", and no change for a wallet payment (the change field is hidden then). */
export function toDeliveryInput({ fee, tip, method, paid, change }: DeliveryFormValues) {
    return {
        deliveryFee: blankAmountsToZero(fee),
        tip: blankAmountsToZero(tip),
        method,
        collected: blankAmountsToZero(paid),
        change: method === "CASH" ? blankAmountsToZero(change) : NO_CHANGE,
    };
}
