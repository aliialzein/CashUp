"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import { toErrorCode } from "@/lib/driver/cash-up/errorCode";
import { USE_MOCKS } from "@/lib/driver/useMocks";
import type { Amounts } from "@/lib/format/money";
import { toBackendAmounts } from "@/lib/money/toBackendMoney";
import { routes } from "@/lib/routes";
import { getOwnOpenCashUp } from "@/modules/cash-ups/cash-ups.service";
import { cancelCashOut as cancelBackendCashOut, createCashOut } from "@/modules/cash-outs/cash-outs.service";
import { toReasonText } from "./reasonText";

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

/** A blank note is no note, so the backend stores null instead of an empty text. */
function toNote(note: string): string | null {
    const trimmedNote = note.trim();
    return trimmedNote === "" ? null : trimmedNote;
}

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

    if (USE_MOCKS) {
        refreshCashOutPages();
        return { ok: true };
    }
    try {
        // BACKEND: the driver's own open cash-up. Its id comes from the session, never from the browser.
        const own = await getOwnOpenCashUp();
        if (own === null) return { ok: false, code: "CASHUP_NOT_OPEN" };

        // BACKEND: saves the cash-out. A repeat of the same key and data returns the first one (replayed), which is a success too.
        await createCashOut(own.id, {
            idempotencyKey: input.saveKey,
            amountUsd: amount.usd,
            amountLbp: amount.lbp,
            reason,
            note: toNote(input.note),
        });
    } catch (error) {
        const code = toErrorCode(error);
        if (code === "INTERNAL_ERROR") console.error("addCashOut failed", error);
        return { ok: false, code };
    }
    refreshCashOutPages();
    return { ok: true };
}

/** Cancels one cash-out of the open cash-up. No screen calls it yet. The backend needs a reason of 3 to 200 characters. */
export async function cancelCashOut(cashOutId: string, reason: string): Promise<ActionResult> {
    if (USE_MOCKS) {
        refreshCashOutPages();
        return { ok: true };
    }
    try {
        // BACKEND: the driver's own open cash-up. The backend checks that the cash-out belongs to it.
        const own = await getOwnOpenCashUp();
        if (own === null) return { ok: false, code: "CASHUP_NOT_OPEN" };

        // BACKEND: soft-deletes the cash-out with the driver's reason.
        await cancelBackendCashOut(own.id, cashOutId, reason);
    } catch (error) {
        const code = toErrorCode(error);
        if (code === "INTERNAL_ERROR") console.error("cancelCashOut failed", error);
        return { ok: false, code };
    }
    refreshCashOutPages();
    return { ok: true };
}
