import type { CashUp } from "@/types/driver/cash-up";
import { mockOpenCashUp } from "./cash-up";
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

export function startMockCashUp(): void {
    openOverride = true;
}
