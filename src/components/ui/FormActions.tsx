import type { ReactNode } from "react";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/driver/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";

type FormActionsProps = {
    cancelHref: string;
    submitLabel: string;
    submitDisabled?: boolean;
    /** Runs when the driver cancels, to reset the form. */
    onCancel?: () => void;
    /** False when the phone page has its own ← or ✕ that cancels. Desktop always shows Cancel. */
    cancelOnPhone?: boolean;
    /** A short note above the buttons, on phone only. Desktop shows its own note in the form. */
    hint?: ReactNode;
};

/**
 * Cancel and submit buttons. On desktop they sit right-aligned at the end of the form.
 * On phone, submit is full width and stuck to the bottom.
 */
export function FormActions({ cancelHref, submitLabel, submitDisabled, onCancel, cancelOnPhone = true, hint }: FormActionsProps) {
    return (
        <BottomBar>
            {hint && <p className="mb-2 text-center text-[13px] text-muted md:hidden">{hint}</p>}
            <div className="flex justify-end gap-3">
                <div className={`w-28 ${cancelOnPhone ? "" : "hidden md:block"}`}>
                    <ButtonLink href={cancelHref} variant="secondary" onClick={onCancel}>
                        Cancel
                    </ButtonLink>
                </div>
                <div className="flex-1 md:w-44 md:flex-none">
                    <Button type="submit" disabled={submitDisabled}>
                        {submitLabel}
                    </Button>
                </div>
            </div>
        </BottomBar>
    );
}
