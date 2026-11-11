"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import { runAction } from "@/lib/driver/runAction";
import { routes } from "@/lib/routes";
import { checkCount } from "./checkCount";
import { countWrites } from "./countWrites";
import type { CashCount } from "./denominations";

/**
 * The driver's count writes. Each action checks the count again (anyone can call an action), then calls the
 * count gateway (countWrites: mock or real). Nothing here knows the backend: only realCountWrites.ts does.
 */

/** The count shows on its own page and on Today. */
function refreshCountPages(): void {
    revalidatePath(routes.driver.today);
    revalidatePath(routes.driver.countCash);
}

/** Saves the drawer count so the driver can finish later. */
export async function saveCount(count: CashCount): Promise<ActionResult> {
    const problem = checkCount(count);
    if (problem) return { ok: false, code: problem };
    return runAction("saveCount", () => countWrites.saveCount(count), refreshCountPages);
}

/** Saves the count, then submits the cash-up. A refused submit keeps the count saved and returns its code. */
export async function submitCashUpWithCount(count: CashCount): Promise<ActionResult> {
    const problem = checkCount(count);
    if (problem) return { ok: false, code: problem };
    return runAction("submitCashUpWithCount", () => countWrites.submitCashUpWithCount(count), refreshCountPages);
}
