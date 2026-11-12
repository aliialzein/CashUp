"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { AmountPairField } from "@/components/ui/AmountPairField";
import { Card } from "@/components/ui/Card";
import { FormActions } from "@/components/ui/FormActions";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TextField } from "@/components/ui/driver/TextField";
import { addCashOut } from "@/lib/driver/cash-out/actions";
import { canSaveCashOut } from "@/lib/driver/cash-out/canSaveCashOut";
import { OTHER_DETAIL_MAX_LENGTH } from "@/lib/driver/cash-out/reasonText";
import type { CashOutReason } from "@/lib/driver/cash-out/reasons";
import { errorText } from "@/lib/driver/cash-up/actionResult";
import type { Amounts } from "@/lib/format/money";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";
import { blankAmountsToZero } from "@/lib/money/blankAmountsToZero";
import { routes } from "@/lib/routes";
import { ReasonPicker } from "./ReasonPicker";

const EMPTY_AMOUNT: Amounts = { usd: "", lbp: "" };

export function AddCashOutForm() {
    const router = useRouter();
    const [amount, setAmount] = useState<Amounts>(EMPTY_AMOUNT);
    const [reason, setReason] = useState<CashOutReason>("Fuel");
    const [detail, setDetail] = useState("");
    const [note, setNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    /**
     * One key per save attempt, so the backend never records the same cash-out twice (double click, retry
     * after a lost answer). Made on the first Save click, not while rendering, because Next prerenders this
     * form and refuses random values there. Kept after a refused save; emptied by reset() after success.
     */
    const saveKeyRef = useRef<string | null>(null);

    const isOther = reason === "Other";
    const canSave = canSaveCashOut({ amount, reason, detail });

    function reset() {
        setAmount(EMPTY_AMOUNT);
        setReason("Fuel");
        setDetail("");
        setNote("");
        setErrorMessage(null);
        saveKeyRef.current = null;
    }

    useResetOnHide(reset);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSave || isSaving) return;

        const saveKey = (saveKeyRef.current ??= crypto.randomUUID());
        setIsSaving(true);
        setErrorMessage(null);
        const result = await addCashOut({ saveKey, amount: blankAmountsToZero(amount), reason, detail, note });
        setIsSaving(false);

        if (!result.ok) {
            setErrorMessage(errorText(result.code));
            return;
        }
        reset();
        router.push(routes.driver.cashOuts);
    }

    return (
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-160">
            {/* A card on desktop; flat on the phone, where the page itself is the surface. */}
            <Card className="flex flex-col gap-5 max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:shadow-none md:p-7">
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
                                maxLength={OTHER_DETAIL_MAX_LENGTH}
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

                {/* Same style as CancelCashUp. On the phone the buttons are stuck to the bottom, so this sits right above that bar. */}
                {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

                <FormActions
                    cancelHref={routes.driver.cashOuts}
                    submitLabel="Save cash-out"
                    submitDisabled={!canSave || isSaving}
                    onCancel={reset}
                    cancelOnPhone={false}
                />
            </Card>
        </form>
    );
}
