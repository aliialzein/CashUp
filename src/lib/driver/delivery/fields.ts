import { hasAmount } from "@/lib/format/amountInput";
import type { Amounts } from "@/lib/format/money";

export const EMPTY_AMOUNT: Amounts = { usd: "", lbp: "" };

/** Unfinished typing such as "." counts as empty. */
export function cleaned({ usd, lbp }: Amounts): Amounts {
    const clean = (value: string) => (/\d/.test(value) ? value : "");
    return { usd: clean(usd), lbp: clean(lbp) };
}

/** A zero amount shows as an empty field. */
export function toField(value: string | undefined): string {
    return value !== undefined && hasAmount(value) ? value : "";
}

/** Both currencies of an amount, ready to put into the fields. */
export function toFields(amounts: Amounts): Amounts {
    return { usd: toField(amounts.usd), lbp: toField(amounts.lbp) };
}

/** Pre-filled fee from Add sale. */
export function initialFee(fee: Amounts | undefined): Amounts {
    return fee ? toFields(fee) : EMPTY_AMOUNT;
}
