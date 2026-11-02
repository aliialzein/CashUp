"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AmountField } from "@/components/ui/AmountField";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { routes } from "@/lib/routes";
import { hasAmount } from "@/lib/format/amountInput";

export function AddSaleForm() {
    const router = useRouter();
    const [usd, setUsd] = useState("");
    const [lbp, setLbp] = useState("");
    const [phone, setPhone] = useState("");
    const [note, setNote] = useState("");
    const [feeUsd, setFeeUsd] = useState("");
    const [feeLbp, setFeeLbp] = useState("");

    const canSave = hasAmount(usd) || hasAmount(lbp);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        // TODO: send { usd, lbp, feeUsd, feeLbp, phone, note } to the API. For now we only go back to the list.
        reset();
        router.push(routes.driver.sales);
    }

    function reset() {
        setUsd("");
        setLbp("");
        setPhone("");
        setNote("");
        setFeeUsd("");
        setFeeLbp("");
    }

    return (
        <Card className="mx-auto w-full max-w-[640px] p-7">
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <p className="text-xs font-medium tracking-wider text-muted uppercase">Amount to collect</p>
                    <div className="grid grid-cols-2 gap-3">
                        <AmountField currency="USD" value={usd} onChange={setUsd} />
                        <AmountField currency="LBP" value={lbp} onChange={setLbp} />
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-medium tracking-wider text-muted uppercase">Delivery fee (optional)</p>
                    <div className="grid grid-cols-2 gap-3">
                        <AmountField currency="USD" value={feeUsd} onChange={setFeeUsd} label="Delivery fee USD" />
                        <AmountField currency="LBP" value={feeLbp} onChange={setFeeLbp} label="Delivery fee LBP" />
                    </div>
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

                <div className="flex justify-end gap-3">
                    <div className="w-28">
                        <ButtonLink href={routes.driver.sales} variant="secondary" onClick={reset}>
                            Cancel
                        </ButtonLink>
                    </div>
                    <div className="w-36">
                        <Button type="submit" disabled={!canSave}>
                            Save sale
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    );
}
