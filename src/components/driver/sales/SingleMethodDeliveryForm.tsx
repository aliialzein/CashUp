"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AmountPairField } from "@/components/ui/AmountPairField";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/driver/Button";
import { Collapse } from "@/components/ui/Collapse";
import { FormActions } from "@/components/ui/FormActions";
import { EMPTY_AMOUNT, cleaned, initialFee, toFields } from "@/lib/driver/delivery/fields";
import { summarizeSinglePayment, type PaymentMethod } from "@/lib/driver/delivery/summarizeSinglePayment";
import { hasAmount } from "@/lib/format/amountInput";
import { formatAmounts, type Amounts } from "@/lib/format/money";
import { formatUsedAmounts } from "@/lib/format/usedAmounts";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";
import { isZeroAmounts, subtractAmounts } from "@/lib/money/amounts";
import type { DeliveryFormProps } from "./deliveryFormProps";
import { DeliverySection } from "./DeliverySection";
import { DeliverySummaryPanel } from "./DeliverySummaryPanel";
import { OrderCard } from "./OrderCard";
import { PaymentMethodPicker } from "./PaymentMethodPicker";
import { UseChip } from "./UseChip";
import { WALLET_LABELS } from "./WalletProviderPicker";

/** The client pays with ONE method and says how much. Cash also records the change given back. */
export function SingleMethodDeliveryForm({ sale, feeRequired, returnHref }: DeliveryFormProps) {
    const router = useRouter();
    const [feeInput, setFeeInput] = useState<Amounts>(initialFee(sale.deliveryFee));
    const [method, setMethod] = useState<PaymentMethod>("CASH");
    const [paidInput, setPaidInput] = useState<Amounts>(EMPTY_AMOUNT);
    const [changeInput, setChangeInput] = useState<Amounts>(EMPTY_AMOUNT);
    const [confirmingGap, setConfirmingGap] = useState(false);

    const fee = cleaned(feeInput);
    const change = cleaned(changeInput);
    const payment = summarizeSinglePayment({
        order: sale.amount,
        fee,
        method,
        paid: cleaned(paidInput),
        change,
    });
    const { summary } = payment;

    const isCash = method === "CASH";
    const feeMissing = feeRequired && !hasAmount(feeInput.usd) && !hasAmount(feeInput.lbp);
    // Only missing money needs a second confirmation. Extra money is fine.
    const missingMoney = !isZeroAmounts(summary.remaining);
    const suggestedChange = formatUsedAmounts(payment.suggestedChange);

    // Offer the exact total until the client paid exactly that and, in cash, no change was given back.
    const paidExactly = isZeroAmounts(subtractAmounts(cleaned(paidInput), summary.due));
    const canUseExactAmount = !paidExactly || (isCash && !isZeroAmounts(change));

    /** An exact payment needs no change, so the change is cleared too. */
    function fillExactAmount() {
        setPaidInput(toFields(summary.due));
        setChangeInput(EMPTY_AMOUNT);
    }

    function reset() {
        setFeeInput(initialFee(sale.deliveryFee));
        setMethod("CASH");
        setPaidInput(EMPTY_AMOUNT);
        setChangeInput(EMPTY_AMOUNT);
        setConfirmingGap(false);
    }

    useResetOnHide(reset);

    function save() {
        // TODO: send { fee, method, intoDrawer: payment.intoDrawer, change, wallet: payment.throughWallet } to the API.
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
        <form onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-3.5 md:grid-cols-2 md:gap-6">
            {/* While the gap warning is open, the fields are locked. */}
            <fieldset disabled={confirmingGap} className="flex min-w-0 flex-col gap-3.5 md:gap-5">
                <DeliverySection title="How did the client pay?">
                    <PaymentMethodPicker value={method} onChange={setMethod} />
                </DeliverySection>

                <OrderCard sale={sale} />

                <DeliverySection
                    title={`Delivery fee ${feeRequired ? "(required)" : "(optional)"}`}
                    hint="Pre-filled from the sale. You can change it."
                >
                    <AmountPairField label="Delivery fee" value={feeInput} onChange={setFeeInput} />
                </DeliverySection>

                {/* One block, so the space above Change given belongs to it and disappears when it folds away. */}
                <div>
                    <DeliverySection
                        title="Client paid"
                        hint={
                            isCash
                                ? "What the client handed over. Leave a currency empty if it was not used."
                                : "What the client sent through the wallet. Leave a currency empty if it was not used."
                        }
                        action={canUseExactAmount && <UseChip onClick={fillExactAmount}>Use exact amount</UseChip>}
                    >
                        <AmountPairField label="Client paid" value={paidInput} onChange={setPaidInput} />
                        <p className="font-mono text-xs text-muted md:hidden">Client owes {formatAmounts(summary.due)}</p>
                    </DeliverySection>

                    <Collapse open={isCash}>
                        <div className="pt-3.5 md:pt-5">
                            <DeliverySection
                                title="Change given"
                                hint="What you gave back to the client."
                                action={
                                    suggestedChange && (
                                        <UseChip onClick={() => setChangeInput(toFields(payment.suggestedChange))}>
                                            Use {suggestedChange}
                                        </UseChip>
                                    )
                                }
                            >
                                <AmountPairField label="Change given" value={changeInput} onChange={setChangeInput} />
                            </DeliverySection>
                        </div>
                    </Collapse>
                </div>
            </fieldset>

            {/* Desktop: the summary stays in view while the left side scrolls. The phone has the bottom bar only. */}
            <div className="flex flex-col gap-4 md:sticky md:top-24">
                <div className="hidden md:block">
                    <DeliverySummaryPanel
                        order={sale.amount}
                        fee={fee}
                        cash={payment.intoDrawer}
                        wallet={payment.throughWallet}
                        walletLabel={isCash ? "wallet" : WALLET_LABELS[method]}
                        summary={summary}
                    />
                </div>

                {confirmingGap ? (
                    <BottomBar>
                        <div className="flex flex-col gap-3">
                            <div
                                role="alert"
                                className="space-y-1 rounded-xl border border-warning-line bg-warning-bg px-4 py-3 text-sm text-warning md:px-5 md:py-4"
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
                        </div>
                    </BottomBar>
                ) : (
                    <>
                        {feeMissing && <p className="hidden text-sm text-warning md:block">Enter the delivery fee to confirm.</p>}
                        <FormActions
                            cancelHref={returnHref}
                            submitLabel="Confirm delivery"
                            submitDisabled={feeMissing}
                            onCancel={reset}
                            cancelOnPhone={false}
                            hint={feeMissing ? "Enter the delivery fee to confirm." : undefined}
                        />
                    </>
                )}
            </div>
        </form>
    );
}
