"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/driver/Button";
import { Card } from "@/components/ui/Card";
import { cancelCashUp } from "@/lib/driver/cash-up/actions";
import { errorText } from "@/lib/driver/cash-up/actionResult";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";

/** Deletes an empty cash-up. The button asks "sure?" in place, with no popup. */
export function CancelCashUp() {
    const [confirming, setConfirming] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useResetOnHide(() => setConfirming(false));

    function startConfirming() {
        // A refusal from an earlier try should not show again on a new try.
        setErrorMessage(null);
        setConfirming(true);
    }

    function handleDelete() {
        setErrorMessage(null);
        startTransition(async () => {
            const result = await cancelCashUp();
            if (!result.ok) setErrorMessage(errorText(result.code));
        });
    }

    if (!confirming) {
        return (
            <Button type="button" variant="ghost" onClick={startConfirming}>
                Cancel cash-up
            </Button>
        );
    }

    return (
        <Card role="alert" className="space-y-3 p-4">
            <p className="text-sm">Delete this cash-up? Nothing was recorded in it, so nothing is lost.</p>
            {/* The card is already an alert, so the screen reader reads this line when it appears. */}
            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
            <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="secondary" disabled={isPending} onClick={() => setConfirming(false)}>
                    Keep it
                </Button>
                <Button type="button" disabled={isPending} onClick={handleDelete}>
                    Delete
                </Button>
            </div>
        </Card>
    );
}
