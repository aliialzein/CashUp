"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { AuthError, defaultAuthMessages } from "@/types/auth";

export type ForgotPasswordFormProps = {
  /**
   * Called with the typed email after client-side validation passes.
   * Return a promise: the button shows a loader until it settles.
   * To show an error, throw `new AuthError("NETWORK")` (or any Error).
   */
  onSubmit: (email: string) => Promise<void> | void;
  /** Where "Back to sign in" goes. (optional) */
  loginHref?: string;
  /** Force the loading state from outside (optional). */
  loading?: boolean;
  /** Show a server error from outside (optional). */
  errorMessage?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm({
  onSubmit,
  loginHref = "/login",
  loading: loadingProp,
  errorMessage,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const loading = submitting || Boolean(loadingProp);
  const bannerError = formError ?? errorMessage ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const value = email.trim();
    if (!value) return setEmailError("Enter your email.");
    if (!EMAIL_PATTERN.test(value))
      return setEmailError("Enter a valid email address.");

    setEmailError(undefined);
    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit(value);
      setSentTo(value);
    } catch (err) {
      setFormError(
        err instanceof AuthError ? err.message : defaultAuthMessages.UNKNOWN,
      );
    } finally {
      setSubmitting(false);
    }
  }

  // back to signin
  const backLink = (
    <Link
      href={loginHref}
      className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-slate-500 transition hover:text-[#0f2a5c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2a5c]/30"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
      </svg>
      Back to sign in
    </Link>
  );

  // Success state. The wording never confirms whether the email has an account.
  if (sentTo) {
    return (
      <div className="space-y-5">
        <Alert tone="success" title="Check your inbox">
          If an account exists for {sentTo}, we sent a link to reset your
          password.
        </Alert>

        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            setSentTo(null);
            setEmail("");
          }}
        >
          Use a different email
        </Button>

        <div className="flex justify-center">{backLink}</div>
      </div>
    );
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
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (emailError) setEmailError(undefined);
          if (formError) setFormError(null);
        }}
        error={emailError}
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

      <Button
        type="submit"
        fullWidth
        loading={loading}
        loadingText="Sending link..."
      >
        Send reset link
      </Button>

      <div className="flex justify-center">{backLink}</div>
    </form>
  );
}
