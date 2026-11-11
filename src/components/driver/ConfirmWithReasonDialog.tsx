"use client";

import { useId, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/driver/Button";
import { REASON_LENGTH } from "@/domain/money/config";
import { errorText, type ActionResult } from "@/lib/driver/cash-up/actionResult";

/** What the confirm is about, already formatted for the grey box. */
export type ConfirmItem = {
    id: string;
    /** Left in the grey box, e.g. "Fuel" or "Sale #105". */
    label: string;
    /** Right in the grey box, in red, e.g. "-$5.00". */
    amount: string;
};

type ConfirmWithReasonDialogProps = {
    /** `null` keeps the dialog closed. */
    item: ConfirmItem | null;
    title: string;
    /** What happens, under the grey box. */
    text: string;
    confirmLabel: string;
    /** The server action. Its refusal shows as the red line; the typed reason stays. */
    send: (id: string, reason: string) => Promise<ActionResult>;
    /** "Keep it", Esc or a tap outside: closed without sending. */
    onClose: () => void;
    /** The action succeeded. The list refreshes by itself (the action revalidates the page). */
    onDone: () => void;
};

/**
 * A confirm that asks why: sheet on the phone, dialog on desktop. Used to delete a cash-out, delete a sale
 * and ask to delete a delivered sale. The reason length is only counted here: the backend judges it, and its
 * refusals (REASON_TOO_SHORT, ...) come back as the red line.
 */
export function ConfirmWithReasonDialog({ item, title, text, confirmLabel, send, onClose, onDone }: ConfirmWithReasonDialogProps) {
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

    async function confirm() {
        if (!item || isSending) return;
        setIsSending(true);
        setErrorMessage(null);
        const result = await send(item.id, reason);
        setIsSending(false);

        // Refused: the reason the driver typed stays, with the reason why.
        if (!result.ok) {
            setErrorMessage(errorText(result.code));
            return;
        }
        clear();
        onDone();
    }

    return (
        <Modal open={item !== null} labelledBy={titleId} onDismiss={keepIt} pending={isSending} layout="sheet">
            {item && (
                <div className="flex flex-col gap-4 p-5 md:p-6">
                    <h2 id={titleId} className="font-heading text-lg font-semibold">
                        {title}
                    </h2>

                    <div className="flex items-baseline justify-between gap-3 rounded-xl bg-subtle px-4 py-3">
                        <span className="font-heading text-[15px] font-semibold">{item.label}</span>
                        <span className="text-right font-mono text-sm font-semibold whitespace-nowrap text-danger">{item.amount}</span>
                    </div>

                    <p className="text-sm leading-relaxed text-muted">{text}</p>

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

                    {/* Same style as the forms' red line. Only after a refused send. */}
                    {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

                    {/* Phone: stacked, the action first. Desktop: right-aligned, "Keep it" then the action. */}
                    <div className="flex flex-col gap-3 md:flex-row-reverse md:justify-start">
                        <Button variant="danger" onClick={confirm} disabled={isSending} className="md:w-auto">
                            {confirmLabel}
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
