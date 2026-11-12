import { computeDeliveryFlags, type DeliveryConfirmation, type DeliveryOrder } from "@/domain/money/delivery";
import { checkSaleBalance } from "@/domain/money/sale-balance";
import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import { toErrorCode } from "@/lib/driver/cash-up/errorCode";
import { getOpenCashUp, recalculateOpenMockCashUp } from "@/lib/driver/mock/today";
import type { Amounts } from "@/lib/format/money";
import type { SaleDeletionRequestDto } from "@/modules/sales/sales.types";
import {
    cancelSaleSchema,
    confirmDeliverySchema,
    createSaleSchema,
    editSaleSchema,
    requestDeleteSaleSchema,
    validateMergedSale,
    type MergedSaleCurrent,
} from "@/modules/sales/sales.validation";
import type { Sale } from "@/types/driver/cash-up";
import { toConfirmDeliveryInput, toOrderFields, toPendingSaleInput } from "./backendSaleInput";
import type { SaleWriteGateway } from "./saleWriteGateway";

/**
 * Fake sale writes for mock mode. They change the mock open cash-up's sales in memory, so every flow can be
 * tried on screen; everything resets when the dev server restarts. No rule is copied: each write checks the same
 * payload the real gateway sends (backendSaleInput.ts) with the backend's own schemas and money functions, and
 * refuses with the backend's codes. After every change the mock ledger and the sale cards are recalculated
 * (recalculateOpenMockCashUp). Delete together with the mock folder.
 */

/** A deletion request as the backend keeps it, with the fields the driver side needs. */
type MockDeletionRequest = Pick<SaleDeletionRequestDto, "id" | "saleId" | "status" | "reason" | "createdAt">;

const OK: ActionResult = { ok: true };
const NONE: Amounts = { usd: "0", lbp: "0" };
const refused = (code: string): ActionResult => ({ ok: false, code });

/** Save keys already used, so a repeated save (double click, retry) adds the sale only once, like the backend. */
const usedSaveKeys = new Set<string>();
/** The deletion requests opened in mock mode, like the backend's request table. */
const deletionRequests: MockDeletionRequest[] = [];

/** The deletion requests opened so far (mock mode only; the real ones come with the cash-up). */
export function mockDeletionRequests(): readonly MockDeletionRequest[] {
    return deletionRequests;
}

/** A backend schema's refusal as the code the screen shows, or null when the input passes. */
function schemaRefusal(result: { success: boolean; error?: unknown }): ActionResult | null {
    return result.success ? null : refused(toErrorCode(result.error));
}

/** The sale in the open mock cash-up, or why it cannot be found. */
function findSale(saleId: string): Sale | ActionResult {
    const cashUp = getOpenCashUp();
    if (cashUp === null) return refused("CASHUP_NOT_OPEN");
    return cashUp.sales.find((sale) => sale.id === saleId) ?? refused("ENTITY_NOT_FOUND");
}

/** The sale as the backend stores it, for its own validateMergedSale. A missing payment is null, never zero. */
function toMergedSaleCurrent(sale: Sale): MergedSaleCurrent {
    const deliveryFee = sale.deliveryFee ?? NONE;
    const discount = sale.discount ?? NONE;
    return {
        status: sale.status,
        businessAmountUsd: sale.amount.usd,
        businessAmountLbp: sale.amount.lbp,
        deliveryFeeUsd: deliveryFee.usd,
        deliveryFeeLbp: deliveryFee.lbp,
        discountUsd: discount.usd,
        discountLbp: discount.lbp,
        tipUsd: sale.tip?.usd ?? null,
        tipLbp: sale.tip?.lbp ?? null,
        totalCollectedUsd: sale.totalCollected?.usd ?? null,
        totalCollectedLbp: sale.totalCollected?.lbp ?? null,
        changeGivenUsd: sale.changeGiven?.usd ?? null,
        changeGivenLbp: sale.changeGiven?.lbp ?? null,
        method: sale.method ?? null,
        clientNumber: sale.clientNumber,
        note: sale.note ?? null,
    };
}

function currentTime(): string {
    return new Date().toTimeString().slice(0, 5);
}

export const mockSaleWrites: SaleWriteGateway = {
    async addSale(details, saveKey) {
        const refusal = schemaRefusal(createSaleSchema.safeParse(toPendingSaleInput(details)));
        if (refusal) return refusal;
        const cashUp = getOpenCashUp();
        if (cashUp === null) return refused("CASHUP_NOT_OPEN");
        if (usedSaveKeys.has(saveKey)) return OK;
        usedSaveKeys.add(saveKey);

        // A "to deliver" sale has no payment: method, tip, client paid and change are left out.
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
        const parsed = editSaleSchema.safeParse(toOrderFields(changes));
        if (!parsed.success) return refused(toErrorCode(parsed.error));
        const found = findSale(saleId);
        if ("ok" in found) return found;
        if (found.status === "DELETED") return refused("SALE_ALREADY_CANCELLED");
        if (found.deletionAwaiting) return refused("CONFLICT");
        if (found.status === "DELIVERED") return refused("SALE_ALREADY_DELIVERED");
        const mergedRefusal = schemaRefusal(validateMergedSale(toMergedSaleCurrent(found), parsed.data));
        if (mergedRefusal) return mergedRefusal;

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
        const found = findSale(saleId);
        if ("ok" in found) return found;
        const savedFee = found.deliveryFee ?? NONE;
        const parsed = confirmDeliverySchema.safeParse(toConfirmDeliveryInput(delivery, savedFee));
        if (!parsed.success) return refused(toErrorCode(parsed.error));
        if (found.status !== "TO_DELIVER") return refused("SALE_NOT_AWAITING_DELIVERY");
        const input = parsed.data;

        // Like the backend: a fee currency that was not sent keeps the shop's fee.
        const finalFee: Amounts = { usd: input.deliveryFeeUsd ?? savedFee.usd, lbp: input.deliveryFeeLbp ?? savedFee.lbp };
        const discount = found.discount ?? NONE;
        const order: DeliveryOrder = {
            businessAmountUsd: found.amount.usd,
            businessAmountLbp: found.amount.lbp,
            deliveryFeeUsd: finalFee.usd,
            deliveryFeeLbp: finalFee.lbp,
            tipUsd: input.tipUsd,
            tipLbp: input.tipLbp,
            discountUsd: discount.usd,
            discountLbp: discount.lbp,
            method: found.method ?? null,
        };
        const confirmation: DeliveryConfirmation = {
            totalCollectedUsd: input.totalCollectedUsd,
            totalCollectedLbp: input.totalCollectedLbp,
            changeGivenUsd: input.changeGivenUsd,
            changeGivenLbp: input.changeGivenLbp,
            method: input.method,
        };

        // Like the backend: the final order is checked (discount, maxima), then the balance with the cash-up's rate.
        const finalOrderRefusal = schemaRefusal(createSaleSchema.safeParse({ ...order, ...confirmation, status: "DELIVERED" }));
        if (finalOrderRefusal) return finalOrderRefusal;
        const referenceRate = getOpenCashUp()?.referenceRate ?? undefined;
        const balance = checkSaleBalance({ ...order, ...confirmation }, referenceRate);
        if (referenceRate === undefined && balance.requiresReferenceRate) return refused("SALE_REQUIRES_REFERENCE_RATE");

        found.amountDiffers = computeDeliveryFlags(order, confirmation, referenceRate).amountDiffers;
        found.status = "DELIVERED";
        found.deliveryFee = finalFee;
        found.tip = { usd: input.tipUsd, lbp: input.tipLbp };
        found.method = input.method;
        found.totalCollected = { usd: input.totalCollectedUsd, lbp: input.totalCollectedLbp };
        found.changeGiven = { usd: input.changeGivenUsd, lbp: input.changeGivenLbp };
        recalculateOpenMockCashUp();
        return OK;
    },

    async deleteSale(saleId, reason) {
        const parsed = cancelSaleSchema.safeParse({ reason });
        if (!parsed.success) return refused(toErrorCode(parsed.error));
        const found = findSale(saleId);
        if ("ok" in found) return found;
        if (found.status === "DELETED") return refused("SALE_ALREADY_CANCELLED");
        if (found.status !== "TO_DELIVER") return refused("SALE_CANNOT_BE_CANCELLED");

        found.status = "DELETED";
        found.cancelReason = parsed.data.reason;
        recalculateOpenMockCashUp();
        return OK;
    },

    async requestSaleDeletion(saleId, reason) {
        const parsed = requestDeleteSaleSchema.safeParse({ reason });
        if (!parsed.success) return refused(toErrorCode(parsed.error));
        const found = findSale(saleId);
        if ("ok" in found) return found;
        if (found.status === "DELETED") return refused("SALE_ALREADY_CANCELLED");
        if (found.status !== "DELIVERED") return refused("SALE_DELETION_REQUIRES_DELIVERED");
        const alreadyOpen = deletionRequests.some((request) => request.saleId === saleId && request.status === "AWAITING_OWNER");
        if (found.deletionAwaiting || alreadyOpen) return refused("SALE_DELETION_REQUEST_EXISTS");

        // Like the backend: the request is stored and the sale is locked until the owner decides.
        deletionRequests.push({
            id: `mock-request-${deletionRequests.length + 1}`,
            saleId,
            status: "AWAITING_OWNER",
            reason: parsed.data.reason,
            createdAt: new Date().toISOString(),
        });
        found.deletionAwaiting = true;
        return OK;
    },
};
