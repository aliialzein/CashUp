"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AmountField } from "@/components/ui/AmountField";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { summarizeDelivery } from "@/lib/delivery/summarizeDelivery";
import { hasAmount } from "@/lib/format/amountInput";
import { formatAmounts, type Amounts } from "@/lib/format/money";
import { addAmounts, isZeroAmounts } from "@/lib/money/amounts";
import { routes } from "@/lib/routes";
import type { Sale } from "@/types/cash-up";
import { DeliverySummaryPanel } from "./DeliverySummaryPanel";
import { WALLET_LABELS, WalletProviderPicker, type WalletProvider } from "./WalletProviderPicker";

/** Unfinished typing such as "." counts as empty. */
function toAmounts(usd: string, lbp: string): Amounts {
    const clean = (value: string) => (/\d/.test(value) ? value : "");
    return { usd: clean(usd), lbp: clean(lbp) };
}

/** Pre-filled fee from Add sale. A zero fee shows as an empty field. */
function initialAmount(value: string | undefined): string {
    return value !== undefined && hasAmount(value) ? value : "";
}

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

type CompleteDeliveryFormProps = {
    sale: Sale;
    /** Drivers must enter a fee. Cashiers may leave it empty. */
    feeRequired: boolean;
};

export function CompleteDeliveryForm({ sale, feeRequired }: CompleteDeliveryFormProps) {
    const router = useRouter();
    const [feeUsd, setFeeUsd] = useState(initialAmount(sale.deliveryFee?.usd));
    const [feeLbp, setFeeLbp] = useState(initialAmount(sale.deliveryFee?.lbp));
    const [cashUsd, setCashUsd] = useState("");
    const [cashLbp, setCashLbp] = useState("");
    const [walletUsd, setWalletUsd] = useState("");
    const [walletLbp, setWalletLbp] = useState("");
    const [provider, setProvider] = useState<WalletProvider>("WHISH");
    const [confirmingGap, setConfirmingGap] = useState(false);

    const fee = toAmounts(feeUsd, feeLbp);
    const cash = toAmounts(cashUsd, cashLbp);
    const wallet = toAmounts(walletUsd, walletLbp);
    const summary = summarizeDelivery({ order: sale.amount, fee, cash, wallet });
    const feeMissing = feeRequired && !hasAmount(feeUsd) && !hasAmount(feeLbp);

    // Only missing money needs a second confirmation. Extra money is fine.
    const missingMoney = !isZeroAmounts(summary.remaining);
    const nothingToFill = !missingMoney;

    /** Puts what is still missing into the cash or the wallet fields, on top of what is already there. */
    function fillRest(target: "cash" | "wallet") {
        const filled = addAmounts(target === "cash" ? cash : wallet, summary.remaining);
        const toField = (value: string) => (hasAmount(value) ? value : "");
        if (target === "cash") {
            setCashUsd(toField(filled.usd));
            setCashLbp(toField(filled.lbp));
        } else {
            setWalletUsd(toField(filled.usd));
            setWalletLbp(toField(filled.lbp));
        }
    }

    function reset() {
        setFeeUsd(initialAmount(sale.deliveryFee?.usd));
        setFeeLbp(initialAmount(sale.deliveryFee?.lbp));
        setCashUsd("");
        setCashLbp("");
        setWalletUsd("");
        setWalletLbp("");
        setProvider("WHISH");
        setConfirmingGap(false);
    }

    function save() {
        // TODO: send { fee, cash, wallet, provider } to the API. For now we only go back to the list.
        reset();
        router.push(routes.driver.sales);
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
                    <div className="grid grid-cols-2 gap-3">
                        <AmountField currency="USD" value={feeUsd} onChange={setFeeUsd} label="Delivery fee USD" />
                        <AmountField currency="LBP" value={feeLbp} onChange={setFeeLbp} label="Delivery fee LBP" />
                    </div>
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
                        <div className="grid grid-cols-2 gap-3">
                            <AmountField currency="USD" value={cashUsd} onChange={setCashUsd} label="Cash USD" />
                            <AmountField currency="LBP" value={cashLbp} onChange={setCashLbp} label="Cash LBP" />
                        </div>
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
                        <div className="grid grid-cols-2 gap-3">
                            <AmountField currency="USD" value={walletUsd} onChange={setWalletUsd} label="Wallet USD" />
                            <AmountField currency="LBP" value={walletLbp} onChange={setWalletLbp} label="Wallet LBP" />
                        </div>
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
                        <div className="grid grid-cols-2 gap-3">
                            <ButtonLink href={routes.driver.today} variant="secondary" onClick={reset}>
                                Cancel
                            </ButtonLink>
                            <Button type="submit" disabled={feeMissing}>
                                Confirm delivery
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </form>
    );
}
