import { Card } from "@/components/ui/Card";
import { formatAmounts, type Amounts } from "@/lib/format/money";

type CashOutsTotalProps = {
    /** Total of all cash-outs per currency, calculated by the server (already negative). */
    total: Amounts;
    /** True when nothing went out: the total is shown muted instead of red. */
    none: boolean;
};

/** Phone only: the total out as one card. Desktop shows it beside the filters, so this card is hidden there. */
export function CashOutsTotal({ total, none }: CashOutsTotalProps) {
    return (
        <Card className="flex items-center justify-between gap-2 px-4 py-3 md:hidden">
            <span className="text-xs font-medium tracking-wider text-muted uppercase">Total out</span>
            <span className={`font-mono text-sm font-semibold ${none ? "text-muted" : "text-danger"}`}>
                {formatAmounts(total)}
            </span>
        </Card>
    );
}
