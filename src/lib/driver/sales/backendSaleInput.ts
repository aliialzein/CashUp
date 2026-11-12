import { compare } from "@/domain/money/money";
import type { BackendAmounts } from "@/lib/money/toBackendMoney";
import type { ConfirmDeliveryInput, CreateSaleInput, EditSale } from "@/modules/sales/sales.validation";
import type { DeliveryDetails, SaleDetails } from "./saleWriteGateway";

/**
 * The sale gateway's fields in the backend's input shapes. Shared by realSaleWrites (which sends them) and
 * mockSaleWrites (which checks them with the backend's own schemas), so both handle the exact same payload.
 */

/** The order fields of a sale, in the backend's names. Add sends them all; Edit only the changed ones. */
export type OrderFields = Pick<
    EditSale,
    | "businessAmountUsd"
    | "businessAmountLbp"
    | "deliveryFeeUsd"
    | "deliveryFeeLbp"
    | "discountUsd"
    | "discountLbp"
    | "clientNumber"
    | "note"
>;

type FeeFields = Pick<OrderFields, "deliveryFeeUsd" | "deliveryFeeLbp">;

/**
 * The given sale fields in the backend's names. A field that is not given is left out.
 * An empty client number (spaces and dashes already removed) is sent as null: in an edit, a left-out field means
 * "unchanged", so null is what lets the backend refuse a cleared number with CLIENT_NUMBER_REQUIRED.
 */
export function toOrderFields(details: Partial<SaleDetails>): OrderFields {
    const fields: OrderFields = {};
    if (details.amount) {
        fields.businessAmountUsd = details.amount.usd;
        fields.businessAmountLbp = details.amount.lbp;
    }
    if (details.deliveryFee) {
        fields.deliveryFeeUsd = details.deliveryFee.usd;
        fields.deliveryFeeLbp = details.deliveryFee.lbp;
    }
    if (details.discount) {
        fields.discountUsd = details.discount.usd;
        fields.discountLbp = details.discount.lbp;
    }
    if (details.clientNumber !== undefined) fields.clientNumber = details.clientNumber === "" ? null : details.clientNumber;
    if (details.note !== undefined) fields.note = details.note;
    return fields;
}

/**
 * A new sale: always "to deliver", with NO payment field at all (the backend refuses any value, even "0.00").
 * Without a client number the field is left out, so the backend answers CLIENT_NUMBER_REQUIRED ("Enter the client
 * number.") instead of failing the number's pattern on "".
 */
export function toPendingSaleInput(details: SaleDetails): CreateSaleInput {
    const fields = toOrderFields(details);
    if (fields.clientNumber === null) delete fields.clientNumber;
    return { status: "TO_DELIVER", ...fields };
}

/**
 * Only the fee currencies the driver changed. The backend keeps the shop's fee for a currency that is left out;
 * a sent value, even "0.00", replaces it. The backend's own comparison decides, so "2" and "2.00" are the same.
 */
function changedFee(typed: BackendAmounts, saved: BackendAmounts): FeeFields {
    const fee: FeeFields = {};
    if (compare(typed.usd, saved.usd) !== 0) fee.deliveryFeeUsd = typed.usd;
    if (compare(typed.lbp, saved.lbp) !== 0) fee.deliveryFeeLbp = typed.lbp;
    return fee;
}

/** Complete delivery: method, tip, client paid and change are always sent ("0.00" when empty); the fee only if changed. */
export function toConfirmDeliveryInput(delivery: DeliveryDetails, savedFee: BackendAmounts): ConfirmDeliveryInput {
    return {
        ...changedFee(delivery.deliveryFee, savedFee),
        tipUsd: delivery.tip.usd,
        tipLbp: delivery.tip.lbp,
        totalCollectedUsd: delivery.collected.usd,
        totalCollectedLbp: delivery.collected.lbp,
        changeGivenUsd: delivery.change.usd,
        changeGivenLbp: delivery.change.lbp,
        method: delivery.method,
    };
}
