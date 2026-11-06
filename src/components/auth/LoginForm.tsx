"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { AuthError, defaultAuthMessages, type LoginValues } from "@/types/auth";

export type LoginFormProps = {
  /**
   * Called with the typed values after client-side validation passes.
   * Return a promise: the button shows a loader until it settles.
   * To show an error, throw `new AuthError("INVALID_CREDENTIALS")` (or any Error).
   */
  onSubmit: (values: LoginValues) => Promise<void> | void;
  /** Where the "Forgot password?" text goes. */
  forgotPasswordHref?: string;
  /** Optional: handle the click yourself (e.g. open a modal) instead of navigating. */
  onForgotPassword?: () => void;
  /** Force the loading state from outside (optional). */
  loading?: boolean;
  /** Show a server error from outside (optional). */
  errorMessage?: string;
};

type FieldErrors = Partial<Record<keyof LoginValues, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: LoginValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.email.trim()) errors.email = "Enter your email.";
  else if (!EMAIL_PATTERN.test(values.email.trim()))
    errors.email = "Enter a valid email address.";
  if (!values.password) errors.password = "Enter your password.";
  return errors;
}

export function LoginForm({
  onSubmit,
  forgotPasswordHref = "/forgot-password",
  onForgotPassword,
  loading: loadingProp,
  errorMessage,
}: LoginFormProps) {
  const [values, setValues] = useState<LoginValues>({
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [credentialsWrong, setCredentialsWrong] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const loading = submitting || Boolean(loadingProp);
  const bannerError = formError ?? errorMessage ?? null;

  function update(field: keyof LoginValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear errors as soon as the user starts fixing them.
    if (fieldErrors[field])
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    if (formError) setFormError(null);
    if (credentialsWrong) setCredentialsWrong(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return; // blocks double taps (see NFR7)

    const trimmed: LoginValues = {
      email: values.email.trim(),
      password: values.password,
    };
    const errors = validate(trimmed);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setFormError(null);
    setCredentialsWrong(false);
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      if (err instanceof AuthError) {
        setFormError(err.message);
        setCredentialsWrong(err.code === "INVALID_CREDENTIALS");
      } else {
        setFormError(defaultAuthMessages.UNKNOWN);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {bannerError && (
        <Alert tone="error" onDismiss={() => setFormError(null)}>
          {bannerError}
        </Alert>
      )}

      <TextField
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@business.com"
        value={values.email}
        onChange={(e) => update("email", e.target.value)}
        error={fieldErrors.email}
        invalid={credentialsWrong}
        disabled={loading}
        leftIcon={
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        }
      />

      <div className="space-y-1.5">
        <TextField
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Enter your password"
          value={values.password}
          onChange={(e) => update("password", e.target.value)}
          error={fieldErrors.password}
          invalid={credentialsWrong}
          disabled={loading}
          leftIcon={
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          }
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="rounded-lg p-2 text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#12a15f]/40"
            >
              {showPassword ? (
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          }
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="rounded text-sm font-medium text-[#12a15f] transition hover:text-[#0e8a51] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#12a15f]/40"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <Button
        type="submit"
        fullWidth
        loading={loading}
        loadingText="Signing in..."
      >
        Sign in
      </Button>
    </form>
  );
}
