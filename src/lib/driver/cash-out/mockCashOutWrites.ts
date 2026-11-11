import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import type { CashOutWriteGateway } from "./cashOutWriteGateway";

/**
 * Fake cash-out writes for mock mode. They store nothing (team decision, run 3): the page refreshes and the
 * list stays the same. Delete together with the mock folder.
 */

const OK: ActionResult = { ok: true };

export const mockCashOutWrites: CashOutWriteGateway = {
    async addCashOut() {
        return OK;
    },

    async cancelCashOut() {
        return OK;
    },
};
