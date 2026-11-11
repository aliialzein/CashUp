"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AmountPairField } from "@/components/ui/AmountPairField";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/driver/Button";
import { Collapse } from "@/components/ui/Collapse";
import { FormActions } from "@/components/ui/FormActions";
import { errorText } from "@/lib/driver/cash-up/actionResult";
import { toDeliveryInput } from "@/lib/driver/delivery/deliveryInput";
import { EMPTY_AMOUNT, cleaned, toFields } from "@/lib/driver/delivery/fields";
import { summarizeSinglePayment, type PaymentMethod } from "@/lib/driver/delivery/summarizeSinglePayment";
import { completeDelivery } from "@/lib/driver/sales/actions";
import { toFormAmounts } from "@/lib/driver/sales/saleForm";
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

const NONE: Amounts = { usd: "0", lbp: "0" };
const CHECK_HINT = "Check the amounts. After you confirm, this sale is locked.";
const FEE_MISSING_HINT = "Enter the delivery fee to confirm.";

/**
 * The client pays with ONE method and says how much. Cash also records the change given back.
 * Fee, tip, method, what was paid and the change go to the backend in one call; after that the sale is locked.
 */
export function SingleMethodDeliveryForm({ sale, feeRequired, returnHref, editHref }: DeliveryFormProps) {
    const router = useRouter();
    // The fee is pre-filled through the same rule as typing ("2000.00" LBP shows as "2000").
    const startFee = toFormAmounts(sale.deliveryFee ?? NONE);
    const [feeInput, setFeeInput] = useState<Amounts>(startFee);
    const [tipInput, setTipInput] = useState<Amounts>(EMPTY_AMOUNT);
    const [method, setMethod] = useState<PaymentMethod>("CASH");
    const [paidInput, setPaidInput] = useState<Amounts>(EMPTY_AMOUNT);
    const [changeInput, setChangeInput] = useState<Amounts>(EMPTY_AMOUNT);
    const [confirmingGap, setConfirmingGap] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorCode, setErrorCode] = useState<string | null>(null);

    const fee = cleaned(feeInput);
    const tip = cleaned(tipInput);
    const discount = sale.discount ?? NONE;
    const change = cleaned(changeInput);
    const payment = summarizeSinglePayment({
        order: sale.amount,
        fee,
        tip,
        discount,
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
        setFeeInput(startFee);
        setTipInput(EMPTY_AMOUNT);
        setMethod("CASH");
        setPaidInput(EMPTY_AMOUNT);
        setChangeInput(EMPTY_AMOUNT);
        setConfirmingGap(false);
        setErrorCode(null);
    }

    useResetOnHide(reset);

    async function save() {
        if (isSaving) return;
        setIsSaving(true);
        setErrorCode(null);
        const result = await completeDelivery(
            sale.id,
            toDeliveryInput({ fee: feeInput, tip: tipInput, method, paid: paidInput, change: changeInput }),
        );
        setIsSaving(false);

        // Refused: everything typed stays, with the reason why.
        if (!result.ok) {
            setErrorCode(result.code);
            return;
        }
        reset();
        router.push(returnHref);
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (feeMissing || isSaving) return;
        // Missing money is allowed, but the driver must confirm it a second time.
        if (missingMoney && !confirmingGap) {
            setConfirmingGap(true);
            return;
        }
        void save();
    }

    const errorLine = errorCode && <p className="text-sm text-red-600">{errorText(errorCode)}</p>;

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-3.5 md:grid-cols-2 md:gap-6">
            {/* While the gap warning is open, the fields are locked. */}
            <fieldset disabled={confirmingGap || isSaving} className="flex min-w-0 flex-col gap-3.5 md:gap-5">
                <OrderCard sale={sale} editHref={editHref} />

                <DeliverySection
                    title={`Delivery fee ${feeRequired ? "(required)" : "(optional)"}`}
                    hint="Pre-filled from the sale. You can change it."
                >
                    <AmountPairField label="Delivery fee" value={feeInput} onChange={setFeeInput} />
                </DeliverySection>

                <DeliverySection title="Tip (optional)" hint="Extra the client gave. Leave it empty if there was none.">
                    <AmountPairField label="Tip" value={tipInput} onChange={setTipInput} />
                </DeliverySection>

                <DeliverySection title="How did the client pay?">
                    <PaymentMethodPicker value={method} onChange={setMethod} />
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
                        tip={tip}
                        discount={discount}
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
                            {errorLine}
                            <div className="grid grid-cols-2 gap-3">
                                <Button type="button" variant="secondary" onClick={() => setConfirmingGap(false)} disabled={isSaving}>
                                    Go back
                                </Button>
                                <Button type="submit" disabled={isSaving}>
                                    Confirm with gap
                                </Button>
                            </div>
                        </div>
                    </BottomBar>
                ) : (
                    <>
                        {feeMissing ? (
                            <p className="hidden text-sm text-warning md:block">{FEE_MISSING_HINT}</p>
                        ) : (
                            <p className="hidden text-sm text-muted md:block">{CHECK_HINT}</p>
                        )}
                        {errorLine}
                        <FormActions
                            cancelHref={returnHref}
                            submitLabel="Confirm delivery"
                            submitDisabled={feeMissing || isSaving}
                            onCancel={reset}
                            cancelOnPhone={false}
                            hint={feeMissing ? FEE_MISSING_HINT : CHECK_HINT}
                        />
                    </>
                )}
            </div>
        </form>
    );
}
