"use client";

import Link from "next/link";

import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import SignupForm from "@/components/auth/SignupForm";

import type { SignupValues } from "@/types/auth";

async function handleSignup(values: SignupValues): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  console.log("signup submit", values);

  // TODO: Connect with signup backend.
}

export default function SignupPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Create your account"
        description="It takes a minute. You can create or join a business next."
      >
        <SignupForm onSubmit={handleSignup} />

        <p className="mt-7 text-center text-sm text-[#667085]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#10192D] underline underline-offset-2 hover:text-[#34415A]"
          >
            Log in
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}