"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import { runAction } from "@/lib/driver/runAction";
import { toNote } from "@/lib/driver/toNote";
import type { Amounts } from "@/lib/format/money";
import { toBackendAmounts } from "@/lib/money/toBackendMoney";
import { routes } from "@/lib/routes";
import { cashOutWrites } from "./cashOutWrites";
import { toReasonText } from "./reasonText";

/**
 * The driver's cash-out writes. Each action normalizes what the form typed, then calls the cash-out gateway
 * (cashOutWrites: mock or real). Nothing here knows the backend: only realCashOutWrites.ts does.
 */

/** What the Add cash-out form sends. Plain typed text: the action normalizes it. */
export type AddCashOutInput = {
    /** One per save attempt, made by the form (see AddCashOutForm). The backend uses it to never save twice. */
    saveKey: string;
    amount: Amounts;
    /** A category from CASH_OUT_REASONS. Checked again here, because anyone can call an action. */
    reason: string;
    /** The "What was it?" text, only used when the reason is Other. */
    detail: string;
    note: string;
};

const VALIDATION_ERROR: ActionResult = { ok: false, code: "VALIDATION_ERROR" };

/** Cash-outs show on their own page and in the Today ledger. */
function refreshCashOutPages(): void {
    revalidatePath(routes.driver.cashOuts);
    revalidatePath(routes.driver.today);
}

/** Records money the driver took out of the drawer. */
export async function addCashOut(input: AddCashOutInput): Promise<ActionResult> {
    const amount = toBackendAmounts(input.amount);
    const reason = toReasonText(input.reason, input.detail);
    if (amount === null || reason === null) return VALIDATION_ERROR;

    const details = { amount, reason, note: toNote(input.note) };
    return runAction("addCashOut", () => cashOutWrites.addCashOut(details, input.saveKey), refreshCashOutPages);
}

/** Cancels one cash-out of the open cash-up. The backend needs a reason of 3 to 200 characters. */
export async function cancelCashOut(cashOutId: string, reason: string): Promise<ActionResult> {
    return runAction("cancelCashOut", () => cashOutWrites.cancelCashOut(cashOutId, reason), refreshCashOutPages);
}
