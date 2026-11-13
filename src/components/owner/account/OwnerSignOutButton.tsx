"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";
import { logoutAction } from "@/app/(auth)/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-danger-line bg-surface text-sm font-semibold text-danger hover:bg-danger-bg disabled:opacity-50"
    >
      <LogOut size={18} aria-hidden="true" />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

/** Real sign out through the backend (revokes the session, then goes to /login). */
export function OwnerSignOutButton() {
  return (
    <form action={logoutAction}>
      <SubmitButton />
    </form>
  );
}
