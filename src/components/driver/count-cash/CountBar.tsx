"use client";

import { useState } from "react";
import { GapCell } from "@/components/driver/cash-up/CountResult";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/Button";
import { Collapse } from "@/components/ui/Collapse";
import { Icon } from "@/components/ui/Icon";
import { formatNumber, type Amounts } from "@/lib/format/money";

/** Every row shares these columns, so the numbers line up even though the middle rows fold away. */
const ROW = "grid grid-cols-[0.9fr_1fr_1.2fr] items-center text-sm";
const NUM = "text-right font-mono text-[13px]";
const COLUMN_TITLE = "text-right text-xs font-medium tracking-wider text-muted uppercase";

type CountBarProps = {
    counted: Amounts;
    /** What the drawer should hold, calculated by the server. */
    expected: Amounts;
    /** Counted minus expected. */
    gap: Amounts;
};

/** Phone only: the gap and the Save button, stuck to the bottom. The chevron opens Counted and Expected. */
export function CountBar({ counted, expected, gap }: CountBarProps) {
    const [open, setOpen] = useState(false);

    return (
        <BottomBar>
            <div className={ROW}>
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls="count-details"
                    aria-label={open ? "Hide counted and expected" : "Show counted and expected"}
                    onClick={() => setOpen((value) => !value)}
                    className="flex size-8 items-center justify-start text-muted"
                >
                    <Icon
                        name="chevronDown"
                        size={18}
                        className={`transition-transform duration-500 ease-in-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                    />
                </button>
                <span className={COLUMN_TITLE}>USD</span>
                <span className={COLUMN_TITLE}>LBP</span>
            </div>

            <Collapse open={open}>
                <div id="count-details" className={`${ROW} gap-y-1.5 pt-1.5`}>
                    <span className="text-muted">Counted</span>
                    <span className={NUM}>{formatNumber(counted.usd, "USD")}</span>
                    <span className={NUM}>{formatNumber(counted.lbp, "LBP")}</span>

                    <span className="text-muted">Expected</span>
                    <span className={NUM}>{formatNumber(expected.usd, "USD")}</span>
                    <span className={NUM}>{formatNumber(expected.lbp, "LBP")}</span>
                </div>
            </Collapse>

            <div className={`${ROW} mt-1.5 mb-3`}>
                <span className="font-semibold">Gap</span>
                <span className={`${NUM} font-semibold`}>
                    <GapCell currency="USD" value={gap.usd} />
                </span>
                <span className={`${NUM} font-semibold`}>
                    <GapCell currency="LBP" value={gap.lbp} />
                </span>
            </div>
            <Button type="submit">Save count</Button>
        </BottomBar>
    );
}
