"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AmountPairField } from "@/components/ui/AmountPairField";
import { Card } from "@/components/ui/Card";
import { FormActions } from "@/components/ui/FormActions";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TextField } from "@/components/ui/TextField";
import { canSaveCashOut } from "@/lib/cash-out/canSaveCashOut";
import type { CashOutReason } from "@/lib/cash-out/reasons";
import type { Amounts } from "@/lib/format/money";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";
import { routes } from "@/lib/routes";
import { ReasonPicker } from "./ReasonPicker";

const EMPTY_AMOUNT: Amounts = { usd: "", lbp: "" };

export function AddCashOutForm() {
    const router = useRouter();
    const [amount, setAmount] = useState<Amounts>(EMPTY_AMOUNT);
    const [reason, setReason] = useState<CashOutReason>("Fuel");
    const [detail, setDetail] = useState("");
    const [note, setNote] = useState("");

    const isOther = reason === "Other";
    const canSave = canSaveCashOut({ amount, reason, detail });

    function reset() {
        setAmount(EMPTY_AMOUNT);
        setReason("Fuel");
        setDetail("");
        setNote("");
    }

    useResetOnHide(reset);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSave) return;
        // TODO: send { amount, reason, detail: isOther ? detail.trim() : undefined, note } to the API.
        reset();
        router.push(routes.driver.cashOuts);
    }

    return (
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-160">
            <Card className="space-y-5 p-7">
                <div className="space-y-2">
                    <SectionLabel>Amount taken out</SectionLabel>
                    <AmountPairField label="Amount out" value={amount} onChange={setAmount} />
                </div>

                <div>
                    <div className="space-y-2">
                        <SectionLabel>Reason</SectionLabel>
                        <ReasonPicker value={reason} onChange={setReason} />
                    </div>

                    <Reveal open={isOther}>
                        <div className="pt-3 pb-1">
                            <TextField
                                label="What was it?"
                                placeholder="e.g. Car wash"
                                value={detail}
                                onChange={(event) => setDetail(event.target.value)}
                            />
                        </div>
                    </Reveal>
                </div>

                <TextField
                    label="Note (optional)"
                    placeholder="What was it for?"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                />

                <FormActions
                    cancelHref={routes.driver.cashOuts}
                    submitLabel="Save cash-out"
                    submitDisabled={!canSave}
                    onCancel={reset}
                />
            </Card>
        </form>
    );
}
