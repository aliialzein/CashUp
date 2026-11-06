"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AmountPairField } from "@/components/ui/AmountPairField";
import { FormActions } from "@/components/ui/FormActions";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TextField } from "@/components/ui/driver/TextField";
import { hasAmount } from "@/lib/format/amountInput";
import type { Amounts } from "@/lib/format/money";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";

const EMPTY_AMOUNT: Amounts = { usd: "", lbp: "" };

const LATER_HINT = "Payment method and what the client paid are added when you complete the delivery.";

type AddSaleFormProps = {
    /** Where Cancel and Save go: the page the driver came from. */
    returnHref: string;
};

export function AddSaleForm({ returnHref }: AddSaleFormProps) {
    const router = useRouter();
    const [amount, setAmount] = useState<Amounts>(EMPTY_AMOUNT);
    const [fee, setFee] = useState<Amounts>(EMPTY_AMOUNT);
    const [phone, setPhone] = useState("");
    const [note, setNote] = useState("");

    const canSave = hasAmount(amount.usd) || hasAmount(amount.lbp);

    function reset() {
        setAmount(EMPTY_AMOUNT);
        setFee(EMPTY_AMOUNT);
        setPhone("");
        setNote("");
    }

    useResetOnHide(reset);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSave) return;
        // TODO: send { amount, fee, phone, note } to the API.
        reset();
        router.push(returnHref);
    }

    return (
        // Phone: the fields sit on the page. Desktop: they sit in one white card.
        <form
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-[640px] space-y-5 md:rounded-xl md:border md:border-line md:bg-surface md:p-7"
        >
            {/* flex gap, not space-y: the phone-only hint is hidden on desktop, and space-y would still leave a margin for it. */}
            <div className="flex flex-col gap-2 [&>h2]:mb-0">
                <SectionLabel>Amount to collect</SectionLabel>
                <AmountPairField label="Amount to collect" value={amount} onChange={setAmount} />
                <p className="text-[13px] text-muted md:hidden">Leave a currency at 0 if it is not used. Nothing is converted.</p>
            </div>

            <div className="space-y-2">
                <SectionLabel>Delivery fee (optional)</SectionLabel>
                <AmountPairField label="Delivery fee" value={fee} onChange={setFee} />
            </div>

            {/* The client number is shown in the mono font, like the other numbers. */}
            <div className="[&_input]:font-mono">
                <TextField
                    label="Client number"
                    placeholder="+961 …"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            </div>
            <TextField
                label="Note (optional)"
                placeholder="Gate code, floor, instructions"
                value={note}
                onChange={(e) => setNote(e.target.value)}
            />

            <p className="hidden text-[13px] text-muted md:block">{LATER_HINT}</p>

            <FormActions
                cancelHref={returnHref}
                submitLabel="Save sale"
                submitDisabled={!canSave}
                onCancel={reset}
                cancelOnPhone={false}
                hint={LATER_HINT}
            />
        </form>
    );
}
