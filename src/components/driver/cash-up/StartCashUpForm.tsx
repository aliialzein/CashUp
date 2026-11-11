"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { AmountField } from "@/components/ui/AmountField";
import { AmountPairField } from "@/components/ui/AmountPairField";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/driver/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { startCashUp } from "@/lib/driver/cash-up/actions";
import { errorText } from "@/lib/driver/cash-up/actionResult";
import { formatCashUpNumber } from "@/lib/driver/cash-up/cashUpLabel";
import { openingFloat } from "@/lib/driver/cash-up/openingFloat";
import { DEFAULT_REFERENCE_RATE_LBP } from "@/lib/driver/cash-up/referenceRate";
import type { Amounts } from "@/lib/format/money";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";
import { routes } from "@/lib/routes";
import type { FloatSuggestion } from "@/types/driver/cash-up";

const EMPTY_FLOAT: Amounts = { usd: "", lbp: "" };

/** An empty field means zero. */
function showAmount(value: string): string {
    return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}

/** Where the suggested float comes from. A small card on phone, plain text on desktop. */
function SuggestionNote({ fromNumber }: { fromNumber: number }) {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 md:border-0 md:bg-transparent md:p-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-subtle text-muted md:hidden">
                <Icon name="info" size={16} />
            </span>
            <p className="text-sm leading-relaxed text-muted md:text-[13px]">
                Suggested from your last cash-up ({formatCashUpNumber(fromNumber)}). Change it if your drawer started with a
                different amount.
            </p>
        </div>
    );
}

/** The opening float, prefilled from the last cash-up. Leaving a currency blank means zero. Starting asks to confirm first. */
export function StartCashUpForm({ suggestion }: { suggestion: FloatSuggestion | null }) {
    const router = useRouter();
    const suggested = suggestion?.float ?? EMPTY_FLOAT;
    const [float, setFloat] = useState<Amounts>(suggested);
    const [rate, setRate] = useState(DEFAULT_REFERENCE_RATE_LBP);
    const [confirming, setConfirming] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    function reset() {
        setFloat(suggested);
        setRate(DEFAULT_REFERENCE_RATE_LBP);
        setConfirming(false);
        setErrorMessage(null);
    }

    useResetOnHide(reset);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setConfirming(true);
    }

    function handleConfirm() {
        startTransition(async () => {
            const result = await startCashUp(openingFloat(float), rate);
            if (!result.ok) {
                setErrorMessage(errorText(result.code));
                setConfirming(false);
                return;
            }
            reset();
            router.push(routes.driver.today);
        });
    }

    return (
        <>
            <form onSubmit={handleSubmit}>
                {/* Phone: the content sits on the page. Desktop: it sits in one white card. */}
                <div className="space-y-5 md:space-y-4 md:rounded-xl md:border md:border-line md:bg-surface md:p-6">
                    <div className="space-y-2 md:space-y-4">
                        <h2 className="text-xs font-medium tracking-wider text-muted uppercase md:font-heading md:text-base md:font-semibold md:tracking-normal md:text-ink md:normal-case">
                            Opening float
                        </h2>
                        <p className="text-sm leading-relaxed text-muted md:text-[13px]">
                            The money already in your drawer before your first sale.
                            {!suggestion && " Leave a currency empty if it started with none."}
                        </p>
                        <AmountPairField label="Opening float" value={float} onChange={setFloat} />
                    </div>

                    {/* Used when a client's change mixes USD and LBP. Clearing the field starts without a rate. */}
                    <div className="space-y-2 md:space-y-4">
                        <h2 className="text-xs font-medium tracking-wider text-muted uppercase md:font-heading md:text-base md:font-semibold md:tracking-normal md:text-ink md:normal-case">
                            Today&apos;s rate
                        </h2>
                        <AmountField currency="LBP" unit="LBP per 1 USD" label="Today's rate, LBP per 1 USD" value={rate} onChange={setRate} />
                    </div>

                    {/* Under both fields, since a refusal can be about the float or the rate. */}
                    {errorMessage && (
                        <p role="alert" className="text-sm text-red-600">
                            {errorMessage}
                        </p>
                    )}

                    {suggestion && <SuggestionNote fromNumber={suggestion.fromNumber} />}

                    <BottomBar tight>
                        <div className="md:space-y-3 md:pt-1">
                            <Button type="submit" disabled={isPending}>
                                Start cash-up
                            </Button>
                            <div className="hidden md:block">
                                <ButtonLink href={routes.driver.today} variant="secondary" onClick={reset}>
                                    Cancel
                                </ButtonLink>
                            </div>
                        </div>
                    </BottomBar>
                </div>
            </form>

            <ConfirmDialog
                open={confirming}
                title="Start a new cash-up?"
                confirmLabel="Start"
                onConfirm={handleConfirm}
                onCancel={() => setConfirming(false)}
                pending={isPending}
            >
                <p>
                    Opening float: USD {showAmount(float.usd)} · LBP {showAmount(float.lbp)}.
                </p>
                <p>Only start one if you are about to begin your shift.</p>
            </ConfirmDialog>
        </>
    );
}
