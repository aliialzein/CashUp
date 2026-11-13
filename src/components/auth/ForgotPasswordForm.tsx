"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from 'next/navigation';
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { AuthError, defaultAuthMessages } from "@/components/auth/form-contracts";
import { requestResetSchema, verifyResetSchema, resetPasswordSchema } from '@/modules/auth/auth.validation';
import type { requestPasswordResetAction, verifyPasswordResetAction, resetPasswordAction } from '@/app/(auth)/actions';

export type ForgotPasswordFormProps = {
  /**
   * Called with the typed email after client-side validation passes.
   * Return a promise: the button shows a loader until it settles.
   * Returns the existing request action result, including its generic success message.
   */
  onSubmit: (email: string) => ReturnType<typeof requestPasswordResetAction>;
  onVerify: typeof verifyPasswordResetAction;
  onReset: typeof resetPasswordAction;
  /** Where "Back to sign in" goes. (optional) */
  loginHref?: string;
  /** Force the loading state from outside (optional). */
  loading?: boolean;
  /** Show a server error from outside (optional). */
  errorMessage?: string;
};

type Step = 'email' | 'code' | 'password';
type Pending = 'request' | 'verify' | 'reset' | 'resend' | null;

export function ForgotPasswordForm({
  onSubmit,
  onVerify,
  onReset,
  loginHref = "/login",
  loading: loadingProp,
  errorMessage,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const inFlight = useRef(false);
  const completed = useRef(false);
  const [message, setMessage] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [remaining, setRemaining] = useState(0);

  const loading = pending !== null || Boolean(loadingProp);
  const bannerError = formError ?? errorMessage ?? null;

  useEffect(() => {
    if (!resendAt) return;
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);

  function startCooldown() {
    setResendAt(Date.now() + 60000);
    setRemaining(60);
  }

  function clearErrors(field: string) {
    setFieldErrors(previous => { const next = { ...previous }; delete next[field]; return next; });
    setFormError(null);
  }

  function restart() {
    if (inFlight.current || loading) return;
    setStep('email');
    setCode(''); setPassword(''); setConfirmPassword('');
    setFieldErrors({}); setFormError(null); setMessage('');
  }

  async function perform(kind: Exclude<Pending, null>, work: () => Promise<void>) {
    if (inFlight.current || loading) return;
    inFlight.current = true;
    setPending(kind); setFormError(null); setFieldErrors({});
    try {
      await work();
    } catch (err) {
      setFormError(err instanceof AuthError ? err.message : defaultAuthMessages.UNKNOWN);
    } finally {
      if (!completed.current) { inFlight.current = false; setPending(null); }
    }
  }

  function showFailure(result: Extract<Awaited<ReturnType<typeof requestPasswordResetAction>>, { ok: false }>) {
    setFieldErrors(result.fields ?? {});
    setFormError(result.message);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || loading) return;
    const parsed = step === 'email' ? requestResetSchema.safeParse({ email })
      : step === 'code' ? verifyResetSchema.safeParse({ email, code })
        : resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
      setFieldErrors(errors);
      return;
    }
    if (step === 'email') {
      if (remaining > 0 || Date.now() < resendAt) return;
      await perform('request', async () => {
        const normalizedEmail = requestResetSchema.parse({ email }).email;
        const result = await onSubmit(normalizedEmail);
        if (!result.ok) { showFailure(result); return; }
        setEmail(normalizedEmail); setCode(''); setMessage(result.message ?? '');
        startCooldown(); setStep('code');
      });
    } else if (step === 'code') {
      await perform('verify', async () => {
        const result = await onVerify({ email, code });
        if (!result.ok) { showFailure(result); return; }
        setCode(''); setMessage(''); setStep('password');
      });
    } else {
      await perform('reset', async () => {
        const result = await onReset({ password, confirmPassword });
        if (!result.ok) { showFailure(result); return; }
        completed.current = true;
        setEmail(''); setCode(''); setPassword(''); setConfirmPassword('');
        router.replace('/login?passwordReset=success');
        router.refresh();
      });
    }
  }

  async function resend() {
    if (remaining > 0 || Date.now() < resendAt) return;
    await perform('resend', async () => {
      setCode('');
      const result = await onSubmit(email);
      if (!result.ok) { showFailure(result); return; }
      setMessage(result.message ?? ''); startCooldown();
    });
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

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-busy={loading}>
      {message && <Alert tone="success" title="Check your inbox">{message}</Alert>}
      {bannerError && (
        <Alert tone="error" onDismiss={() => setFormError(null)}>
          {bannerError}
        </Alert>
      )}

      {step === 'email' && <TextField
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@business.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          clearErrors('email');
        }}
        error={fieldErrors.email}
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
      />}

      {step === 'code' && <>
        <p className="text-sm text-slate-500">Enter the six-digit code sent to {email}. The code expires after 10 minutes.</p>
        <TextField key="code" label="Reset code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code"
          placeholder="000000" pattern="[0-9]{6}" maxLength={6} autoFocus value={code} disabled={loading}
          error={fieldErrors.code} onChange={event => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); clearErrors('code'); }} />
      </>}

      {step === 'password' && <>
        <p className="text-sm text-slate-500">Choose a new password for your account.</p>
        <TextField key="password" label="New password" name="password" type="password" autoComplete="new-password"
          minLength={8} maxLength={128} hint="Use 8–128 characters." autoFocus value={password} disabled={loading}
          error={fieldErrors.password} onChange={event => { setPassword(event.target.value); clearErrors('password'); }} />
        <TextField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password"
          maxLength={128} value={confirmPassword} disabled={loading} error={fieldErrors.confirmPassword}
          onChange={event => { setConfirmPassword(event.target.value); clearErrors('confirmPassword'); }} />
      </>}

      <Button
        type="submit"
        fullWidth
        disabled={loading || (step === 'email' && remaining > 0)}
        loading={loading && pending !== 'resend'}
        loadingText={step === 'email' ? 'Sending code...' : step === 'code' ? 'Verifying...' : 'Resetting password...'}
      >
        {step === 'email' ? 'Send reset code' : step === 'code' ? 'Verify code' : 'Reset password'}
      </Button>

      {step !== 'password' && remaining > 0 && <p className="text-center text-sm text-slate-500" role="status">You can request another code in {remaining}s.</p>}
      {step === 'code' && <Button variant="secondary" fullWidth disabled={loading || remaining > 0}
        loading={pending === 'resend'} loadingText="Sending code..." onClick={resend}>
        {remaining > 0 ? `Resend code in ${remaining}s` : 'Resend code'}
      </Button>}
      {step !== 'email' && <Button variant="ghost" fullWidth disabled={loading} onClick={restart}>
        {step === 'code' ? 'Start over or use a different email' : 'Start over and request a new code'}
      </Button>}

      <div className="flex justify-center">{backLink}</div>
    </form>
  );
}
