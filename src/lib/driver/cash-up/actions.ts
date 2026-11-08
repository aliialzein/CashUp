"use server";

import { revalidatePath } from "next/cache";
import type { Amounts } from "@/lib/format/money";
import { checkCount } from "@/lib/driver/count-cash/checkCount";
import type { CashCount } from "@/lib/driver/count-cash/denominations";
import { closeMockCashUp, saveMockCount, startMockCashUp } from "@/lib/driver/mock/today";
import { USE_MOCKS } from "@/lib/driver/useMocks";
import { routes } from "@/lib/routes";
import { startRealCashUp } from "@/server/driver/startCashUp";
import type { ActionResult } from "./actionResult";
import { toErrorCode } from "./errorCode";

/** Until the backend merge, the real path of the count actions says so instead of pretending to work. */
const NOT_CONNECTED: ActionResult = { ok: false, code: "NOT_CONNECTED" };

/** Deletes the driver's open cash-up. */
export async function cancelCashUp(): Promise<void> {
    // TODO(backend): DELETE the cash-up. The server refuses when it has sales or cash-outs.
    closeMockCashUp();
    revalidatePath(routes.driver.today);
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
    if (USE_MOCKS) {
        startMockCashUp();
        revalidatePath(routes.driver.today);
        return { ok: true };
    }
    try {
        // BACKEND: opens a real cash-up. Uses the old API; rewritten after the backend merge.
        await startRealCashUp(float);
    } catch (error) {
        const code = toErrorCode(error);
        if (code === "INTERNAL_ERROR") console.error("startCashUp failed", error);
        return { ok: false, code };
    }
    revalidatePath(routes.driver.today);
    return { ok: true };
}
