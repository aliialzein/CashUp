import type { ReactNode } from "react";

/** A blue note at the top of a page whose feature is not available yet. */
export function ComingSoonNotice({ children }: { children: ReactNode }) {
    return (
        <div role="note" className="mx-auto w-full max-w-140 rounded-xl border border-info-line bg-info-bg p-4 text-info">
            <p className="text-sm font-semibold">Coming soon</p>
            <p className="mt-1 text-sm leading-relaxed">{children}</p>
        </div>
    );
}
