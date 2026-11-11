import type { ComponentProps } from "react";
import { BottomBar } from "@/components/ui/BottomBar";
import { CountControls } from "./CountControls";
import { CountTotals } from "./CountTotals";

type CountBarProps = ComponentProps<typeof CountTotals> & ComponentProps<typeof CountControls>;

/** Phone only: Counted, Expected and Gap, the final-count checkbox and the two buttons, stuck to the bottom. */
export function CountBar({ counted, expected, gap, ...controls }: CountBarProps) {
    return (
        <BottomBar>
            <div className="flex flex-col gap-3">
                <CountTotals counted={counted} expected={expected} gap={gap} />
                <CountControls {...controls} />
            </div>
        </BottomBar>
    );
}
