import "server-only";
import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import { getOwnOpenCashUp } from "@/modules/cash-ups/cash-ups.service";
import { cancelCashOut as cancelBackendCashOut, createCashOut } from "@/modules/cash-outs/cash-outs.service";
import type { CashOutWriteGateway } from "./cashOutWriteGateway";

/**
 * The real cash-out writes. The ONLY file that imports the backend cash-outs service. Backend errors are
 * thrown on; the actions turn them into codes (toErrorCode).
 */

const OK: ActionResult = { ok: true };
const CASHUP_NOT_OPEN: ActionResult = { ok: false, code: "CASHUP_NOT_OPEN" };

export const realCashOutWrites: CashOutWriteGateway = {
    async addCashOut(details, saveKey) {
        // BACKEND: the driver's own open cash-up. Its id comes from the session, never from the browser.
        const own = await getOwnOpenCashUp();
        if (own === null) return CASHUP_NOT_OPEN;

        // BACKEND: saves the cash-out. A repeat of the same key and data returns the first one (replayed), which is a success too.
        await createCashOut(own.id, {
            idempotencyKey: saveKey,
            amountUsd: details.amount.usd,
            amountLbp: details.amount.lbp,
            reason: details.reason,
            note: details.note,
        });
        return OK;
    },

    async cancelCashOut(cashOutId, reason) {
        // BACKEND: the driver's own open cash-up. The backend checks that the cash-out belongs to it.
        const own = await getOwnOpenCashUp();
        if (own === null) return CASHUP_NOT_OPEN;

        // BACKEND: soft-deletes the cash-out with the driver's reason.
        await cancelBackendCashOut(own.id, cashOutId, reason);
        return OK;
    },
};
