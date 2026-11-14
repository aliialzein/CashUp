"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { changePasswordAction } from "@/app/(auth)/actions";
import { FieldError } from "@/components/ui/FieldError";
import { FormActions } from "@/components/ui/FormActions";
import { PasswordField } from "@/components/ui/PasswordField";
import { accountAfter } from "@/lib/account/accountNotice";
import { isPasswordChangeValid, passwordErrors, type PasswordChange } from "@/lib/account/password";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";
import { routes } from "@/lib/routes";
import { PasswordStrengthHint } from "./PasswordStrengthHint";

const EMPTY: PasswordChange = { current: "", next: "", repeat: "" };
const UNEXPECTED_ERROR = "Something went wrong. Please try again.";

type ChangePasswordResult = Awaited<ReturnType<typeof changePasswordAction>>;

export function PasswordForm() {
    const router = useRouter();
    const [values, setValues] = useState<PasswordChange>(EMPTY);
    // Only the server can say the current password is wrong, or refuse the new one.
    const [currentError, setCurrentError] = useState<string>();
    const [newPasswordServerError, setNewPasswordServerError] = useState<string>();
    // A refusal that belongs to no single field, e.g. too many attempts or an ended session.
    const [formError, setFormError] = useState<string>();
    const [isSaving, setIsSaving] = useState(false);
    // Changing the key rebuilds the fields, so every password is hidden again after a reset.
    const [formKey, setFormKey] = useState(0);

    const errors = passwordErrors(values);
    const canSubmit = isPasswordChangeValid(values);

    function setField(field: keyof PasswordChange, value: string) {
        setValues((previous) => ({ ...previous, [field]: value }));
        setFormError(undefined);
        if (field === "current") setCurrentError(undefined);
        if (field === "next") setNewPasswordServerError(undefined);
    }

    function reset() {
        setValues(EMPTY);
        setCurrentError(undefined);
        setNewPasswordServerError(undefined);
        setFormError(undefined);
        setIsSaving(false);
        setFormKey((key) => key + 1);
    }

    useResetOnHide(reset);

    /** Puts each refusal where it belongs: under its field, or as one line under the form. */
    function showRefusal(result: Exclude<ChangePasswordResult, { ok: true }>) {
        const fields = result.fields ?? {};
        if (fields.currentPassword) setCurrentError(fields.currentPassword);
        if (fields.newPassword) setNewPasswordServerError(fields.newPassword);
        if (!fields.currentPassword && !fields.newPassword) setFormError(result.message);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit || isSaving) return;
        setIsSaving(true);
        setFormError(undefined);
        try {
            // The server repeats every rule and checks the current password.
            const result = await changePasswordAction({ currentPassword: values.current, newPassword: values.next });
            if (result.ok) {
                router.push(accountAfter("password-changed"));
                return;
            }
            showRefusal(result);
        } catch {
            setFormError(UNEXPECTED_ERROR);
        }
        setIsSaving(false);
    }

    return (
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-140">
            {/* Phone: the fields sit on the page. Desktop: they sit in one white card. */}
            <fieldset
                key={formKey}
                disabled={isSaving}
                className="min-w-0 space-y-4 md:space-y-5 md:rounded-xl md:border md:border-line md:bg-surface md:p-7"
            >
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
                    <FieldError message={errors.next ?? newPasswordServerError} />
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

                {formError && (
                    <p role="alert" className="text-sm font-medium text-danger">
                        {formError}
                    </p>
                )}

                <FormActions
                    cancelHref={routes.driver.account}
                    submitLabel={isSaving ? "Updating…" : "Update password"}
                    submitDisabled={!canSubmit || isSaving}
                    onCancel={reset}
                    cancelOnPhone={false}
                    hintBelow="You stay signed in here. Other devices will be signed out."
                />
            </fieldset>
        </form>
    );
}
