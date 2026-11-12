import "server-only";
import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import { getOwnOpenCashUp } from "@/modules/cash-ups/cash-ups.service";
import type { CashUpOwnDto } from "@/modules/cash-ups/cash-ups.types";
import { cancelSale, confirmSaleDelivery, createSale, editSale, requestSaleDeletion } from "@/modules/sales/sales.service";
import { toConfirmDeliveryInput, toOrderFields, toPendingSaleInput } from "./backendSaleInput";
import type { SaleWriteGateway } from "./saleWriteGateway";

/**
 * The real sale writes. The ONLY file that imports the backend sales service.
 * Each write finds the driver's own open cash-up on the server first; the backend checks everything else.
 * The payloads are built in backendSaleInput.ts, shared with the mock, which checks them with the backend's schemas.
 * Backend errors are thrown on; the actions turn them into codes (toErrorCode).
 */

const OK: ActionResult = { ok: true };
const CASHUP_NOT_OPEN: ActionResult = { ok: false, code: "CASHUP_NOT_OPEN" };
const ENTITY_NOT_FOUND: ActionResult = { ok: false, code: "ENTITY_NOT_FOUND" };

/** Runs a write inside the driver's open cash-up, found on the server, never sent by the browser. */
async function inOwnOpenCashUp(write: (own: CashUpOwnDto) => Promise<ActionResult>): Promise<ActionResult> {
    // BACKEND: the driver's own open cash-up.
    const own = await getOwnOpenCashUp();
    if (own === null) return CASHUP_NOT_OPEN;
    return write(own);
}

export const realSaleWrites: SaleWriteGateway = {
    addSale(details, saveKey) {
        return inOwnOpenCashUp(async (own) => {
            // BACKEND: a new "to deliver" sale, with no payment field at all.
            await createSale(own.id, { ...toPendingSaleInput(details), idempotencyKey: saveKey });
            return OK;
        });
    },

    editSale(saleId, changes) {
        return inOwnOpenCashUp(async (own) => {
            // BACKEND: order fields only; a delivered sale is refused with SALE_ALREADY_DELIVERED.
            await editSale(own.id, saleId, toOrderFields(changes));
            return OK;
        });
    },

    completeDelivery(saleId, delivery) {
        return inOwnOpenCashUp(async (own) => {
            const sale = own.sales.find((openSale) => openSale.id === saleId);
            if (!sale) return ENTITY_NOT_FOUND;
            const savedFee = { usd: sale.deliveryFeeUsd, lbp: sale.deliveryFeeLbp };

            // BACKEND: delivered in one call; the fee only for a currency the driver changed.
            await confirmSaleDelivery(own.id, saleId, toConfirmDeliveryInput(delivery, savedFee));
            return OK;
        });
    },

    deleteSale(saleId, reason) {
        return inOwnOpenCashUp(async (own) => {
            // BACKEND: soft-deletes a "to deliver" sale with the driver's reason (3 to 200 characters, checked there).
            await cancelSale(own.id, saleId, reason);
            return OK;
        });
    },

    requestSaleDeletion(saleId, reason) {
        return inOwnOpenCashUp(async (own) => {
            // BACKEND: opens a deletion request for a delivered sale and locks it ("Deletion requested").
            await requestSaleDeletion(own.id, saleId, reason);
            return OK;
        });
    },
};
