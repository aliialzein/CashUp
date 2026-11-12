import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import { closeMockCashUp, getOpenCashUp, saveMockCount } from "@/lib/driver/mock/today";
import type { CountWriteGateway } from "./countWriteGateway";

/**
 * Fake count writes for mock mode. The count is kept on the mock open cash-up, so it loads again; a submit refuses
 * with the backend's codes, in the backend's order, so every flow can be tried on screen. Delete with the mock folder.
 */

const OK: ActionResult = { ok: true };
const refused = (code: string): ActionResult => ({ ok: false, code });

export const mockCountWrites: CountWriteGateway = {
    async saveCount(count) {
        if (getOpenCashUp() === null) return refused("CASHUP_NOT_OPEN");
        saveMockCount(count);
        return OK;
    },

    async submitCashUpWithCount(count) {
        const cashUp = getOpenCashUp();
        if (cashUp === null) return refused("CASHUP_NOT_OPEN");
        // Like the backend: the count is saved first, so a refused submit keeps it.
        saveMockCount(count);

        if (cashUp.sales.some((sale) => sale.status === "TO_DELIVER")) return refused("SALES_AWAITING_DELIVERY");
        if (cashUp.sales.some((sale) => sale.deletionAwaiting)) return refused("REQUESTS_AWAITING_DECISION");
        if (cashUp.sales.every((sale) => sale.status === "DELETED")) return refused("CASHUP_HAS_NO_SALES");

        closeMockCashUp();
        return OK;
    },
};
