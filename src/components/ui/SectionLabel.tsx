import type { ReactNode } from "react";

/** Small uppercase title above a block, e.g. "WAITING FOR DELIVERY · 1". */
export function SectionLabel({ children }: { children: ReactNode }) {
	return <h2 className="mb-2 text-xs font-medium tracking-wider text-muted uppercase">{children}</h2>;
}
