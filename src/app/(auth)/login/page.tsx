"use client";

import Link from "next/link";

import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

import { AuthError, type LoginValues } from "@/types/auth";

async function handleLogin(values: LoginValues): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  if (values.email !== "demo@cashup.app" || values.password !== "password123") {
    throw new AuthError("INVALID_CREDENTIALS");
  }
}

export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Log in"
        description="Welcome back. Log in to your CashUp account."
      >
        <LoginForm
          onSubmit={handleLogin}
          forgotPasswordHref="/forgot-password"
        />

        <p className="mt-7 text-center text-sm text-[#667085]">
          New to CashUp?{" "}
          <Link
            href="/signup"
            className="font-semibold text-[#10192D] underline underline-offset-2 hover:text-[#34415A]"
          >
            Create an account
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
