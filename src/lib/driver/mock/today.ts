import { totalOfNotes } from "@/lib/driver/count-cash/calculations";
import type { CashCount } from "@/lib/driver/count-cash/denominations";
import type { CashUp } from "@/types/driver/cash-up";
import { mockOpenCashUp } from "./cash-up";
import { recalculateMockCashUp } from "./recalculateCashUp";
import { hasOpenCashUp } from "./scenarios";

// TODO(backend): delete with the mocks. Cancel, Submit and Start flip this while the server runs.
let openOverride: boolean | null = null;

// TODO(backend): the driver's open cash-up from the API, or null when there is none.
export function getOpenCashUp(): CashUp | null {
    const isOpen = openOverride ?? hasOpenCashUp;
    return isOpen ? mockOpenCashUp : null;
}

/** Cancel and Submit both leave the driver with no open cash-up. */
export function closeMockCashUp(): void {
    openOverride = false;
}

/** Opens the mock cash-up with the rate the driver typed (null = no rate), like openCashUp stores it. */
export function startMockCashUp(referenceRate: string | null): void {
    openOverride = true;
    mockOpenCashUp.referenceRate = referenceRate;
}

/** After a mock write: totals and sale cards follow the changed sales and cash-outs, like the backend's answer. */
export function recalculateOpenMockCashUp(): void {
    const cashUp = getOpenCashUp();
    if (cashUp !== null) recalculateMockCashUp(cashUp);
}

/** Keeps the count while the server runs, so Today and Count cash both show it. */
export function saveMockCount(count: CashCount): void {
    mockOpenCashUp.savedCounts = count;
    mockOpenCashUp.counted = { usd: totalOfNotes(count.USD), lbp: totalOfNotes(count.LBP) };
}
