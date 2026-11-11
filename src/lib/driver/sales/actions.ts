"use server";

import { revalidatePath } from "next/cache";
import { PAYMENT_METHODS } from "@/domain/money/config";
import type { ActionResult } from "@/lib/driver/cash-up/actionResult";
import { runAction } from "@/lib/driver/runAction";
import type { PaymentMethod } from "@/lib/driver/delivery/summarizeSinglePayment";
import { toNote } from "@/lib/driver/toNote";
import type { Amounts } from "@/lib/format/money";
import { toBackendAmounts } from "@/lib/money/toBackendMoney";
import { routes } from "@/lib/routes";
import { toBackendClientNumber } from "./clientNumber";
import type { SaleFormValues } from "./saleForm";
import type { DeliveryDetails, SaleDetails } from "./saleWriteGateway";
import { saleWrites } from "./saleWrites";

/**
 * The driver's sale writes. Each action normalizes what the form typed, then calls the sale gateway
 * (saleWrites: mock or real). Nothing here knows the backend: only realSaleWrites.ts does.
 */

/** The Add sale fields as the form sends them (blank currencies already "0", see toSaleFormInput), plus the save key. */
export type AddSaleInput = SaleFormValues & {
    /** One per save attempt, made by the form on the first Save click (like AddCashOutForm). */
    saveKey: string;
};

/** Only the fields the driver changed. */
export type EditSaleInput = Partial<SaleFormValues>;

/** The Complete delivery fields as typed in the form. */
export type CompleteDeliveryInput = {
    deliveryFee: Amounts;
    tip: Amounts;
    /** Checked here, because anyone can call an action. */
    method: string;
    collected: Amounts;
    change: Amounts;
};

const VALIDATION_ERROR: ActionResult = { ok: false, code: "VALIDATION_ERROR" };
const SALE_MONEY_FIELDS = ["amount", "deliveryFee", "discount"] as const;

function isPaymentMethod(method: string): method is PaymentMethod {
    return PAYMENT_METHODS.some((knownMethod) => knownMethod === method);
}

/** Sales show on their own page and on Today (waiting sales, totals). */
function refreshSalePages(): void {
    revalidatePath(routes.driver.sales);
    revalidatePath(routes.driver.today);
}

/** The typed sale fields in the backend form, or `null` if an amount cannot be read. */
function toSaleDetails(input: SaleFormValues): SaleDetails | null {
    const amount = toBackendAmounts(input.amount);
    const deliveryFee = toBackendAmounts(input.deliveryFee);
    const discount = toBackendAmounts(input.discount);
    if (amount === null || deliveryFee === null || discount === null) return null;
    return { amount, deliveryFee, discount, clientNumber: toBackendClientNumber(input.clientNumber), note: toNote(input.note) };
}

/** Records a new sale. It is always "to deliver"; tip and payment come at delivery. */
export async function addSale(input: AddSaleInput): Promise<ActionResult> {
    const details = toSaleDetails(input);
    if (details === null) return VALIDATION_ERROR;
    return runAction("addSale", () => saleWrites.addSale(details, input.saveKey), refreshSalePages);
}

/** Changes a "to deliver" sale. Only the fields that changed are sent; with none, nothing is sent. */
export async function editSale(saleId: string, changes: EditSaleInput): Promise<ActionResult> {
    const details: Partial<SaleDetails> = {};
    for (const field of SALE_MONEY_FIELDS) {
        const typed = changes[field];
        if (typed === undefined) continue;
        const backendAmounts = toBackendAmounts(typed);
        if (backendAmounts === null) return VALIDATION_ERROR;
        details[field] = backendAmounts;
    }
    if (changes.clientNumber !== undefined) details.clientNumber = toBackendClientNumber(changes.clientNumber);
    if (changes.note !== undefined) details.note = toNote(changes.note);

    if (Object.keys(details).length === 0) return { ok: false, code: "EDIT_FIELD_REQUIRED" };
    return runAction("editSale", () => saleWrites.editSale(saleId, details), refreshSalePages);
}

/** Marks a sale delivered, in one call: fee, tip, payment method, what was collected and the change. */
export async function completeDelivery(saleId: string, input: CompleteDeliveryInput): Promise<ActionResult> {
    const deliveryFee = toBackendAmounts(input.deliveryFee);
    const tip = toBackendAmounts(input.tip);
    const collected = toBackendAmounts(input.collected);
    const change = toBackendAmounts(input.change);
    if (deliveryFee === null || tip === null || collected === null || change === null) return VALIDATION_ERROR;
    if (!isPaymentMethod(input.method)) return VALIDATION_ERROR;

    const delivery: DeliveryDetails = { deliveryFee, tip, method: input.method, collected, change };
    return runAction("completeDelivery", () => saleWrites.completeDelivery(saleId, delivery), refreshSalePages);
}

/** Deletes a "to deliver" sale. The backend judges the reason (3 to 200 characters). */
export async function deleteSale(saleId: string, reason: string): Promise<ActionResult> {
    return runAction("deleteSale", () => saleWrites.deleteSale(saleId, reason), refreshSalePages);
}

/** Asks the owner to delete a delivered sale. */
export async function requestSaleDeletion(saleId: string, reason: string): Promise<ActionResult> {
    return runAction("requestSaleDeletion", () => saleWrites.requestSaleDeletion(saleId, reason), refreshSalePages);
}
