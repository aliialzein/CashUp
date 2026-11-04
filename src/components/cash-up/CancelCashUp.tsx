"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cancelCashUp } from "@/lib/cash-up/actions";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";

/** Deletes an empty cash-up. The button asks "sure?" in place, with no popup. */
export function CancelCashUp() {
    const [confirming, setConfirming] = useState(false);
    const [isPending, startTransition] = useTransition();

    useResetOnHide(() => setConfirming(false));

    function handleDelete() {
        startTransition(async () => {
            await cancelCashUp();
        });
    }

    if (!confirming) {
        return (
            <Button type="button" variant="ghost" onClick={() => setConfirming(true)}>
                Cancel cash-up
            </Button>
        );
    }

    return (
        <Card role="alert" className="space-y-3 p-4">
            <p className="text-sm">Delete this cash-up? Nothing was recorded in it, so nothing is lost.</p>
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
