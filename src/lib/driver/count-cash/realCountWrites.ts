import "server-only";
import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import { DENOMINATIONS as BACKEND_DENOMINATIONS } from "@/domain/money/config";
import { toMoneyString } from "@/domain/money/money";
import { getOwnOpenCashUp, replaceOwnCounts, submitCashUp } from "@/modules/cash-ups/cash-ups.service";
import type { CountWriteGateway } from "./countWriteGateway";
import type { CashCount } from "./denominations";
import { toCountLines, type CountLineInput } from "./toCountLines";

/**
 * The real count writes. The ONLY file that imports the backend's count and submit functions: when the backend
 * matches the agreed count design, only this file changes. Backend errors are thrown on; the actions turn them
 * into codes (toErrorCode).
 */

const OK: ActionResult = { ok: true };
const FEATURE_NOT_READY: ActionResult = { ok: false, code: "FEATURE_NOT_READY" };
const CASHUP_NOT_OPEN: ActionResult = { ok: false, code: "CASHUP_NOT_OPEN" };

/** Only the notes the driver counted. The backend sets every note it does not receive to 0, so nothing old is left. */
function countedLines(count: CashCount): CountLineInput[] {
    return toCountLines(count).filter((line) => line.quantity > 0);
}

/** The backend's own list of notes, written like the lines ("1" -> "1.00"). */
function isAcceptedByBackend(line: CountLineInput): boolean {
    return BACKEND_DENOMINATIONS[line.currency].some((denomination) => toMoneyString(denomination) === line.denomination);
}

/** Saves the count of the open cash-up: its id, or why nothing was sent. */
async function saveOpenCount(count: CashCount): Promise<string | ActionResult> {
    const lines = countedLines(count);
    // Today the backend accepts every note the screen counts (USD 0.10 since the merge). If the two lists ever differ
    // again, a count with such a note is not sent at all: a counted note is never dropped or changed to make the call pass.
    if (!lines.every(isAcceptedByBackend)) return FEATURE_NOT_READY;

    // BACKEND: the driver's own open cash-up.
    const own = await getOwnOpenCashUp();
    if (own === null) return CASHUP_NOT_OPEN;

    // BACKEND: replaces the saved count with these lines.
    await replaceOwnCounts(own.id, { lines });
    return own.id;
}

export const realCountWrites: CountWriteGateway = {
    async saveCount(count) {
        const saved = await saveOpenCount(count);
        return typeof saved === "string" ? OK : saved;
    },

    async submitCashUpWithCount(count) {
        const saved = await saveOpenCount(count);
        if (typeof saved !== "string") return saved;

        // BACKEND: submits; a refusal (SALES_AWAITING_DELIVERY, ...) is thrown, and the count above stays saved.
        await submitCashUp(saved);
        return OK;
    },
};
