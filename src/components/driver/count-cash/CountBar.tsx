import type { ComponentProps } from "react";
import { BottomBar } from "@/components/ui/BottomBar";
import { CountControls } from "./CountControls";
import { CountTotals } from "./CountTotals";

/** The bar always folds its totals, so it does not take `collapsible` from outside. */
type CountBarProps = Omit<ComponentProps<typeof CountTotals>, "collapsible"> & ComponentProps<typeof CountControls>;

/**
 * Phone only: Counted, Expected and Gap, the final-count checkbox and the two buttons, stuck to the bottom.
 * Counted and Expected fold away (folded at first), so more notes fit above the bar; Gap always shows.
 */
export function CountBar({ counted, expected, gap, ...controls }: CountBarProps) {
    return (
        <BottomBar>
            <div className="flex flex-col gap-3">
                <CountTotals counted={counted} expected={expected} gap={gap} collapsible />
                <CountControls {...controls} />
            </div>
        </BottomBar>
    );
}
