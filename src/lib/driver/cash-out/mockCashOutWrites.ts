import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import { toErrorCode } from "@/lib/driver/cash-up/errorCode";
import { getOpenCashUp, recalculateOpenMockCashUp } from "@/lib/driver/mock/today";
import { cancelCashOutSchema, createCashOutSchema } from "@/modules/cash-outs/cash-outs.validation";
import type { CashOut } from "@/types/driver/cash-up";
import type { CashOutWriteGateway } from "./cashOutWriteGateway";
import { parseReasonText } from "./reasonText";

/**
 * Fake cash-out writes for mock mode, like the sales and count mocks: added and deleted cash-outs are kept on the
 * mock open cash-up in memory, and everything resets when the dev server restarts. After every change the totals are
 * recalculated with the backend's own buildCashLedger (recalculateOpenMockCashUp), so list, chips and totals update.
 * Reason, note and amount are checked by the backend's own schemas (imported read-only), so the codes, limits and
 * order are the backend's. Delete together with the mock folder.
 */

const OK: ActionResult = { ok: true };
const refused = (code: string): ActionResult => ({ ok: false, code });

/** Save keys already used, so a repeated save (double click, retry) adds the cash-out only once, like the backend. */
const usedSaveKeys = new Set<string>();

let lastMockCashOutNumber = 0;

function currentTime(): string {
    return new Date().toTimeString().slice(0, 5);
}

export const mockCashOutWrites: CashOutWriteGateway = {
    async addCashOut(details, saveKey) {
        const cashUp = getOpenCashUp();
        if (cashUp === null) return refused("CASHUP_NOT_OPEN");

        const checked = createCashOutSchema.safeParse({
            amountUsd: details.amount.usd,
            amountLbp: details.amount.lbp,
            reason: details.reason,
            note: details.note,
        });
        if (!checked.success) return refused(toErrorCode(checked.error));

        if (usedSaveKeys.has(saveKey)) return OK;
        usedSaveKeys.add(saveKey);

        lastMockCashOutNumber += 1;
        const { reason, detail } = parseReasonText(checked.data.reason);
        const cashOut: CashOut = {
            id: `mock-cash-out-${lastMockCashOutNumber}`,
            reason,
            time: currentTime(),
            amount: details.amount,
            isDeleted: false,
        };
        if (detail !== undefined) cashOut.detail = detail;
        if (checked.data.note) cashOut.note = checked.data.note;

        cashUp.cashOuts.unshift(cashOut);
        recalculateOpenMockCashUp();
        return OK;
    },

    async cancelCashOut(cashOutId, reason) {
        // Like the backend: the reason is checked first, then the cash-out is looked up.
        const checked = cancelCashOutSchema.safeParse({ reason });
        if (!checked.success) return refused(toErrorCode(checked.error));

        const cashUp = getOpenCashUp();
        if (cashUp === null) return refused("CASHUP_NOT_OPEN");
        const cashOut = cashUp.cashOuts.find((openCashOut) => openCashOut.id === cashOutId);
        if (!cashOut) return refused("ENTITY_NOT_FOUND");
        // The backend answers a second delete of the same cash-out with CONFLICT.
        if (cashOut.isDeleted) return refused("CONFLICT");

        // The screen's form of the backend status CANCELLED, with the trimmed reason.
        cashOut.isDeleted = true;
        cashOut.cancelReason = checked.data.reason;
        recalculateOpenMockCashUp();
        return OK;
    },
};
