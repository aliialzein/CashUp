"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormActions } from "@/components/ui/FormActions";
import { errorText } from "@/lib/driver/cash-up/actionResult";
import { editSale } from "@/lib/driver/sales/actions";
import { isClientNumberError } from "@/lib/driver/sales/clientNumber";
import { changedSaleFields, saleToFormValues, type SaleFormValues } from "@/lib/driver/sales/saleForm";
import { hasAmount } from "@/lib/format/amountInput";
import type { Sale } from "@/types/driver/cash-up";
import { SaleFields } from "./SaleFields";

type EditSaleFormProps = {
    /** A "to deliver" sale (the page shows 404 for any other). */
    sale: Sale;
    /** Where Cancel goes: the page the driver came from. */
    returnHref: string;
};

/** The Add sale form, filled in. Only the fields that changed are sent, and Save is locked until something changes. */
export function EditSaleForm({ sale, returnHref }: EditSaleFormProps) {
    const router = useRouter();
    /** What the sale looks like on the server: where the form started, or what was last saved. */
    const [saved, setSaved] = useState<SaleFormValues>(() => saleToFormValues(sale));
    const [values, setValues] = useState<SaleFormValues>(saved);
    const [isSaving, setIsSaving] = useState(false);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [showUpdated, setShowUpdated] = useState(false);

    const changes = changedSaleFields(saved, values);
    const hasChanges = Object.keys(changes).length > 0;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!hasChanges || isSaving) return;

        setIsSaving(true);
        setErrorCode(null);
        setShowUpdated(false);
        const result = await editSale(sale.id, changes);
        setIsSaving(false);

        if (!result.ok) {
            setErrorCode(result.code);
            return;
        }
        // What was just saved is the new starting point, so Save locks again until the next change.
        setSaved(values);
        setShowUpdated(true);
        // The page header (client number) reads the sale on the server.
        router.refresh();
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-[640px] space-y-5 md:rounded-xl md:border md:border-line md:bg-surface md:p-7"
        >
            {showUpdated && (
                <p role="status" className="rounded-xl border border-success-line bg-success-bg px-4 py-3 text-sm text-success">
                    Sale updated.
                </p>
            )}

            <p className="text-sm text-muted">
                You can change this sale until it is delivered. After you confirm the delivery, it is final.
            </p>

            <SaleFields
                values={values}
                onChange={setValues}
                discountStartsOpen={hasAmount(saved.discount.usd) || hasAmount(saved.discount.lbp)}
                clientNumberInvalid={isClientNumberError(errorCode)}
            />

            {/* Same style as AddSaleForm. On the phone the buttons are stuck to the bottom, so this sits right above that bar. */}
            {errorCode && <p className="text-sm text-red-600">{errorText(errorCode)}</p>}

            <FormActions
                cancelHref={returnHref}
                submitLabel="Save changes"
                submitDisabled={!hasChanges || isSaving}
                onCancel={() => setValues(saved)}
                cancelOnPhone={false}
                hintBelow={hasChanges ? "Only the fields you changed are saved." : "Change something to save."}
            />
        </form>
    );
}
