import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatAmounts } from "@/lib/format/money";
import type { Sale, SaleStatus } from "@/types/cash-up";

type Tone = ComponentProps<typeof Badge>["tone"];

const SALE_BADGES: Record<SaleStatus, { label: string; tone: Tone }> = {
    TO_DELIVER: { label: "To deliver", tone: "warning" },
    DELIVERED: { label: "Delivered", tone: "success" },
    DELETED: { label: "Deleted", tone: "danger" },
};

const COLUMNS = "grid grid-cols-[90px_1.2fr_80px_130px_1.2fr] items-center gap-3 px-5";

/** The sales of a submitted cash-up, read only: no actions. */
export function LockedSalesTable({ sales }: { sales: Sale[] }) {
    return (
        <Card as="section" aria-label="Sales" className="overflow-hidden">
            <div className={`${COLUMNS} h-10 border-b border-line bg-canvas text-xs font-medium tracking-wider text-muted uppercase`}>
                <span>Sale</span>
                <span>Client</span>
                <span>Time</span>
                <span>Status</span>
                <span>Cash</span>
            </div>

            {sales.map((sale) => {
                const { label, tone } = SALE_BADGES[sale.status];
                return (
                    <div key={sale.id} className={`${COLUMNS} h-14 border-b border-subtle text-sm last:border-b-0`}>
                        <span className="font-heading font-semibold">#{sale.number}</span>
                        <span className="font-mono text-[13px]">{sale.clientPhone}</span>
                        <span className="font-mono text-[13px] text-muted">{sale.time}</span>
                        <span>
                            <Badge tone={tone}>{label}</Badge>
                        </span>
                        <span className="font-mono text-[13px] font-semibold">{formatAmounts(sale.amount)}</span>
                    </div>
                );
            })}
        </Card>
    );
}
