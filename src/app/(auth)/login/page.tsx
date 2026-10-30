"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/ui/Logo";
import { AuthError, type LoginValues } from "@/types/auth";

// ---------------------------------------------------------------------------

// connect with backend
//   const res = await fetch("/api/auth/login", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(values),
//   });
//   if (res.status === 401) throw new AuthError("INVALID_CREDENTIALS");
//   if (res.status === 429) throw new AuthError("TOO_MANY_ATTEMPTS");
//   if (!res.ok) throw new AuthError("UNKNOWN");
//   router.push("/select-business");
// ---------------------------------------------------------------------------
async function handleLogin(values: LoginValues): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1200)); // fake network wait
  console.log("login submit", values);

  // Demo only: any other credentials show the "wrong email or password" state.
  if (values.email !== "demo@cashup.app" || values.password !== "password123") {
    throw new AuthError("INVALID_CREDENTIALS");
  }
}

export default function LoginPage() {
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
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to count, record and close your cash-up.
            </p>
          </div>

          <LoginForm
            onSubmit={handleLogin}
            forgotPasswordHref="/(auth)/forgot-password"
          />
        </div>
      </div>
    </main>
  );
}
