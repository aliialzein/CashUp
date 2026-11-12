"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * "popup": a small box in the middle, same on phone and desktop.
 * "sheet": a bottom sheet on the phone, a 480px box in the middle on desktop.
 */
export type ModalLayout = "popup" | "sheet";

const LAYOUTS: Record<ModalLayout, string> = {
    popup: "m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl",
    sheet: "mx-0 mt-auto mb-0 w-full max-w-none rounded-t-2xl md:m-auto md:w-[480px] md:max-w-[480px] md:rounded-2xl",
};

type ModalProps = {
    open: boolean;
    /** The id of the element that names the modal (its title). */
    labelledBy: string;
    /** Runs on Esc and on a tap outside, unless `pending`. */
    onDismiss: () => void;
    /** True while an action runs: Esc and a tap outside do nothing. */
    pending?: boolean;
    layout?: ModalLayout;
    children: ReactNode;
};

/** A native <dialog> over a dark backdrop. Shared by ConfirmDialog and the bigger confirms. */
export function Modal({ open, labelledBy, onDismiss, pending = false, layout = "popup", children }: ModalProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    function dismiss() {
        if (!pending) onDismiss();
    }

    return (
        <dialog
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            onCancel={(event) => {
                event.preventDefault();
                dismiss();
            }}
            onClick={(event) => {
                if (event.target === ref.current) dismiss();
            }}
            className={`border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40 ${LAYOUTS[layout]}`}
        >
            {children}
        </dialog>
    );
}
