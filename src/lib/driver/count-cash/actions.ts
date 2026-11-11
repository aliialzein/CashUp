"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import { toErrorCode } from "@/lib/driver/cash-up/errorCode";
import { routes } from "@/lib/routes";
import { checkCount } from "./checkCount";
import { countWrites } from "./countWrites";
import type { CashCount } from "./denominations";

/**
 * The driver's count writes. Each action checks the count again (anyone can call an action), then calls the
 * count gateway (countWrites: mock or real). Nothing here knows the backend: only realCountWrites.ts does.
 */

/** Runs one gateway write: thrown errors become codes (only unknown ones are logged), a success refreshes the pages. */
async function runCountWrite(actionName: string, write: () => Promise<ActionResult>): Promise<ActionResult> {
    let result: ActionResult;
    try {
        result = await write();
    } catch (error) {
        const code = toErrorCode(error);
        if (code === "INTERNAL_ERROR") console.error(`${actionName} failed`, error);
        return { ok: false, code };
    }
    if (result.ok) {
        revalidatePath(routes.driver.today);
        revalidatePath(routes.driver.countCash);
    }
    return result;
}

/** Saves the drawer count so the driver can finish later. */
export async function saveCount(count: CashCount): Promise<ActionResult> {
    const problem = checkCount(count);
    if (problem) return { ok: false, code: problem };
    return runCountWrite("saveCount", () => countWrites.saveCount(count));
}

/** Saves the count, then submits the cash-up. A refused submit keeps the count saved and returns its code. */
export async function submitCashUpWithCount(count: CashCount): Promise<ActionResult> {
    const problem = checkCount(count);
    if (problem) return { ok: false, code: problem };
    return runCountWrite("submitCashUpWithCount", () => countWrites.submitCashUpWithCount(count));
}
