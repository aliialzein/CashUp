"use client";

import { useState, type ReactNode } from "react";
import { Collapse } from "@/components/ui/Collapse";
import { Icon } from "@/components/ui/Icon";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";
import { HEADER_ROW, SUMMARY_ROW } from "./ledgerStyles";

type CollapsibleLedgerProps = {
    /** The USD and LBP column titles. */
    header: ReactNode;
    /** The rows that fold away on phone. */
    details: ReactNode;
    /** The row that always shows. */
    summary: ReactNode;
};

/**
 * Phone only: the details fold away. The chevron in the header, or the Expected cash row, opens them.
 * From tablet up everything is always shown and nothing is clickable.
 */
export function CollapsibleLedger({ header, details, summary }: CollapsibleLedgerProps) {
    const [open, setOpen] = useState(false);

    useResetOnHide(() => setOpen(false));

    const toggle = () => setOpen((value) => !value);

    return (
        <>
            <div className={HEADER_ROW}>
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls="ledger-details"
                    aria-label={open ? "Hide details" : "Show details"}
                    onClick={toggle}
                    className="flex size-8 items-center justify-start text-muted md:hidden"
                >
                    <Icon
                        name="chevronDown"
                        size={18}
                        className={`transition-transform duration-500 ease-in-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                    />
                </button>
                <span className="hidden md:block" />
                {header}
            </div>

            <Collapse open={open} alwaysOpenFromMd>
                <div id="ledger-details">{details}</div>
            </Collapse>

            <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={toggle}
                className={`${SUMMARY_ROW} w-full text-left md:pointer-events-none md:cursor-default`}
            >
                {summary}
            </button>
        </>
    );
}
