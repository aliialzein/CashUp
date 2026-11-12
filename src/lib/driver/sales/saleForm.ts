import { toField } from "@/lib/driver/delivery/fields";
import { toNote } from "@/lib/driver/toNote";
import { cleanAmountInput } from "@/lib/format/amountInput";
import type { Amounts } from "@/lib/format/money";
import { blankAmountsToZero } from "@/lib/money/blankAmountsToZero";
import { toBackendAmounts } from "@/lib/money/toBackendMoney";
import type { Sale } from "@/types/driver/cash-up";
import { toBackendClientNumber } from "./clientNumber";

/** The Add sale / Edit sale fields exactly as typed. */
export type SaleFormValues = {
    amount: Amounts;
    deliveryFee: Amounts;
    discount: Amounts;
    clientNumber: string;
    note: string;
};

const EMPTY_AMOUNT: Amounts = { usd: "", lbp: "" };
const SALE_MONEY_FIELDS = ["amount", "deliveryFee", "discount"] as const;

export const EMPTY_SALE_FORM: SaleFormValues = {
    amount: EMPTY_AMOUNT,
    deliveryFee: EMPTY_AMOUNT,
    discount: EMPTY_AMOUNT,
    clientNumber: "",
    note: "",
};

/** What the form sends: a currency left blank becomes "0" (the actions treat blank as unreadable). Text stays as typed. */
export function toSaleFormInput(values: SaleFormValues): SaleFormValues {
    return {
        ...values,
        amount: blankAmountsToZero(values.amount),
        deliveryFee: blankAmountsToZero(values.deliveryFee),
        discount: blankAmountsToZero(values.discount),
    };
}

/** A saved amount as the field shows it: through the same input rule as typing ("50000.00" LBP -> "50000"), zero as empty. */
export function toFormAmounts({ usd, lbp }: Amounts): Amounts {
    return {
        usd: toField(cleanAmountInput(usd, "USD") ?? usd),
        lbp: toField(cleanAmountInput(lbp, "LBP") ?? lbp),
    };
}

/** A saved sale as the Edit form starts. */
export function saleToFormValues(sale: Sale): SaleFormValues {
    return {
        amount: toFormAmounts(sale.amount),
        deliveryFee: toFormAmounts(sale.deliveryFee ?? EMPTY_AMOUNT),
        discount: toFormAmounts(sale.discount ?? EMPTY_AMOUNT),
        clientNumber: sale.clientNumber ?? "",
        note: sale.note ?? "",
    };
}

/** Same money once both are in the backend form ("10" = "10.00", blank = "0"). An unreadable amount never counts as the same. */
function sameAmounts(left: Amounts, right: Amounts): boolean {
    const leftBackend = toBackendAmounts(blankAmountsToZero(left));
    const rightBackend = toBackendAmounts(blankAmountsToZero(right));
    if (leftBackend === null || rightBackend === null) return false;
    return leftBackend.usd === rightBackend.usd && leftBackend.lbp === rightBackend.lbp;
}

/**
 * Only the fields the driver really changed, ready to send (blank currencies as "0").
 * Compared the way they are sent, so "10" vs "10.00", "70 123 456" vs "70123456" or a note of only spaces
 * vs no note are not changes. Empty result: nothing to save.
 */
export function changedSaleFields(original: SaleFormValues, current: SaleFormValues): Partial<SaleFormValues> {
    const changes: Partial<SaleFormValues> = {};
    for (const field of SALE_MONEY_FIELDS) {
        if (!sameAmounts(original[field], current[field])) changes[field] = blankAmountsToZero(current[field]);
    }
    if (toBackendClientNumber(original.clientNumber) !== toBackendClientNumber(current.clientNumber)) {
        changes.clientNumber = current.clientNumber;
    }
    if (toNote(original.note) !== toNote(current.note)) changes.note = current.note;
    return changes;
}
