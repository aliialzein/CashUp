import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import { toErrorCode } from "@/lib/driver/cash-up/errorCode";

/**
 * Runs the write of one server action, the same way for every action:
 * - a thrown error becomes its short code (only an unknown one, INTERNAL_ERROR, is logged);
 * - a success runs `refresh`, so the pages showing the change load again;
 * - a refusal the write returns itself (e.g. CASHUP_NOT_OPEN) is passed on and refreshes nothing.
 * Not a "use server" file on purpose: it must only run inside actions, never be called from the browser.
 */
export async function runAction(
    actionName: string,
    write: () => Promise<ActionResult>,
    refresh: () => void,
): Promise<ActionResult> {
    let result: ActionResult;
    try {
        result = await write();
    } catch (error) {
        const code = toErrorCode(error);
        if (code === "INTERNAL_ERROR") console.error(`${actionName} failed`, error);
        return { ok: false, code };
    }
    if (result.ok) refresh();
    return result;
}
