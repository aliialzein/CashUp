import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import type { BackendAmounts } from "@/lib/money/toBackendMoney";

/**
 * Every cash-out write. Screens and actions depend only on this; two implementations exist
 * (mockCashOutWrites, realCashOutWrites) and cashOutWrites.ts picks one. No method takes a cash-up id:
 * each implementation finds the driver's open cash-up itself.
 */

/** What Add cash-out sends, already normalized by the action. */
export type CashOutDetails = {
    /** Both currencies in the backend form (toBackendAmounts). */
    amount: BackendAmounts;
    /** The backend reason text, e.g. "Fuel" or "Other: Car wash" (see reasonText.ts). */
    reason: string;
    note: string | null;
};

export interface CashOutWriteGateway {
    /** `saveKey` comes from the form, so a double click or a retry never records the cash-out twice. */
    addCashOut(details: CashOutDetails, saveKey: string): Promise<ActionResult>;
    /** Soft-deletes one cash-out of the open cash-up with the driver's reason (3 to 200 characters, judged by the backend). */
    cancelCashOut(cashOutId: string, reason: string): Promise<ActionResult>;
}
