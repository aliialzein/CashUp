import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

/** "‹ Page name" link at the top of a page, leading to its parent page. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<Link href={href} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
			<Icon name="chevronLeft" size={16} />
			{children}
		</Link>
	);
}
