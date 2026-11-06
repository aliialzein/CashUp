import { routes } from "@/lib/routes";
import type { CashUpSummary } from "@/types/cash-up";

/** Open and returned cash-ups continue on Today. The others open their detail page. */
export function historyHref(item: CashUpSummary): string {
    return item.status === "OPEN" || item.status === "RETURNED"
        ? routes.driver.today
        : routes.driver.historyDetail(item.id);
}

/** "1 sale" / "3 sales" */
export function salesLabel(count: number): string {
    return `${count} ${count === 1 ? "sale" : "sales"}`;
}
