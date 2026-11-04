import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatAmounts, type Amounts } from "@/lib/format/money";

type SalesLinkCardProps = {
    href: string;
    deliveredCount: number;
    total: Amounts;
};

/** A card that opens the sales of a submitted cash-up. It grows to fill the height of its column. */
export function SalesLinkCard({ href, deliveredCount, total }: SalesLinkCardProps) {
    return (
        <Link
            href={href}
            className="flex flex-1 items-center justify-between gap-4 rounded-xl border border-line bg-surface px-5 py-4 hover:bg-canvas"
        >
            <span className="flex flex-col gap-1">
                <span className="font-heading text-[15px] font-semibold">Sales · {deliveredCount} delivered</span>
                <span className="font-mono text-sm text-muted">{formatAmounts(total)}</span>
            </span>
            <Icon name="chevronRight" size={18} className="text-muted" />
        </Link>
    );
}
