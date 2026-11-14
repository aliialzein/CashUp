"use client";

import { useFormStatus } from "react-dom";
import { logoutAction } from "@/app/(auth)/actions";

function Submit() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="flex min-h-12 w-full items-center justify-center rounded-[10px] border border-danger-line bg-surface text-sm font-semibold text-danger hover:bg-danger-bg disabled:opacity-60"
        >
            {pending ? "Signing out…" : "Sign out"}
        </button>
    );
}

/** Red outlined button. Ends the session on the server, then the action sends the member to the login page. */
export function SignOutButton() {
    return (
        <form action={logoutAction}>
            <Submit />
        </form>
    );
}
