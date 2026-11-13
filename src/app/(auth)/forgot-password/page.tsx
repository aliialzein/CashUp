"use client";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Logo } from "@/components/ui/Logo";
import { requestPasswordResetAction, verifyPasswordResetAction, resetPasswordAction } from '../actions';

export default function ForgotPasswordPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      {/* soft brand glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[#12a15f]/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-32 h-96 w-96 rounded-full bg-[#0f2a5c]/10 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo height={52} />
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-[#0f2a5c]">
              Reset password
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter your email and we&apos;ll send you a code to choose a new
              password.
            </p>
          </div>

          <ForgotPasswordForm
            onSubmit={(email) => requestPasswordResetAction({ email })}
            onVerify={verifyPasswordResetAction}
            onReset={resetPasswordAction}
            loginHref="/login"
          />
        </div>
      </div>
    </main>
  );
}
