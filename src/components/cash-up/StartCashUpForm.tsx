"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { AmountPairField } from "@/components/ui/AmountPairField";
import { Card } from "@/components/ui/Card";
import { startCashUp } from "@/lib/cash-up/actions";
import { formatCashUpNumber } from "@/lib/cash-up/cashUpLabel";
import { openingFloat } from "@/lib/cash-up/openingFloat";
import type { Amounts } from "@/lib/format/money";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";
import { routes } from "@/lib/routes";
import type { FloatSuggestion } from "@/types/cash-up";

const EMPTY_FLOAT: Amounts = { usd: "", lbp: "" };

/** The opening float, prefilled from the last cash-up. Leaving a currency blank means zero. */
export function StartCashUpForm({ suggestion }: { suggestion: FloatSuggestion | null }) {
    const router = useRouter();
    const suggested = suggestion?.float ?? EMPTY_FLOAT;
    const [float, setFloat] = useState<Amounts>(suggested);
    const [isPending, startTransition] = useTransition();

    function reset() {
        setFloat(suggested);
    }

    useResetOnHide(reset);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        startTransition(async () => {
            await startCashUp(openingFloat(float));
            reset();
            router.push(routes.driver.today);
        });
    }

    return (
        <form onSubmit={handleSubmit}>
            <Card className="space-y-4 p-6">
                <h2 className="font-heading text-base font-semibold">Opening float</h2>
                <p className="text-[13px] text-muted">
                    {suggestion
                        ? `Suggested from your last cash-up (${formatCashUpNumber(suggestion.fromNumber)}). Change it if your drawer started with a different amount.`
                        : "The money already in your drawer before your first sale. Leave a currency empty if it started with none."}
                </p>
                <AmountPairField label="Opening float" value={float} onChange={setFloat} />
                <div className="space-y-3 pt-1">
                    <Button type="submit" disabled={isPending}>
                        Start cash-up
                    </Button>
                    <ButtonLink href={routes.driver.today} variant="secondary" onClick={reset}>
                        Cancel
                    </ButtonLink>
                </div>
            </Card>
        </form>
    );
}
