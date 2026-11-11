import type { ReactNode } from "react";

/** A green line that confirms something worked, e.g. "Count saved. You can finish it later." Screen readers announce it. */
export function SuccessNotice({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <p role="status" className={`rounded-xl border border-success-line bg-success-bg px-4 py-3 text-sm text-success ${className}`}>
            {children}
        </p>
    );
}
