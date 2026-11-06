"use client";

import { useId, useState } from "react";
import { Collapse } from "@/components/ui/Collapse";
import { Icon } from "@/components/ui/Icon";
import type { Sale } from "@/types/cash-up";
import { SaleDetails } from "./SaleDetails";

/** Phone: a button that folds open how a delivered sale worked out. One root element, so the card spacing stays even. */
export function SaleSummary({ sale }: { sale: Sale }) {
    const [open, setOpen] = useState(false);
    const detailsId = useId();

    return (
        <div className="-mb-3">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={detailsId}
                onClick={() => setOpen((value) => !value)}
                className="flex min-h-8 w-full items-center justify-center gap-1 border-t border-subtle text-[13px] font-medium text-muted"
            >
                {open ? "Hide details" : "Show details"}
                <Icon
                    name="chevronDown"
                    size={16}
                    className={`transition-transform duration-500 ease-in-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                />
            </button>
            <Collapse open={open}>
                <SaleDetails sale={sale} id={detailsId} className="pt-1 pb-3" />
            </Collapse>
        </div>
    );
}
