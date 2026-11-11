import "server-only";
import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import type { BackendAmounts } from "@/lib/money/toBackendMoney";
import { compare } from "@/domain/money/money";
import { getOwnOpenCashUp } from "@/modules/cash-ups/cash-ups.service";
import { cancelSale, confirmSaleDelivery } from "@/modules/sales/sales.service";
import type { SaleWriteGateway } from "./saleWriteGateway";

/**
 * The real sale writes. The ONLY file that imports the backend sales service: when the backend matches the
 * agreed sale design, only this file changes. Where the backend does not take the agreed shape yet, the method
 * returns FEATURE_NOT_READY without calling it, so no guessed or computed value is ever sent.
 * Backend errors are thrown on; the actions turn them into codes (toErrorCode).
 */

const OK: ActionResult = { ok: true };
const FEATURE_NOT_READY: ActionResult = { ok: false, code: "FEATURE_NOT_READY" };
const CASHUP_NOT_OPEN: ActionResult = { ok: false, code: "CASHUP_NOT_OPEN" };
const ENTITY_NOT_FOUND: ActionResult = { ok: false, code: "ENTITY_NOT_FOUND" };

/** Both currencies are the same amount (the backend's own comparison, so "5" and "5.00" match). */
function sameAmounts(left: BackendAmounts, right: BackendAmounts): boolean {
    return compare(left.usd, right.usd) === 0 && compare(left.lbp, right.lbp) === 0;
}

function isZero(amounts: BackendAmounts): boolean {
    return compare(amounts.usd, "0") === 0 && compare(amounts.lbp, "0") === 0;
}

export const realSaleWrites: SaleWriteGateway = {
    async addSale() {
        // WAITS FOR: createSale to accept a "to deliver" sale without method, collected and change.
        return FEATURE_NOT_READY;
    },

    async editSale() {
        // WAITS FOR: editSale to accept amount/fee/discount changes on a "to deliver" sale without re-balancing collected,
        // and to refuse delivered sales. Until then no edit is sent (team decision, run 5).
        return FEATURE_NOT_READY;
    },

    async completeDelivery(saleId, delivery) {
        // BACKEND: the driver's own open cash-up; the sale must be in it.
        const own = await getOwnOpenCashUp();
        if (own === null) return CASHUP_NOT_OPEN;
        const sale = own.sales.find((openSale) => openSale.id === saleId);
        if (!sale) return ENTITY_NOT_FOUND;

        // WAITS FOR: confirmSaleDelivery to accept the delivery fee and the tip. Until then only a delivery that keeps
        // the saved fee and has no tip can be sent; the fee is compared with the sale on the server, not the browser.
        const savedFee = { usd: sale.deliveryFeeUsd, lbp: sale.deliveryFeeLbp };
        if (!sameAmounts(delivery.deliveryFee, savedFee) || !isZero(delivery.tip)) return FEATURE_NOT_READY;

        // BACKEND: marks the sale delivered with what was collected and given back.
        await confirmSaleDelivery(own.id, saleId, {
            totalCollectedUsd: delivery.collected.usd,
            totalCollectedLbp: delivery.collected.lbp,
            changeGivenUsd: delivery.change.usd,
            changeGivenLbp: delivery.change.lbp,
            method: delivery.method,
        });
        return OK;
    },

    async deleteSale(saleId, reason) {
        // BACKEND: the driver's own open cash-up. The backend checks the sale belongs to it and is still "to deliver".
        const own = await getOwnOpenCashUp();
        if (own === null) return CASHUP_NOT_OPEN;

        // BACKEND: soft-deletes the sale with the driver's reason (3 to 200 characters, checked by the backend).
        await cancelSale(own.id, saleId, reason);
        return OK;
    },

    async requestSaleDeletion() {
        // WAITS FOR: a backend service that opens a DELETE_SALE request (the table and SaleRepository.lockForDeletion exist).
        return FEATURE_NOT_READY;
    },
};
