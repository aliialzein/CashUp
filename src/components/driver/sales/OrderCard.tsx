"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Collapse } from "@/components/ui/Collapse";
import { Icon } from "@/components/ui/Icon";
import { formatAmounts } from "@/lib/format/money";
import type { Sale } from "@/types/driver/cash-up";

const NO_DISCOUNT = { usd: "0", lbp: "0" };

type OrderCardProps = {
    sale: Sale;
    /** The Edit sale page, for a wrong amount or discount: they cannot be changed at delivery. */
    editHref: string;
};

/**
 * What the client has to pay, read-only, on phone and desktop: the amount and the discount, with a way to fix them
 * in Edit sale first. Who and when fold away; tap to see them.
 */
export function OrderCard({ sale, editHref }: OrderCardProps) {
    const [open, setOpen] = useState(false);

    return (
        <Card as="section" aria-label="Order" className="overflow-hidden">
            <button
                type="button"
                aria-expanded={open}
                aria-controls="order-details"
                onClick={() => setOpen((value) => !value)}
                className="flex min-h-16 w-full items-center gap-3 px-4 text-left"
            >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-subtle text-muted">
                    <Icon name="sheet" size={18} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-heading text-sm font-semibold">Order to collect</span>
                    <span className="font-mono text-[13px] text-muted">{formatAmounts(sale.amount)}</span>
                </span>
                <Icon
                    name="chevronRight"
                    size={18}
                    className={`text-muted transition-transform duration-500 ease-in-out motion-reduce:transition-none ${open ? "-rotate-90" : "rotate-90"}`}
                />
            </button>

            <div className="flex flex-col gap-2 border-t border-subtle px-4 py-3 text-[13px]">
                <div className="flex justify-between gap-3">
                    <span className="text-muted">Discount</span>
                    <span className="font-mono">{formatAmounts(sale.discount ?? NO_DISCOUNT)}</span>
                </div>
                <Link href={editHref} className="font-semibold text-ink underline-offset-2 hover:underline">
                    Wrong amount? Edit the sale first.
                </Link>
            </div>

            <Collapse open={open}>
                <dl id="order-details" className="flex flex-col gap-2 border-t border-subtle px-4 py-3 text-[13px]">
                    <div className="flex justify-between gap-3">
                        <dt className="text-muted">Client</dt>
                        <dd className="font-mono">{sale.clientPhone || "Shop sale"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                        <dt className="text-muted">Added</dt>
                        <dd className="font-mono">{sale.time}</dd>
                    </div>
                </dl>
            </Collapse>
        </Card>
    );
}
