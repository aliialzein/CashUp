import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import { getOpenCashUp, recalculateOpenMockCashUp } from "@/lib/driver/mock/today";
import type { Sale } from "@/types/driver/cash-up";
import type { SaleWriteGateway } from "./saleWriteGateway";

/**
 * Fake sale writes for mock mode. They change the mock open cash-up's sales in memory, so every flow can be
 * tried on screen; everything resets when the dev server restarts. After every change the mock ledger and the sale
 * cards are recalculated like the backend would (recalculateOpenMockCashUp). Delete together with the mock folder.
 */

const OK: ActionResult = { ok: true };
const refused = (code: string): ActionResult => ({ ok: false, code });

/** Save keys already used, so a repeated save (double click, retry) adds the sale only once, like the backend. */
const usedSaveKeys = new Set<string>();

/** The sale in the open mock cash-up, or why it cannot be changed. */
function findSale(saleId: string): Sale | ActionResult {
    const cashUp = getOpenCashUp();
    if (cashUp === null) return refused("CASHUP_NOT_OPEN");
    return cashUp.sales.find((sale) => sale.id === saleId) ?? refused("ENTITY_NOT_FOUND");
}

/** Only a "to deliver" sale can be edited, delivered or deleted. */
function findSaleToDeliver(saleId: string, refusalWhenDelivered: string): Sale | ActionResult {
    const found = findSale(saleId);
    if ("ok" in found) return found;
    if (found.status === "DELETED") return refused("SALE_ALREADY_CANCELLED");
    if (found.status !== "TO_DELIVER") return refused(refusalWhenDelivered);
    return found;
}

function currentTime(): string {
    return new Date().toTimeString().slice(0, 5);
}

export const mockSaleWrites: SaleWriteGateway = {
    async addSale(details, saveKey) {
        const cashUp = getOpenCashUp();
        if (cashUp === null) return refused("CASHUP_NOT_OPEN");
        if (usedSaveKeys.has(saveKey)) return OK;
        usedSaveKeys.add(saveKey);

        const nextNumber = Math.max(0, ...cashUp.sales.map((sale) => sale.number)) + 1;
        const sale: Sale = {
            id: `mock-sale-${nextNumber}`,
            number: nextNumber,
            clientPhone: details.clientNumber,
            clientNumber: details.clientNumber,
            time: currentTime(),
            status: "TO_DELIVER",
            amount: details.amount,
            deliveryFee: details.deliveryFee,
            discount: details.discount,
        };
        if (details.note !== null) sale.note = details.note;
        cashUp.sales.unshift(sale);
        recalculateOpenMockCashUp();
        return OK;
    },

    async editSale(saleId, changes) {
        const found = findSaleToDeliver(saleId, "SALE_NOT_AWAITING_DELIVERY");
        if ("ok" in found) return found;

        if (changes.amount) found.amount = changes.amount;
        if (changes.deliveryFee) found.deliveryFee = changes.deliveryFee;
        if (changes.discount) found.discount = changes.discount;
        if (changes.clientNumber !== undefined) {
            found.clientNumber = changes.clientNumber;
            found.clientPhone = changes.clientNumber;
        }
        if (changes.note !== undefined) {
            if (changes.note === null) delete found.note;
            else found.note = changes.note;
        }
        found.isEdited = true;
        recalculateOpenMockCashUp();
        return OK;
    },

    async completeDelivery(saleId, delivery) {
        const found = findSaleToDeliver(saleId, "SALE_NOT_AWAITING_DELIVERY");
        if ("ok" in found) return found;

        found.status = "DELIVERED";
        found.deliveryFee = delivery.deliveryFee;
        found.tip = delivery.tip;
        found.method = delivery.method;
        found.totalCollected = delivery.collected;
        found.changeGiven = delivery.change;
        recalculateOpenMockCashUp();
        return OK;
    },

    async deleteSale(saleId, reason) {
        const found = findSaleToDeliver(saleId, "SALE_CANNOT_BE_CANCELLED");
        if ("ok" in found) return found;

        found.status = "DELETED";
        found.cancelReason = reason.trim();
        recalculateOpenMockCashUp();
        return OK;
    },

    async requestSaleDeletion(saleId) {
        const found = findSale(saleId);
        if ("ok" in found) return found;
        if (found.status !== "DELIVERED" || found.deletionAwaiting) return refused("CONFLICT");

        found.deletionAwaiting = true;
        return OK;
    },
};
