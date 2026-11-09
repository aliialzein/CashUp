"use server";

import { revalidatePath } from "next/cache";
import type { Amounts } from "@/lib/format/money";
import { checkCount } from "@/lib/driver/count-cash/checkCount";
import type { CashCount } from "@/lib/driver/count-cash/denominations";
import { closeMockCashUp, saveMockCount, startMockCashUp } from "@/lib/driver/mock/today";
import { toBackendAmounts } from "@/lib/money/toBackendMoney";
import { USE_MOCKS } from "@/lib/driver/useMocks";
import { routes } from "@/lib/routes";
import { getOwnOpenCashUp, openCashUp, voidOwnOpenCashUp } from "@/modules/cash-ups/cash-ups.service";
import type { CashUpOwnDto } from "@/modules/cash-ups/cash-ups.types";
import type { ActionResult } from "./actionResult";
import { toErrorCode } from "./errorCode";

/** Until the backend merge, the real path of the count actions says so instead of pretending to work. */
const NOT_CONNECTED: ActionResult = { ok: false, code: "NOT_CONNECTED" };

/** The backend needs a reason (3 to 200 characters) for every cancel. A driver only cancels an empty cash-up. */
const EMPTY_CASH_UP_CANCEL_REASON = "Empty cash-up";

/**
 * Same rule as canCancelCashUp on Today, checked again here because anyone can call an action directly:
 * never returned, and no sale or cash-out at all (deleted ones included).
 */
function isEmptyCashUp(cashUp: Pick<CashUpOwnDto, "returnReason" | "sales" | "cashOuts">): boolean {
    return cashUp.returnReason === null && cashUp.sales.length === 0 && cashUp.cashOuts.length === 0;
}

/** Cancels (voids) the driver's open cash-up, only while nothing was recorded in it. */
export async function cancelCashUp(): Promise<ActionResult> {
    if (USE_MOCKS) {
        closeMockCashUp();
        revalidatePath(routes.driver.today);
        return { ok: true };
    }
    try {
        // BACKEND: the driver's own open cash-up. Its id comes from the session, never from the browser.
        const own = await getOwnOpenCashUp();
        if (own === null) return { ok: false, code: "CASHUP_NOT_OPEN" };
        // The backend void does not check for sales or cash-outs, so this check is the only guard.
        if (!isEmptyCashUp(own)) return { ok: false, code: "CASHUP_NOT_EMPTY" };

        // BACKEND: voids the cash-up with the fixed reason.
        await voidOwnOpenCashUp(own.id, EMPTY_CASH_UP_CANCEL_REASON);
    } catch (error) {
        const code = toErrorCode(error);
        if (code === "INTERNAL_ERROR") console.error("cancelCashUp failed", error);
        return { ok: false, code };
    }
    revalidatePath(routes.driver.today);
    return { ok: true };
}

/** Saves the drawer count. The driver can recount and save again until submitting. */
export async function saveCount(count: CashCount): Promise<ActionResult> {
    const problem = checkCount(count);
    if (problem) return { ok: false, code: problem };

    // BACKEND: save the count (PUT /api/v1/cash-ups/:id/count with toCountLines(count)). Written after the backend merge.
    if (!USE_MOCKS) return NOT_CONNECTED;
    saveMockCount(count);
    revalidatePath(routes.driver.today);
    return { ok: true };
}

/** Saves the count on screen, then sends the cash-up to the owner, so an old count is never submitted. */
export async function submitCashUp(count: CashCount): Promise<ActionResult> {
    const problem = checkCount(count);
    if (problem) return { ok: false, code: problem };

    // BACKEND: save the count, then submit. The server also refuses with no sales or sales still to deliver.
    // Written after the backend merge.
    if (!USE_MOCKS) return NOT_CONNECTED;
    saveMockCount(count);
    closeMockCashUp();
    revalidatePath(routes.driver.today);
    return { ok: true };
}

/** Creates a cash-up with the opening float the driver confirmed. */
export async function startCashUp(float: Amounts): Promise<ActionResult> {
    // Normalized here, on the server: anyone can call an action with any string.
    const backendFloat = toBackendAmounts(float);
    if (backendFloat === null) return { ok: false, code: "VALIDATION_ERROR" };

    if (USE_MOCKS) {
        startMockCashUp();
        revalidatePath(routes.driver.today);
        return { ok: true };
    }
    try {
        // BACKEND: opens a real cash-up for the logged-in driver. The service checks the float and the session itself.
        await openCashUp({ floatUsd: backendFloat.usd, floatLbp: backendFloat.lbp });
    } catch (error) {
        const code = toErrorCode(error);
        if (code === "INTERNAL_ERROR") console.error("startCashUp failed", error);
        return { ok: false, code };
    }
    revalidatePath(routes.driver.today);
    return { ok: true };
}
