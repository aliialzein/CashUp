import type { ComponentType } from "react";
import type { Amounts } from "@/lib/format/money";
import { LOCKED_SALES_TOTAL, type LockedSalesTotal } from "@/lib/driver/sales/lockedSalesTotal";
import { DeliveredTotalRow } from "./DeliveredTotalRow";
import { DeliveredTotalSummary } from "./DeliveredTotalSummary";
import { DeliveredTotalTagged } from "./DeliveredTotalTagged";
import { DeliveredTotalToggle } from "./DeliveredTotalToggle";

type TotalProps = { label: string; total: Amounts };

const TOTALS: Record<LockedSalesTotal, ComponentType<TotalProps>> = {
    summary: DeliveredTotalSummary,
    tagged: DeliveredTotalTagged,
    toggle: DeliveredTotalToggle,
    row: DeliveredTotalRow,
};

/** Phone only: the delivered total of a locked cash-up, in the style chosen in `lockedSalesTotal.ts`. */
export function DeliveredTotal(props: TotalProps) {
    const Total = TOTALS[LOCKED_SALES_TOTAL];
    return <Total {...props} />;
}
