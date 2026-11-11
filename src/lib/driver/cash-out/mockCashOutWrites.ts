import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import { toErrorCode } from "@/lib/driver/cash-up/errorCode";
import { getOpenCashUp } from "@/lib/driver/mock/today";
import { addAmounts, subtractAmounts } from "@/lib/money/amounts";
import type { BackendAmounts } from "@/lib/money/toBackendMoney";
import { cancelCashOutSchema, createCashOutSchema } from "@/modules/cash-outs/cash-outs.validation";
import type { CashOut, Ledger } from "@/types/driver/cash-up";
import type { CashOutWriteGateway } from "./cashOutWriteGateway";
import { parseReasonText } from "./reasonText";

/**
 * Fake cash-out writes for mock mode, like the sales and count mocks: added and deleted cash-outs are kept on the
 * mock open cash-up in memory (list, chips and totals update), and everything resets when the dev server restarts.
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

/**
 * Moves the mock totals by one cash-out, as the backend would compute them: money out lowers both "cash-outs"
 * (kept negative) and "expected"; a deleted cash-out gives it back. Mock only: real totals always come from the server.
 */
function moveTotals(ledger: Ledger, amount: BackendAmounts, direction: "out" | "back"): void {
    const move = direction === "out" ? subtractAmounts : addAmounts;
    ledger.cashOuts = move(ledger.cashOuts, amount);
    ledger.expected = move(ledger.expected, amount);
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
        moveTotals(cashUp.ledger, details.amount, "out");
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
        moveTotals(cashUp.ledger, cashOut.amount, "back");
        return OK;
    },
};
