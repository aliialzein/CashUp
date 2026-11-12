import type { CashUpStatus, CashUpSummary } from "@/types/driver/cash-up";

const CLOSED: CashUpStatus[] = ["SUBMITTED", "APPROVED"];

/** The newest cash-up that was submitted. `history` is newest first. `null` if there is none. */
export function lastClosedCashUp(history: CashUpSummary[]): CashUpSummary | null {
    return history.find((item) => CLOSED.includes(item.status)) ?? null;
}
