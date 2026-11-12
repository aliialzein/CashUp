"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FieldError } from "@/components/ui/FieldError";
import { FormActions } from "@/components/ui/FormActions";
import { PasswordField } from "@/components/ui/PasswordField";
import { isPasswordChangeValid, passwordErrors, type PasswordChange } from "@/lib/account/password";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";
import { routes } from "@/lib/routes";
import { PasswordStrengthHint } from "./PasswordStrengthHint";

const EMPTY: PasswordChange = { current: "", next: "", repeat: "" };

export function PasswordForm() {
    const router = useRouter();
    const [values, setValues] = useState<PasswordChange>(EMPTY);
    // The server is the only one that can say the current password is wrong.
    const [currentError, setCurrentError] = useState<string>();
    // Changing the key rebuilds the fields, so every password is hidden again after a reset.
    const [formKey, setFormKey] = useState(0);

    const errors = passwordErrors(values);
    const canSubmit = isPasswordChangeValid(values);

    function setField(field: keyof PasswordChange, value: string) {
        setValues((previous) => ({ ...previous, [field]: value }));
        if (field === "current") setCurrentError(undefined);
    }

    function reset() {
        setValues(EMPTY);
        setCurrentError(undefined);
        setFormKey((key) => key + 1);
    }

    useResetOnHide(reset);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) return;
        // TODO: send { current, next } to the API, which repeats every rule above.
        // If it answers that the current password is wrong: setCurrentError("Current password is wrong."); return;
        reset();
        router.push(routes.driver.account);
    }

    return (
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-140">
            {/* Phone: the fields sit on the page. Desktop: they sit in one white card. */}
            <div key={formKey} className="space-y-4 md:space-y-5 md:rounded-xl md:border md:border-line md:bg-surface md:p-7">
                <div>
                    <PasswordField
                        label="Current password"
                        autoComplete="current-password"
                        value={values.current}
                        onChange={(event) => setField("current", event.target.value)}
                    />
                    <FieldError message={currentError} />
                </div>

                <div>
                    <PasswordField
                        label="New password"
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={values.next}
                        onChange={(event) => setField("next", event.target.value)}
                    />
                    <FieldError message={errors.next} />
                    <PasswordStrengthHint password={values.next} />
                </div>

                <div>
                    <PasswordField
                        label="Repeat new password"
                        autoComplete="new-password"
                        value={values.repeat}
                        onChange={(event) => setField("repeat", event.target.value)}
                    />
                    <FieldError message={errors.repeat} />
                </div>

                <FormActions
                    cancelHref={routes.driver.account}
                    submitLabel="Update password"
                    submitDisabled={!canSubmit}
                    onCancel={reset}
                    cancelOnPhone={false}
                />
            </div>
        </form>
    );
}
