"use client";

import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/driver/Button";
import { Modal } from "@/components/ui/Modal";

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
    const titleId = useId();

    return (
        <Modal open={open} labelledBy={titleId} onDismiss={onCancel} pending={pending}>
            <div className="space-y-4 p-5">
                <div className="space-y-2">
                    <h2 id={titleId} className="font-heading text-lg font-semibold">
                        {title}
                    </h2>
                    <div className="text-sm leading-relaxed text-muted">{children}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={onConfirm} disabled={pending}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
