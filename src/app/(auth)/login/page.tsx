"use client";

import Link from "next/link";

import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

import { loginAction } from '../actions';

export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Log in"
        description="Welcome back. Log in to your CashUp account."
      >
        <LoginForm onSubmit={loginAction} />

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
