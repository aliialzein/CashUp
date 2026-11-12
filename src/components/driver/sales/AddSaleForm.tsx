"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { FormActions } from "@/components/ui/FormActions";
import { errorText } from "@/lib/driver/cash-up/actionResult";
import { addSale } from "@/lib/driver/sales/actions";
import { isClientNumberError } from "@/lib/driver/sales/clientNumber";
import { EMPTY_SALE_FORM, toSaleFormInput, type SaleFormValues } from "@/lib/driver/sales/saleForm";
import { hasAmount } from "@/lib/format/amountInput";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";
import { SaleFields } from "./SaleFields";

const LATER_HINT = "Tip and payment are recorded when you complete the delivery.";

type AddSaleFormProps = {
    /** Where Cancel and Save go: the page the driver came from. */
    returnHref: string;
};

/** A new sale is always "to deliver". */
export function AddSaleForm({ returnHref }: AddSaleFormProps) {
    const router = useRouter();
    const [values, setValues] = useState<SaleFormValues>(EMPTY_SALE_FORM);
    const [isSaving, setIsSaving] = useState(false);
    /** The code of the last refused save; its text is the red line, and a client number code also marks that field. */
    const [errorCode, setErrorCode] = useState<string | null>(null);
    /**
     * One key per save attempt, so a double click or a retry never records the sale twice. Made on the first
     * Save click, not while rendering (Next prerenders this form and refuses random values there). Kept after a
     * refused save; emptied by reset() after success. Same as AddCashOutForm.
     */
    const saveKeyRef = useRef<string | null>(null);

    const canSave = hasAmount(values.amount.usd) || hasAmount(values.amount.lbp);

    function reset() {
        setValues(EMPTY_SALE_FORM);
        setErrorCode(null);
        saveKeyRef.current = null;
    }

    useResetOnHide(reset);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSave || isSaving) return;

        const saveKey = (saveKeyRef.current ??= crypto.randomUUID());
        setIsSaving(true);
        setErrorCode(null);
        const result = await addSale({ saveKey, ...toSaleFormInput(values) });
        setIsSaving(false);

        if (!result.ok) {
            setErrorCode(result.code);
            return;
        }
        reset();
        router.push(returnHref);
    }

    return (
        // Phone: the fields sit on the page. Desktop: they sit in one white card.
        <form
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-[640px] space-y-5 md:rounded-xl md:border md:border-line md:bg-surface md:p-7"
        >
            <SaleFields values={values} onChange={setValues} clientNumberInvalid={isClientNumberError(errorCode)} />

            <p className="hidden text-[13px] text-muted md:block">{LATER_HINT}</p>

            {/* Same style as AddCashOutForm. On the phone the buttons are stuck to the bottom, so this sits right above that bar. */}
            {errorCode && <p className="text-sm text-red-600">{errorText(errorCode)}</p>}

            <FormActions
                cancelHref={returnHref}
                submitLabel="Save sale"
                submitDisabled={!canSave || isSaving}
                onCancel={reset}
                cancelOnPhone={false}
                hint={LATER_HINT}
            />
        </form>
    );
}
