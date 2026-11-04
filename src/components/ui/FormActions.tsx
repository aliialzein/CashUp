import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";

type FormActionsProps = {
    cancelHref: string;
    submitLabel: string;
    submitDisabled?: boolean;
    /** Runs when the driver cancels, to reset the form. */
    onCancel?: () => void;
};

/** Cancel and submit buttons, right-aligned at the bottom of a form. */
export function FormActions({ cancelHref, submitLabel, submitDisabled, onCancel }: FormActionsProps) {
    return (
        <div className="flex justify-end gap-3">
            <div className="w-28">
                <ButtonLink href={cancelHref} variant="secondary" onClick={onCancel}>
                    Cancel
                </ButtonLink>
            </div>
            <div className="w-44">
                <Button type="submit" disabled={submitDisabled}>
                    {submitLabel}
                </Button>
            </div>
        </div>
    );
}
