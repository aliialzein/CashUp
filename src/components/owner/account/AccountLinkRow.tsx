import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

type AccountLinkRowProps = { icon: LucideIcon; title: string; description: string; href: string };

export function AccountLinkRow({ icon: RowIcon, title, description, href }: AccountLinkRowProps) {
  return (
    <Link href={href} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-canvas">
      <span className="flex size-10 flex-none items-center justify-center rounded-full border border-line bg-subtle text-muted">
        <RowIcon size={20} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-ink">{title}</span>
        <span className="text-[13px] text-muted">{description}</span>
      </span>
      <ChevronRight size={18} className="text-muted" aria-hidden="true" />
    </Link>
  );
}
