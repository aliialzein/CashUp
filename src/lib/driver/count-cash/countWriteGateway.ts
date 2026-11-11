import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import type { CashCount } from "./denominations";

/**
 * Every count write, in the words of the count design the team agreed. Screens and actions depend only on this;
 * two implementations exist (mockCountWrites, realCountWrites) and countWrites.ts picks one.
 * No method takes a cash-up id: each implementation finds the driver's open cash-up itself.
 */
export interface CountWriteGateway {
    /** Saves the drawer count; the driver can finish it later. */
    saveCount(count: CashCount): Promise<ActionResult>;
    /** Saves the count, then submits the cash-up. A refused submit leaves the count saved. */
    submitCashUpWithCount(count: CashCount): Promise<ActionResult>;
}
