"use client";

import { useId, useState } from "react";
import { AmountPairField } from "@/components/ui/AmountPairField";
import { Collapse } from "@/components/ui/Collapse";
import { Icon } from "@/components/ui/Icon";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TextField } from "@/components/ui/driver/TextField";
import { isClientNumberInput } from "@/lib/driver/sales/clientNumber";
import type { SaleFormValues } from "@/lib/driver/sales/saleForm";
import type { Amounts } from "@/lib/format/money";

type SaleFieldsProps = {
    values: SaleFormValues;
    onChange: (values: SaleFormValues) => void;
    /** The Discount section starts closed, so the phone form stays short. Edit sale opens it when the sale has a discount. */
    discountStartsOpen?: boolean;
    /** The last save was refused because of the client number (red border). */
    clientNumberInvalid?: boolean;
};

/** The fields of a "to deliver" sale, shared by Add sale and Edit sale. */
export function SaleFields({ values, onChange, discountStartsOpen = false, clientNumberInvalid = false }: SaleFieldsProps) {
    const [discountOpen, setDiscountOpen] = useState(discountStartsOpen);
    const discountId = useId();

    function change<Field extends keyof SaleFormValues>(field: Field, value: SaleFormValues[Field]) {
        onChange({ ...values, [field]: value });
    }

    return (
        <>
            {/* flex gap, not space-y: the phone-only hint is hidden on desktop, and space-y would still leave a margin for it. */}
            <div className="flex flex-col gap-2 [&>h2]:mb-0">
                <SectionLabel>Amount to collect</SectionLabel>
                <AmountPairField label="Amount to collect" value={values.amount} onChange={(amount: Amounts) => change("amount", amount)} />
                <p className="text-[13px] text-muted md:hidden">Leave a currency at 0 if it is not used. Nothing is converted.</p>
            </div>

            <div className="space-y-2">
                <SectionLabel>Delivery fee (optional)</SectionLabel>
                <AmountPairField label="Delivery fee" value={values.deliveryFee} onChange={(fee: Amounts) => change("deliveryFee", fee)} />
            </div>

            <div>
                <button
                    type="button"
                    aria-expanded={discountOpen}
                    aria-controls={discountId}
                    onClick={() => setDiscountOpen((open) => !open)}
                    className="flex w-full items-center justify-between text-xs font-medium tracking-wider text-muted uppercase"
                >
                    Discount
                    <Icon
                        name="chevronDown"
                        size={18}
                        className={`transition-transform duration-500 ease-in-out motion-reduce:transition-none ${discountOpen ? "rotate-180" : ""}`}
                    />
                </button>
                <Collapse open={discountOpen}>
                    <div id={discountId} className="pt-2">
                        <AmountPairField label="Discount" value={values.discount} onChange={(discount: Amounts) => change("discount", discount)} />
                    </div>
                </Collapse>
            </div>

            {/* The client number is shown in the mono font, like the other numbers. Only digits, +, spaces and dashes are accepted. */}
            <div className="[&_input]:font-mono">
                <TextField
                    label="Client number"
                    placeholder="+961 …"
                    inputMode="tel"
                    invalid={clientNumberInvalid}
                    value={values.clientNumber}
                    onChange={(event) => {
                        if (isClientNumberInput(event.target.value)) change("clientNumber", event.target.value);
                    }}
                />
            </div>
            <TextField
                label="Note (optional)"
                placeholder="Gate code, floor, instructions"
                value={values.note}
                onChange={(event) => change("note", event.target.value)}
            />
        </>
    );
}
