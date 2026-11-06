import { hasAmount } from "@/lib/format/amountInput";
import type { Amounts } from "@/lib/format/money";
import type { CashOutReason } from "./reasons";

type CashOutDraft = {
    amount: Amounts;
    reason: CashOutReason;
    /** The "what was it?" text, only used when the reason is "Other". */
    detail: string;
};

/** A cash-out needs an amount in at least one currency. "Other" also needs a written explanation. */
export function canSaveCashOut({ amount, reason, detail }: CashOutDraft): boolean {
    const hasMoney = hasAmount(amount.usd) || hasAmount(amount.lbp);
    const hasExplanation = reason !== "Other" || detail.trim() !== "";
    return hasMoney && hasExplanation;
}
