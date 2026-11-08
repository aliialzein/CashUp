"use client";

import Link from "next/link";

import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import SignupForm from "@/components/auth/SignupForm";

import { signupAction } from '../actions';

export default function SignupPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Create your account"
        description="It takes a minute. You can create or join a business next."
      >
        <SignupForm onSubmit={signupAction} />

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