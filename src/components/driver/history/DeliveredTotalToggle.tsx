"use client";

import { useId, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Collapse } from "@/components/ui/Collapse";
import { Icon } from "@/components/ui/Icon";
import { formatNumber, type Amounts } from "@/lib/format/money";

type DeliveredTotalToggleProps = {
    /** e.g. "Delivered · 3" */
    label: string;
    total: Amounts;
};

/** Phone only: the delivered total folded behind its label. USD and LBP open on their own lines, so big numbers never crowd. */
export function DeliveredTotalToggle({ label, total }: DeliveredTotalToggleProps) {
    const [open, setOpen] = useState(false);
    const detailsId = useId();

    return (
        <Card className="mt-1 md:hidden">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={detailsId}
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
            >
                <span className="text-xs font-medium tracking-wider text-muted uppercase">{label}</span>
                <Icon
                    name="chevronDown"
                    size={18}
                    className={`text-muted transition-transform duration-500 ease-in-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                />
            </button>
            <Collapse open={open}>
                <dl id={detailsId} className="flex flex-col gap-1.5 px-4 pb-3">
                    <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-xs font-medium tracking-wider text-muted uppercase">USD</dt>
                        <dd className="font-mono text-sm font-semibold text-success">{formatNumber(total.usd, "USD")}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-xs font-medium tracking-wider text-muted uppercase">LBP</dt>
                        <dd className="font-mono text-sm font-semibold text-success">{formatNumber(total.lbp, "LBP")}</dd>
                    </div>
                </dl>
            </Collapse>
        </Card>
    );
}
