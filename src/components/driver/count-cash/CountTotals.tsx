"use client";

import { useId, useState } from "react";
import { GapCell } from "@/components/driver/cash-up/CountResult";
import { Collapse } from "@/components/ui/Collapse";
import { Icon } from "@/components/ui/Icon";
import { formatNumber, type Amounts } from "@/lib/format/money";
import { useResetOnHide } from "@/lib/hooks/useResetOnHide";

/** Every row shares these columns, so the numbers line up. */
const ROW = "grid grid-cols-[0.9fr_1fr_1.2fr] items-center text-sm";
/** The space above each row sits inside the row, so folded rows leave no gap behind (see Collapse). */
const ROW_BELOW_TITLES = `${ROW} pt-1.5`;
const NUM = "text-right font-mono text-[13px]";
const COLUMN_TITLE = "text-right text-xs font-medium tracking-wider text-muted uppercase";

type CountTotalsProps = {
    counted: Amounts;
    /** What the drawer should hold, calculated by the server. */
    expected: Amounts;
    /** Counted minus expected, for the screen only: the backend freezes the real gap at submit. */
    gap: Amounts;
    /** Phone bar only: Counted and Expected fold away behind a chevron (folded at first); Gap always shows. */
    collapsible?: boolean;
};

/** Counted, Expected and Gap for USD and LBP. Used by the phone bar (collapsible) and the desktop footer card. */
export function CountTotals({ counted, expected, gap, collapsible = false }: CountTotalsProps) {
    const [open, setOpen] = useState(!collapsible);
    const detailsId = useId();

    // Folded again when the driver leaves the page (Next.js keeps the page's state alive otherwise).
    useResetOnHide(() => setOpen(!collapsible));

    const toggle = () => setOpen((value) => !value);

    const details = (
        <>
            <div className={ROW_BELOW_TITLES}>
                <span className="text-muted">Counted</span>
                <span className={NUM}>{formatNumber(counted.usd, "USD")}</span>
                <span className={NUM}>{formatNumber(counted.lbp, "LBP")}</span>
            </div>
            <div className={ROW_BELOW_TITLES}>
                <span className="text-muted">Expected</span>
                <span className={NUM}>{formatNumber(expected.usd, "USD")}</span>
                <span className={NUM}>{formatNumber(expected.lbp, "LBP")}</span>
            </div>
        </>
    );

    const gapCells = (
        <>
            <span className="font-semibold">Gap</span>
            <span className={`${NUM} font-semibold`}>
                <GapCell currency="USD" value={gap.usd} />
            </span>
            <span className={`${NUM} font-semibold`}>
                <GapCell currency="LBP" value={gap.lbp} />
            </span>
        </>
    );

    return (
        <div role="group" aria-label="Counted against expected" className="flex flex-col">
            <div className={ROW}>
                {collapsible ? (
                    <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={detailsId}
                        aria-label={open ? "Hide counted and expected" : "Show counted and expected"}
                        onClick={toggle}
                        className="-my-1.5 flex size-8 items-center justify-start text-muted"
                    >
                        <Icon
                            name="chevronDown"
                            size={18}
                            className={`transition-transform duration-500 ease-in-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                        />
                    </button>
                ) : (
                    <span />
                )}
                <span className={COLUMN_TITLE}>USD</span>
                <span className={COLUMN_TITLE}>LBP</span>
            </div>

            {collapsible ? (
                <Collapse open={open}>
                    <div id={detailsId}>{details}</div>
                </Collapse>
            ) : (
                details
            )}

            {collapsible ? (
                // Tapping the Gap row also opens or folds the rows above. Not a second tab stop: the chevron is the control.
                <button type="button" tabIndex={-1} onClick={toggle} className={`${ROW_BELOW_TITLES} w-full text-left`}>
                    {gapCells}
                </button>
            ) : (
                <div className={ROW_BELOW_TITLES}>{gapCells}</div>
            )}
        </div>
    );
}
