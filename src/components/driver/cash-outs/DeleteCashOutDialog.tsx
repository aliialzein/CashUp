"use client";

import { useId, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/driver/Button";
import { REASON_LENGTH } from "@/domain/money/config";
import { cancelCashOut } from "@/lib/driver/cash-out/actions";
import { cashOutReasonLabel } from "@/lib/driver/cash-out/reasonText";
import { errorText } from "@/lib/driver/cash-up/actionResult";
import { formatOutflow } from "@/lib/format/money";
import type { CashOut } from "@/types/driver/cash-up";

type DeleteCashOutDialogProps = {
    /** The cash-out to delete. `null` keeps the dialog closed. */
    cashOut: CashOut | null;
    /** "Keep it", Esc or a tap outside: closed without sending. */
    onClose: () => void;
    /** The backend deleted it. The list refreshes by itself (the action revalidates the page). */
    onDeleted: () => void;
};

/**
 * Asks why the driver deletes a cash-out, then sends it. The reason length is only counted here:
 * the backend judges it, and its refusals (REASON_TOO_SHORT, ...) come back as the red line.
 */
export function DeleteCashOutDialog({ cashOut, onClose, onDeleted }: DeleteCashOutDialogProps) {
    const titleId = useId();
    const reasonId = useId();
    const [reason, setReason] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isTooLong = reason.length > REASON_LENGTH.max;

    function clear() {
        setReason("");
        setErrorMessage(null);
    }

    function keepIt() {
        clear();
        onClose();
    }

    async function deleteCashOut() {
        if (!cashOut || isSending) return;
        setIsSending(true);
        setErrorMessage(null);
        const result = await cancelCashOut(cashOut.id, reason);
        setIsSending(false);

        // Refused: the reason the driver typed stays, with the reason why.
        if (!result.ok) {
            setErrorMessage(errorText(result.code));
            return;
        }
        clear();
        onDeleted();
    }

    return (
        <Modal open={cashOut !== null} labelledBy={titleId} onDismiss={keepIt} pending={isSending} layout="sheet">
            {cashOut && (
                <div className="flex flex-col gap-4 p-5 md:p-6">
                    <h2 id={titleId} className="font-heading text-lg font-semibold">
                        Delete this cash-out?
                    </h2>

                    <div className="flex items-baseline justify-between gap-3 rounded-xl bg-subtle px-4 py-3">
                        <span className="font-heading text-[15px] font-semibold">{cashOutReasonLabel(cashOut)}</span>
                        <span className="text-right font-mono text-sm font-semibold whitespace-nowrap text-danger">
                            {formatOutflow(cashOut.amount)}
                        </span>
                    </div>

                    <p className="text-sm leading-relaxed text-muted">
                        It stays on record as deleted, and the owner sees your reason. You cannot undo this.
                    </p>

                    <div className="flex flex-col gap-2">
                        <label htmlFor={reasonId} className="text-sm font-medium">
                            Why are you deleting it?
                        </label>
                        <textarea
                            id={reasonId}
                            rows={3}
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            disabled={isSending}
                            className="w-full rounded-[10px] border border-line-strong bg-surface px-3.5 py-3 text-[15px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-ink"
                        />
                        <div className="flex justify-between text-[13px] text-muted">
                            <span>At least {REASON_LENGTH.min} characters</span>
                            <span className={`font-mono ${isTooLong ? "text-danger" : ""}`}>
                                {reason.length} / {REASON_LENGTH.max}
                            </span>
                        </div>
                    </div>

                    {/* Same style as CancelCashUp and AddCashOutForm. Only after a refused delete. */}
                    {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

                    {/* Phone: stacked, Delete first. Desktop: right-aligned, "Keep it" then "Delete cash-out". */}
                    <div className="flex flex-col gap-3 md:flex-row-reverse md:justify-start">
                        <Button variant="danger" onClick={deleteCashOut} disabled={isSending} className="md:w-auto">
                            Delete cash-out
                        </Button>
                        <Button variant="secondary" onClick={keepIt} disabled={isSending} className="md:w-auto">
                            Keep it
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
