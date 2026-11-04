"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AmountPairField } from "@/components/ui/AmountPairField";
import { Card } from "@/components/ui/Card";
import { FormActions } from "@/components/ui/FormActions";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TextField } from "@/components/ui/TextField";
import { hasAmount } from "@/lib/format/amountInput";
import type { Amounts } from "@/lib/format/money";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";

const EMPTY_AMOUNT: Amounts = { usd: "", lbp: "" };

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
        <Card className="mx-auto w-full max-w-[640px] p-7">
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <SectionLabel>Amount to collect</SectionLabel>
                    <AmountPairField label="Amount to collect" value={amount} onChange={setAmount} />
                </div>

                <div className="space-y-2">
                    <SectionLabel>Delivery fee (optional)</SectionLabel>
                    <AmountPairField label="Delivery fee" value={fee} onChange={setFee} />
                </div>

                <TextField label="Client number" placeholder="+961 …" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <TextField
                    label="Note (optional)"
                    placeholder="Gate code, floor, instructions"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />

                <p className="text-[13px] text-muted">
                    Payment method and what the client paid are added when you complete the delivery.
                </p>

                <FormActions cancelHref={returnHref} submitLabel="Save sale" submitDisabled={!canSave} onCancel={reset} />
            </form>
        </Card>
    );
}
