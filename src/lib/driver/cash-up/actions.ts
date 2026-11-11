"use server";

import { revalidatePath } from "next/cache";
import type { Amounts } from "@/lib/format/money";
import { closeMockCashUp, startMockCashUp } from "@/lib/driver/mock/today";
import { toBackendAmounts } from "@/lib/money/toBackendMoney";
import { USE_MOCKS } from "@/lib/driver/useMocks";
import { routes } from "@/lib/routes";
import { getOwnOpenCashUp, openCashUp, voidOwnOpenCashUp } from "@/modules/cash-ups/cash-ups.service";
import type { CashUpOwnDto } from "@/modules/cash-ups/cash-ups.types";
import { runAction } from "@/lib/driver/runAction";
import type { ActionResult } from "./actionResult";

const OK: ActionResult = { ok: true };

/** The backend needs a reason (3 to 200 characters) for every cancel. A driver only cancels an empty cash-up. */
const EMPTY_CASH_UP_CANCEL_REASON = "Empty cash-up";

/**
 * Same rule as canCancelCashUp on Today, checked again here because anyone can call an action directly:
 * never returned, and no sale or cash-out at all (deleted ones included).
 */
function isEmptyCashUp(cashUp: Pick<CashUpOwnDto, "returnReason" | "sales" | "cashOuts">): boolean {
    return cashUp.returnReason === null && cashUp.sales.length === 0 && cashUp.cashOuts.length === 0;
}

/** Today shows the open cash-up, or offers to start one. */
function refreshToday(): void {
    revalidatePath(routes.driver.today);
}

/** Cancels (voids) the driver's open cash-up, only while nothing was recorded in it. */
export async function cancelCashUp(): Promise<ActionResult> {
    return runAction(
        "cancelCashUp",
        async () => {
            if (USE_MOCKS) {
                closeMockCashUp();
                return OK;
            }
            // BACKEND: the driver's own open cash-up. Its id comes from the session, never from the browser.
            const own = await getOwnOpenCashUp();
            if (own === null) return { ok: false, code: "CASHUP_NOT_OPEN" };
            // The backend void does not check for sales or cash-outs, so this check is the only guard.
            if (!isEmptyCashUp(own)) return { ok: false, code: "CASHUP_NOT_EMPTY" };

            // BACKEND: voids the cash-up with the fixed reason.
            await voidOwnOpenCashUp(own.id, EMPTY_CASH_UP_CANCEL_REASON);
            return OK;
        },
        refreshToday,
    );
}

/** Creates a cash-up with the opening float the driver confirmed. */
export async function startCashUp(float: Amounts): Promise<ActionResult> {
    // Normalized here, on the server: anyone can call an action with any string.
    const backendFloat = toBackendAmounts(float);
    if (backendFloat === null) return { ok: false, code: "VALIDATION_ERROR" };

    return runAction(
        "startCashUp",
        async () => {
            if (USE_MOCKS) {
                startMockCashUp();
                return OK;
            }
            // BACKEND: opens a real cash-up for the logged-in driver. The service checks the float and the session itself.
            await openCashUp({ floatUsd: backendFloat.usd, floatLbp: backendFloat.lbp });
            return OK;
        },
        refreshToday,
    );
}
