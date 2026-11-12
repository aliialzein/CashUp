import Link from "next/link";
import { routes } from "@/lib/routes";

/** Red outlined button. For now it only goes to the login page, a real sign out comes with the session. */
export function SignOutLink() {
    return (
        <Link
            href={routes.login}
            className="flex min-h-12 items-center justify-center rounded-[10px] border border-danger-line bg-surface text-sm font-semibold text-danger hover:bg-danger-bg"
        >
            Sign out
        </Link>
    );
}
