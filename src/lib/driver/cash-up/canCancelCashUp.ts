import type { CashUp } from "@/types/driver/cash-up";

/** A cash-up can be cancelled (deleted) only while it is open and nothing was recorded in it. */
export function canCancelCashUp({ status, sales, cashOuts }: Pick<CashUp, "status" | "sales" | "cashOuts">): boolean {
    return status === "OPEN" && sales.length === 0 && cashOuts.length === 0;
}
