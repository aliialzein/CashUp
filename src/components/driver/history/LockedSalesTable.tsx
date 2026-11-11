"use client";

import { useId, useState, type ComponentProps } from "react";
import { SaleDetailsCells } from "@/components/driver/sales/SaleDetailsCells";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Collapse } from "@/components/ui/Collapse";
import { Icon } from "@/components/ui/Icon";
import { formatAmounts } from "@/lib/format/money";
import { saleAmountLine } from "@/lib/driver/sales/collected";
import { CLIENT_PAID_LABEL } from "@/lib/driver/sales/saleLabels";
import type { Sale, SaleStatus } from "@/types/driver/cash-up";

type Tone = ComponentProps<typeof Badge>["tone"];

const SALE_BADGES: Record<SaleStatus, { label: string; tone: Tone }> = {
    TO_DELIVER: { label: "To deliver", tone: "warning" },
    DELIVERED: { label: "Delivered", tone: "success" },
    DELETED: { label: "Deleted", tone: "danger" },
};

const COLUMNS = "grid items-center gap-3 px-5 grid-cols-[90px_1.2fr_80px_130px_1.2fr]";
/** One more narrow column for the details button. */
const COLUMNS_WITH_DETAILS = "grid items-center gap-3 px-5 grid-cols-[90px_1.2fr_80px_130px_1.2fr_36px]";

type LockedSaleRowProps = {
    sale: Sale;
    /** Delivered sales get a button that opens how the sale worked out. */
    expandable: boolean;
};

function LockedSaleRow({ sale, expandable }: LockedSaleRowProps) {
    const [open, setOpen] = useState(false);
    const detailsId = useId();
    const { label, tone } = SALE_BADGES[sale.status];
    const { amounts } = saleAmountLine(sale);
    const hasDetails = expandable && sale.status === "DELIVERED";

    return (
        <div className="border-b border-subtle last:border-b-0">
            <div className={`${expandable ? COLUMNS_WITH_DETAILS : COLUMNS} h-14 text-sm`}>
                <span className="font-heading font-semibold">#{sale.number}</span>
                <span className="font-mono text-[13px]">{sale.clientPhone}</span>
                <span className="font-mono text-[13px] text-muted">{sale.time}</span>
                <span>
                    <Badge tone={tone}>{label}</Badge>
                </span>
                <span className="font-mono text-[13px] font-semibold">{formatAmounts(amounts)}</span>
                {expandable &&
                    (hasDetails ? (
                        <button
                            type="button"
                            aria-expanded={open}
                            aria-controls={detailsId}
                            aria-label={`${open ? "Hide" : "Show"} details of sale ${sale.number}`}
                            onClick={() => setOpen((value) => !value)}
                            className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
                        >
                            <Icon
                                name="chevronDown"
                                size={18}
                                className={`transition-transform duration-500 ease-in-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                            />
                        </button>
                    ) : (
                        <span />
                    ))}
            </div>
            {hasDetails && (
                <Collapse open={open}>
                    <div className="border-t border-subtle bg-canvas px-5 pt-3 pb-4">
                        <SaleDetailsCells sale={sale} id={detailsId} />
                    </div>
                </Collapse>
            )}
        </div>
    );
}

type LockedSalesTableProps = {
    sales: Sale[];
    /** Delivered sales get a details button. */
    expandable?: boolean;
};

/** The sales of a submitted cash-up, read only: no actions. The last column is what each client paid. */
export function LockedSalesTable({ sales, expandable = false }: LockedSalesTableProps) {
    return (
        <Card as="section" aria-label="Sales" className="overflow-hidden">
            <div
                className={`${expandable ? COLUMNS_WITH_DETAILS : COLUMNS} h-10 border-b border-line bg-canvas text-xs font-medium tracking-wider text-muted uppercase`}
            >
                <span>Sale</span>
                <span>Client</span>
                <span>Time</span>
                <span>Status</span>
                <span>{CLIENT_PAID_LABEL}</span>
                {expandable && <span />}
            </div>

            {sales.map((sale) => (
                <LockedSaleRow key={sale.id} sale={sale} expandable={expandable} />
            ))}
        </Card>
    );
}
