"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AmountPairField } from "@/components/ui/AmountPairField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormActions } from "@/components/ui/FormActions";
import { EMPTY_AMOUNT, cleaned, initialFee, toFields } from "@/lib/delivery/fields";
import { summarizeDelivery } from "@/lib/delivery/summarizeDelivery";
import { hasAmount } from "@/lib/format/amountInput";
import { formatAmounts, type Amounts } from "@/lib/format/money";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";
import { addAmounts, isZeroAmounts } from "@/lib/money/amounts";
import type { DeliveryFormProps } from "./deliveryFormProps";
import { DeliverySummaryPanel } from "./DeliverySummaryPanel";
import { WALLET_LABELS, WalletProviderPicker, type WalletProvider } from "./WalletProviderPicker";

function FillRestButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="text-sm font-semibold text-ink hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
        >
            Fill the rest
        </button>
    );
}

const HEADING = "font-heading text-base font-semibold";

/**
 * The client may pay part in cash and part by wallet. Not used at the moment (see `paymentMode.ts`).
 * Desktop layout only: its phone layout is the "Split" board in the design, still to build if the team switches to it.
 */
export function SplitDeliveryForm({ sale, feeRequired, returnHref }: DeliveryFormProps) {
    const router = useRouter();
    const [feeInput, setFeeInput] = useState<Amounts>(initialFee(sale.deliveryFee));
    const [cashInput, setCashInput] = useState<Amounts>(EMPTY_AMOUNT);
    const [walletInput, setWalletInput] = useState<Amounts>(EMPTY_AMOUNT);
    const [provider, setProvider] = useState<WalletProvider>("WHISH");
    const [confirmingGap, setConfirmingGap] = useState(false);

    const fee = cleaned(feeInput);
    const cash = cleaned(cashInput);
    const wallet = cleaned(walletInput);
    const summary = summarizeDelivery({ order: sale.amount, fee, cash, wallet });
    const feeMissing = feeRequired && !hasAmount(feeInput.usd) && !hasAmount(feeInput.lbp);

    // Only missing money needs a second confirmation. Extra money is fine.
    const missingMoney = !isZeroAmounts(summary.remaining);
    const nothingToFill = !missingMoney;

    /** Puts what is still missing into the cash or the wallet fields, on top of what is already there. */
    function fillRest(target: "cash" | "wallet") {
        const next = toFields(addAmounts(target === "cash" ? cash : wallet, summary.remaining));
        if (target === "cash") setCashInput(next);
        else setWalletInput(next);
    }

    function reset() {
        setFeeInput(initialFee(sale.deliveryFee));
        setCashInput(EMPTY_AMOUNT);
        setWalletInput(EMPTY_AMOUNT);
        setProvider("WHISH");
        setConfirmingGap(false);
    }

    useResetOnHide(reset);

    function save() {
        // TODO: send { fee, cash, wallet, provider } to the API.
        reset();
        router.push(returnHref);
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (feeMissing) return;
        // Missing money is allowed, but the driver must confirm it a second time.
        if (missingMoney && !confirmingGap) {
            setConfirmingGap(true);
            return;
        }
        save();
    }

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 items-start gap-6">
            {/* Left column: the two cards under each other. While the gap warning is open, the fields are locked. */}
            <fieldset disabled={confirmingGap} className="min-w-0 space-y-5">
                <Card className="space-y-3 p-6">
                    <div className="space-y-1">
                        <h2 className={HEADING}>Delivery fee {feeRequired ? "(required)" : "(optional)"}</h2>
                        <p className="text-[13px] leading-snug text-muted">Pre-filled from the sale. You can change it.</p>
                    </div>
                    <AmountPairField label="Delivery fee" value={feeInput} onChange={setFeeInput} />
                </Card>

                <Card className="space-y-4 p-6">
                    <div className="space-y-1">
                        <h2 className={HEADING}>How did the client pay?</h2>
                        <p className="text-[13px] leading-snug text-muted">
                            Fill one part, or both if the client paid in two ways. It stays one sale.
                        </p>
                    </div>

                    <div className="space-y-3 rounded-xl border border-line p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-heading font-semibold">Paid in cash</p>
                                <p className="text-xs text-muted">Goes into your drawer</p>
                            </div>
                            <FillRestButton disabled={nothingToFill} onClick={() => fillRest("cash")} />
                        </div>
                        <AmountPairField label="Cash" value={cashInput} onChange={setCashInput} />
                    </div>

                    <div className="space-y-3 rounded-xl border border-line p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-heading font-semibold">Paid by wallet</p>
                                <p className="text-xs text-muted">Not counted as drawer cash</p>
                            </div>
                            <FillRestButton disabled={nothingToFill} onClick={() => fillRest("wallet")} />
                        </div>
                        <WalletProviderPicker value={provider} onChange={setProvider} />
                        <AmountPairField label="Wallet" value={walletInput} onChange={setWalletInput} />
                    </div>
                </Card>
            </fieldset>

            {/* Right column: stays in view while the left side scrolls. */}
            <div className="sticky top-24 space-y-4">
                <DeliverySummaryPanel
                    order={sale.amount}
                    fee={fee}
                    cash={cash}
                    wallet={wallet}
                    walletLabel={WALLET_LABELS[provider]}
                    summary={summary}
                />

                {confirmingGap ? (
                    <>
                        <div
                            role="alert"
                            className="space-y-1 rounded-xl border border-warning-line bg-warning-bg px-5 py-4 text-sm text-warning"
                        >
                            <p className="font-semibold">The client has not paid everything.</p>
                            <p className="font-mono">Still to collect: {formatAmounts(summary.remaining)}</p>
                            <p>If you confirm, the delivery is saved with this gap, and you are responsible for it.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button type="button" variant="secondary" onClick={() => setConfirmingGap(false)}>
                                Go back
                            </Button>
                            <Button type="submit">Confirm with gap</Button>
                        </div>
                    </>
                ) : (
                    <>
                        {feeMissing && <p className="text-sm text-warning">Enter the delivery fee to confirm.</p>}
                        <FormActions
                            cancelHref={returnHref}
                            submitLabel="Confirm delivery"
                            submitDisabled={feeMissing}
                            onCancel={reset}
                        />
                    </>
                )}
            </div>
        </form>
    );
}
