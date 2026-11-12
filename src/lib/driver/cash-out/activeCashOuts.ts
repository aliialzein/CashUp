import type { CashOut } from "@/types/driver/cash-up";

/**
 * The cash-outs a screen lists and counts: deleted ones are hidden for now.
 * Totals are not computed here: the backend ledger already leaves deleted cash-outs out.
 */
export function activeCashOuts(cashOuts: readonly CashOut[]): CashOut[] {
    return cashOuts.filter((cashOut) => !cashOut.isDeleted);
}
