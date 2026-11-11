"use client";

import { Button } from "@/components/ui/driver/Button";

type CountControlsProps = {
    /** The "This is my final count" checkbox. It starts unticked. */
    isFinal: boolean;
    onFinalChange: (isFinal: boolean) => void;
    /** True while a save or submit is on its way: nothing can be clicked twice. */
    isSending: boolean;
    /** The text of the last refusal, shown as the red line. */
    errorMessage: string | null;
    onSubmit: () => void;
    onSave: () => void;
};

/**
 * The checkbox decides which button works: ticked = "Submit cash-up", not ticked = "Save and finish later".
 * Phone: stacked, Submit first. Desktop: right-aligned, "Save and finish later" then "Submit cash-up".
 */
export function CountControls({ isFinal, onFinalChange, isSending, errorMessage, onSubmit, onSave }: CountControlsProps) {
    return (
        <div className="flex flex-col gap-3">
            {/* Same style as the forms' red line. Only after a refused save or submit. */}
            {errorMessage && (
                <p role="alert" className="text-sm text-red-600">
                    {errorMessage}
                </p>
            )}

            <label className="flex items-start gap-3">
                <input
                    type="checkbox"
                    checked={isFinal}
                    onChange={(event) => onFinalChange(event.target.checked)}
                    disabled={isSending}
                    className="mt-0.5 size-5 shrink-0 accent-ink"
                />
                <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">This is my final count</span>
                    <span className="text-[13px] text-muted">Tick it to submit. Submitting locks the cash-up.</span>
                </span>
            </label>

            <div className="flex flex-col gap-3 md:flex-row-reverse md:justify-start">
                <Button onClick={onSubmit} disabled={!isFinal || isSending} className="md:w-auto">
                    Submit cash-up
                </Button>
                <Button variant="secondary" onClick={onSave} disabled={isFinal || isSending} className="md:w-auto">
                    Save and finish later
                </Button>
            </div>
        </div>
    );
}
