"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    children: ReactNode;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    /** True while the action runs. Both buttons wait and the dialog cannot be dismissed. */
    pending?: boolean;
};

/** A small "are you sure?" popup. Same on phone and desktop. Esc and a tap outside cancel it. */
export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel, pending = false }: ConfirmDialogProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    function cancel() {
        if (!pending) onCancel();
    }

    return (
        <dialog
            ref={ref}
            onCancel={(event) => {
                event.preventDefault();
                cancel();
            }}
            onClick={(event) => {
                if (event.target === ref.current) cancel();
            }}
            className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40"
        >
            <div className="space-y-4 p-5">
                <div className="space-y-2">
                    <h2 className="font-heading text-lg font-semibold">{title}</h2>
                    <div className="text-sm leading-relaxed text-muted">{children}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Button type="button" variant="secondary" onClick={cancel} disabled={pending}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={onConfirm} disabled={pending}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </dialog>
    );
}
